'use client';
import Link from 'next/link';
import PipelineDemoSection from '@/components/PipelineDemoSection';
import CameraGrid from '@/components/CameraGrid';
import IndustryPricing from '@/components/IndustryPricing';

const PRICING = [
  {
    name: 'Starter', price: 69, ideal: 'Single restaurant', highlight: false,
    features: ['Up to 6 kitchen stations', 'Up to 25 staff', '8 cameras (8-ch DVR)', 'Hygiene PPE alerts', 'WhatsApp alerts', 'Service report'],
  },
  {
    name: 'Professional', price: 129, ideal: 'Restaurant groups', highlight: true,
    features: ['Up to 3 locations', 'Up to 60 staff', '16 cameras per location (16-ch DVR)', 'Cover ratio monitoring', 'Break overlap alerts', 'Station coverage live', 'Food safety audit log'],
  },
  {
    name: 'Enterprise', price: 249, ideal: 'Chains & franchises', highlight: false,
    features: ['Up to 10 locations', 'Up to 100 staff', '32 cameras per location (32-ch DVR)', 'Chain dashboard', 'Franchise benchmarking', 'Custom station rules', 'API access', 'Dedicated support'],
  },
];

const FRAMES = [
  {
    sceneLabel: 'Grill Unmanned',
    video_query: 'restaurant kitchen grill cooking station chef',
    sceneIcon: '🔥',
    sceneDescription: 'Kitchen grill station scan — checking staffing during Saturday dinner service',
    zone: 'Kitchen Grill Station · CAM 02',
    camId: '02',
    aiPrompt: 'Is a chef present at the grill station? Dinner service is active with 43 covers.',
    detections: [
      { label: '⚠ Grill Station Empty', color: '#ef4444', x: '10%', y: '10%', w: '75%', h: '60%' },
    ],
    output: {
      icon: '🚨', title: 'Grill Station Unmanned', tag: 'Service Alert · Dinner · 8 min',
      borderColor: '#ef444460', bgColor: '#450a0a40', iconBg: '#ef4444', tagColor: '#fca5a5',
      lines: [
        { icon: '🔴', text: 'Grill station unmanned for 8 minutes — dinner service' },
        { icon: '🍽️', text: '43 covers active — grill orders backing up' },
        { icon: '📍', text: 'Kitchen · Cam 02 · 20:12' },
      ],
      action: '⚡ Head chef and manager alerted immediately',
      whatsapp: '🚨 *GRILL STATION UNMANNED*\n\nGrill empty for 8 minutes.\n43 covers seated — orders backing up.\n\nKitchen · Cam 02 · 20:12\n\nPlease return chef to grill immediately.',
    },
  },
  {
    sceneLabel: 'Hygiene Violation',
    video_query: 'restaurant kitchen hygiene gloves hairnet food safety',
    sceneIcon: '🧤',
    sceneDescription: 'Prep station hygiene scan — verifying hairnet and gloves for all prep staff',
    zone: 'Prep Station · CAM 03',
    camId: '03',
    aiPrompt: 'Are all prep station staff wearing hairnets and gloves as required by food safety standards?',
    detections: [
      { label: '⚠ No Hairnet — Staff A', color: '#ef4444', x: '12%', y: '12%', w: '28%', h: '62%' },
      { label: 'Staff B — Compliant ✓', color: '#10b981', x: '55%', y: '15%', w: '28%', h: '60%' },
    ],
    output: {
      icon: '🧤', title: 'Hygiene Violation — Prep', tag: 'Food Safety Alert · Prep Station',
      borderColor: '#ef444460', bgColor: '#450a0a40', iconBg: '#ef4444', tagColor: '#fca5a5',
      lines: [
        { icon: '🔴', text: 'Prep staff member detected without hairnet' },
        { icon: '✅', text: 'Staff B: gloves + hairnet + apron — compliant' },
        { icon: '📍', text: 'Prep Station · Cam 03 · 18:45' },
      ],
      action: '⚡ Head chef notified for immediate corrective action',
      whatsapp: '🚨 *HYGIENE VIOLATION — Prep Station*\n\nStaff member without hairnet detected.\nFood Safety requirement breached.\n\nPrep Station · Cam 03 · 18:45\n\nPlease ensure full PPE compliance immediately.',
    },
  },
  {
    sceneLabel: 'Break Overlap',
    video_query: 'restaurant staff break room employees sitting',
    sceneIcon: '⏰',
    sceneDescription: 'Break room scan during Friday dinner peak — monitoring simultaneous breaks',
    zone: 'Staff Break Room · CAM 06',
    camId: '06',
    aiPrompt: 'How many staff are currently in the break room? Limit during dinner service is 2.',
    detections: [
      { label: 'Chef Rajan — Grill', color: '#f59e0b', x: '5%', y: '20%', w: '22%', h: '55%' },
      { label: 'Waiter Tom — Floor', color: '#f59e0b', x: '35%', y: '22%', w: '22%', h: '52%' },
      { label: 'Sous Chef Priya', color: '#f59e0b', x: '65%', y: '18%', w: '22%', h: '56%' },
    ],
    output: {
      icon: '⏰', title: '3 Staff on Break — Dinner Peak', tag: 'Break Overlap Alert · 20:15',
      borderColor: '#f59e0b60', bgColor: '#2d1b0040', iconBg: '#f59e0b', tagColor: '#fcd34d',
      lines: [
        { icon: '⚠️', text: '3 staff simultaneously in break room — limit is 2' },
        { icon: '🔥', text: 'Grill + prep both short-staffed during dinner peak' },
        { icon: '📍', text: 'Break Room · Cam 06 · 20:15' },
      ],
      action: '📢 Manager alerted — 1 staff recalled to kitchen',
      whatsapp: '⚠️ *BREAK OVERLAP — Dinner Service*\n\n3 staff on break simultaneously.\nLimit during service: 2.\n\nGrill + prep both short-staffed.\nBreak Room · Cam 06 · 20:15\n\nPlease recall 1 staff to kitchen.',
    },
  },
  {
    sceneLabel: 'Floor Ratio Alert',
    video_query: 'busy restaurant dining room tables guests waiters',
    sceneIcon: '🍷',
    sceneDescription: 'Restaurant floor scan — checking waiter-to-cover ratio during lunch rush',
    zone: 'Restaurant Floor · CAM 01',
    camId: '01',
    aiPrompt: 'How many floor staff are visible in the restaurant? How many tables appear occupied?',
    detections: [
      { label: 'Waiter Priya ✓', color: '#10b981', x: '5%', y: '18%', w: '18%', h: '58%' },
      { label: '⚠ 42 Covers · 3 Staff', color: '#ef4444', x: '30%', y: '8%', w: '60%', h: '60%' },
    ],
    output: {
      icon: '🍷', title: 'Cover Ratio Exceeded', tag: 'Service Alert · Lunch Rush',
      borderColor: '#ef444460', bgColor: '#450a0a40', iconBg: '#ef4444', tagColor: '#fca5a5',
      lines: [
        { icon: '🍽️', text: '42 covers seated · 3 floor staff present' },
        { icon: '📊', text: 'Ratio 1:14 — target is 1:8' },
        { icon: '⚠️', text: '2 waiters in staff room during service' },
      ],
      action: '📢 F&B manager alerted — staff recalled to floor',
      whatsapp: '⚠️ *COVER RATIO ALERT*\n\n42 covers seated.\nFloor staff: 3 (target: min 5)\nRatio: 1:14 (target: 1:8)\n\n2 waiters in staff room.\nRestaurant Floor · 12:48\n\nPlease recall floor staff immediately.',
    },
  },
];

