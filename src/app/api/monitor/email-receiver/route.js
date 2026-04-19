import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase';
import { buildAnalysisPrompt, calculateCost } from '@/lib/promptBuilder';
import Anthropic from '@anthropic-ai/sdk';
import sharp from 'sharp';

// ═══════════════════════════════════════════════════════════════════════════════
// Email Receiver — polls IMAP inbox for DVR snapshot emails
// Downloads image attachments, batches them, runs Claude Vision analysis
// Same pipeline as FTP receiver but triggered by DVR email alerts
// ═══════════════════════════════════════════════════════════════════════════════

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function isAuthorized(request) {
  const cron = request.headers.get('authorization');
  if (cron === `Bearer ${process.env.CRON_SECRET}`) return true;
  if (request.headers.get('x-internal-secret') === process.env.INTERNAL_SECRET) return true;
  return false;
}

// ─── IMAP Connection ────────────────────────────────────────────────────────
async function connectImap() {
  const { ImapFlow } = await import('imapflow');
  const client = new ImapFlow({
    host: process.env.DVR_IMAP_HOST || 'mail.lenzai.org',
    port: Number(process.env.DVR_IMAP_PORT || 993),
    secure: true,
    // cPanel mail servers often use a cert for cpanel.<domain> even when
    // the IMAP host is mail.<domain>. That hostname mismatch would make
    // strict TLS fail with an opaque "Command failed" error. Disabling
    // cert hostname verification is acceptable here because we're only
    // reading our own mailbox — no sensitive user data is crossing.
    tls: { rejectUnauthorized: false },
    auth: {
      user: process.env.DVR_IMAP_USER,     // e.g. admin@lenzai.org
      pass: process.env.DVR_IMAP_PASSWORD,
    },
    logger: false,
  });
  await client.connect();
  return client;
}

// ─── Extract image attachments from emails ──────────────────────────────────
async function extractAttachments(imap, messages) {
  const { simpleParser } = await import('mailparser');
  const attachments = [];

  for (const msg of messages) {
    try {
      const source = await imap.download(msg.seq, undefined, { uid: false });
      const parsed = await simpleParser(source.content);

      // Get image attachments
      for (const att of (parsed.attachments || [])) {
        if (att.contentType?.startsWith('image/')) {
          attachments.push({
            filename: att.filename || `frame-${msg.seq}.jpg`,
            buffer: att.content,
            emailSubject: parsed.subject || '',
            emailFrom: parsed.from?.text || '',
            emailDate: parsed.date || new Date(),
            seq: msg.seq,
          });
        }
      }

      // Also check for inline images (some DVRs embed snapshots inline)
      if (attachments.length === 0 && parsed.html) {
        for (const att of (parsed.attachments || [])) {
          if (att.contentDisposition === 'inline' && att.contentType?.startsWith('image/')) {
            attachments.push({
              filename: att.filename || `inline-${msg.seq}.jpg`,
              buffer: att.content,
              emailSubject: parsed.subject || '',
              emailFrom: parsed.from?.text || '',
              emailDate: parsed.date || new Date(),
              seq: msg.seq,
            });
          }
        }
      }
    } catch (err) {
      console.error(`[email-receiver] Failed to parse message ${msg.seq}:`, err.message);
    }
  }

  return attachments;
}

// ─── Match client from email sender/subject ─────────────────────────────────
function matchClient(clients, emailFrom, emailSubject) {
  // Try matching by DVR email sender configured in analysis_config
  for (const c of clients) {
    const dvrEmail = c.analysis_config?.dvr_email_from;
    if (dvrEmail && emailFrom.toLowerCase().includes(dvrEmail.toLowerCase())) {
      return c;
    }
  }

  // Try matching by client name in email subject
  for (const c of clients) {
    const nameSlug = c.name.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (emailSubject.toLowerCase().replace(/[^a-z0-9]/g, '').includes(nameSlug)) {
      return c;
    }
  }

  // If only one active client, default to them
  if (clients.length === 1) return clients[0];

  return null;
}

