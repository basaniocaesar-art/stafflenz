'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import DashboardLayout from './DashboardLayout';

/* ── helpers ────────────────────────────────────────────────────────────────── */
function randomItem(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function randomConf()    { return (82 + Math.random() * 17).toFixed(1); }

const FAKE_NAMES  = ['Ravi Kumar','Priya Sharma','James O.','Fatima Al-H.','Chen Wei','Maria Santos','Unknown','Worker #7','Supervisor'];
const FAKE_ZONES  = ['Zone A','Zone B','Zone C','Gate 1','Storage','Exit','Floor 2','Canteen','Lobby'];
const FAKE_EVENTS = [
  { type:'check_in',       color:'#22c55e',  label:'Check-in'   },
  { type:'detected',       color:'#60a5fa',  label:'Detected'   },
  { type:'ppe_violation',  color:'#facc15',  label:'PPE Alert'  },
  { type:'zone_violation', color:'#f87171',  label:'Zone Breach'},
  { type:'check_out',      color:'#94a3b8',  label:'Check-out'  },
];

function genEvent(id) {
  const ev = randomItem(FAKE_EVENTS);
  return { id, name: randomItem(FAKE_NAMES), zone: randomItem(FAKE_ZONES), ...ev, conf: randomConf(),
    time: new Date().toLocaleTimeString('en',{hour:'2-digit',minute:'2-digit',second:'2-digit'}) };
}

function randomBox() {
  return {
    x: 5 + Math.random()*55, y: 5 + Math.random()*55,
    w: 18 + Math.random()*22, h: 20 + Math.random()*20,
    conf: randomConf(),
    label: randomItem(['Worker','Supervisor','Unknown','PPE OK','NO PPE']),
    color: Math.random()>0.8 ? '#ef4444' : Math.random()>0.5 ? '#facc15' : '#22c55e',
  };
}

/* ── Weekly Activity Chart (SVG) ────────────────────────────────────────────── */
function WeeklyChart({ weekData }) {
  const days  = weekData?.length ? weekData : [{present_count:6},{present_count:12},{present_count:9},{present_count:17},{present_count:14},{present_count:11},{present_count:7}];
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
function Heatmap({ workers, weekData }) {
  const names = workers?.length ? workers.slice(0,5).map(w=>w.name||'Worker') : ['A. Chen','B. Kumar','C. Kasmar','D. Chen','E. Ellis'];
  const cols  = 28;
  function heatColor(v) {
    if (v<0.2) return '#0f2744'; if (v<0.4) return '#1e3a5f';
    if (v<0.6) return '#1d6fa4'; if (v<0.8) return '#22a8d4'; return '#22d3ee';
  }
  const grid = names.map(()=>Array.from({length:cols},()=>Math.random()));

  return (
    <div className="overflow-x-auto">
      <div style={{minWidth:'480px'}}>
        {names.map((name,ei)=>(
          <div key={ei} className="flex items-center gap-1 mb-1">
            <div className="text-xs font-mono w-16 text-right pr-2 shrink-0 truncate" style={{color:'#64748b'}}>{name.split(' ').slice(0,2).join(' ')}</div>
            {grid[ei].map((v,di)=>(
              <div key={di} className="rounded-sm shrink-0 hover:scale-125 transition-transform cursor-default"
                style={{width:'14px',height:'14px',background:heatColor(v),boxShadow:v>0.7?`0 0 4px ${heatColor(v)}80`:undefined}}/>
            ))}
          </div>
        ))}
        <div className="flex items-center gap-1 mt-2 ml-[72px]">
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

/* ── Camera Feed ────────────────────────────────────────────────────────────── */
function AICamFeed({ camIndex, videoUrl, alertCam }) {
  const videoRef = useRef(null);
  const [scan, setScan] = useState(0);
  const [boxes, setBoxes] = useState([]);

  useEffect(()=>{
    let pos=0, raf;
    function step(){ pos=(pos+0.6)%110; setScan(pos); raf=requestAnimationFrame(step); }
    raf=requestAnimationFrame(step);
    return ()=>cancelAnimationFrame(raf);
  },[]);

  useEffect(()=>{
    function refresh(){ setBoxes(Array.from({length:1+Math.floor(Math.random()*3)},randomBox)); }
    refresh();
    const iv=setInterval(refresh, 2500+Math.random()*1500);
    return ()=>clearInterval(iv);
  },[videoUrl]);

  useEffect(()=>{
    if(videoRef.current&&videoUrl){ videoRef.current.src=videoUrl; videoRef.current.play().catch(()=>{}); }
  },[videoUrl]);

  return (
    <div className="relative bg-black rounded-lg overflow-hidden" style={{aspectRatio:'16/9',border:alertCam?'1.5px solid #ef4444':'1px solid #1e2d4a'}}>
      {videoUrl&&<video ref={videoRef} className="absolute inset-0 w-full h-full object-cover" autoPlay muted loop playsInline style={{opacity:0.5,filter:'brightness(0.8) contrast(1.1)'}}/>}
      <div className="absolute inset-0" style={{background:'linear-gradient(to br,rgba(7,13,27,0.3),rgba(7,13,27,0.1))'}}/>
      <div className="absolute inset-0 pointer-events-none" style={{backgroundImage:'linear-gradient(rgba(34,211,238,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(34,211,238,0.03) 1px,transparent 1px)',backgroundSize:'20% 20%'}}/>
      <div className="absolute left-0 right-0 h-px pointer-events-none" style={{top:`${scan}%`,background:'linear-gradient(90deg,transparent,rgba(34,211,238,0.6),transparent)',boxShadow:'0 0 8px rgba(34,211,238,0.4)',transition:'top 0.05s linear'}}/>
      {boxes.map((b,i)=>(
        <div key={i} className="absolute pointer-events-none" style={{left:`${b.x}%`,top:`${b.y}%`,width:`${b.w}%`,height:`${b.h}%`,border:`1.5px solid ${b.color}`,boxShadow:`0 0 5px ${b.color}44`}}>
          <div className="absolute -top-4 left-0 text-[8px] font-mono whitespace-nowrap px-1 rounded" style={{background:b.color+'cc',color:'#000',lineHeight:'14px'}}>{b.label} {b.conf}%</div>
          <div className="absolute top-0 left-0 w-2 h-0.5" style={{background:b.color}}/><div className="absolute top-0 left-0 w-0.5 h-2" style={{background:b.color}}/>
          <div className="absolute top-0 right-0 w-2 h-0.5" style={{background:b.color}}/><div className="absolute top-0 right-0 w-0.5 h-2" style={{background:b.color}}/>
          <div className="absolute bottom-0 left-0 w-2 h-0.5" style={{background:b.color}}/><div className="absolute bottom-0 left-0 w-0.5 h-2" style={{background:b.color}}/>
          <div className="absolute bottom-0 right-0 w-2 h-0.5" style={{background:b.color}}/><div className="absolute bottom-0 right-0 w-0.5 h-2" style={{background:b.color}}/>
        </div>
      ))}
      <div className="absolute top-1 left-1 flex items-center gap-1">
        <span className="text-[8px] font-mono bg-black/70 px-1 rounded" style={{color:'#94a3b8'}}>CAM {camIndex+1}</span>
        {alertCam
          ? <span className="text-[8px] font-mono bg-red-600 text-white px-1 rounded animate-pulse">ALERT</span>
          : <span className="flex items-center gap-0.5 text-[8px] font-mono bg-black/70 px-1 rounded" style={{color:'#f87171'}}><span className="w-1 h-1 bg-red-500 rounded-full animate-pulse inline-block"/>REC</span>
        }
      </div>
      <div className="absolute bottom-1 right-1 text-[7px] font-mono bg-black/70 px-1 rounded" style={{color:'#22d3ee'}}>LenzAI ▶</div>
    </div>
  );
}

/* ── Main Dashboard ─────────────────────────────────────────────────────────── */
export default function DashboardPage({ industry }) {
  const [data,         setData]         = useState(null);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState(null);
  const [videoUrls,    setVideoUrls]    = useState(Array(8).fill(null));
  const [liveLog,      setLiveLog]      = useState([]);
  const [alertCams,    setAlertCams]    = useState([]);
  const [aiStats,      setAiStats]      = useState({ frames:2410, detections:47 });
  const [activeTab,    setActiveTab]    = useState('overview');
  const [waNumber,     setWaNumber]     = useState('');
  const [waSaving,     setWaSaving]     = useState(false);
  const [waStatus,     setWaStatus]     = useState(null);
  const [time,         setTime]         = useState(new Date());

  useEffect(()=>{ const iv=setInterval(()=>setTime(new Date()),1000); return ()=>clearInterval(iv); },[]);

  // Pexels videos
  useEffect(()=>{
    async function load(){
      try{ const r=await fetch('/api/pexels?count=8'); const j=await r.json(); if(j.urls) setVideoUrls(j.urls); }catch{}
    }
    load();
  },[]);

  // Live event simulation
  useEffect(()=>{
    let c=1000;
    const iv=setInterval(()=>{
      c++; const ev=genEvent(c);
      setLiveLog(p=>[ev,...p].slice(0,60));
      if(ev.type==='zone_violation'||ev.type==='ppe_violation'){
        const cam=Math.floor(Math.random()*8); setAlertCams([cam]); setTimeout(()=>setAlertCams([]),3000);
      }
      setAiStats(p=>({frames:p.frames+Math.floor(Math.random()*3)+1,detections:p.detections+(Math.random()>0.6?1:0)}));
    }, 1800+Math.random()*1200);
    return ()=>clearInterval(iv);
  },[]);

  // Real data
  const fetchData = useCallback(async()=>{
    try{
      const r=await fetch('/api/client');
      if(r.status===401){ window.location.href='/login'; return; }
      const j=await r.json();
      if(r.ok){ setData(j); setError(null); if(j.client?.whatsapp_notify) setWaNumber(j.client.whatsapp_notify); }
      else setError(j.error);
    }catch{ setError('Failed to load'); }
    finally{ setLoading(false); }
  },[]);

  useEffect(()=>{ fetchData(); const iv=setInterval(fetchData,60000); return ()=>clearInterval(iv); },[fetchData]);

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
          <div className="text-sm" style={{color:'#475569'}}>Initialising LenzAI...</div>
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

  const { client, today, recent_events, open_alerts, week_chart, plan_limit, zones } = data || {};

  const tabs = [
    { id:'overview',   label:'Dashboard'   },
    { id:'cameras',    label:'Cameras'     },
    { id:'alerts',     label:'Alerts', badge: open_alerts?.length },
    { id:'analytics',  label:'Analytics'  },
  ];

  return (
    <DashboardLayout industry={industry} clientName={client?.name||industry} userName={client?.name||''}>

      {/* ── Page header ── */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <div className="text-xs font-medium uppercase tracking-widest mb-1" style={{color:S.muted}}>Overview</div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">Dashboard</h1>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono hidden sm:block" style={{color:S.muted}}>{time.toLocaleTimeString()}</span>
          <span className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border" style={{color:'#22c55e',background:'rgba(34,197,94,0.08)',borderColor:'rgba(34,197,94,0.2)'}}>
            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{background:'#22c55e'}}/>
            LenzAI Active
          </span>
        </div>
      </div>

      {/* ── Tab bar ── */}
      <div className="flex gap-1 mb-5 p-1 rounded-xl w-fit" style={{background:'rgba(13,22,49,0.8)',border:'1px solid #1e2d4a'}}>
        {tabs.map(t=>(
          <button key={t.id} onClick={()=>setActiveTab(t.id)}
            className="relative px-4 py-1.5 text-sm font-medium rounded-lg transition-all"
            style={activeTab===t.id?{background:'rgba(59,130,246,0.2)',color:'#60a5fa',border:'1px solid rgba(59,130,246,0.3)'}:{color:'#64748b',border:'1px solid transparent'}}>
            {t.label}
            {t.badge>0&&<span className="absolute -top-1 -right-1 text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center" style={{background:'#ef4444',color:'white'}}>{t.badge}</span>}
          </button>
        ))}
      </div>

      {/* ══════════════════ OVERVIEW TAB ══════════════════ */}
      {activeTab==='overview'&&(
        <div className="space-y-4">

          {/* KPI cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label:'Total Employees', value: client?.total_workers??0,       sub:`${today?.present_count??0} present today`,   color:'#60a5fa' },
              { label:'Hours Logged',    value:`${((today?.total_events??0)*0.05).toFixed(1)}h`, sub:'Today\'s shift activity', color:'#22d3ee' },
              { label:'Open Alerts',     value: open_alerts?.length??0,          sub:`${aiStats.detections} detections today`,    color: open_alerts?.length?'#f87171':'#22c55e' },
              { label:'Scan Interval',   value:'5 min',                           sub:`${aiStats.frames.toLocaleString()} frames`, color:'#a78bfa' },
            ].map(k=>(
              <div key={k.label} className="rounded-2xl p-4 border" style={{background:S.card,borderColor:S.border}}>
                <div className="text-[11px] font-medium uppercase tracking-wider mb-2" style={{color:S.muted}}>{k.label}</div>
                <div className="text-3xl font-extrabold mb-1" style={{color:k.color,textShadow:`0 0 20px ${k.color}60`}}>{k.value}</div>
                <svg viewBox="0 0 80 20" className="w-full mb-1" style={{height:'18px'}}>
                  <polyline points="0,16 13,10 26,13 39,6 52,9 65,4 80,7" fill="none" stroke={k.color} strokeWidth="1.5" strokeLinecap="round" style={{filter:`drop-shadow(0 0 3px ${k.color})`}}/>
                </svg>
                <div className="text-[10px]" style={{color:S.muted}}>{k.sub}</div>
              </div>
            ))}
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

            {/* Timeline */}
            <div className="rounded-2xl border overflow-hidden" style={{background:S.card,borderColor:S.border}}>
              <div className="px-4 py-3 border-b" style={{borderColor:S.border}}>
                <h2 className="text-sm font-bold text-white">Timeline Statistics</h2>
                <p className="text-[11px] mt-0.5" style={{color:S.muted}}>Recent activity</p>
              </div>
              <div className="divide-y overflow-y-auto" style={{borderColor:S.border,maxHeight:'200px'}}>
                {(recent_events||[]).slice(0,6).map((e,i)=>(
                  <div key={e.id||i} className="px-4 py-2.5 flex items-center gap-3">
                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0" style={{background:'linear-gradient(135deg,#1e3a5f,#1d6fa4)',color:'#22d3ee'}}>
                      {(e.worker_name||'?')[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold text-white truncate">{e.worker_name||'Unknown'}</div>
                      <div className="text-[10px] font-mono truncate" style={{color:S.muted}}>{e.activity||e.event_type?.replace('_',' ')}</div>
                    </div>
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0" style={{background:'rgba(34,197,94,0.12)',color:'#22c55e'}}>active</span>
                  </div>
                ))}
                {!recent_events?.length&&(
                  <div className="px-4 py-8 text-center text-xs" style={{color:S.muted}}>No activity yet today</div>
                )}
              </div>
            </div>
          </div>

          {/* Heatmap + Alerts */}
          <div className="grid lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 rounded-2xl p-5 border" style={{background:S.card,borderColor:S.border}}>
              <h2 className="text-sm font-bold text-white mb-1">Employee Performance Heatmap</h2>
              <p className="text-[11px] mb-4" style={{color:S.muted}}>Daily activity over the past 4 weeks</p>
              <Heatmap workers={data?.workers} weekData={week_chart}/>
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
                  {label:'Cameras',label2:`${zones?.length||0} / ${plan_limit.max_cameras}`,pct:Math.min(100,((zones?.length||0)/plan_limit.max_cameras)*100),color:'#8b5cf6'},
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
              <span className="text-sm font-bold text-white">Live Camera Feeds</span>
              <span className="text-xs flex items-center gap-1.5" style={{color:'#22d3ee'}}>
                <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{background:'#22d3ee'}}/>Processing
              </span>
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              {videoUrls.map((url,i)=>(
                <AICamFeed key={i} camIndex={i} videoUrl={url} alertCam={alertCams.includes(i)}/>
              ))}
            </div>
            <div className="mt-2 text-[10px] font-mono" style={{color:'#334155'}}>
              REFRESH: 5MIN · MODEL: LENZAI v2.1 · EDGE NODE: ONLINE
            </div>
          </div>

          {/* Live log */}
          <div className="rounded-2xl p-4 border flex flex-col" style={{background:S.card,borderColor:S.border}}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-bold text-white">Live AI Log</span>
              <span className="text-xs flex items-center gap-1" style={{color:'#22c55e'}}>
                <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{background:'#22c55e'}}/>Live
              </span>
            </div>
            <div className="flex-1 overflow-y-auto space-y-1" style={{maxHeight:'420px'}}>
              {liveLog.map((ev,i)=>(
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
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════ ALERTS TAB ══════════════════ */}
      {activeTab==='alerts'&&(
        <div className="grid lg:grid-cols-2 gap-4">
          <div className="rounded-2xl p-5 border" style={{background:S.card,borderColor:S.border}}>
            <div className="flex items-center gap-2 mb-4">
              <h2 className="text-sm font-bold text-white">Active Alerts</h2>
              {open_alerts?.length>0&&<span className="text-xs font-bold px-2 py-0.5 rounded-full animate-pulse" style={{background:'rgba(239,68,68,0.15)',color:'#ef4444'}}>{open_alerts.length}</span>}
            </div>
            {!open_alerts?.length ? (
              <div className="text-center py-12">
                <div className="text-4xl mb-3">✅</div>
                <div className="text-sm" style={{color:S.muted}}>No active alerts</div>
              </div>
            ):(
              <div className="space-y-3">
                {open_alerts.map(alert=>(
                  <div key={alert.id} className="rounded-xl p-3 border" style={{background:'rgba(239,68,68,0.05)',borderColor:'rgba(239,68,68,0.2)'}}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-bold uppercase tracking-wider mb-1" style={{color:'#ef4444'}}>{alert.alert_type?.replace('_',' ')}</div>
                        <p className="text-sm text-white">{alert.message}</p>
                        <p className="text-[10px] mt-1 font-mono" style={{color:S.muted}}>{new Date(alert.created_at).toLocaleTimeString('en',{hour:'2-digit',minute:'2-digit'})}</p>
                      </div>
                      <button onClick={()=>resolveAlert(alert.id)} className="text-xs px-3 py-1 rounded-lg font-medium transition-all shrink-0" style={{background:'rgba(34,197,94,0.12)',color:'#22c55e',border:'1px solid rgba(34,197,94,0.2)'}}>Resolve</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-2xl p-5 border" style={{background:S.card,borderColor:S.border}}>
            <h2 className="text-sm font-bold text-white mb-1">WhatsApp Alerts</h2>
            <p className="text-xs mb-4" style={{color:S.muted}}>Violations detected by LenzAI are sent instantly to this number.</p>
            <div className="flex gap-2 mb-3">
              <input type="tel" placeholder="+91XXXXXXXXXX" value={waNumber} onChange={e=>setWaNumber(e.target.value)}
                className="flex-1 rounded-xl px-3 py-2 text-sm font-mono focus:outline-none"
                style={{background:'rgba(30,45,74,0.8)',border:'1px solid #1e2d4a',color:'#e2e8f0'}}/>
              <button onClick={saveWhatsApp} disabled={waSaving} className="px-4 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-50 transition-all" style={{background:S.blue}}>
                {waSaving?'Saving...':'Save'}
              </button>
            </div>
            {waStatus==='saved'&&<p className="text-xs" style={{color:'#22c55e'}}>Saved. Alerts will be sent to this number.</p>}
            {waStatus==='error'&&<p className="text-xs" style={{color:'#ef4444'}}>Failed to save. Please try again.</p>}

            {zones?.length>0&&(
              <div className="mt-6">
                <h3 className="text-xs font-bold uppercase tracking-wider mb-3" style={{color:S.muted}}>Camera Zones</h3>
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
      )}

      {/* ══════════════════ ANALYTICS TAB ══════════════════ */}
      {activeTab==='analytics'&&(
        <div className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              {label:'Present Today',  value:today?.present_count??0,  color:'#22c55e'},
              {label:'Absent',         value:today?.absent_count??0,   color:'#94a3b8'},
              {label:'Total Events',   value:today?.total_events??0,   color:'#60a5fa'},
              {label:'Plan',           value:(client?.plan||'FREE').toUpperCase(), color:'#a78bfa'},
            ].map(k=>(
              <div key={k.label} className="rounded-2xl p-4 border" style={{background:S.card,borderColor:S.border}}>
                <div className="text-[11px] uppercase tracking-wider mb-2" style={{color:S.muted}}>{k.label}</div>
                <div className="text-3xl font-extrabold" style={{color:k.color,textShadow:`0 0 20px ${k.color}60`}}>{k.value}</div>
              </div>
            ))}
          </div>

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
            <h2 className="text-sm font-bold text-white mb-4">Recent Activity</h2>
            <div className="space-y-1 max-h-64 overflow-y-auto">
              {(recent_events||[]).map((e,i)=>(
                <div key={e.id||i} className="flex items-start gap-3 py-2 border-b" style={{borderColor:'rgba(30,45,74,0.5)'}}>
                  <span className="text-[10px] font-mono w-14 pt-0.5 shrink-0" style={{color:S.muted}}>{new Date(e.occurred_at).toLocaleTimeString('en',{hour:'2-digit',minute:'2-digit'})}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-white truncate">{e.worker_name||'Unknown'}</div>
                    <div className="text-[10px]" style={{color:S.muted}}>{e.activity||e.event_type?.replace('_',' ')}</div>
                  </div>
                  {e.confidence&&<span className="text-[10px] font-mono shrink-0" style={{color:'#22d3ee'}}>{Math.round(e.confidence)}%</span>}
                </div>
              ))}
              {!recent_events?.length&&<div className="text-center py-6 text-xs" style={{color:S.muted}}>No activity yet today</div>}
            </div>
          </div>
        </div>
      )}

    </DashboardLayout>
  );
}
