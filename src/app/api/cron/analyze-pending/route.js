import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase';

// GET /api/cron/analyze-pending
// Every 5 minutes Vercel calls this. It scans frame_buffer for unanalyzed
// frames per client+location, batches them, calls /api/agent/analyze-sequence,
// and marks the frames analyzed. This is what makes the pipeline truly
// always-on: any bridge (iVMS watcher, HCNetSDK, screenshot uploader,
// manual upload) just dumps frames into the bucket — this cron handles
// the rest.
//
// We call analyze-sequence (not monitor/analyze) so results land in
// activity_timeline (what the dashboard reads from).
//
// Auth: Vercel cron header OR internal secret.

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const FRAMES_PER_BATCH = 8;          // max frames per analyze call
const MAX_AGE_MINUTES  = 30;         // ignore frames older than this (stale)
// Use www. explicitly to avoid the apex→www 307 redirect that strips auth
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://www.stafflenz.com';

function isAuthorized(request) {
  if (request.headers.get('authorization') === `Bearer ${process.env.CRON_SECRET}`) return true;
  if (request.headers.get('x-internal-secret') === process.env.INTERNAL_SECRET) return true;
  return false;
}

export async function GET(request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const db = getAdminClient();
  const cutoff = new Date(Date.now() - MAX_AGE_MINUTES * 60 * 1000).toISOString();

  // 1. Find unanalyzed frames in the recent window, oldest first
  const { data: pending, error } = await db
    .from('frame_buffer')
    .select('client_id, location_id, camera_channel, frame_path, captured_at')
    .eq('analyzed', false)
    .gte('captured_at', cutoff)
    .order('captured_at', { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!pending || pending.length === 0) {
    return NextResponse.json({ ok: true, clients_processed: 0, message: 'No pending frames' });
  }

  // 2. Group by client + location (analyze-sequence is per-location)
  const buckets = new Map();
  for (const f of pending) {
    const key = `${f.client_id}::${f.location_id || ''}`;
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push(f);
  }

  const report = [];

  for (const [key, frames] of buckets) {
    const [client_id, locRaw] = key.split('::');
    const location_id = locRaw || null;

    // Take the most recent FRAMES_PER_BATCH for this bucket
    const batch = frames.slice(-FRAMES_PER_BATCH);
    const frame_paths = batch.map((f) => f.frame_path);

    // Sign URLs
    const signed = await Promise.all(
      batch.map((f) => db.storage.from('frames').createSignedUrl(f.frame_path, 600))
    );
    const frame_urls = signed.map((s) => s?.data?.signedUrl).filter(Boolean);

    if (frame_urls.length === 0) {
      report.push({ client_id, location_id, skipped: 'no signed urls' });
      continue;
    }

    // Build minute_offsets from oldest→newest frames in the batch
    const t0Ms = new Date(batch[0].captured_at).getTime();
    const minute_offsets = batch.map((f) =>
      Math.round((new Date(f.captured_at).getTime() - t0Ms) / 60_000)
    );
    const camera_channel = batch[0].camera_channel ?? 0;
    const window_start = batch[0].captured_at;
    const window_end   = batch[batch.length - 1].captured_at;

    // Call analyze-sequence (writes to activity_timeline)
    const t0 = Date.now();
    let analyzeOk = false;
    let analyzeStatus = 0;
    try {
      const res = await fetch(`${APP_URL}/api/agent/analyze-sequence`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          agent_key: 'cron-analyze-pending',
          client_id,
          location_id,
          frames: [
            { camera_channel, frame_urls, minute_offsets },
          ],
          window_start,
          window_end,
        }),
      });
      analyzeStatus = res.status;
      analyzeOk = res.ok;
      if (!res.ok) {
        const text = await res.text();
        report.push({ client_id, location_id, error: `analyze HTTP ${res.status}: ${text.slice(0, 200)}` });
      }
    } catch (e) {
      report.push({ client_id, location_id, error: `analyze fetch: ${e.message}` });
    }

    // Mark frames analyzed regardless — don't let one bad batch loop forever
    const { error: updErr } = await db
      .from('frame_buffer')
      .update({ analyzed: true })
      .in('frame_path', frame_paths);
    if (updErr) report.push({ client_id, location_id, mark_error: updErr.message });

    report.push({
      client_id,
      location_id,
      frames_analyzed: frame_urls.length,
      analyze_ok: analyzeOk,
      analyze_status: analyzeStatus,
      elapsed_ms: Date.now() - t0,
    });
  }

  return NextResponse.json({
    ok: true,
    clients_processed: buckets.size,
    total_frames: pending.length,
    report,
  });
}
