import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import sharp from 'sharp';
import { getAdminClient } from '@/lib/supabase';
import { calculateCost } from '@/lib/promptBuilder';

// POST /api/agent/analyze-burst
// Body: {
//   agent_key, client_id,
//   camera_channel, motion_score, detected_at,
//   frame_urls: [u1, u2, u3, u4, u5]  -- burst around the motion event, 1s apart
// }
//
// Urgent motion-triggered incident analysis. Fires a WhatsApp alert if
// severity is "high" or "critical". Writes to motion_events table for
// admin review. Cheaper than /analyze-sequence (fewer frames, one camera)
// but uses the same reference-photo cache so the first call in a 5-min
// window is full cost and subsequent ones ride the cache.

export const dynamic = 'force-dynamic';
export const maxDuration = 45;

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

async function shrink(buffer, max) {
  try {
    return await sharp(buffer).resize(max, max, { fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 82 }).toBuffer();
  } catch {
    return buffer;
  }
}

// Tolerant JSON parser — recovers from truncated arrays by closing
// dangling braces/brackets. Same shape as analyze-sequence.
function parseJsonRecovery(raw) {
  const start = raw.indexOf('{');
  if (start < 0) return {};
  let candidate = raw.slice(start);
  try { return JSON.parse(candidate); } catch { /* fallthrough */ }
  for (let end = candidate.length; end > 100; end -= Math.max(1, Math.floor(end / 50))) {
    let attempt = candidate.slice(0, end).replace(/[,\s]+$/, '');
    let opens = 0, opensSq = 0, inStr = false, escape = false;
    for (let i = 0; i < attempt.length; i++) {
      const c = attempt[i];
      if (escape) { escape = false; continue; }
      if (c === '\\') { escape = true; continue; }
      if (c === '"') { inStr = !inStr; continue; }
      if (inStr) continue;
      if (c === '{') opens++; else if (c === '}') opens--;
      else if (c === '[') opensSq++; else if (c === ']') opensSq--;
    }
    if (inStr) attempt += '"';
    while (opensSq-- > 0) attempt += ']';
    while (opens-- > 0) attempt += '}';
    try { return JSON.parse(attempt); } catch { /* shorter slice next iter */ }
  }
  return {};
}

