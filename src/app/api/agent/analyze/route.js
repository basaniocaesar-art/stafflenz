import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import sharp from 'sharp';
import { getAdminClient } from '@/lib/supabase';
import { calculateCost } from '@/lib/promptBuilder';

// Anthropic enforces a 2000px max dimension when sending many images per
// request. Resize everything safely below that AND smaller than the worker
// reference photos to control token cost.
async function shrink(buffer, max) {
  try {
    return await sharp(buffer).resize(max, max, { fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 82 }).toBuffer();
  } catch {
    return buffer;
  }
}

// POST /api/agent/analyze — called by edge agent after uploading frames
// This is the same analysis logic as /api/monitor/analyze but triggered by the agent
// with a frame_url instead of requiring the server to capture

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(request) {
  const body = await request.json();
  const { agent_key, client_id, frame_url } = body;

  if (!agent_key || !client_id || !frame_url) {
    return NextResponse.json({ error: 'agent_key, client_id, and frame_url required' }, { status: 400 });
  }

  const db = getAdminClient();

  // Verify client exists
  const { data: clientData } = await db.from('clients').select('id, name, industry').eq('id', client_id).single();
  if (!clientData) return NextResponse.json({ error: 'Client not found' }, { status: 404 });

  // Get zones
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
    zones = fullZones.data || [];
  }

  // Get workers (all shifts for agent — it runs 24/7)
  let workers;
  const fullWorkers = await db.from('workers')
    .select('id, full_name, department, shift, photo_path, photo_paths')
    .eq('client_id', client_id).eq('is_active', true).is('deleted_at', null);
  if (fullWorkers.error && fullWorkers.error.message?.includes('column')) {
    const baseWorkers = await db.from('workers')
      .select('id, full_name, department, shift, photo_path')
      .eq('client_id', client_id).eq('is_active', true).is('deleted_at', null);
    workers = (baseWorkers.data || []).map(w => ({ ...w, photo_paths: null }));
  } else {
    workers = fullWorkers.data || [];
  }

  // Download frame
  let frameBase64;
  try {
    const res = await fetch(frame_url);
    if (!res.ok) return NextResponse.json({ error: 'Could not download frame' }, { status: 502 });
    const raw = Buffer.from(await res.arrayBuffer());
    const resized = await shrink(raw, 1280);
    frameBase64 = resized.toString('base64');
  } catch (e) {
    return NextResponse.json({ error: `Frame download failed: ${e.message}` }, { status: 502 });
  }

  // Download worker reference photos.
  // The DB stores one photo_path per worker, but in storage each worker has
  // a folder with multiple angles (photo_0.jpg … photo_4.jpg). Listing the
  // folder lets Claude see the worker from every angle the admin uploaded,
  // which is the single biggest knob for face-match accuracy on CCTV feeds.
  async function downloadPhoto(path) {
    try {
      const { data: signed } = await db.storage.from('worker-photos').createSignedUrl(path, 120);
      if (!signed?.signedUrl) return null;
      const res = await fetch(signed.signedUrl);
      if (!res.ok) return null;
      const raw = Buffer.from(await res.arrayBuffer());
      // 512px is plenty for face matching and keeps token cost down across
      // many reference angles per worker.
      const resized = await shrink(raw, 512);
      return resized.toString('base64');
    } catch { return null; }
  }

  const MAX_PHOTOS_PER_WORKER = 5;
  const workersWithPhotos = await Promise.all(
    workers.map(async (w) => {
      const photos = [];
      if (w.photo_path) {
        const folder = w.photo_path.substring(0, w.photo_path.lastIndexOf('/'));
        let paths = [];
        try {
          const { data: files } = await db.storage.from('worker-photos').list(folder, { limit: 20 });
          paths = (files || [])
            .filter((f) => /\.(jpg|jpeg|png|webp)$/i.test(f.name))
            .map((f) => `${folder}/${f.name}`)
            .sort()
            .slice(0, MAX_PHOTOS_PER_WORKER);
        } catch { /* fall through to single-photo path */ }
        if (paths.length === 0) paths = [w.photo_path];
        for (const p of paths) {
          const b64 = await downloadPhoto(p);
          if (b64) photos.push(b64);
        }
      }
      return { ...w, photoBase64s: photos };
    })
  );

  // Build Claude message — cache worker photos (they rarely change, cache reads ~10% of normal cost)
  const content = [];
  let workerPhotoBlocksAdded = 0;
  for (const w of workersWithPhotos) {
    const total = w.photoBase64s.length;
    for (let i = 0; i < total; i++) {
      content.push({ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: w.photoBase64s[i] } });
      // Tell Claude these are N different angles of the SAME person, otherwise
      // it treats each photo as a separate candidate and gets confused.
      content.push({ type: 'text', text: `Reference angle ${i + 1}/${total} of ${w.full_name} — ${w.department || 'staff'}` });
      workerPhotoBlocksAdded += 2;
    }
  }
  if (workerPhotoBlocksAdded > 0) {
    const lastIdx = content.length - 1;
    content[lastIdx] = { ...content[lastIdx], cache_control: { type: 'ephemeral' } };
  }

  content.push({ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: frameBase64 } });
  content.push({ type: 'text', text: 'Current camera frame' });

  // Determine shift
  const hour = new Date().getHours();
  const shift = hour >= 6 && hour < 14 ? 'morning' : hour >= 14 && hour < 22 ? 'afternoon' : 'night';

  const workerList = workersWithPhotos.filter(w => w.photoBase64s.length > 0).map(w => `- ${w.full_name} (${w.department || 'staff'})`).join('\n') || 'No reference photos';
  const zoneList = zones.map(z => `- ${z.name} (${z.zone_type || 'general'})`).join('\n') || 'No zones configured';

  content.push({ type: 'text', text: `You are a workplace safety AI for ${clientData.name} — ${clientData.industry}.

REGISTERED WORKERS:
${workerList}

ZONES:
${zoneList}

Each registered worker above has MULTIPLE reference photos showing them from different angles — treat all photos labeled with the same name as the SAME person, not different candidates.

MATCHING RULES (very important):
- A FALSE match is much worse than no match. Only assign a worker_name if you are highly confident the face in the frame is the same person as the reference photos.
- If the face is too small, blurry, partially turned, or you have any doubt, label the person as "Unknown Person" with confidence 0.3 or lower.
- Use confidence values: 0.9+ = certain match, 0.85-0.95 = likely match, below 0.85 = label as Unknown.
- Do NOT guess based on clothing, hair colour, or body shape alone — face match required.

Return ONLY valid JSON:
{
  "detected_workers": [{"worker_id":null,"worker_name":"","zone":"","status":"working|idle","ppe_compliant":true,"confidence":0.8}],
  "alerts": [{"alert_type":"ppe_violation|zone_violation","worker_name":"","zone_name":"","message":"","severity":"low|medium|high"}],
  "summary": "",
  "overall_status": "normal|warning|critical"
}` });

  // Call Claude
  const startMs = Date.now();
  let analysis, inputTokens = 0, outputTokens = 0;
  const model = 'claude-haiku-4-5-20251001';
  try {
    const response = await anthropic.messages.create({
      model,
      max_tokens: 1500,
      messages: [{ role: 'user', content }],
    });
    inputTokens = response.usage?.input_tokens || 0;
    outputTokens = response.usage?.output_tokens || 0;
    const raw = response.content.find(b => b.type === 'text')?.text || '{}';
    const match = raw.match(/\{[\s\S]*\}/);
    analysis = JSON.parse(match?.[0] || '{}');
  } catch (err) {
    return NextResponse.json({ error: `Analysis failed: ${err.message}` }, { status: 500 });
  }

  // Save events. Filter out low-confidence "matches" — better to record an
  // Unknown than a false positive against a real worker (a false match
  // poisons attendance records and is harder to clean up than a missed one).
  const now = new Date().toISOString();
  let workerEventsInserted = 0;
  let alertsInserted = 0;

  if (Array.isArray(analysis.detected_workers) && analysis.detected_workers.length > 0) {
    const events = analysis.detected_workers.map(w => {
      const conf = typeof w.confidence === 'number' ? w.confidence : 0.8;
      const matched = conf >= 0.85 && w.worker_name && !/unknown/i.test(w.worker_name);
      return {
        client_id,
        worker_id: matched ? (w.worker_id || null) : null,
        worker_name: matched ? w.worker_name : 'Unknown Person',
        event_type: 'detected',
        activity: w.status || 'present',
        zone_id: zones.find(z => z.name === w.zone)?.id || null,
        ppe_compliant: w.ppe_compliant !== false,
        zone_violation: false,
        confidence: conf,
        occurred_at: now,
      };
    });
    const { data: weData } = await db.from('worker_events').insert(events).select('id');
    workerEventsInserted = weData?.length || 0;
  }

  if (Array.isArray(analysis.alerts) && analysis.alerts.length > 0) {
    const alerts = analysis.alerts.map(a => ({
      client_id, alert_type: a.alert_type || 'general', message: a.message,
      worker_name: a.worker_name || null, zone_name: a.zone_name || null,
      is_resolved: false, created_at: now,
    }));
    const { data: alertData } = await db.from('alerts').insert(alerts).select('id');
    alertsInserted = alertData?.length || 0;
  }

  // Persist per-cycle monitoring result so the dashboard charts populate.
  const processingMs = Date.now() - startMs;
  const costUsd = calculateCost(model, inputTokens, outputTokens);
  await db.from('monitoring_results').insert({
    client_id,
    analysis_json: analysis,
    frame_url,
    input_tokens: inputTokens,
    output_tokens: outputTokens,
    model_used: model,
    cost_usd: costUsd,
    processing_ms: processingMs,
    workers_detected: workerEventsInserted,
    alerts_created: alertsInserted,
    overall_status: analysis.overall_status || 'normal',
  });

  return NextResponse.json({ success: true, analysis, timestamp: now, cost_usd: costUsd });
}
