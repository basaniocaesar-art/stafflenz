import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// Temporary debug endpoint — remove after testing
export async function GET() {
  const clientId = 'dc20bf56-01e3-4a10-90e8-cb45e5c3e971';
  const db = getAdminClient();
  const today = new Date().toISOString().slice(0, 10);

  const [
    { data: summary },
    { data: recentEvents },
    { data: openAlerts },
    { data: dailySummary },
  ] = await Promise.all([
    db.from('monitoring_results').select('id, overall_status, workers_detected, alerts_created, created_at')
      .eq('client_id', clientId).order('created_at', { ascending: false }).limit(3),
    db.from('worker_events').select('id, worker_name, event_type, activity, occurred_at')
      .eq('client_id', clientId).order('occurred_at', { ascending: false }).limit(5),
    db.from('alerts').select('id, alert_type, message, created_at, is_resolved')
      .eq('client_id', clientId).eq('is_resolved', false).order('created_at', { ascending: false }).limit(5),
    db.from('daily_summary').select('*').eq('client_id', clientId).eq('summary_date', today).single(),
  ]);

  return NextResponse.json({
    server_time: new Date().toISOString(),
    today_date: today,
    recent_monitoring: summary,
    recent_events: recentEvents,
    open_alerts: openAlerts,
    daily_summary: dailySummary,
  });
}
