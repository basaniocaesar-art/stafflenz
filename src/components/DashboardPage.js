'use client';
import { useState, useEffect, useCallback } from 'react';
import DashboardLayout from './DashboardLayout';

function StatCard({ label, value, sub, color }) {
  return (
    <div className="card p-5">
      <div className="text-sm font-medium text-gray-500 mb-1">{label}</div>
      <div className={`text-3xl font-bold ${color || 'text-gray-900'}`}>{value}</div>
      {sub && <div className="text-xs text-gray-400 mt-1">{sub}</div>}
    </div>
  );
}

function AlertBadge({ type }) {
  const map = {
    zone_violation: 'badge-red',
    ppe_violation: 'badge-yellow',
    absent: 'badge-gray',
    late: 'badge-yellow',
    unauthorized: 'badge-red',
    low_confidence: 'badge-blue',
  };
  return <span className={map[type] || 'badge-gray'}>{type?.replace('_', ' ')}</span>;
}

function EventRow({ event }) {
  const typeColors = {
    check_in: 'text-green-600',
    check_out: 'text-gray-500',
    zone_violation: 'text-red-600',
    ppe_violation: 'text-yellow-600',
    detected: 'text-blue-600',
  };
  const time = new Date(event.occurred_at).toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' });
  return (
    <div className="flex items-start gap-3 py-2 border-b border-gray-50 last:border-0">
      <div className="w-16 text-xs text-gray-400 flex-shrink-0 pt-0.5">{time}</div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-gray-900 truncate">{event.worker_name || 'Unknown'}</div>
        <div className="text-xs text-gray-500">{event.activity || event.event_type?.replace('_', ' ')}</div>
      </div>
      <div className={`text-xs font-medium flex-shrink-0 ${typeColors[event.event_type] || 'text-gray-500'}`}>
        {event.confidence ? `${Math.round(event.confidence)}%` : ''}
      </div>
    </div>
  );
}

