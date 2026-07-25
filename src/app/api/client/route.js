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

  // Location filtering — ?location=<uuid> scopes everything to one site.
  // If omitted, returns data across all locations (rollup view).
  const { searchParams } = new URL(request.url);
  const locationId = searchParams.get('location');

  // Check if this client has any locations set up
  const { data: locationsData } = await db
    .from('locations')
    .select('id, name, industry, monitoring_paused, whatsapp_notify')
    .eq('client_id', clientId)
    .eq('is_active', true);
  const hasLocations = (locationsData || []).length > 0;

  // Helper: add location filter to a query if applicable
  function locFilter(query) {
    if (locationId) return query.eq('location_id', locationId);
    return query;
  }

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
  // Each query is scoped to location if ?location=<id> is set
  const [
    { data: summary },
    { data: recentEvents },
    { data: openAlerts },
    { count: totalOpenAlerts },
    { count: totalWorkers },
    { data: weekSummary },
    { data: planLimit },
    { data: zonesData },
    { data: workersData },
  ] = await Promise.all([
    // Today's summary (daily_summary doesn't have location_id yet — skip filtering)
    db.from('daily_summary').select('*').eq('client_id', clientId).eq('summary_date', today).single(),
    // Last 50 events
    locFilter(db.from('worker_events')
      .select('id, worker_name, activity, event_type, zone_id, confidence, zone_violation, ppe_compliant, occurred_at')
      .eq('client_id', clientId))
      .order('occurred_at', { ascending: false })
      .limit(50),
    // Open alerts (latest 20 for display)
    locFilter(db.from('alerts').select('id, alert_type, message, worker_name, zone_name, created_at')
      .eq('client_id', clientId)
      .eq('is_resolved', false))
      .order('created_at', { ascending: false })
      .limit(20),
    // Total open alerts count
    locFilter(db.from('alerts').select('id', { count: 'exact', head: true })
      .eq('client_id', clientId)
      .eq('is_resolved', false)),
    // Total active workers
    locFilter(db.from('workers').select('*', { count: 'exact', head: true })
      .eq('client_id', clientId).is('deleted_at', null).eq('is_active', true)),
    // Last 7 days summary for chart
    db.from('daily_summary').select('summary_date, present_count, absent_count, late_count, violation_count, total_events')
      .eq('client_id', clientId)
      .gte('summary_date', new Date(Date.now() - 6 * 86400000).toISOString().slice(0, 10))
      .order('summary_date'),
    // Plan limits
    db.from('plan_limits').select('max_workers, max_cameras').eq('plan', client.plan).single(),
    // Active zones — scope to location when one is selected
    locFilter(db.from('camera_zones').select('id, name, zone_type, location_label').eq('client_id', clientId).eq('is_active', true)),
    // Active workers list — scope to location when one is selected
    locFilter(db.from('workers').select('id, full_name, department, shift').eq('client_id', clientId).eq('is_active', true).is('deleted_at', null)),
  ]);

  // ── v2 data: timeline narratives + latest camera snapshots ─────
  // These come from the temporal-analysis pipeline (agent v2) and give
  // the dashboard real narrative context instead of generic event rows.
  let recentTimelines = [];
  let latestSnapshots = [];
  let todayCost = 0;

  try {
    // Last 12 timeline narratives (1 hour at 5-min intervals)
    const { data: tlData } = await locFilter(db
      .from('activity_timeline')
      .select('id, window_start, window_end, summary, workers_detected, alerts_created, idle_minutes, away_minutes, cost_usd')
      .eq('client_id', clientId))
      .order('window_start', { ascending: false })
      .limit(12);
    recentTimelines = tlData || [];

    // Today's total Claude cost
    const todayStart = new Date().toISOString().slice(0, 10) + 'T00:00:00Z';
    const { data: costData } = await db
      .from('activity_timeline')
      .select('cost_usd')
      .eq('client_id', clientId)
      .gte('window_start', todayStart);
    todayCost = (costData || []).reduce((s, r) => s + (r.cost_usd || 0), 0);

    // Latest snapshot per camera from frame_buffer (for the camera grid).
    // MUST be scoped to a specific location — without it, "latest cam 1"
    // could be from site A and "latest cam 2" from site B, producing a
    // mishmash grid that misrepresents any single site. When no location
    // is selected (rollup view), return an empty grid so the UI prompts
    // the user to pick a site.
    const cameraChannels = [1, 2, 3, 4, 5, 6, 7, 8];
    if (locationId) {
      const snapPromises = cameraChannels.map(async (ch) => {
        const { data: latest } = await db
          .from('frame_buffer')
          .select('frame_path, captured_at, has_motion')
          .eq('client_id', clientId)
          .eq('camera_channel', ch)
          .eq('location_id', locationId)
          .order('captured_at', { ascending: false })
          .limit(1)
          .single();
        if (!latest) return { channel: ch, url: null, captured_at: null };
        const { data: signed } = await db.storage.from('frames').createSignedUrl(latest.frame_path, 300);
        return {
          channel: ch,
          url: signed?.signedUrl || null,
          captured_at: latest.captured_at,
          has_motion: latest.has_motion,
        };
      });
      latestSnapshots = await Promise.all(snapPromises);
    } else {
      latestSnapshots = [];
    }
  } catch (e) {
    // v2 tables might not exist yet — degrade gracefully
    console.warn('[client API] v2 data fetch failed:', e.message);
  }

  // Warehouse events today (for warehouse-mode locations)
  let warehouseSummary = null;
  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    let wq = db
      .from('warehouse_events')
      .select('event_type, location_id, event_time, details')
      .eq('client_id', clientId)
      .gte('event_time', todayStart.toISOString())
      .order('event_time', { ascending: false })
      .limit(500);
    if (locationId) wq = wq.eq('location_id', locationId);
    const { data: whEvents } = await wq;
    if (whEvents && whEvents.length > 0) {
      const byLoc = {};
      for (const e of whEvents) {
        const k = e.location_id || 'none';
        if (!byLoc[k]) byLoc[k] = { entries: 0, exits: 0, trucks_arrived: 0, trucks_departed: 0, loading: 0, unloading: 0, unusual: 0, recent: [] };
        const b = byLoc[k];
        if (e.event_type === 'entry')          b.entries += (e.details?.count || 1);
        else if (e.event_type === 'exit')      b.exits += (e.details?.count || 1);
        else if (e.event_type === 'truck_arrived')  b.trucks_arrived += (e.details?.count || 1);
        else if (e.event_type === 'truck_departed') b.trucks_departed += (e.details?.count || 1);
        else if (e.event_type === 'loading')   b.loading += 1;
        else if (e.event_type === 'unloading') b.unloading += 1;
        else if (e.event_type === 'unusual')   b.unusual += 1;
        if (b.recent.length < 12) b.recent.push({ event_type: e.event_type, event_time: e.event_time, details: e.details });
      }
      warehouseSummary = Object.entries(byLoc).map(([location_id, s]) => ({ location_id, ...s }));
    }
  } catch (e) {
    console.warn('[client API] warehouse_events fetch failed:', e.message);
  }

  // Latest presence snapshot(s) — one per location (or filtered by current location)
  let presenceSnapshots = [];
  try {
    let pq = db
      .from('presence_snapshots')
      .select('location_id, captured_at, workers_present, workers_present_names, workers_seen_today, workers_left, workers_left_names, visitors_visible')
      .eq('client_id', clientId)
      .order('captured_at', { ascending: false })
      .limit(50);
    if (locationId) pq = pq.eq('location_id', locationId);
    const { data: snaps } = await pq;
    // Dedup to latest per location_id
    const seen = new Set();
    presenceSnapshots = (snaps || []).filter((s) => {
      const k = s.location_id || 'none';
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  } catch (e) {
    console.warn('[client API] presence_snapshots fetch failed:', e.message);
  }

  const res = NextResponse.json({
    client: { ...client, total_workers: totalWorkers || 0, onboarding_completed: onboardingCompleted },
    // Multi-location support
    locations: locationsData || [],
    has_locations: hasLocations,
    current_location: locationId || null,
    today: summary || { present_count: 0, absent_count: 0, late_count: 0, violation_count: 0, total_events: 0 },
    recent_events: recentEvents || [],
    open_alerts: openAlerts || [],
    open_alerts_count: totalOpenAlerts || 0,
    week_chart: weekSummary || [],
    plan_limit: planLimit || {},
    zones: zonesData || [],
    workers: workersData || [],
    presence_snapshots: presenceSnapshots,
    warehouse_summary: warehouseSummary,
    onboarding_completed: onboardingCompleted,
    // v2 additions
    timelines: recentTimelines,
    camera_snapshots: latestSnapshots,
    today_cost_usd: todayCost,
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
