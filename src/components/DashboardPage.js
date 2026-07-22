'use client';
import { useState, useEffect, useCallback, useMemo } from 'react';
import DashboardLayout from './DashboardLayout';

/* ── helpers ────────────────────────────────────────────────────────────────── */
const EVENT_STYLE = {
  check_in:       { color:'#22c55e', label:'Check-in'    },
  detected:       { color:'#60a5fa', label:'Detected'    },
  detection:      { color:'#60a5fa', label:'Detected'    },
  ppe_violation:  { color:'#facc15', label:'PPE Alert'   },
  zone_violation: { color:'#f87171', label:'Zone Breach' },
  check_out:      { color:'#94a3b8', label:'Check-out'   },
};

function eventStyle(type) {
  return EVENT_STYLE[type] || { color:'#60a5fa', label: type?.replace('_',' ') || 'Event' };
}

/* randomBox is used by AICamFeed for AI detection bounding-box visual overlay */
function randomBox() {
  const labels = ['Worker','Supervisor','Unknown','PPE OK','NO PPE'];
  const conf = (82 + Math.random() * 17).toFixed(1);
  return {
    x: 5 + Math.random()*55, y: 5 + Math.random()*55,
    w: 18 + Math.random()*22, h: 20 + Math.random()*20,
    conf,
    label: labels[Math.floor(Math.random() * labels.length)],
    color: Math.random()>0.8 ? '#ef4444' : Math.random()>0.5 ? '#facc15' : '#22c55e',
  };
}

/* ── Weekly Activity Chart (SVG) ────────────────────────────────────────────── */
function WeeklyChart({ weekData }) {
  if (!weekData?.length) {
    return (
      <div className="flex items-center justify-center" style={{height:'110px'}}>
        <span className="text-xs" style={{color:'#475569'}}>Weekly data will appear after a few days of monitoring</span>
      </div>
    );
  }
  const days = weekData;
  const vals  = days.map(d => d.present_count || 0);
  const max   = Math.max(...vals, 1);
  const labels= ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const W=560, H=110, pad=20;
  const pts   = vals.map((v,i) => ({ x: pad+(i/(vals.length-1))*(W-pad*2), y: H-pad-(v/max)*(H-pad*2) }));
  const line  = pts.map((p,i)=>`${i===0?'M':'L'}${p.x},${p.y}`).join(' ');
  const area  = `${line} L${pts[pts.length-1].x},${H} L${pts[0].x},${H} Z`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{height:'110px'}}>
      <defs>
        <linearGradient id="wGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.25"/>
          <stop offset="100%" stopColor="#22d3ee" stopOpacity="0"/>
        </linearGradient>
        <linearGradient id="wLine" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#3b82f6"/>
          <stop offset="100%" stopColor="#22d3ee"/>
        </linearGradient>
        <filter id="wGlow"><feGaussianBlur stdDeviation="2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
      </defs>
      {[0.25,0.5,0.75,1].map(f=>(
        <line key={f} x1={pad} y1={pad+(1-f)*(H-pad*2)} x2={W-pad} y2={pad+(1-f)*(H-pad*2)} stroke="#ffffff08" strokeWidth="1"/>
      ))}
      <path d={area} fill="url(#wGrad)"/>
      <path d={line} fill="none" stroke="url(#wLine)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" filter="url(#wGlow)"/>
      {pts.map((p,i)=>(
        <circle key={i} cx={p.x} cy={p.y} r="4" fill="#0f172a" stroke="#22d3ee" strokeWidth="2" filter="url(#wGlow)"/>
      ))}
      {pts.map((p,i)=>(
        <text key={i} x={p.x} y={H-2} textAnchor="middle" fill="#475569" fontSize="10" fontFamily="monospace">{labels[i % labels.length]}</text>
      ))}
    </svg>
  );
}