export default function DashboardPage({ industry }) {
  const [data, setData] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastRefresh, setLastRefresh] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/client');
      if (res.status === 401) {
        window.location.href = '/login';
        return;
      }
      const json = await res.json();
      if (res.ok) {
        setData(json);
        setLastRefresh(new Date());
        setError(null);
        // Store user info from cookie would need another endpoint; use client data instead
        setUser({ full_name: json.client?.name || 'User' });
      } else {
        setError(json.error);
      }
    } catch (err) {
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60 * 1000); // Auto-refresh every minute
    return () => clearInterval(interval);
  }, [fetchData]);

  async function resolveAlert(alertId) {
    await fetch('/api/client', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ alert_id: alertId }),
    });
    fetchData();
  }

  if (loading) {
    return (
      <DashboardLayout industry={industry} clientName="Loading..." userName="">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
            <div className="text-gray-500 text-sm">Loading dashboard...</div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout industry={industry} clientName="Error" userName="">
        <div className="card p-8 text-center">
          <div className="text-4xl mb-3">⚠️</div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Error loading dashboard</h2>
          <p className="text-gray-500 text-sm mb-4">{error}</p>
          <button onClick={fetchData} className="btn-primary">Retry</button>
        </div>
      </DashboardLayout>
    );
  }

  const { client, today, recent_events, open_alerts, week_chart, plan_limit, zones } = data || {};
  const industryName = client?.name || industry;

  return (
    <DashboardLayout industry={industry} clientName={industryName} userName={client?.name || ''}>
      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Workforce Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {new Date().toLocaleDateString('en', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            {lastRefresh && ` · Updated ${lastRefresh.toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' })}`}
          </p>
        </div>
        <button onClick={fetchData} className="btn-secondary text-sm">
          ↻ Refresh
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Present Today" value={today?.present_count ?? 0} color="text-green-600" sub={`of ${client?.total_workers || 0} total`} />
        <StatCard label="Absent" value={today?.absent_count ?? 0} color="text-gray-600" />
        <StatCard label="Open Alerts" value={open_alerts?.length ?? 0} color={open_alerts?.length > 0 ? 'text-red-600' : 'text-gray-600'} />
        <StatCard label="Events Today" value={today?.total_events ?? 0} color="text-blue-600" />
      </div>

      {/* Plan usage bar */}
      {plan_limit && (
        <div className="card p-4 mb-6">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="font-medium text-gray-700">Plan Usage</span>
            <span className="badge-blue">{client?.plan?.toUpperCase()} PLAN</span>
          </div>
          <div className="flex items-center gap-6">
            <div className="flex-1">
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>Workers</span>
                <span>{client?.total_workers || 0} / {plan_limit.max_workers}</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full">
                <div
                  className="h-2 bg-blue-500 rounded-full transition-all"
                  style={{ width: `${Math.min(100, ((client?.total_workers || 0) / plan_limit.max_workers) * 100)}%` }}
                />
              </div>
            </div>
            <div className="flex-1">
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>Cameras</span>
                <span>{zones?.length || 0} / {plan_limit.max_cameras}</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full">
                <div
                  className="h-2 bg-purple-500 rounded-full transition-all"
                  style={{ width: `${Math.min(100, ((zones?.length || 0) / plan_limit.max_cameras) * 100)}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Live activity feed */}
        <div className="lg:col-span-2 card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Live Activity Feed</h2>
            <span className="flex items-center gap-1.5 text-xs text-green-600">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              Live
            </span>
          </div>
          {recent_events?.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm">No activity yet today</div>
          ) : (
            <div className="max-h-96 overflow-y-auto">
              {recent_events?.map((e) => <EventRow key={e.id} event={e} />)}
            </div>
          )}
        </div>

        {/* Alerts panel */}
        <div className="card p-5">
          <h2 className="font-semibold text-gray-900 mb-4">
            Active Alerts
            {open_alerts?.length > 0 && (
              <span className="ml-2 badge-red">{open_alerts.length}</span>
            )}
          </h2>
          {open_alerts?.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm">
              <div className="text-3xl mb-2">✅</div>
              No active alerts
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {open_alerts?.map((alert) => (
                <div key={alert.id} className="border border-red-100 bg-red-50 rounded-lg p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <AlertBadge type={alert.alert_type} />
                      <p className="text-sm text-gray-800 mt-1">{alert.message}</p>
                      <p className="text-xs text-gray-400 mt-1">
                        {new Date(alert.created_at).toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    <button
                      onClick={() => resolveAlert(alert.id)}
                      className="text-xs text-gray-500 hover:text-green-600 flex-shrink-0"
                    >
                      Resolve
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 7-day trend table */}
      {week_chart?.length > 0 && (
        <div className="card p-5 mt-6">
          <h2 className="font-semibold text-gray-900 mb-4">7-Day Summary</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-2 text-gray-500 font-medium">Date</th>
                  <th className="text-right py-2 text-gray-500 font-medium">Present</th>
                  <th className="text-right py-2 text-gray-500 font-medium">Absent</th>
                  <th className="text-right py-2 text-gray-500 font-medium">Late</th>
                  <th className="text-right py-2 text-gray-500 font-medium">Violations</th>
                  <th className="text-right py-2 text-gray-500 font-medium">Events</th>
                </tr>
              </thead>
              <tbody>
                {week_chart.map((row) => (
                  <tr key={row.summary_date} className="border-b border-gray-50">
                    <td className="py-2 text-gray-700">
                      {new Date(row.summary_date).toLocaleDateString('en', { weekday: 'short', month: 'short', day: 'numeric' })}
                    </td>
                    <td className="py-2 text-right text-green-600 font-medium">{row.present_count}</td>
                    <td className="py-2 text-right text-gray-500">{row.absent_count}</td>
                    <td className="py-2 text-right text-yellow-600">{row.late_count}</td>
                    <td className="py-2 text-right text-red-600">{row.violation_count}</td>
                    <td className="py-2 text-right text-blue-600">{row.total_events}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Camera zones */}
      {zones?.length > 0 && (
        <div className="card p-5 mt-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Camera Zones</h2>
            <a href="/zones" className="text-sm text-blue-600 hover:underline">Manage →</a>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {zones.map((zone) => (
              <div key={zone.id} className="bg-gray-50 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg">📹</span>
                  <span className="font-medium text-gray-800 text-sm">{zone.name}</span>
                </div>
                <div className="text-xs text-gray-500">{zone.location_label || zone.zone_type}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
