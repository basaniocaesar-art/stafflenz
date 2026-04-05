'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import DashboardLayout from './DashboardLayout';

// --- Fake AI events for live simulation ---
const FAKE_NAMES = ['Ravi Kumar', 'Priya Sharma', 'James O.', 'Fatima Al-H.', 'Chen Wei', 'Maria Santos', 'Unknown', 'Worker #7', 'Supervisor'];
const FAKE_ZONES = ['Zone A', 'Zone B', 'Zone C', 'Gate 1', 'Storage', 'Exit', 'Floor 2', 'Canteen', 'Lobby'];
const FAKE_EVENTS = [
  { type: 'check_in', color: 'text-green-400', label: 'Check-in', icon: '⬤' },
  { type: 'detected', color: 'text-blue-400', label: 'Detected', icon: '⬤' },
  { type: 'ppe_violation', color: 'text-yellow-400', label: 'PPE Alert', icon: '⬤' },
  { type: 'zone_violation', color: 'text-red-400', label: 'Zone Breach', icon: '⬤' },
  { type: 'check_out', color: 'text-gray-400', label: 'Check-out', icon: '⬤' },
];

function randomItem(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function randomConf() { return (82 + Math.random() * 17).toFixed(1); }
function genEvent(id) {
  const ev = randomItem(FAKE_EVENTS);
  return {
    id,
    name: randomItem(FAKE_NAMES),
    zone: randomItem(FAKE_ZONES),
    type: ev.type,
    color: ev.color,
    label: ev.label,
    conf: randomConf(),
    time: new Date().toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
  };
}

// --- Scanning box positions (randomised) ---
function randomBox() {
  return {
    x: 5 + Math.random() * 55,
    y: 5 + Math.random() * 55,
    w: 18 + Math.random() * 22,
    h: 20 + Math.random() * 20,
    conf: randomConf(),
    label: randomItem(['Worker', 'Supervisor', 'Unknown', 'PPE OK', 'NO PPE']),
    color: Math.random() > 0.8 ? '#ef4444' : Math.random() > 0.5 ? '#facc15' : '#22c55e',
  };
}

// --- Single camera feed with AI overlay ---
function AICamFeed({ camIndex, videoUrl, active, alertCam }) {
  const videoRef = useRef(null);
  const [scan, setScan] = useState(0); // 0-100 vertical sweep
  const [boxes, setBoxes] = useState([]);
  const [flash, setFlash] = useState(false);

  // Sweep animation
  useEffect(() => {
    let raf;
    let pos = 0;
    function step() {
      pos = (pos + 0.6) % 110;
      setScan(pos);
      raf = requestAnimationFrame(step);
    }
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, []);

  // Detection boxes refresh every 2.5s
  useEffect(() => {
    function refresh() {
      const count = 1 + Math.floor(Math.random() * 3);
      setBoxes(Array.from({ length: count }, randomBox));
      setFlash(true);
      setTimeout(() => setFlash(false), 200);
    }
    refresh();
    const iv = setInterval(refresh, 2500 + Math.random() * 1500);
    return () => clearInterval(iv);
  }, [videoUrl]);

  useEffect(() => {
    if (videoRef.current && videoUrl) {
      videoRef.current.src = videoUrl;
      videoRef.current.play().catch(() => {});
    }
  }, [videoUrl]);

  return (
    <div
      className="relative bg-black rounded overflow-hidden"
      style={{ aspectRatio: '16/9', border: alertCam ? '2px solid #ef4444' : '1px solid #374151' }}
    >
      {/* Video */}
      {videoUrl ? (
        <video
          ref={videoRef}
          className="w-full h-full object-cover opacity-90"
          autoPlay muted loop playsInline
          style={{ filter: 'brightness(0.85) contrast(1.1)' }}
        />
      ) : (
        <div className="w-full h-full bg-gray-900" />
      )}

      {/* Flash on detection */}
      {flash && (
        <div className="absolute inset-0 bg-blue-400 opacity-10 pointer-events-none" />
      )}

      {/* Scan line */}
      <div
        className="absolute left-0 right-0 pointer-events-none"
        style={{
          top: `${scan}%`,
          height: '2px',
          background: 'linear-gradient(90deg, transparent, rgba(34,211,238,0.7), transparent)',
          boxShadow: '0 0 8px rgba(34,211,238,0.5)',
        }}
      />

      {/* Detection boxes */}
      {boxes.map((b, i) => (
        <div
          key={i}
          className="absolute pointer-events-none"
          style={{
            left: `${b.x}%`, top: `${b.y}%`,
            width: `${b.w}%`, height: `${b.h}%`,
            border: `1.5px solid ${b.color}`,
            boxShadow: `0 0 6px ${b.color}44`,
          }}
        >
          <div
            className="absolute -top-4 left-0 text-[9px] font-mono whitespace-nowrap px-1 rounded"
            style={{ background: b.color + 'cc', color: '#000', lineHeight: '14px' }}
          >
            {b.label} {b.conf}%
          </div>
          {/* Corner marks */}
          <div className="absolute top-0 left-0 w-2 h-0.5" style={{ background: b.color }} />
          <div className="absolute top-0 left-0 w-0.5 h-2" style={{ background: b.color }} />
          <div className="absolute top-0 right-0 w-2 h-0.5" style={{ background: b.color }} />
          <div className="absolute top-0 right-0 w-0.5 h-2" style={{ background: b.color }} />
          <div className="absolute bottom-0 left-0 w-2 h-0.5" style={{ background: b.color }} />
          <div className="absolute bottom-0 left-0 w-0.5 h-2" style={{ background: b.color }} />
          <div className="absolute bottom-0 right-0 w-2 h-0.5" style={{ background: b.color }} />
          <div className="absolute bottom-0 right-0 w-0.5 h-2" style={{ background: b.color }} />
        </div>
      ))}

      {/* CAM label */}
      <div className="absolute top-1 left-1 flex items-center gap-1">
        <span className="text-[9px] font-mono text-white bg-black/70 px-1 rounded">CAM {camIndex + 1}</span>
        {alertCam ? (
          <span className="text-[9px] font-mono text-white bg-red-600 px-1 rounded animate-pulse">ALERT</span>
        ) : (
          <span className="flex items-center gap-0.5 text-[9px] font-mono text-red-400 bg-black/70 px-1 rounded">
            <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse inline-block" />
            REC
          </span>
        )}
      </div>

      {/* AI processing indicator */}
      <div className="absolute bottom-1 right-1 text-[8px] font-mono text-cyan-400 bg-black/70 px-1 rounded">
        AI {active ? <span className="animate-pulse">▶</span> : '▶'}
      </div>

      {/* Grid overlay */}
      <div className="absolute inset-0 pointer-events-none" style={{
        backgroundImage: 'linear-gradient(rgba(34,211,238,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(34,211,238,0.03) 1px, transparent 1px)',
        backgroundSize: '20% 20%',
      }} />
    </div>
  );
}

// --- Pulsing stat card ---
function LiveStat({ label, value, color, pulse }) {
  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg p-4 relative overflow-hidden">
      {pulse && (
        <div className="absolute inset-0 rounded-lg opacity-10 animate-pulse" style={{ background: color }} />
      )}
      <div className="text-xs text-gray-500 font-mono mb-1">{label}</div>
      <div className="text-2xl font-bold font-mono" style={{ color }}>{value}</div>
    </div>
  );
}

// --- Alert badge ---
function AlertBadge({ type }) {
  const map = {
    zone_violation: 'bg-red-900 text-red-300 border-red-700',
    ppe_violation: 'bg-yellow-900 text-yellow-300 border-yellow-700',
    absent: 'bg-gray-800 text-gray-300 border-gray-600',
    late: 'bg-yellow-900 text-yellow-300 border-yellow-700',
    unauthorized: 'bg-red-900 text-red-300 border-red-700',
    low_confidence: 'bg-blue-900 text-blue-300 border-blue-700',
  };
  return (
    <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${map[type] || 'bg-gray-800 text-gray-300 border-gray-600'}`}>
      {type?.replace('_', ' ').toUpperCase()}
    </span>
  );
}

export default function DashboardPage({ industry }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastRefresh, setLastRefresh] = useState(null);
  const [waNumber, setWaNumber] = useState('');
  const [waSaving, setWaSaving] = useState(false);
  const [waStatus, setWaStatus] = useState(null);

  // Live feed state
  const [videoUrls, setVideoUrls] = useState(Array(8).fill(null));
  const [liveLog, setLiveLog] = useState([]);
  const [eventCounter, setEventCounter] = useState(1000);
  const [alertCams, setAlertCams] = useState([]);
  const [aiStats, setAiStats] = useState({ frames: 2410, detections: 47, alerts: 3, uptime: '99.9%' });
  const [activeTab, setActiveTab] = useState('cameras'); // cameras | alerts | analytics

  // Load Pexels videos
  useEffect(() => {
    async function loadVideos() {
      try {
        const res = await fetch('/api/pexels?count=8');
        const json = await res.json();
        if (json.urls) setVideoUrls(json.urls);
      } catch {}
    }
    loadVideos();
  }, []);

  // Cycle videos every 4 seconds (staggered per camera)
  useEffect(() => {
    const intervals = videoUrls.map((_, i) => {
      const delay = i * 600;
      const timer = setTimeout(() => {
        const iv = setInterval(async () => {
          try {
            const res = await fetch('/api/pexels?count=1');
            const json = await res.json();
            const url = json.url || (json.urls && json.urls[0]);
            if (url) {
              setVideoUrls(prev => {
                const next = [...prev];
                next[i] = url;
                return next;
              });
            }
          } catch {}
        }, 4000 + i * 300);
        return iv;
      }, delay);
      return timer;
    });
    return () => intervals.forEach(clearTimeout);
  }, []); // eslint-disable-line

  // Generate fake live events every 1.5-3s
  useEffect(() => {
    let counter = 1000;
    function addEvent() {
      counter++;
      const ev = genEvent(counter);
      setEventCounter(counter);
      setLiveLog(prev => [ev, ...prev].slice(0, 60));
      // Randomly trigger alert cam
      if (ev.type === 'zone_violation' || ev.type === 'ppe_violation') {
        const cam = Math.floor(Math.random() * 8);
        setAlertCams([cam]);
        setTimeout(() => setAlertCams([]), 3000);
      }
      // Update AI stats
      setAiStats(prev => ({
        frames: prev.frames + Math.floor(Math.random() * 3) + 1,
        detections: prev.detections + (Math.random() > 0.6 ? 1 : 0),
        alerts: prev.alerts + (Math.random() > 0.85 ? 1 : 0),
        uptime: '99.9%',
      }));
    }
    const iv = setInterval(addEvent, 1500 + Math.random() * 1500);
    return () => clearInterval(iv);
  }, []);

  // Fetch real data
  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/client');
      if (res.status === 401) { window.location.href = '/login'; return; }
      const json = await res.json();
      if (res.ok) {
        setData(json);
        setLastRefresh(new Date());
        setError(null);
        if (json.client?.whatsapp_notify) setWaNumber(json.client.whatsapp_notify);
      } else { setError(json.error); }
    } catch { setError('Failed to load'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    fetchData();
    const iv = setInterval(fetchData, 60000);
    return () => clearInterval(iv);
  }, [fetchData]);

  async function saveWhatsApp() {
    setWaSaving(true); setWaStatus(null);
    const res = await fetch('/api/client', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ whatsapp_notify: waNumber }) });
    setWaSaving(false);
    setWaStatus(res.ok ? 'saved' : 'error');
    setTimeout(() => setWaStatus(null), 3000);
  }

  async function resolveAlert(alertId) {
    await fetch('/api/client', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ alert_id: alertId }) });
    fetchData();
  }

  if (loading) {
    return (
      <DashboardLayout industry={industry} clientName="Loading..." userName="">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <div className="text-gray-400 text-sm font-mono">Initialising LenzAI...</div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout industry={industry} clientName="Error" userName="">
        <div className="bg-gray-900 border border-gray-700 rounded-xl p-8 text-center">
          <div className="text-4xl mb-3">⚠️</div>
          <h2 className="text-lg font-semibold text-gray-200 mb-2">Connection error</h2>
          <p className="text-gray-500 text-sm mb-4">{error}</p>
          <button onClick={fetchData} className="bg-cyan-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-cyan-500">Retry</button>
        </div>
      </DashboardLayout>
    );
  }

  const { client, today, recent_events, open_alerts, week_chart, plan_limit, zones } = data || {};
  const industryName = client?.name || industry;

  return (
    <DashboardLayout industry={industry} clientName={industryName} userName={client?.name || ''}>

      {/* Dark header bar */}
      <div className="bg-gray-950 border border-gray-800 rounded-xl px-5 py-3 mb-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse" />
          <span className="font-mono text-cyan-400 text-sm font-semibold tracking-wider">LENZAI LIVE MONITORING</span>
          <span className="text-gray-600 text-xs font-mono">|</span>
          <span className="text-gray-400 text-xs font-mono">
            {new Date().toLocaleString('en', { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xs font-mono text-green-400">SYS OK</span>
          <button onClick={fetchData} className="text-xs font-mono text-gray-500 hover:text-cyan-400 transition-colors">↻ SYNC</button>
        </div>
      </div>

      {/* AI Stats bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        <LiveStat label="FRAMES ANALYSED" value={aiStats.frames.toLocaleString()} color="#22d3ee" pulse />
        <LiveStat label="DETECTIONS" value={aiStats.detections} color="#4ade80" pulse />
        <LiveStat label="ACTIVE ALERTS" value={(open_alerts?.length ?? 0) + (aiStats.alerts > 0 ? aiStats.alerts : 0)} color={open_alerts?.length > 0 ? '#f87171' : '#9ca3af'} pulse={open_alerts?.length > 0} />
        <LiveStat label="AI UPTIME" value={aiStats.uptime} color="#a78bfa" />
      </div>

      {/* Tab navigation */}
      <div className="flex gap-1 mb-4 bg-gray-900 border border-gray-800 rounded-lg p-1 w-fit">
        {[['cameras', 'CAMERAS'], ['alerts', 'ALERTS'], ['analytics', 'ANALYTICS']].map(([key, label]) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`px-4 py-1.5 text-xs font-mono rounded-md transition-all ${
              activeTab === key ? 'bg-cyan-600 text-white' : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ---- CAMERAS TAB ---- */}
      {activeTab === 'cameras' && (
        <div className="grid lg:grid-cols-3 gap-4">
          {/* Camera grid - 8 feeds */}
          <div className="lg:col-span-2">
            <div className="bg-gray-950 border border-gray-800 rounded-xl p-3">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-mono text-gray-400">LIVE CAMERA FEEDS — {zones?.length || 8} ZONES ACTIVE</span>
                <span className="text-xs font-mono text-cyan-400 animate-pulse">● PROCESSING</span>
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                {videoUrls.map((url, i) => (
                  <AICamFeed
                    key={i}
                    camIndex={i}
                    videoUrl={url}
                    active
                    alertCam={alertCams.includes(i)}
                  />
                ))}
              </div>
              <div className="mt-2 flex items-center justify-between text-[10px] font-mono text-gray-600">
                <span>REFRESH CYCLE: 5MIN &nbsp;|&nbsp; RESOLUTION: 720p &nbsp;|&nbsp; AI MODEL: LENZAI v2.1</span>
                <span className="text-cyan-600">EDGE NODE: ONLINE</span>
              </div>
            </div>
          </div>

          {/* Live event log */}
          <div className="bg-gray-950 border border-gray-800 rounded-xl p-3 flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-mono text-gray-400">LIVE AI LOG</span>
              <span className="text-xs font-mono text-green-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse inline-block" />
                {eventCounter - 999} EVENTS
              </span>
            </div>
            <div className="flex-1 overflow-y-auto space-y-1 max-h-[480px]">
              {liveLog.map((ev, i) => (
                <div
                  key={ev.id}
                  className={`flex items-start gap-2 py-1.5 px-2 rounded text-[11px] font-mono transition-all ${
                    i === 0 ? 'bg-gray-800 border border-gray-700' : 'bg-transparent'
                  }`}
                >
                  <span className={`mt-0.5 w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                    ev.type === 'zone_violation' || ev.type === 'ppe_violation' ? 'bg-red-400 animate-pulse' :
                    ev.type === 'check_in' ? 'bg-green-400' : 'bg-blue-400'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <span className={`font-semibold ${ev.color} truncate`}>{ev.label}</span>
                      <span className="text-gray-600 text-[10px] flex-shrink-0">{ev.time}</span>
                    </div>
                    <div className="text-gray-500 truncate">{ev.name} · {ev.zone} · {ev.conf}%</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ---- ALERTS TAB ---- */}
      {activeTab === 'alerts' && (
        <div className="grid lg:grid-cols-2 gap-4">
          <div className="bg-gray-950 border border-gray-800 rounded-xl p-4">
            <h2 className="font-mono text-sm text-gray-300 mb-4 flex items-center gap-2">
              ACTIVE ALERTS
              {open_alerts?.length > 0 && (
                <span className="bg-red-600 text-white text-xs font-mono px-2 py-0.5 rounded-full animate-pulse">{open_alerts.length}</span>
              )}
            </h2>
            {!open_alerts?.length ? (
              <div className="text-center py-12">
                <div className="text-4xl mb-3">✅</div>
                <div className="text-gray-500 text-sm font-mono">NO ACTIVE ALERTS</div>
              </div>
            ) : (
              <div className="space-y-3">
                {open_alerts.map((alert) => (
                  <div key={alert.id} className="border border-red-900 bg-red-950/40 rounded-lg p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <AlertBadge type={alert.alert_type} />
                        <p className="text-sm text-gray-300 mt-1.5">{alert.message}</p>
                        <p className="text-xs text-gray-600 mt-1 font-mono">
                          {new Date(alert.created_at).toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                      <button
                        onClick={() => resolveAlert(alert.id)}
                        className="text-xs text-gray-500 hover:text-green-400 font-mono flex-shrink-0"
                      >
                        [RESOLVE]
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* WhatsApp settings */}
          <div className="bg-gray-950 border border-gray-800 rounded-xl p-4">
            <h2 className="font-mono text-sm text-gray-300 mb-1">WHATSAPP ALERT NUMBER</h2>
            <p className="text-xs text-gray-600 font-mono mb-4">Violations detected by LenzAI are sent instantly to this number.</p>
            <div className="flex gap-2">
              <input
                type="tel"
                placeholder="+91XXXXXXXXXX"
                value={waNumber}
                onChange={e => setWaNumber(e.target.value)}
                className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 font-mono focus:outline-none focus:border-cyan-600"
              />
              <button
                onClick={saveWhatsApp}
                disabled={waSaving}
                className="bg-cyan-600 text-white px-4 py-2 rounded-lg text-sm font-mono hover:bg-cyan-500 disabled:opacity-50"
              >
                {waSaving ? 'SAVING...' : 'SAVE'}
              </button>
            </div>
            {waStatus === 'saved' && <p className="text-xs text-green-400 font-mono mt-2">Saved. Alerts will be sent to this number.</p>}
            {waStatus === 'error' && <p className="text-xs text-red-400 font-mono mt-2">Failed to save. Please try again.</p>}

            {/* Zone status */}
            {zones?.length > 0 && (
              <div className="mt-6">
                <h3 className="font-mono text-xs text-gray-500 mb-3">CAMERA ZONES</h3>
                <div className="grid grid-cols-2 gap-2">
                  {zones.map((zone) => (
                    <div key={zone.id} className="bg-gray-900 border border-gray-800 rounded-lg p-2 flex items-center gap-2">
                      <span className="w-2 h-2 bg-green-400 rounded-full flex-shrink-0" />
                      <div className="min-w-0">
                        <div className="text-xs text-gray-300 font-mono truncate">{zone.name}</div>
                        <div className="text-[10px] text-gray-600">{zone.location_label || zone.zone_type}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ---- ANALYTICS TAB ---- */}
      {activeTab === 'analytics' && (
        <div className="space-y-4">
          {/* KPI row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <LiveStat label="PRESENT TODAY" value={today?.present_count ?? 0} color="#4ade80" />
            <LiveStat label="ABSENT" value={today?.absent_count ?? 0} color="#9ca3af" />
            <LiveStat label="TOTAL EVENTS" value={today?.total_events ?? 0} color="#60a5fa" />
            <LiveStat label="PLAN" value={(client?.plan || 'FREE').toUpperCase()} color="#c084fc" />
          </div>

          {/* Plan usage */}
          {plan_limit && (
            <div className="bg-gray-950 border border-gray-800 rounded-xl p-4">
              <div className="font-mono text-xs text-gray-500 mb-4">PLAN USAGE</div>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-xs font-mono text-gray-500 mb-1.5">
                    <span>WORKERS</span>
                    <span className="text-gray-300">{client?.total_workers || 0} / {plan_limit.max_workers}</span>
                  </div>
                  <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className="h-2 bg-cyan-500 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, ((client?.total_workers || 0) / plan_limit.max_workers) * 100)}%` }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs font-mono text-gray-500 mb-1.5">
                    <span>CAMERAS</span>
                    <span className="text-gray-300">{zones?.length || 0} / {plan_limit.max_cameras}</span>
                  </div>
                  <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className="h-2 bg-purple-500 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, ((zones?.length || 0) / plan_limit.max_cameras) * 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 7-day table */}
          {week_chart?.length > 0 && (
            <div className="bg-gray-950 border border-gray-800 rounded-xl p-4">
              <div className="font-mono text-xs text-gray-500 mb-4">7-DAY SUMMARY</div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs font-mono">
                  <thead>
                    <tr className="border-b border-gray-800">
                      {['DATE', 'PRESENT', 'ABSENT', 'LATE', 'VIOLATIONS', 'EVENTS'].map(h => (
                        <th key={h} className="text-left py-2 pr-4 text-gray-600">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {week_chart.map((row) => (
                      <tr key={row.summary_date} className="border-b border-gray-900">
                        <td className="py-2 pr-4 text-gray-400">
                          {new Date(row.summary_date).toLocaleDateString('en', { weekday: 'short', month: 'short', day: 'numeric' })}
                        </td>
                        <td className="py-2 pr-4 text-green-400">{row.present_count}</td>
                        <td className="py-2 pr-4 text-gray-500">{row.absent_count}</td>
                        <td className="py-2 pr-4 text-yellow-400">{row.late_count}</td>
                        <td className="py-2 pr-4 text-red-400">{row.violation_count}</td>
                        <td className="py-2 pr-4 text-cyan-400">{row.total_events}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Real-time activity */}
          <div className="bg-gray-950 border border-gray-800 rounded-xl p-4">
            <div className="font-mono text-xs text-gray-500 mb-3">RECENT ACTIVITY</div>
            <div className="space-y-1 max-h-64 overflow-y-auto">
              {(recent_events || []).map((e) => (
                <div key={e.id} className="flex items-start gap-3 py-1.5 border-b border-gray-900 last:border-0">
                  <span className="text-[10px] font-mono text-gray-600 flex-shrink-0 w-16 pt-0.5">
                    {new Date(e.occurred_at).toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-gray-300 font-mono truncate">{e.worker_name || 'Unknown'}</div>
                    <div className="text-[10px] text-gray-600">{e.activity || e.event_type?.replace('_', ' ')}</div>
                  </div>
                  {e.confidence && (
                    <span className="text-[10px] font-mono text-cyan-500 flex-shrink-0">{Math.round(e.confidence)}%</span>
                  )}
                </div>
              ))}
              {!recent_events?.length && (
                <div className="text-center py-6 text-gray-600 text-xs font-mono">NO ACTIVITY YET TODAY</div>
              )}
            </div>
          </div>
        </div>
      )}

    </DashboardLayout>
  );
}
