import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getAdminClient } from '@/lib/supabase';

// GET /api/locations — list all locations for the caller's client
// POST /api/locations — create a new location (client_admin or super_admin)

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const session = await requireAuth(request);
  if (!session || !session.client) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db = getAdminClient();
  const clientId = session.client.id;

  const { data: locations } = await db
    .from('locations')
    .select('id, name, address, city, dvr_ip, max_cameras, is_active, created_at')
    .eq('client_id', clientId)
    .eq('is_active', true)
    .order('name');

  // Get summary stats per location
  const today = new Date().toISOString().slice(0, 10);
  const enriched = await Promise.all(
    (locations || []).map(async (loc) => {
      const [
        { count: workerCount },
        { count: alertCount },
        { count: cameraCount },
      ] = await Promise.all([
        db.from('workers').select('*', { count: 'exact', head: true })
          .eq('client_id', clientId).eq('location_id', loc.id).eq('is_active', true).is('deleted_at', null),
        db.from('alerts').select('*', { count: 'exact', head: true })
          .eq('client_id', clientId).eq('location_id', loc.id).eq('is_resolved', false),
        db.from('camera_zones').select('*', { count: 'exact', head: true })
          .eq('client_id', clientId).eq('location_id', loc.id).eq('is_active', true),
      ]);

      // Latest timeline summary
      const { data: latestTl } = await db
        .from('activity_timeline')
        .select('summary, workers_detected, window_start')
        .eq('client_id', clientId)
        .eq('location_id', loc.id)
        .order('window_start', { ascending: false })
        .limit(1)
        .single();

      return {
        ...loc,
        worker_count: workerCount || 0,
        open_alerts: alertCount || 0,
        camera_count: cameraCount || 0,
        latest_summary: latestTl?.summary || null,
        latest_analysis_at: latestTl?.window_start || null,
        workers_detected_last: latestTl?.workers_detected || 0,
      };
    })
  );

  return NextResponse.json({ locations: enriched });
}

export async function POST(request) {
  const session = await requireAuth(request);
  if (!session || !session.client) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (session.user.role !== 'client_admin' && session.user.role !== 'super_admin') {
    return NextResponse.json({ error: 'Only admins can add locations' }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const { name, address, city, dvr_ip, dvr_port, dvr_username, dvr_password, max_cameras } = body;

  if (!name) return NextResponse.json({ error: 'name required' }, { status: 400 });

  const db = getAdminClient();

  const { data: location, error } = await db
    .from('locations')
    .insert({
      client_id: session.client.id,
      name,
      address: address || null,
      city: city || null,
      dvr_ip: dvr_ip || null,
      dvr_port: dvr_port || 80,
      dvr_username: dvr_username || null,
      dvr_password: dvr_password || null,
      max_cameras: max_cameras || 8,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ location }, { status: 201 });
}
