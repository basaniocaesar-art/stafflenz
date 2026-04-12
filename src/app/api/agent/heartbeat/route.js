import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase';

// POST /api/agent/heartbeat — edge agent reports its status
export async function POST(request) {
  const body = await request.json();
  const { agent_key, client_id, status, channels, last_capture, uptime } = body;

  if (!agent_key || !client_id) {
    return NextResponse.json({ error: 'agent_key and client_id required' }, { status: 400 });
  }

  // Verify agent key matches client (simple check — agent_key stored on client record)
  // For now, accept any non-empty key as valid (will validate once column exists)

  const db = getAdminClient();

  // Try to update agent status on client record
  const updates = {};
  try {
    // Store heartbeat data — try with agent columns
    const { error } = await db.from('clients').update({
      agent_status: status,
      agent_last_seen: new Date().toISOString(),
      agent_channels: channels,
      agent_uptime: Math.round(uptime || 0),
    }).eq('id', client_id);

    if (error && error.message?.includes('column')) {
      // Columns don't exist yet — just acknowledge
      return NextResponse.json({ ok: true, note: 'heartbeat received (columns pending migration)' });
    }
  } catch (e) {
    // Ignore DB errors — heartbeat is best-effort
  }

  return NextResponse.json({ ok: true, server_time: new Date().toISOString() });
}
