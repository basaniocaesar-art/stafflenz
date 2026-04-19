'use client';
import Link from 'next/link';
import PipelineDemoSection from '@/components/PipelineDemoSection';
import CameraGrid from '@/components/CameraGrid';
import IndustryPricing from '@/components/IndustryPricing';

const PRICING = [
  {
    name: 'Starter', price: 89, ideal: 'Small sites', highlight: false,
    features: ['Up to 10 guard posts', 'Up to 25 guards', '8 cameras (8-ch DVR)', 'Post abandonment alerts', 'WhatsApp alerts', 'Daily patrol report'],
  },
  {
    name: 'Professional', price: 169, ideal: 'Security companies', highlight: true,
    features: ['Up to 20 posts', 'Up to 60 guards', '16 cameras (16-ch DVR)', 'Patrol route verification', 'Shift handover log', 'Client SLA reports', 'Response time tracking'],
  },
  {
    name: 'Enterprise', price: 329, ideal: 'Multi-client operations', highlight: false,
    features: ['Up to 50 posts', 'Up to 100 guards', '32 cameras (32-ch DVR)', 'Multi-client dashboard', 'White-label reports', 'API access', 'Custom patrol routes', 'Dedicated support'],
  },
];

const FRAMES = [
  {
    sceneLabel: 'Post Abandoned',
    video_query: 'security guard post gate entrance booth empty',
    sceneIcon: '🏢',
    sceneDescription: 'Server room guard post scan — monitoring for guard presence at critical infrastructure',
    zone: 'Server Room Post · CAM 05',
    camId: '05',
    aiPrompt: 'Is there a security guard present at the server room guard post right now?',
    detections: [
      { label: '⚠ Post ABANDONED — 12 min', color: '#ef4444', x: '10%', y: '10%', w: '75%', h: '60%' },
    ],
    output: {
      icon: '🚨', title: 'Post Abandoned — Server Room', tag: 'Security Alert · 12 min gap',
      borderColor: '#ef444460', bgColor: '#450a0a40', iconBg: '#ef4444', tagColor: '#fca5a5',
      lines: [
        { icon: '🔴', text: 'Server room post unmanned for 12 minutes' },
        { icon: '🔒', text: 'Critical infrastructure area — zero tolerance' },
        { icon: '📍', text: 'Server Room · Cam 05 · 02:08' },
      ],
      action: '🚨 Duty manager and security supervisor notified',
      whatsapp: '🚨 *POST ABANDONED — Server Room*\n\nGuard post empty for 12 minutes.\nCritical infrastructure unprotected.\n\nServer Room · Cam 05 · 02:08\n\nDuty manager notified. Please investigate.',
    },
  },
  {
    sceneLabel: 'Patrol Missed',
    video_query: 'security guard walking patrol corridor night',
    sceneIcon: '🗺️',
    sceneDescription: 'Car park checkpoint scan — verifying guard completed the 02:16 patrol checkpoint',
    zone: 'Car Park Checkpoint · CAM 07',
    camId: '07',
    aiPrompt: 'Has a security guard passed this car park checkpoint? It was due at 02:16.',
    detections: [
      { label: '⚠ No Guard Detected', color: '#ef4444', x: '15%', y: '8%', w: '65%', h: '65%' },
    ],
    output: {
      icon: '🗺️', title: 'Patrol Checkpoint Missed', tag: 'Patrol Alert · Guard A',
      borderColor: '#f59e0b60', bgColor: '#2d1b0040', iconBg: '#f59e0b', tagColor: '#fcd34d',
      lines: [
        { icon: '⚠️', text: 'Car park checkpoint missed — due 02:16, now 02:31' },
        { icon: '📋', text: 'Guard A patrol log shows gap of 15 minutes' },
        { icon: '📍', text: 'Car Park · Cam 07 · 02:31' },
      ],
      action: '📢 Supervisor notified — patrol compliance log updated',
      whatsapp: '⚠️ *PATROL MISSED — Car Park*\n\nCheckpoint due: 02:16\nCurrent time: 02:31 — 15 min overdue.\n\nGuard A · Car Park · Cam 07\n\nPatrol compliance log updated. Please investigate.',
    },
  },
  {
    sceneLabel: 'Handover Gap',
    video_query: 'security shift change handover guards meeting',
    sceneIcon: '🔄',
    sceneDescription: 'Car park post handover scan — verifying incoming guard arrived before outgoing left',
    zone: 'Car Park Post · CAM 07',
    camId: '07',
    aiPrompt: 'Has the incoming shift guard arrived at this post? The outgoing guard just left at 05:59.',
    detections: [
      { label: '⚠ Post EMPTY — Handover Gap', color: '#ef4444', x: '12%', y: '10%', w: '70%', h: '58%' },
    ],
    output: {
      icon: '🔄', title: 'Handover Gap — 15 Minutes', tag: 'Handover Alert · Car Park',
      borderColor: '#ef444460', bgColor: '#450a0a40', iconBg: '#ef4444', tagColor: '#fca5a5',
      lines: [
        { icon: '🔴', text: 'Outgoing guard left 05:59 — incoming arrived 06:14' },
        { icon: '⏱️', text: '15-minute unprotected gap at car park post' },
        { icon: '📄', text: 'Handover violation logged for SLA report' },
      ],
      action: '📄 Client SLA report updated — incident logged',
      whatsapp: '🔄 *HANDOVER GAP — Car Park Post*\n\nOutgoing left: 05:59\nIncoming arrived: 06:14\n15-minute unprotected gap.\n\nCar Park · Cam 07\n\nHandover violation logged for client SLA report.',
    },
  },
  {
    sceneLabel: 'Fast Response',
    video_query: 'security guard running responding alarm emergency',
    sceneIcon: '⚡',
    sceneDescription: 'Perimeter gate — measuring guard response time from alert trigger to arrival',
    zone: 'Perimeter Gate N · CAM 03',
    camId: '03',
    aiPrompt: 'Has a security guard arrived at the perimeter gate following the breach alert at 03:14?',
    detections: [
      { label: 'Guard Rajan ✓ Responding', color: '#10b981', x: '15%', y: '18%', w: '28%', h: '58%' },
      { label: 'Breach Point', color: '#ef4444', x: '55%', y: '10%', w: '35%', h: '50%' },
    ],
    output: {
      icon: '⚡', title: 'Response Time: 2 min 18 sec', tag: 'SLA Met · Perimeter Gate',
      borderColor: '#10b98160', bgColor: '#052e1640', iconBg: '#10b981', tagColor: '#6ee7b7',
      lines: [
        { icon: '✅', text: 'Alert triggered: 03:14:00 — Guard arrived: 03:16:18' },
        { icon: '⚡', text: 'Response time: 2 min 18 sec — SLA target: 5 min' },
        { icon: '📄', text: 'Camera-verified response log saved for client report' },
      ],
      action: '✅ SLA compliance confirmed — report auto-generated',
      whatsapp: '✅ *FAST RESPONSE — Perimeter Gate*\n\nAlert: 03:14:00\nGuard on-scene: 03:16:18\nResponse time: 2m 18s ✓\n\nSLA target: 5 min — MET\n\nCamera-verified log saved for client report.',
    },
  },
];

