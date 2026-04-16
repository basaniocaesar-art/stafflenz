import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getAdminClient } from '@/lib/supabase';

// GET /api/incidents/:id
//   Returns the full motion_event + signed burst-frame URLs + the rolling
//   ±context_seconds window of frames from frame_buffer so the admin can
//   scrub through what happened around the incident.
//
// PATCH /api/incidents/:id
//   Body: { resolved_note?: string }
//   Marks associated alert rows as resolved (motion_events has no resolved
//   column itself — resolution state lives on the alerts table).

export const dynamic = 'force-dynamic';

const CONTEXT_SECONDS = 60; // ±60s window of surrounding frames
const MAX_CONTEXT_FRAMES = 80;

async function signPaths(db, paths, expiresIn = 1800) {
  return Promise.all(paths.map(async (p) => {
    try {
      const { data } = await db.storage.from('frames').createSignedUrl(p, expiresIn);
      return { path: p, url: data?.signedUrl || null };
    } catch {
      return { path: p, url: null };
    }
  }));
}

export async function GET(_request, { params }) {
  const session = await requireAuth(_request);
  if (!session || !session.client) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db = getAdminClient();
  const { data: incident, error } = await db
    .from('motion_events')
    .select('*')
    .eq('id', params.id)
    .eq('client_id', session.client.id)
    .single();

  if (error || !incident) {
    return NextResponse.json({ error: 'Incident not found' }, { status: 404 });
  }

  // Sign the burst frames (the ones that triggered analysis)
  const burstPaths = Array.isArray(incident.frame_paths) ? incident.frame_paths : [];
  const burst_frames = await signPaths(db, burstPaths, 1800);

  // Pull ±CONTEXT_SECONDS of surrounding frames from frame_buffer
  const eventTime = new Date(incident.detected_at);
  const from = new Date(eventTime.getTime() - CONTEXT_SECONDS * 1000).toISOString();
  const to = new Date(eventTime.getTime() + CONTEXT_SECONDS * 1000).toISOString();

  const { data: contextRows } = await db
    .from('frame_buffer')
    .select('id, frame_path, captured_at, has_motion')
    .eq('client_id', session.client.id)
    .eq('camera_channel', incident.camera_channel)
    .gte('captured_at', from)
    .lte('captured_at', to)
    .order('captured_at', { ascending: true })
    .limit(MAX_CONTEXT_FRAMES);

  const context_frames = await Promise.all(
    (contextRows || []).map(async (r) => {
      try {
        const { data } = await db.storage.from('frames').createSignedUrl(r.frame_path, 1800);
        return {
          id: r.id,
          url: data?.signedUrl || null,
          captured_at: r.captured_at,
          has_motion: r.has_motion,
        };
      } catch {
        return { id: r.id, url: null, captured_at: r.captured_at, has_motion: r.has_motion };
      }
    })
  );

  // Related alerts so the admin can see what was flagged in the alerts stream
  const { data: alerts } = await db
    .from('alerts')
    .select('id, alert_type, message, worker_name, zone_name, is_resolved, created_at')
    .eq('client_id', session.client.id)
    .gte('created_at', new Date(eventTime.getTime() - 60_000).toISOString())
    .lte('created_at', new Date(eventTime.getTime() + 60_000).toISOString())
    .order('created_at', { ascending: true });

  return NextResponse.json({
    incident,
    burst_frames,
    context_frames,
    context_window_seconds: CONTEXT_SECONDS,
    related_alerts: alerts || [],
  });
}

export async function PATCH(request, { params }) {
  const session = await requireAuth(request);
  if (!session || !session.client) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { resolved = true } = await request.json().catch(() => ({}));

  const db = getAdminClient();

  // Find the incident + associated alerts (±60s from detected_at) and flip them.
  const { data: incident } = await db
    .from('motion_events')
    .select('detected_at')
    .eq('id', params.id)
    .eq('client_id', session.client.id)
    .single();
  if (!incident) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const from = new Date(new Date(incident.detected_at).getTime() - 60_000).toISOString();
  const to = new Date(new Date(incident.detected_at).getTime() + 60_000).toISOString();

  await db
    .from('alerts')
    .update({ is_resolved: resolved, resolved_at: resolved ? new Date().toISOString() : null })
    .eq('client_id', session.client.id)
    .gte('created_at', from)
    .lte('created_at', to);

  return NextResponse.json({ ok: true, resolved });
}
