import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { canAddCamera } from '@/lib/planLimits';
import { getAdminClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const session = await requireAuth(request);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { user, client } = session;
  const clientId = user.role === 'super_admin'
    ? (new URL(request.url).searchParams.get('client_id') || client?.id)
    : client?.id;
  if (!clientId) return NextResponse.json({ error: 'client_id required' }, { status: 400 });

  const { searchParams } = new URL(request.url);
  const locationId = searchParams.get('location');

  const db = getAdminClient();
  let query = db
    .from('camera_zones')
    .select('id, name, camera_key, camera_ip, location_label, zone_type, is_active, location_id, created_at')
    .eq('client_id', clientId)
    .order('created_at');
  if (locationId) query = query.eq('location_id', locationId);
  const { data: zones, error } = await query;

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ zones });
}

export async function POST(request) {
  const session = await requireAuth(request);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { client } = session;
  const clientId = client?.id;
  if (!clientId) return NextResponse.json({ error: 'No client associated' }, { status: 400 });

  const limitCheck = await canAddCamera(clientId);
  if (!limitCheck.allowed) {
    return NextResponse.json({ error: limitCheck.reason }, { status: 403 });
  }

  const body = await request.json();
  const { name, camera_ip, location_label, zone_type, device_type } = body;
  if (!name) return NextResponse.json({ error: 'Zone name required' }, { status: 400 });

  const db = getAdminClient();
  const row = { client_id: clientId, name, camera_ip, location_label, zone_type: zone_type || 'floor' };
  if (device_type) row.device_type = device_type;
  const { data: zone, error } = await db
    .from('camera_zones')
    .insert(row)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Return camera_key once — Pi uses this as its API auth token
  return NextResponse.json({ zone, camera_key: zone.camera_key }, { status: 201 });
}

export async function PUT(request) {
  const session = await requireAuth(request);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { client } = session;
  const db = getAdminClient();
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Zone id required' }, { status: 400 });

  const { data: existing } = await db.from('camera_zones').select('client_id').eq('id', id).single();
  if (!existing || existing.client_id !== client?.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const updates = await request.json();
  delete updates.camera_key; // Never allow key rotation via this endpoint
  delete updates.client_id;

  const { data: zone, error } = await db.from('camera_zones').update(updates).eq('id', id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ zone });
}

export async function DELETE(request) {
  const session = await requireAuth(request);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { client } = session;
  const db = getAdminClient();
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  const { data: existing } = await db.from('camera_zones').select('client_id').eq('id', id).single();
  if (!existing || existing.client_id !== client?.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  await db.from('camera_zones').update({ is_active: false }).eq('id', id);
  return NextResponse.json({ success: true });
}