/* ── Performance Heatmap ────────────────────────────────────────────────────── */
function Heatmap({ workers, recentEvents, weekData }) {
  function heatColor(v) {
    if (v<0.15) return '#0f2744'; if (v<0.3) return '#1e3a5f';
    if (v<0.5) return '#1d6fa4'; if (v<0.75) return '#22a8d4'; return '#22d3ee';
  }

  if (!workers?.length) {
    return (
      <div className="text-center py-8 text-xs" style={{color:'#475569'}}>
        Add workers to see activity heatmap
      </div>
    );
  }

  // Build real data: group events by worker + hour of day
  // Each cell = one hour (0-23), each row = one worker
  const cols = 24;
  const eventsByWorkerHour = {};
  (recentEvents || []).forEach(e => {
    const name = e.worker_name || 'Unknown';
    if (name === 'Unknown Person') return;
    const h = new Date(e.occurred_at).getHours();
    const key = `${name}_${h}`;
    eventsByWorkerHour[key] = (eventsByWorkerHour[key] || 0) + 1;
  });
  const maxVal = Math.max(1, ...Object.values(eventsByWorkerHour));

  const workerNames = workers.slice(0, 5).map(w => w.full_name || w.name || 'Worker');

  // Build grid from real data only — no random, no fake
  const grid = workerNames.map(name => {
    return Array.from({ length: cols }, (_, h) => {
      const count = eventsByWorkerHour[`${name}_${h}`] || 0;
      return count / maxVal;
    });
  });

  const hasData = Object.keys(eventsByWorkerHour).length > 0;

  if (!hasData) {
    return (
      <div className="text-center py-8 text-xs" style={{color:'#475569'}}>
        No activity data yet — heatmap will populate as the AI detects staff
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <div style={{minWidth:'480px'}}>
        {workerNames.map((name,ei)=>(
          <div key={ei} className="flex items-center gap-0.5 mb-1">
            <div className="text-xs font-mono w-16 text-right pr-2 shrink-0 truncate" style={{color:'#64748b'}}>{name.split(' ').slice(0,2).join(' ')}</div>
            {grid[ei].map((v,hi)=>(
              <div key={hi} className="rounded-sm shrink-0 hover:scale-125 transition-transform cursor-default"
                title={`${name} · ${hi}:00 — ${eventsByWorkerHour[`${name}_${hi}`] || 0} detections`}
                style={{width:'14px',height:'14px',background:heatColor(v),boxShadow:v>0.7?`0 0 4px ${heatColor(v)}80`:undefined}}/>
            ))}
          </div>
        ))}
        <div className="flex items-center gap-0.5 mt-2 ml-[72px]">
          {Array.from({length:24},(_,h)=>(
            <div key={h} className="text-center shrink-0" style={{width:'14px'}}>
              {h%3===0 && <span className="text-[6px] font-mono" style={{color:'#475569'}}>{h}</span>}
            </div>
          ))}
        </div>
        <div className="flex items-center gap-1 mt-1 ml-[72px]">
          <span className="text-[9px] mr-1" style={{color:'#475569'}}>Low</span>
          {['#0f2744','#1e3a5f','#1d6fa4','#22a8d4','#22d3ee'].map((c,i)=>(
            <div key={i} className="w-3 h-3 rounded-sm" style={{background:c}}/>
          ))}
          <span className="text-[9px] ml-1" style={{color:'#475569'}}>High</span>
        </div>
      </div>
    </div>
  );
}

/* ── Setup Checklist Widget ─────────────────────────────────────────────────── */
function SetupChecklist({ workersCount, zonesCount, hasFrames, alertsCount, aiActive }) {
  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('stafflenz_checklist_dismissed') === '1';
  });

  function dismiss() {
    setDismissed(true);
    try { localStorage.setItem('stafflenz_checklist_dismissed', '1'); } catch {}
  }

  const items = [
    { done: zonesCount > 0, label: 'Business areas configured', cta: 'Configure', href: '/zones' },
    { done: hasFrames, label: 'Live feeds active', cta: 'Check status', href: '/zones' },
    { done: workersCount >= 1, label: `Workers added (${workersCount})`, cta: 'Add workers', href: '/workers' },
    { done: aiActive, label: 'AI is monitoring & alerting', cta: 'View alerts', href: '#' },
  ];

  const completed = items.filter(i => i.done).length;
  const total = items.length;
  const progress = Math.round((completed / total) * 100);

  // Hide checklist once everything is done
  if (completed === total || dismissed) return null;

  return (
    <div className="rounded-2xl p-5 border" style={{background:'linear-gradient(135deg,rgba(34,211,238,0.08),rgba(59,130,246,0.08))',borderColor:'rgba(34,211,238,0.3)'}}>
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xl">🚀</span>
            <h2 className="text-base font-bold text-white">Setup Checklist</h2>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{background:'rgba(34,211,238,0.15)',color:'#22d3ee'}}>{completed}/{total}</span>
          </div>
          <p className="text-xs" style={{color:'#94a3b8'}}>Complete these steps to get the most out of StaffLenz</p>
        </div>
        <button onClick={dismiss} className="text-xs hover:text-white transition-colors" style={{color:'#475569'}}>Dismiss</button>
      </div>

      {/* Progress bar */}
      <div className="w-full h-1.5 rounded-full overflow-hidden mb-4" style={{background:'rgba(255,255,255,0.05)'}}>
        <div className="h-full rounded-full transition-all duration-500" style={{width:`${progress}%`,background:'linear-gradient(90deg,#22d3ee,#3b82f6)'}}/>
      </div>

      {/* Checklist items */}
      <div className="space-y-2">
        {items.map((item, i)=>(
          <div key={i} className="flex items-center justify-between p-2.5 rounded-lg transition-all" style={{background:item.done?'rgba(34,197,94,0.05)':'rgba(15,23,42,0.4)',border:`1px solid ${item.done?'rgba(34,197,94,0.2)':'rgba(30,45,74,0.5)'}`}}>
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] shrink-0" style={{background:item.done?'#22c55e':'transparent',border:item.done?'none':'1.5px solid #475569',color:'white'}}>
                {item.done ? '✓' : ''}
              </div>
              <span className={`text-sm ${item.done?'line-through':''}`} style={{color:item.done?'#475569':'#e2e8f0'}}>{item.label}</span>
            </div>
            {!item.done && item.href !== '#' && (
              <a href={item.href} className="text-xs font-semibold px-3 py-1 rounded-lg transition-all hover:opacity-80" style={{background:'rgba(34,211,238,0.15)',color:'#22d3ee',border:'1px solid rgba(34,211,238,0.3)'}}>{item.cta} →</a>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Workforce scores (Coverage / Compliance / Engagement / Risk) ──────────
   Aggregates the last N timeline windows into the executive metrics that
   matter to a manager. All computed client-side from data already loaded. */
function computeWorkforceScores(timelines) {
  let totalPeople = 0, namedPeople = 0, working = 0;
  let totalAlerts = 0, highAlerts = 0, mediumAlerts = 0;
  const zoneObs = {};   // zone -> { total, named, working }
  const seenWorkers = new Set();

  const isReal = (n) => {
    const x = (n || '').toLowerCase().trim();
    return x && x !== 'unknown person' && x !== 'unknown' && x !== 'n/a';
  };
  const isActiveWork = (a) => {
    const x = (a || '').toLowerCase();
    return x && x !== 'idle' && x !== 'resting' && x !== 'waiting' && x !== 'standing';
  };

  for (const tl of (timelines || [])) {
    const body = tl.timeline || tl;
    for (const camWindow of (body?.timeline || [])) {
      for (const minute of (camWindow.minutes || [])) {
        for (const p of (minute.people || [])) {
          totalPeople++;
          const named = isReal(p.worker_name);
          if (named) { namedPeople++; seenWorkers.add(p.worker_name); }
          if (isActiveWork(p.activity)) working++;
          const z = p.zone;
          if (z) {
            if (!zoneObs[z]) zoneObs[z] = { total: 0, named: 0, working: 0 };
            zoneObs[z].total++;
            if (named) zoneObs[z].named++;
            if (isActiveWork(p.activity)) zoneObs[z].working++;
          }
        }
      }
    }
    for (const a of (body?.alerts || [])) {
      totalAlerts++;
      const s = (a.severity || '').toLowerCase();
      if (s === 'high') highAlerts++;
      else if (s === 'medium') mediumAlerts++;
    }
  }

  // Overall scores
  const coverageScore   = totalPeople ? Math.round((namedPeople / totalPeople) * 100) : null;
  const complianceScore = totalAlerts
    ? Math.max(0, 100 - Math.round((highAlerts * 8 + mediumAlerts * 2) / totalAlerts * 10))
    : 100;
  const engagementScore = totalPeople ? Math.round((working / totalPeople) * 100) : null;
  const riskLevel       = highAlerts >= 4 ? 'High' : highAlerts >= 1 ? 'Medium' : 'Low';

  // Per-zone coverage breakdown
  const zoneScores = Object.entries(zoneObs)
    .filter(([, v]) => v.total >= 2)   // ignore noisy zones with single observation
    .map(([name, v]) => ({
      name,
      coverage: v.total ? Math.round((v.named / v.total) * 100) : 0,
      observations: v.total,
    }))
    .sort((a, b) => b.observations - a.observations);

  return {
    coverageScore, complianceScore, engagementScore, riskLevel,
    zoneScores, namedWorkers: seenWorkers.size, totalAlerts, highAlerts,
  };
}

/* ── Per-camera AI stats ────────────────────────────────────────────────────
   Walks the most recent timeline windows and returns
   { 1: {staff, members, violations}, … 8: {...} } per channel. ───────── */
function computeCameraStats(timelines) {
  const stats = {};
  for (let i = 1; i <= 8; i++) stats[i] = { staff: new Set(), members: 0, violations: 0 };

  // Only look at the most recent ~15 minutes of windows (3 cron ticks)
  const recent = (timelines || []).slice(0, 3);
  const isReal = (name) => {
    const n = (name || '').toLowerCase().trim();
    return n && n !== 'unknown person' && n !== 'unknown' && n !== 'n/a' && n !== '';
  };

  for (const tl of recent) {
    const body = tl.timeline || tl;
    // Inner timeline windows per channel
    for (const camWindow of (body?.timeline || [])) {
      const ch = camWindow.camera_channel;
      if (!ch || !stats[ch]) continue;
      for (const minute of (camWindow.minutes || [])) {
        for (const p of (minute.people || [])) {
          if (isReal(p.worker_name)) stats[ch].staff.add(p.worker_name);
          else stats[ch].members++;
        }
      }
    }
    // High-severity alerts as violations, attributed by channel
    for (const a of (body?.alerts || [])) {
      const ch = a.camera_channel;
      if (!ch || !stats[ch]) continue;
      const sev = (a.severity || '').toLowerCase();
      if (sev === 'high') stats[ch].violations++;
    }
  }
  for (const ch in stats) stats[ch].staff = stats[ch].staff.size;
  return stats;
}

/* ── Per-location WhatsApp number row ──────────────────────────────────── */
function LocationWhatsAppRow({ location, onSaved }) {
  const [value, setValue]   = useState(location.whatsapp_notify || '');
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState(null);

  async function save() {
    setSaving(true); setStatus(null);
    const v = value.trim();
    const r = await fetch(`/api/locations/${location.id}/whatsapp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(v ? { phone: v } : { clear: true }),
    });
    setSaving(false);
    if (r.ok) {
      setStatus('saved');
      setTimeout(() => setStatus(null), 2500);
      onSaved?.();
    } else {
      const j = await r.json().catch(() => ({}));
      setStatus(j.error || 'error');
    }
  }

  return (
    <div className="flex items-center gap-2">
      <span className="w-32 text-xs text-white shrink-0 truncate">{location.name}</span>
      <input
        type="tel"
        placeholder="+91XXXXXXXXXX (optional)"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="flex-1 rounded-lg px-2 py-1.5 text-xs font-mono focus:outline-none"
        style={{ background: 'rgba(30,45,74,0.8)', border: '1px solid #1e2d4a', color: '#e2e8f0' }}
      />
      <button
        onClick={save}
        disabled={saving}
        className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white disabled:opacity-50"
        style={{ background: 'rgba(59,130,246,0.4)' }}
      >
        {saving ? '...' : (location.whatsapp_notify ? 'Update' : 'Save')}
      </button>
      {status === 'saved' && <span className="text-[10px]" style={{ color: '#22c55e' }}>✓ saved</span>}
      {status && status !== 'saved' && <span className="text-[10px] truncate max-w-[140px]" style={{ color: '#ef4444' }} title={status}>✗ {status.slice(0, 22)}</span>}
    </div>
  );
}

/* ── Camera Feed ────────────────────────────────────────────────────────────── */
function AICamFeed({ camIndex, videoUrl, alertCam, snapshotUrl, stats }) {
  const [imgKey, setImgKey] = useState(0);
  const hasRealFeed = !!snapshotUrl;
  const s = stats || { staff: 0, members: 0, violations: 0 };
  const showOverlay = hasRealFeed && (s.staff > 0 || s.members > 0 || s.violations > 0);

  // Refresh snapshot every 60 seconds
  useEffect(()=>{
    if(!hasRealFeed) return;
    const iv = setInterval(()=> setImgKey(k => k+1), 60000);
    return ()=>clearInterval(iv);
  },[hasRealFeed]);

  return (
    <div className="relative bg-black rounded-lg overflow-hidden" style={{aspectRatio:'16/9',border:alertCam?'1.5px solid #ef4444':'1px solid #1e2d4a'}}>
      {hasRealFeed ? (
        <img
          key={imgKey}
          src={`${snapshotUrl}&t=${imgKey}`}
          alt={`Camera ${camIndex+1}`}
          className="absolute inset-0 w-full h-full object-cover"
          onError={()=>{}}
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-950">
          <span className="text-[10px] font-mono text-gray-600">CAM {camIndex+1} · Waiting for frames</span>
        </div>
      )}
      <div className="absolute top-1.5 left-1.5 flex items-center gap-1">
        <span className="text-[9px] font-mono bg-black/70 px-1.5 py-0.5 rounded text-gray-300">CAM {camIndex+1}</span>
        {hasRealFeed && <span className="text-[8px] font-mono bg-emerald-600/90 text-white px-1.5 py-0.5 rounded">LIVE</span>}
        {alertCam && <span className="text-[8px] font-mono bg-red-600 text-white px-1.5 py-0.5 rounded animate-pulse">ALERT</span>}
      </div>
      {/* AI-detection overlay: only when we have signal */}
      {showOverlay && (
        <div className="absolute bottom-0 left-0 right-0 px-2 py-1 flex items-center justify-between text-[9px] font-mono backdrop-blur-sm" style={{background:'linear-gradient(to top, rgba(0,0,0,0.85), rgba(0,0,0,0.2))'}}>
          <span className="text-emerald-300 uppercase tracking-wider">AI</span>
          <span className="flex items-center gap-2 text-gray-200">
            <span title="Registered staff identified">{s.staff} staff</span>
            <span className="text-gray-600">·</span>
            <span title="Other people detected">{s.members} {s.members === 1 ? 'person' : 'people'}</span>
            <span className="text-gray-600">·</span>
            <span className={s.violations > 0 ? 'text-red-400 font-bold' : 'text-gray-300'} title="High-severity incidents">{s.violations} viol.</span>
          </span>
        </div>
      )}
    </div>
  );
}

/* ── Today's AI Summary ─────────────────────────────────────────────────────
   Turns raw timeline data into the 4 most important things a manager
   should know right now. Ranked by severity, color-coded. ─────────────── */
function computeHeroBullets(timelines, workersTotal) {
  const sev = { low: 0, medium: 0, high: 0 };
  const zones = {};       // zone -> { count, severity }
  const alertTypes = {};
  const namedWorkers = new Set();
  const distinctZonesSeen = new Set();
  let windowsCount = 0;

  for (const tl of timelines || []) {
    windowsCount++;
    const body = tl.timeline || tl;
    const alerts = (body?.alerts) || [];
    for (const a of alerts) {
      const s = (a.severity || '').toLowerCase();
      if (sev[s] !== undefined) sev[s]++;
      const t = a.alert_type || 'general';
      alertTypes[t] = (alertTypes[t] || 0) + 1;
      const z = a.zone_name;
      if (z) {
        distinctZonesSeen.add(z);
        if (!zones[z]) zones[z] = { count: 0, sev: 'low' };
        zones[z].count++;
        if (s === 'high' || (s === 'medium' && zones[z].sev === 'low')) zones[z].sev = s;
      }
      const w = a.worker_name;
      if (w && w !== 'Unknown Person' && w !== 'Unknown' && w !== 'unknown' && w !== 'N/A') {
        namedWorkers.add(w);
      }
    }
  }

  const bullets = [];

  // 1. High-severity items lead
  if (sev.high > 0) {
    const topHigh = Object.entries(zones)
      .filter(([, v]) => v.sev === 'high')
      .sort((a, b) => b[1].count - a[1].count)[0];
    bullets.push({
      sev: 'high',
      text: topHigh
        ? `${sev.high} high-priority incident${sev.high === 1 ? '' : 's'} today — ${topHigh[0]} (${topHigh[1].count}×)`
        : `${sev.high} high-priority incident${sev.high === 1 ? '' : 's'} today`,
    });
  }

  // 2. Top problem zone(s) — medium severity
  const problemZones = Object.entries(zones)
    .filter(([, v]) => v.count >= 3 && v.sev !== 'high')
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 2);
  for (const [name, v] of problemZones) {
    bullets.push({
      sev: 'medium',
      text: `${name} flagged ${v.count}× today`,
    });
  }

  // 3. Staffing alerts framing
  if (alertTypes.staffing > 5 && bullets.length < 4) {
    bullets.push({
      sev: sev.high > 0 ? 'medium' : 'low',
      text: `${alertTypes.staffing} staffing observations across the day`,
    });
  }

  // 4. Positive bullet: workers identified by face-id
  if (namedWorkers.size > 0 && bullets.length < 4) {
    const names = [...namedWorkers].slice(0, 3).join(', ');
    bullets.push({
      sev: 'low',
      text: `${namedWorkers.size} registered staff identified today (${names}${namedWorkers.size > 3 ? ', …' : ''})`,
    });
  } else if (windowsCount > 0 && workersTotal > 0 && namedWorkers.size === 0 && bullets.length < 4) {
    bullets.push({
      sev: 'medium',
      text: `No registered staff identified today — check face photos`,
    });
  }

  // 5. Coverage / activity windows
  if (windowsCount > 0 && bullets.length < 4) {
    bullets.push({
      sev: 'low',
      text: `${windowsCount} activity windows recorded across ${distinctZonesSeen.size || 'all'} business area${distinctZonesSeen.size === 1 ? '' : 's'}`,
    });
  }

  // 6. Quiet day fallback
  if (bullets.length === 0) {
    bullets.push({ sev: 'low', text: 'No incidents in the last 24 hours — all business areas reporting normally' });
  }

  return bullets.slice(0, 4);
}

function HeroSummary({ timelines, workersTotal, locationName }) {
  const bullets = computeHeroBullets(timelines, workersTotal);
  const dot = { low: '#22c55e', medium: '#f59e0b', high: '#ef4444' };
  const tint = { low: 'rgba(34,197,94,0.06)', medium: 'rgba(245,158,11,0.06)', high: 'rgba(239,68,68,0.08)' };

  return (
    <div className="rounded-2xl p-5 border mb-4" style={{ background: 'linear-gradient(135deg,rgba(13,22,49,0.95),rgba(13,22,49,0.7))', borderColor: '#1e2d4a' }}>
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#22d3ee' }}>Today&apos;s AI Summary</div>
          <div className="text-lg font-bold text-white mt-0.5">{locationName ? `${locationName} · last 24 hours` : 'All locations · last 24 hours'}</div>
        </div>
        <div className="text-[10px] font-mono" style={{ color: '#475569' }}>Auto-generated · refreshes every minute</div>
      </div>
      <div className="grid sm:grid-cols-2 gap-2">
        {bullets.map((b, i) => (
          <div key={i} className="flex items-start gap-3 px-3 py-2.5 rounded-lg" style={{ background: tint[b.sev], border: `1px solid ${dot[b.sev]}35` }}>
            <span className="w-2.5 h-2.5 rounded-full mt-1.5 shrink-0" style={{ background: dot[b.sev] }} />
            <span className="text-sm leading-snug" style={{ color: '#e2e8f0' }}>{b.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Main Dashboard ─────────────────────────────────────────────────────────── */
export default function DashboardPage({ industry }) {
  const [data,         setData]         = useState(null);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState(null);
  const [videoUrls,    setVideoUrls]    = useState(Array(8).fill(null));
  const [alertCams,    setAlertCams]    = useState([]);
  const [activeTab,    setActiveTab]    = useState('overview');
  const [waNumber,     setWaNumber]     = useState('');
  const [waSaving,     setWaSaving]     = useState(false);
  const [frameModal,   setFrameModal]   = useState(null); // { timeline_id, title, loading, frames, summary }
  const [selectedLocation, setSelectedLocation] = useState(null); // null = all locations
  const [selectedZone, setSelectedZone] = useState(null); // null = all cameras
  const [waStatus,     setWaStatus]     = useState(null);
  const [time,         setTime]         = useState(new Date());
  const [liveHead,     setLiveHead]     = useState(null);

  // Poll /api/live-headcount every 60s — cheap, one row per location
  useEffect(() => {
    let mounted = true;
    async function tick() {
      try {
        const r = await fetch('/api/live-headcount');
        if (r.ok) {
          const j = await r.json();
          if (mounted) setLiveHead(j);
        }
      } catch {}
    }
    tick();
    const iv = setInterval(tick, 60000);
    return () => { mounted = false; clearInterval(iv); };
  }, []);

  useEffect(()=>{ const iv=setInterval(()=>setTime(new Date()),1000); return ()=>clearInterval(iv); },[]);

  // Camera snapshots — use real frame_buffer data from the API (v2) instead
  // of trying to reach the DVR directly from the browser. Falls back to
  // ONVIF proxy or Pexels if no v2 data is available yet.
  useEffect(()=>{
    if (!data?.camera_snapshots) return;
    const urls = Array(8).fill(null);
    for (const snap of data.camera_snapshots) {
      if (snap.url && snap.channel >= 1 && snap.channel <= 8) {
        urls[snap.channel - 1] = snap.url;
      }
    }
    // Only update if we got at least one real URL
    if (urls.some(Boolean)) setVideoUrls(urls);
  },[data?.camera_snapshots]);

  // Per-camera AI stats — recompute when timelines change
  const cameraStats = useMemo(() => computeCameraStats(data?.timelines || []), [data?.timelines]);

  // Real data
  const fetchData = useCallback(async()=>{
    try{
      const locParam = selectedLocation ? `?location=${selectedLocation}` : '';
      const r=await fetch(`/api/client${locParam}`);
      if(r.status===401){ window.location.href='/login'; return; }
      const j=await r.json();
      if(r.ok){
        // Auto-redirect new clients to onboarding
        if (j.onboarding_completed === false) { window.location.href='/onboarding'; return; }
        setData(j); setError(null);
        if(j.client?.whatsapp_notify) setWaNumber(j.client.whatsapp_notify);
      }
      else setError(j.error);
    }catch{ setError('Failed to load'); }
    finally{ setLoading(false); }
  },[selectedLocation]);

  useEffect(()=>{ fetchData(); const iv=setInterval(fetchData,60000); return ()=>clearInterval(iv); },[fetchData]);

  async function openTimelineFrames(tl) {
    setFrameModal({ timeline_id: tl.id, title: new Date(tl.window_start).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'}), summary: tl.summary, loading: true, frames: [] });
    try {
      const r = await fetch(`/api/client/timeline-frames?id=${tl.id}`);
      const j = await r.json();
      setFrameModal(prev => prev ? { ...prev, loading: false, frames: j.frames || [], total: j.total_frames_in_window } : null);
    } catch {
      setFrameModal(prev => prev ? { ...prev, loading: false } : null);
    }
  }

  async function saveWhatsApp(){
    setWaSaving(true); setWaStatus(null);
    const r=await fetch('/api/client',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({whatsapp_notify:waNumber})});
    setWaSaving(false); setWaStatus(r.ok?'saved':'error'); setTimeout(()=>setWaStatus(null),3000);
  }

  async function resolveAlert(alertId){
    await fetch('/api/client',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({alert_id:alertId})});
    fetchData();
  }

  const S = { card:'#0d1631', border:'#1e2d4a', muted:'#475569', blue:'#3b82f6', cyan:'#22d3ee' };

  if(loading) return (
    <DashboardLayout industry={industry} clientName="Loading..." userName="">
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin mx-auto mb-3" style={{borderColor:'#22d3ee',borderTopColor:'transparent'}}/>
          <div className="text-sm" style={{color:'#475569'}}>Initialising StaffLenz...</div>
        </div>
      </div>
    </DashboardLayout>
  );

  if(error) return (
    <DashboardLayout industry={industry} clientName="Error" userName="">
      <div className="rounded-2xl p-8 text-center border" style={{background:S.card,borderColor:S.border}}>
        <div className="text-4xl mb-3">⚠️</div>
        <h2 className="text-lg font-semibold text-white mb-2">Connection error</h2>
        <p className="text-sm mb-4" style={{color:S.muted}}>{error}</p>
        <button onClick={fetchData} className="px-4 py-2 rounded-lg text-sm text-white font-medium" style={{background:S.blue}}>Retry</button>
      </div>
    </DashboardLayout>
  );

  const { client, today, recent_events, open_alerts, open_alerts_count, week_chart, plan_limit, zones, workers } = data || {};
  const alertCount = open_alerts_count ?? open_alerts?.length ?? 0;

  // When a location is selected, show its industry in the sidebar
  // (falls back to the client-level / route-level industry).
  const activeLocation = data?.locations?.find((l) => l.id === selectedLocation);
  const displayIndustry = activeLocation?.industry || client?.industry || industry;

  // Compute real AI stats from data
  const detections = today?.total_events ?? recent_events?.length ?? 0;
  const minutesSinceMidnight = time.getHours() * 60 + time.getMinutes();
  const frames = (zones?.length || 1) * Math.floor(minutesSinceMidnight / 5);

  // Compute hours logged: approximate from first event time to now
  const hoursLogged = (() => {
    if (!recent_events?.length) return '0.0';
    const timestamps = recent_events.map(e => new Date(e.occurred_at).getTime()).filter(t => !isNaN(t));
    if (!timestamps.length) return '0.0';
    const earliest = Math.min(...timestamps);
    const diffMs = Date.now() - earliest;
    return Math.max(0, diffMs / 3600000).toFixed(1);
  })();

  // Build live log entries from real recent_events
  const liveLog = (recent_events || []).slice(0, 60).map((e, i) => {
    const style = eventStyle(e.event_type);
    const eventDate = e.occurred_at ? new Date(e.occurred_at) : null;
    const isToday = eventDate && eventDate.toDateString() === new Date().toDateString();
    return {
      id: e.id || i,
      name: e.worker_name || 'Unknown',
      zone: e.activity || 'Zone',
      type: e.event_type,
      color: style.color,
      label: style.label,
      conf: e.confidence ? Math.round(e.confidence * 100) : '--',
      time: eventDate ? (isToday
        ? eventDate.toLocaleTimeString('en', { hour:'2-digit', minute:'2-digit', second:'2-digit' })
        : eventDate.toLocaleDateString('en', { month:'short', day:'numeric' }) + ' ' + eventDate.toLocaleTimeString('en', { hour:'2-digit', minute:'2-digit' })
      ) : '',
    };
  });

  const tabs = [
    { id:'overview',   label:'Dashboard'         },
    { id:'cameras',    label:'Live Operations'   },
    { id:'alerts',     label:'Incidents', badge: alertCount },
    { id:'analytics',  label:'Workforce Insights' },
  ];

  return (
    <DashboardLayout industry={industry} displayIndustry={displayIndustry} clientName={client?.name||industry} userName={client?.name||''}>

      {/* ── Page header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <div className="text-xs font-medium uppercase tracking-widest mb-1" style={{color:S.muted}}>Overview</div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">Dashboard</h1>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono hidden sm:block" style={{color:S.muted}}>{time.toLocaleTimeString()}</span>
          <span className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border" style={{color:'#22c55e',background:'rgba(34,197,94,0.08)',borderColor:'rgba(34,197,94,0.2)'}}>
            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{background:'#22c55e'}}/>
            StaffLenz Active
          </span>
        </div>
      </div>

      {/* ── Location picker (only shown if client has multiple locations) ── */}
      {/* ── Today's AI Summary (hero) ── */}
      <HeroSummary
        timelines={data?.timelines || []}
        workersTotal={client?.total_workers || 0}
        locationName={activeLocation?.name || null}
      />

      {data?.has_locations && data?.locations?.length > 0 && (
        <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-1">
          <button
            onClick={() => setSelectedLocation(null)}
            className="shrink-0 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all"
            style={!selectedLocation
              ? { background: 'rgba(59,130,246,0.2)', color: '#60a5fa', border: '1px solid rgba(59,130,246,0.3)' }
              : { color: '#64748b', border: '1px solid #1e2d4a' }}
          >
            All locations
          </button>
          {data.locations.map((loc) => (
            <button
              key={loc.id}
              onClick={() => setSelectedLocation(loc.id)}
              className="shrink-0 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-2"
              style={selectedLocation === loc.id
                ? { background: 'rgba(59,130,246,0.2)', color: '#60a5fa', border: '1px solid rgba(59,130,246,0.3)' }
                : { color: '#64748b', border: '1px solid #1e2d4a' }}
            >
              <span>{loc.name}</span>
              {loc.monitoring_paused && (
                <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded" style={{ background: 'rgba(251,146,60,0.18)', color: '#fb923c' }}>Paused</span>
              )}
              {loc.open_alerts > 0 && (
                <span className="w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold" style={{ background: '#ef4444', color: 'white' }}>{loc.open_alerts}</span>
              )}
            </button>
          ))}
          {/* Pause / Resume control for the currently selected location */}
          {selectedLocation && (() => {
            const loc = data.locations.find(l => l.id === selectedLocation);
            if (!loc) return null;
            const paused = !!loc.monitoring_paused;
            return (
              <button
                onClick={async () => {
                  if (!confirm(paused ? `Resume monitoring for ${loc.name}?` : `Pause monitoring for ${loc.name}? Cameras stop capturing until you resume.`)) return;
                  const r = await fetch(`/api/locations/${loc.id}/pause`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ paused: !paused }),
                  });
                  if (!r.ok) {
                    const j = await r.json().catch(() => ({}));
                    alert(`Failed: ${j.error || r.status}`);
                    return;
                  }
                  fetchData();
                }}
                className="shrink-0 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-2"
                style={paused
                  ? { background: 'rgba(34,197,94,0.18)', color: '#4ade80', border: '1px solid rgba(34,197,94,0.3)' }
                  : { background: 'rgba(251,146,60,0.18)', color: '#fb923c', border: '1px solid rgba(251,146,60,0.3)' }}
              >
                {paused ? '▶ Resume' : '⏸ Pause'}
              </button>
            );
          })()}
        </div>
      )}


      {/* ── Tab bar ── */}
      <div className="flex gap-1 mb-5 p-1 rounded-xl w-fit overflow-x-auto" style={{background:'rgba(13,22,49,0.8)',border:'1px solid #1e2d4a'}}>
        {tabs.map(t=>(
          <button key={t.id} onClick={()=>setActiveTab(t.id)}
            className="relative px-4 py-1.5 text-sm font-medium rounded-lg transition-all whitespace-nowrap shrink-0"
            style={activeTab===t.id?{background:'rgba(59,130,246,0.2)',color:'#60a5fa',border:'1px solid rgba(59,130,246,0.3)'}:{color:'#64748b',border:'1px solid transparent'}}>
            {t.label}
            {t.badge>0&&<span className="absolute -top-1 -right-1 text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center" style={{background:'#ef4444',color:'white'}}>{t.badge}</span>}
          </button>
        ))}
      </div>

      {/* ══════════════════ OVERVIEW TAB ══════════════════ */}
      {activeTab==='overview'&&(
        <div className="space-y-4">

          {/* Setup Checklist Widget — shown until all items complete */}
          <SetupChecklist
            workersCount={client?.total_workers || 0}
            zonesCount={zones?.length || 0}
            hasFrames={detections > 0 || (recent_events?.length || 0) > 0}
            alertsCount={alertCount}
            aiActive={(data?.timelines?.length || 0) > 0 || (data?.today_cost_usd || 0) > 0 || alertCount > 0}
          />

          {/* Reception / Front Desk live state — only shows when the location has a front_desk camera configured AND Claude emitted a front_desk block */}
          {(() => {
            const fd = (data?.timelines || []).find((t) => t.timeline?.front_desk?.minute_states?.length > 0)?.timeline?.front_desk;
            if (!fd) return null;
            const states = fd.minute_states || [];
            const latest = states[states.length - 1] || {};
            const activity = (latest.activity || 'unknown').toLowerCase();
            const door = (latest.door_state || 'unknown').toLowerCase();
            const person = latest.person_present ? (latest.person_name || 'Someone') : null;

            // Streak length at the END of states (so "on phone for X min")
            function tailRun(pred) {
              let n = 0;
              for (let i = states.length - 1; i >= 0; i--) { if (pred(states[i])) n++; else break; }
              return n;
            }
            const activityRun = tailRun((s) => (s.activity || '').toLowerCase() === activity);
            const doorRun = tailRun((s) => (s.door_state || '').toLowerCase() === door);

            const actLabel = {
              on_phone: '📞 On the phone',
              looking_at_laptop: '💻 Looking at laptop',
              chatting: '💬 Talking with someone',
              idle: '😶 Idle',
              working: '✏️ Working',
              away: '🚪 Away from desk',
              unknown: '❔ Unknown',
            }[activity] || `❔ ${activity}`;

            const actColor = activity === 'on_phone' && activityRun >= 5 ? '#f59e0b'
                           : activity === 'away' && activityRun >= 5 ? '#ef4444'
                           : activity === 'working' || activity === 'chatting' ? '#22c55e' : '#94a3b8';
            const doorColor = door === 'open' && doorRun >= 10 ? '#ef4444' : door === 'open' ? '#f59e0b' : '#22c55e';

            return (
              <div className="rounded-2xl p-5 border" style={{ background: S.card, borderColor: S.border }}>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h2 className="text-sm font-bold text-white">Front Desk (CAM {fd.camera_channel})</h2>
                    <p className="text-[11px]" style={{ color: S.muted }}>Reception activity + entry door — analysed every cycle</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div className="rounded-xl p-3 border" style={{ background: 'rgba(13,22,49,0.6)', borderColor: S.border }}>
                    <div className="text-[10px] uppercase tracking-wider" style={{ color: S.muted }}>Person at desk</div>
                    <div className="text-sm font-bold text-white mt-1">{person || 'Empty'}</div>
                  </div>
                  <div className="rounded-xl p-3 border" style={{ background: 'rgba(13,22,49,0.6)', borderColor: S.border }}>
                    <div className="text-[10px] uppercase tracking-wider" style={{ color: S.muted }}>Activity</div>
                    <div className="text-sm font-bold mt-1" style={{ color: actColor }}>{actLabel}</div>
                    {activityRun > 1 && <div className="text-[10px] mt-0.5" style={{ color: S.muted }}>continuous for ~{activityRun} min</div>}
                  </div>
                  <div className="rounded-xl p-3 border" style={{ background: 'rgba(13,22,49,0.6)', borderColor: S.border }}>
                    <div className="text-[10px] uppercase tracking-wider" style={{ color: S.muted }}>Entry door</div>
                    <div className="text-sm font-bold mt-1" style={{ color: doorColor }}>{door === 'open' ? '🚪 Open' : door === 'closed' ? '🔒 Closed' : '❔ Unknown'}</div>
                    {door === 'open' && doorRun > 1 && <div className="text-[10px] mt-0.5" style={{ color: doorColor }}>open for ~{doorRun} min</div>}
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Warehouse activity — today's entries, exits, trucks, loading (warehouse-mode locations only) */}
          {(data?.warehouse_summary || [])
            .filter((s) => !selectedLocation || s.location_id === selectedLocation)
            .map((s) => {
              const locName = (data.locations || []).find((l) => l.id === s.location_id)?.name || 'Warehouse';
              return (
                <div key={s.location_id} className="rounded-2xl p-5 border" style={{background:S.card,borderColor:S.border}}>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="text-sm font-bold text-white">Warehouse Activity · {locName}</h2>
                      <p className="text-[11px]" style={{color:S.muted}}>Today so far · analysed from camera footage</p>
                    </div>
                    <span className="text-[10px] font-mono uppercase tracking-widest px-2 py-1 rounded" style={{background:'rgba(168,139,250,0.15)',color:'#c4b5fd',border:'1px solid rgba(168,139,250,0.3)'}}>Warehouse mode</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                    {[
                      { label: 'People In',       value: s.entries,          color: '#22c55e' },
                      { label: 'People Out',      value: s.exits,            color: '#f59e0b' },
                      { label: 'Trucks Arrived',  value: s.trucks_arrived,   color: '#60a5fa' },
                      { label: 'Trucks Departed', value: s.trucks_departed,  color: '#a78bfa' },
                      { label: 'Loading Events',  value: s.loading + s.unloading, color: '#22d3ee' },
                      { label: 'Unusual',         value: s.unusual,          color: s.unusual > 0 ? '#ef4444' : '#64748b' },
                    ].map((t) => (
                      <div key={t.label} className="rounded-xl p-3 border" style={{background:'rgba(13,22,49,0.6)',borderColor:S.border}}>
                        <div className="text-[10px] uppercase tracking-wider" style={{color:S.muted}}>{t.label}</div>
                        <div className="text-3xl font-extrabold mt-1" style={{color:t.color, textShadow:`0 0 20px ${t.color}60`}}>{t.value ?? 0}</div>
                      </div>
                    ))}
                  </div>
                  {(s.recent || []).length > 0 && (
                    <div className="mt-4 pt-4 border-t" style={{borderColor:S.border}}>
                      <div className="text-[10px] uppercase tracking-wider mb-2" style={{color:S.muted}}>Recent events</div>
                      <div className="space-y-1.5 max-h-56 overflow-y-auto">
                        {s.recent.slice(0, 8).map((e, i) => {
                          const t = new Date(e.event_time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
                          const icon = { entry: '🚶', exit: '🚶‍♂️', truck_arrived: '🚛', truck_departed: '🚚', loading: '📦', unloading: '📦', unusual: '⚠️' }[e.event_type] || '•';
                          const desc = e.event_type === 'unusual' ? (e.details?.description || 'unusual event')
                                     : e.event_type.startsWith('truck') ? `${e.event_type.replace('_', ' ')}${e.details?.vehicle_desc ? ` — ${e.details.vehicle_desc}` : ''}`
                                     : e.event_type === 'loading' || e.event_type === 'unloading' ? `${e.event_type}${e.details?.goods_desc ? ` — ${e.details.goods_desc}` : ''}`
                                     : `${e.event_type} (${e.details?.count || 1}${e.details?.who ? ` ${e.details.who}` : ''})`;
                          return (
                            <div key={i} className="flex items-start gap-2 text-xs">
                              <span className="font-mono text-[10px]" style={{color:S.muted, minWidth:'44px'}}>{t}</span>
                              <span>{icon}</span>
                              <span className="text-white">{desc}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

          {/* Live headcount — refreshes every 60 sec, reads freshest activity_timeline */}
          {(liveHead?.locations || []).length > 0 && (
            <div className="rounded-2xl p-5 border" style={{background:S.card,borderColor:S.border}}>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h2 className="text-sm font-bold text-white">People Present · Live</h2>
                  <p className="text-[11px]" style={{color:S.muted}}>Updated every 60 sec · reads the last 5 min of camera analysis</p>
                </div>
                <span className="text-[10px] flex items-center gap-1.5" style={{color:'#22c55e'}}>
                  <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{background:'#22c55e'}}/>Live
                </span>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {liveHead.locations
                  .filter((l) => !selectedLocation || l.location_id === selectedLocation)
                  .map((l) => {
                    const cams = Array.isArray(l.cameras) && l.cameras.length > 0
                      ? `from CAM ${l.cameras.join(', ')}`
                      : 'all cameras';
                    const count = l.paused ? '⏸' : (l.present ?? 0);
                    const color = l.paused ? '#94a3b8' : (l.present > 0 ? '#22c55e' : '#64748b');
                    return (
                      <div key={l.location_id} className="rounded-xl p-4 border" style={{background:'rgba(13,22,49,0.6)',borderColor:S.border}}>
                        <div className="text-xs font-bold text-white truncate">{l.name}</div>
                        <div className="text-4xl font-extrabold mt-1" style={{color, textShadow:`0 0 20px ${color}60`}}>{count}</div>
                        <div className="text-[10px] mt-1" style={{color:S.muted}}>
                          {l.paused ? 'paused' : `people · ${cams}`}
                        </div>
                        {!l.paused && l.worker_names?.length > 0 && (
                          <div className="text-[10px] mt-2 flex flex-wrap gap-1">
                            {l.worker_names.slice(0, 4).map((n) => (
                              <span key={n} className="px-1.5 py-0.5 rounded" style={{background:'rgba(34,197,94,0.15)',color:'#4ade80'}}>{n}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* Headcount snapshot — refreshes every 30 min via cron */}
          {(data?.presence_snapshots || []).length > 0 && (
            <div className="rounded-2xl p-5 border" style={{background:S.card,borderColor:S.border}}>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-sm font-bold text-white">Headcount</h2>
                  <p className="text-[11px]" style={{color:S.muted}}>
                    Snapshot taken {(() => {
                      const ts = data.presence_snapshots[0]?.captured_at;
                      if (!ts) return '';
                      const mins = Math.round((Date.now() - new Date(ts).getTime()) / 60000);
                      return mins < 1 ? 'just now' : `${mins} min ago`;
                    })()} · refreshes every 30 min
                  </p>
                </div>
              </div>
              <div className="space-y-3">
                {data.presence_snapshots.map((snap) => {
                  const locName = (data.locations || []).find((l) => l.id === snap.location_id)?.name || 'All locations';
                  const presentNames = Array.isArray(snap.workers_present_names) ? snap.workers_present_names : [];
                  const leftNames    = Array.isArray(snap.workers_left_names) ? snap.workers_left_names : [];
                  return (
                    <div key={snap.location_id || 'none'} className="rounded-xl p-4 border" style={{background:'rgba(13,22,49,0.6)',borderColor:S.border}}>
                      <div className="text-xs font-bold text-white mb-3">{locName}</div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div>
                          <div className="text-[10px] uppercase tracking-wider" style={{color:S.muted}}>Present now</div>
                          <div className="text-2xl font-extrabold" style={{color:'#22c55e'}}>{snap.workers_present || 0}</div>
                          <div className="text-[10px] mt-0.5" style={{color:'#64748b'}}>workers · last 5 min</div>
                        </div>
                        <div>
                          <div className="text-[10px] uppercase tracking-wider" style={{color:S.muted}}>Left</div>
                          <div className="text-2xl font-extrabold" style={{color:'#f59e0b'}}>{snap.workers_left || 0}</div>
                          <div className="text-[10px] mt-0.5" style={{color:'#64748b'}}>seen today, gone now</div>
                        </div>
                        <div>
                          <div className="text-[10px] uppercase tracking-wider" style={{color:S.muted}}>Seen today</div>
                          <div className="text-2xl font-extrabold" style={{color:'#60a5fa'}}>{snap.workers_seen_today || 0}</div>
                          <div className="text-[10px] mt-0.5" style={{color:'#64748b'}}>unique workers</div>
                        </div>
                        <div>
                          <div className="text-[10px] uppercase tracking-wider" style={{color:S.muted}}>Visitors</div>
                          <div className="text-2xl font-extrabold" style={{color:'#a78bfa'}}>{snap.visitors_visible || 0}</div>
                          <div className="text-[10px] mt-0.5" style={{color:'#64748b'}}>on camera now</div>
                        </div>
                      </div>
                      {(presentNames.length > 0 || leftNames.length > 0) && (
                        <div className="mt-3 pt-3 border-t flex flex-wrap gap-x-4 gap-y-1 text-[11px]" style={{borderColor:S.border}}>
                          {presentNames.length > 0 && (
                            <div className="flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full" style={{background:'#22c55e'}} />
                              <span style={{color:'#cbd5e1'}}><span className="font-semibold text-white">{presentNames.join(', ')}</span></span>
                            </div>
                          )}
                          {leftNames.length > 0 && (
                            <div className="flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full" style={{background:'#f59e0b'}} />
                              <span style={{color:'#94a3b8'}}>{leftNames.join(', ')} ·  not on camera now</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* KPI cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label:'Total Employees', value: client?.total_workers??0,       sub:`${today?.present_count??0} present today`,   color:'#60a5fa' },
              { label:'Hours Logged',    value:`${hoursLogged}h`,               sub:'Today\'s shift activity', color:'#22d3ee' },
              { label:'Open Alerts',     value: alertCount,          sub:`${detections} detections today`,    color: alertCount?'#f87171':'#22c55e' },
              { label:'Scan Interval',   value:'5 min',                           sub:`${frames.toLocaleString()} frames`, color:'#a78bfa' },
            ].map(k=>(
              <div key={k.label} className="rounded-2xl p-4 border" style={{background:S.card,borderColor:S.border}}>
                <div className="text-[11px] font-medium uppercase tracking-wider mb-2" style={{color:S.muted}}>{k.label}</div>
                <div className="text-3xl font-extrabold mb-1" style={{color:k.color,textShadow:`0 0 20px ${k.color}60`}}>{k.value}</div>
                <svg viewBox="0 0 80 20" className="w-full mb-1" style={{height:'18px'}}>
                  {(() => {
                    // Real sparkline from last 7 days of week_chart data
                    const vals = (week_chart || []).map(d => d.total_events || d.present_count || 0);
                    if (vals.length < 2) return <polyline points="0,10 80,10" fill="none" stroke={k.color} strokeWidth="1" opacity="0.3"/>;
                    const mx = Math.max(1, ...vals);
                    const pts = vals.map((v,i) => `${(i/(vals.length-1))*80},${18 - (v/mx)*14}`).join(' ');
                    return <polyline points={pts} fill="none" stroke={k.color} strokeWidth="1.5" strokeLinecap="round" style={{filter:`drop-shadow(0 0 3px ${k.color})`}}/>;
                  })()}
                </svg>
                <div className="text-[10px]" style={{color:S.muted}}>{k.sub}</div>
              </div>
            ))}
          </div>

          {/* ── Charts row: Pie + Daily Bar + Weekly Bar ── */}
          <div className="grid lg:grid-cols-3 gap-4">
            {/* Pie chart — staff status breakdown */}
            <div className="rounded-2xl p-5 border" style={{background:S.card,borderColor:S.border}}>
              <h2 className="text-sm font-bold text-white mb-1">Staff Status</h2>
              <p className="text-[11px] mb-4" style={{color:S.muted}}>Right now</p>
              {(() => {
                const present = today?.present_count || 0;
                const absent = (client?.total_workers || 0) - present;
                const onBreak = Math.min(present, Math.floor((recent_events || []).filter(e => e.activity === 'on_break').length));
                const working = Math.max(0, present - onBreak);
                const total = Math.max(1, (client?.total_workers || 1));
                const segments = [
                  { label: 'Working', value: working, color: '#22c55e' },
                  { label: 'On break', value: onBreak, color: '#f59e0b' },
                  { label: 'Absent', value: Math.max(0, absent), color: '#ef4444' },
                ].filter(s => s.value > 0);
                let cumAngle = 0;
                const paths = segments.map(s => {
                  const pct = s.value / total;
                  const startAngle = cumAngle;
                  cumAngle += pct * 360;
                  const endAngle = cumAngle;
                  const large = pct > 0.5 ? 1 : 0;
                  const sr = Math.PI / 180;
                  const x1 = 50 + 40 * Math.cos((startAngle - 90) * sr);
                  const y1 = 50 + 40 * Math.sin((startAngle - 90) * sr);
                  const x2 = 50 + 40 * Math.cos((endAngle - 90) * sr);
                  const y2 = 50 + 40 * Math.sin((endAngle - 90) * sr);
                  if (pct >= 0.999) return { ...s, d: `M 50 10 A 40 40 0 1 1 49.99 10 Z` };
                  return { ...s, d: `M 50 50 L ${x1} ${y1} A 40 40 0 ${large} 1 ${x2} ${y2} Z` };
                });
                return (
                  <div className="flex items-center gap-4">
                    <svg viewBox="0 0 100 100" className="w-28 h-28 shrink-0">
                      {paths.map((p, i) => <path key={i} d={p.d} fill={p.color} opacity={0.85} />)}
                      <circle cx="50" cy="50" r="22" fill="#0d1631" />
                      <text x="50" y="48" textAnchor="middle" fill="white" fontSize="14" fontWeight="bold">{present}</text>
                      <text x="50" y="60" textAnchor="middle" fill="#64748b" fontSize="7">present</text>
                    </svg>
                    <div className="space-y-2">
                      {segments.map(s => (
                        <div key={s.label} className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: s.color }} />
                          <span className="text-xs text-gray-400">{s.label}</span>
                          <span className="text-xs font-bold text-white ml-auto">{s.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Daily bar chart — hourly activity today */}
            <div className="rounded-2xl p-5 border" style={{background:S.card,borderColor:S.border}}>
              <h2 className="text-sm font-bold text-white mb-1">Today&apos;s Activity</h2>
              <p className="text-[11px] mb-4" style={{color:S.muted}}>Detections per hour</p>
              {(() => {
                const hours = Array(24).fill(0);
                (recent_events || []).forEach(e => {
                  const h = new Date(e.occurred_at).getHours();
                  hours[h]++;
                });
                const maxH = Math.max(1, ...hours);
                const activeHours = hours.map((v, i) => ({ h: i, v })).filter(x => x.v > 0 || (x.h >= 6 && x.h <= 22));
                const display = activeHours.length > 0 ? activeHours : Array.from({ length: 17 }, (_, i) => ({ h: i + 6, v: 0 }));
                return (
                  <div className="flex items-end gap-0.5" style={{ height: '120px' }}>
                    {display.map(({ h, v }) => (
                      <div key={h} className="flex-1 flex flex-col items-center justify-end h-full">
                        <div className="w-full rounded-t transition-all duration-500" style={{
                          height: `${Math.max(2, (v / maxH) * 100)}%`,
                          background: v > 0 ? 'linear-gradient(to top, #3b82f6, #60a5fa)' : '#1e2d4a',
                          boxShadow: v > 0 ? '0 0 8px #3b82f640' : 'none',
                          minHeight: '2px',
                        }} />
                        <span className="text-[7px] mt-1 font-mono" style={{ color: '#475569' }}>{h % 12 || 12}{h < 12 ? 'a' : 'p'}</span>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>

            {/* 7-day bar chart — daily detections this week */}
            <div className="rounded-2xl p-5 border" style={{background:S.card,borderColor:S.border}}>
              <h2 className="text-sm font-bold text-white mb-1">This Week</h2>
              <p className="text-[11px] mb-4" style={{color:S.muted}}>Daily activity · 7 days</p>
              {(() => {
                const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
                const weekData = (week_chart || []).map(d => ({
                  day: days[new Date(d.summary_date + 'T00:00:00').getDay()],
                  events: d.total_events || 0,
                  present: d.present_count || 0,
                }));
                // Pad to 7 days if less
                while (weekData.length < 7) weekData.unshift({ day: '—', events: 0, present: 0 });
                const maxE = Math.max(1, ...weekData.map(d => d.events));
                return (
                  <div className="flex items-end gap-1.5" style={{ height: '120px' }}>
                    {weekData.map((d, i) => (
                      <div key={i} className="flex-1 flex flex-col items-center justify-end h-full">
                        <div className="w-full rounded-t transition-all duration-500" style={{
                          height: `${Math.max(2, (d.events / maxE) * 100)}%`,
                          background: d.events > 0 ? 'linear-gradient(to top, #8b5cf6, #a78bfa)' : '#1e2d4a',
                          boxShadow: d.events > 0 ? '0 0 8px #8b5cf640' : 'none',
                          minHeight: '2px',
                        }} />
                        <span className="text-[8px] mt-1 font-mono" style={{ color: '#475569' }}>{d.day}</span>
                        {d.events > 0 && <span className="text-[7px] font-bold" style={{ color: '#a78bfa' }}>{d.events}</span>}
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          </div>

          {/* Weekly chart + Timeline */}
          <div className="grid lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 rounded-2xl p-5 border" style={{background:S.card,borderColor:S.border}}>
              <h2 className="text-sm font-bold text-white mb-0.5">Weekly Activity</h2>
              <p className="text-[11px] mb-4" style={{color:S.muted}}>Employee active hours — 7 day trend</p>
              <div className="flex gap-2">
                <div className="flex flex-col justify-between text-right pb-4" style={{color:'#334155',fontSize:'9px',fontFamily:'monospace',minWidth:'12px'}}>
                  {[20,15,10,5,0].map(n=><span key={n}>{n}</span>)}
                </div>
                <div className="flex-1"><WeeklyChart weekData={week_chart}/></div>
              </div>
            </div>

            {/* AI Timeline Narratives (v2) */}
            <div className="rounded-2xl border overflow-hidden" style={{background:S.card,borderColor:S.border}}>
              <div className="px-4 py-3 border-b flex items-center justify-between" style={{borderColor:S.border}}>
                <div>
                  <h2 className="text-sm font-bold text-white">AI Analysis Feed</h2>
                  <p className="text-[11px] mt-0.5" style={{color:S.muted}}>What happened — every 5 minutes</p>
                </div>
                {data?.today_cost_usd > 0 && (
                  <span className="text-[9px] font-mono px-2 py-1 rounded" style={{background:'rgba(34,211,238,0.1)',color:'#22d3ee'}}>
                    ${data.today_cost_usd.toFixed(3)} today
                  </span>
                )}
              </div>
              <div className="divide-y overflow-y-auto" style={{borderColor:S.border,maxHeight:'280px'}}>
                {(data?.timelines||[]).length > 0 ? (data.timelines.map((tl,i)=>{
                  const t = new Date(tl.window_start);
                  const timeStr = t.toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'});
                  return (
                    <div key={tl.id||i} className="px-4 py-3 cursor-pointer hover:bg-white/5 transition-colors" onClick={()=>openTimelineFrames(tl)}>
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded" style={{background:'rgba(34,211,238,0.15)',color:'#22d3ee'}}>{timeStr}</span>
                        <span className="text-[9px] font-mono" style={{color:S.muted}}>{tl.workers_detected} people</span>
                        {tl.alerts_created>0&&<span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{background:'rgba(239,68,68,0.15)',color:'#ef4444'}}>{tl.alerts_created} alert{tl.alerts_created>1?'s':''}</span>}
                        {tl.away_minutes>0&&<span className="text-[9px] font-mono" style={{color:'#f59e0b'}}>{tl.away_minutes}m away</span>}
                        {tl.idle_minutes>0&&<span className="text-[9px] font-mono" style={{color:'#f97316'}}>{tl.idle_minutes}m idle</span>}
                        <span className="text-[8px] ml-auto" style={{color:'#475569'}}>click to view frames →</span>
                      </div>
                      <p className="text-[11px] leading-relaxed" style={{color:'#cbd5e1'}}>{tl.summary || 'Analysis completed'}</p>
                    </div>
                  );
                })) : (
                  <div className="px-4 py-8 text-center text-xs" style={{color:S.muted}}>
                    {recent_events?.length > 0 ? 'Legacy events only — v2 timeline will appear after the next 5-min analysis cycle' : 'No activity yet today'}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Heatmap + Alerts */}
          <div className="grid lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 rounded-2xl p-5 border" style={{background:S.card,borderColor:S.border}}>
              <h2 className="text-sm font-bold text-white mb-1">Employee Performance Heatmap</h2>
              <p className="text-[11px] mb-4" style={{color:S.muted}}>Daily activity over the past 4 weeks</p>
              <Heatmap workers={workers} recentEvents={recent_events} weekData={week_chart}/>
            </div>

            <div className="rounded-2xl border overflow-hidden" style={{background:S.card,borderColor:S.border}}>
              <div className="px-4 py-3 border-b flex items-center justify-between" style={{borderColor:S.border}}>
                <h2 className="text-sm font-bold text-white">Alerts & Notifications</h2>
                {open_alerts?.length>0&&<span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{background:'rgba(239,68,68,0.15)',color:'#ef4444'}}>{open_alerts.length} open</span>}
              </div>
              <div className="divide-y overflow-y-auto" style={{borderColor:S.border,maxHeight:'220px'}}>
                {(open_alerts||[]).map((a,i)=>(
                  <div key={a.id||i} className="px-4 py-3 flex items-start gap-3">
                    <span className="w-2 h-2 rounded-full mt-1.5 shrink-0" style={{background:'#ef4444',boxShadow:'0 0 6px #ef4444'}}/>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold text-white truncate">{a.alert_type?.replace('_',' ')}</div>
                      <div className="text-[10px] mt-0.5 truncate" style={{color:S.muted}}>{a.message}</div>
                    </div>
                    <button onClick={()=>resolveAlert(a.id)} className="text-[10px] shrink-0 hover:text-green-400 transition-colors" style={{color:S.muted}}>Resolve</button>
                  </div>
                ))}
                {!open_alerts?.length&&(
                  <div className="px-4 py-6 text-center text-xs" style={{color:S.muted}}>No open alerts</div>
                )}
              </div>
            </div>
          </div>

          {/* Plan usage */}
          {plan_limit&&(
            <div className="rounded-2xl p-5 border" style={{background:S.card,borderColor:S.border}}>
              <h2 className="text-sm font-bold text-white mb-4">Plan Usage</h2>
              <div className="grid sm:grid-cols-2 gap-5">
                {[
                  {label:'Workers',label2:`${client?.total_workers||0} / ${plan_limit.max_workers}`,pct:Math.min(100,((client?.total_workers||0)/plan_limit.max_workers)*100),color:'#3b82f6'},
                  {label:'Business Areas',label2:`${zones?.length||0} / ${plan_limit.max_cameras}`,pct:Math.min(100,((zones?.length||0)/plan_limit.max_cameras)*100),color:'#8b5cf6'},
                ].map(b=>(
                  <div key={b.label}>
                    <div className="flex justify-between text-xs mb-2">
                      <span style={{color:S.muted}}>{b.label}</span>
                      <span className="text-white font-semibold">{b.label2}</span>
                    </div>
                    <div className="h-2 rounded-full overflow-hidden" style={{background:'#1e2d4a'}}>
                      <div className="h-2 rounded-full transition-all duration-700" style={{width:`${b.pct}%`,background:b.color,boxShadow:`0 0 8px ${b.color}60`}}/>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════ CAMERAS TAB ══════════════════ */}
      {activeTab==='cameras'&&(
        <div className="grid lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 rounded-2xl p-4 border" style={{background:S.card,borderColor:S.border}}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-bold text-white">Live Operations</span>
              <span className="text-xs flex items-center gap-1.5" style={{color:'#22d3ee'}}>
                <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{background:'#22d3ee'}}/>Processing
              </span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-1.5">
              {videoUrls.map((url,i)=>(
                <AICamFeed key={i} camIndex={i} videoUrl={null} snapshotUrl={url} alertCam={alertCams.includes(i)} stats={cameraStats[i+1]}/>
              ))}
            </div>
            <div className="mt-2 text-[10px] font-mono" style={{color:'#334155'}}>
              REFRESH: 5MIN · MODEL: STAFFLENZ v2.1 · EDGE NODE: ONLINE
            </div>
          </div>

          {/* AI Narrative Feed (v2 — replaces generic live log) */}
          <div className="rounded-2xl p-4 border flex flex-col" style={{background:S.card,borderColor:S.border}}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-bold text-white">AI Analysis Feed</span>
              <span className="text-xs flex items-center gap-1" style={{color:'#22c55e'}}>
                <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{background:'#22c55e'}}/>Every 5 min
              </span>
            </div>
            <div className="flex-1 overflow-y-auto space-y-2" style={{maxHeight:'420px'}}>
              {(data?.timelines||[]).length > 0 ? data.timelines.map((tl,i)=>{
                const t = new Date(tl.window_start);
                const timeStr = t.toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'});
                return (
                  <div key={tl.id||i} className="py-2 px-3 rounded-lg" style={{background:i===0?'rgba(34,211,238,0.06)':'transparent',border:i===0?'1px solid rgba(34,211,238,0.12)':'1px solid transparent'}}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded" style={{background:'rgba(34,211,238,0.15)',color:'#22d3ee'}}>{timeStr}</span>
                      <span className="text-[9px]" style={{color:S.muted}}>{tl.workers_detected} detections</span>
                      {tl.alerts_created>0&&<span className="text-[8px] font-bold px-1 py-0.5 rounded-full" style={{background:'rgba(239,68,68,0.15)',color:'#ef4444'}}>{tl.alerts_created} alert</span>}
                    </div>
                    <p className="text-[10px] leading-relaxed" style={{color:'#94a3b8'}}>{tl.summary || 'Analysis completed'}</p>
                  </div>
                );
              }) : liveLog.map((ev,i)=>(
                <div key={ev.id} className="flex items-start gap-2 py-1.5 px-2 rounded-lg text-[11px]" style={{background:i===0?'rgba(59,130,246,0.08)':'transparent',border:i===0?'1px solid rgba(59,130,246,0.15)':'1px solid transparent'}}>
                  <span className="mt-0.5 w-1.5 h-1.5 rounded-full shrink-0 mt-1" style={{background:ev.color}}/>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-semibold truncate" style={{color:ev.color}}>{ev.label}</span>
                      <span className="text-[10px] shrink-0" style={{color:S.muted}}>{ev.time}</span>
                    </div>
                    <div className="truncate" style={{color:'#64748b'}}>{ev.name} · {ev.zone} · {ev.conf}%</div>
                  </div>
                </div>
              ))}
              {!data?.timelines?.length && !liveLog.length&&(
                <div className="text-center py-8 text-xs" style={{color:S.muted}}>No events yet today</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════ ALERTS TAB ══════════════════ */}
      {activeTab==='alerts'&&(() => {
        const selectedZoneObj = zones?.find(z => z.id === selectedZone);
        const zoneName = selectedZoneObj?.name;
        const filteredAlerts = selectedZone
          ? (open_alerts||[]).filter(a => a.zone_name === zoneName)
          : (open_alerts||[]);
        return (
        <div className="space-y-4">
          {/* Camera/zone picker */}
          {zones?.length>0 && (
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              <button onClick={()=>setSelectedZone(null)}
                className="shrink-0 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all"
                style={!selectedZone
                  ? { background:'rgba(59,130,246,0.2)', color:'#60a5fa', border:'1px solid rgba(59,130,246,0.3)' }
                  : { color:'#64748b', border:'1px solid #1e2d4a' }}>
                All cameras
              </button>
              {zones.map(z => {
                const zAlertCount = (open_alerts||[]).filter(a => a.zone_name === z.name).length;
                return (
                  <button key={z.id} onClick={()=>setSelectedZone(z.id)}
                    className="shrink-0 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-2"
                    style={selectedZone === z.id
                      ? { background:'rgba(59,130,246,0.2)', color:'#60a5fa', border:'1px solid rgba(59,130,246,0.3)' }
                      : { color:'#64748b', border:'1px solid #1e2d4a' }}>
                    <span>{z.name}</span>
                    {zAlertCount>0 && <span className="w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold" style={{background:'#ef4444',color:'white'}}>{zAlertCount}</span>}
                  </button>
                );
              })}
            </div>
          )}

        <div className="grid lg:grid-cols-2 gap-4">
          <div className="rounded-2xl p-5 border" style={{background:S.card,borderColor:S.border}}>
            <div className="flex items-center gap-2 mb-4">
              <h2 className="text-sm font-bold text-white">{selectedZone ? `Incidents · ${zoneName}` : 'Active Incidents'}</h2>
              {filteredAlerts.length>0&&<span className="text-xs font-bold px-2 py-0.5 rounded-full animate-pulse" style={{background:'rgba(239,68,68,0.15)',color:'#ef4444'}}>{filteredAlerts.length}</span>}
            </div>
            {!filteredAlerts.length ? (
              <div className="text-center py-12">
                <div className="text-4xl mb-3">✅</div>
                <div className="text-sm" style={{color:S.muted}}>{selectedZone ? 'No alerts for this camera' : 'No active alerts'}</div>
              </div>
            ):(
              <div className="space-y-3">
                {filteredAlerts.map(alert=>{
                  const impacts = Array.isArray(alert.business_impact) ? alert.business_impact : [];
                  const sevColor = alert.severity === 'high' ? '#ef4444' : alert.severity === 'medium' ? '#f59e0b' : '#94a3b8';
                  return (
                  <div key={alert.id} className="rounded-xl p-3 border" style={{background:`${sevColor}0d`,borderColor:`${sevColor}33`}}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="text-xs font-bold uppercase tracking-wider" style={{color:sevColor}}>{alert.alert_type?.replace('_',' ')}</div>
                          {alert.duration_minutes > 0 && (
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded" style={{background:'rgba(13,22,49,0.6)',color:'#cbd5e1'}}>{alert.duration_minutes} min</span>
                          )}
                          {alert.zone_name && (
                            <span className="text-[10px] font-mono" style={{color:'#64748b'}}>· {alert.zone_name}</span>
                          )}
                        </div>
                        <p className="text-sm text-white">{alert.message}</p>
                        {impacts.length > 0 && (
                          <div className="mt-2 pt-2 border-t" style={{borderColor:'rgba(148,163,184,0.15)'}}>
                            <div className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{color:'#64748b'}}>Potential Impact</div>
                            <ul className="space-y-0.5">
                              {impacts.map((imp, i) => (
                                <li key={i} className="text-[11px] flex items-start gap-1.5" style={{color:'#94a3b8'}}>
                                  <span style={{color:sevColor}}>→</span>
                                  <span>{imp}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        <p className="text-[10px] mt-2 font-mono" style={{color:S.muted}}>{new Date(alert.created_at).toLocaleTimeString('en',{hour:'2-digit',minute:'2-digit'})}</p>
                      </div>
                      <button onClick={()=>resolveAlert(alert.id)} className="text-xs px-3 py-1 rounded-lg font-medium transition-all shrink-0" style={{background:'rgba(34,197,94,0.12)',color:'#22c55e',border:'1px solid rgba(34,197,94,0.2)'}}>Resolve</button>
                    </div>
                  </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="rounded-2xl p-5 border" style={{background:S.card,borderColor:S.border}}>
            <h2 className="text-sm font-bold text-white mb-1">WhatsApp Alerts</h2>
            <p className="text-xs mb-4" style={{color:S.muted}}>High-severity incidents are sent instantly to this number — rate-limited to 1 per 10 min so you&apos;re not spammed.</p>
            <div className="flex gap-2 mb-3">
              <input type="tel" placeholder="+91XXXXXXXXXX (default for all locations)" value={waNumber} onChange={e=>setWaNumber(e.target.value)}
                className="flex-1 rounded-xl px-3 py-2 text-sm font-mono focus:outline-none"
                style={{background:'rgba(30,45,74,0.8)',border:'1px solid #1e2d4a',color:'#e2e8f0'}}/>
              <button onClick={saveWhatsApp} disabled={waSaving} className="px-4 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-50 transition-all" style={{background:S.blue}}>
                {waSaving?'Saving...':'Save'}
              </button>
            </div>
            {waStatus==='saved'&&<p className="text-xs" style={{color:'#22c55e'}}>Saved. Alerts will be sent to this number.</p>}
            {waStatus==='error'&&<p className="text-xs" style={{color:'#ef4444'}}>Failed to save. Please try again.</p>}

            {/* Per-location override */}
            {data?.has_locations && data?.locations?.length > 0 && (
              <div className="mt-5 pt-4 border-t" style={{ borderColor: S.border }}>
                <h3 className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: S.muted }}>Per-location override</h3>
                <p className="text-[11px] mb-3" style={{ color: S.muted }}>Optional — give each location its own number (different manager per site). Empty = uses the default above.</p>
                <div className="space-y-2">
                  {data.locations.map((loc) => (
                    <LocationWhatsAppRow key={loc.id} location={loc} onSaved={fetchData} />
                  ))}
                </div>
              </div>
            )}

            {/* Sandbox opt-in note */}
            <div className="mt-5 p-3 rounded-lg flex items-start gap-2" style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)' }}>
              <span className="text-sm">📱</span>
              <div className="text-[11px] leading-relaxed" style={{ color: '#fbbf24' }}>
                <div className="font-semibold mb-0.5">First-time setup (Twilio sandbox)</div>
                <div style={{ color: '#cbd5e1' }}>
                  Each new phone must <b>opt in once</b>: send <code className="px-1.5 py-0.5 rounded font-mono" style={{ background: 'rgba(0,0,0,0.4)', color: '#fbbf24' }}>join &lt;your-code&gt;</code> from WhatsApp to{' '}
                  <code className="font-mono" style={{ color: '#fbbf24' }}>+1 415 523 8886</code>.
                  Find your join code at{' '}
                  <a href="https://console.twilio.com/us1/develop/messaging/try-it-out/whatsapp-learn" target="_blank" rel="noopener noreferrer" className="underline" style={{ color: '#fbbf24' }}>Twilio Console</a>.
                </div>
              </div>
            </div>

            {zones?.length>0&&(
              <div className="mt-6">
                <h3 className="text-xs font-bold uppercase tracking-wider mb-3" style={{color:S.muted}}>Business Areas</h3>
                <div className="grid grid-cols-2 gap-2">
                  {zones.map(zone=>(
                    <div key={zone.id} className="rounded-xl p-2.5 flex items-center gap-2 border" style={{background:'rgba(30,45,74,0.5)',borderColor:S.border}}>
                      <span className="w-2 h-2 rounded-full shrink-0" style={{background:'#22c55e',boxShadow:'0 0 6px #22c55e'}}/>
                      <div className="min-w-0">
                        <div className="text-xs font-medium text-white truncate">{zone.name}</div>
                        <div className="text-[10px] truncate" style={{color:S.muted}}>{zone.location_label||zone.zone_type}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
        </div>
        );
      })()}

      {/* ══════════════════ ANALYTICS TAB ══════════════════ */}
      {activeTab==='analytics'&&(() => {
        const selectedZoneObj = zones?.find(z => z.id === selectedZone);
        const zoneName = selectedZoneObj?.name;
        const filteredEvents = selectedZone
          ? (recent_events||[]).filter(e => e.zone_id === selectedZone)
          : (recent_events||[]);
        const zoneEventCount = (zid) => (recent_events||[]).filter(e => e.zone_id === zid).length;
        const scores = computeWorkforceScores(data?.timelines || []);
        return (
        <div className="space-y-4">
          {/* Camera/zone picker */}
          {zones?.length>0 && (
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              <button onClick={()=>setSelectedZone(null)}
                className="shrink-0 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all"
                style={!selectedZone
                  ? { background:'rgba(59,130,246,0.2)', color:'#60a5fa', border:'1px solid rgba(59,130,246,0.3)' }
                  : { color:'#64748b', border:'1px solid #1e2d4a' }}>
                All cameras
              </button>
              {zones.map(z => {
                const c = zoneEventCount(z.id);
                return (
                  <button key={z.id} onClick={()=>setSelectedZone(z.id)}
                    className="shrink-0 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-2"
                    style={selectedZone === z.id
                      ? { background:'rgba(59,130,246,0.2)', color:'#60a5fa', border:'1px solid rgba(59,130,246,0.3)' }
                      : { color:'#64748b', border:'1px solid #1e2d4a' }}>
                    <span>{z.name}</span>
                    {c>0 && <span className="text-[9px] font-mono px-1.5 py-0.5 rounded" style={{background:'rgba(34,211,238,0.15)',color:'#22d3ee'}}>{c}</span>}
                  </button>
                );
              })}
            </div>
          )}

          {/* ── Generate Weekly Report button ───────────────────────── */}
          <div className="flex items-center justify-between mb-1">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#22d3ee' }}>Workforce Insights</div>
              <div className="text-base text-white mt-0.5">Last 24 hours · Coverage, compliance & engagement</div>
            </div>
            <a
              href={`/report/weekly${selectedLocation ? `?location=${selectedLocation}` : ''}`}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 px-4 py-2 text-xs font-semibold rounded-lg transition-all flex items-center gap-2"
              style={{ background: 'rgba(34,211,238,0.15)', color: '#22d3ee', border: '1px solid rgba(34,211,238,0.3)' }}
            >
              📄 Generate Weekly Report
            </a>
          </div>

          {/* ── Executive score tiles ─────────────────────────────────── */}
          {(() => {
            const fmt = (n) => (n === null || n === undefined) ? '—' : `${n}%`;
            const riskColor = scores.riskLevel === 'High' ? '#ef4444' : scores.riskLevel === 'Medium' ? '#f59e0b' : '#22c55e';
            const tiles = [
              { label: 'Coverage Score',  value: fmt(scores.coverageScore),   hint: 'Named staff in observations', color: '#22c55e' },
              { label: 'Compliance Score',value: fmt(scores.complianceScore), hint: `${scores.highAlerts} high · ${scores.totalAlerts} total alerts`, color: '#60a5fa' },
              { label: 'Staff Engagement',value: fmt(scores.engagementScore), hint: 'Active vs idle activity',     color: '#a78bfa' },
              { label: 'Risk Level',      value: scores.riskLevel,            hint: `${scores.highAlerts} high-severity in 24h`, color: riskColor },
            ];
            return (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {tiles.map(t => (
                  <div key={t.label} className="rounded-2xl p-4 border" style={{background:S.card,borderColor:S.border}}>
                    <div className="text-[11px] uppercase tracking-wider mb-2" style={{color:S.muted}}>{t.label}</div>
                    <div className="text-3xl font-extrabold" style={{color:t.color,textShadow:`0 0 20px ${t.color}60`}}>{t.value}</div>
                    <div className="text-[10px] mt-1" style={{color:'#64748b'}}>{t.hint}</div>
                  </div>
                ))}
              </div>
            );
          })()}

          {/* ── Coverage by Business Area ────────────────────────────── */}
          {scores.zoneScores.length > 0 && (
            <div className="rounded-2xl p-5 border" style={{background:S.card,borderColor:S.border}}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-bold text-white">Coverage by Business Area</h2>
                <span className="text-[11px]" style={{color:S.muted}}>% of observations where registered staff were identified · last 24h</span>
              </div>
              <div className="space-y-2.5">
                {scores.zoneScores.map((z) => {
                  const c = z.coverage;
                  const barColor = c >= 80 ? '#22c55e' : c >= 50 ? '#f59e0b' : '#ef4444';
                  return (
                    <div key={z.name} className="flex items-center gap-3">
                      <div className="w-44 shrink-0 text-sm text-white truncate">{z.name}</div>
                      <div className="flex-1 h-2 rounded-full overflow-hidden" style={{background:'rgba(30,45,74,0.6)'}}>
                        <div className="h-full rounded-full transition-all duration-500" style={{width:`${c}%`,background:`linear-gradient(90deg, ${barColor}aa, ${barColor})`}} />
                      </div>
                      <div className="w-16 text-right text-sm font-bold tabular-nums" style={{color:barColor}}>{c}%</div>
                      <div className="w-20 text-right text-[10px] font-mono" style={{color:'#64748b'}}>{z.observations} obs</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {week_chart?.length>0&&(
            <div className="rounded-2xl p-5 border" style={{background:S.card,borderColor:S.border}}>
              <h2 className="text-sm font-bold text-white mb-4">7-Day Summary</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b" style={{borderColor:S.border}}>
                      {['Date','Present','Absent','Late','Violations','Events'].map(h=>(
                        <th key={h} className="text-left py-2 pr-4 font-medium" style={{color:S.muted}}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {week_chart.map(row=>(
                      <tr key={row.summary_date} className="border-b" style={{borderColor:'rgba(30,45,74,0.5)'}}>
                        <td className="py-2.5 pr-4 font-mono" style={{color:'#94a3b8'}}>{new Date(row.summary_date).toLocaleDateString('en',{weekday:'short',month:'short',day:'numeric'})}</td>
                        <td className="py-2.5 pr-4 font-semibold" style={{color:'#22c55e'}}>{row.present_count}</td>
                        <td className="py-2.5 pr-4" style={{color:'#64748b'}}>{row.absent_count}</td>
                        <td className="py-2.5 pr-4" style={{color:'#facc15'}}>{row.late_count}</td>
                        <td className="py-2.5 pr-4" style={{color:'#f87171'}}>{row.violation_count}</td>
                        <td className="py-2.5 pr-4" style={{color:'#22d3ee'}}>{row.total_events}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="rounded-2xl p-5 border" style={{background:S.card,borderColor:S.border}}>
            <h2 className="text-sm font-bold text-white mb-4">{selectedZone ? `Recent Activity · ${zoneName}` : 'Recent Activity'}</h2>
            <div className="space-y-1 max-h-64 overflow-y-auto">
              {filteredEvents.map((e,i)=>(
                <div key={e.id||i} className="flex items-start gap-3 py-2 border-b" style={{borderColor:'rgba(30,45,74,0.5)'}}>
                  <span className="text-[10px] font-mono w-14 pt-0.5 shrink-0" style={{color:S.muted}}>{new Date(e.occurred_at).toLocaleTimeString('en',{hour:'2-digit',minute:'2-digit'})}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-white truncate">{e.worker_name||'Unknown'}</div>
                    <div className="text-[10px]" style={{color:S.muted}}>{e.activity||e.event_type?.replace('_',' ')}</div>
                  </div>
                  {e.confidence&&<span className="text-[10px] font-mono shrink-0" style={{color:'#22d3ee'}}>{Math.round(e.confidence)}%</span>}
                </div>
              ))}
              {!filteredEvents.length&&<div className="text-center py-6 text-xs" style={{color:S.muted}}>{selectedZone ? 'No activity for this camera yet' : 'No activity yet today'}</div>}
            </div>
          </div>
        </div>
        );
      })()}

      {/* ══════════════════ FRAME VIEWER MODAL ══════════════════ */}
      {frameModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm" onClick={()=>setFrameModal(null)}>
          <div className="bg-gray-900 rounded-2xl sm:rounded-3xl border border-gray-700 shadow-2xl max-w-5xl w-full mx-2 sm:mx-4 max-h-[95vh] sm:max-h-[90vh] overflow-y-auto" onClick={e=>e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
              <div>
                <h3 className="text-lg font-bold text-white">Event at {frameModal.title}</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  {frameModal.loading ? 'Loading frames...' : `${frameModal.frames?.length || 0} cameras captured · ${frameModal.total || 0} total frames in this window`}
                </p>
              </div>
              <button onClick={()=>setFrameModal(null)} className="w-8 h-8 rounded-full bg-gray-800 hover:bg-gray-700 flex items-center justify-center text-gray-400 hover:text-white transition">✕</button>
            </div>

            {/* AI Summary */}
            {frameModal.summary && (
              <div className="px-6 py-4 border-b border-gray-800">
                <div className="text-[10px] font-bold uppercase tracking-wider text-cyan-400 mb-1">AI Analysis</div>
                <p className="text-sm text-gray-300 leading-relaxed">{frameModal.summary}</p>
              </div>
            )}

            {/* Frames grid */}
            <div className="p-6">
              {frameModal.loading ? (
                <div className="text-center py-12">
                  <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin mx-auto mb-3" style={{borderColor:'#22d3ee',borderTopColor:'transparent'}}/>
                  <p className="text-sm text-gray-500">Loading camera frames...</p>
                </div>
              ) : frameModal.frames?.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-3">
                  {frameModal.frames.map((f, i) => (
                    <div key={i} className="relative rounded-lg sm:rounded-xl overflow-hidden bg-black border border-gray-800">
                      {f.url ? (
                        <img src={f.url} alt={`Camera ${f.camera_channel}`} className="w-full aspect-video object-cover" />
                      ) : (
                        <div className="w-full aspect-video flex items-center justify-center text-gray-600 text-xs">No frame</div>
                      )}
                      <div className="absolute top-2 left-2 flex gap-1.5">
                        <span className="text-[9px] font-mono bg-black/70 text-white px-1.5 py-0.5 rounded">CAM {f.camera_channel}</span>
                        {f.has_motion && <span className="text-[9px] font-mono bg-red-600/80 text-white px-1.5 py-0.5 rounded">motion</span>}
                      </div>
                      <div className="absolute bottom-2 left-2">
                        <span className="text-[8px] font-mono bg-black/70 text-gray-300 px-1.5 py-0.5 rounded">
                          {new Date(f.captured_at).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit',second:'2-digit'})}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500 text-sm">No frames found for this time window</div>
              )}
            </div>
          </div>
        </div>
      )}

    </DashboardLayout>
  );
}
