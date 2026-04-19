'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';

// Attendance & Payroll page.
// Shows daily clock-in/out/breaks for each worker + weekly/monthly
// hour summaries for payroll calculations.

const STATUS_STYLE = {
  present:   { bg: 'bg-green-100', text: 'text-green-800', label: 'Present' },
  late:      { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Late' },
  on_break:  { bg: 'bg-blue-100', text: 'text-blue-800', label: 'On break' },
  partial:   { bg: 'bg-orange-100', text: 'text-orange-800', label: 'Partial' },
  absent:    { bg: 'bg-red-100', text: 'text-red-800', label: 'Absent' },
};

export default function AttendancePage() {
  const router = useRouter();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState('day');
  const [expandedWorker, setExpandedWorker] = useState(null);

  useEffect(() => { load(); }, [range]);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`/api/attendance?range=${range}`);
      if (res.status === 401) { router.push('/login'); return; }
      setData(await res.json());
    } finally {
      setLoading(false);
    }
  }

  const { summary = {}, records = [], worker_reports = [] } = data || {};

  return (
    <DashboardLayout industry="retail" clientName="" userName="">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Attendance & Hours</h1>
            <p className="text-sm text-gray-400 mt-1">AI-tracked clock-in, breaks, and hours for payroll</p>
          </div>
        </div>

        {/* Range toggle + download button */}
        <div className="flex items-center gap-3 mb-6 flex-wrap">
        <div className="flex gap-1 rounded-lg p-1 w-fit" style={{ background: '#0d1631', border: '1px solid #1e2d4a' }}>
          {[
            { key: 'day', label: 'Today' },
            { key: 'week', label: 'This week' },
            { key: 'month', label: 'This month' },
          ].map(r => (
            <button
              key={r.key}
              onClick={() => setRange(r.key)}
              className={`px-4 py-2 text-sm font-semibold rounded-md transition ${
                range === r.key ? 'bg-cyan-600 text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
        {(range === 'week' || range === 'month') && (
          <a
            href={`/api/reports/attendance?range=${range}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition"
            style={{ background: 'rgba(34,211,238,0.1)', color: '#22d3ee', border: '1px solid rgba(34,211,238,0.3)' }}
          >
            📄 Download Report
          </a>
        )}
        </div>

        {loading ? (
          <div className="text-center py-20 text-gray-500">Loading attendance...</div>
        ) : (
          <>
            {/* Summary cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
              <StatCard label="Present" value={summary.present || 0} accent="#22c55e" />
              <StatCard label="Late" value={summary.late || 0} accent="#eab308" />
              <StatCard label="On break" value={summary.on_break || 0} accent="#3b82f6" />
              <StatCard label="Absent" value={summary.absent || 0} accent="#ef4444" />
              <StatCard label="Total hours" value={`${summary.total_active_hours || 0}h`} accent="#22d3ee" />
            </div>

            {/* Day view */}
            {range === 'day' && (
              <div className="rounded-2xl border overflow-hidden" style={{ background: '#0d1631', borderColor: '#1e2d4a' }}>
                <div className="px-6 py-4 border-b" style={{ borderColor: '#1e2d4a' }}>
                  <h2 className="text-sm font-bold text-white">Today — {summary.date}</h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-gray-500 text-xs uppercase tracking-wider" style={{ background: 'rgba(13,22,49,0.5)' }}>
                        <th className="px-6 py-3 text-left">Staff</th>
                        <th className="px-4 py-3 text-left">Status</th>
                        <th className="px-4 py-3 text-left">Clock in</th>
                        <th className="px-4 py-3 text-left">Last seen</th>
                        <th className="px-4 py-3 text-left">Active</th>
                        <th className="px-4 py-3 text-left">Breaks</th>
                        <th className="px-4 py-3 text-left">Break time</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y" style={{ borderColor: '#1e2d4a' }}>
                      {records.map((r, i) => {
                        const s = STATUS_STYLE[r.status] || STATUS_STYLE.absent;
                        return (
                          <tr key={i} className="hover:bg-white/5 transition">
                            <td className="px-6 py-3">
                              <div className="font-semibold text-white">{r.worker_name}</div>
                              <div className="text-xs text-gray-500">{r.department || '—'}</div>
                            </td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-1 rounded-full text-xs font-bold ${s.bg} ${s.text}`}>{s.label}</span>
                            </td>
                            <td className="px-4 py-3 font-mono text-gray-300">{r.first_seen_display || '—'}</td>
                            <td className="px-4 py-3 font-mono text-gray-300">{r.last_seen_display || '—'}</td>
                            <td className="px-4 py-3 font-semibold text-cyan-400">{r.active_display || '—'}</td>
                            <td className="px-4 py-3 text-gray-300">{r.break_count || 0}</td>
                            <td className="px-4 py-3 text-gray-300">{r.break_display || '—'}</td>
                          </tr>
                        );
                      })}
                      {records.length === 0 && (
                        <tr><td colSpan={7} className="px-6 py-12 text-center text-gray-500">No attendance data yet today</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Week/Month view */}
            {(range === 'week' || range === 'month') && (
              <div className="space-y-3">
                <h2 className="text-sm font-bold text-white">
                  {range === 'week' ? 'Weekly' : 'Monthly'} report — {data?.from} to {data?.to}
                </h2>

                {worker_reports.map((wr) => (
                  <div key={wr.worker_id} className="rounded-2xl border overflow-hidden" style={{ background: '#0d1631', borderColor: '#1e2d4a' }}>
                    <button
                      onClick={() => setExpandedWorker(expandedWorker === wr.worker_id ? null : wr.worker_id)}
                      className="w-full px-5 py-4 flex items-center justify-between hover:bg-white/5 transition"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold" style={{ background: 'linear-gradient(135deg,#1e3a5f,#1d6fa4)', color: '#22d3ee' }}>
                          {wr.worker_name[0]}
                        </div>
                        <div className="text-left">
                          <div className="font-bold text-white text-sm">{wr.worker_name}</div>
                          <div className="text-xs text-gray-500">{wr.department || 'Staff'}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-5 text-xs">
                        <MiniStat label="Days" value={`${wr.days_present}/${wr.days_present + wr.days_absent}`} />
                        <MiniStat label="Total hours" value={wr.total_active_display} highlight />
                        <MiniStat label="Avg/day" value={`${wr.avg_daily_hours}h`} />
                        <MiniStat label="Avg in" value={wr.avg_arrival} />
                        <MiniStat label="Avg out" value={wr.avg_departure} />
                        <MiniStat label="Late" value={wr.days_late} warn={wr.days_late > 0} />
                        <MiniStat label="Breaks" value={`${wr.total_breaks} (${wr.total_break_display})`} />
                        <span className="text-gray-500">{expandedWorker === wr.worker_id ? '▲' : '▼'}</span>
                      </div>
                    </button>

                    {expandedWorker === wr.worker_id && (
                      <div className="px-5 pb-4 border-t" style={{ borderColor: '#1e2d4a' }}>
                        <div className="overflow-x-auto mt-3">
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="text-gray-500 uppercase tracking-wider">
                                <th className="px-3 py-2 text-left">Date</th>
                                <th className="px-3 py-2 text-left">Status</th>
                                <th className="px-3 py-2 text-left">In</th>
                                <th className="px-3 py-2 text-left">Out</th>
                                <th className="px-3 py-2 text-left">Active</th>
                                <th className="px-3 py-2 text-left">Breaks</th>
                                <th className="px-3 py-2 text-left">Break time</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y" style={{ borderColor: '#162040' }}>
                              {wr.daily_log.map((d, i) => {
                                const s = STATUS_STYLE[d.status] || STATUS_STYLE.absent;
                                return (
                                  <tr key={i} className={d.status === 'absent' ? 'opacity-40' : ''}>
                                    <td className="px-3 py-2 font-mono text-gray-300">{d.date}</td>
                                    <td className="px-3 py-2"><span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${s.bg} ${s.text}`}>{s.label}</span></td>
                                    <td className="px-3 py-2 font-mono text-gray-300">{d.first_seen_display}</td>
                                    <td className="px-3 py-2 font-mono text-gray-300">{d.last_seen_display}</td>
                                    <td className="px-3 py-2 font-semibold text-cyan-400">{d.active_display}</td>
                                    <td className="px-3 py-2 text-gray-400">{d.break_count}</td>
                                    <td className="px-3 py-2 text-gray-400">{d.break_display}</td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}

function StatCard({ label, value, accent }) {
  return (
    <div className="rounded-xl p-4 border" style={{ background: '#0d1631', borderColor: '#1e2d4a' }}>
      <div className="text-xs text-gray-500 mb-1">{label}</div>
      <div className="text-2xl font-bold" style={{ color: accent }}>{value}</div>
    </div>
  );
}

function MiniStat({ label, value, highlight, warn }) {
  return (
    <div className="text-center hidden md:block">
      <div className="text-[9px] text-gray-500 uppercase">{label}</div>
      <div className={`font-semibold ${highlight ? 'text-cyan-400' : warn ? 'text-red-400' : 'text-gray-300'}`}>
        {value}
      </div>
    </div>
  );
}
