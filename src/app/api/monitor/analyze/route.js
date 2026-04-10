import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { getAdminClient } from '@/lib/supabase';
import { buildAnalysisPrompt as buildDynamicPrompt, calculateCost } from '@/lib/promptBuilder';

function verifyInternalSecret(request) {
  return request.headers.get('x-internal-secret') === process.env.INTERNAL_SECRET;
}

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(request) {
  if (!verifyInternalSecret(request)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json();
  const { client_id, frame_urls } = body;

  if (!client_id || !Array.isArray(frame_urls) || frame_urls.length === 0) {
    return NextResponse.json({ error: 'client_id and frame_urls required' }, { status: 400 });
  }

  const db = getAdminClient();

  // ── Step 1: Load client config ────────────────────────────────────────────
  // Try with site_name, fall back if column doesn't exist
  let clientData;
  const fullClient = await db.from('clients').select('id, name, industry, site_name').eq('id', client_id).single();
  if (fullClient.error && fullClient.error.message?.includes('column')) {
    const baseClient = await db.from('clients').select('id, name, industry').eq('id', client_id).single();
    clientData = baseClient.data ? { ...baseClient.data, site_name: null } : null;
  } else {
    clientData = fullClient.data;
  }

  // Try with rule columns, fall back if they don't exist yet
  let zones;
  const fullZones = await db.from('camera_zones')
    .select('id, name, zone_type, location_label, min_workers, max_workers, rules, ppe_requirements')
    .eq('client_id', client_id).eq('is_active', true);
  if (fullZones.error && fullZones.error.message?.includes('column')) {
    const baseZones = await db.from('camera_zones')
      .select('id, name, zone_type, location_label')
      .eq('client_id', client_id).eq('is_active', true);
    zones = (baseZones.data || []).map(z => ({ ...z, min_workers: 0, max_workers: null, rules: null, ppe_requirements: null }));
  } else {
    zones = fullZones.data;
  }

  // Determine current shift by hour
  const hour = new Date().getHours();
  const currentShift =
    hour >= 6 && hour < 14 ? 'morning' :
    hour >= 14 && hour < 22 ? 'afternoon' :
    'night';

  // Fetch workers — include current shift AND flexible shift workers
  let workers;
  const fullWorkers = await db
    .from('workers')
    .select('id, full_name, department, shift, photo_path, photo_paths')
    .eq('client_id', client_id)
    .in('shift', [currentShift, 'flexible'])
    .eq('is_active', true)
    .is('deleted_at', null);

  if (fullWorkers.error && fullWorkers.error.message?.includes('column')) {
    const baseWorkers = await db
      .from('workers')
      .select('id, full_name, department, shift, photo_path')
      .eq('client_id', client_id)
      .in('shift', [currentShift, 'flexible'])
      .eq('is_active', true)
      .is('deleted_at', null);
    workers = (baseWorkers.data || []).map(w => ({ ...w, photo_paths: null }));
  } else {
    workers = fullWorkers.data || [];
  }

  // ── Step 2: Download frames as base64 (up to 3) ──────────────────────────
  const frames = frame_urls.slice(0, 3);
  const frameBase64s = await Promise.all(
    frames.map(async (url) => {
      const res = await fetch(url);
      if (!res.ok) return null;
      return Buffer.from(await res.arrayBuffer()).toString('base64');
    })
  );

  // ── Step 3: Download worker reference photos as base64 ───────────────────
  // Supports multiple photos per worker (photo_paths array) with fallback to single photo_path
  async function downloadPhotoBase64(path) {
    try {
      const { data: signed } = await db.storage
        .from('worker-photos')
        .createSignedUrl(path, 120);
      if (!signed?.signedUrl) return null;
      const res = await fetch(signed.signedUrl);
      if (!res.ok) return null;
      return Buffer.from(await res.arrayBuffer()).toString('base64');
    } catch {
      return null;
    }
  }

  const workersWithPhotos = await Promise.all(
    (workers || []).map(async (w) => {
      const photoBase64s = [];
      const storagePrefix = `${client_id}/${w.id}/`;

      // Discover all photos from storage for this worker
      try {
        const { data: files } = await db.storage
          .from('worker-photos')
          .list(`${client_id}/${w.id}`, { sortBy: { column: 'name', order: 'asc' } });

        if (files && files.length > 0) {
          const results = await Promise.all(
            files.filter(f => f.name.match(/\.(jpg|jpeg|png|webp)$/i)).map(f =>
              downloadPhotoBase64(`${storagePrefix}${f.name}`)
            )
          );
          photoBase64s.push(...results.filter(Boolean));
        }
      } catch { /* storage listing failed */ }

      // Fallback to single photo_path if storage listing found nothing
      if (photoBase64s.length === 0 && w.photo_path) {
        const b64 = await downloadPhotoBase64(w.photo_path);
        if (b64) photoBase64s.push(b64);
      }

      return { ...w, photoBase64s, photoBase64: photoBase64s[0] || null };
    })
  );

  // ── Step 4: Build the Claude message content array ───────────────────────
  const content = [];

  // Reference photos — send up to 4 per worker for better face matching
  const photoLabels = ['front view', 'left profile', 'right profile', 'from above', 'alternate 1', 'alternate 2'];
  for (const w of workersWithPhotos) {
    if (!w.photoBase64s || w.photoBase64s.length === 0) continue;
    const maxPhotos = Math.min(w.photoBase64s.length, 4);
    for (let pi = 0; pi < maxPhotos; pi++) {
      content.push({
        type: 'image',
        source: { type: 'base64', media_type: 'image/jpeg', data: w.photoBase64s[pi] },
      });
      const angleLabel = pi < photoLabels.length ? ` (${photoLabels[pi]})` : ` (photo ${pi + 1})`;
      content.push({
        type: 'text',
        text: `Reference: This is ${w.full_name}${angleLabel} — ${w.department || 'staff'} assigned to ${currentShift} shift`,
      });
    }
  }

  // Frames oldest → current
  const frameLabels = ['2 minutes ago', '1 minute ago', 'current (most recent)'];
  const labelOffset = 3 - frameBase64s.length; // align labels to the end
  for (let i = 0; i < frameBase64s.length; i++) {
    const b64 = frameBase64s[i];
    if (!b64) continue;
    content.push({
      type: 'image',
      source: { type: 'base64', media_type: 'image/jpeg', data: b64 },
    });
    content.push({
      type: 'text',
      text: `Frame ${i + 1} — ${frameLabels[labelOffset + i] || 'frame'}`,
    });
  }

  // ── Step 5: Load client analysis_config and build dynamic prompt ──────────
  let analysisConfig = {};
  try {
    const configResult = await db.from('clients').select('analysis_config').eq('id', client_id).single();
    if (configResult.data?.analysis_config) analysisConfig = configResult.data.analysis_config;
  } catch { /* config column may not exist yet */ }

  const frameCount = frameBase64s.filter(Boolean).length;
  const prompt = buildDynamicPrompt(clientData, analysisConfig, zones || [], workersWithPhotos, frameCount);
  content.push({ type: 'text', text: prompt });

  // ── Call Claude Vision ────────────────────────────────────────────────────
  const analysisStart = Date.now();
  let analysis, inputTokens = 0, outputTokens = 0;
  const model = 'claude-haiku-4-5-20251001';
  try {
    const response = await anthropic.messages.create({
      model,
      max_tokens: 2000,
      messages: [{ role: 'user', content }],
    });

    inputTokens = response.usage?.input_tokens || 0;
    outputTokens = response.usage?.output_tokens || 0;

    const rawText = response.content.find((b) => b.type === 'text')?.text || '{}';
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    analysis = JSON.parse(jsonMatch?.[0] || '{}');
  } catch (err) {
    return NextResponse.json({ error: `Claude analysis failed: ${err.message}` }, { status: 500 });
  }

  // ── Persist detected worker events ───────────────────────────────────────
  // worker_events.worker_id has FK → workers(id) and is type uuid. Claude often
  // returns the worker's *name* in the worker_id field instead of a real UUID
  // (because the prompt doesn't always surface UUIDs). To avoid the entire batch
  // failing with "invalid input syntax for type uuid", we resolve worker_id by
  // name lookup against the workers we already loaded for this client. Anything
  // we can't match (Unknown Person, etc.) falls through as null.
  const workerNameToId = new Map();
  for (const w of (workersWithPhotos || [])) {
    if (w.full_name) workerNameToId.set(w.full_name.trim().toLowerCase(), w.id);
  }
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  function resolveWorkerId(detected) {
    // 1. Trust Claude's worker_id only if it's a real UUID
    if (typeof detected.worker_id === 'string' && UUID_RE.test(detected.worker_id)) {
      return detected.worker_id;
    }
    // 2. Otherwise, look up by name
    const name = (detected.worker_name || detected.worker_id || '').toString().trim().toLowerCase();
    return workerNameToId.get(name) || null;
  }

  const now = new Date().toISOString();
  let workerEventsInserted = 0;
  let alertsInserted = 0;

  if (Array.isArray(analysis.detected_workers) && analysis.detected_workers.length > 0) {
    const events = analysis.detected_workers.map((w) => ({
      client_id,
      worker_id: resolveWorkerId(w),
      worker_name: w.worker_name,
      event_type: 'detected',
      activity: w.status || 'present',
      zone_id: (zones || []).find((z) => z.name === w.zone)?.id || null,
      ppe_compliant: w.ppe_compliant !== false,
      zone_violation: false,
      confidence: typeof w.confidence === 'number' ? w.confidence : 0.8,
      occurred_at: now,
    }));
    const { data: weData, error: weErr } = await db.from('worker_events').insert(events).select('id');
    if (weErr) {
      console.error('[analyze] worker_events insert failed:', weErr.message, weErr.details);
    } else {
      workerEventsInserted = weData?.length || 0;
    }
  }

  // ── Persist alerts ────────────────────────────────────────────────────────
  // Allowed alert_type values are enforced by alerts_alert_type_check (see schema.sql).
  // Anything Claude returns outside this set is normalized to 'general' so future
  // vocabulary drift can't silently break the pipeline again.
  const ALLOWED_ALERT_TYPES = new Set([
    'absent', 'late', 'zone_violation', 'ppe_violation', 'unauthorized',
    'low_confidence', 'behaviour', 'safety', 'staffing', 'general',
  ]);

  if (Array.isArray(analysis.alerts) && analysis.alerts.length > 0) {
    const alerts = analysis.alerts.map((a) => {
      const rawType = (a.alert_type || 'general').toString().toLowerCase().trim();
      const alert_type = ALLOWED_ALERT_TYPES.has(rawType) ? rawType : 'general';
      return {
        client_id,
        alert_type,
        message: a.message,
        worker_name: a.worker_name || null,
        zone_name: a.zone_name || null,
        is_resolved: false,
        created_at: now,
      };
    });
    const { data: alertData, error: alertErr } = await db.from('alerts').insert(alerts).select('id');
    if (alertErr) {
      console.error('[analyze] alerts insert failed:', alertErr.message, alertErr.details, 'attempted:', alerts.length, 'rows');
    } else {
      alertsInserted = alertData?.length || 0;
    }
  }

  // ── Save monitoring result with cost tracking ──────────────────────────────
  const processingMs = Date.now() - analysisStart;
  const costUsd = calculateCost(model, inputTokens, outputTokens);
  try {
    await db.from('monitoring_results').insert({
      client_id,
      analysis_json: analysis,
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      model_used: model,
      cost_usd: costUsd,
      processing_ms: processingMs,
      workers_detected: workerEventsInserted,
      alerts_created: alertsInserted,
      overall_status: analysis.overall_status || 'normal',
    });
  } catch { /* monitoring_results table may not exist yet */ }

  return NextResponse.json({
    success: true,
    analysis,
    timestamp: now,
    inserted: {
      worker_events: workerEventsInserted,
      alerts: alertsInserted,
      alerts_attempted: (analysis.alerts || []).length,
    },
    cost: { model, input_tokens: inputTokens, output_tokens: outputTokens, cost_usd: costUsd },
  });
}

// Legacy prompt builder — kept for backward compat, new code uses /lib/promptBuilder.js
function buildAnalysisPrompt(client, zones, workers, shift) {
  const clientName = client?.name || 'Unknown Client';
  const industry = client?.industry || 'general workplace';
  const siteName = client?.site_name || 'site';

  const workerList = workers
    .filter((w) => w.photoBase64)
    .map((w) => `- ${w.full_name} (${w.department || 'staff'})`)
    .join('\n') || 'No worker reference photos available';

  const zoneList = zones
    .map((z) => {
      const rules = Array.isArray(z.rules)
        ? z.rules.join(', ')
        : typeof z.rules === 'string'
        ? z.rules
        : 'standard rules apply';
      const ppe = Array.isArray(z.ppe_requirements)
        ? z.ppe_requirements.join(', ')
        : typeof z.ppe_requirements === 'string'
        ? z.ppe_requirements
        : 'none specified';
      return (
        `- ${z.name} (${z.zone_type || 'general'})` +
        `: min ${z.min_workers ?? 0}, max ${z.max_workers ?? 'unlimited'} workers` +
        `. Rules: ${rules}` +
        `. PPE required: ${ppe}`
      );
    })
    .join('\n') || 'No zones configured';

  return `You are a workplace safety and compliance AI for ${clientName} — ${industry}, site: ${siteName}.

REGISTERED WORKERS ON ${shift.toUpperCase()} SHIFT:
${workerList}

SITE ZONES AND RULES:
${zoneList}

INSTRUCTIONS:
Examine all frames carefully (oldest → current) and identify:
1. Which registered workers are visible — compare faces to the reference photos above
2. Any unregistered or unknown persons
3. PPE compliance per worker per zone (hard hat, hi-vis vest, gloves, safety boots, etc.)
4. Zone occupancy vs min/max worker rules
5. Behavioural violations (e.g. running, phone use, sleeping, restricted area access, blocked exits)
6. Each worker's activity status (working, idle, on break, absent)

Return ONLY valid JSON — no markdown, no explanation, no code fences. Use exactly this structure:
{
  "detected_workers": [
    {
      "worker_id": "<uuid from reference list, or null if unknown>",
      "worker_name": "<full name from reference, or 'Unknown Person'>",
      "zone": "<zone name where seen>",
      "status": "<working|idle|on_break|absent>",
      "ppe_compliant": <true|false>,
      "ppe_violations": ["<e.g. missing hard hat>"],
      "confidence": <0.0–1.0>
    }
  ],
  "zone_violations": [
    {
      "zone": "<zone name>",
      "violation_type": "<understaffed|overstaffed|unauthorised_access>",
      "detail": "<description>",
      "severity": "<low|medium|high>"
    }
  ],
  "alerts": [
    {
      "alert_type": "<ppe_violation|zone_violation|behaviour|safety>",
      "worker_name": "<name or Unknown Person>",
      "zone_name": "<zone name>",
      "message": "<clear, actionable description>",
      "severity": "<low|medium|high>"
    }
  ],
  "summary": "<1–2 sentence overall summary of what was observed>"
}`;
}