export default function RestaurantPage() {
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
            <a href="#demo" className="hidden sm:block text-sm font-semibold text-orange-600 hover:text-orange-700">Book Demo</a>
            <Link href="/login" className="btn-primary text-sm px-5 bg-orange-500 hover:bg-orange-600">Login →</Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative bg-[#0D0400] text-white overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-orange-950/80 via-[#0D0400] to-red-950/60" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-orange-600/15 rounded-full blur-[120px]" />
        <div className="absolute inset-0 opacity-[0.04]" style={{backgroundImage:'linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)',backgroundSize:'50px 50px'}} />
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 pt-20 pb-24">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 bg-orange-500/20 border border-orange-400/30 rounded-full px-5 py-2 text-sm font-medium text-orange-300 mb-6">🍽️ Restaurant & Food Service</div>
              <h1 className="text-5xl md:text-6xl font-extrabold mb-6 leading-[1.1] tracking-tight">
                Kitchen fully staffed.<br />Floor covered. Hygiene<br /><span className="bg-clip-text text-transparent bg-gradient-to-r from-orange-400 to-red-400">never in question.</span>
              </h1>
              <p className="text-lg text-slate-300 mb-8 leading-relaxed">
                LenzAI monitors your kitchen stations, floor cover ratios, and hygiene PPE compliance across every service period. Know when a station is unmanned during dinner service, when gloves are missing in the prep area, or when too many staff are on break at once.
              </p>
              <div className="flex flex-wrap gap-4">
                <a href="#demo" className="inline-flex items-center gap-2 bg-orange-500 text-white font-bold px-8 py-4 rounded-xl hover:bg-orange-600 transition-all shadow-2xl shadow-orange-900/40 text-base">Book a Free Demo <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg></a>
                <a href="#dashboard" className="inline-flex items-center gap-2 bg-white/10 border border-white/20 text-white font-semibold px-8 py-4 rounded-xl hover:bg-white/20 transition-all text-base">See the Dashboard</a>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[
                {n:'Station Staffing',l:'Per Kitchen Station',sub:'grill, prep, pass, dessert — each monitored independently'},
                {n:'Cover Ratio',l:'Tables per Floor Staff',sub:'alert when ratio exceeds 1:8 during peak service'},
                {n:'Hygiene PPE',l:'Gloves · Hairnet · Apron',sub:'different rules per station — prep vs pass vs front of house'},
                {n:'Break Overlap',l:'During Peak Service',sub:'never more than 2 staff on break at the same time'},
              ].map(({n,l,sub})=>(
                <div key={l} className="bg-white/5 border border-white/10 rounded-2xl p-5 backdrop-blur">
                  <div className="text-lg font-extrabold text-orange-400 mb-1">{n}</div>
                  <div className="text-sm font-bold text-white">{l}</div>
                  <div className="text-xs text-slate-400 mt-0.5">{sub}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <CameraGrid industry="restaurant" />

      <PipelineDemoSection frames={FRAMES} accentColor="#f97316" industry="restaurant" />


      {/* What's unique */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <div className="section-label mb-4">Restaurant-Specific Intelligence</div>
            <h2 className="text-4xl font-extrabold text-gray-900 tracking-tight">Not just "kitchen staff present." <br/>Is the grill unmanned. Are 3 waiters on break during the dinner rush. Are hairnets being worn at the prep station.</h2>
            <p className="mt-4 text-gray-500 max-w-2xl mx-auto">The grill station going unmanned for 8 minutes during a Saturday dinner service is a real, costly problem. LenzAI catches it in real time — not in a post-service review when it is already too late.</p>
          </div>

          <div className="grid lg:grid-cols-2 gap-8">
            <div className="card p-7 border-l-4 border-l-orange-400">
              <div className="text-3xl mb-3">👨‍🍳</div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Kitchen Station Coverage by Period</h3>
              <p className="text-gray-500 text-sm mb-4 leading-relaxed">Each kitchen station — grill, prep, pass, dessert, cold kitchen — is configured as its own zone. LenzAI monitors how many staff are at each station during each service period (breakfast, lunch, dinner) and alerts when any station drops below its minimum staffing requirement.</p>
              <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 text-sm">
                <div className="font-bold text-orange-800 mb-2">Dinner service — right now:</div>
                <ul className="space-y-1 text-orange-700">
                  <li>⚠ Grill Station: Unmanned for 8 min — Chef Rajan on break</li>
                  <li>✓ Prep Station: 2 of 2 required staff present</li>
                  <li>✓ Pass: 1 chef — 43 covers in queue</li>
                </ul>
              </div>
            </div>

            <div className="card p-7 border-l-4 border-l-red-400">
              <div className="text-3xl mb-3">🍷</div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Front-of-House Cover Ratio Monitoring</h3>
              <p className="text-gray-500 text-sm mb-4 leading-relaxed">Your standard may be one waiter per 8 covers. LenzAI tracks how many floor staff are actively on the dining floor versus covers seated — and alerts when the ratio breaches your target. This prevents service delays, missed orders, and poor guest experience during a busy service.</p>
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm">
                <div className="font-bold text-red-800 mb-2">Floor ratio — dinner service:</div>
                <ul className="space-y-1 text-red-700">
                  <li>⚠ Floor: 3 staff · 42 covers — ratio 1:14 (target 1:8)</li>
                  <li>⚠ 2 waiters detected in staff room during service</li>
                  <li>✓ Bar: 2 bartenders — capacity met</li>
                </ul>
              </div>
            </div>

            <div className="card p-7 border-l-4 border-l-amber-400">
              <div className="text-3xl mb-3">🧤</div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Station-Level Hygiene & PPE Compliance</h3>
              <p className="text-gray-500 text-sm mb-4 leading-relaxed">Prep stations need gloves + hairnets + aprons. Cold kitchen needs gloves only. Front of house needs no PPE. LenzAI checks hygiene compliance per station — giving food safety managers a live compliance dashboard they can show auditors and health inspectors with confidence.</p>
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm">
                <div className="font-bold text-amber-800 mb-2">Hygiene compliance — right now:</div>
                <ul className="space-y-1 text-amber-700">
                  <li>🔴 Prep Station: 1 staff member without hairnet</li>
                  <li>✅ Grill: Chef in full PPE</li>
                  <li>✅ Cold Kitchen: 2/2 wearing gloves</li>
                </ul>
              </div>
            </div>

            <div className="card p-7 border-l-4 border-l-rose-400">
              <div className="text-3xl mb-3">⏰</div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Break Overlap Prevention During Peak Service</h3>
              <p className="text-gray-500 text-sm mb-4 leading-relaxed">Staff breaks are necessary — but overlapping breaks during a dinner service can halve your kitchen capacity in minutes. LenzAI monitors how many staff are simultaneously in the break area and alerts managers when overlap exceeds your defined limit during service hours.</p>
              <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 text-sm">
                <div className="font-bold text-rose-800 mb-2">Break overlap alerts — this week:</div>
                <ul className="space-y-1 text-rose-700">
                  <li>⚠ Fri 20:15: 4 staff in break room simultaneously — dinner peak</li>
                  <li>⚠ Sat 13:40: 3 staff on break — grill + prep both short</li>
                  <li>✅ All other periods: Overlap within allowed limit</li>
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
            <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-orange-400 bg-orange-950/60 border border-orange-800/50 px-4 py-1.5 rounded-full mb-4">Live Dashboard</div>
            <h2 className="text-4xl font-extrabold text-white tracking-tight">What your head chef and restaurant manager see during service.</h2>
          </div>

          <div className="bg-gray-900 rounded-3xl border border-gray-700 overflow-hidden shadow-2xl">
            <div className="bg-gray-800 px-4 py-3 flex items-center gap-2 border-b border-gray-700">
              <div className="flex gap-1.5"><div className="w-3 h-3 rounded-full bg-red-500"/><div className="w-3 h-3 rounded-full bg-yellow-500"/><div className="w-3 h-3 rounded-full bg-green-500"/></div>
              <div className="flex-1 bg-gray-700 rounded-lg px-3 py-1 text-xs text-gray-400 text-center mx-4">app.lenzai.org/restaurant</div>
            </div>
            <div className="flex h-[640px]">
              <div className="w-52 bg-gray-950 border-r border-gray-800 p-4 shrink-0 flex flex-col">
                <div className="flex items-center gap-2 mb-5 px-1">
                  <div className="w-7 h-7 bg-gradient-to-br from-blue-600 to-violet-600 rounded-lg flex items-center justify-center text-white font-bold text-xs">LA</div>
                  <span className="font-bold text-white text-sm">LenzAI</span>
                </div>
                <div className="bg-orange-500/20 border border-orange-500/30 rounded-xl px-3 py-2 mb-4">
                  <div className="text-xs font-bold text-orange-400">🍽️ Restaurant</div>
                  <div className="text-xs text-gray-400 mt-0.5">The Grand Brasserie</div>
                </div>
                {[{i:'📊',l:'Dashboard',a:true},{i:'👨‍🍳',l:'Kitchen Stations'},{i:'🍷',l:'Floor Coverage'},{i:'🧤',l:'Hygiene PPE'},{i:'⏰',l:'Break Monitor'},{i:'🕐',l:'Attendance'}].map(item=>(
                  <div key={item.l} className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl mb-0.5 text-xs cursor-pointer ${item.a?'bg-orange-500/20 text-orange-400 font-bold':'text-gray-400 hover:text-white'}`}>{item.i} {item.l}</div>
                ))}
              </div>

              <div className="flex-1 overflow-auto p-5 bg-gray-950 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-extrabold text-white">Restaurant Dashboard</h3>
                    <p className="text-xs text-gray-500">Friday · Dinner Service · 43 covers seated · Last scan 2 min ago</p>
                  </div>
                  <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400 bg-emerald-900/40 border border-emerald-800/50 px-3 py-1.5 rounded-full"><span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"/>Live</span>
                </div>

                <div className="grid grid-cols-4 gap-3">
                  {[
                    {l:'Kitchen Staff',v:'8',s:'of 10 on-station',c:'text-emerald-400',bg:'bg-emerald-900/30 border-emerald-800/40'},
                    {l:'Station Gaps',v:'1',s:'Grill — 8 min gap',c:'text-red-400',bg:'bg-red-900/30 border-red-800/40'},
                    {l:'Floor Ratio',v:'1:14',s:'3 waiters · 43 covers',c:'text-amber-400',bg:'bg-amber-900/30 border-amber-800/40'},
                    {l:'Hygiene Alerts',v:'1',s:'Prep — no hairnet',c:'text-orange-400',bg:'bg-orange-900/30 border-orange-800/40'},
                  ].map(k=>(
                    <div key={k.l} className={`border rounded-xl p-3 ${k.bg}`}>
                      <div className={`text-2xl font-extrabold ${k.c}`}>{k.v}</div>
                      <div className="text-xs font-bold text-white mt-0.5">{k.l}</div>
                      <div className="text-xs text-gray-500">{k.s}</div>
                    </div>
                  ))}
                </div>

                <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
                  <h4 className="text-sm font-bold text-white mb-3">Kitchen Station Coverage — Dinner Service</h4>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      {station:'Grill Station',req:2,present:1,ok:false,note:'Chef Rajan on break — 8 min'},
                      {station:'Prep Station',req:2,present:2,ok:true},
                      {station:'Pass / Expo',req:1,present:1,ok:true},
                      {station:'Cold Kitchen',req:1,present:1,ok:true},
                      {station:'Dessert',req:1,present:1,ok:true},
                      {station:'Bar',req:2,present:2,ok:true},
                    ].map(s=>(
                      <div key={s.station} className={`flex items-center justify-between px-3 py-2.5 rounded-xl border ${s.ok?'bg-emerald-900/20 border-emerald-800/40':'bg-red-900/20 border-red-800/40'}`}>
                        <div>
                          <div className="text-xs font-bold text-white">{s.station}</div>
                          {s.note && <div className="text-xs text-red-400 mt-0.5">{s.note}</div>}
                        </div>
                        <div className={`text-sm font-extrabold ${s.ok?'text-emerald-400':'text-red-400'}`}>{s.present}/{s.req}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
                    <h4 className="text-sm font-bold text-white mb-3">Hygiene Compliance by Station</h4>
                    {[
                      {station:'Prep Station',compliant:2,total:3,item:'Gloves + hairnet + apron'},
                      {station:'Grill',compliant:1,total:1,item:'Apron + hairnet'},
                      {station:'Cold Kitchen',compliant:2,total:2,item:'Gloves'},
                      {station:'Dessert',compliant:1,total:1,item:'Gloves + hairnet'},
                    ].map(z=>(
                      <div key={z.station} className="flex items-center gap-2 py-2 border-b border-gray-800 last:border-0">
                        <div className={`w-2 h-2 rounded-full shrink-0 ${z.compliant===z.total?'bg-emerald-500':'bg-red-500'}`}/>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-semibold text-white">{z.station}</div>
                          <div className="text-xs text-gray-500">{z.item}</div>
                        </div>
                        <div className={`text-xs font-bold ${z.compliant===z.total?'text-emerald-400':'text-red-400'}`}>{z.compliant}/{z.total}</div>
                      </div>
                    ))}
                  </div>

                  <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
                    <h4 className="text-sm font-bold text-white mb-3">Break Room — Right Now</h4>
                    <div className="mb-3">
                      <div className="text-xs text-gray-400 mb-1">Staff currently in break room</div>
                      <div className="flex items-center gap-2">
                        <div className="text-3xl font-extrabold text-amber-400">3</div>
                        <div className="text-xs text-amber-300 bg-amber-900/40 border border-amber-800/40 px-2 py-1 rounded-lg">⚠ Limit: 2 during dinner</div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      {['Chef Rajan — Grill (8 min)','Waiter Tom — Floor (12 min)','Sous Chef Priya — Prep (3 min)'].map(n=>(
                        <div key={n} className="flex items-center gap-2 text-xs text-gray-400 bg-gray-800 rounded-lg px-3 py-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0"/>
                          {n}
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 bg-red-900/30 border border-red-800/40 rounded-xl px-3 py-2">
                      <div className="text-xs text-red-400 font-bold">Break overlap alert sent to manager</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <IndustryPricing plans={PRICING} accentColor="#f97316" industryLabel="Restaurant & Food Service" />

      <section id="demo" className="py-20 px-4 bg-gradient-to-br from-orange-600 to-red-700">
        <div className="max-w-4xl mx-auto text-center text-white">
          <h2 className="text-4xl font-extrabold mb-4">See every station, every cover ratio, every hygiene gap — live.</h2>
          <p className="text-orange-100 text-lg mb-8">We configure LenzAI for your kitchen and floor layout and deliver live service data within 48 hours.</p>
          <Link href="/#contact" className="inline-flex items-center gap-2 bg-white text-orange-700 font-bold px-10 py-4 rounded-xl hover:bg-orange-50 transition-all shadow-2xl text-base">Book Free On-Site Demo <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg></Link>
        </div>
      </section>

      <footer className="py-8 px-4 bg-gray-950 border-t border-gray-900 text-center text-sm text-gray-600">
        <div className="flex items-center justify-center gap-2 mb-3"><div className="w-7 h-7 bg-gradient-to-br from-blue-600 to-violet-600 rounded-lg flex items-center justify-center text-white font-bold text-xs">LA</div><span className="font-extrabold text-white">LenzAI</span></div>
        <div className="flex flex-wrap items-center justify-center gap-4 mb-2">
          <Link href="/" className="hover:text-white">Home</Link>
          <Link href="/industries/hotel" className="hover:text-white">Hotel</Link>
          <Link href="/industries/warehouse" className="hover:text-white">Warehouse</Link>
          <Link href="/industries/hospital" className="hover:text-white">Hospital</Link>
          <Link href="/industries/construction" className="hover:text-white">Construction</Link>
          <Link href="/industries/security" className="hover:text-white">Security</Link>
        </div>
        <p>© {new Date().getFullYear()} LenzAI · AI-Powered Workforce Intelligence</p>
      </footer>
    </div>
  );
}
