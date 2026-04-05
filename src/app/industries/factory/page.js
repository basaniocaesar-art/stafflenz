'use client';
import Link from 'next/link';
import PipelineDemoSection from '@/components/PipelineDemoSection';
import CameraGrid from '@/components/CameraGrid';
import IndustryPricing from '@/components/IndustryPricing';

const PRICING = [
  { name: 'Starter', price: 79, ideal: 'Small plants', highlight: false, features: ['Up to 5 production lines', 'Up to 25 workers', '8 cameras (8-ch DVR)', 'PPE zone monitoring', 'WhatsApp alerts', 'Daily shift report'] },
  { name: 'Professional', price: 149, ideal: 'Mid-size operations', highlight: true, features: ['Up to 15 production lines', 'Up to 60 workers', '16 cameras (16-ch DVR)', 'Contractor invoice audit', 'Night shift monitoring', 'Zone-specific PPE rules', 'Weekly analytics'] },
  { name: 'Enterprise', price: 299, ideal: 'Multi-site factories', highlight: false, features: ['Up to 30 production lines', 'Up to 100 workers', '32 cameras (32-ch DVR)', 'Multi-site dashboard', 'Custom alert rules', 'API access', 'Dedicated support'] },
];

const FRAMES = [
  {
    sceneLabel: 'PPE Violation',
    sceneIcon: '⛑️',
    sceneDescription: 'Worker detected at welding bay — helmet and face shield check in progress',
    zone: 'Welding Bay · CAM 02',
    camId: '02',
    aiPrompt: 'Is the worker wearing a helmet and face shield in this welding zone?',
    detections: [
      { label: '⚠ No Face Shield', color: '#ef4444', x: '20%', y: '15%', w: '28%', h: '60%' },
      { label: 'Helmet ✓', color: '#10b981', x: '60%', y: '20%', w: '22%', h: '55%' },
    ],
    output: {
      icon: '🚨', title: 'PPE Violation Detected', tag: 'Safety Alert · Welding Bay',
      borderColor: '#ef444460', bgColor: '#450a0a40', iconBg: '#ef4444', tagColor: '#fca5a5',
      lines: [
        { icon: '🔴', text: 'Worker at Welding Bay: face shield not detected' },
        { icon: '⛑️', text: 'Helmet present — face shield MISSING' },
        { icon: '📍', text: 'Zone: Welding Bay · Cam 02 · 10:43 AM' },
      ],
      action: '⚡ Zone supervisor notified immediately',
      whatsapp: '🚨 *PPE VIOLATION — Welding Bay*\n\nWorker detected without face shield.\nHelmet: ✓ Face Shield: ✗\n\nZone: Welding Bay · 10:43 AM\nCam 02 · Confidence: 94%\n\nPlease take corrective action.',
    },
  },
  {
    sceneLabel: 'Line Understaffed',
    sceneIcon: '🏗️',
    sceneDescription: 'Production Line B scan — checking operator count against minimum requirement',
    zone: 'Line B — Weaving · CAM 05',
    camId: '05',
    aiPrompt: 'How many workers are present at the production line? Minimum required is 4.',
    detections: [
      { label: 'Operator 1 ✓', color: '#10b981', x: '8%', y: '20%', w: '18%', h: '55%' },
      { label: 'Operator 2 ✓', color: '#10b981', x: '65%', y: '25%', w: '18%', h: '50%' },
      { label: '⚠ 2 Stations Empty', color: '#ef4444', x: '30%', y: '10%', w: '32%', h: '70%' },
    ],
    output: {
      icon: '⚠️', title: 'Line B Understaffed', tag: 'Production Alert · Line B',
      borderColor: '#f59e0b60', bgColor: '#451a0340', iconBg: '#f59e0b', tagColor: '#fcd34d',
      lines: [
        { icon: '👷', text: '2 of 4 required operators present — 2 short' },
        { icon: '🏗️', text: 'Line B: Weaving — output at risk' },
        { icon: '📍', text: 'Zone: Line B · Cam 05 · 11:12 AM' },
      ],
      action: '📢 Shift supervisor alerted to reassign staff',
      whatsapp: '⚠️ *LINE UNDERSTAFFED — Line B (Weaving)*\n\nOperators present: 2/4 required\n2 stations currently empty.\n\nLine B output at risk.\nCam 05 · 11:12 AM\n\nPlease reassign staff immediately.',
    },
  },
  {
    sceneLabel: 'Ghost Worker',
    sceneIcon: '📋',
    sceneDescription: 'End-of-day contractor headcount — comparing on-site staff vs agency invoice',
    zone: 'Assembly Floor · CAM 03',
    camId: '03',
    aiPrompt: 'Count all visible workers on the assembly floor and identify each person detected.',
    detections: [
      { label: 'Verified Worker 1', color: '#10b981', x: '5%', y: '20%', w: '16%', h: '55%' },
      { label: 'Verified Worker 2', color: '#10b981', x: '35%', y: '25%', w: '16%', h: '50%' },
      { label: 'Verified Worker 3', color: '#10b981', x: '62%', y: '22%', w: '16%', h: '52%' },
    ],
    output: {
      icon: '💰', title: 'Invoice Discrepancy Found', tag: 'Contractor Audit · BuildRight Co.',
      borderColor: '#f59e0b60', bgColor: '#2d1b0040', iconBg: '#d97706', tagColor: '#fcd34d',
      lines: [
        { icon: '📊', text: 'Billed: 12 workers · AI verified on-site: 10' },
        { icon: '👻', text: '2 ghost workers — never on-site today' },
        { icon: '💰', text: 'Discrepancy flagged for invoice dispute' },
      ],
      action: '📄 Evidence report auto-generated for accounts',
      whatsapp: '💰 *CONTRACTOR DISCREPANCY — BuildRight Co.*\n\nBilled workers: 12\nAI verified on-site: 10\n2 ghost workers detected.\n\nInvoice dispute report ready.\nDate: Today · Assembly Floor\n\nPlease review with accounts.',
    },
  },
  {
    sceneLabel: 'Night Shift Check',
    sceneIcon: '🌙',
    sceneDescription: 'Night shift 2 AM scan — monitoring all stations without a supervisor present',
    zone: 'Production Floor · CAM 01',
    camId: '01',
    aiPrompt: 'Are all production stations manned? Identify any empty station or absent worker.',
    detections: [
      { label: 'Station 1 — Active', color: '#10b981', x: '5%', y: '20%', w: '18%', h: '55%' },
      { label: '⚠ Station 3 — Empty', color: '#ef4444', x: '40%', y: '10%', w: '22%', h: '70%' },
      { label: 'Station 4 — Active', color: '#10b981', x: '68%', y: '22%', w: '18%', h: '52%' },
    ],
    output: {
      icon: '🌙', title: 'Night Shift Absence Detected', tag: 'Night Shift Alert · 02:14 AM',
      borderColor: '#6366f160', bgColor: '#1e1b4b40', iconBg: '#6366f1', tagColor: '#a5b4fc',
      lines: [
        { icon: '🌙', text: 'Night shift scan: 22/24 workers present' },
        { icon: '⚠️', text: 'Station 3 empty — Ramesh Kumar not detected' },
        { icon: '📍', text: 'Cam 01 · Production Floor · 02:14 AM' },
      ],
      action: '📱 6 AM summary sent to plant manager via WhatsApp',
      whatsapp: '🌙 *NIGHT SHIFT ALERT — 02:14 AM*\n\nStation 3 found empty.\nWorker: Ramesh Kumar — not detected.\n\nProduction Floor · Cam 01\nAll other 22 stations: ✓ Manned\n\nPlease follow up with night supervisor.',
    },
  },
];

