import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getAdminClient } from '@/lib/supabase';
import crypto from 'crypto';

// POST /api/agent/register — generate an agent key for a client
// Called from the admin panel when setting up a new edge agent
export async function POST(request) {
  const session = await requireAuth(request);
  if (!session || session.user.role !== 'super_admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { client_id } = await request.json();
  if (!client_id) return NextResponse.json({ error: 'client_id required' }, { status: 400 });

  const db = getAdminClient();

  // Generate a unique agent key
  const agent_key = `slz_${crypto.randomBytes(24).toString('hex')}`;

  // Store it on the client record
  // Try with agent_key column, create it if needed
  const { error } = await db
    .from('clients')
    .update({ agent_key })
    .eq('id', client_id);

  if (error && error.message?.includes('column')) {
    // Column doesn't exist — return the key anyway, admin can store it manually
    return NextResponse.json({
      agent_key,
      client_id,
      note: 'Run migration to add agent_key column to clients table',
      config: {
        agent_key,
        api_url: process.env.NEXT_PUBLIC_APP_URL || 'https://www.stafflenz.com',
        supabase_url: process.env.NEXT_PUBLIC_SUPABASE_URL,
        supabase_key: process.env.SUPABASE_SERVICE_ROLE_KEY,
        client_id,
      },
    });
  }

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    agent_key,
    client_id,
    config: {
      agent_key,
      api_url: process.env.NEXT_PUBLIC_APP_URL || 'https://www.stafflenz.com',
      supabase_url: process.env.NEXT_PUBLIC_SUPABASE_URL,
      supabase_key: process.env.SUPABASE_SERVICE_ROLE_KEY,
      client_id,
    },
  });
}