// ─── Process attachments for one client ─────────────────────────────────────
async function processClientBatch(clientAttachments, client, db) {
  const startMs = Date.now();
  const log = [];

  try {
    log.push(`Processing ${clientAttachments.length} snapshots for ${client.name}`);

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
    const workerResult = await db.from('workers')
      .select('id, full_name, department, shift, photo_path')
      .eq('client_id', client.id).eq('is_active', true).is('deleted_at', null);
    const workers = workerResult.data || [];

    // Download worker reference photos
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

    // Stitch snapshots into grid (same as FTP receiver)
    const frameBuffers = clientAttachments.map(a => a.buffer);
    const stitchedBuffer = await stitchImages(frameBuffers.slice(0, 16));

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
    content.push({ type: 'text', text: `DVR email snapshots (${clientAttachments.length} images stitched) — received via email alerts` });

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
      return { client: client.name, status: 'analysis_failed', log };
    }

    log.push(`Analysis: ${analysis.people_count || 0} people, ${(analysis.alerts || []).length} alerts`);

    // ── Persistence (mirrors FTP receiver) ──────────────────────────────────
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
        console.error('[email-receiver] worker_events insert failed:', weErr.message);
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
          console.error('[email-receiver] alerts insert failed:', alertErr.message);
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
              const msg = `🚨 LenzAI Alert — ${client.name}\n${highAlerts.map(a => a.message).join('\n')}`;
              await sendWhatsApp(whatsappNumber, msg);
              log.push(`WhatsApp sent to ${whatsappNumber}`);
            } catch (e) {
              log.push(`WhatsApp failed: ${e.message}`);
            }
          }
        }
      }
    }

    // Save monitoring result
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
      console.error('[email-receiver] monitoring_results insert failed:', mrErr.message);
      log.push(`monitoring_results insert FAILED: ${mrErr.message}`);
    }

    log.push(`Cost: $${costUsd.toFixed(6)} (${inputTokens}in/${outputTokens}out) in ${processingMs}ms`);
    log.push(`Persisted: ${workerEventsInserted} events, ${alertsInserted} alerts`);

    // Keep only last 5 frames in storage
    const { data: existing } = await db.storage.from('frames').list(client.id, {
      sortBy: { column: 'created_at', order: 'asc' },
    });
    if (existing && existing.length > 5) {
      const toDelete = existing.slice(0, existing.length - 5).map(f => `${client.id}/${f.name}`);
      await db.storage.from('frames').remove(toDelete);
    }

    return {
      client: client.name,
      status: 'analysed',
      snapshots: clientAttachments.length,
      workers_detected: workerEventsInserted,
      alerts: alertsInserted,
      cost_usd: costUsd,
      processing_ms: processingMs,
      log,
    };

  } catch (err) {
    log.push(`Error: ${err.message}`);
    return { client: client.name, status: 'error', error: err.message, log };
  }
}

