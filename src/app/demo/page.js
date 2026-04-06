'use client';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';

/* ── Mock Data ─────────────────────────────────────────────────────────────── */
const EMPLOYEES = [
  { id: 1, name: 'Ravi Kumar',    role: 'Supervisor',  zone: 'Zone A',   status: 'active',  score: 94, idle: 4  },
  { id: 2, name: 'Priya Sharma',  role: 'Operator',    zone: 'Zone B',   status: 'active',  score: 88, idle: 8  },
  { id: 3, name: 'James O.',      role: 'Technician',  zone: 'Zone C',   status: 'idle',    score: 52, idle: 32 },
  { id: 4, name: 'Maria Santos',  role: 'Operator',    zone: 'Gate 1',   status: 'active',  score: 91, idle: 6  },
  { id: 5, name: 'Chen Wei',      role: 'Engineer',    zone: 'Floor 2',  status: 'active',  score: 79, idle: 14 },
  { id: 6, name: 'Fatima Al-H.',  role: 'Manager',     zone: 'Lobby',    status: 'break',   score: 68, idle: 22 },
  { id: 7, name: 'Suresh P.',     role: 'Guard',       zone: 'Perimeter',status: 'active',  score: 96, idle: 2  },
  { id: 8, name: 'Anita Rao',     role: 'Operator',    zone: 'Zone A',   status: 'idle',    score: 45, idle: 41 },
];

const ALERTS = [
  { id: 1, type: 'violation', msg: 'PPE missing — Zone C',        time: '2m ago',  cam: 'CAM-03' },
  { id: 2, type: 'idle',      msg: 'Idle >30min — Anita Rao',     time: '5m ago',  cam: 'CAM-01' },
  { id: 3, type: 'zone',      msg: 'Restricted access — Gate 2',  time: '11m ago', cam: 'CAM-07' },
  { id: 4, type: 'info',      msg: 'Shift started — Zone B crew', time: '18m ago', cam: 'CAM-02' },
  { id: 5, type: 'violation', msg: 'No hard hat — Floor 2',       time: '24m ago', cam: 'CAM-05' },
];

const PRODUCTIVITY_HOURS = ['08:00','09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00'];
const PRODUCTIVITY_DATA  = [72, 81, 88, 91, 65, 70, 87, 93, 89, 84];

const CAM_BOXES = [
  [
    { x:'8%',  y:'12%', w:'22%', h:'52%', color:'#22c55e', label:'Ravi K.',  sub:'Supervisor · Zone A' },
    { x:'52%', y:'8%',  w:'20%', h:'48%', color:'#22c55e', label:'Maria S.', sub:'Operator · Active'   },
    { x:'38%', y:'45%', w:'18%', h:'40%', color:'#ef4444', label:'⚠ No PPE', sub:'Zone A · Violation'  },
  ],
  [
    { x:'10%', y:'15%', w:'20%', h:'50%', color:'#22c55e', label:'Priya S.', sub:'Operator · Zone B'   },
    { x:'46%', y:'5%',  w:'42%', h:'32%', color:'#facc15', label:'⚠ Idle',   sub:'James O. · 32 min'  },
  ],
  [
    { x:'12%', y:'20%', w:'20%', h:'48%', color:'#22c55e', label:'Suresh P.', sub:'Guard · Perimeter'  },
    { x:'50%', y:'10%', w:'18%', h:'45%', color:'#22c55e', label:'Chen Wei',  sub:'Engineer · Floor 2' },
    { x:'35%', y:'40%', w:'22%', h:'44%', color:'#ef4444', label:'⚠ Zone',    sub:'Restricted access'  },
  ],
];

