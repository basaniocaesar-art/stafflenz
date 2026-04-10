import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getAdminClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const session = await requireAuth(request);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { user, client } = session;
  const clientId = client?.id;
  if (!clientId) return NextResponse.json({ error: 'No client associated' }, { status: 400 });

  const db = getAdminClient();
  const today = new Date().toISOString().slice(0, 10);

  // Progressive fetch of onboarding_completed flag (column may not exist yet)
  let onboardingCompleted = true; // default: assume completed so existing users aren't blocked
  try {
    const { data: oc, error: ocErr } = await db
      .from('clients')
      .select('onboarding_completed')
      .eq('id', clientId)
      .single();
    if (!ocErr && oc && oc.onboarding_completed === false) onboardingCompleted = false;
  } catch { /* column missing — leave default */ }

  // Run queries in parallel for performance
  const [
    { data: summary },
    { data: recentEvents },
    { data: openAlerts },
    { count: totalWorkers },
    { data: weekSummary },
    { data: planLimit },
    { data: zonesData },
    { data: workersData },
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
    // Active workers list
    db.from('workers').select('id, full_name, department, shift').eq('client_id', clientId).eq('is_active', true).is('deleted_at', null),
  ]);

  const res = NextResponse.json({
    client: { ...client, total_workers: totalWorkers || 0, onboarding_completed: onboardingCompleted },
    today: summary || { present_count: 0, absent_count: 0, late_count: 0, violation_count: 0, total_events: 0 },
    recent_events: recentEvents || [],
    open_alerts: openAlerts || [],
    week_chart: weekSummary || [],
    plan_limit: planLimit || {},
    zones: zonesData || [],
    workers: workersData || [],
    onboarding_completed: onboardingCompleted,
  });
  res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  return res;
}

// Resolve an alert
export async function PATCH(request) {
  const session = await requireAuth(request);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { client } = session;
  const body = await request.json();
  const { alert_id, whatsapp_notify } = body;
  const db = getAdminClient();

  // Save WhatsApp number
  if (whatsapp_notify !== undefined) {
    await db.from('clients').update({ whatsapp_notify }).eq('id', client?.id);
    return NextResponse.json({ success: true });
  }

  if (!alert_id) return NextResponse.json({ error: 'alert_id required' }, { status: 400 });

  const { data: alert } = await db.from('alerts').select('client_id').eq('id', alert_id).single();
  if (!alert || alert.client_id !== client?.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  await db.from('alerts').update({ is_resolved: true, resolved_at: new Date().toISOString() }).eq('id', alert_id);
  return NextResponse.json({ success: true });
}
