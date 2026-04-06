'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';

/* ── Mock Data ─────────────────────────────────────────────────────────────── */
const EMPLOYEES = ['A. Chen', 'B. Kumar', 'C. Kasmar', 'D. Chen', 'E. Ellis'];
const MONTHS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat','Sun','Mon','Tue','Wed','Thu','Fri','Sat','Sun','Mon','Tue','Wed','Thu','Fri','Sat','Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

function heatVal() { return Math.random(); }
const HEATMAP = EMPLOYEES.map(() => MONTHS.map(heatVal));

const WEEKLY = [
  { day: 'Sun', val: 6  },
  { day: 'Mon', val: 12 },
  { day: 'Tue', val: 9  },
  { day: 'Wed', val: 17 },
  { day: 'Thu', val: 14 },
  { day: 'Fri', val: 11 },
  { day: 'Sat', val: 7  },
];

const ALERTS = [
  { time: '10:15', title: 'Shift Change Request',   sub: 'Ravi K. requesting swap',   dot: '#3b82f6' },
  { time: '02:03', title: 'Lateness',               sub: 'James O. — 22 min late',    dot: '#f59e0b' },
  { time: '09:45', title: 'Report Ready',           sub: 'Weekly summary available',  dot: '#22c55e' },
  { time: '08:30', title: 'PPE Violation',          sub: 'Zone C — no hard hat',      dot: '#ef4444' },
  { time: '07:12', title: 'Zone Breach',            sub: 'Restricted area — Gate 2',  dot: '#ef4444' },
];

const TIMELINE = [
  { name: 'Ravi K.',   time: '08:00–17:00', status: 'active'  },
  { name: 'Priya S.',  time: '09:00–18:00', status: 'active'  },
  { name: 'James O.',  time: '08:30–17:30', status: 'late'    },
  { name: 'Maria S.',  time: '07:00–16:00', status: 'active'  },
  { name: 'Chen Wei',  time: '10:00–19:00', status: 'upcoming'},
];

/* ── Sparkline (inline SVG line chart) ────────────────────────────────────── */
function WeeklyChart() {
  const max = Math.max(...WEEKLY.map(d => d.val));
  const w = 560, h = 120, pad = 20;
  const pts = WEEKLY.map((d, i) => {
    const x = pad + (i / (WEEKLY.length - 1)) * (w - pad * 2);
    const y = h - pad - (d.val / max) * (h - pad * 2);
    return { x, y, ...d };
  });
  const linePath = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
  const areaPath = `${linePath} L${pts[pts.length-1].x},${h} L${pts[0].x},${h} Z`;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{height:'120px'}}>
      <defs>
        <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#22d3ee" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#3b82f6" />
          <stop offset="100%" stopColor="#22d3ee" />
        </linearGradient>
        <filter id="glow">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>
      {/* Grid lines */}
      {[0.25,0.5,0.75,1].map(f => (
        <line key={f} x1={pad} y1={pad + (1-f)*(h-pad*2)} x2={w-pad} y2={pad + (1-f)*(h-pad*2)}
          stroke="#ffffff08" strokeWidth="1" />
      ))}
      {/* Area fill */}
      <path d={areaPath} fill="url(#chartGrad)" />
      {/* Line */}
      <path d={linePath} fill="none" stroke="url(#lineGrad)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" filter="url(#glow)" />
      {/* Dots */}
      {pts.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="4" fill="#0f172a" stroke="#22d3ee" strokeWidth="2" filter="url(#glow)" />
      ))}
      {/* Day labels */}
      {pts.map((p, i) => (
        <text key={i} x={p.x} y={h - 2} textAnchor="middle" fill="#475569" fontSize="10" fontFamily="monospace">{p.day}</text>
      ))}
    </svg>
  );
}

