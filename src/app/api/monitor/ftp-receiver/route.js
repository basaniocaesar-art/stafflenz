import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase';
import { buildAnalysisPrompt, calculateCost } from '@/lib/promptBuilder';
import { ingestFrame, maybeRunSequenceAnalysis } from '@/lib/frameIngest';
import Anthropic from '@anthropic-ai/sdk';
import sharp from 'sharp';

// ═══════════════════════════════════════════════════════════════════════════════
// FTP Receiver — Vercel Cron calls this every cycle
// Connects to DriveHQ FTP, scans for new frames per client, runs AI analysis
// ═══════════════════════════════════════════════════════════════════════════════

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function isAuthorized(request) {
  const cron = request.headers.get('authorization');
  if (cron === `Bearer ${process.env.CRON_SECRET}`) return true;
  if (request.headers.get('x-internal-secret') === process.env.INTERNAL_SECRET) return true;
  return false;
}

// ─── FTP Client ──────────────────────────────────────────────────────────────
async function connectFtp() {
  const { Client } = await import('basic-ftp');
  const client = new Client();
  client.ftp.verbose = false;

  await client.access({
    host: process.env.FTP_HOST || 'ftp.drivehq.com',
    port: Number(process.env.FTP_PORT || 21),
    user: process.env.FTP_USERNAME,
    password: process.env.FTP_PASSWORD,
    secure: false,
  });

  return client;
}

