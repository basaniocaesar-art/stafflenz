import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getAdminClient } from '@/lib/supabase';

// GET /api/client/timeline-frames?id=<timeline_id>
// Returns signed frame URLs for a specific activity_timeline entry.
// Pulls from frame_buffer the frames captured during that window.

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const session = await requireAuth(request);
  if (!session || !session.client) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const timelineId = searchParams.get('id');
  if (!timelineId) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const db = getAdminClient();
  const clientId = session.client.id;

  // Fetch the timeline entry
  const { data: tl, error: tlErr } = await db
    .from('activity_timeline')
    .select('id, window_start, window_end, timeline, summary, workers_detected, alerts_created')
    .eq('id', timelineId)
    .eq('client_id', clientId)
    .single();

  if (tlErr || !tl) return NextResponse.json({ error: 'Timeline entry not found' }, { status: 404 });

  // Fetch frames from frame_buffer during this window
  const { data: frames } = await db
    .from('frame_buffer')
    .select('id, camera_channel, frame_path, captured_at, has_motion')
    .eq('client_id', clientId)
    .gte('captured_at', tl.window_start)
    .lte('captured_at', tl.window_end)
    .order('captured_at', { ascending: true })
    .limit(40);

  // Pick one frame per camera (the middle one for best representation)
  const byCam = {};
  for (const f of (frames || [])) {
    if (!byCam[f.camera_channel]) byCam[f.camera_channel] = [];
    byCam[f.camera_channel].push(f);
  }

  const selectedFrames = [];
  for (const [ch, camFrames] of Object.entries(byCam)) {
    // Pick the middle frame
    const mid = camFrames[Math.floor(camFrames.length / 2)];
    try {
      const { data: signed } = await db.storage.from('frames').createSignedUrl(mid.frame_path, 600);
      selectedFrames.push({
        camera_channel: parseInt(ch),
        url: signed?.signedUrl || null,
        captured_at: mid.captured_at,
        has_motion: mid.has_motion,
      });
    } catch {
      selectedFrames.push({ camera_channel: parseInt(ch), url: null, captured_at: mid.captured_at });
    }
  }

  selectedFrames.sort((a, b) => a.camera_channel - b.camera_channel);

  return NextResponse.json({
    timeline: tl,
    frames: selectedFrames,
    total_frames_in_window: (frames || []).length,
  });
}
