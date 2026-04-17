import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import sharp from 'sharp';
import { getAdminClient } from '@/lib/supabase';
import { calculateCost } from '@/lib/promptBuilder';

// POST /api/agent/analyze-sequence
// Body: {
//   agent_key, client_id,
//   frames: [
//     { camera_channel: 1, frame_urls: [url1, url2, url3, url4, url5], minute_offsets: [0,1,2,3,4] },
//     { camera_channel: 2, frame_urls: [...], minute_offsets: [...] },
//     ...
//   ],
//   window_start: ISO, window_end: ISO
// }
//
// Sends all frames to Claude as a temporal sequence and returns a per-minute
// timeline of who was where doing what. One call analyses up to ~40 frames
// (8 cams × 5 frames) with heavy caching of worker reference photos so repeat
// calls within the 5-min cache TTL are ~10% of the first call's cost.

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Resize helper — Anthropic caps at 2000px per dimension for many-image requests.
async function shrink(buffer, max) {
  try {
    return await sharp(buffer).resize(max, max, { fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 82 }).toBuffer();
  } catch {
    return buffer;
  }
}

// Tolerant JSON parser. Claude's sequence output is large nested arrays —
// if max_tokens truncates mid-array we still want to return what we have.
// Strategy: find the outer object, try to parse it; on failure, walk back
// from the end closing-by-closing until we get something parseable.
function parseJsonWithRecovery(raw) {
  const start = raw.indexOf('{');
  if (start < 0) return {};
  let candidate = raw.slice(start);

  // Cheap, common case: full JSON parses clean
  try { return JSON.parse(candidate); } catch { /* continue */ }

  // Walk back, removing trailing chars and re-balancing braces/brackets
  for (let end = candidate.length; end > 100; end -= Math.max(1, Math.floor(end / 50))) {
    let attempt = candidate.slice(0, end);
    // Trim any dangling comma + close any unbalanced brackets/braces
    attempt = attempt.replace(/[,\s]+$/, '');
    let opens = 0, opensSq = 0;
    let inStr = false, escape = false;
    for (let i = 0; i < attempt.length; i++) {
      const c = attempt[i];
      if (escape) { escape = false; continue; }
      if (c === '\\') { escape = true; continue; }
      if (c === '"') { inStr = !inStr; continue; }
      if (inStr) continue;
      if (c === '{') opens++;
      else if (c === '}') opens--;
      else if (c === '[') opensSq++;
      else if (c === ']') opensSq--;
    }
    if (inStr) attempt += '"';
    while (opensSq-- > 0) attempt += ']';
    while (opens-- > 0) attempt += '}';
    try { return JSON.parse(attempt); } catch { /* try a shorter slice */ }
  }
  return {};
}

