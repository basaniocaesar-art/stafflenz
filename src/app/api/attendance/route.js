import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getAdminClient } from '@/lib/supabase';

// GET /api/attendance?date=2026-04-17&range=day|week|month
//
// Calculates attendance from worker_events detection data:
//   - First detection = clock-in
//   - Last detection = clock-out
//   - Gap > 15 min between detections = break
//   - Active hours = total - breaks
//
// Returns daily logs + weekly/monthly summaries per worker for payroll.

export const dynamic = 'force-dynamic';

const BREAK_GAP_MINUTES = 15;

function formatDuration(minutes) {
  if (!minutes || minutes <= 0) return '—';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function formatTime(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
}

function computeAttendanceForDay(worker, events) {
  if (!events || events.length === 0) {
    return {
      worker_id: worker.id,
      worker_name: worker.full_name,
      department: worker.department,
      shift: worker.shift,
      status: 'absent',
      first_seen: null,
      last_seen: null,
      total_minutes: 0,
      active_minutes: 0,
      break_minutes: 0,
      break_count: 0,
      breaks: [],
      detection_count: 0,
      avg_confidence: 0,
    };
  }

  const sorted = [...events].sort((a, b) => new Date(a.occurred_at) - new Date(b.occurred_at));
  const firstSeen = new Date(sorted[0].occurred_at);
  const lastSeen = new Date(sorted[sorted.length - 1].occurred_at);
  const totalMinutes = Math.round((lastSeen - firstSeen) / 60000);

  // Detect breaks
  const breaks = [];
  for (let i = 0; i < sorted.length - 1; i++) {
    const gap = (new Date(sorted[i + 1].occurred_at) - new Date(sorted[i].occurred_at)) / 60000;
    if (gap >= BREAK_GAP_MINUTES) {
      breaks.push({
        start: sorted[i].occurred_at,
        start_display: formatTime(sorted[i].occurred_at),
        end: sorted[i + 1].occurred_at,
        end_display: formatTime(sorted[i + 1].occurred_at),
        minutes: Math.round(gap),
        duration_display: formatDuration(Math.round(gap)),
      });
    }
  }

  const breakMinutes = breaks.reduce((s, b) => s + b.minutes, 0);
  const activeMinutes = Math.max(0, totalMinutes - breakMinutes);
  const avgConf = sorted.reduce((s, e) => s + (e.confidence || 0), 0) / sorted.length;

  // Status
  let status = 'present';
  const checkInHour = firstSeen.getHours() + firstSeen.getMinutes() / 60;
  if (checkInHour > 9.5) status = 'late';
  const minsSinceLast = (Date.now() - lastSeen.getTime()) / 60000;
  if (minsSinceLast >= BREAK_GAP_MINUTES && totalMinutes > 0) status = 'on_break';
  if (totalMinutes < 30) status = 'partial';

  return {
    worker_id: worker.id,
    worker_name: worker.full_name,
    department: worker.department,
    shift: worker.shift,
    status,
    first_seen: firstSeen.toISOString(),
    first_seen_display: formatTime(firstSeen.toISOString()),
    last_seen: lastSeen.toISOString(),
    last_seen_display: formatTime(lastSeen.toISOString()),
    total_minutes: totalMinutes,
    total_display: formatDuration(totalMinutes),
    active_minutes: activeMinutes,
    active_display: formatDuration(activeMinutes),
    break_minutes: breakMinutes,
    break_display: formatDuration(breakMinutes),
    break_count: breaks.length,
    breaks,
    detection_count: sorted.length,
    avg_confidence: parseFloat(avgConf.toFixed(2)),
  };
}

export async function GET(request) {
  const session = await requireAuth(request);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { client } = session;
  const clientId = client?.id;
  if (!clientId) return NextResponse.json({ error: 'No client associated' }, { status: 400 });

  const { searchParams } = new URL(request.url);
  const range = searchParams.get('range') || 'day';
  const dateParam = searchParams.get('date') || new Date().toISOString().slice(0, 10);

  const db = getAdminClient();

  // Get all active workers
  const { data: workers } = await db
    .from('workers')
    .select('id, full_name, employee_id, department, shift')
    .eq('client_id', clientId)
    .is('deleted_at', null)
    .eq('is_active', true)
    .order('full_name');

  if (!workers || workers.length === 0) {
    return NextResponse.json({ range, date: dateParam, records: [], summary: {}, worker_reports: [] });
  }

  // Determine date range
  let dates = [];
  if (range === 'week') {
    for (let i = 6; i >= 0; i--) {
      dates.push(new Date(Date.now() - i * 86400000).toISOString().slice(0, 10));
    }
  } else if (range === 'month') {
    for (let i = 29; i >= 0; i--) {
      dates.push(new Date(Date.now() - i * 86400000).toISOString().slice(0, 10));
    }
  } else {
    dates = [dateParam];
  }

  const from = dates[0];
  const to = dates[dates.length - 1];

  // Fetch all worker_events in the range. For named workers we match by
  // worker_id (reliable) but also include name-matched events where
  // worker_id was null but worker_name matched a registered worker.
  const dayStart = `${from}T00:00:00Z`;
  const dayEnd = `${to}T23:59:59Z`;

  const workerIds = workers.map(w => w.id);
  const workerNames = workers.map(w => w.full_name);

  const { data: events } = await db
    .from('worker_events')
    .select('worker_id, worker_name, event_type, activity, confidence, occurred_at')
    .eq('client_id', clientId)
    .gte('occurred_at', dayStart)
    .lte('occurred_at', dayEnd)
    .neq('worker_name', 'Unknown Person')
    .order('occurred_at');

  // Compute per-worker per-day records
  const allRecords = [];
  for (const date of dates) {
    const dStart = new Date(`${date}T00:00:00Z`).getTime();
    const dEnd = new Date(`${date}T23:59:59Z`).getTime();
    const dayEvents = (events || []).filter(e => {
      const t = new Date(e.occurred_at).getTime();
      return t >= dStart && t <= dEnd;
    });

    for (const worker of workers) {
      // Match events to this worker by id or by name (case-insensitive)
      const wEvents = dayEvents.filter(e =>
        (e.worker_id && e.worker_id === worker.id) ||
        (e.worker_name && e.worker_name.toLowerCase() === worker.full_name.toLowerCase())
      );
      const record = computeAttendanceForDay(worker, wEvents);
      allRecords.push({ ...record, date });
    }
  }

  // Today's summary
  const todayRecords = allRecords.filter(r => r.date === dates[dates.length - 1]);
  const summary = {
    date: dates[dates.length - 1],
    total: todayRecords.length,
    present: todayRecords.filter(r => ['present', 'late', 'on_break'].includes(r.status)).length,
    late: todayRecords.filter(r => r.status === 'late').length,
    on_break: todayRecords.filter(r => r.status === 'on_break').length,
    absent: todayRecords.filter(r => r.status === 'absent').length,
    total_active_hours: parseFloat((todayRecords.reduce((s, r) => s + r.active_minutes, 0) / 60).toFixed(1)),
  };

  // Worker-level summaries for the full range (weekly/monthly payroll reports)
  const workerReports = workers.map(w => {
    const wRecords = allRecords.filter(r => r.worker_id === w.id);
    const daysPresent = wRecords.filter(r => r.status !== 'absent').length;
    const daysAbsent = wRecords.filter(r => r.status === 'absent').length;
    const daysLate = wRecords.filter(r => r.status === 'late').length;
    const totalActiveMin = wRecords.reduce((s, r) => s + r.active_minutes, 0);
    const totalBreakMin = wRecords.reduce((s, r) => s + r.break_minutes, 0);
    const totalBreaks = wRecords.reduce((s, r) => s + r.break_count, 0);
    const avgDailyHours = daysPresent > 0 ? totalActiveMin / daysPresent / 60 : 0;

    // Average arrival/departure
    const arrivals = wRecords.filter(r => r.first_seen).map(r => {
      const d = new Date(r.first_seen);
      return d.getHours() + d.getMinutes() / 60;
    });
    const departures = wRecords.filter(r => r.last_seen).map(r => {
      const d = new Date(r.last_seen);
      return d.getHours() + d.getMinutes() / 60;
    });
    const avgArrival = arrivals.length > 0 ? arrivals.reduce((a, b) => a + b) / arrivals.length : null;
    const avgDeparture = departures.length > 0 ? departures.reduce((a, b) => a + b) / departures.length : null;

    return {
      worker_id: w.id,
      worker_name: w.full_name,
      department: w.department,
      days_present: daysPresent,
      days_absent: daysAbsent,
      days_late: daysLate,
      total_active_hours: parseFloat((totalActiveMin / 60).toFixed(1)),
      total_active_display: formatDuration(totalActiveMin),
      total_break_minutes: totalBreakMin,
      total_break_display: formatDuration(totalBreakMin),
      total_breaks: totalBreaks,
      avg_daily_hours: parseFloat(avgDailyHours.toFixed(1)),
      avg_arrival: avgArrival ? formatTime(new Date(2026, 0, 1, Math.floor(avgArrival), Math.round((avgArrival % 1) * 60)).toISOString()) : '—',
      avg_departure: avgDeparture ? formatTime(new Date(2026, 0, 1, Math.floor(avgDeparture), Math.round((avgDeparture % 1) * 60)).toISOString()) : '—',
      daily_log: wRecords.map(r => ({
        date: r.date,
        status: r.status,
        first_seen_display: r.first_seen_display,
        last_seen_display: r.last_seen_display,
        active_display: r.active_display,
        break_display: r.break_display,
        break_count: r.break_count,
      })),
    };
  });

  return NextResponse.json({
    range,
    from,
    to,
    dates,
    summary,
    records: range === 'day' ? todayRecords : allRecords,
    worker_reports: workerReports,
  });
}
