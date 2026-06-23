// Toggle the monitoring_paused flag on a location.
// Super admin: can pause/resume any location.
// Client admin: can pause/resume only locations belonging to their own client.

import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getAdminClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function POST(request, { params }) {
  const session = await requireAuth(request);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id: locationId } = await params;
  const body = await request.json().catch(() => ({}));
  // Accept explicit paused=true|false, otherwise toggle the current value
  const explicit = typeof body.paused === 'boolean' ? body.paused : null;

  const db = getAdminClient();

  // Load the location to authorize + read current state
  const { data: loc, error: loadErr } = await db
    .from('locations')
    .select('id, client_id, monitoring_paused, name')
    .eq('id', locationId)
    .maybeSingle();

  if (loadErr || !loc) {
    return NextResponse.json({ error: 'Location not found' }, { status: 404 });
  }

  const isSuper  = session.user.role === 'super_admin';
  const isClient = session.user.role === 'client_admin' && session.user.client_id === loc.client_id;
  if (!isSuper && !isClient) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const nextPaused = explicit !== null ? explicit : !loc.monitoring_paused;

  const { error: updErr } = await db
    .from('locations')
    .update({
      monitoring_paused: nextPaused,
      paused_at:         nextPaused ? new Date().toISOString() : null,
      paused_by_user:    nextPaused ? session.user.id : null,
    })
    .eq('id', locationId);

  if (updErr) {
    return NextResponse.json({ error: updErr.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    location_id: locationId,
    name: loc.name,
    monitoring_paused: nextPaused,
  });
}