/* ── Heatmap ───────────────────────────────────────────────────────────────── */
function Heatmap() {
  function color(v) {
    if (v < 0.2) return '#0f2744';
    if (v < 0.4) return '#1e3a5f';
    if (v < 0.6) return '#1d6fa4';
    if (v < 0.8) return '#22a8d4';
    return '#22d3ee';
  }
  const shortMonths = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat','Sun','Mon','Tue','Wed','Thu','Fri','Sat','Sun','Mon','Tue','Wed','Thu','Fri','Sat','Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

  return (
    <div className="overflow-x-auto">
      <div style={{minWidth:'500px'}}>
        {/* Month headers */}
        <div className="flex gap-1 mb-1 ml-16">
          {shortMonths.map((m, i) => (
            <div key={i} className="text-[8px] text-slate-600 font-mono" style={{width:'16px',textAlign:'center',flexShrink:0}}>{i % 7 === 0 ? m : ''}</div>
          ))}
        </div>
        {EMPLOYEES.map((emp, ei) => (
          <div key={ei} className="flex items-center gap-1 mb-1">
            <div className="text-xs text-slate-400 font-mono w-14 text-right pr-2 shrink-0">{emp}</div>
            {HEATMAP[ei].map((v, di) => (
              <div key={di} className="rounded-sm shrink-0 transition-all hover:scale-125 cursor-default"
                style={{width:'14px',height:'14px',background:color(v),boxShadow:v>0.7?`0 0 4px ${color(v)}80`:undefined}}
                title={`${emp} · ${shortMonths[di]} · ${Math.round(v*10)} hrs`}
              />
            ))}
          </div>
        ))}
        {/* Activity legend */}
        <div className="flex items-center gap-1 mt-2 ml-16">
          <span className="text-[9px] text-slate-600 mr-1">Activity</span>
          {['#0f2744','#1e3a5f','#1d6fa4','#22a8d4','#22d3ee'].map((c,i) => (
            <div key={i} className="w-3 h-3 rounded-sm" style={{background:c}} />
          ))}
          <span className="text-[9px] text-slate-600 ml-1">High</span>
        </div>
      </div>
    </div>
  );
}

