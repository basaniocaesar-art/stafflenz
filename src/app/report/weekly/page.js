'use client';

// Printable weekly AI report. Auto-fetches its data from /api/reports/weekly
// and renders a clean A4-friendly layout. Users hit "Print" (top right) which
// triggers the browser's PDF save dialog.

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

function fmt(n) { return (n === null || n === undefined) ? '—' : `${n}%`; }
function dayLabel(d) {
  return new Date(d + 'T00:00:00').toLocaleDateString('en', { weekday: 'short', month: 'short', day: 'numeric' });
}

function ReportInner() {
  const sp = useSearchParams();
  const locationId = sp.get('location');
  const [data, setData] = useState(null);
  const [err, setErr]   = useState(null);

  useEffect(() => {
    const qs = locationId ? `?location=${locationId}` : '';
    fetch(`/api/reports/weekly${qs}`)
      .then((r) => r.ok ? r.json() : Promise.reject(r))
      .then(setData)
      .catch(async (r) => {
        const j = await r.json().catch(() => ({}));
        setErr(j.error || 'Failed to load report');
        if (r.status === 401) window.location.href = '/login';
      });
  }, [locationId]);

  if (err) return <div className="p-12 text-center text-red-600">{err}</div>;
  if (!data) return <div className="p-12 text-center text-gray-400">Generating report…</div>;

  const sevColor = (s) => s === 'high' ? '#dc2626' : s === 'medium' ? '#d97706' : '#16a34a';
  const periodLabel = `${new Date(data.period.start).toLocaleDateString('en', { month: 'short', day: 'numeric' })} – ${new Date(data.period.end).toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' })}`;

  return (
    <div className="min-h-screen" style={{ background: '#f3f4f6' }}>
      {/* Toolbar — hidden on print */}
      <div className="print:hidden bg-white border-b px-6 py-3 flex items-center justify-between sticky top-0 z-50">
        <div className="text-sm text-gray-600">Weekly AI Report · {data.client?.name}{data.location ? ` · ${data.location.name}` : ''}</div>
        <div className="flex gap-2">
          <button onClick={() => window.print()} className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700">
            🖨 Print / Save as PDF
          </button>
        </div>
      </div>

      {/* Report body */}
      <div className="max-w-[820px] mx-auto bg-white shadow my-6 print:my-0 print:shadow-none" style={{ minHeight: '11in' }}>
        <style jsx global>{`
          @page { margin: 18mm; size: A4; }
          @media print {
            body { background: white !important; }
            .no-break { break-inside: avoid; }
          }
        `}</style>

        {/* Header */}
        <div className="px-10 pt-10 pb-6 border-b" style={{ borderColor: '#e5e7eb' }}>
          <div className="flex items-end justify-between">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-blue-600">Weekly AI Workforce Report</div>
              <h1 className="text-3xl font-extrabold text-gray-900 mt-1">{data.client?.name || 'Operations Report'}</h1>
              {data.location && <div className="text-base text-gray-500 mt-0.5">{data.location.name}</div>}
            </div>
            <div className="text-right text-xs text-gray-500">
              <div>{periodLabel}</div>
              <div className="mt-1 font-mono">Generated {new Date(data.generated_at).toLocaleString('en', { dateStyle: 'medium', timeStyle: 'short' })}</div>
              <div className="mt-1 font-mono uppercase tracking-wider text-[10px] text-gray-400">Powered by StaffLenz</div>
            </div>
          </div>
        </div>

        {/* Executive scores */}
        <div className="px-10 py-6 no-break">
          <h2 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3">Executive Scores</h2>
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: 'Coverage',   value: fmt(data.scores.coverageScore),   color: '#16a34a' },
              { label: 'Compliance', value: fmt(data.scores.complianceScore), color: '#2563eb' },
              { label: 'Engagement', value: fmt(data.scores.engagementScore), color: '#7c3aed' },
              { label: 'Risk',       value: data.scores.riskLevel,            color: data.scores.riskLevel === 'High' ? '#dc2626' : data.scores.riskLevel === 'Medium' ? '#d97706' : '#16a34a' },
            ].map((t) => (
              <div key={t.label} className="rounded-lg p-3 border" style={{ borderColor: '#e5e7eb' }}>
                <div className="text-[10px] uppercase tracking-wider text-gray-500">{t.label}</div>
                <div className="text-3xl font-extrabold mt-1" style={{ color: t.color }}>{t.value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Daily Activity */}
        <div className="px-10 py-6 border-t no-break" style={{ borderColor: '#e5e7eb' }}>
          <h2 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3">Daily Activity · last 7 days</h2>
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b" style={{ borderColor: '#e5e7eb' }}>
                <th className="text-left py-2 font-semibold text-gray-600">Day</th>
                <th className="text-right py-2 font-semibold text-gray-600">Observations</th>
                <th className="text-right py-2 font-semibold text-gray-600">Coverage</th>
                <th className="text-right py-2 font-semibold text-gray-600">Alerts</th>
                <th className="text-right py-2 font-semibold text-gray-600">High-severity</th>
              </tr>
            </thead>
            <tbody>
              {data.daily.map((d) => (
                <tr key={d.date} className="border-b" style={{ borderColor: '#f3f4f6' }}>
                  <td className="py-2 text-gray-800">{dayLabel(d.date)}</td>
                  <td className="py-2 text-right tabular-nums text-gray-700">{d.observations}</td>
                  <td className="py-2 text-right tabular-nums" style={{ color: d.coveragePct >= 70 ? '#16a34a' : d.coveragePct >= 40 ? '#d97706' : '#dc2626' }}>{d.coveragePct}%</td>
                  <td className="py-2 text-right tabular-nums text-gray-700">{d.alerts}</td>
                  <td className="py-2 text-right tabular-nums" style={{ color: d.highAlerts > 0 ? '#dc2626' : '#9ca3af' }}>{d.highAlerts}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Coverage by Business Area */}
        {data.zoneScores.length > 0 && (
          <div className="px-10 py-6 border-t no-break" style={{ borderColor: '#e5e7eb' }}>
            <h2 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3">Coverage by Business Area</h2>
            <div className="space-y-2">
              {data.zoneScores.slice(0, 10).map((z) => {
                const c = z.coverage;
                const color = c >= 80 ? '#16a34a' : c >= 50 ? '#d97706' : '#dc2626';
                return (
                  <div key={z.name} className="flex items-center gap-3">
                    <div className="w-44 shrink-0 text-sm text-gray-800 truncate">{z.name}</div>
                    <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: '#f3f4f6' }}>
                      <div className="h-full" style={{ width: `${c}%`, background: color }} />
                    </div>
                    <div className="w-14 text-right text-sm font-bold tabular-nums" style={{ color }}>{c}%</div>
                    <div className="w-20 text-right text-[10px] font-mono text-gray-400">{z.observations} obs</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Staff Identified */}
        {data.counts.registeredStaffList.length > 0 && (
          <div className="px-10 py-6 border-t no-break" style={{ borderColor: '#e5e7eb' }}>
            <h2 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3">Staff Identified This Week</h2>
            <div className="text-sm text-gray-700">
              {data.counts.registeredStaffList.length} registered worker{data.counts.registeredStaffList.length === 1 ? '' : 's'} appeared on camera —{' '}
              <span className="text-gray-900">{data.counts.registeredStaffList.join(', ')}</span>
            </div>
          </div>
        )}

        {/* Top Incidents */}
        {data.topIncidents.length > 0 && (
          <div className="px-10 py-6 border-t" style={{ borderColor: '#e5e7eb' }}>
            <h2 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3">Top Incidents</h2>
            <div className="space-y-3">
              {data.topIncidents.map((a) => (
                <div key={a.id} className="no-break pl-3 border-l-2" style={{ borderColor: sevColor(a.severity) }}>
                  <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider" style={{ color: sevColor(a.severity) }}>
                    <span>{a.severity}</span>
                    <span className="text-gray-400">·</span>
                    <span>{a.alert_type?.replace('_', ' ')}</span>
                    {a.duration_minutes > 0 && <><span className="text-gray-400">·</span><span className="text-gray-500">{a.duration_minutes} min</span></>}
                    {a.zone_name && <><span className="text-gray-400">·</span><span className="text-gray-500">{a.zone_name}</span></>}
                  </div>
                  <p className="text-sm text-gray-800 mt-0.5">{a.message}</p>
                  {Array.isArray(a.business_impact) && a.business_impact.length > 0 && (
                    <div className="mt-1 text-[11px] text-gray-500">
                      Impact: {a.business_impact.join(' · ')}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recommendations */}
        <div className="px-10 py-6 border-t" style={{ borderColor: '#e5e7eb' }}>
          <h2 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3">Recommendations</h2>
          <div className="space-y-3">
            {data.recommendations.map((r, i) => (
              <div key={i} className="no-break flex gap-3">
                <span className="mt-1 w-2 h-2 rounded-full shrink-0" style={{ background: sevColor(r.severity) }} />
                <div className="flex-1">
                  <div className="text-sm font-bold text-gray-900">{r.title}</div>
                  <div className="text-xs text-gray-600 mt-0.5">{r.detail}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="px-10 py-6 border-t text-[10px] text-gray-400 text-center" style={{ borderColor: '#e5e7eb' }}>
          Generated automatically from StaffLenz AI workforce intelligence · stafflenz.com · {new Date(data.generated_at).toLocaleDateString('en', { dateStyle: 'long' })}
        </div>
      </div>
    </div>
  );
}

export default function WeeklyReportPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-gray-400">Loading…</div>}>
      <ReportInner />
    </Suspense>
  );
}
