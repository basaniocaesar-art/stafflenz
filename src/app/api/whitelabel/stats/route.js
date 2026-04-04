import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getAdminClient } from '@/lib/supabase';

async function requireWLAdmin(request) {
  const session = await requireAuth(request);
  if (!session) return null;
  if (session.user.role !== 'white_label_admin') return null;
  return session;
}

export async function GET(request) {
  const session = await requireWLAdmin(request);
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const db = getAdminClient();
  const today = new Date().toISOString().slice(0, 10);

  const { data: clients } = await db
    .from('clients')
    .select('id, is_active')
    .eq('white_label_owner_id', session.user.id);

  if (!clients || clients.length === 0) {
    return NextResponse.json({
      total_clients: 0, active_clients: 0,
      total_workers: 0, events_today: 0, violations_today: 0,
    });
  }

  const clientIds = clients.map((c) => c.id);
  const activeClients = clients.filter((c) => c.is_active).length;

  const [{ count: totalWorkers }, { data: todayStats }] = await Promise.all([
    db.from('workers').select('*', { count: 'exact', head: true })
      .in('client_id', clientIds).is('deleted_at', null).eq('is_active', true),
    db.from('daily_summary').select('total_events, violation_count')
      .in('client_id', clientIds).eq('summary_date', today),
  ]);

  const eventsToday = (todayStats || []).reduce((s, r) => s + (r.total_events || 0), 0);
  const violationsToday = (todayStats || []).reduce((s, r) => s + (r.violation_count || 0), 0);

  return NextResponse.json({
    total_clients: clients.length,
    active_clients: activeClients,
    total_workers: totalWorkers || 0,
    events_today: eventsToday,
    violations_today: violationsToday,
  });
}
