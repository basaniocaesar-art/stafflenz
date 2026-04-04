'use client';
import Link from 'next/link';
import PipelineDemoSection from '@/components/PipelineDemoSection';
import CameraGrid from '@/components/CameraGrid';
import IndustryPricing from '@/components/IndustryPricing';

const PRICING = [
  {
    name: 'Starter', price: 89, ideal: 'Single site', highlight: false,
    features: ['1 construction site', 'Up to 25 workers', '8 cameras (8-ch DVR)', 'PPE + muster check', 'WhatsApp alerts', 'Daily site report'],
  },
  {
    name: 'Professional', price: 179, ideal: 'Growing contractors', highlight: true,
    features: ['Up to 3 sites', 'Up to 60 workers', '16 cameras per site (16-ch DVR)', 'Contractor invoice audit', 'Danger zone enforcement', 'After-hours security', 'Ghost worker detection'],
  },
  {
    name: 'Enterprise', price: 349, ideal: 'Large contractors', highlight: false,
    features: ['Up to 10 sites', 'Up to 100 workers', '32 cameras per site (32-ch DVR)', 'Multi-project dashboard', 'Custom zone rules', 'API access', 'Dedicated support'],
  },
];

const FRAMES = [
  {
    sceneLabel: 'Harness Violation',
    sceneIcon: '⛑️',
    sceneDescription: 'Scaffold Level 4 scan — checking harness compliance for elevated work zones',
    zone: 'Scaffold Level 4 · CAM 07',
    camId: '07',
    aiPrompt: 'Is the worker on the scaffold wearing a safety harness and hard hat?',
    detections: [
      { label: '⚠ No Harness Detected', color: '#ef4444', x: '20%', y: '10%', w: '32%', h: '65%' },
      { label: 'Hard Hat ✓', color: '#f59e0b', x: '22%', y: '12%', w: '12%', h: '15%' },
    ],
    output: {
      icon: '🚨', title: 'Harness Violation — Scaffold L4', tag: 'Safety Alert · Height Zone',
      borderColor: '#ef444460', bgColor: '#450a0a40', iconBg: '#ef4444', tagColor: '#fca5a5',
      lines: [
        { icon: '🔴', text: 'Worker at Scaffold Level 4 — no harness detected' },
        { icon: '⛑️', text: 'Hard hat present — harness MISSING' },
        { icon: '📍', text: 'Scaffold L4 · Cam 07 · 10:18 AM' },
      ],
      action: '🚨 Site supervisor alerted — work stopped until compliant',
      whatsapp: '🚨 *HARNESS VIOLATION — Scaffold Level 4*\n\nWorker without harness at height.\nHard hat: ✓ Harness: ✗\n\nScaffold L4 · Cam 07 · 10:18 AM\n\nStop work until harness is worn.',
    },
  },
  {
    sceneLabel: 'Morning Muster',
    sceneIcon: '👷',
    sceneDescription: '07:00 morning muster scan — verifying all contracted workers are on-site before work begins',
    zone: 'Site Assembly Point · CAM 01',
    camId: '01',
    aiPrompt: 'Count all workers present at the assembly point. Contracted total is 50.',
    detections: [
      { label: '47 Workers Detected ✓', color: '#10b981', x: '5%', y: '15%', w: '85%', h: '70%' },
      { label: '3 Absent ⚠', color: '#f59e0b', x: '60%', y: '5%', w: '35%', h: '20%' },
    ],
    output: {
      icon: '👷', title: 'Muster: 3 Workers Absent', tag: 'Muster Report · 07:00',
      borderColor: '#f59e0b60', bgColor: '#2d1b0040', iconBg: '#f59e0b', tagColor: '#fcd34d',
      lines: [
        { icon: '✅', text: '47 of 50 workers confirmed on-site at 07:00' },
        { icon: '⚠️', text: '3 absent — names sent to site manager' },
        { icon: '📋', text: 'Work cannot begin until crew shortage resolved' },
      ],
      action: '📢 Site manager notified — contractor informed',
      whatsapp: '👷 *MORNING MUSTER — 07:00*\n\nPresent: 47 / Expected: 50\n3 workers absent.\n\nSite Assembly · Cam 01\n\nPlease contact absent workers before work begins.',
    },
  },
  {
    sceneLabel: 'Danger Zone Breach',
    sceneIcon: '⚡',
    sceneDescription: 'Electrical panel zone — monitoring for unauthorised entry into exclusion zone',
    zone: 'Electrical Zone · CAM 09',
    camId: '09',
    aiPrompt: 'Has any person entered the electrical panel exclusion zone without authorisation?',
    detections: [
      { label: '⚠ UNAUTHORISED ENTRY', color: '#ef4444', x: '18%', y: '8%', w: '35%', h: '68%' },
    ],
    output: {
      icon: '⚡', title: 'Electrical Zone Breach', tag: 'Danger Zone Alert · Immediate',
      borderColor: '#ef444460', bgColor: '#450a0a40', iconBg: '#dc2626', tagColor: '#fca5a5',
      lines: [
        { icon: '🔴', text: 'Unauthorised person in electrical panel zone' },
        { icon: '⚡', text: 'Active live panels — high electrocution risk' },
        { icon: '📍', text: 'Electrical Zone · Cam 09 · 15:44' },
      ],
      action: '🚨 Site manager + safety officer alerted immediately',
      whatsapp: '🚨 *DANGER ZONE BREACH — Electrical*\n\nUnauthorised person in electrical zone.\nActive live panels — immediate risk.\n\nElectrical Zone · Cam 09 · 15:44\n\nEvacuate zone immediately.',
    },
  },
  {
    sceneLabel: 'Ghost Worker Audit',
    sceneIcon: '💰',
    sceneDescription: 'End-of-day contractor headcount — comparing verified presence against invoice',
    zone: 'Ground Level · CAM 03',
    camId: '03',
    aiPrompt: 'Count all workers still present on site. BuildRight Contractors billed 15 today.',
    detections: [
      { label: 'Worker 1 ✓', color: '#10b981', x: '5%', y: '22%', w: '16%', h: '52%' },
      { label: 'Worker 2 ✓', color: '#10b981', x: '28%', y: '20%', w: '16%', h: '55%' },
      { label: 'Worker 3 ✓', color: '#10b981', x: '52%', y: '23%', w: '16%', h: '50%' },
    ],
    output: {
      icon: '💰', title: 'Ghost Workers Detected', tag: 'Invoice Audit · BuildRight Co.',
      borderColor: '#f59e0b60', bgColor: '#2d1b0040', iconBg: '#d97706', tagColor: '#fcd34d',
      lines: [
        { icon: '📊', text: 'Billed: 15 · AI verified on-site: 12' },
        { icon: '👻', text: '3 ghost workers — never present today' },
        { icon: '💰', text: 'Invoice dispute report auto-generated' },
      ],
      action: '📄 Evidence sent to accounts for invoice challenge',
      whatsapp: '💰 *GHOST WORKERS — BuildRight Co.*\n\nBilled today: 15 workers\nAI verified: 12 workers\n3 ghost days flagged.\n\nGround Level · End of day audit\n\nInvoice dispute report sent to accounts.',
    },
  },
];