/* ── Main Page ─────────────────────────────────────────────────────────────── */
export default function DemoPage() {
  const [activeNav, setActiveNav] = useState('dashboard');
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const iv = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(iv);
  }, []);

  const navItems = [
    { id: 'dashboard',   label: 'Dashboard',   icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
    )},
    { id: 'schedule',    label: 'Schedule',    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
    )},
    { id: 'performance', label: 'Performance', icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
    )},
    { id: 'alerts',      label: 'Alerts',      icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
    ), badge: 2 },
    { id: 'admin',       label: 'Admin',       icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M6 20v-2a6 6 0 0 1 12 0v2"/></svg>
    )},
  ];

  return (
    <div className="min-h-screen flex flex-col" style={{background:'#070d1b',color:'#e2e8f0'}}>

      {/* ── Top bar ── */}
      <nav className="border-b flex items-center justify-between px-6 h-14 shrink-0" style={{background:'#0a1128',borderColor:'#1e2d4a'}}>
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center font-extrabold text-sm" style={{background:'linear-gradient(135deg,#3b82f6,#8b5cf6)'}}>S</div>
          <span className="font-extrabold text-white text-lg tracking-tight">Stafflenz</span>
          <span className="ml-2 text-[10px] font-bold px-2 py-0.5 rounded-full border tracking-wider" style={{background:'rgba(59,130,246,0.15)',color:'#60a5fa',borderColor:'rgba(59,130,246,0.3)'}}>LIVE DEMO</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xs font-mono hidden sm:block" style={{color:'#475569'}}>{time.toLocaleTimeString()}</span>
          <Link href="/#contact" className="text-sm font-semibold px-4 py-1.5 rounded-lg transition-all" style={{background:'linear-gradient(135deg,#3b82f6,#8b5cf6)',color:'white'}}>
            Get Started →
          </Link>
        </div>
      </nav>

      <div className="flex flex-1 overflow-hidden">

        {/* ── Sidebar ── */}
        <aside className="w-52 shrink-0 flex flex-col hidden lg:flex border-r" style={{background:'#0a1128',borderColor:'#1e2d4a'}}>
          <div className="p-4 border-b" style={{borderColor:'#1e2d4a'}}>
            <div className="text-xs font-medium mb-1" style={{color:'#475569'}}>WORKSPACE</div>
            <div className="text-sm font-semibold text-white">Acme Industries</div>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{background:'#22c55e'}} />
              <span className="text-[11px]" style={{color:'#22c55e'}}>45 employees active</span>
            </div>
          </div>

          <nav className="flex-1 p-3 space-y-0.5">
            {navItems.map(n => (
              <button key={n.id} onClick={() => setActiveNav(n.id)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-left relative"
                style={activeNav === n.id
                  ? {background:'rgba(59,130,246,0.15)',color:'#60a5fa',border:'1px solid rgba(59,130,246,0.25)'}
                  : {color:'#64748b',border:'1px solid transparent'}
                }>
                {n.icon}
                {n.label}
                {n.badge && (
                  <span className="ml-auto text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center" style={{background:'#ef4444',color:'white'}}>{n.badge}</span>
                )}
              </button>
            ))}
          </nav>

          <div className="p-4 border-t" style={{borderColor:'#1e2d4a'}}>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold" style={{background:'linear-gradient(135deg,#3b82f6,#8b5cf6)'}}>RK</div>
              <div>
                <div className="text-xs font-semibold text-white">Ravi Kumar</div>
                <div className="text-[10px]" style={{color:'#475569'}}>Admin</div>
              </div>
            </div>
          </div>
        </aside>

        {/* ── Main ── */}
        <main className="flex-1 overflow-y-auto p-6 space-y-5">

          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-medium uppercase tracking-widest mb-1" style={{color:'#475569'}}>Overview</div>
              <h1 className="text-2xl font-extrabold text-white tracking-tight">Dashboard</h1>
            </div>
            <div className="flex items-center gap-2 text-xs" style={{color:'#475569'}}>
              <span>Dashboard</span>
              <span>/</span>
              <span style={{color:'#60a5fa'}}>Timeline Statistics</span>
            </div>
          </div>

          {/* ── KPI Cards ── */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { label:'Total Employees', value:'45',      sub:'↑ 3 this month',    icon:(
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
              )},
              { label:'Hours Logged',    value:'122.38m', sub:'This week',          icon:(
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              )},
              { label:'Upcoming Daily',  value:'38',      sub:'Scheduled for today',icon:(
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
              )},
            ].map(k => (
              <div key={k.label} className="rounded-2xl p-5 border" style={{background:'#0d1631',borderColor:'#1e2d4a'}}>
                <div className="flex items-start justify-between mb-3">
                  <div className="text-xs font-medium uppercase tracking-wider" style={{color:'#475569'}}>{k.label}</div>
                  <div style={{color:'#3b82f6'}}>{k.icon}</div>
                </div>
                <div className="text-3xl font-extrabold text-white mb-1">{k.value}</div>
                {/* Mini sparkline */}
                <svg viewBox="0 0 80 20" className="w-full mb-2" style={{height:'20px'}}>
                  <polyline points="0,16 13,10 26,13 39,6 52,9 65,4 80,7" fill="none" stroke="#3b82f6" strokeWidth="1.5" strokeLinecap="round" style={{filter:'drop-shadow(0 0 3px #3b82f6)'}} />
                </svg>
                <div className="text-[11px]" style={{color:'#475569'}}>{k.sub}</div>
              </div>
            ))}
          </div>

          {/* ── Weekly Activity + Timeline ── */}
          <div className="grid lg:grid-cols-3 gap-4">

            {/* Weekly Activity Chart */}
            <div className="lg:col-span-2 rounded-2xl p-5 border" style={{background:'#0d1631',borderColor:'#1e2d4a'}}>
              <div className="flex items-center justify-between mb-1">
                <h2 className="text-sm font-bold text-white">Weekly Activity</h2>
              </div>
              <div className="text-xs mb-4" style={{color:'#475569'}}>Employee Active Hours</div>
              {/* Y axis labels */}
              <div className="flex gap-2">
                <div className="flex flex-col justify-between text-right pb-4" style={{color:'#334155',fontSize:'9px',fontFamily:'monospace',minWidth:'12px'}}>
                  {[20,15,10,5,0].map(n => <span key={n}>{n}</span>)}
                </div>
                <div className="flex-1">
                  <WeeklyChart />
                </div>
              </div>
            </div>

            {/* Timeline Statistics */}
            <div className="rounded-2xl border overflow-hidden" style={{background:'#0d1631',borderColor:'#1e2d4a'}}>
              <div className="px-4 py-3 border-b" style={{borderColor:'#1e2d4a'}}>
                <h2 className="text-sm font-bold text-white">Timeline Statistics</h2>
                <p className="text-[11px] mt-0.5" style={{color:'#475569'}}>Today's shifts</p>
              </div>
              <div className="divide-y" style={{divideColor:'#1e2d4a'}}>
                {TIMELINE.map((t, i) => (
                  <div key={i} className="px-4 py-3 flex items-center gap-3">
                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0" style={{background:'linear-gradient(135deg,#1e3a5f,#1d6fa4)',color:'#22d3ee'}}>
                      {t.name.split(' ')[0][0]}{t.name.split(' ')[1]?.[0] || ''}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold text-white truncate">{t.name}</div>
                      <div className="text-[10px] font-mono" style={{color:'#475569'}}>{t.time}</div>
                    </div>
                    <span className="text-[9px] font-bold px-2 py-0.5 rounded-full shrink-0"
                      style={t.status==='active'?{background:'rgba(34,197,94,0.15)',color:'#22c55e'}:t.status==='late'?{background:'rgba(239,68,68,0.15)',color:'#ef4444'}:{background:'rgba(59,130,246,0.15)',color:'#60a5fa'}}>
                      {t.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── Heatmap + Alerts ── */}
          <div className="grid lg:grid-cols-3 gap-4">

            {/* Employee Performance Heatmap */}
            <div className="lg:col-span-2 rounded-2xl p-5 border" style={{background:'#0d1631',borderColor:'#1e2d4a'}}>
              <h2 className="text-sm font-bold text-white mb-1">Employee Performance Heatmap</h2>
              <p className="text-[11px] mb-4" style={{color:'#475569'}}>Daily activity over the past 4 weeks</p>
              <Heatmap />
            </div>

            {/* Alerts & Notifications */}
            <div className="rounded-2xl border overflow-hidden" style={{background:'#0d1631',borderColor:'#1e2d4a'}}>
              <div className="px-4 py-3 border-b flex items-center justify-between" style={{borderColor:'#1e2d4a'}}>
                <h2 className="text-sm font-bold text-white">Alerts & Notifications</h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{background:'rgba(239,68,68,0.15)',color:'#ef4444'}}>2 new</span>
              </div>
              <div className="divide-y overflow-y-auto" style={{divideColor:'#1e2d4a',maxHeight:'220px'}}>
                {ALERTS.map((a, i) => (
                  <div key={i} className="px-4 py-3 flex items-start gap-3 hover:bg-white/[0.02] transition-colors cursor-default">
                    <div className="w-2 h-2 rounded-full mt-1.5 shrink-0" style={{background:a.dot,boxShadow:`0 0 6px ${a.dot}`}} />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold text-white truncate">{a.title}</div>
                      <div className="text-[10px] mt-0.5 truncate" style={{color:'#475569'}}>{a.sub}</div>
                    </div>
                    <div className="text-[10px] font-mono shrink-0" style={{color:'#334155'}}>{a.time}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── CTA ── */}
          <div className="rounded-2xl p-6 text-center border" style={{background:'linear-gradient(135deg,rgba(59,130,246,0.1),rgba(139,92,246,0.1))',borderColor:'rgba(59,130,246,0.2)'}}>
            <div className="text-xs font-bold uppercase tracking-widest mb-2" style={{color:'#60a5fa'}}>Interactive Demo</div>
            <h3 className="text-xl font-extrabold text-white mb-2">See this with your real data</h3>
            <p className="text-sm mb-5 max-w-md mx-auto" style={{color:'#64748b'}}>Connect LenzAI to your existing CCTV. Live workforce intelligence from day one.</p>
            <Link href="/#contact" className="inline-flex items-center gap-2 font-bold px-8 py-3 rounded-xl hover:opacity-90 transition-all" style={{background:'linear-gradient(135deg,#3b82f6,#8b5cf6)',color:'white'}}>
              Request Your Demo →
            </Link>
          </div>

        </main>
      </div>
    </div>
  );
}