/* ── Camera Feed ───────────────────────────────────────────────────────────── */
function CamFeed({ index, label, hasAlert }) {
  const [scan, setScan] = useState(0);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let pos = 0;
    let raf;
    function step() { pos = (pos + 0.8) % 110; setScan(pos); raf = requestAnimationFrame(step); }
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    const iv = setInterval(() => setTick(v => v + 1), 1800);
    return () => clearInterval(iv);
  }, []);

  const boxes = CAM_BOXES[index] || [];
  const now = new Date();
  const ts = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}:${String(now.getSeconds()).padStart(2,'0')}`;

  return (
    <div className="relative bg-gray-950 rounded-xl overflow-hidden" style={{ aspectRatio:'16/9', border: hasAlert ? '1.5px solid #ef4444' : '1px solid #1f2937' }}>
      {/* scanlines */}
      <div className="absolute inset-0 pointer-events-none" style={{background:'repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,0.1) 2px,rgba(0,0,0,0.1) 4px)'}} />
      {/* grid */}
      <div className="absolute inset-0 opacity-[0.04]" style={{backgroundImage:'linear-gradient(#3b82f6,transparent 1px),linear-gradient(90deg,#3b82f6,transparent 1px)',backgroundSize:'30px 30px'}} />
      {/* noise bg */}
      <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-950 to-black" />

      {/* scan line */}
      <div className="absolute left-0 right-0 h-px pointer-events-none" style={{ top:`${scan}%`, background:'rgba(59,130,246,0.35)', boxShadow:'0 0 10px rgba(59,130,246,0.5)', transition:'top 0.05s linear' }} />

      {/* timestamp */}
      <div className="absolute top-2 left-2 font-mono text-[10px] text-green-400 bg-black/60 px-1.5 py-0.5 rounded">{ts}</div>

      {/* REC */}
      <div className="absolute top-2 right-2 flex items-center gap-1 bg-black/60 px-1.5 py-0.5 rounded">
        {hasAlert
          ? <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
          : <span className="w-1.5 h-1.5 bg-red-500 rounded-full" style={{animation:'pulse 1s ease-in-out infinite'}} />
        }
        <span className="text-[10px] font-bold text-white font-mono">{hasAlert ? 'ALERT' : 'REC'}</span>
      </div>

      {/* Detection boxes */}
      {boxes.map((b, i) => (
        <div key={i} className="absolute transition-opacity duration-700" style={{ left:b.x, top:b.y, width:b.w, height:b.h, border:`1.5px solid ${b.color}`, boxShadow:`0 0 6px ${b.color}50`, opacity: tick % boxes.length === i ? 1 : 0.25 }}>
          <div className="absolute -top-5 left-0 text-[9px] font-bold px-1 py-0.5 rounded whitespace-nowrap" style={{background:b.color,color:'#000'}}>{b.label}</div>
          <div className="absolute -bottom-4 left-0 text-[9px] text-gray-300 bg-black/70 px-1 rounded whitespace-nowrap">{b.sub}</div>
          <div className="absolute top-0 left-0 w-2 h-2 border-t border-l" style={{borderColor:b.color}} />
          <div className="absolute top-0 right-0 w-2 h-2 border-t border-r" style={{borderColor:b.color}} />
          <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l" style={{borderColor:b.color}} />
          <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r" style={{borderColor:b.color}} />
        </div>
      ))}

      {/* confidence */}
      <div className="absolute bottom-7 right-2 font-mono text-[9px] text-green-400 bg-black/60 px-1.5 py-0.5 rounded text-right">
        <div>CONF: {91 + (tick % 7)}%</div>
        <div>OBJ: {boxes.length}</div>
      </div>

      {/* cam label */}
      <div className="absolute bottom-2 right-2 font-mono text-[9px] text-gray-500 bg-black/60 px-1.5 py-0.5 rounded">{label}</div>

      {/* LenzAI badge */}
      <div className="absolute bottom-2 left-2 text-[9px] font-bold text-blue-400 bg-blue-950/80 border border-blue-800/50 px-1.5 py-0.5 rounded">LenzAI</div>
    </div>
  );
}

/* ── Productivity Chart ────────────────────────────────────────────────────── */
function ProductivityChart() {
  const [animated, setAnimated] = useState(false);
  useEffect(() => { const t = setTimeout(() => setAnimated(true), 300); return () => clearTimeout(t); }, []);
  const max = Math.max(...PRODUCTIVITY_DATA);

  return (
    <div>
      <div className="flex items-end gap-1.5 h-24">
        {PRODUCTIVITY_DATA.map((v, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-1">
            <div className="w-full rounded-t-sm transition-all duration-700 ease-out relative group"
              style={{ height: animated ? `${(v/max)*100}%` : '4px', background: v >= 85 ? 'linear-gradient(to top,#2563eb,#7c3aed)' : v >= 70 ? 'linear-gradient(to top,#1d4ed8,#3b82f6)' : 'linear-gradient(to top,#374151,#4b5563)', minHeight:'4px', boxShadow: v >= 85 ? '0 0 8px rgba(99,102,241,0.5)' : 'none' }}>
              <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-[9px] text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">{v}%</div>
            </div>
          </div>
        ))}
      </div>
      <div className="flex gap-1.5 mt-1">
        {PRODUCTIVITY_HOURS.map((h,i) => (
          <div key={i} className="flex-1 text-center text-[8px] text-gray-600 font-mono">{h.replace(':00','')}</div>
        ))}
      </div>
    </div>
  );
}

/* ── Donut Chart ───────────────────────────────────────────────────────────── */
function DonutChart({ active, idle, onBreak }) {
  const total = active + idle + onBreak;
  const activePct = (active/total)*100;
  const idlePct   = (idle/total)*100;
  const r = 36, circ = 2 * Math.PI * r;
  const activeStroke = (activePct/100) * circ;
  const idleStroke   = (idlePct/100)   * circ;
  const activeOffset = 0;
  const idleOffset   = -activeStroke;

  return (
    <div className="flex items-center gap-6">
      <svg width="96" height="96" viewBox="0 0 96 96">
        <circle cx="48" cy="48" r={r} fill="none" stroke="#1f2937" strokeWidth="10" />
        <circle cx="48" cy="48" r={r} fill="none" stroke="#3b82f6" strokeWidth="10"
          strokeDasharray={`${activeStroke} ${circ}`} strokeDashoffset={activeOffset}
          strokeLinecap="round" transform="rotate(-90 48 48)" style={{filter:'drop-shadow(0 0 4px rgba(59,130,246,0.6))'}} />
        <circle cx="48" cy="48" r={r} fill="none" stroke="#6b7280" strokeWidth="10"
          strokeDasharray={`${idleStroke} ${circ}`} strokeDashoffset={idleOffset}
          strokeLinecap="round" transform="rotate(-90 48 48)" />
        <text x="48" y="44" textAnchor="middle" fill="white" fontSize="13" fontWeight="bold">{active}</text>
        <text x="48" y="56" textAnchor="middle" fill="#6b7280" fontSize="8">active</text>
      </svg>
      <div className="space-y-2 text-sm">
        <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow shadow-blue-500/50" /><span className="text-gray-300">Active <span className="text-white font-bold">{active}</span></span></div>
        <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-gray-500" /><span className="text-gray-300">Idle <span className="text-white font-bold">{idle}</span></span></div>
        <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-amber-500" /><span className="text-gray-300">Break <span className="text-white font-bold">{onBreak}</span></span></div>
      </div>
    </div>
  );
}

/* ── Main Demo Page ────────────────────────────────────────────────────────── */
export default function DemoPage() {
  const [activeNav, setActiveNav] = useState('dashboard');
  const [time, setTime] = useState(new Date());
  const [liveAlerts, setLiveAlerts] = useState(ALERTS);

  useEffect(() => {
    const iv = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(iv);
  }, []);

  // Simulate new alert occasionally
  useEffect(() => {
    const msgs = [
      { type:'info',      msg:'Check-in detected — Zone A',     cam:'CAM-01' },
      { type:'violation', msg:'PPE alert — hard hat missing',    cam:'CAM-04' },
      { type:'idle',      msg:'Idle >20min — Zone B worker',     cam:'CAM-02' },
    ];
    const iv = setInterval(() => {
      const m = msgs[Math.floor(Math.random()*msgs.length)];
      setLiveAlerts(prev => [{ id: Date.now(), ...m, time:'just now' }, ...prev.slice(0,6)]);
    }, 8000);
    return () => clearInterval(iv);
  }, []);

  const activeCount  = EMPLOYEES.filter(e => e.status === 'active').length;
  const idleCount    = EMPLOYEES.filter(e => e.status === 'idle').length;
  const breakCount   = EMPLOYEES.filter(e => e.status === 'break').length;
  const avgScore     = Math.round(EMPLOYEES.reduce((s,e) => s + e.score, 0) / EMPLOYEES.length);

  const navItems = [
    { id:'dashboard', icon:'▪', label:'Dashboard'    },
    { id:'cameras',   icon:'◉', label:'Live Cameras' },
    { id:'workers',   icon:'◈', label:'Workers'      },
    { id:'zones',     icon:'◧', label:'Zones'        },
    { id:'alerts',    icon:'◬', label:'Alerts'       },
    { id:'reports',   icon:'◫', label:'Reports'      },
  ];

  return (
    <div className="min-h-screen bg-[#05061A] text-white flex flex-col">

      {/* ── Top Nav ── */}
      <nav className="bg-[#05061A]/95 border-b border-white/10 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-full px-4 sm:px-6 flex items-center justify-between h-14">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-violet-600 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-blue-900/40">SL</div>
            <span className="font-extrabold text-white tracking-tight">StaffLenz</span>
            <span className="ml-2 text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30 tracking-wider">LIVE DEMO</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-500 font-mono hidden sm:block">{time.toLocaleTimeString()}</span>
            <Link href="#contact" className="text-sm font-semibold text-blue-400 hover:text-blue-300 transition-colors hidden sm:block">Request Access</Link>
            <Link href="/login" className="bg-white text-gray-900 font-bold text-sm px-4 py-1.5 rounded-xl hover:bg-gray-100 transition-all">Login →</Link>
          </div>
        </div>
      </nav>

      <div className="flex flex-1 overflow-hidden">

        {/* ── Sidebar ── */}
        <aside className="w-52 bg-[#080920] border-r border-white/5 flex flex-col shrink-0 hidden lg:flex">
          <div className="p-4 border-b border-white/5">
            <div className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-1">Workspace</div>
            <div className="text-sm font-semibold text-white">Acme Factory Ltd</div>
            <div className="flex items-center gap-1 mt-1">
              <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
              <span className="text-[11px] text-green-400">9 cameras live</span>
            </div>
          </div>

          <nav className="flex-1 p-3 space-y-0.5">
            {navItems.map(n => (
              <button key={n.id} onClick={() => setActiveNav(n.id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all text-left ${
                  activeNav === n.id
                    ? 'bg-blue-600/20 text-blue-400 border border-blue-500/20'
                    : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'
                }`}>
                <span className="text-xs">{n.icon}</span>
                {n.label}
                {n.id === 'alerts' && (
                  <span className="ml-auto text-[10px] bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center font-bold">3</span>
                )}
              </button>
            ))}
          </nav>

          <div className="p-4 border-t border-white/5">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-gradient-to-br from-blue-600 to-violet-600 rounded-full flex items-center justify-center text-[11px] font-bold">RK</div>
              <div>
                <div className="text-xs font-medium text-white">Ravi Kumar</div>
                <div className="text-[10px] text-gray-500">Admin</div>
              </div>
            </div>
          </div>
        </aside>

        {/* ── Main Content ── */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">

          {/* Page title */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-extrabold text-white tracking-tight">Workforce Dashboard</h1>
              <p className="text-xs text-gray-500 mt-0.5">Factory · Shift 1 · {time.toLocaleDateString('en', {weekday:'long', day:'numeric', month:'short'})}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1.5 text-xs text-green-400 bg-green-400/10 border border-green-400/20 px-3 py-1.5 rounded-lg">
                <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
                LenzAI Active
              </span>
            </div>
          </div>

          {/* ── KPI Cards ── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label:'Avg Productivity', value:`${avgScore}%`, sub:'↑ 4% vs yesterday',   color:'text-blue-400',  glow:'shadow-blue-500/10'  },
              { label:'Active Workers',   value:activeCount,    sub:`${idleCount} idle now`, color:'text-green-400', glow:'shadow-green-500/10' },
              { label:'Open Alerts',      value:3,              sub:'2 PPE · 1 Zone',        color:'text-red-400',   glow:'shadow-red-500/10'   },
              { label:'Scan Interval',    value:'5 min',        sub:'Next scan in 3:12',     color:'text-violet-400',glow:'shadow-violet-500/10'},
            ].map(k => (
              <div key={k.label} className={`bg-gray-900/50 border border-white/5 rounded-xl p-4 shadow-lg ${k.glow}`}>
                <div className="text-[11px] text-gray-500 font-medium uppercase tracking-wider mb-1">{k.label}</div>
                <div className={`text-3xl font-extrabold ${k.color}`} style={{textShadow:`0 0 20px currentColor`}}>{k.value}</div>
                <div className="text-[11px] text-gray-600 mt-0.5">{k.sub}</div>
              </div>
            ))}
          </div>

          {/* ── CCTV + Alerts ── */}
          <div className="grid lg:grid-cols-3 gap-4">

            {/* CCTV Feeds */}
            <div className="lg:col-span-2 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-white">Live Camera Feeds</h2>
                <span className="text-[11px] text-gray-500">LenzAI scanning every 5 min</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <CamFeed index={0} label="CAM-01 · Zone A" hasAlert={false} />
                <CamFeed index={1} label="CAM-03 · Zone C" hasAlert={true}  />
                <CamFeed index={2} label="CAM-07 · Gate 2" hasAlert={true}  />
              </div>
            </div>

            {/* Alerts Panel */}
            <div className="bg-gray-900/50 border border-white/5 rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
                <h2 className="text-sm font-bold text-white">Live Alerts</h2>
                <span className="text-[10px] bg-red-500/20 text-red-400 border border-red-500/20 px-2 py-0.5 rounded-full font-bold">3 open</span>
              </div>
              <div className="divide-y divide-white/5 overflow-y-auto max-h-48 lg:max-h-full">
                {liveAlerts.map((a) => (
                  <div key={a.id} className="px-4 py-3 flex items-start gap-3 hover:bg-white/5 transition-colors">
                    <span className={`mt-0.5 w-2 h-2 rounded-full shrink-0 ${a.type==='violation'?'bg-red-500':a.type==='idle'?'bg-amber-500':a.type==='zone'?'bg-orange-500':'bg-blue-500'}`} style={{boxShadow:`0 0 6px currentColor`}} />
                    <div className="min-w-0">
                      <div className="text-xs text-gray-200 font-medium truncate">{a.msg}</div>
                      <div className="text-[10px] text-gray-600 mt-0.5">{a.cam} · {a.time}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── Productivity Chart + Donut ── */}
          <div className="grid lg:grid-cols-3 gap-4">

            {/* Productivity over time */}
            <div className="lg:col-span-2 bg-gray-900/50 border border-white/5 rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-sm font-bold text-white">Productivity Score</h2>
                  <p className="text-[11px] text-gray-500 mt-0.5">Today · hourly average</p>
                </div>
                <div className="text-2xl font-extrabold text-blue-400" style={{textShadow:'0 0 20px rgba(59,130,246,0.6)'}}>
                  {avgScore}%
                </div>
              </div>
              <ProductivityChart />
            </div>

            {/* Active/Idle Donut */}
            <div className="bg-gray-900/50 border border-white/5 rounded-xl p-5">
              <h2 className="text-sm font-bold text-white mb-4">Workforce Status</h2>
              <DonutChart active={activeCount} idle={idleCount} onBreak={breakCount} />
              <div className="mt-4 pt-4 border-t border-white/5 space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Idle time reduced</span>
                  <span className="text-green-400 font-bold">↓ 18%</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Shift coverage</span>
                  <span className="text-blue-400 font-bold">94%</span>
                </div>
              </div>
            </div>
          </div>

          {/* ── Employee Timeline ── */}
          <div className="bg-gray-900/50 border border-white/5 rounded-xl overflow-hidden">
            <div className="px-5 py-3 border-b border-white/5 flex items-center justify-between">
              <h2 className="text-sm font-bold text-white">Employee Activity Timeline</h2>
              <span className="text-[11px] text-gray-500">Shift: 08:00 – 17:00</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-white/5">
                    <th className="text-left py-2.5 px-5 text-gray-500 font-medium w-36">Employee</th>
                    <th className="text-left py-2.5 px-3 text-gray-500 font-medium w-24">Zone</th>
                    <th className="text-left py-2.5 px-3 text-gray-500 font-medium">Activity (today)</th>
                    <th className="text-right py-2.5 px-5 text-gray-500 font-medium w-20">Score</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.03]">
                  {EMPLOYEES.map(e => {
                    const activeW = e.score;
                    const idleW   = e.idle;
                    const restW   = 100 - activeW - idleW;
                    return (
                      <tr key={e.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="py-3 px-5">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-600 to-violet-600 flex items-center justify-center text-[9px] font-bold shrink-0">
                              {e.name.split(' ').map(n=>n[0]).join('').slice(0,2)}
                            </div>
                            <div>
                              <div className="text-gray-200 font-medium">{e.name}</div>
                              <div className="text-gray-600 text-[10px]">{e.role}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-3 text-gray-400">{e.zone}</td>
                        <td className="py-3 px-3">
                          <div className="flex gap-0.5 h-4 rounded overflow-hidden">
                            <div className="bg-blue-600 rounded-l" style={{width:`${activeW}%`,boxShadow:'0 0 6px rgba(59,130,246,0.4)'}} title={`Active ${activeW}%`} />
                            <div className="bg-gray-600" style={{width:`${idleW}%`}} title={`Idle ${idleW}%`} />
                            <div className="bg-gray-800 rounded-r" style={{width:`${restW}%`}} />
                          </div>
                        </td>
                        <td className="py-3 px-5 text-right">
                          <span className={`font-bold ${e.score>=85?'text-green-400':e.score>=65?'text-blue-400':'text-red-400'}`}>{e.score}%</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* ── CTA Banner ── */}
          <div className="bg-gradient-to-r from-blue-900/40 to-violet-900/40 border border-blue-500/20 rounded-2xl p-6 text-center">
            <div className="text-xs font-bold text-blue-400 uppercase tracking-widest mb-2">This is a live demo preview</div>
            <h3 className="text-xl font-extrabold text-white mb-2">Ready to see it on your cameras?</h3>
            <p className="text-gray-400 text-sm mb-5 max-w-md mx-auto">Connect LenzAI to your existing CCTV in minutes. No hardware changes. Real results from day one.</p>
            <Link href="/#contact" className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-violet-600 text-white font-bold px-8 py-3 rounded-xl hover:opacity-90 transition-all shadow-xl shadow-blue-900/40">
              Request Your Demo →
            </Link>
          </div>

        </main>
      </div>
    </div>
  );
}