// ─── Process one client folder ───────────────────────────────────────────────
async function processClientFolder(ftp, folderName, db) {
  const startMs = Date.now();
  const log = [];

  try {
    // Extract client ID from folder name (last segment after last dash, starts with SLZ)
    // Format: name-slug-SLZ00001
    const slzMatch = folderName.match(/SLZ\d+$/i);
    if (!slzMatch) {
      log.push(`Skipping ${folderName} — no SLZ ID found`);
      return { folder: folderName, status: 'skipped', log };
    }
    const slzId = slzMatch[0];

    // Find client by matching the slug in analysis_config or name
    const { data: clients } = await db
      .from('clients')
      .select('id, name, industry, site_name, analysis_config')
      .eq('is_active', true);

    // Match client — check if folder name contains client name slug
    const client = (clients || []).find(c => {
      const nameSlug = c.name.toLowerCase().replace(/[^a-z0-9]/g, '-');
      return folderName.toLowerCase().includes(nameSlug) || folderName.includes(slzId);
    });

    if (!client) {
      log.push(`No client found for folder: ${folderName}`);
      return { folder: folderName, status: 'no_client', log };
    }

    log.push(`Matched client: ${client.name} (${client.id})`);

    // List JPEG files in the folder
    const basePath = process.env.FTP_BASE_PATH || '/';
    const folderPath = `${basePath}${folderName}`;

    await ftp.cd(folderPath);
    const files = await ftp.list();
    const jpegs = files.filter(f => /\.(jpg|jpeg)$/i.test(f.name) && f.size > 0);

    if (jpegs.length === 0) {
      log.push('No JPEG files found');
      return { folder: folderName, status: 'no_files', log };
    }

    log.push(`Found ${jpegs.length} JPEG files`);

    // Download all JPEGs
    const { Writable } = await import('stream');
    const frameBuffers = [];

    for (const file of jpegs.slice(0, 16)) { // Max 16 cameras
      try {
        const chunks = [];
        const writable = new Writable({
          write(chunk, encoding, callback) { chunks.push(chunk); callback(); }
        });
        await ftp.downloadTo(writable, file.name);
        frameBuffers.push({ name: file.name, buffer: Buffer.concat(chunks) });
      } catch (e) {
        log.push(`Failed to download ${file.name}: ${e.message}`);
      }
    }

    if (frameBuffers.length === 0) {
      log.push('All downloads failed');
      return { folder: folderName, status: 'download_failed', log };
    }

    log.push(`Downloaded ${frameBuffers.length} frames`);

    // ── v2 pipeline: index frames in frame_buffer so analyze-sequence
    // can pick them up. Extract camera channel from filename if possible
    // (Hikvision FTP: 192.168.1.64_01_..._MOTION.jpg where 01 = channel).
    let frameBufferIndexed = 0;
    for (let i = 0; i < frameBuffers.length; i++) {
      const f = frameBuffers[i];
      // Try to extract camera channel from filename
      const chMatch = f.name.match(/_(\d{2})_\d{8}/);
      const camera_channel = chMatch ? parseInt(chMatch[1]) : i + 1;
      try {
        await ingestFrame({
          client_id: client.id,
          camera_channel,
          buffer: f.buffer,
          has_motion: true, // FTP push is typically motion-triggered
        });
        frameBufferIndexed++;
      } catch (e) {
        log.push(`frame_buffer index failed for ${f.name}: ${e.message}`);
      }
    }
    log.push(`Indexed ${frameBufferIndexed}/${frameBuffers.length} frames in frame_buffer (v2 pipeline)`);

    // Load client config
    const config = client.analysis_config || {};

    // Load zones
    let zones;
    const zoneResult = await db.from('camera_zones')
      .select('id, name, zone_type, location_label, min_workers, max_workers, rules, ppe_requirements')
      .eq('client_id', client.id).eq('is_active', true);
    if (zoneResult.error && zoneResult.error.message?.includes('column')) {
      const baseZones = await db.from('camera_zones')
        .select('id, name, zone_type, location_label')
        .eq('client_id', client.id).eq('is_active', true);
      zones = (baseZones.data || []).map(z => ({ ...z, min_workers: 0, max_workers: null, rules: null, ppe_requirements: null }));
    } else {
      zones = zoneResult.data || [];
    }

    // Load workers
    let workers;
    const workerResult = await db.from('workers')
      .select('id, full_name, department, shift, photo_path')
      .eq('client_id', client.id).eq('is_active', true).is('deleted_at', null);
    workers = workerResult.data || [];

    // Download worker reference photos (max 1 per worker for speed)
    // Resized to 384x384 to cut Claude token cost ~75% (face recognition still works at this size)
    const workersWithPhotos = await Promise.all(
      workers.map(async (w) => {
        if (!w.photo_path) return { ...w, photoBase64: null };
        try {
          const { data: signed } = await db.storage.from('worker-photos').createSignedUrl(w.photo_path, 120);
          if (!signed?.signedUrl) return { ...w, photoBase64: null };
          const res = await fetch(signed.signedUrl);
          if (!res.ok) return { ...w, photoBase64: null };
          const raw = Buffer.from(await res.arrayBuffer());
          const resized = await sharp(raw).resize(384, 384, { fit: 'inside' }).jpeg({ quality: 82 }).toBuffer().catch(() => raw);
          return { ...w, photoBase64: resized.toString('base64') };
        } catch { return { ...w, photoBase64: null }; }
      })
    );

    // Stitch frames into grid
    const stitchedBuffer = await stitchImages(frameBuffers.map(f => f.buffer));

    // Upload stitched frame to Supabase Storage
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const framePath = `${client.id}/${timestamp}.jpg`;
    await db.storage.from('frames').upload(framePath, stitchedBuffer, { contentType: 'image/jpeg', upsert: false });
    const { data: signed } = await db.storage.from('frames').createSignedUrl(framePath, 3600);
    const frameUrl = signed?.signedUrl;

    // Build Claude message content
    const content = [];

    // Worker reference photos — cache these since they rarely change.
    // Cached reads cost ~10% of normal input tokens, saving money on every repeat.
    let workerPhotoBlocksAdded = 0;
    for (const w of workersWithPhotos) {
      if (!w.photoBase64) continue;
      content.push({ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: w.photoBase64 } });
      content.push({ type: 'text', text: `Reference: ${w.full_name} — ${w.department || 'staff'}` });
      workerPhotoBlocksAdded += 2;
    }
    if (workerPhotoBlocksAdded > 0) {
      const lastIdx = content.length - 1;
      content[lastIdx] = { ...content[lastIdx], cache_control: { type: 'ephemeral' } };
    }

    // Stitched frame
    const stitchedBase64 = stitchedBuffer.toString('base64');
    content.push({ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: stitchedBase64 } });
    content.push({ type: 'text', text: 'Current camera grid (all cameras stitched)' });

    // Dynamic prompt
    const prompt = buildAnalysisPrompt(client, config, zones, workers, 1);
    content.push({ type: 'text', text: prompt });

    // Call Claude
    let analysis, model, inputTokens, outputTokens;
    model = 'claude-haiku-4-5-20251001';

    try {
      const response = await anthropic.messages.create({
        model,
        max_tokens: 2000,
        messages: [{ role: 'user', content }],
      });

      inputTokens = response.usage?.input_tokens || 0;
      outputTokens = response.usage?.output_tokens || 0;

      const raw = response.content.find(b => b.type === 'text')?.text || '{}';
      const match = raw.match(/\{[\s\S]*\}/);
      analysis = JSON.parse(match?.[0] || '{}');
    } catch (err) {
      log.push(`Claude analysis failed: ${err.message}`);
      return { folder: folderName, status: 'analysis_failed', log };
    }

    log.push(`Analysis: ${analysis.people_count || 0} people, ${(analysis.alerts || []).length} alerts`);

    // ── Persistence helpers (mirrors src/app/api/monitor/analyze/route.js) ───
    // worker_events.worker_id has FK → workers(id) and is type uuid. Claude often
    // returns the worker's *name* in the worker_id field instead of a real UUID,
    // which makes the entire batch insert fail with "invalid input syntax for type
    // uuid". Resolve worker_id by name lookup against the workers we already loaded
    // for this client. Anything we can't match (Unknown Person, etc.) → null.
    const workerNameToId = new Map();
    for (const w of (workers || [])) {
      if (w.full_name) workerNameToId.set(w.full_name.trim().toLowerCase(), w.id);
    }
    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const resolveWorkerId = (detected) => {
      if (typeof detected.worker_id === 'string' && UUID_RE.test(detected.worker_id)) {
        return detected.worker_id;
      }
      const name = (detected.worker_name || detected.worker_id || '').toString().trim().toLowerCase();
      return workerNameToId.get(name) || null;
    };

    // Allowed alert_type values are enforced by alerts_alert_type_check (see
    // supabase/schema.sql). Normalize anything Claude returns outside this set
    // to 'general' so future vocabulary drift can't silently break the pipeline.
    const ALLOWED_ALERT_TYPES = new Set([
      'absent', 'late', 'zone_violation', 'ppe_violation', 'unauthorized',
      'low_confidence', 'behaviour', 'safety', 'staffing', 'general',
    ]);

    // Save worker events
    const now = new Date().toISOString();
    let workerEventsInserted = 0;
    let alertsInserted = 0;

    if (Array.isArray(analysis.detected_workers) && analysis.detected_workers.length > 0) {
      const events = analysis.detected_workers.map(w => ({
        client_id: client.id,
        worker_id: resolveWorkerId(w),
        worker_name: w.worker_name,
        event_type: 'detected',
        activity: w.status || 'present',
        zone_id: zones.find(z => z.name === w.zone)?.id || null,
        ppe_compliant: w.ppe_compliant !== false,
        zone_violation: false,
        confidence: typeof w.confidence === 'number' ? w.confidence : 0.8,
        occurred_at: now,
      }));
      const { data: weData, error: weErr } = await db.from('worker_events').insert(events).select('id');
      if (weErr) {
        console.error('[ftp-receiver] worker_events insert failed:', weErr.message, weErr.details, 'attempted:', events.length, 'rows');
        log.push(`worker_events insert FAILED: ${weErr.message}`);
      } else {
        workerEventsInserted = weData?.length || 0;
      }
    }

    // Save alerts
    if (Array.isArray(analysis.alerts) && analysis.alerts.length > 0) {
      const severityThreshold = config?.alert_severity_threshold || 'low';
      const severityOrder = { low: 0, medium: 1, high: 2 };
      const minSeverity = severityOrder[severityThreshold] || 0;

      const filteredAlerts = analysis.alerts.filter(a => {
        const sev = severityOrder[a.severity] ?? 1;
        return sev >= minSeverity;
      });

      if (filteredAlerts.length > 0) {
        const alerts = filteredAlerts.map(a => {
          const rawType = (a.alert_type || 'general').toString().toLowerCase().trim();
          const alert_type = ALLOWED_ALERT_TYPES.has(rawType) ? rawType : 'general';
          return {
            client_id: client.id,
            alert_type,
            message: a.message,
            worker_name: a.worker_name || null,
            zone_name: a.zone_name || null,
            severity: a.severity || 'medium',
            is_resolved: false,
            created_at: now,
          };
        });
        const { data: alertData, error: alertErr } = await db.from('alerts').insert(alerts).select('id');
        if (alertErr) {
          console.error('[ftp-receiver] alerts insert failed:', alertErr.message, alertErr.details, 'attempted:', alerts.length, 'rows');
          log.push(`alerts insert FAILED: ${alertErr.message}`);
        } else {
          alertsInserted = alertData?.length || 0;
        }

        // Send WhatsApp for high severity alerts
        const whatsappNumber = config?.whatsapp_number || client.whatsapp_notify;
        if (whatsappNumber) {
          const highAlerts = filteredAlerts.filter(a => a.severity === 'high');
          if (highAlerts.length > 0) {
            try {
              const { sendWhatsApp } = await import('@/lib/whatsapp');
              const msg = `🚨 StaffLenz Alert — ${client.name}\n${highAlerts.map(a => a.message).join('\n')}`;
              await sendWhatsApp(whatsappNumber, msg);
              log.push(`WhatsApp sent to ${whatsappNumber}`);
            } catch (e) {
              log.push(`WhatsApp failed: ${e.message}`);
            }
          }
        }
      }
    }

    // Save monitoring result with cost tracking
    const processingMs = Date.now() - startMs;
    const costUsd = calculateCost(model, inputTokens || 0, outputTokens || 0);

    const { error: mrErr } = await db.from('monitoring_results').insert({
      client_id: client.id,
      analysis_json: analysis,
      frame_url: frameUrl,
      input_tokens: inputTokens || 0,
      output_tokens: outputTokens || 0,
      model_used: model,
      cost_usd: costUsd,
      processing_ms: processingMs,
      workers_detected: workerEventsInserted,
      alerts_created: alertsInserted,
      overall_status: analysis.overall_status || 'normal',
    });
    if (mrErr) {
      console.error('[ftp-receiver] monitoring_results insert failed:', mrErr.message);
      log.push(`monitoring_results insert FAILED: ${mrErr.message}`);
    }

    log.push(`Cost: $${costUsd.toFixed(6)} (${inputTokens}in/${outputTokens}out) in ${processingMs}ms`);
    log.push(`Persisted: ${workerEventsInserted} events, ${alertsInserted} alerts (Claude returned ${(analysis.detected_workers || []).length} / ${(analysis.alerts || []).length})`);

    // Delete processed files from FTP
    for (const file of jpegs) {
      try { await ftp.remove(file.name); } catch { /* ignore */ }
    }
    log.push(`Cleaned ${jpegs.length} files from FTP`);

    // ── v2: also trigger sequence analysis if due ──────────────────
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://stafflenz.vercel.app';
    const seqResult = await maybeRunSequenceAnalysis({
      client_id: client.id,
      analyze_interval_min: 5,
      api_url: appUrl,
      agent_key: 'ftp-receiver',
    });
    if (seqResult.triggered) {
      log.push(`v2 sequence analysis: ${seqResult.result?.summary?.slice(0, 100) || seqResult.error || 'triggered'}`);
    }

    // Keep only last 5 frames in storage
    const { data: existing } = await db.storage.from('frames').list(client.id, {
      sortBy: { column: 'created_at', order: 'asc' },
    });
    if (existing && existing.length > 5) {
      const toDelete = existing.slice(0, existing.length - 5).map(f => `${client.id}/${f.name}`);
      await db.storage.from('frames').remove(toDelete);
    }

    return {
      folder: folderName,
      client: client.name,
      status: 'analysed',
      workers_detected: workerEventsInserted,
      alerts: alertsInserted,
      workers_attempted: (analysis.detected_workers || []).length,
      alerts_attempted: (analysis.alerts || []).length,
      cost_usd: costUsd,
      processing_ms: processingMs,
      log,
    };

  } catch (err) {
    log.push(`Error: ${err.message}`);
    return { folder: folderName, status: 'error', error: err.message, log };
  }
}

