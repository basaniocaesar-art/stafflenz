import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getAdminClient } from '@/lib/supabase';

// GET /api/reports/attendance?range=week|month
// Generates a downloadable HTML attendance report (renders as PDF in browser via print).
// Returns HTML that the browser can window.print() or save as PDF.

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

function computeForDay(worker, events) {
  if (!events || events.length === 0) {
    return { status: 'absent', first_seen: null, last_seen: null, active_minutes: 0, break_minutes: 0, break_count: 0 };
  }
  const sorted = [...events].sort((a, b) => new Date(a.occurred_at) - new Date(b.occurred_at));
  const firstSeen = new Date(sorted[0].occurred_at);
  const lastSeen = new Date(sorted[sorted.length - 1].occurred_at);
  const totalMinutes = Math.round((lastSeen - firstSeen) / 60000);
  let breakMinutes = 0, breakCount = 0;
  for (let i = 0; i < sorted.length - 1; i++) {
    const gap = (new Date(sorted[i + 1].occurred_at) - new Date(sorted[i].occurred_at)) / 60000;
    if (gap >= BREAK_GAP_MINUTES) { breakMinutes += Math.round(gap); breakCount++; }
  }
  const activeMinutes = Math.max(0, totalMinutes - breakMinutes);
  let status = 'present';
  const checkInHour = firstSeen.getHours() + firstSeen.getMinutes() / 60;
  if (checkInHour > 9.5) status = 'late';
  if (totalMinutes < 30) status = 'partial';
  return {
    status, first_seen: firstSeen.toISOString(), last_seen: lastSeen.toISOString(),
    active_minutes: activeMinutes, break_minutes: breakMinutes, break_count: breakCount,
  };
}

