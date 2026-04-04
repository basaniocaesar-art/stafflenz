'use client';
import Link from 'next/link';
import PipelineDemoSection from '@/components/PipelineDemoSection';
import IndustryPricing from '@/components/IndustryPricing';

const PRICING = [
  {
    name: 'Starter', price: 69, ideal: 'Small stores', highlight: false,
    features: ['Up to 8 sections', '4 billing counters', 'Up to 25 staff', '8 cameras (8-ch DVR)', 'Section heatmap', 'WhatsApp alerts', 'Daily report'],
  },
  {
    name: 'Professional', price: 139, ideal: 'Mid-size stores', highlight: true,
    features: ['Up to 20 sections', '8 billing counters', 'Up to 60 staff', '16 cameras (16-ch DVR)', 'Stock room access log', 'Overtime verification', 'Loss prevention alerts', 'Weekly analytics'],
  },
  {
    name: 'Enterprise', price: 269, ideal: 'Retail chains', highlight: false,
    features: ['Up to 40 sections', 'Up to 100 staff', '32 cameras (32-ch DVR)', 'Multi-store dashboard', 'Cross-store benchmarking', 'Custom alert rules', 'API access', 'Dedicated support'],
  },
];

const FRAMES = [
  {
    sceneLabel: 'Section Uncovered',
    sceneIcon: '🛍️',
    sceneDescription: 'Electronics section camera scan — monitoring staff presence in high-value area',
    zone: 'Electronics · CAM 06',
    camId: '06',
    aiPrompt: 'Is there any staff member present in the electronics section right now?',
    detections: [
      { label: '⚠ Electronics — 0 Staff', color: '#ef4444', x: '10%', y: '10%', w: '75%', h: '60%' },
      { label: 'Customer Browsing', color: '#f59e0b', x: '70%', y: '45%', w: '18%', h: '45%' },
    ],
    output: {
      icon: '🚨', title: 'Electronics Section Uncovered', tag: 'Store Alert · 22 min gap',
      borderColor: '#ef444460', bgColor: '#450a0a40', iconBg: '#ef4444', tagColor: '#fca5a5',
      lines: [
        { icon: '🔴', text: 'Electronics section unmanned for 22 minutes' },
        { icon: '👤', text: 'Customer browsing unassisted — lost sale risk' },
        { icon: '📍', text: 'Electronics · Cam 06 · 15:18' },
      ],
      action: '⚡ Floor manager alerted to send staff to electronics',
      whatsapp: '🚨 *SECTION UNCOVERED — Electronics*\n\nNo staff for 22 minutes.\nCustomer browsing unassisted.\n\nElectronics · Cam 06 · 15:18\n\nPlease send staff to electronics immediately.',
    },
  },
  {
    sceneLabel: 'Counter Closed',
    sceneIcon: '🏪',
    sceneDescription: 'Billing area scan — monitoring counter staffing during peak shopping hours',
    zone: 'Billing Area · CAM 03',
    camId: '03',
    aiPrompt: 'How many billing counters are currently staffed and how many are empty?',
    detections: [
      { label: 'Counter 1 — Active', color: '#10b981', x: '5%', y: '20%', w: '22%', h: '55%' },
      { label: 'Counter 2 — Active', color: '#10b981', x: '35%', y: '22%', w: '22%', h: '52%' },
      { label: '⚠ Counter 3 — Empty', color: '#ef4444', x: '65%', y: '15%', w: '28%', h: '60%' },
    ],
    output: {
      icon: '🏪', title: 'Billing Counter Unstaffed', tag: 'Counter Alert · Saturday Peak',
      borderColor: '#f59e0b60', bgColor: '#2d1b0040', iconBg: '#f59e0b', tagColor: '#fcd34d',
      lines: [
        { icon: '🏪', text: 'Counter 3 unstaffed during peak Saturday hours' },
        { icon: '📊', text: '2 of 3 counters active — queue building' },
        { icon: '📍', text: 'Billing Area · Cam 03 · 16:45' },
      ],
      action: '📢 Store manager alerted — staff reassignment needed',
      whatsapp: '⚠️ *COUNTER UNSTAFFED — Counter 3*\n\nBilling Counter 3 empty.\nQueue building at Counters 1 & 2.\nSaturday peak hours.\n\nBilling Area · Cam 03 · 16:45\n\nPlease send staff to open Counter 3.',
    },
  },
  {
    sceneLabel: 'Stock Room Access',
    sceneIcon: '📦',
    sceneDescription: 'Stock room camera scan — monitoring access to restricted storage area',
    zone: 'Stock Room · CAM 10',
    camId: '10',
    aiPrompt: 'Is the person entering the stock room a recognised authorised staff member?',
    detections: [
      { label: '⚠ Unrecognised Person', color: '#ef4444', x: '25%', y: '10%', w: '30%', h: '65%' },
    ],
    output: {
      icon: '🚨', title: 'Unauthorised Stock Room Entry', tag: 'Security Alert · Stock Room',
      borderColor: '#ef444460', bgColor: '#450a0a40', iconBg: '#ef4444', tagColor: '#fca5a5',
      lines: [
        { icon: '🔴', text: 'Unrecognised individual entered stock room' },
        { icon: '🕐', text: 'Entry timestamp: 17:23 — shift end period' },
        { icon: '📄', text: 'Entry logged and flagged for loss prevention' },
      ],
      action: '🚨 Loss prevention and store manager notified',
      whatsapp: '🚨 *UNAUTHORISED ENTRY — Stock Room*\n\nUnrecognised person detected in stock room.\nTimestamp: 17:23 · Cam 10\n\nShift end period — high pilferage risk.\n\nPlease send loss prevention to stock room immediately.',
    },
  },
  {
    sceneLabel: 'Overtime Check',
    sceneIcon: '⏱️',
    sceneDescription: 'End-of-day scan — verifying which staff are still present vs overtime claimed',
    zone: 'Store Floor · CAM 01',
    camId: '01',
    aiPrompt: 'Which staff members are still present on the store floor after 20:00?',
    detections: [
      { label: 'Sneha R. — Verified OT', color: '#10b981', x: '8%', y: '20%', w: '20%', h: '52%' },
      { label: 'Preethi S. — Verified OT', color: '#10b981', x: '60%', y: '22%', w: '20%', h: '50%' },
    ],
    output: {
      icon: '⏱️', title: 'Overtime Audit Complete', tag: 'Payroll Verification · Today',
      borderColor: '#6366f160', bgColor: '#1e1b4b30', iconBg: '#6366f1', tagColor: '#a5b4fc',
      lines: [
        { icon: '📊', text: 'OT claimed: 5 staff · AI verified present: 2' },
        { icon: '💰', text: '3 staff claimed OT but left before 20:00' },
        { icon: '📄', text: 'AI-verified timesheet generated for payroll' },
      ],
      action: '📄 Payroll discrepancy report auto-sent to HR',
      whatsapp: '⏱️ *OVERTIME AUDIT — Today*\n\nOT claimed: 5 staff\nAI verified on floor: 2 staff\n3 discrepancies found.\n\nStore Floor · Post 20:00 scan\n\nVerified timesheet sent to HR for review.',
    },
  },
];

