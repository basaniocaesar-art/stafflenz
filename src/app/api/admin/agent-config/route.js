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

// GET /api/admin/agent-config?client_id=...&location_id=...
// Returns the per-client config.json blob the Windows edge agent expects.
// Contains the supabase service-role key, so this is gated to super_admin only.
// DVR fields are blank — filled in by ensure-config.js on the Windows PC at install time.
export async function GET(request) {
  const session = await requireSuperAdmin(request);
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const clientId = searchParams.get('client_id');
  const locationId = searchParams.get('location_id') || null;
  if (!clientId) return NextResponse.json({ error: 'client_id required' }, { status: 400 });

  const db = getAdminClient();
  const { data: client, error } = await db
    .from('clients')
    .select('id, name, industry')
    .eq('id', clientId)
    .single();
  if (error || !client) return NextResponse.json({ error: 'Client not found' }, { status: 404 });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
  }

  const slug = (client.name || 'client').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 24) || 'client';
  const agentKey = `slz_${slug}_${Date.now()}`;
  const apiUrl = new URL(request.url).origin;

  const config = {
    agent_key: agentKey,
    api_url: apiUrl,
    supabase_url: supabaseUrl,
    supabase_key: supabaseKey,
    client_id: clientId,
    location_id: locationId,
    dvr_ip: '',
    dvr_port: 80,
    dvr_username: 'admin',
    dvr_password: '',
    max_channels: 8,
    interval_ms: 180000,
    capture_sec: 5,
    analyze_min: 10,
    motion_enabled: false,
    motion_threshold: 10,
    motion_cooldown_sec: 45,
    schedule: 'business_hours',
    exclude_cameras: [],
    motion_exclude_cameras: [],
  };

  const filename = `config-${slug}.json`;
  return new NextResponse(JSON.stringify(config, null, 2), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  });
}
