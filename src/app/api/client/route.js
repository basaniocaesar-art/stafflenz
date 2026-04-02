import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getAdminClient } from '@/lib/supabase';

export async function GET(request) {
  const session = await requireAuth(request);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { user, client } = session;
  const clientId = client?.id;
  if (!clientId) return NextResponse.json({ error: 'No client associated' }, { status: 400 });

  const db = getAdminClient();
  const today = new Date().toISOString().slice(0, 10);

  // Run queries in parallel for performance
  const [
    { data: summary },
    { data: recentEvents },
    { data: openAlerts },
    { count: totalWorkers },
    { data: weekSummary },
    { data: planLimit },
    { data: zonesData },
  ] = await Promise.all([
    // Today's summary
    db.from('daily_summary').select('*').eq('client_id', clientId).eq('summary_date', today).single(),
    // Last 50 events
    db.from('worker_events')
      .select('id, worker_name, activity, event_type, zone_id, confidence, zone_violation, ppe_compliant, occurred_at')
      .eq('client_id', clientId)
      .order('occurred_at', { ascending: false })
      .limit(50),
    // Open alerts count
    db.from('alerts').select('id, alert_type, message, worker_name, zone_name, created_at')
      .eq('client_id', clientId)
      .eq('is_resolved', false)
      .order('created_at', { ascending: false })
      .limit(20),
    // Total active workers
    db.from('workers').select('*', { count: 'exact', head: true })
      .eq('client_id', clientId).is('deleted_at', null).eq('is_active', true),
    // Last 7 days summary for chart
    db.from('daily_summary').select('summary_date, present_count, absent_count, late_count, violation_count, total_events')
      .eq('client_id', clientId)
      .gte('summary_date', new Date(Date.now() - 6 * 86400000).toISOString().slice(0, 10))
      .order('summary_date'),
    // Plan limits
    db.from('plan_limits').select('max_workers, max_cameras').eq('plan', client.plan).single(),
    // Active zones
    db.from('camera_zones').select('id, name, zone_type, location_label').eq('client_id', clientId).eq('is_active', true),
  ]);

  return NextResponse.json({
    client: { ...client, total_workers: totalWorkers || 0 },
    today: summary || { present_count: 0, absent_count: 0, late_count: 0, violation_count: 0, total_events: 0 },
    recent_events: recentEvents || [],
    open_alerts: openAlerts || [],
    week_chart: weekSummary || [],
    plan_limit: planLimit || {},
    zones: zonesData || [],
  });
}

// Resolve an alert
export async function PATCH(request) {
  const session = await requireAuth(request);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { client } = session;
  const body = await request.json();
  const { alert_id } = body;

  if (!alert_id) return NextResponse.json({ error: 'alert_id required' }, { status: 400 });

  const db = getAdminClient();
  const { data: alert } = await db.from('alerts').select('client_id').eq('id', alert_id).single();
  if (!alert || alert.client_id !== client?.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  await db.from('alerts').update({ is_resolved: true, resolved_at: new Date().toISOString() }).eq('id', alert_id);
  return NextResponse.json({ success: true });
}
