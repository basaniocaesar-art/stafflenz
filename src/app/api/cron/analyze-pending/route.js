import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase';

// GET /api/cron/analyze-pending
// Every 5 minutes Vercel calls this. It scans frame_buffer for unanalyzed
// frames per client, batches them, calls /api/monitor/analyze, and marks
// the frames analyzed. This is what makes the pipeline truly always-on:
// any bridge (iVMS watcher, HCNetSDK, manual upload) just dumps frames into
// the bucket — this cron handles the rest.
//
// Auth: Vercel cron header OR internal secret.

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const FRAMES_PER_BATCH = 8;          // max frames per analyze call
const MAX_AGE_MINUTES  = 30;         // ignore frames older than this (stale)
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://stafflenz.com';

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

  // 1. Find clients with unanalyzed frames in the recent window
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

  // 2. Group by client → location → camera
  const byClient = new Map();
  for (const f of pending) {
    if (!byClient.has(f.client_id)) byClient.set(f.client_id, []);
    byClient.get(f.client_id).push(f);
  }

  const report = [];

  for (const [client_id, frames] of byClient) {
    // Take the most recent FRAMES_PER_BATCH across all cameras for this client
    const batch = frames.slice(-FRAMES_PER_BATCH);
    const frame_paths = batch.map((f) => f.frame_path);

    // Sign URLs
    const signed = await Promise.all(
      batch.map((f) => db.storage.from('frames').createSignedUrl(f.frame_path, 600))
    );
    const frame_urls = signed
      .map((s) => s?.data?.signedUrl)
      .filter(Boolean);

    if (frame_urls.length === 0) {
      report.push({ client_id, skipped: 'no signed urls' });
      continue;
    }

    // Call analyze
    const t0 = Date.now();
    let analyzeOk = false;
    try {
      const res = await fetch(`${APP_URL}/api/monitor/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-internal-secret': process.env.INTERNAL_SECRET,
        },
        body: JSON.stringify({ client_id, frame_urls }),
      });
      analyzeOk = res.ok;
      if (!res.ok) {
        const text = await res.text();
        report.push({ client_id, error: `analyze HTTP ${res.status}: ${text.slice(0, 200)}` });
      }
    } catch (e) {
      report.push({ client_id, error: `analyze fetch: ${e.message}` });
    }

    // Mark frames analyzed regardless — don't let one bad batch loop forever
    const { error: updErr } = await db
      .from('frame_buffer')
      .update({ analyzed: true })
      .in('frame_path', frame_paths);
    if (updErr) report.push({ client_id, mark_error: updErr.message });

    report.push({
      client_id,
      frames_analyzed: frame_urls.length,
      analyze_ok: analyzeOk,
      elapsed_ms: Date.now() - t0,
    });
  }

  return NextResponse.json({
    ok: true,
    clients_processed: byClient.size,
    total_frames: pending.length,
    report,
  });
}
