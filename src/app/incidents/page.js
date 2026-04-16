'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

// Forensic incidents list. Shows all motion-triggered events with filters
// for date range, severity, and camera. Click row → detail page.

const SEVERITY_COLORS = {
  low:      'bg-gray-100 text-gray-700 border-gray-200',
  medium:   'bg-yellow-100 text-yellow-800 border-yellow-300',
  high:     'bg-orange-100 text-orange-800 border-orange-300',
  critical: 'bg-red-100 text-red-800 border-red-300',
};

function timeAgo(iso) {
  const ms = Date.now() - new Date(iso).getTime();
  const m = Math.floor(ms / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

export default function IncidentsPage() {
  const router = useRouter();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    severity: '',
    camera: '',
    window: '24h',
  });

  useEffect(() => {
    load();
  }, [filters]);

  async function load() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.severity) params.set('severity', filters.severity);
      if (filters.camera) params.set('camera', filters.camera);
      if (filters.window === '24h') {
        params.set('from', new Date(Date.now() - 86400000).toISOString());
      } else if (filters.window === '7d') {
        params.set('from', new Date(Date.now() - 7 * 86400000).toISOString());
      } else if (filters.window === '30d') {
        params.set('from', new Date(Date.now() - 30 * 86400000).toISOString());
      }
      const res = await fetch(`/api/incidents?${params}`);
      if (res.status === 401) { router.push('/login?next=/incidents'); return; }
      const body = await res.json();
      setData(body);
    } finally {
      setLoading(false);
    }
  }

  const { incidents = [], total = 0, severityCounts = {}, cameraCounts = {} } = data || {};

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Forensic Incidents</h1>
            <p className="text-sm text-gray-500 mt-1">
              Motion-triggered analysis events with frame-by-frame context
            </p>
          </div>
          <a href="/dashboard" className="text-sm text-indigo-600 hover:underline">← dashboard</a>
        </div>

        {/* Severity summary cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {['critical', 'high', 'medium', 'low'].map((sev) => (
            <button
              key={sev}
              onClick={() => setFilters({ ...filters, severity: filters.severity === sev ? '' : sev })}
              className={`p-4 rounded-xl border-2 text-left transition ${
                filters.severity === sev
                  ? 'ring-2 ring-indigo-500 ring-offset-2 ' + SEVERITY_COLORS[sev]
                  : 'bg-white border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="text-xs font-bold uppercase tracking-wider text-gray-500">{sev}</div>
              <div className="text-2xl font-bold mt-1 text-gray-900">{severityCounts[sev] || 0}</div>
            </button>
          ))}
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6 flex flex-wrap gap-3 items-center">
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-500">Window</label>
            <select
              value={filters.window}
              onChange={(e) => setFilters({ ...filters, window: e.target.value })}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
            >
              <option value="24h">Last 24 hours</option>
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-500">Camera</label>
            <select
              value={filters.camera}
              onChange={(e) => setFilters({ ...filters, camera: e.target.value })}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
            >
              <option value="">All cameras ({Object.values(cameraCounts).reduce((s, n) => s + n, 0)})</option>
              {Object.entries(cameraCounts).map(([ch, n]) => (
                <option key={ch} value={ch}>Camera {ch} ({n})</option>
              ))}
            </select>
          </div>
          {(filters.severity || filters.camera) && (
            <button
              onClick={() => setFilters({ ...filters, severity: '', camera: '' })}
              className="text-sm text-gray-500 hover:text-gray-700 underline"
            >
              Clear filters
            </button>
          )}
          <div className="ml-auto text-sm text-gray-500">
            {loading ? 'Loading…' : `${total} incident${total === 1 ? '' : 's'}`}
          </div>
        </div>

        {/* Incidents grid */}
        {loading ? (
          <div className="text-center py-20 text-gray-500">Loading…</div>
        ) : incidents.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-16 text-center">
            <div className="text-5xl mb-4">🎬</div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">No incidents in this window</h3>
            <p className="text-gray-500 max-w-md mx-auto">
              Motion-triggered incidents show up here as the agent captures them. Widen the date range or loosen the filters.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {incidents.map((e) => (
              <a
                key={e.id}
                href={`/incidents/${e.id}`}
                className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-lg hover:border-indigo-300 transition-all"
              >
                {/* Thumbnail */}
                <div className="aspect-video bg-gray-900 relative overflow-hidden">
                  {e.thumbnail_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={e.thumbnail_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-gray-600 text-sm">
                      No thumbnail
                    </div>
                  )}
                  {/* Severity + camera overlay */}
                  <div className="absolute top-2 left-2 flex gap-2">
                    <span className={`text-xs font-bold px-2 py-1 rounded border ${SEVERITY_COLORS[e.severity] || SEVERITY_COLORS.low}`}>
                      {e.severity?.toUpperCase() || 'LOW'}
                    </span>
                  </div>
                  <div className="absolute top-2 right-2">
                    <span className="text-xs font-semibold px-2 py-1 rounded bg-black/60 text-white">
                      CAM {e.camera_channel}
                    </span>
                  </div>
                  {e.alert_sent && (
                    <div className="absolute bottom-2 right-2">
                      <span className="text-xs font-semibold px-2 py-1 rounded bg-green-600/90 text-white">
                        📱 WhatsApp sent
                      </span>
                    </div>
                  )}
                </div>
                {/* Body */}
                <div className="p-4">
                  <div className="text-xs text-gray-500 mb-1">
                    {timeAgo(e.detected_at)} · {new Date(e.detected_at).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}
                  </div>
                  <p className="text-sm text-gray-900 line-clamp-2">
                    {e.incident_summary || 'Motion event'}
                  </p>
                  {e.identified_people?.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {e.identified_people.slice(0, 3).map((name) => (
                        <span key={name} className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded">
                          {name}
                        </span>
                      ))}
                      {e.identified_people.length > 3 && (
                        <span className="text-xs text-gray-400">+{e.identified_people.length - 3}</span>
                      )}
                    </div>
                  )}
                </div>
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
