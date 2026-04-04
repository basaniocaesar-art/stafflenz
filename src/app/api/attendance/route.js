import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getAdminClient } from '@/lib/supabase';

const BREAK_GAP_MINUTES = 20; // Gap between events to count as a break

function computeAttendance(worker, events) {
  if (!events || events.length === 0) {
    return {
      worker_id: worker.id,
      worker_name: worker.full_name,
      employee_id: worker.employee_id,
      department: worker.department,
      shift: worker.shift,
      status: 'absent',
      check_in: null,
      check_out: null,
      total_minutes: 0,
      break_count: 0,
      total_break_minutes: 0,
      net_minutes: 0,
      breaks: [],
    };
  }

  // Sort events oldest → newest
  const sorted = [...events].sort((a, b) => new Date(a.occurred_at) - new Date(b.occurred_at));

  const firstEvent = sorted[0];
  const lastEvent = sorted[sorted.length - 1];

  // Use explicit check_in/check_out event types if present, else first/last detection
  const checkInEvent = sorted.find(e => e.event_type === 'check_in') || firstEvent;
  const checkOutEvent = [...sorted].reverse().find(e => e.event_type === 'check_out') || null;

  const checkIn = new Date(checkInEvent.occurred_at);
  const checkOut = checkOutEvent ? new Date(checkOutEvent.occurred_at) : new Date(lastEvent.occurred_at);

  // Detect breaks from gaps between consecutive events
  const breaks = [];
  for (let i = 0; i < sorted.length - 1; i++) {
    const current = new Date(sorted[i].occurred_at);
    const next = new Date(sorted[i + 1].occurred_at);
    const gapMinutes = (next - current) / 60000;

    if (gapMinutes >= BREAK_GAP_MINUTES) {
      breaks.push({
        start: sorted[i].occurred_at,
        end: sorted[i + 1].occurred_at,
        duration_minutes: Math.round(gapMinutes),
      });
    }
  }

  const totalMinutes = Math.round((checkOut - checkIn) / 60000);
  const totalBreakMinutes = breaks.reduce((sum, b) => sum + b.duration_minutes, 0);
  const netMinutes = Math.max(0, totalMinutes - totalBreakMinutes);

  // Determine status
  let status = 'present';
  const checkInHour = checkIn.getHours();
  const checkInMin = checkIn.getMinutes();
  if (checkInHour > 9 || (checkInHour === 9 && checkInMin > 30)) {
    status = 'late';
  }
  // If last event was more than 20 min ago and no check_out, they might be on break
  const minutesSinceLast = (Date.now() - new Date(lastEvent.occurred_at)) / 60000;
  if (minutesSinceLast >= BREAK_GAP_MINUTES && !checkOutEvent) {
    status = 'on_break';
  }

  return {
    worker_id: worker.id,
    worker_name: worker.full_name,
    employee_id: worker.employee_id,
    department: worker.department,
    shift: worker.shift,
    status,
    check_in: checkIn.toISOString(),
    check_out: checkOutEvent ? checkOut.toISOString() : null,
    last_seen: lastEvent.occurred_at,
    total_minutes: totalMinutes,
    break_count: breaks.length,
    total_break_minutes: totalBreakMinutes,
    net_minutes: netMinutes,
    breaks,
  };
}

function formatDuration(minutes) {
  if (!minutes || minutes <= 0) return '—';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export async function GET(request) {
  const session = await requireAuth(request);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { client } = session;
  const clientId = client?.id;
  if (!clientId) return NextResponse.json({ error: 'No client associated' }, { status: 400 });

  const { searchParams } = new URL(request.url);
  const date = searchParams.get('date') || new Date().toISOString().slice(0, 10);

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
    return NextResponse.json({ date, records: [], summary: { present: 0, late: 0, on_break: 0, absent: 0, total: 0 } });
  }

  // Get all events for this date
  const dayStart = `${date}T00:00:00.000Z`;
  const dayEnd = `${date}T23:59:59.999Z`;

  const { data: events } = await db
    .from('worker_events')
    .select('worker_id, worker_name, event_type, activity, occurred_at')
    .eq('client_id', clientId)
    .gte('occurred_at', dayStart)
    .lte('occurred_at', dayEnd)
    .not('worker_id', 'is', null)
    .order('occurred_at');

  // Group events by worker_id
  const eventsByWorker = {};
  for (const event of (events || [])) {
    if (!eventsByWorker[event.worker_id]) eventsByWorker[event.worker_id] = [];
    eventsByWorker[event.worker_id].push(event);
  }

  // Compute attendance for each worker
  const records = workers.map(worker => {
    const workerEvents = eventsByWorker[worker.id] || [];
    const record = computeAttendance(worker, workerEvents);
    return {
      ...record,
      total_hours_display: formatDuration(record.total_minutes),
      break_time_display: formatDuration(record.total_break_minutes),
      net_hours_display: formatDuration(record.net_minutes),
    };
  });

  const summary = {
    total: records.length,
    present: records.filter(r => r.status === 'present').length,
    late: records.filter(r => r.status === 'late').length,
    on_break: records.filter(r => r.status === 'on_break').length,
    absent: records.filter(r => r.status === 'absent').length,
  };

  return NextResponse.json({ date, records, summary });
}
