// Set / clear the WhatsApp alert recipient for a location.
// Super admin: any location. Client admin: only own client's locations.

import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getAdminClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

const E164_RE = /^\+[1-9][0-9]{6,14}$/;

function normalizePhone(raw) {
  if (!raw) return null;
  const trimmed = String(raw).trim().replace(/\s+/g, '');
  // Accept with leading "whatsapp:" prefix
  const stripped = trimmed.replace(/^whatsapp:/i, '');
  if (!E164_RE.test(stripped)) return null;
  return stripped;
}

export async function POST(request, { params }) {
  const session = await requireAuth(request);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id: locationId } = await params;
  const body = await request.json().catch(() => ({}));
  const rawPhone = body.phone ?? null;
  const clear = body.clear === true || rawPhone === '' || rawPhone === null;

  let phone = null;
  if (!clear) {
    phone = normalizePhone(rawPhone);
    if (!phone) {
      return NextResponse.json({
        error: 'Invalid phone — must be in international format starting with + and country code, e.g. +919745216329',
      }, { status: 400 });
    }
  }

  const db = getAdminClient();
  const { data: loc, error: loadErr } = await db
    .from('locations')
    .select('id, client_id, name')
    .eq('id', locationId)
    .maybeSingle();

  if (loadErr || !loc) return NextResponse.json({ error: 'Location not found' }, { status: 404 });

  const isSuper  = session.user.role === 'super_admin';
  const isClient = session.user.role === 'client_admin' && session.user.client_id === loc.client_id;
  if (!isSuper && !isClient) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { error: updErr } = await db
    .from('locations')
    .update({ whatsapp_notify: phone })
    .eq('id', locationId);
  if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 });

  return NextResponse.json({
    ok: true,
    location_id: locationId,
    name: loc.name,
    whatsapp_notify: phone,
  });
}
