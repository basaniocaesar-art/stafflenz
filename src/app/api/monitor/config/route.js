import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getAdminClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

async function requireSuperAdmin(request) {
  const session = await requireAuth(request);
  if (!session) return null;
  if (session.user.role !== 'super_admin') return null;
  return session;
}

// GET /api/monitor/config — all clients with their camera zones
export async function GET(request) {
  const session = await requireSuperAdmin(request);
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const db = getAdminClient();

  // Progressive column detection — start with base columns, add extras if they exist
  const selects = [
    'id, name, industry, is_active',
    'id, name, industry, site_name, hikconnect_account_id, is_active',
    'id, name, industry, site_name, hikconnect_account_id, dvr_host, dvr_port, dvr_username, camera_source, is_active',
    'id, name, industry, site_name, hikconnect_account_id, dvr_host, dvr_port, dvr_username, camera_source, analysis_config, is_active',
  ];

  let clients, clientsError;
  for (let i = selects.length - 1; i >= 0; i--) {
    const result = await db.from('clients').select(selects[i]).order('name');
    if (!result.error) {
      clients = result.data;
      clientsError = null;
      break;
    }
    clientsError = result.error;
  }

  if (clientsError) return NextResponse.json({ error: clientsError.message }, { status: 500 });

  // Fetch zones for all clients
  const { data: zones } = await db
    .from('camera_zones')
    .select('id, client_id, name, camera_ip, camera_username, is_active, location_label, zone_type')
    .order('name');

  // Group zones by client
  const zonesByClient = {};
  for (const z of (zones || [])) {
    if (!zonesByClient[z.client_id]) zonesByClient[z.client_id] = [];
    zonesByClient[z.client_id].push(z);
  }

  const enriched = (clients || []).map(c => ({
    ...c,
    zones: zonesByClient[c.id] || [],
  }));

  return NextResponse.json({ clients: enriched });
}

// PUT /api/monitor/config — update camera credentials for a zone
export async function PUT(request) {
  const session = await requireSuperAdmin(request);
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await request.json();
  const { zone_id, camera_ip, camera_username, camera_password, site_name, industry, hikconnect_account_id, dvr_host, dvr_port, dvr_username, dvr_password, camera_source, client_id, analysis_config } = body;

  const db = getAdminClient();

  // Update client-level fields if provided
  if (client_id) {
    const clientUpdates = {};
    if (site_name             !== undefined) clientUpdates.site_name             = site_name             || null;
    if (industry              !== undefined) clientUpdates.industry              = industry              || null;
    if (hikconnect_account_id !== undefined) clientUpdates.hikconnect_account_id = hikconnect_account_id || null;
    if (dvr_host              !== undefined) clientUpdates.dvr_host              = dvr_host              || null;
    if (dvr_port              !== undefined) clientUpdates.dvr_port              = dvr_port ? Number(dvr_port) : 80;
    if (dvr_username          !== undefined) clientUpdates.dvr_username          = dvr_username          || null;
    if (dvr_password          !== undefined) clientUpdates.dvr_password          = dvr_password          || null;
    if (camera_source         !== undefined) clientUpdates.camera_source         = camera_source         || 'onvif';
    if (analysis_config       !== undefined) clientUpdates.analysis_config       = analysis_config;
    if (Object.keys(clientUpdates).length > 0) {
      await db.from('clients').update(clientUpdates).eq('id', client_id);
    }
  }

  // Update zone camera credentials if zone_id provided
  if (zone_id) {
    const zoneUpdates = {};
    if (camera_ip       !== undefined) zoneUpdates.camera_ip       = camera_ip       || null;
    if (camera_username !== undefined) zoneUpdates.camera_username  = camera_username || null;
    if (camera_password !== undefined) zoneUpdates.camera_password  = camera_password || null;

    const { data: zone, error } = await db
      .from('camera_zones')
      .update(zoneUpdates)
      .eq('id', zone_id)
      .select('id, client_id, name, camera_ip, camera_username, is_active, location_label, zone_type')
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ zone });
  }

  return NextResponse.json({ success: true });
}