export default function RetailPage() {
  return (
    <div className="min-h-screen overflow-x-hidden">

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
            <a href="#demo" className="hidden sm:block text-sm font-semibold text-rose-600 hover:text-rose-700">Book Demo</a>
            <Link href="/login" className="btn-primary text-sm px-5 bg-rose-600 hover:bg-rose-700">Login →</Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative bg-[#0F0305] text-white overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-rose-950/80 via-[#0F0305] to-pink-950/60" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-rose-600/20 rounded-full blur-[120px]" />
        <div className="absolute inset-0 opacity-[0.04]" style={{backgroundImage:'linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)',backgroundSize:'50px 50px'}} />
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 pt-20 pb-24">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 bg-rose-500/20 border border-rose-400/30 rounded-full px-5 py-2 text-sm font-medium text-rose-300 mb-6">🛍️ Retail & Stores</div>
              <h1 className="text-5xl md:text-6xl font-extrabold mb-6 leading-[1.1] tracking-tight">
                See which aisle<br />has no staff and<br /><span className="bg-clip-text text-transparent bg-gradient-to-r from-rose-400 to-pink-400">how many tills are open.</span>
              </h1>
              <p className="text-lg text-slate-300 mb-8 leading-relaxed">
                StaffLenz monitors each section of your store independently — how many staff are in electronics vs grocery vs billing, which counters are open, how long the electronics section has been without coverage, and whether the stock room was accessed without authorisation.
              </p>
              <div className="flex flex-wrap gap-4">
                <a href="#demo" className="inline-flex items-center gap-2 bg-rose-600 text-white font-bold px-8 py-4 rounded-xl hover:bg-rose-700 transition-all shadow-2xl shadow-rose-900/40 text-base">Book a Free Demo <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg></a>
                <a href="#dashboard" className="inline-flex items-center gap-2 bg-white/10 border border-white/20 text-white font-semibold px-8 py-4 rounded-xl hover:bg-white/20 transition-all text-base">See the Dashboard</a>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[
                {n:'Section Heatmap',l:'Staff per Aisle/Dept',sub:'see exactly how many staff are in each section right now'},
                {n:'Billing Counters',l:'Open vs Closed',sub:'how many tills are staffed at any moment'},
                {n:'Stock Room',l:'Access Log',sub:'every entry timestamped — no unauthorised access goes unrecorded'},
                {n:'Peak Hour',l:'Coverage Enforcement',sub:'minimum staff per section enforced during busy hours'},
              ].map(({n,l,sub})=>(
                <div key={l} className="bg-white/5 border border-white/10 rounded-2xl p-5 backdrop-blur">
                  <div className="text-lg font-extrabold text-rose-400 mb-1">{n}</div>
                  <div className="text-sm font-bold text-white">{l}</div>
                  <div className="text-xs text-slate-400 mt-0.5">{sub}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Retail-specific solutions */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <div className="section-label mb-4">Retail-Specific Intelligence</div>
            <h2 className="text-4xl font-extrabold text-gray-900 tracking-tight">Not just "who came to work."<br/>Which section is uncovered right now.</h2>
            <p className="mt-4 text-gray-500 max-w-2xl mx-auto">Retail is about floor coverage, not headcount. StaffLenz tells you the Electronics section has been without staff for 22 minutes during peak Saturday hours, before a customer walks out without buying.</p>
          </div>

          <div className="grid lg:grid-cols-2 gap-8">
            <div className="card p-7 border-l-4 border-l-rose-400">
              <div className="text-3xl mb-3">🗺️</div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Section-by-Section Staff Heatmap</h3>
              <p className="text-gray-500 text-sm mb-4 leading-relaxed">Every section of your store is configured as a zone — Electronics, Grocery, Ladies Fashion, Kids, Billing, Back Office. StaffLenz shows you how many staff are in each zone in real time, and alerts you when any section drops below its minimum required coverage.</p>
              <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 text-sm">
                <div className="font-bold text-rose-800 mb-2">Saturday 3 PM — Peak hour status:</div>
                <ul className="space-y-1 text-rose-700">
                  <li>🔴 Electronics: 0 staff · Uncovered 22 min — Alert sent</li>
                  <li>🟡 Kids Section: 1 of 2 required</li>
                  <li>✅ Grocery: 4 staff · Well covered</li>
                  <li>✅ Ladies Fashion: 3 staff</li>
                  <li>✅ Billing: 5 counters open · 5 staff</li>
                </ul>
              </div>
            </div>

            <div className="card p-7 border-l-4 border-l-pink-400">
              <div className="text-3xl mb-3">🏧</div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Billing Counter Coverage — Open vs Closed</h3>
              <p className="text-gray-500 text-sm mb-4 leading-relaxed">Each billing counter is a zone. StaffLenz detects which counters are staffed and which are empty. During peak hours, if the number of open counters drops below your set threshold, you get an immediate WhatsApp alert to send staff from the floor to billing — before queues form.</p>
              <div className="bg-pink-50 border border-pink-200 rounded-xl p-4 text-sm">
                <div className="font-bold text-pink-800 mb-2">Billing status right now (6 counters total):</div>
                <ul className="space-y-1 text-pink-700">
                  <li>✅ Counter 1: Sneha Raj — Active</li>
                  <li>✅ Counter 2: Rahul M. — Active</li>
                  <li>✅ Counter 3: Preethi S. — Active</li>
                  <li>⭕ Counter 4: Unmanned</li>
                  <li>✅ Counter 5: Divya K. — Active</li>
                  <li>⭕ Counter 6: Unmanned · ⚠ Peak hour minimum is 5</li>
                </ul>
              </div>
            </div>

            <div className="card p-7 border-l-4 border-l-red-400">
              <div className="text-3xl mb-3">🔐</div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Stock Room & Back Office Access Log</h3>
              <p className="text-gray-500 text-sm mb-4 leading-relaxed">The stock room, cash office, and CCTV room are high-risk zones. StaffLenz logs every person who enters these zones with a timestamp. Any access outside normal hours or by a non-authorised staff member triggers an immediate alert — giving you a tamper-proof access record for every single entry.</p>
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm">
                <div className="font-bold text-red-800 mb-2">Today&apos;s stock room access log:</div>
                <ul className="space-y-1 text-red-700">
                  <li>09:15 AM — Rajesh (Store Manager) — Authorised ✓</li>
                  <li>11:42 AM — Rajan P. (Floor staff) — ⚠ Not authorised · Alert sent</li>
                  <li>02:30 PM — Anita T. (Stock Manager) — Authorised ✓</li>
                  <li>📄 Full log exportable for loss prevention audit</li>
                </ul>
              </div>
            </div>

            <div className="card p-7 border-l-4 border-l-orange-400">
              <div className="text-3xl mb-3">⏰</div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Overstay & Ghost Overtime Detection</h3>
              <p className="text-gray-500 text-sm mb-4 leading-relaxed">StaffLenz tracks when each staff member was last seen on camera and compares it against their scheduled shift end time. If someone's shift ended at 6 PM but they're still being detected at 7 PM, that's recorded as overtime — with AI-verified timestamps, not self-reported timesheet entries.</p>
              <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 text-sm">
                <div className="font-bold text-orange-800 mb-2">This week&apos;s overtime verification:</div>
                <ul className="space-y-1 text-orange-700">
                  <li>📊 Overtime claimed: 28 hours (self-reported)</li>
                  <li>📷 Overtime verified by AI: 19 hours</li>
                  <li>💰 Discrepancy: 9 hours flagged — payroll dispute resolved with AI evidence</li>
                  <li>📄 AI-verified timesheet for payroll dispute resolution</li>
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
            <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-rose-400 bg-rose-950/60 border border-rose-800/50 px-4 py-1.5 rounded-full mb-4">Live Dashboard</div>
            <h2 className="text-4xl font-extrabold text-white tracking-tight">What the store manager sees on a busy Saturday.</h2>
          </div>

          <div className="bg-gray-900 rounded-3xl border border-gray-700 overflow-hidden shadow-2xl">
            <div className="bg-gray-800 px-4 py-3 flex items-center gap-2 border-b border-gray-700">
              <div className="flex gap-1.5"><div className="w-3 h-3 rounded-full bg-red-500"/><div className="w-3 h-3 rounded-full bg-yellow-500"/><div className="w-3 h-3 rounded-full bg-green-500"/></div>
              <div className="flex-1 bg-gray-700 rounded-lg px-3 py-1 text-xs text-gray-400 text-center mx-4">app.stafflenz.com/retail</div>
            </div>
            <div className="flex h-[640px]">
              <div className="w-52 bg-gray-950 border-r border-gray-800 p-4 shrink-0 flex flex-col">
                <div className="flex items-center gap-2 mb-5 px-1">
                  <div className="w-7 h-7 bg-gradient-to-br from-blue-600 to-violet-600 rounded-lg flex items-center justify-center text-white font-bold text-xs">SL</div>
                  <span className="font-bold text-white text-sm">StaffLenz</span>
                </div>
                <div className="bg-rose-500/20 border border-rose-500/30 rounded-xl px-3 py-2 mb-4">
                  <div className="text-xs font-bold text-rose-400">🛍️ Retail</div>
                  <div className="text-xs text-gray-400 mt-0.5">Vision Hypermarket</div>
                </div>
                {[{i:'📊',l:'Dashboard',a:true},{i:'🗺️',l:'Section Coverage'},{i:'🏧',l:'Billing Counters'},{i:'🔐',l:'Stock Room Log'},{i:'🕐',l:'Attendance'},{i:'👷',l:'Staff'}].map(item=>(
                  <div key={item.l} className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl mb-0.5 text-xs cursor-pointer ${item.a?'bg-rose-500/20 text-rose-400 font-bold':'text-gray-400 hover:text-white'}`}>{item.i} {item.l}</div>
                ))}
              </div>

              <div className="flex-1 overflow-auto p-5 bg-gray-950 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-extrabold text-white">Store Dashboard</h3>
                    <p className="text-xs text-gray-500">Saturday · 3:00 PM · ⚡ Peak Hours Active</p>
                  </div>
                  <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400 bg-emerald-900/40 border border-emerald-800/50 px-3 py-1.5 rounded-full"><span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"/>Live</span>
                </div>

                <div className="grid grid-cols-4 gap-3">
                  {[
                    {l:'Staff On Floor',v:'18',s:'of 22 rostered',c:'text-emerald-400',bg:'bg-emerald-900/30 border-emerald-800/40'},
                    {l:'Sections Uncovered',v:'1',s:'Electronics — 22 min',c:'text-red-400',bg:'bg-red-900/30 border-red-800/40'},
                    {l:'Tills Open',v:'4/6',s:'2 counters unmanned',c:'text-amber-400',bg:'bg-amber-900/30 border-amber-800/40'},
                    {l:'Stock Room Entries',v:'3',s:'today · all logged',c:'text-blue-400',bg:'bg-blue-900/30 border-blue-800/40'},
                  ].map(k=>(
                    <div key={k.l} className={`border rounded-xl p-3 ${k.bg}`}>
                      <div className={`text-2xl font-extrabold ${k.c}`}>{k.v}</div>
                      <div className="text-xs font-bold text-white mt-0.5">{k.l}</div>
                      <div className="text-xs text-gray-500">{k.s}</div>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Section heatmap */}
                  <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
                    <h4 className="text-sm font-bold text-white mb-3">Section Coverage — Right Now</h4>
                    <div className="space-y-2">
                      {[
                        {section:'Electronics',staff:0,min:2,ok:false,duration:'22 min uncovered'},
                        {section:'Grocery',staff:4,min:3,ok:true},
                        {section:'Ladies Fashion',staff:3,min:2,ok:true},
                        {section:'Kids Section',staff:1,min:2,ok:false,duration:'short by 1'},
                        {section:'Billing Area',staff:4,min:5,ok:false,duration:'1 till short'},
                        {section:'Fresh Produce',staff:3,min:3,ok:true},
                        {section:'Home Appliances',staff:2,min:2,ok:true},
                      ].map(s=>(
                        <div key={s.section} className={`flex items-center gap-3 px-3 py-2 rounded-xl ${s.ok?'bg-gray-800/60':'bg-red-900/20 border border-red-800/30'}`}>
                          <div className={`w-2 h-2 rounded-full shrink-0 ${s.ok?'bg-emerald-500':s.staff===0?'bg-red-500':'bg-amber-500'}`}/>
                          <span className="text-xs font-bold text-white flex-1">{s.section}</span>
                          <div className="text-right">
                            <span className={`text-xs font-bold ${s.ok?'text-emerald-400':s.staff===0?'text-red-400':'text-amber-400'}`}>{s.staff}/{s.min}</span>
                            {!s.ok && <div className="text-xs text-gray-500">{s.duration}</div>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Billing + stock */}
                  <div className="space-y-4">
                    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
                      <h4 className="text-sm font-bold text-white mb-3">Billing Counters</h4>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          {id:'C1',staff:'Sneha R.',open:true},
                          {id:'C2',staff:'Rahul M.',open:true},
                          {id:'C3',staff:'Preethi S.',open:true},
                          {id:'C4',staff:'Unmanned',open:false},
                          {id:'C5',staff:'Divya K.',open:true},
                          {id:'C6',staff:'Unmanned',open:false},
                        ].map(c=>(
                          <div key={c.id} className={`p-2 rounded-xl text-center border ${c.open?'bg-emerald-900/20 border-emerald-800/40':'bg-red-900/20 border-red-800/40'}`}>
                            <div className={`text-xs font-bold ${c.open?'text-emerald-400':'text-red-400'}`}>{c.id}</div>
                            <div className="text-xs text-gray-400 truncate">{c.staff}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
                      <h4 className="text-sm font-bold text-white mb-2">Stock Room Log — Today</h4>
                      <div className="space-y-1.5">
                        {[
                          {t:'09:15 AM',p:'Rajesh (Mgr)',ok:true},
                          {t:'11:42 AM',p:'Rajan P. (Floor)',ok:false},
                          {t:'02:30 PM',p:'Anita T. (Stock)',ok:true},
                        ].map((e,i)=>(
                          <div key={i} className="flex items-center gap-2 text-xs">
                            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${e.ok?'bg-emerald-500':'bg-red-500'}`}/>
                            <span className="text-gray-500 w-16 shrink-0">{e.t}</span>
                            <span className={`flex-1 ${e.ok?'text-gray-300':'text-red-400 font-semibold'}`}>{e.p}</span>
                            <span className={e.ok?'text-emerald-400':'text-red-400'}>{e.ok?'Auth':'⚠ Alert'}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <IndustryPricing plans={PRICING} accentColor="#f43f5e" industryLabel="Retail & Stores" />
      <PipelineDemoSection frames={FRAMES} accentColor="#f43f5e" industry="retail" />

      <section id="demo" className="py-20 px-4 bg-gradient-to-br from-rose-600 to-pink-700">
        <div className="max-w-4xl mx-auto text-center text-white">
          <h2 className="text-4xl font-extrabold mb-4">Know the moment Electronics is uncovered — before the customer gives up.</h2>
          <p className="text-rose-100 text-lg mb-8">We install the device and show live section coverage and billing data within 48 hours.</p>
          <Link href="/#contact" className="inline-flex items-center gap-2 bg-white text-rose-700 font-bold px-10 py-4 rounded-xl hover:bg-rose-50 transition-all shadow-2xl text-base">Book Free On-Site Demo <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg></Link>
        </div>
      </section>

      <footer className="py-8 px-4 bg-gray-950 border-t border-gray-900 text-center text-sm text-gray-600">
        <div className="flex items-center justify-center gap-2 mb-3"><div className="w-7 h-7 bg-gradient-to-br from-blue-600 to-violet-600 rounded-lg flex items-center justify-center text-white font-bold text-xs">SL</div><span className="font-extrabold text-white">StaffLenz</span></div>
        <div className="flex flex-wrap items-center justify-center gap-4 mb-2">
          <Link href="/" className="hover:text-white">Home</Link>
          <Link href="/industries/factory" className="hover:text-white">Factory</Link>
          <Link href="/industries/hotel" className="hover:text-white">Hotel</Link>
          <Link href="/industries/school" className="hover:text-white">School</Link>
        </div>
        <p>© {new Date().getFullYear()} StaffLenz · AI-Powered Workforce Intelligence</p>
      </footer>
    </div>
  );
}