export default function ConstructionPage() {
  return (
    <div className="min-h-screen overflow-x-hidden">

      {/* Navbar */}
      <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-xl border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-gradient-to-br from-blue-600 to-violet-600 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-blue-200">SL</div>
            <span className="font-extrabold text-xl text-gray-900 tracking-tight">StaffLenz</span>
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
            <a href="#demo" className="hidden sm:block text-sm font-semibold text-yellow-600 hover:text-yellow-700">Book Demo</a>
            <Link href="/login" className="btn-primary text-sm px-5 bg-yellow-500 hover:bg-yellow-600 text-gray-900">Login →</Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative bg-[#0A0900] text-white overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-yellow-950/80 via-[#0A0900] to-amber-950/60" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-yellow-600/15 rounded-full blur-[120px]" />
        <div className="absolute inset-0 opacity-[0.04]" style={{backgroundImage:'linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)',backgroundSize:'50px 50px'}} />
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 pt-20 pb-24">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 bg-yellow-500/20 border border-yellow-400/30 rounded-full px-5 py-2 text-sm font-medium text-yellow-300 mb-6">🏗️ Construction & Infrastructure</div>
              <h1 className="text-5xl md:text-6xl font-extrabold mb-6 leading-[1.1] tracking-tight">
                Every worker on-site<br />is safe, accounted<br /><span className="bg-clip-text text-transparent bg-gradient-to-r from-yellow-400 to-amber-400">for, and helmeted.</span>
              </h1>
              <p className="text-lg text-slate-300 mb-8 leading-relaxed">
                StaffLenz monitors every zone of your construction site — verifying PPE per area, catching unauthorised entry into dangerous zones, verifying contractor headcount against daily muster rolls, and detecting security breaches after hours.
              </p>
              <div className="flex flex-wrap gap-4">
                <a href="#demo" className="inline-flex items-center gap-2 bg-yellow-500 text-gray-900 font-bold px-8 py-4 rounded-xl hover:bg-yellow-400 transition-all shadow-2xl shadow-yellow-900/40 text-base">Book a Free Demo <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg></a>
                <a href="#dashboard" className="inline-flex items-center gap-2 bg-white/10 border border-white/20 text-white font-semibold px-8 py-4 rounded-xl hover:bg-white/20 transition-all text-base">See the Dashboard</a>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[
                {n:'Daily Muster',l:'Headcount vs Contract',sub:'verify every worker is on-site before work begins'},
                {n:'PPE by Zone',l:'Hard hat · Harness · Hi-vis',sub:'different rules for scaffolding vs ground level vs offices'},
                {n:'Danger Zones',l:'No-Entry Enforcement',sub:'alert when anyone enters electrical or demolition zones'},
                {n:'After-Hours',l:'Site Security',sub:'detect unauthorised presence after workers leave'},
              ].map(({n,l,sub})=>(
                <div key={l} className="bg-white/5 border border-white/10 rounded-2xl p-5 backdrop-blur">
                  <div className="text-lg font-extrabold text-yellow-400 mb-1">{n}</div>
                  <div className="text-sm font-bold text-white">{l}</div>
                  <div className="text-xs text-slate-400 mt-0.5">{sub}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* What's unique */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <div className="section-label mb-4">Construction-Specific Intelligence</div>
            <h2 className="text-4xl font-extrabold text-gray-900 tracking-tight">Not just attendance. <br/>Who has a harness on the scaffold. Who just entered the exclusion zone.</h2>
            <p className="mt-4 text-gray-500 max-w-2xl mx-auto">Generic workforce tools can not tell you that a worker climbed onto scaffolding without a harness, or that an unknown person entered the electrical panel zone at 11 PM. StaffLenz can.</p>
          </div>

          <div className="grid lg:grid-cols-2 gap-8">
            <div className="card p-7 border-l-4 border-l-yellow-400">
              <div className="text-3xl mb-3">👷</div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Daily Muster & Contractor Verification</h3>
              <p className="text-gray-500 text-sm mb-4 leading-relaxed">Before any work begins each morning, StaffLenz runs a headcount of every worker on-site and compares it to the daily muster roll. Any worker not yet on-site is flagged. At month end, AI-verified attendance is compared to contractor invoices to catch ghost workers.</p>
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-sm">
                <div className="font-bold text-yellow-800 mb-2">Morning muster report (07:00):</div>
                <ul className="space-y-1 text-yellow-700">
                  <li>⚠ 3 workers not yet on-site — names sent to site manager</li>
                  <li>✓ 47 of 50 workers confirmed present</li>
                  <li>💰 This month: 6 ghost contract days flagged — invoice challenged</li>
                </ul>
              </div>
            </div>

            <div className="card p-7 border-l-4 border-l-orange-400">
              <div className="text-3xl mb-3">⛑️</div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Zone-Specific PPE Enforcement</h3>
              <p className="text-gray-500 text-sm mb-4 leading-relaxed">Different areas demand different PPE. Scaffolding requires hard hat + harness. Ground level requires hard hat + hi-vis vest. The site office requires nothing. StaffLenz checks each zone independently — so you catch the exact worker, in the exact zone, missing the exact piece of equipment.</p>
              <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 text-sm">
                <div className="font-bold text-orange-800 mb-2">Zone-specific violations detected:</div>
                <ul className="space-y-1 text-orange-700">
                  <li>🔴 Scaffold Level 3: Worker without harness detected</li>
                  <li>🔴 Ground Crew: 2 workers without hi-vis vest</li>
                  <li>✅ Electrical Panel Zone: No violations</li>
                </ul>
              </div>
            </div>

            <div className="card p-7 border-l-4 border-l-red-400">
              <div className="text-3xl mb-3">🚧</div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Danger Zone & Exclusion Area Enforcement</h3>
              <p className="text-gray-500 text-sm mb-4 leading-relaxed">Electrical panels, demolition zones, and active crane areas are flagged as exclusion zones. StaffLenz sends an immediate alert the moment any person enters these areas without clearance — giving site supervisors a real-time intervention window before an incident occurs.</p>
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm">
                <div className="font-bold text-red-800 mb-2">Exclusion zone alerts:</div>
                <ul className="space-y-1 text-red-700">
                  <li>🔴 Crane swing zone: Person detected — alert sent immediately</li>
                  <li>🔴 Electrical panel area: Unauthorised entry at 15:44</li>
                  <li>✅ Demolition block: No entries since clearance issued</li>
                </ul>
              </div>
            </div>

            <div className="card p-7 border-l-4 border-l-slate-400">
              <div className="text-3xl mb-3">🌙</div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">After-Hours Site Security</h3>
              <p className="text-gray-500 text-sm mb-4 leading-relaxed">Construction sites are targets for equipment theft and material pilferage at night. StaffLenz monitors all cameras after workers leave, detecting any unauthorised person on-site and sending an immediate alert to the site manager and security team — preventing losses before they happen.</p>
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm">
                <div className="font-bold text-slate-800 mb-2">Last night&apos;s security summary:</div>
                <ul className="space-y-1 text-slate-700">
                  <li>✅ Site perimeter: No unauthorised detections 20:00–06:00</li>
                  <li>✅ Equipment yard: Secure all night</li>
                  <li>📱 Morning summary sent to project manager at 06:00</li>
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
            <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-yellow-400 bg-yellow-950/60 border border-yellow-800/50 px-4 py-1.5 rounded-full mb-4">Live Dashboard</div>
            <h2 className="text-4xl font-extrabold text-white tracking-tight">What your site manager sees every morning.</h2>
          </div>

          <div className="bg-gray-900 rounded-3xl border border-gray-700 overflow-hidden shadow-2xl">
            <div className="bg-gray-800 px-4 py-3 flex items-center gap-2 border-b border-gray-700">
              <div className="flex gap-1.5"><div className="w-3 h-3 rounded-full bg-red-500"/><div className="w-3 h-3 rounded-full bg-yellow-500"/><div className="w-3 h-3 rounded-full bg-green-500"/></div>
              <div className="flex-1 bg-gray-700 rounded-lg px-3 py-1 text-xs text-gray-400 text-center mx-4">app.stafflenz.com/construction</div>
            </div>
            <div className="flex h-[640px]">
              <div className="w-52 bg-gray-950 border-r border-gray-800 p-4 shrink-0 flex flex-col">
                <div className="flex items-center gap-2 mb-5 px-1">
                  <div className="w-7 h-7 bg-gradient-to-br from-blue-600 to-violet-600 rounded-lg flex items-center justify-center text-white font-bold text-xs">SL</div>
                  <span className="font-bold text-white text-sm">StaffLenz</span>
                </div>
                <div className="bg-yellow-500/20 border border-yellow-500/30 rounded-xl px-3 py-2 mb-4">
                  <div className="text-xs font-bold text-yellow-400">🏗️ Construction</div>
                  <div className="text-xs text-gray-400 mt-0.5">Horizon Tower Project</div>
                </div>
                {[{i:'📊',l:'Dashboard',a:true},{i:'👷',l:'Muster Roll'},{i:'⛑️',l:'PPE Compliance'},{i:'🚧',l:'Zone Access'},{i:'🌙',l:'Night Security'},{i:'🕐',l:'Attendance'}].map(item=>(
                  <div key={item.l} className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl mb-0.5 text-xs cursor-pointer ${item.a?'bg-yellow-500/20 text-yellow-400 font-bold':'text-gray-400 hover:text-white'}`}>{item.i} {item.l}</div>
                ))}
              </div>

              <div className="flex-1 overflow-auto p-5 bg-gray-950 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-extrabold text-white">Construction Site Dashboard</h3>
                    <p className="text-xs text-gray-500">Thursday 3 Apr · Day Shift · Last scan 4 min ago</p>
                  </div>
                  <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400 bg-emerald-900/40 border border-emerald-800/50 px-3 py-1.5 rounded-full"><span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"/>Live</span>
                </div>

                <div className="grid grid-cols-4 gap-3">
                  {[
                    {l:'On-Site',v:'47',s:'of 50 mustered',c:'text-emerald-400',bg:'bg-emerald-900/30 border-emerald-800/40'},
                    {l:'PPE Violations',v:'3',s:'scaffold + ground',c:'text-red-400',bg:'bg-red-900/30 border-red-800/40'},
                    {l:'Zone Breaches',v:'2',s:'crane + electrical',c:'text-amber-400',bg:'bg-amber-900/30 border-amber-800/40'},
                    {l:'Contractors',v:'22',s:'of 25 billed today',c:'text-blue-400',bg:'bg-blue-900/30 border-blue-800/40'},
                  ].map(k=>(
                    <div key={k.l} className={`border rounded-xl p-3 ${k.bg}`}>
                      <div className={`text-2xl font-extrabold ${k.c}`}>{k.v}</div>
                      <div className="text-xs font-bold text-white mt-0.5">{k.l}</div>
                      <div className="text-xs text-gray-500">{k.s}</div>
                    </div>
                  ))}
                </div>

                <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
                  <h4 className="text-sm font-bold text-white mb-3">Zone Coverage & PPE Status — Right Now</h4>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      {name:'Scaffold Level 1–3',workers:8,ppe:'Harness + helmet',ok:true},
                      {name:'Scaffold Level 4+',workers:4,ppe:'Harness + helmet',ok:false,issue:'1 worker no harness'},
                      {name:'Ground Level',workers:18,ppe:'Helmet + hi-vis',ok:false,issue:'2 missing hi-vis'},
                      {name:'Crane Zone',workers:3,ppe:'Authorised only',ok:true},
                      {name:'Electrical Panel',workers:2,ppe:'Authorised only',ok:false,issue:'1 unauth. entry'},
                      {name:'Site Office',workers:5,ppe:'No requirement',ok:true},
                    ].map(z=>(
                      <div key={z.name} className={`px-3 py-2.5 rounded-xl border ${z.ok?'bg-emerald-900/20 border-emerald-800/40':'bg-red-900/20 border-red-800/40'}`}>
                        <div className="flex items-center justify-between">
                          <div className="text-xs font-bold text-white">{z.name}</div>
                          <div className={`text-xs font-bold ${z.ok?'text-emerald-400':'text-red-400'}`}>{z.workers} workers</div>
                        </div>
                        <div className="text-xs text-gray-500 mt-0.5">{z.issue || z.ppe}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
                    <h4 className="text-sm font-bold text-white mb-3">Morning Muster — 07:00 Check</h4>
                    {[
                      {crew:'Steel Frame Crew',arrived:12,total:12,ok:true},
                      {crew:'Concrete Crew',arrived:10,total:12,ok:false},
                      {crew:'Electrical Team',arrived:6,total:6,ok:true},
                      {crew:'Finishing Crew',arrived:8,total:8,ok:true},
                      {crew:'Crane Operators',arrived:2,total:2,ok:true},
                    ].map(c=>(
                      <div key={c.crew} className="flex items-center gap-2 py-2 border-b border-gray-800 last:border-0">
                        <div className={`w-2 h-2 rounded-full shrink-0 ${c.ok?'bg-emerald-500':'bg-amber-500'}`}/>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-semibold text-white truncate">{c.crew}</div>
                        </div>
                        <div className={`text-xs font-bold ${c.ok?'text-emerald-400':'text-amber-400'}`}>{c.arrived}/{c.total}</div>
                      </div>
                    ))}
                  </div>

                  <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
                    <h4 className="text-sm font-bold text-white mb-3">Contractor Invoice vs AI Verified</h4>
                    <div className="space-y-2.5">
                      {[
                        {agency:'BuildRight Contractors',billed:15,verified:13,ok:false},
                        {agency:'ProSteel Ltd.',billed:10,verified:10,ok:true},
                        {agency:'FastFix Labour',billed:12,verified:10,ok:false},
                      ].map(c=>(
                        <div key={c.agency} className={`px-3 py-2.5 rounded-xl border ${c.ok?'bg-gray-800/60 border-gray-700':'bg-red-900/20 border-red-800/40'}`}>
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-white">{c.agency}</span>
                            <span className={`text-xs font-bold ${c.ok?'text-emerald-400':'text-red-400'}`}>{c.verified}/{c.billed}</span>
                          </div>
                          {!c.ok && <div className="text-xs text-red-400 mt-1">{c.billed-c.verified} ghost workers billed</div>}
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 bg-amber-900/30 border border-amber-800/40 rounded-xl px-3 py-2">
                      <div className="text-xs font-bold text-amber-400">This month: 5 ghost days caught — invoices disputed</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <IndustryPricing plans={PRICING} accentColor="#eab308" industryLabel="Construction & Infrastructure" />
      <CameraGrid industry="construction" />
      <PipelineDemoSection frames={FRAMES} accentColor="#eab308" industry="construction" />

      <section id="demo" className="py-20 px-4 bg-gradient-to-br from-yellow-500 to-amber-600">
        <div className="max-w-4xl mx-auto text-center text-white">
          <h2 className="text-4xl font-extrabold mb-4 text-gray-900">Know who is on-site, helmeted, and in the right zone — live.</h2>
          <p className="text-yellow-900 text-lg mb-8">We configure StaffLenz for your site layout and deliver live muster and PPE data within 48 hours.</p>
          <Link href="/#contact" className="inline-flex items-center gap-2 bg-gray-900 text-yellow-400 font-bold px-10 py-4 rounded-xl hover:bg-gray-800 transition-all shadow-2xl text-base">Book Free On-Site Demo <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg></Link>
        </div>
      </section>

      <footer className="py-8 px-4 bg-gray-950 border-t border-gray-900 text-center text-sm text-gray-600">
        <div className="flex items-center justify-center gap-2 mb-3"><div className="w-7 h-7 bg-gradient-to-br from-blue-600 to-violet-600 rounded-lg flex items-center justify-center text-white font-bold text-xs">SL</div><span className="font-extrabold text-white">StaffLenz</span></div>
        <div className="flex flex-wrap items-center justify-center gap-4 mb-2">
          <Link href="/" className="hover:text-white">Home</Link>
          <Link href="/industries/factory" className="hover:text-white">Factory</Link>
          <Link href="/industries/hospital" className="hover:text-white">Hospital</Link>
          <Link href="/industries/warehouse" className="hover:text-white">Warehouse</Link>
          <Link href="/industries/restaurant" className="hover:text-white">Restaurant</Link>
          <Link href="/industries/security" className="hover:text-white">Security</Link>
        </div>
        <p>© {new Date().getFullYear()} StaffLenz · AI-Powered Workforce Intelligence</p>
      </footer>
    </div>
  );
}
