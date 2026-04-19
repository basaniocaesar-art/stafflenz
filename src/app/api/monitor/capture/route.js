import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase';

// ─── Auto-routing capture ────────────────────────────────────────────────────
// Checks the client's camera_source setting and delegates to the right capture API:
//   - 'hikconnect' → /api/hik/capture   (Hik-Connect cloud API)
//   - 'onvif'      → /api/onvif/capture  (direct DVR via port-forward + ONVIF/ISAPI)
// The orchestrator only calls this route — it doesn't need to know which method is used.

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://lenzai.org';

function verifyInternalSecret(request) {
  return request.headers.get('x-internal-secret') === process.env.INTERNAL_SECRET;
}

export async function POST(request) {
  if (!verifyInternalSecret(request)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json();
  const { client_id } = body;
  if (!client_id) return NextResponse.json({ error: 'client_id required' }, { status: 400 });

  const db = getAdminClient();

  // Determine which capture method this client uses
  // Try with new columns first, fall back to base columns if migration hasn't run
  let client;
  const full = await db.from('clients').select('id, camera_source, hikconnect_account_id, dvr_host').eq('id', client_id).single();
  if (full.error && full.error.message?.includes('column')) {
    const base = await db.from('clients').select('id').eq('id', client_id).single();
    client = base.data ? { ...base.data, camera_source: null, hikconnect_account_id: null, dvr_host: null } : null;
  } else {
    client = full.data;
  }

  if (!client) {
    return NextResponse.json({ error: 'Client not found' }, { status: 404 });
  }

  // Auto-detect source — check client config, then fall back to env vars
  let source = client.camera_source;
  if (!source) {
    if (client.hikconnect_account_id) source = 'hikconnect';
    else if (client.dvr_host || process.env.DVR_HOST) source = 'onvif';
    else {
      return NextResponse.json({
        error: 'No camera source configured. Set either Hik-Connect account ID or DVR host for this client.',
      }, { status: 400 });
    }
  }

  // Route to the appropriate capture API
  const captureUrl = source === 'hikconnect'
    ? `${BASE_URL}/api/hik/capture`
    : `${BASE_URL}/api/onvif/capture`;

  const res = await fetch(captureUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-internal-secret': process.env.INTERNAL_SECRET,
    },
    body: JSON.stringify({ client_id }),
  });

  const data = await res.json();

  if (!res.ok) {
    return NextResponse.json(data, { status: res.status });
  }

  return NextResponse.json({ ...data, source });
}