// ─── Image stitching ─────────────────────────────────────────────────────────
async function stitchImages(buffers) {
  // Always re-encode to JPEG — even for a single frame — so the Anthropic
  // image payload's media_type (image/jpeg) always matches the actual bytes.
  // Raw pass-through with a PNG buffer gets rejected by Claude.
  if (buffers.length === 1) {
    return sharp(buffers[0]).jpeg({ quality: 85 }).toBuffer();
  }
  const CELL_W = 640, CELL_H = 480;
  const cols = Math.ceil(Math.sqrt(buffers.length));
  const rows = Math.ceil(buffers.length / cols);
  const composites = await Promise.all(
    buffers.map(async (buf, i) => ({
      input: await sharp(buf).resize(CELL_W, CELL_H, { fit: 'cover' }).toBuffer(),
      left: (i % cols) * CELL_W,
      top: Math.floor(i / cols) * CELL_H,
    }))
  );
  return sharp({ create: { width: cols * CELL_W, height: rows * CELL_H, channels: 3, background: { r: 0, g: 0, b: 0 } } })
    .composite(composites)
    .jpeg({ quality: 85 })
    .toBuffer();
}

// ─── Main handler ────────────────────────────────────────────────────────────
export async function GET(request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Check if FTP is configured
  if (!process.env.FTP_USERNAME || !process.env.FTP_PASSWORD) {
    return NextResponse.json({ message: 'FTP not configured — set FTP_HOST, FTP_USERNAME, FTP_PASSWORD env vars' });
  }

  const db = getAdminClient();
  let ftp;

  try {
    ftp = await connectFtp();

    // List root folders
    const basePath = process.env.FTP_BASE_PATH || '/';
    await ftp.cd(basePath);
    const folders = await ftp.list();
    const clientFolders = folders.filter(f => f.isDirectory && f.name.includes('SLZ'));

    if (clientFolders.length === 0) {
      ftp.close();
      return NextResponse.json({ message: 'No client folders found on FTP', folders: folders.map(f => f.name) });
    }

    // Process each client folder sequentially (to avoid FTP connection issues)
    const results = [];
    for (const folder of clientFolders) {
      const result = await processClientFolder(ftp, folder.name, db);
      results.push(result);
    }

    ftp.close();

    const counts = {
      total: results.length,
      analysed: results.filter(r => r.status === 'analysed').length,
      failed: results.filter(r => ['error', 'analysis_failed', 'download_failed'].includes(r.status)).length,
      skipped: results.filter(r => ['skipped', 'no_client', 'no_files'].includes(r.status)).length,
    };

    return NextResponse.json({ ok: true, counts, results });

  } catch (err) {
    if (ftp) try { ftp.close(); } catch { /* ignore */ }
    return NextResponse.json({ error: `FTP receiver error: ${err.message}` }, { status: 500 });
  }
}

// Also support POST for manual triggers
export const POST = GET;