export async function GET(request) {
  const session = await requireAuth(request);
  if (!session || !session.client) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const range = searchParams.get('range') || 'week';
  const db = getAdminClient();
  const clientId = session.client.id;
  const clientName = session.client.name || 'Client';

  // Get workers
  const { data: workers } = await db.from('workers')
    .select('id, full_name, department, shift')
    .eq('client_id', clientId).is('deleted_at', null).eq('is_active', true).order('full_name');

  if (!workers?.length) {
    return new NextResponse('<html><body><h1>No workers registered</h1></body></html>', {
      headers: { 'Content-Type': 'text/html' },
    });
  }

  // Date range
  const days = range === 'month' ? 30 : 7;
  const dates = [];
  for (let i = days - 1; i >= 0; i--) {
    dates.push(new Date(Date.now() - i * 86400000).toISOString().slice(0, 10));
  }
  const from = dates[0];
  const to = dates[dates.length - 1];

  // Fetch events
  const { data: events } = await db.from('worker_events')
    .select('worker_id, worker_name, confidence, occurred_at')
    .eq('client_id', clientId)
    .gte('occurred_at', `${from}T00:00:00Z`)
    .lte('occurred_at', `${to}T23:59:59Z`)
    .neq('worker_name', 'Unknown Person')
    .order('occurred_at');

  // Compute per-worker per-day
  const reportRows = [];
  for (const worker of workers) {
    const workerDays = [];
    let totalActive = 0, totalBreak = 0, daysPresent = 0, daysLate = 0, totalBreakCount = 0;
    const arrivals = [], departures = [];

    for (const date of dates) {
      const dStart = new Date(`${date}T00:00:00Z`).getTime();
      const dEnd = new Date(`${date}T23:59:59Z`).getTime();
      const dayEvents = (events || []).filter(e => {
        const t = new Date(e.occurred_at).getTime();
        return t >= dStart && t <= dEnd && (
          (e.worker_id && e.worker_id === worker.id) ||
          (e.worker_name && e.worker_name.toLowerCase() === worker.full_name.toLowerCase())
        );
      });
      const result = computeForDay(worker, dayEvents);
      workerDays.push({ date, ...result });
      totalActive += result.active_minutes;
      totalBreak += result.break_minutes;
      totalBreakCount += result.break_count;
      if (result.status !== 'absent') daysPresent++;
      if (result.status === 'late') daysLate++;
      if (result.first_seen) arrivals.push(new Date(result.first_seen).getHours() + new Date(result.first_seen).getMinutes() / 60);
      if (result.last_seen) departures.push(new Date(result.last_seen).getHours() + new Date(result.last_seen).getMinutes() / 60);
    }

    const avgArrival = arrivals.length > 0 ? arrivals.reduce((a, b) => a + b) / arrivals.length : null;
    const avgDeparture = departures.length > 0 ? departures.reduce((a, b) => a + b) / departures.length : null;

    reportRows.push({
      name: worker.full_name,
      department: worker.department || '—',
      days_present: daysPresent,
      days_absent: dates.length - daysPresent,
      days_late: daysLate,
      total_active: formatDuration(totalActive),
      total_active_min: totalActive,
      total_break: formatDuration(totalBreak),
      total_breaks: totalBreakCount,
      avg_daily_hours: daysPresent > 0 ? (totalActive / daysPresent / 60).toFixed(1) : '0',
      avg_arrival: avgArrival ? formatTime(new Date(2026, 0, 1, Math.floor(avgArrival), Math.round((avgArrival % 1) * 60)).toISOString()) : '—',
      avg_departure: avgDeparture ? formatTime(new Date(2026, 0, 1, Math.floor(avgDeparture), Math.round((avgDeparture % 1) * 60)).toISOString()) : '—',
      daily: workerDays,
    });
  }

  const generatedAt = new Date().toLocaleString('en-IN', { dateStyle: 'full', timeStyle: 'short' });
  const rangeLabel = range === 'month' ? 'Monthly' : 'Weekly';

  // Generate HTML report
  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${rangeLabel} Attendance Report — ${clientName}</title>
  <style>
    @page { size: A4 landscape; margin: 12mm; }
    @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } .no-print { display: none; } }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, 'Segoe UI', sans-serif; color: #1a1a2e; font-size: 11px; padding: 20px; }
    .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; padding-bottom: 12px; border-bottom: 2px solid #e2e8f0; }
    .logo { display: flex; align-items: center; gap: 8px; }
    .logo-icon { width: 32px; height: 32px; background: linear-gradient(135deg, #3b82f6, #7c3aed); border-radius: 8px; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 12px; }
    .logo-text { font-size: 18px; font-weight: 800; }
    .meta { text-align: right; color: #64748b; font-size: 10px; }
    h1 { font-size: 16px; margin-bottom: 4px; }
    .summary { display: flex; gap: 16px; margin-bottom: 16px; }
    .summary-card { padding: 10px 16px; border-radius: 8px; border: 1px solid #e2e8f0; flex: 1; }
    .summary-card .label { font-size: 9px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; }
    .summary-card .value { font-size: 20px; font-weight: 800; margin-top: 2px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
    th { background: #f1f5f9; padding: 6px 8px; text-align: left; font-size: 9px; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b; border-bottom: 2px solid #e2e8f0; }
    td { padding: 6px 8px; border-bottom: 1px solid #f1f5f9; }
    tr:hover { background: #f8fafc; }
    .badge { display: inline-block; padding: 2px 6px; border-radius: 4px; font-size: 9px; font-weight: 700; }
    .badge-present { background: #dcfce7; color: #166534; }
    .badge-late { background: #fef9c3; color: #854d0e; }
    .badge-absent { background: #fee2e2; color: #991b1b; }
    .badge-partial { background: #ffedd5; color: #9a3412; }
    .highlight { color: #3b82f6; font-weight: 700; }
    .warn { color: #dc2626; font-weight: 700; }
    .footer { margin-top: 20px; padding-top: 12px; border-top: 1px solid #e2e8f0; display: flex; justify-content: space-between; color: #94a3b8; font-size: 9px; }
    .btn-print { background: #3b82f6; color: white; border: none; padding: 8px 20px; border-radius: 8px; font-weight: 700; font-size: 12px; cursor: pointer; }
    .btn-print:hover { background: #2563eb; }
  </style>
</head>
<body>
  <div class="no-print" style="text-align:center;margin-bottom:16px;">
    <button class="btn-print" onclick="window.print()">Download as PDF / Print</button>
  </div>

  <div class="header">
    <div>
      <div class="logo"><div class="logo-icon">LA</div><div class="logo-text">LenzAI</div></div>
      <h1>${rangeLabel} Attendance Report</h1>
      <div style="color:#64748b;margin-top:2px;">${clientName} · ${from} to ${to}</div>
    </div>
    <div class="meta">
      Generated: ${generatedAt}<br>
      Powered by LenzAI AI Monitoring
    </div>
  </div>

  <div class="summary">
    <div class="summary-card">
      <div class="label">Total Staff</div>
      <div class="value">${workers.length}</div>
    </div>
    <div class="summary-card">
      <div class="label">Report Period</div>
      <div class="value">${dates.length} days</div>
    </div>
    <div class="summary-card">
      <div class="label">Total Hours Logged</div>
      <div class="value">${formatDuration(reportRows.reduce((s, r) => s + r.total_active_min, 0))}</div>
    </div>
    <div class="summary-card">
      <div class="label">Avg Attendance</div>
      <div class="value">${workers.length > 0 ? Math.round(reportRows.reduce((s, r) => s + r.days_present, 0) / workers.length) : 0}/${dates.length} days</div>
    </div>
  </div>

  <h2 style="font-size:13px;margin-bottom:8px;">Staff Summary</h2>
  <table>
    <thead>
      <tr>
        <th>Name</th>
        <th>Dept</th>
        <th>Days Present</th>
        <th>Days Absent</th>
        <th>Late Days</th>
        <th>Total Hours</th>
        <th>Avg/Day</th>
        <th>Total Breaks</th>
        <th>Break Time</th>
        <th>Avg Arrival</th>
        <th>Avg Departure</th>
      </tr>
    </thead>
    <tbody>
      ${reportRows.map(r => `
        <tr>
          <td><strong>${r.name}</strong></td>
          <td>${r.department}</td>
          <td class="highlight">${r.days_present}/${dates.length}</td>
          <td>${r.days_absent > 0 ? `<span class="warn">${r.days_absent}</span>` : '0'}</td>
          <td>${r.days_late > 0 ? `<span class="warn">${r.days_late}</span>` : '0'}</td>
          <td class="highlight">${r.total_active}</td>
          <td>${r.avg_daily_hours}h</td>
          <td>${r.total_breaks}</td>
          <td>${r.total_break}</td>
          <td>${r.avg_arrival}</td>
          <td>${r.avg_departure}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  ${reportRows.map(r => `
    <h2 style="font-size:12px;margin:16px 0 6px;page-break-before:auto;">${r.name} — Daily Breakdown</h2>
    <table>
      <thead>
        <tr><th>Date</th><th>Status</th><th>Clock In</th><th>Clock Out</th><th>Active</th><th>Breaks</th><th>Break Time</th></tr>
      </thead>
      <tbody>
        ${r.daily.map(d => `
          <tr${d.status === 'absent' ? ' style="opacity:0.5"' : ''}>
            <td>${d.date}</td>
            <td><span class="badge badge-${d.status}">${d.status}</span></td>
            <td>${d.first_seen ? formatTime(d.first_seen) : '—'}</td>
            <td>${d.last_seen ? formatTime(d.last_seen) : '—'}</td>
            <td>${formatDuration(d.active_minutes)}</td>
            <td>${d.break_count}</td>
            <td>${formatDuration(d.break_minutes)}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `).join('')}

  <div class="footer">
    <span>LenzAI · AI-Powered Workforce Intelligence · lenzai.org</span>
    <span>Report generated automatically from CCTV analysis data</span>
  </div>
</body>
</html>`;

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html',
      'Content-Disposition': `inline; filename="LenzAI-Attendance-${rangeLabel}-${to}.html"`,
    },
  });
}