// ─── Image stitching (same as FTP receiver) ─────────────────────────────────
async function stitchImages(buffers) {
  // Single frame: still re-encode as JPEG. Skipping this was a bug — if the
  // DVR (or user) attached a PNG/WebP, we'd pass through the raw bytes but
  // still label the Anthropic image payload as image/jpeg, and Claude would
  // reject with "image/jpeg media type but the image appears to be image/png".
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

// ─── Main handler ───────────────────────────────────────────────────────────
export async function GET(request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Check if IMAP is configured
  if (!process.env.DVR_IMAP_USER || !process.env.DVR_IMAP_PASSWORD) {
    return NextResponse.json({
      message: 'Email receiver not configured — set DVR_IMAP_HOST, DVR_IMAP_USER, DVR_IMAP_PASSWORD env vars',
    });
  }

  const db = getAdminClient();
  let imap;

  try {
    imap = await connectImap();

    // Open INBOX
    const mailbox = await imap.getMailboxLock('INBOX');
    const log = [];

    try {
      // Diagnostic: report what IMAP sees in the mailbox
      const mailboxStatus = await imap.status('INBOX', {
        messages: true,
        unseen: true,
        recent: true,
      });

      // Normal cron fetches only unseen emails. For manual testing / recovery,
      // pass ?include_seen=1 to process ALL emails in the inbox — useful when
      // emails were marked seen by a previous failed run and we want to retry
      // without manually unflagging them in webmail.
      const { searchParams } = new URL(request.url);
      const includeSeen = searchParams.get('include_seen') === '1';

      // Fetch unseen messages (or ALL if include_seen=1)
      const fetchFilter = includeSeen ? { all: true } : { seen: false };
      const messages = [];
      for await (const msg of imap.fetch(fetchFilter, { source: false, envelope: true, uid: true })) {
        messages.push(msg);
      }

      if (messages.length === 0) {
        mailbox.release();
        await imap.logout();
        return NextResponse.json({
          ok: true,
          message: 'No new emails',
          emails: 0,
          mailbox_status: mailboxStatus,
        });
      }

      log.push(`Found ${messages.length} unread emails`);

      // Extract image attachments from all messages
      const attachments = await extractAttachments(imap, messages);

      if (attachments.length === 0) {
        // Mark all as seen even if no attachments (avoid re-processing)
        for (const msg of messages) {
          await imap.messageFlagsAdd({ seq: msg.seq }, ['\\Seen'], { uid: false });
        }
        mailbox.release();
        await imap.logout();
        return NextResponse.json({ ok: true, message: 'No image attachments found', emails: messages.length });
      }

      log.push(`Extracted ${attachments.length} image attachments`);

      // Load all active clients
      const { data: clients } = await db
        .from('clients')
        .select('id, name, industry, site_name, analysis_config, whatsapp_notify')
        .eq('is_active', true);

      if (!clients || clients.length === 0) {
        mailbox.release();
        await imap.logout();
        return NextResponse.json({ ok: true, message: 'No active clients', emails: messages.length });
      }

      // Group attachments by client, tracking which message seqs contributed
      // to each group so we can later decide which to mark seen vs leave for retry.
      const clientGroups = new Map();
      const unmatchedSeqs = new Set();

      for (const att of attachments) {
        const client = matchClient(clients, att.emailFrom, att.emailSubject);
        if (!client) {
          log.push(`Could not match client for email from: ${att.emailFrom}, subject: ${att.emailSubject}`);
          unmatchedSeqs.add(att.seq);
          continue;
        }
        if (!clientGroups.has(client.id)) {
          clientGroups.set(client.id, { client, attachments: [], seqs: new Set() });
        }
        const g = clientGroups.get(client.id);
        g.attachments.push(att);
        g.seqs.add(att.seq);
      }

      // Process each client batch, remembering which seqs succeeded vs failed
      const results = [];
      const successfulSeqs = new Set();
      const failedSeqs = new Set();

      for (const [, group] of clientGroups) {
        const result = await processClientBatch(group.attachments, group.client, db);
        results.push(result);
        if (result.status === 'analysed') {
          for (const seq of group.seqs) successfulSeqs.add(seq);
        } else {
          for (const seq of group.seqs) failedSeqs.add(seq);
        }
      }

      // Mark emails as seen for:
      //   (a) successfully analyzed messages — no need to reprocess
      //   (b) messages with no image attachments — can't improve on retry
      //   (c) messages we couldn't match to any client — retry won't help
      // Leave failed messages UNREAD so the next cron cycle retries them.
      // This is how we recover from transient errors like Anthropic billing or
      // intermittent Claude 529s without losing snapshots.
      const seqsWithAttachments = new Set(attachments.map((a) => a.seq));
      const toMarkSeen = [];
      for (const msg of messages) {
        if (!seqsWithAttachments.has(msg.seq)) {
          // No image attachments at all — permanent skip
          toMarkSeen.push(msg.seq);
        } else if (successfulSeqs.has(msg.seq) || unmatchedSeqs.has(msg.seq)) {
          toMarkSeen.push(msg.seq);
        }
        // else: failed → leave unread for retry
      }

      for (const seq of toMarkSeen) {
        try {
          await imap.messageFlagsAdd({ seq }, ['\\Seen'], { uid: false });
        } catch { /* ignore flag errors */ }
      }

      log.push(`marked ${toMarkSeen.length} seen, ${failedSeqs.size} left unread for retry`);

      mailbox.release();

      const counts = {
        emails: messages.length,
        attachments: attachments.length,
        clients_processed: clientGroups.size,
        analysed: results.filter(r => r.status === 'analysed').length,
        failed: results.filter(r => r.status !== 'analysed').length,
      };

      await imap.logout();
      return NextResponse.json({ ok: true, counts, results, log });

    } catch (err) {
      mailbox.release();
      throw err;
    }

  } catch (err) {
    if (imap) try { await imap.logout(); } catch { /* ignore */ }
    // Surface full error detail so we can diagnose IMAP failures without
    // having to tail Vercel logs. Safe because the endpoint is auth-gated.
    return NextResponse.json({
      error: `Email receiver error: ${err.message}`,
      code: err.code || null,
      authenticationFailed: err.authenticationFailed || false,
      response: err.response || null,
      stack: err.stack?.split('\n').slice(0, 5).join('\n') || null,
    }, { status: 500 });
  }
}

// Also support POST for manual triggers
export const POST = GET;
