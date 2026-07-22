// Live per-location headcount — reads the freshest ~5 min of activity_timeline
// and returns the count of people currently on camera. Bypasses the 30-min
// presence_snapshots cron so the dashboard tile can update every minute.

import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getAdminClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

const isReal = (n) => {
  const x = (n || '').toLowerCase().trim();
  return x && x !== 'unknown person' && x !== 'unknown' && x !== 'n/a';
};

function aggregate(timelines, filterChannels) {
  const filter = Array.isArray(filterChannels) && filterChannels.length > 0
    ? new Set(filterChannels.map(Number))
    : null;
  const names = new Set();
  let peopleAtPeakMinute = 0;

  for (const tl of (timelines || [])) {
    const body = tl.timeline || tl;
    for (const camWindow of (body?.timeline || [])) {
      if (filter && !filter.has(camWindow.camera_channel)) continue;
      for (const minute of (camWindow.minutes || [])) {
        let n = 0;
        for (const p of (minute.people || [])) {
          n++;
          if (isReal(p.worker_name)) names.add(p.worker_name);
        }
        if (n > peopleAtPeakMinute) peopleAtPeakMinute = n;
      }
    }
  }
  return { names: [...names].sort(), peopleAtPeakMinute };
}

export async function GET(request) {
  const session = await requireAuth(request);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const db = getAdminClient();
  const isSuper = session.user.role === 'super_admin';
  const { searchParams } = new URL(request.url);
  const clientId = isSuper ? (searchParams.get('client_id') || session.user.client_id) : session.user.client_id;
  if (!clientId) return NextResponse.json({ error: 'No client context' }, { status: 400 });

  const { data: locations } = await db
    .from('locations')
    .select('id, name, headcount_cameras, monitoring_paused')
    .eq('client_id', clientId)
    .eq('is_active', true);

  const FIVE_MIN_AGO = new Date(Date.now() - 5 * 60 * 1000).toISOString();

  const out = [];
  for (const loc of (locations || [])) {
    if (loc.monitoring_paused) {
      out.push({ location_id: loc.id, name: loc.name, paused: true, present: null, worker_names: [], cameras: loc.headcount_cameras || null });
      continue;
    }
    const { data: recent } = await db
      .from('activity_timeline')
      .select('timeline, window_end')
      .eq('location_id', loc.id)
      .gte('window_end', FIVE_MIN_AGO)
      .order('window_end', { ascending: false });
    const { names, peopleAtPeakMinute } = aggregate(recent, loc.headcount_cameras);
    out.push({
      location_id: loc.id,
      name: loc.name,
      present: peopleAtPeakMinute,
      worker_names: names,
      cameras: loc.headcount_cameras || null,   // null = all cameras counted
      latest_window: recent?.[0]?.window_end || null,
    });
  }

  return NextResponse.json({ ok: true, at: new Date().toISOString(), locations: out });
}
