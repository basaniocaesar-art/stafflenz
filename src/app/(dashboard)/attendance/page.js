'use client';
import { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const STATUS_CONFIG = {
  present:  { label: 'Present',  color: 'bg-emerald-100 text-emerald-800', dot: 'bg-emerald-500' },
  late:     { label: 'Late',     color: 'bg-amber-100 text-amber-800',     dot: 'bg-amber-500' },
  on_break: { label: 'On Break', color: 'bg-blue-100 text-blue-800',       dot: 'bg-blue-500' },
  absent:   { label: 'Absent',   color: 'bg-gray-100 text-gray-600',       dot: 'bg-gray-400' },
};

function formatTime(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit', hour12: true });
}

function formatDate(dateStr) {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
}

function addDays(dateStr, n) {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

function BreakRow({ b, i }) {
  return (
    <div className="flex items-center gap-3 text-xs py-1.5 border-b border-gray-50 last:border-0">
      <span className="font-medium text-gray-400 w-16">Break {i + 1}</span>
      <span className="text-gray-700">{formatTime(b.start)}</span>
      <span className="text-gray-400">→</span>
      <span className="text-gray-700">{formatTime(b.end)}</span>
      <span className="ml-auto font-semibold text-gray-600 bg-gray-100 px-2 py-0.5 rounded-full">
        {b.duration_minutes} min
      </span>
    </div>
  );
}

function WorkerRow({ record }) {
  const [expanded, setExpanded] = useState(false);
  const sc = STATUS_CONFIG[record.status] || STATUS_CONFIG.absent;

  return (
    <>
      <tr
        className={`border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer ${expanded ? 'bg-blue-50/30' : ''}`}
        onClick={() => record.break_count > 0 && setExpanded(!expanded)}
      >
        <td className="px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-violet-500 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0">
              {record.worker_name?.charAt(0)?.toUpperCase() || '?'}
            </div>
            <div>
              <div className="font-semibold text-gray-900 text-sm">{record.worker_name}</div>
              {record.employee_id && <div className="text-xs text-gray-400">{record.employee_id}</div>}
            </div>
          </div>
        </td>
        <td className="px-4 py-3 text-xs text-gray-500">{record.department || '—'}</td>
        <td className="px-4 py-3">
          <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${sc.color}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
            {sc.label}
          </span>
        </td>
        <td className="px-4 py-3 text-sm font-medium text-gray-900">{formatTime(record.check_in)}</td>
        <td className="px-4 py-3 text-sm text-gray-600">{formatTime(record.check_out) || <span className="text-gray-400 text-xs">Not yet</span>}</td>
        <td className="px-4 py-3">
          {record.break_count > 0 ? (
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 bg-blue-100 px-2.5 py-1 rounded-full">
              {record.break_count} break{record.break_count > 1 ? 's' : ''} · {record.break_time_display}
            </span>
          ) : (
            <span className="text-xs text-gray-400">No breaks</span>
          )}
        </td>
        <td className="px-4 py-3 text-sm font-medium text-gray-700">{record.total_hours_display}</td>
        <td className="px-4 py-3 text-sm font-bold text-emerald-700">{record.net_hours_display}</td>
        <td className="px-4 py-3 text-gray-400">
          {record.break_count > 0 && (
            <span className="text-xs">{expanded ? '▲' : '▼'}</span>
          )}
        </td>
      </tr>
      {expanded && record.breaks?.length > 0 && (
        <tr className="bg-blue-50/40">
          <td colSpan={9} className="px-4 py-3">
            <div className="ml-11">
              <div className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Break Details</div>
              <div className="bg-white rounded-xl border border-blue-100 px-4 py-2 max-w-xl">
                {record.breaks.map((b, i) => <BreakRow key={i} b={b} i={i} />)}
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

export default function AttendancePage() {
  const router = useRouter();
  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(today);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [industry, setIndustry] = useState('factory');
  const [clientName, setClientName] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [search, setSearch] = useState('');

  const fetchData = useCallback(async (d) => {
    setLoading(true);
    setError(null);
    try {
      const [attRes, clientRes] = await Promise.all([
        fetch(`/api/attendance?date=${d}`),
        fetch('/api/client'),
      ]);
      if (attRes.status === 401 || clientRes.status === 401) {
        router.push('/login');
        return;
      }
      const att = await attRes.json();
      const client = await clientRes.json();
      if (attRes.ok) setData(att);
      else setError(att.error);
      if (clientRes.ok) {
        setIndustry(client.client?.industry || 'factory');
        setClientName(client.client?.name || '');
      }
    } catch {
      setError('Failed to load attendance');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => { fetchData(date); }, [date, fetchData]);

  const records = data?.records || [];
  const filtered = records.filter(r => {
    const matchStatus = filterStatus === 'all' || r.status === filterStatus;
    const matchSearch = !search || r.worker_name?.toLowerCase().includes(search.toLowerCase()) || r.employee_id?.toLowerCase().includes(search.toLowerCase()) || r.department?.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  const summary = data?.summary || {};
  const isToday = date === today;

  return (
    <DashboardLayout industry={industry} clientName={clientName} userName={clientName}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Attendance & Breaks</h1>
          <p className="text-sm text-gray-500 mt-0.5">{data ? formatDate(date) : 'Loading...'}</p>
        </div>
        {/* Date navigator */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setDate(addDays(date, -1))}
            className="btn-secondary px-3 py-2 text-sm"
          >← Prev</button>
          <input
            type="date"
            value={date}
            max={today}
            onChange={e => setDate(e.target.value)}
            className="input text-sm py-2 w-40"
          />
          <button
            onClick={() => setDate(addDays(date, 1))}
            disabled={isToday}
            className="btn-secondary px-3 py-2 text-sm disabled:opacity-40"
          >Next →</button>
          {!isToday && (
            <button onClick={() => setDate(today)} className="btn-primary text-sm px-4 py-2">Today</button>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
        {[
          { label: 'Total Staff', value: summary.total ?? 0, color: 'text-gray-900', bg: 'bg-white' },
          { label: 'Present', value: summary.present ?? 0, color: 'text-emerald-700', bg: 'bg-emerald-50 border border-emerald-100' },
          { label: 'Late', value: summary.late ?? 0, color: 'text-amber-700', bg: 'bg-amber-50 border border-amber-100' },
          { label: 'On Break', value: summary.on_break ?? 0, color: 'text-blue-700', bg: 'bg-blue-50 border border-blue-100' },
          { label: 'Absent', value: summary.absent ?? 0, color: 'text-gray-600', bg: 'bg-gray-50 border border-gray-200' },
        ].map(s => (
          <div key={s.label} className={`rounded-2xl p-4 shadow-sm ${s.bg}`}>
            <div className={`text-3xl font-extrabold ${s.color}`}>{loading ? '—' : s.value}</div>
            <div className="text-xs font-semibold text-gray-500 mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="card p-4 mb-4 flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          placeholder="Search by name, ID, or department..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="input flex-1 text-sm"
        />
        <div className="flex gap-2 flex-wrap">
          {['all', 'present', 'late', 'on_break', 'absent'].map(s => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`text-xs font-semibold px-3 py-2 rounded-xl transition-all ${filterStatus === s ? 'bg-blue-600 text-white shadow' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              {s === 'all' ? 'All' : s === 'on_break' ? 'On Break' : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="text-center">
              <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <div className="text-gray-400 text-sm">Loading attendance...</div>
            </div>
          </div>
        ) : error ? (
          <div className="p-10 text-center">
            <div className="text-4xl mb-3">⚠️</div>
            <p className="text-gray-500 text-sm">{error}</p>
            <button onClick={() => fetchData(date)} className="btn-primary mt-4 text-sm">Retry</button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center">
            <div className="text-4xl mb-3">👤</div>
            <p className="text-gray-500 text-sm">
              {records.length === 0 ? 'No workers enrolled yet.' : 'No results match your filter.'}
            </p>
            {records.length === 0 && (
              <Link href="/workers" className="btn-primary mt-4 text-sm inline-flex">Enrol Workers →</Link>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wide">Worker</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wide">Dept</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wide">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wide">Check In</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wide">Check Out</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wide">Breaks</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wide">Total Hours</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wide">Net Hours</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {filtered.map(record => (
                  <WorkerRow key={record.worker_id} record={record} />
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer note */}
        {!loading && filtered.length > 0 && (
          <div className="px-4 py-3 border-t border-gray-100 bg-gray-50 text-xs text-gray-400 flex items-center justify-between">
            <span>
              Showing {filtered.length} of {records.length} workers · Breaks auto-detected from gaps &gt; 20 min between scans
            </span>
            <span>Click a row with breaks to expand details</span>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
