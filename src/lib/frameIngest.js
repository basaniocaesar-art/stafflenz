import { getAdminClient } from './supabase';

// ═══════════════════════════════════════════════════════════════════════════════
// Universal frame ingestion — shared by edge agent, FTP receiver, HTTP API,
// and email receiver. Each input method calls ingestFrame() to upload + index;
// analysis is triggered separately (by the input method or a scheduler).
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Upload a frame to Supabase storage and index it in frame_buffer.
 *
 * @param {object} opts
 * @param {string} opts.client_id      - UUID of the client
 * @param {number} opts.camera_channel - 1-based camera channel number
 * @param {Buffer} opts.buffer         - raw JPEG buffer
 * @param {string} [opts.captured_at]  - ISO timestamp (defaults to now)
 * @param {boolean} [opts.has_motion]  - was motion detected on this frame
 * @returns {{ frame_path: string, captured_at: string }}
 */
export async function ingestFrame({ client_id, camera_channel, buffer, captured_at, has_motion = false }) {
  const db = getAdminClient();
  const ts = captured_at || new Date().toISOString();
  const tsSlug = ts.replace(/[:.]/g, '-');
  const frame_path = `${client_id}/cam${camera_channel}_${tsSlug}.jpg`;

  // Upload to storage
  const { error: uploadErr } = await db.storage
    .from('frames')
    .upload(frame_path, buffer, { contentType: 'image/jpeg', upsert: true });
  if (uploadErr) throw new Error(`Frame upload failed: ${uploadErr.message}`);

  // Index in frame_buffer
  const { error: indexErr } = await db.from('frame_buffer').insert({
    client_id,
    camera_channel,
    frame_path,
    captured_at: ts,
    has_motion,
    analyzed: false,
  });
  if (indexErr) {
    console.warn('[frameIngest] frame_buffer insert failed:', indexErr.message);
    // Non-fatal — frame is in storage even if index fails
  }

  return { frame_path, captured_at: ts };
}

/**
 * Check if a sequence analysis is due for this client (last analysis > threshold ago).
 * If yes, collect recent frames and call /api/agent/analyze-sequence internally.
 *
 * @param {string} client_id
 * @param {number} analyze_interval_min - how often to analyze (e.g. 5)
 * @param {string} api_url - base URL (e.g. https://stafflenz.vercel.app)
 * @param {string} agent_key
 * @returns {{ triggered: boolean, result?: object }}
 */
export async function maybeRunSequenceAnalysis({ client_id, analyze_interval_min = 5, api_url, agent_key }) {
  const db = getAdminClient();

  // Check last analysis time
  const { data: last } = await db
    .from('activity_timeline')
    .select('window_end')
    .eq('client_id', client_id)
    .order('window_end', { ascending: false })
    .limit(1)
    .single();

  const lastAnalysisMs = last?.window_end ? new Date(last.window_end).getTime() : 0;
  const msSinceLast = Date.now() - lastAnalysisMs;

  if (msSinceLast < analyze_interval_min * 60 * 1000) {
    return { triggered: false, reason: `Last analysis ${Math.round(msSinceLast / 60000)}m ago, threshold ${analyze_interval_min}m` };
  }

  // Collect recent frames per camera from frame_buffer
  const { data: recentFrames } = await db
    .from('frame_buffer')
    .select('camera_channel, frame_path, captured_at')
    .eq('client_id', client_id)
    .eq('analyzed', false)
    .order('captured_at', { ascending: false })
    .limit(50);

  if (!recentFrames || recentFrames.length === 0) {
    return { triggered: false, reason: 'No unanalyzed frames in buffer' };
  }

  // Group by camera, pick up to 5 per camera
  const byCam = {};
  for (const f of recentFrames) {
    const ch = f.camera_channel;
    if (!byCam[ch]) byCam[ch] = [];
    if (byCam[ch].length < 5) byCam[ch].push(f);
  }

  // Sign URLs
  const camFrames = [];
  for (const [ch, rows] of Object.entries(byCam)) {
    const sorted = rows.sort((a, b) => new Date(a.captured_at) - new Date(b.captured_at));
    const urls = [];
    for (const r of sorted) {
      const { data: signed } = await db.storage.from('frames').createSignedUrl(r.frame_path, 3600);
      if (signed?.signedUrl) urls.push(signed.signedUrl);
    }
    if (urls.length === 0) continue;
    const oldest = new Date(sorted[0].captured_at).getTime();
    const offsets = sorted.map(r => Math.round((new Date(r.captured_at).getTime() - oldest) / 60000));
    camFrames.push({ camera_channel: parseInt(ch), frame_urls: urls, minute_offsets: offsets });
  }

  if (camFrames.length === 0) {
    return { triggered: false, reason: 'No signed URLs' };
  }

  const windowStart = new Date(Date.now() - analyze_interval_min * 60 * 1000).toISOString();
  const windowEnd = new Date().toISOString();

  // Call analyze-sequence
  try {
    const res = await fetch(`${api_url}/api/agent/analyze-sequence`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        agent_key: agent_key || 'server-ingest',
        client_id,
        frames: camFrames,
        window_start: windowStart,
        window_end: windowEnd,
      }),
    });
    const body = await res.json();
    return { triggered: true, status: res.status, result: body };
  } catch (e) {
    return { triggered: true, error: e.message };
  }
}