export default function SecurityPage() {
  return (
    <div className="min-h-screen overflow-x-hidden">

      {/* Navbar */}
      <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-xl border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-gradient-to-br from-blue-600 to-violet-600 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-blue-200">LA</div>
            <span className="font-extrabold text-xl text-gray-900 tracking-tight">LenzAI</span>
          </Link>
          <div className="hidden md:flex items-center gap-4 text-sm font-medium text-gray-500">
            <div className="relative group">
              <button className="flex items-center gap-1 hover:text-gray-900 transition-colors">Industries <span className="text-xs opacity-60">▾</span></button>
              <div className="absolute top-full left-1/2 -translate-x-1/2 mt-3 w-72 bg-white rounded-2xl shadow-xl border border-gray-100 p-3 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 grid grid-cols-3 gap-1">
                <Link href="/industries/factory" className="flex items-center gap-1 text-xs font-medium text-gray-600 hover:text-gray-900 px-2 py-1.5 rounded-lg hover:bg-gray-50">🏭 Factory</Link>
                <Link href="/industries/hotel" className="flex items-center gap-1 text-xs font-medium text-gray-600 hover:text-gray-900 px-2 py-1.5 rounded-lg hover:bg-gray-50">🏨 Hotel</Link>
                <Link href="/industries/school" className="flex items-center gap-1 text-xs font-medium text-gray-600 hover:text-gray-900 px-2 py-1.5 rounded-lg hover:bg-gray-50">🏫 School</Link>
                <Link href="/industries/retail" className="flex items-center gap-1 text-xs font-medium text-gray-600 hover:text-gray-900 px-2 py-1.5 rounded-lg hover:bg-gray-50">🛍️ Retail</Link>
                <Link href="/industries/hospital" className="flex items-center gap-1 text-xs font-medium text-gray-600 hover:text-gray-900 px-2 py-1.5 rounded-lg hover:bg-gray-50">🏥 Hospital</Link>
                <Link href="/industries/construction" className="flex items-center gap-1 text-xs font-medium text-gray-600 hover:text-gray-900 px-2 py-1.5 rounded-lg hover:bg-gray-50">🏗️ Build</Link>
                <Link href="/industries/warehouse" className="flex items-center gap-1 text-xs font-medium text-gray-600 hover:text-gray-900 px-2 py-1.5 rounded-lg hover:bg-gray-50">📦 Warehouse</Link>
                <Link href="/industries/restaurant" className="flex items-center gap-1 text-xs font-medium text-gray-600 hover:text-gray-900 px-2 py-1.5 rounded-lg hover:bg-gray-50">🍽️ Restaurant</Link>
                <Link href="/industries/security" className="flex items-center gap-1 text-xs font-medium text-gray-600 hover:text-gray-900 px-2 py-1.5 rounded-lg hover:bg-gray-50">🔒 Security</Link>
              </div>
            </div>
            <Link href="/#pricing" className="hover:text-gray-900 transition-colors">Pricing</Link>
          </div>
          <div className="flex items-center gap-3">
            <a href="#demo" className="hidden sm:block text-sm font-semibold text-slate-600 hover:text-slate-800">Book Demo</a>
            <Link href="/login" className="btn-primary text-sm px-5 bg-slate-700 hover:bg-slate-800">Login →</Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative bg-[#06080A] text-white overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-950/80 via-[#06080A] to-gray-950/60" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-slate-600/10 rounded-full blur-[120px]" />
        <div className="absolute inset-0 opacity-[0.04]" style={{backgroundImage:'linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)',backgroundSize:'50px 50px'}} />
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 pt-20 pb-24">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 bg-slate-500/20 border border-slate-400/30 rounded-full px-5 py-2 text-sm font-medium text-slate-300 mb-6">🔒 Security & Guard Services</div>
              <h1 className="text-5xl md:text-6xl font-extrabold mb-6 leading-[1.1] tracking-tight">
                Every guard at post.<br />Every patrol verified.<br /><span className="bg-clip-text text-transparent bg-gradient-to-r from-slate-400 to-gray-300">Every shift accounted for.</span>
              </h1>
              <p className="text-lg text-slate-300 mb-8 leading-relaxed">
                LenzAI gives security managers a live, AI-verified view of every guard post across every site — detecting post abandonment, missed checkpoints, late arrivals, and shift handover gaps without any manual supervision or self-reported logs.
              </p>
              <div className="flex flex-wrap gap-4">
                <a href="#demo" className="inline-flex items-center gap-2 bg-slate-600 text-white font-bold px-8 py-4 rounded-xl hover:bg-slate-700 transition-all shadow-2xl shadow-slate-900/40 text-base">Book a Free Demo <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg></a>
                <a href="#dashboard" className="inline-flex items-center gap-2 bg-white/10 border border-white/20 text-white font-semibold px-8 py-4 rounded-xl hover:bg-white/20 transition-all text-base">See the Dashboard</a>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[
                {n:'Post Verification',l:'Guard at Post, Confirmed',sub:'AI detects abandonment within 5 minutes'},
                {n:'Patrol Routes',l:'Checkpoint Timestamps',sub:'every checkpoint logged — no self-reporting'},
                {n:'Shift Handover',l:'Verified Overlap',sub:'incoming guard must be present before outgoing leaves'},
                {n:'Response Time',l:'Alert → Guard Arrival',sub:'measure how fast your team responds to incidents'},
              ].map(({n,l,sub})=>(
                <div key={l} className="bg-white/5 border border-white/10 rounded-2xl p-5 backdrop-blur">
                  <div className="text-lg font-extrabold text-slate-300 mb-1">{n}</div>
                  <div className="text-sm font-bold text-white">{l}</div>
                  <div className="text-xs text-slate-400 mt-0.5">{sub}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <CameraGrid industry="security" />

      <PipelineDemoSection frames={FRAMES} accentColor="#94a3b8" industry="security" />


      {/* What's unique */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <div className="section-label mb-4">Security-Specific Intelligence</div>
            <h2 className="text-4xl font-extrabold text-gray-900 tracking-tight">Not just "guard signed in." <br/>Is the guard at their post right now. Did they complete the 2 AM checkpoint. How fast did they respond to the last alert.</h2>
            <p className="mt-4 text-gray-500 max-w-2xl mx-auto">Security managers rely on self-reported patrol logs that can be falsified in seconds. LenzAI replaces paper logs with camera-verified, timestamped presence data for every guard, every post, and every patrol checkpoint.</p>
          </div>

          <div className="grid lg:grid-cols-2 gap-8">
            <div className="card p-7 border-l-4 border-l-slate-400">
              <div className="text-3xl mb-3">🏢</div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Live Post Abandonment Detection</h3>
              <p className="text-gray-500 text-sm mb-4 leading-relaxed">Each guard post — main entrance, car park, server room, loading bay — is monitored continuously. If a guard is not detected at their post for more than 5 minutes outside of a scheduled patrol window, an immediate alert is sent to the duty manager. No more unattended posts discovered on review.</p>
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm">
                <div className="font-bold text-slate-800 mb-2">Post status — right now:</div>
                <ul className="space-y-1 text-slate-700">
                  <li>🔴 Server Room Post: Unattended 12 min — alert sent</li>
                  <li>✅ Main Entrance: Guard present — Rajan S.</li>
                  <li>✅ Car Park Post: Guard present — Meena P.</li>
                </ul>
              </div>
            </div>

            <div className="card p-7 border-l-4 border-l-gray-400">
              <div className="text-3xl mb-3">🗺️</div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Patrol Route Verification — No Self-Reporting</h3>
              <p className="text-gray-500 text-sm mb-4 leading-relaxed">Patrol routes are defined as a sequence of camera checkpoints with a maximum allowed interval between them. LenzAI verifies that each checkpoint was physically visited within the allowed time — creating an immutable, camera-verified patrol log that cannot be signed retrospectively.</p>
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-sm">
                <div className="font-bold text-gray-800 mb-2">Tonight&apos;s patrol record — Guard A:</div>
                <ul className="space-y-1 text-gray-700">
                  <li>✅ 02:00 — Lobby checkpoint passed</li>
                  <li>✅ 02:08 — Server Room checkpoint passed</li>
                  <li>⚠ 02:20 — Car Park checkpoint missed (due 02:16)</li>
                  <li>✅ 02:31 — Perimeter Gate passed</li>
                </ul>
              </div>
            </div>

            <div className="card p-7 border-l-4 border-l-zinc-400">
              <div className="text-3xl mb-3">🔄</div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Shift Handover Verification</h3>
              <p className="text-gray-500 text-sm mb-4 leading-relaxed">A guard leaving their post before the incoming guard arrives creates a coverage gap — a key vulnerability window for theft and incidents. LenzAI verifies that the incoming guard is physically present at each post before the outgoing guard departs, flagging any gaps that exceed 2 minutes.</p>
              <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-4 text-sm">
                <div className="font-bold text-zinc-800 mb-2">06:00 handover — this morning:</div>
                <ul className="space-y-1 text-zinc-700">
                  <li>✅ Main Entrance: Incoming arrived 05:58 — 2 min overlap</li>
                  <li>⚠ Car Park: Outgoing left at 05:59, incoming at 06:14 — 15 min gap</li>
                  <li>✅ Server Room: Incoming arrived 06:01 — handover confirmed</li>
                </ul>
              </div>
            </div>

            <div className="card p-7 border-l-4 border-l-neutral-400">
              <div className="text-3xl mb-3">⚡</div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Response Time Tracking</h3>
              <p className="text-gray-500 text-sm mb-4 leading-relaxed">When an alert is triggered — an unauthorised entry, an alarm activation, or a post abandonment — LenzAI timestamps the alert and then detects when a guard arrives at the location. This gives security managers a verified response time record for every incident — essential for SLA reporting to clients.</p>
              <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-4 text-sm">
                <div className="font-bold text-neutral-800 mb-2">Response time log — this week:</div>
                <ul className="space-y-1 text-neutral-700">
                  <li>✅ Mon 03:14 — Perimeter breach · Guard responded in 2 min 18 sec</li>
                  <li>⚠ Wed 22:40 — Fire door alert · Guard responded in 8 min 45 sec (SLA: 5 min)</li>
                  <li>✅ Thu 01:55 — Unauthorised entry · Guard responded in 1 min 52 sec</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Dashboard mockup */}
      <section id="dashboard" className="py-20 px-4 bg-gray-950">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-400 bg-slate-950/60 border border-slate-700/50 px-4 py-1.5 rounded-full mb-4">Live Dashboard</div>
            <h2 className="text-4xl font-extrabold text-white tracking-tight">What your security operations centre sees in real time.</h2>
          </div>

          <div className="bg-gray-900 rounded-3xl border border-gray-700 overflow-hidden shadow-2xl">
            <div className="bg-gray-800 px-4 py-3 flex items-center gap-2 border-b border-gray-700">
              <div className="flex gap-1.5"><div className="w-3 h-3 rounded-full bg-red-500"/><div className="w-3 h-3 rounded-full bg-yellow-500"/><div className="w-3 h-3 rounded-full bg-green-500"/></div>
              <div className="flex-1 bg-gray-700 rounded-lg px-3 py-1 text-xs text-gray-400 text-center mx-4">app.lenzai.org/security</div>
            </div>
            <div className="flex h-[640px]">
              <div className="w-52 bg-gray-950 border-r border-gray-800 p-4 shrink-0 flex flex-col">
                <div className="flex items-center gap-2 mb-5 px-1">
                  <div className="w-7 h-7 bg-gradient-to-br from-blue-600 to-violet-600 rounded-lg flex items-center justify-center text-white font-bold text-xs">LA</div>
                  <span className="font-bold text-white text-sm">LenzAI</span>
                </div>
                <div className="bg-slate-500/20 border border-slate-500/30 rounded-xl px-3 py-2 mb-4">
                  <div className="text-xs font-bold text-slate-300">🔒 Security</div>
                  <div className="text-xs text-gray-400 mt-0.5">SecureNet Services</div>
                </div>
                {[{i:'📊',l:'Dashboard',a:true},{i:'🏢',l:'Post Status'},{i:'🗺️',l:'Patrol Routes'},{i:'🔄',l:'Handovers'},{i:'⚡',l:'Response Times'},{i:'🕐',l:'Attendance'}].map(item=>(
                  <div key={item.l} className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl mb-0.5 text-xs cursor-pointer ${item.a?'bg-slate-500/20 text-slate-300 font-bold':'text-gray-400 hover:text-white'}`}>{item.i} {item.l}</div>
                ))}
              </div>

              <div className="flex-1 overflow-auto p-5 bg-gray-950 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-extrabold text-white">Security Dashboard</h3>
                    <p className="text-xs text-gray-500">Thursday 3 Apr · Night Shift · Last scan 1 min ago</p>
                  </div>
                  <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400 bg-emerald-900/40 border border-emerald-800/50 px-3 py-1.5 rounded-full"><span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"/>Live</span>
                </div>

                <div className="grid grid-cols-4 gap-3">
                  {[
                    {l:'Posts Manned',v:'7/8',s:'Server Room — gap',c:'text-amber-400',bg:'bg-amber-900/30 border-amber-800/40'},
                    {l:'Post Abandonments',v:'1',s:'12 min — alert sent',c:'text-red-400',bg:'bg-red-900/30 border-red-800/40'},
                    {l:'Patrol Compliance',v:'94%',s:'1 checkpoint missed',c:'text-emerald-400',bg:'bg-emerald-900/30 border-emerald-800/40'},
                    {l:'Avg Response',v:'2m 34s',s:'last 7 days',c:'text-blue-400',bg:'bg-blue-900/30 border-blue-800/40'},
                  ].map(k=>(
                    <div key={k.l} className={`border rounded-xl p-3 ${k.bg}`}>
                      <div className={`text-2xl font-extrabold ${k.c}`}>{k.v}</div>
                      <div className="text-xs font-bold text-white mt-0.5">{k.l}</div>
                      <div className="text-xs text-gray-500">{k.s}</div>
                    </div>
                  ))}
                </div>

                <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
                  <h4 className="text-sm font-bold text-white mb-3">All Posts — Status Right Now</h4>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      {post:'Main Entrance',guard:'Rajan S.',since:'21:00',ok:true},
                      {post:'Car Park A',guard:'Meena P.',since:'21:00',ok:true},
                      {post:'Server Room',guard:'—',since:'Abandoned 12 min ago',ok:false},
                      {post:'Loading Dock',guard:'Arjun T.',since:'21:00',ok:true},
                      {post:'Perimeter Gate N',guard:'Sanjay V.',since:'21:00',ok:true},
                      {post:'Perimeter Gate S',guard:'Divya K.',since:'21:00',ok:true},
                      {post:'Rooftop Access',guard:'Kiran M.',since:'21:00',ok:true},
                      {post:'Reception Lobby',guard:'Nisha R.',since:'21:00',ok:true},
                    ].map(p=>(
                      <div key={p.post} className={`flex items-center justify-between px-3 py-2.5 rounded-xl border ${p.ok?'bg-emerald-900/20 border-emerald-800/40':'bg-red-900/20 border-red-800/40'}`}>
                        <div>
                          <div className="text-xs font-bold text-white">{p.post}</div>
                          <div className="text-xs text-gray-500">{p.since}</div>
                        </div>
                        <div className={`text-xs font-bold ${p.ok?'text-emerald-400':'text-red-400'}`}>{p.guard}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
                    <h4 className="text-sm font-bold text-white mb-3">Patrol Route — Guard A (Tonight)</h4>
                    {[
                      {checkpoint:'Lobby',time:'02:00',due:'02:00',ok:true},
                      {checkpoint:'Server Room',time:'02:08',due:'02:08',ok:true},
                      {checkpoint:'Car Park',time:'—',due:'02:16',ok:false},
                      {checkpoint:'Perimeter Gate',time:'02:31',due:'02:24',ok:false,late:true},
                    ].map(c=>(
                      <div key={c.checkpoint} className="flex items-center gap-2 py-2 border-b border-gray-800 last:border-0">
                        <div className={`w-2 h-2 rounded-full shrink-0 ${c.ok?'bg-emerald-500':c.late?'bg-amber-500':'bg-red-500'}`}/>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-semibold text-white">{c.checkpoint}</div>
                          <div className="text-xs text-gray-500">Due {c.due}</div>
                        </div>
                        <div className={`text-xs font-bold ${c.ok?'text-emerald-400':c.late?'text-amber-400':'text-red-400'}`}>{c.time || 'Missed'}</div>
                      </div>
                    ))}
                  </div>

                  <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
                    <h4 className="text-sm font-bold text-white mb-3">Recent Incident Response Times</h4>
                    {[
                      {incident:'Perimeter breach',date:'Mon 03:14',response:'2m 18s',ok:true},
                      {incident:'Fire door alert',date:'Wed 22:40',response:'8m 45s',ok:false},
                      {incident:'Unauth. entry',date:'Thu 01:55',response:'1m 52s',ok:true},
                      {incident:'Post abandonment',date:'Thu 02:08',response:'3m 11s',ok:true},
                    ].map(r=>(
                      <div key={r.incident+r.date} className="flex items-center gap-2 py-2 border-b border-gray-800 last:border-0">
                        <div className={`w-2 h-2 rounded-full shrink-0 ${r.ok?'bg-emerald-500':'bg-red-500'}`}/>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-semibold text-white truncate">{r.incident}</div>
                          <div className="text-xs text-gray-500">{r.date}</div>
                        </div>
                        <div className={`text-xs font-bold ${r.ok?'text-emerald-400':'text-red-400'}`}>{r.response}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <IndustryPricing plans={PRICING} accentColor="#94a3b8" industryLabel="Security & Guard Services" />

      <section id="demo" className="py-20 px-4 bg-gradient-to-br from-slate-700 to-gray-900">
        <div className="max-w-4xl mx-auto text-center text-white">
          <h2 className="text-4xl font-extrabold mb-4">AI-verified patrol logs. Zero paperwork. Real-time post monitoring.</h2>
          <p className="text-slate-300 text-lg mb-8">We configure LenzAI for your site and deliver live guard tracking data within 48 hours.</p>
          <Link href="/#contact" className="inline-flex items-center gap-2 bg-white text-slate-800 font-bold px-10 py-4 rounded-xl hover:bg-slate-100 transition-all shadow-2xl text-base">Book Free On-Site Demo <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg></Link>
        </div>
      </section>

      <footer className="py-8 px-4 bg-gray-950 border-t border-gray-900 text-center text-sm text-gray-600">
        <div className="flex items-center justify-center gap-2 mb-3"><div className="w-7 h-7 bg-gradient-to-br from-blue-600 to-violet-600 rounded-lg flex items-center justify-center text-white font-bold text-xs">LA</div><span className="font-extrabold text-white">LenzAI</span></div>
        <div className="flex flex-wrap items-center justify-center gap-4 mb-2">
          <Link href="/" className="hover:text-white">Home</Link>
          <Link href="/industries/factory" className="hover:text-white">Factory</Link>
          <Link href="/industries/hospital" className="hover:text-white">Hospital</Link>
          <Link href="/industries/construction" className="hover:text-white">Construction</Link>
          <Link href="/industries/warehouse" className="hover:text-white">Warehouse</Link>
          <Link href="/industries/restaurant" className="hover:text-white">Restaurant</Link>
        </div>
        <p>© {new Date().getFullYear()} LenzAI · AI-Powered Workforce Intelligence</p>
      </footer>
    </div>
  );
}