export default function FactoryPage() {
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
            <a href="#demo" className="hidden sm:block text-sm font-semibold text-amber-600 hover:text-amber-700">Book Demo</a>
            <Link href="/login" className="btn-primary text-sm px-5 bg-amber-500 hover:bg-amber-600">Login →</Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative bg-[#0D0800] text-white overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-amber-950/80 via-[#0D0800] to-orange-950/60" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-amber-600/20 rounded-full blur-[120px]" />
        <div className="absolute inset-0 opacity-[0.04]" style={{backgroundImage:'linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)',backgroundSize:'50px 50px'}} />
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 pt-20 pb-24">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 bg-amber-500/20 border border-amber-400/30 rounded-full px-5 py-2 text-sm font-medium text-amber-300 mb-6">🏭 Factory & Manufacturing</div>
              <h1 className="text-5xl md:text-6xl font-extrabold mb-6 leading-[1.1] tracking-tight">
                Know if every<br />production line<br /><span className="bg-clip-text text-transparent bg-gradient-to-r from-amber-400 to-orange-400">is fully manned.</span>
              </h1>
              <p className="text-lg text-slate-300 mb-8 leading-relaxed">
                StaffLenz watches each production line, welding bay, and machine station independently. You see which line is short-staffed, which zones have PPE violations, and whether your contractor headcount matches what you're being billed for — all from one screen.
              </p>
              <div className="flex flex-wrap gap-4">
                <a href="#demo" className="inline-flex items-center gap-2 bg-amber-500 text-white font-bold px-8 py-4 rounded-xl hover:bg-amber-600 transition-all shadow-2xl shadow-amber-900/40 text-base">Book a Free Demo <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg></a>
                <a href="#dashboard" className="inline-flex items-center gap-2 bg-white/10 border border-white/20 text-white font-semibold px-8 py-4 rounded-xl hover:bg-white/20 transition-all text-base">See the Dashboard</a>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[
                {n:'Line-by-line',l:'Production Coverage',sub:'see exactly which stations are manned right now'},
                {n:'PPE by Zone',l:'Helmet / Vest / Gloves',sub:'different rules per zone, not blanket monitoring'},
                {n:'Contractor',l:'vs Permanent Staff',sub:'verify contractor headcount vs invoice'},
                {n:'Night Shift',l:'Monitoring',sub:'all 3 shifts covered — no supervisor needed on-site'},
              ].map(({n,l,sub})=>(
                <div key={l} className="bg-white/5 border border-white/10 rounded-2xl p-5 backdrop-blur">
                  <div className="text-lg font-extrabold text-amber-400 mb-1">{n}</div>
                  <div className="text-sm font-bold text-white">{l}</div>
                  <div className="text-xs text-slate-400 mt-0.5">{sub}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>


      <CameraGrid industry="factory" />

      <PipelineDemoSection frames={FRAMES} accentColor="#f59e0b" industry="factory" />


      {/* What's unique */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <div className="section-label mb-4">Factory-Specific Intelligence</div>
            <h2 className="text-4xl font-extrabold text-gray-900 tracking-tight">Not just "who is present." <br/>Which line is short. Which bay has a violation.</h2>
            <p className="mt-4 text-gray-500 max-w-2xl mx-auto">Generic workforce tools tell you headcount. StaffLenz tells you whether Line B needs one more operator before the next shift starts, and whether the welding bay has a helmet violation right now.</p>
          </div>

          <div className="grid lg:grid-cols-2 gap-8">
            {/* Production Line Coverage */}
            <div className="card p-7 border-l-4 border-l-amber-400">
              <div className="text-3xl mb-3">🏗️</div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Production Line Coverage</h3>
              <p className="text-gray-500 text-sm mb-4 leading-relaxed">Each production line is configured as a zone. StaffLenz counts how many operators are physically present at each line and alerts you when any line drops below its minimum required headcount — before output is affected.</p>
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm">
                <div className="font-bold text-amber-800 mb-2">Example alerts you'll get:</div>
                <ul className="space-y-1 text-amber-700">
                  <li>⚠ Line B: 2 of 4 required operators present — 2 short</li>
                  <li>⚠ Assembly Station 3: Unmanned for 18 minutes</li>
                  <li>✓ Line A, C, D: Fully staffed</li>
                </ul>
              </div>
            </div>

            {/* PPE by zone */}
            <div className="card p-7 border-l-4 border-l-orange-400">
              <div className="text-3xl mb-3">⛑️</div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Zone-Specific PPE Rules</h3>
              <p className="text-gray-500 text-sm mb-4 leading-relaxed">Different zones have different PPE requirements. Welding bays need helmets + face shields. Chemical stores need gloves + masks. Offices need nothing. StaffLenz checks the right PPE for the right zone — not a blanket rule for the entire factory.</p>
              <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 text-sm">
                <div className="font-bold text-orange-800 mb-2">Zone-specific compliance tracking:</div>
                <ul className="space-y-1 text-orange-700">
                  <li>🔴 Welding Bay: Suresh detected without face shield</li>
                  <li>✅ Chemical Store: All 3 workers PPE-compliant</li>
                  <li>✅ Assembly Floor: 12/12 wearing safety vest</li>
                </ul>
              </div>
            </div>

            {/* Contractor tracking */}
            <div className="card p-7 border-l-4 border-l-yellow-400">
              <div className="text-3xl mb-3">📋</div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Contractor vs Permanent Staff Tracking</h3>
              <p className="text-gray-500 text-sm mb-4 leading-relaxed">Tag each enrolled worker as permanent or contractor. At the end of the month, compare actual contractor hours tracked by the AI against what the manpower agency is invoicing you. Stop paying for ghost workers.</p>
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-sm">
                <div className="font-bold text-yellow-800 mb-2">What your monthly report shows:</div>
                <ul className="space-y-1 text-yellow-700">
                  <li>📊 Contractor days billed: 430 · Days verified by AI: 391</li>
                  <li>💰 Discrepancy: 39 ghost days flagged — invoice rejected this month</li>
                  <li>📄 Exportable as proof for agency dispute</li>
                </ul>
              </div>
            </div>

            {/* Night shift */}
            <div className="card p-7 border-l-4 border-l-red-400">
              <div className="text-3xl mb-3">🌙</div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Night Shift Monitoring Without a Supervisor</h3>
              <p className="text-gray-500 text-sm mb-4 leading-relaxed">Night shifts run without management on-site. StaffLenz monitors the entire factory floor through the night — detecting absentees, PPE violations, and zone breaches — and sends a summary to the plant manager's WhatsApp every morning at 6 AM.</p>
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm">
                <div className="font-bold text-red-800 mb-2">Your 6 AM WhatsApp summary:</div>
                <ul className="space-y-1 text-red-700">
                  <li>🌙 Night Shift (10 PM – 6 AM): 22/24 present</li>
                  <li>⚠ 2 absent: Ramesh (no call), Pradeep (late by 2h)</li>
                  <li>🛡 3 PPE alerts resolved, 0 zone violations</li>
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
            <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-amber-400 bg-amber-950/60 border border-amber-800/50 px-4 py-1.5 rounded-full mb-4">Live Dashboard</div>
            <h2 className="text-4xl font-extrabold text-white tracking-tight">What your plant manager sees every morning.</h2>
          </div>

          <div className="bg-gray-900 rounded-3xl border border-gray-700 overflow-hidden shadow-2xl">
            <div className="bg-gray-800 px-4 py-3 flex items-center gap-2 border-b border-gray-700">
              <div className="flex gap-1.5"><div className="w-3 h-3 rounded-full bg-red-500"/><div className="w-3 h-3 rounded-full bg-yellow-500"/><div className="w-3 h-3 rounded-full bg-green-500"/></div>
              <div className="flex-1 bg-gray-700 rounded-lg px-3 py-1 text-xs text-gray-400 text-center mx-4">app.stafflenz.com/factory</div>
            </div>
            <div className="flex h-[640px]">
              {/* Sidebar */}
              <div className="w-52 bg-gray-950 border-r border-gray-800 p-4 shrink-0 flex flex-col">
                <div className="flex items-center gap-2 mb-5 px-1">
                  <div className="w-7 h-7 bg-gradient-to-br from-blue-600 to-violet-600 rounded-lg flex items-center justify-center text-white font-bold text-xs">SL</div>
                  <span className="font-bold text-white text-sm">StaffLenz</span>
                </div>
                <div className="bg-amber-500/20 border border-amber-500/30 rounded-xl px-3 py-2 mb-4">
                  <div className="text-xs font-bold text-amber-400">🏭 Factory</div>
                  <div className="text-xs text-gray-400 mt-0.5">Coimbatore Textiles</div>
                </div>
                {[{i:'📊',l:'Dashboard',a:true},{i:'🏗️',l:'Production Lines'},{i:'⛑️',l:'PPE Compliance'},{i:'👷',l:'Workers'},{i:'🕐',l:'Attendance'},{i:'📹',l:'Zones'}].map(item=>(
                  <div key={item.l} className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl mb-0.5 text-xs cursor-pointer ${item.a?'bg-amber-500/20 text-amber-400 font-bold':'text-gray-400 hover:text-white'}`}>{item.i} {item.l}</div>
                ))}
              </div>

              {/* Main */}
              <div className="flex-1 overflow-auto p-5 bg-gray-950 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-extrabold text-white">Factory Dashboard</h3>
                    <p className="text-xs text-gray-500">Wednesday 2 Apr · Morning Shift · Last scan 3 min ago</p>
                  </div>
                  <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400 bg-emerald-900/40 border border-emerald-800/50 px-3 py-1.5 rounded-full"><span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"/>Live</span>
                </div>

                {/* KPIs */}
                <div className="grid grid-cols-4 gap-3">
                  {[
                    {l:'Present',v:'87',s:'of 95',c:'text-emerald-400',bg:'bg-emerald-900/30 border-emerald-800/40'},
                    {l:'PPE Violations',v:'3',s:'2 welding, 1 chem',c:'text-red-400',bg:'bg-red-900/30 border-red-800/40'},
                    {l:'Lines Short-staffed',v:'1',s:'Line B — 2 short',c:'text-amber-400',bg:'bg-amber-900/30 border-amber-800/40'},
                    {l:'Contractors On-site',v:'24',s:'of 28 billed today',c:'text-blue-400',bg:'bg-blue-900/30 border-blue-800/40'},
                  ].map(k=>(
                    <div key={k.l} className={`border rounded-xl p-3 ${k.bg}`}>
                      <div className={`text-2xl font-extrabold ${k.c}`}>{k.v}</div>
                      <div className="text-xs font-bold text-white mt-0.5">{k.l}</div>
                      <div className="text-xs text-gray-500">{k.s}</div>
                    </div>
                  ))}
                </div>

                {/* Production Line Status */}
                <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
                  <h4 className="text-sm font-bold text-white mb-3">Production Line Coverage — Right Now</h4>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      {name:'Line A — Spinning',req:4,present:4,ok:true},
                      {name:'Line B — Weaving',req:4,present:2,ok:false},
                      {name:'Line C — Dyeing',req:3,present:3,ok:true},
                      {name:'Welding Bay',req:2,present:2,ok:true,ppe:'⚠ 1 PPE alert'},
                      {name:'Assembly Floor',req:6,present:6,ok:true},
                      {name:'Chemical Store',req:2,present:1,ok:false},
                    ].map(line=>(
                      <div key={line.name} className={`flex items-center justify-between px-3 py-2.5 rounded-xl border ${line.ok?'bg-emerald-900/20 border-emerald-800/40':'bg-red-900/20 border-red-800/40'}`}>
                        <div>
                          <div className="text-xs font-bold text-white">{line.name}</div>
                          {line.ppe && <div className="text-xs text-amber-400 mt-0.5">{line.ppe}</div>}
                        </div>
                        <div className="text-right">
                          <div className={`text-sm font-extrabold ${line.ok?'text-emerald-400':'text-red-400'}`}>{line.present}/{line.req}</div>
                          <div className="text-xs text-gray-500">{line.ok?'Fully staffed':'Understaffed'}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Two col */}
                <div className="grid grid-cols-2 gap-4">
                  {/* PPE by zone */}
                  <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
                    <h4 className="text-sm font-bold text-white mb-3">PPE Compliance by Zone</h4>
                    {[
                      {zone:'Welding Bay',compliant:3,total:4,item:'Helmet + face shield'},
                      {zone:'Chemical Store',compliant:1,total:1,item:'Gloves + mask'},
                      {zone:'Assembly Floor',compliant:6,total:6,item:'Safety vest'},
                      {zone:'Loading Dock',compliant:4,total:4,item:'Hi-vis jacket'},
                    ].map(z=>(
                      <div key={z.zone} className="flex items-center gap-2 py-2 border-b border-gray-800 last:border-0">
                        <div className={`w-2 h-2 rounded-full shrink-0 ${z.compliant===z.total?'bg-emerald-500':'bg-red-500'}`}/>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-semibold text-white">{z.zone}</div>
                          <div className="text-xs text-gray-500">{z.item}</div>
                        </div>
                        <div className={`text-xs font-bold ${z.compliant===z.total?'text-emerald-400':'text-red-400'}`}>{z.compliant}/{z.total}</div>
                      </div>
                    ))}
                  </div>

                  {/* Contractor tracker */}
                  <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
                    <h4 className="text-sm font-bold text-white mb-3">Contractor Headcount vs Invoice</h4>
                    <div className="space-y-2.5">
                      {[
                        {agency:'Suresh Labour Co.',billed:12,verified:10,ok:false},
                        {agency:'Apex Staffing Co.',billed:8,verified:8,ok:true},
                        {agency:'TN Contractors',billed:8,verified:6,ok:false},
                      ].map(c=>(
                        <div key={c.agency} className={`px-3 py-2.5 rounded-xl border ${c.ok?'bg-gray-800/60 border-gray-700':'bg-red-900/20 border-red-800/40'}`}>
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-white">{c.agency}</span>
                            <span className={`text-xs font-bold ${c.ok?'text-emerald-400':'text-red-400'}`}>{c.verified}/{c.billed} verified</span>
                          </div>
                          {!c.ok && <div className="text-xs text-red-400 mt-1">{c.billed-c.verified} workers billed but not on-site</div>}
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 bg-amber-900/30 border border-amber-800/40 rounded-xl px-3 py-2">
                      <div className="text-xs font-bold text-amber-400">This month: 4 ghost days caught — billing discrepancy flagged</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <IndustryPricing plans={PRICING} accentColor="#f59e0b" industryLabel="Factory & Manufacturing" />

      {/* CTA */}
      <section id="demo" className="py-20 px-4 bg-gradient-to-br from-amber-600 to-orange-700">
        <div className="max-w-4xl mx-auto text-center text-white">
          <h2 className="text-4xl font-extrabold mb-4">See exactly which line is short-staffed — live.</h2>
          <p className="text-amber-100 text-lg mb-8">We install the device at your factory and show you live production line data within 48 hours.</p>
          <Link href="/#contact" className="inline-flex items-center gap-2 bg-white text-amber-700 font-bold px-10 py-4 rounded-xl hover:bg-amber-50 transition-all shadow-2xl text-base">Book Free On-Site Demo <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg></Link>
        </div>
      </section>

      <footer className="py-8 px-4 bg-gray-950 border-t border-gray-900 text-center text-sm text-gray-600">
        <div className="flex items-center justify-center gap-2 mb-3"><div className="w-7 h-7 bg-gradient-to-br from-blue-600 to-violet-600 rounded-lg flex items-center justify-center text-white font-bold text-xs">SL</div><span className="font-extrabold text-white">StaffLenz</span></div>
        <div className="flex flex-wrap items-center justify-center gap-4 mb-2">
          <Link href="/" className="hover:text-white">Home</Link>
          <Link href="/industries/hotel" className="hover:text-white">Hotel</Link>
          <Link href="/industries/school" className="hover:text-white">School</Link>
          <Link href="/industries/retail" className="hover:text-white">Retail</Link>
        </div>
        <p>© {new Date().getFullYear()} StaffLenz · AI-Powered Workforce Intelligence</p>
      </footer>
    </div>
  );
}