export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  const {
    agent_key,
    client_id,
    camera_channel,
    motion_score,
    detected_at,
    frame_urls,
  } = body;

  if (!agent_key || !client_id || !Array.isArray(frame_urls) || frame_urls.length === 0) {
    return NextResponse.json(
      { error: 'agent_key, client_id, and frame_urls[] required' },
      { status: 400 }
    );
  }

  const db = getAdminClient();

  const { data: clientData } = await db
    .from('clients')
    .select('id, name, industry, whatsapp_notify, analysis_config')
    .eq('id', client_id)
    .single();
  if (!clientData) return NextResponse.json({ error: 'Client not found' }, { status: 404 });

  const [workersRes, zonesRes] = await Promise.all([
    db.from('workers')
      .select('id, full_name, department, photo_path')
      .eq('client_id', client_id).eq('is_active', true).is('deleted_at', null),
    db.from('camera_zones')
      .select('id, name, zone_type')
      .eq('client_id', client_id).eq('is_active', true),
  ]);
  const workers = workersRes.data || [];
  const zones = zonesRes.data || [];

  // ── Reference photos (cached) ─────────────────────────────────────
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

  // ── Download burst frames ────────────────────────────────────────
  const burstFrames = await Promise.all(
    frame_urls.map(async (url, i) => {
      try {
        const res = await fetch(url);
        if (!res.ok) return null;
        return { idx: i, buffer: await shrink(Buffer.from(await res.arrayBuffer()), 1024) };
      } catch { return null; }
    })
  );
  const frames = burstFrames.filter(Boolean);
  if (frames.length === 0) {
    return NextResponse.json({ error: 'All burst frame downloads failed' }, { status: 502 });
  }

  // ── Build Claude message ─────────────────────────────────────────
  const content = [];
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
  if (refBlocksAdded > 0) {
    content[content.length - 1] = {
      ...content[content.length - 1],
      cache_control: { type: 'ephemeral' },
    };
  }

  for (const f of frames) {
    content.push({
      type: 'image',
      source: { type: 'base64', media_type: 'image/jpeg', data: f.buffer.toString('base64') },
    });
    content.push({
      type: 'text',
      text: `Burst frame ${f.idx + 1}/${frames.length} (captured ~${f.idx}s after motion trigger)`,
    });
  }

  const workerList = workersWithPhotos
    .filter((w) => w.photoBuffers.length > 0)
    .map((w) => `- ${w.full_name} (${w.department || 'staff'})`)
    .join('\n') || '(no registered workers)';
  const zoneList = zones.map((z) => `- ${z.name}`).join('\n') || '(no zones)';

  content.push({
    type: 'text',
    text: `URGENT: Motion detected on Camera ${camera_channel} at ${detected_at || 'now'} (motion score ${motion_score || 'n/a'}/255).

The ${frames.length} frames above are a burst captured ~1 second apart around the motion event.

REGISTERED WORKERS (each has multiple reference angles — same name = same person):
${workerList}

ZONES:
${zoneList}

YOUR TASK — analyse what happened during this burst:
1. Describe the action unfolding across the frames (person X entered, picked up Y, moved to Z).
2. Match visible faces to registered workers. Be conservative: assign worker_name only if confidence ≥ 0.85, else "Unknown Person".
3. Judge severity:
   - "low" — routine activity (staff at work, customer browsing)
   - "medium" — unusual but not alarming (unknown person in public zone, minor PPE lapse)
   - "high" — probable incident (after-hours intrusion, unauthorised restricted-zone access, visible theft)
   - "critical" — confirmed serious event (person concealing merchandise, fight, medical emergency)
4. If severity is high/critical, this will fire a WhatsApp alert — make the message clear and actionable.

Return ONLY valid JSON:
{
  "incident_summary": "One-line description of what happened",
  "narrative": "Frame-by-frame description of the action",
  "identified_people": ["Basanio", "Unknown Person 1"],
  "severity": "low|medium|high|critical",
  "alert_type": "zone_violation|unauthorized|ppe_violation|behaviour|safety|general",
  "zone_name": "...",
  "requires_attention": true|false,
  "suggested_action": "What the admin should do about this"
}`,
  });

  // ── Call Claude ──────────────────────────────────────────────────
  const startMs = Date.now();
  const model = 'claude-haiku-4-5-20251001';
  let analysis, inputTokens = 0, outputTokens = 0;

  try {
    const response = await anthropic.messages.create({
      model,
      max_tokens: 1500,
      messages: [{ role: 'user', content }],
    });
    inputTokens = response.usage?.input_tokens || 0;
    outputTokens = response.usage?.output_tokens || 0;
    const raw = response.content.find((b) => b.type === 'text')?.text || '{}';
    // Tolerant parse — see analyze-sequence for the same helper
    analysis = parseJsonRecovery(raw);
  } catch (err) {
    return NextResponse.json(
      { error: `Analysis failed: ${err.message}` },
      { status: 500 }
    );
  }

  const processingMs = Date.now() - startMs;
  const costUsd = calculateCost(model, inputTokens, outputTokens);

  // ── Active learning: auto-save high-confidence CCTV frames ────────
  // Same mechanism as analyze-sequence — harvest 0.95+ matches as new
  // reference photos so recognition improves over time.
  const AUTO_LEARN_THRESHOLD = 0.95;
  const MAX_AUTO_PHOTOS = 10;
  for (const personName of analysis.identified_people || []) {
    if (/unknown/i.test(personName)) continue;
    // The burst response doesn't include per-person confidence, so we
    // only auto-learn from burst results when severity is low (routine
    // activity — high-severity frames may contain unusual angles that
    // would confuse future matching).
    if (severity !== 'low') continue;

    const cleanName = personName.split('(')[0].trim();
    const worker = workersWithPhotos.find((w) =>
      w.full_name.toLowerCase() === cleanName.toLowerCase()
    );
    if (!worker?.photo_path || !frames[0]?.buffer) continue;

    try {
      const folder = worker.photo_path.substring(0, worker.photo_path.lastIndexOf('/'));
      const { data: existing } = await db.storage.from('worker-photos').list(folder, { limit: 50 });
      const autoCount = (existing || []).filter((f) => f.name.startsWith('auto_')).length;
      if (autoCount >= MAX_AUTO_PHOTOS) continue;

      const autoPath = `${folder}/auto_${Date.now()}.jpg`;
      await db.storage.from('worker-photos').upload(autoPath, frames[0].buffer, {
        contentType: 'image/jpeg',
        upsert: false,
      });
      console.log(`[active-learning] Saved burst frame as reference for ${cleanName} → ${autoPath}`);
    } catch (e) {
      console.warn(`[active-learning] Failed for ${cleanName}:`, e.message);
    }
  }

  // ── Persist motion_event row ─────────────────────────────────────
  const framePaths = frame_urls.map((url) => {
    const m = url.match(/\/sign\/frames\/([^?]+)/);
    return m ? decodeURIComponent(m[1]) : null;
  }).filter(Boolean);

  const severity = ['low', 'medium', 'high', 'critical'].includes(analysis.severity)
    ? analysis.severity
    : 'low';

  const { data: eventRow } = await db
    .from('motion_events')
    .insert({
      client_id,
      camera_channel,
      detected_at: detected_at || new Date().toISOString(),
      motion_score,
      frame_paths: framePaths,
      analyzed: true,
      analysis_json: analysis,
      severity,
      incident_summary: analysis.incident_summary || null,
      identified_people: analysis.identified_people || null,
      cost_usd: costUsd,
    })
    .select('id')
    .single();

  // Write an alert row if requires_attention
  let alertCreated = false;
  if (analysis.requires_attention || severity === 'high' || severity === 'critical') {
    await db.from('alerts').insert({
      client_id,
      alert_type: analysis.alert_type || 'general',
      message: analysis.incident_summary || 'Motion event on camera ' + camera_channel,
      worker_name: (analysis.identified_people || [])[0] || null,
      zone_name: analysis.zone_name || null,
      is_resolved: false,
    });
    alertCreated = true;
  }

  // ── WhatsApp alert on high/critical severity ─────────────────────
  let alertSent = false;
  if (severity === 'high' || severity === 'critical') {
    const whatsappNumber = clientData.analysis_config?.whatsapp_number || clientData.whatsapp_notify;
    if (whatsappNumber) {
      try {
        const { sendWhatsApp } = await import('@/lib/whatsapp');
        const msg = [
          `🚨 StaffLenz Motion Alert — ${clientData.name}`,
          `Camera ${camera_channel} · ${new Date(detected_at || Date.now()).toLocaleString('en-IN')}`,
          '',
          analysis.incident_summary || 'Motion event detected',
          '',
          analysis.suggested_action ? `Suggested action: ${analysis.suggested_action}` : '',
        ].filter(Boolean).join('\n');
        await sendWhatsApp(whatsappNumber, msg);
        alertSent = true;
        await db.from('motion_events').update({ alert_sent: true }).eq('id', eventRow.id);
      } catch (e) {
        console.warn('[analyze-burst] whatsapp failed', e.message);
      }
    }
  }

  return NextResponse.json({
    success: true,
    motion_event_id: eventRow?.id,
    severity,
    incident_summary: analysis.incident_summary,
    identified_people: analysis.identified_people,
    alert_created: alertCreated,
    alert_sent: alertSent,
    cost_usd: costUsd,
    processing_ms: processingMs,
  });
}