export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  const { agent_key, client_id, frames, window_start, window_end } = body;

  if (!agent_key || !client_id || !Array.isArray(frames) || frames.length === 0) {
    return NextResponse.json(
      { error: 'agent_key, client_id, and frames[] required' },
      { status: 400 }
    );
  }

  const db = getAdminClient();

  // Verify client
  const { data: clientData } = await db
    .from('clients')
    .select('id, name, industry')
    .eq('id', client_id)
    .single();
  if (!clientData) return NextResponse.json({ error: 'Client not found' }, { status: 404 });

  // Load workers + zones (same as analyze route)
  const [workersRes, zonesRes] = await Promise.all([
    db.from('workers')
      .select('id, full_name, department, photo_path')
      .eq('client_id', client_id).eq('is_active', true).is('deleted_at', null),
    db.from('camera_zones')
      .select('id, name, zone_type, location_label')
      .eq('client_id', client_id).eq('is_active', true),
  ]);
  const workers = workersRes.data || [];
  const zones = zonesRes.data || [];

  // ── Download and resize worker reference photos (multi-angle) ─────
  async function downloadPhoto(path) {
    try {
      const { data: signed } = await db.storage.from('worker-photos').createSignedUrl(path, 120);
      if (!signed?.signedUrl) return null;
      const res = await fetch(signed.signedUrl);
      if (!res.ok) return null;
      return await shrink(Buffer.from(await res.arrayBuffer()), 512);
    } catch { return null; }
  }

  const workersWithPhotos = await Promise.all(
    workers.map(async (w) => {
      const photos = [];
      if (w.photo_path) {
        const folder = w.photo_path.substring(0, w.photo_path.lastIndexOf('/'));
        try {
          const { data: files } = await db.storage.from('worker-photos').list(folder, { limit: 10 });
          const paths = (files || [])
            .filter((f) => /\.(jpg|jpeg|png|webp)$/i.test(f.name))
            .map((f) => `${folder}/${f.name}`)
            .sort()
            .slice(0, 5);
          for (const p of paths.length ? paths : [w.photo_path]) {
            const b = await downloadPhoto(p);
            if (b) photos.push(b);
          }
        } catch {
          const b = await downloadPhoto(w.photo_path);
          if (b) photos.push(b);
        }
      }
      return { ...w, photoBuffers: photos };
    })
  );

  // ── Download and resize all camera frames in parallel ─────────────
  const frameDownloads = await Promise.all(
    frames.flatMap((cam, camIdx) =>
      cam.frame_urls.map(async (url, i) => {
        try {
          const res = await fetch(url);
          if (!res.ok) return null;
          const buf = await shrink(Buffer.from(await res.arrayBuffer()), 1024);
          return {
            camera_channel: cam.camera_channel,
            minute_offset: cam.minute_offsets?.[i] ?? i,
            buffer: buf,
            camIdx,
            frameIdx: i,
          };
        } catch { return null; }
      })
    )
  );
  const frameBlocks = frameDownloads.filter(Boolean);
  if (frameBlocks.length === 0) {
    return NextResponse.json({ error: 'All frame downloads failed' }, { status: 502 });
  }

  // ── Build Claude message content ──────────────────────────────────
  // Strategy: reference photos cached at the top, then frames labelled
  // with (camera, minute offset) so Claude can emit a timeline.
  const content = [];

  // 1) Reference photos (cached)
  let refBlocksAdded = 0;
  for (const w of workersWithPhotos) {
    const total = w.photoBuffers.length;
    for (let i = 0; i < total; i++) {
      content.push({
        type: 'image',
        source: { type: 'base64', media_type: 'image/jpeg', data: w.photoBuffers[i].toString('base64') },
      });
      content.push({
        type: 'text',
        text: `Reference angle ${i + 1}/${total} of ${w.full_name} — ${w.department || 'staff'}`,
      });
      refBlocksAdded += 2;
    }
  }
  // Mark last reference block as cache boundary
  if (refBlocksAdded > 0) {
    const lastIdx = content.length - 1;
    content[lastIdx] = { ...content[lastIdx], cache_control: { type: 'ephemeral' } };
  }

  // 2) Camera frames, grouped by camera and minute
  for (const f of frameBlocks) {
    content.push({
      type: 'image',
      source: { type: 'base64', media_type: 'image/jpeg', data: f.buffer.toString('base64') },
    });
    content.push({
      type: 'text',
      text: `Camera ${f.camera_channel} · minute T+${f.minute_offset}`,
    });
  }

  // 3) Prompt
  const workerList = workersWithPhotos
    .filter((w) => w.photoBuffers.length > 0)
    .map((w) => `- ${w.full_name} (${w.department || 'staff'})`)
    .join('\n') || '(no registered workers with reference photos)';
  const zoneList = zones
    .map((z) => `- ${z.name} (${z.zone_type || 'general'})`)
    .join('\n') || '(no zones configured)';

  const windowLabel = window_start && window_end
    ? `${new Date(window_start).toISOString().slice(11, 16)} – ${new Date(window_end).toISOString().slice(11, 16)}`
    : 'recent window';

  content.push({
    type: 'text',
    text: `You are a workplace safety and attendance AI for ${clientData.name} (${clientData.industry}).

You are looking at a temporal sequence of camera frames across ${frames.length} camera(s) over the window ${windowLabel}. Each frame is labelled with its camera number and minute offset (T+0, T+1, T+2…) so you can reason about what happened across time.

REGISTERED WORKERS:
${workerList}
Each registered worker has multiple reference photos from different angles — treat all photos labelled with the same name as the SAME person.

ZONES:
${zoneList}

YOUR TASK:
1. For each camera, build a minute-by-minute timeline of who was present, where they were, and what activity they were engaged in.
2. Identify registered workers by face match against the reference photos. Be CONSERVATIVE — only assign a worker_name if confidence ≥ 0.85. Otherwise mark as "Unknown Person" at confidence 0.3.
3. Flag meaningful changes across time — someone leaving, someone new arriving, a zone becoming unstaffed, suspicious activity.
4. Count idle minutes (same person, same spot, no activity) and away minutes (expected presence but empty frame) per worker and per zone.
5. Flag alerts at the right severity — most unknown persons are customers/visitors (not zone violations). Only flag real risks.

OUTPUT BUDGET — keep the JSON under 6000 tokens. To stay within budget:
- For each minute, only list distinct people once (don't repeat the same Unknown Person across multiple frames of the same minute).
- Use SHORT field values: zone names from the registered list verbatim, single-word activity values, no parenthetical explanations inside worker_name.
- Include ALL alerts and worker_states; truncate the timeline array if necessary (better to lose late minutes than to return invalid JSON).

Return ONLY valid JSON in this exact shape:
{
  "timeline": [
    {
      "camera_channel": 1,
      "minutes": [
        {
          "offset": 0,
          "people": [
            {"worker_name": "...", "confidence": 0.85, "zone": "...", "activity": "working|idle|on_phone|chatting|on_break|unknown"}
          ]
        }
      ]
    }
  ],
  "summary": "One-paragraph narrative of the whole window across all cameras",
  "alerts": [
    {"alert_type": "staffing|zone_violation|ppe_violation|behaviour|safety|general", "camera_channel": 2, "minute_offset": 3, "worker_name": "...", "zone_name": "...", "message": "...", "severity": "low|medium|high"}
  ],
  "worker_states": [
    {"worker_name": "Basanio", "minutes_present": 4, "minutes_idle": 1, "minutes_away": 0, "primary_zone": "Reception"}
  ],
  "overall_status": "normal|warning|critical"
}`,
  });

  // ── Call Claude ──────────────────────────────────────────────────
  const startMs = Date.now();
  const model = 'claude-haiku-4-5-20251001';
  let analysis, inputTokens = 0, outputTokens = 0;

  try {
    const response = await anthropic.messages.create({
      model,
      // Sequence output has 8 cameras × N minutes of timeline rows + alerts +
      // worker_states. 3000 was getting truncated mid-array; 8000 gives
      // comfortable headroom while staying inside Haiku's per-call budget.
      max_tokens: 8000,
      messages: [{ role: 'user', content }],
    });
    inputTokens = response.usage?.input_tokens || 0;
    outputTokens = response.usage?.output_tokens || 0;
    const raw = response.content.find((b) => b.type === 'text')?.text || '{}';
    analysis = parseJsonWithRecovery(raw);
  } catch (err) {
    return NextResponse.json(
      { error: `Analysis failed: ${err.message}` },
      { status: 500 }
    );
  }

  const processingMs = Date.now() - startMs;
  const costUsd = calculateCost(model, inputTokens, outputTokens);

  // ── Persist results ──────────────────────────────────────────────
  let workerEventsInserted = 0;
  let alertsInserted = 0;
  const nowIso = new Date().toISOString();

  // Insert per-minute worker_events so existing dashboards stay populated.
  // We only store confidence ≥ 0.85 matches as real worker_ids; below that
  // they're logged as Unknown Person so false positives don't poison data.
  const eventRows = [];
  for (const cam of analysis.timeline || []) {
    for (const minute of cam.minutes || []) {
      const ts = window_start
        ? new Date(new Date(window_start).getTime() + (minute.offset || 0) * 60_000).toISOString()
        : nowIso;
      for (const p of minute.people || []) {
        const conf = typeof p.confidence === 'number' ? p.confidence : 0.5;
        const matched = conf >= 0.85 && p.worker_name && !/unknown/i.test(p.worker_name);
        eventRows.push({
          client_id,
          worker_id: matched
            ? workersWithPhotos.find((w) => w.full_name === p.worker_name)?.id || null
            : null,
          worker_name: matched ? p.worker_name : 'Unknown Person',
          event_type: 'detected',
          activity: p.activity || 'present',
          zone_id: zones.find((z) => z.name === p.zone)?.id || null,
          ppe_compliant: p.ppe_compliant !== false,
          confidence: conf,
          occurred_at: ts,
        });
      }
    }
  }
  if (eventRows.length > 0) {
    const { data } = await db.from('worker_events').insert(eventRows).select('id');
    workerEventsInserted = data?.length || 0;
  }

  // ── Active learning: auto-save high-confidence CCTV frames as new
  // reference photos. When Claude is very confident (≥ 0.95) about a
  // match, save the camera frame as an additional reference. Over time
  // the reference set grows with real CCTV-angle photos, which is
  // exactly what face matching needs to improve. Capped at 10 auto-saved
  // photos per worker so storage doesn't grow forever.
  const AUTO_LEARN_THRESHOLD = 0.95;
  const MAX_AUTO_PHOTOS = 10;

  for (const cam of analysis.timeline || []) {
    for (const minute of cam.minutes || []) {
      for (const p of minute.people || []) {
        const conf = typeof p.confidence === 'number' ? p.confidence : 0;
        if (conf < AUTO_LEARN_THRESHOLD || !p.worker_name || /unknown/i.test(p.worker_name)) continue;

        const worker = workersWithPhotos.find((w) =>
          w.full_name.toLowerCase() === p.worker_name.toLowerCase()
        );
        if (!worker?.photo_path) continue;

        try {
          const folder = worker.photo_path.substring(0, worker.photo_path.lastIndexOf('/'));

          // Count existing auto-saved photos to enforce cap
          const { data: existing } = await db.storage.from('worker-photos').list(folder, { limit: 50 });
          const autoCount = (existing || []).filter((f) => f.name.startsWith('auto_')).length;
          if (autoCount >= MAX_AUTO_PHOTOS) continue;

          // Find the frame URL from this camera + minute to save
          const camChannel = cam.camera_channel;
          const frameEntry = frameBlocks.find((f) => f.camera_channel === camChannel);
          if (!frameEntry?.buffer) continue;

          const autoName = `auto_${Date.now()}.jpg`;
          const autoPath = `${folder}/${autoName}`;
          await db.storage.from('worker-photos').upload(autoPath, frameEntry.buffer, {
            contentType: 'image/jpeg',
            upsert: false,
          });
          // Log it — this is a meaningful self-improvement event
          console.log(`[active-learning] Saved CCTV frame as reference for ${worker.full_name} (conf ${conf}) → ${autoPath}`);
        } catch (e) {
          // Non-fatal — learning failure doesn't break analysis
          console.warn(`[active-learning] Failed for ${p.worker_name}:`, e.message);
        }
      }
    }
  }

  // Alerts
  if (Array.isArray(analysis.alerts) && analysis.alerts.length > 0) {
    const alertRows = analysis.alerts.map((a) => ({
      client_id,
      alert_type: a.alert_type || 'general',
      message: a.message,
      worker_name: a.worker_name || null,
      zone_name: a.zone_name || null,
      is_resolved: false,
      created_at: nowIso,
    }));
    const { data } = await db.from('alerts').insert(alertRows).select('id');
    alertsInserted = data?.length || 0;
  }

  // Timeline row (for the dashboard timeline view)
  const idleMinutes = (analysis.worker_states || []).reduce((s, w) => s + (w.minutes_idle || 0), 0);
  const awayMinutes = (analysis.worker_states || []).reduce((s, w) => s + (w.minutes_away || 0), 0);

  const { data: timelineRow } = await db
    .from('activity_timeline')
    .insert({
      client_id,
      window_start: window_start || nowIso,
      window_end: window_end || nowIso,
      camera_channel: frames.length === 1 ? frames[0].camera_channel : null,
      timeline: analysis,
      summary: analysis.summary || null,
      workers_detected: workerEventsInserted,
      alerts_created: alertsInserted,
      idle_minutes: idleMinutes,
      away_minutes: awayMinutes,
      model_used: model,
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      cost_usd: costUsd,
      processing_ms: processingMs,
    })
    .select('id')
    .single();

  // Mark frames as analyzed so the next cycle doesn't re-fetch them
  const allPaths = frames.flatMap((f) => f.frame_urls.map((url) => {
    // Extract path from signed URL: .../storage/v1/object/sign/frames/<path>?token=...
    const m = url.match(/\/sign\/frames\/([^?]+)/);
    return m ? decodeURIComponent(m[1]) : null;
  })).filter(Boolean);
  if (allPaths.length > 0) {
    await db.from('frame_buffer').update({ analyzed: true }).in('frame_path', allPaths);
  }

  return NextResponse.json({
    success: true,
    timeline_id: timelineRow?.id,
    summary: analysis.summary,
    workers_detected: workerEventsInserted,
    alerts_created: alertsInserted,
    idle_minutes: idleMinutes,
    away_minutes: awayMinutes,
    cost_usd: costUsd,
    processing_ms: processingMs,
    input_tokens: inputTokens,
    output_tokens: outputTokens,
  });
}
