'use client';
import Link from 'next/link';
import PipelineDemoSection from '@/components/PipelineDemoSection';
import CameraGrid from '@/components/CameraGrid';
import IndustryPricing from '@/components/IndustryPricing';

const PRICING = [
  {
    name: 'Starter', price: 79, ideal: 'Small warehouses', highlight: false,
    features: ['Up to 6 loading bays', 'Up to 25 pickers', '8 cameras (8-ch DVR)', 'Bay coverage alerts', 'WhatsApp alerts', 'Daily ops report'],
  },
  {
    name: 'Professional', price: 159, ideal: 'Mid-size logistics', highlight: true,
    features: ['Up to 20 bays', 'Up to 60 staff', '16 cameras (16-ch DVR)', 'Cold storage access log', 'Picker zone assignment', 'Overtime verification', 'SLA breach alerts'],
  },
  {
    name: 'Enterprise', price: 299, ideal: 'Multi-warehouse', highlight: false,
    features: ['Up to 50 bays', 'Up to 100 staff', '32 cameras (32-ch DVR)', 'Multi-warehouse dashboard', 'Cross-site analytics', 'API access', 'Custom rules', 'Dedicated support'],
  },
];

const FRAMES = [
  {
    sceneLabel: 'Bay Unmanned',
    sceneIcon: '🚚',
    sceneDescription: 'Loading Bay 3 scan — monitoring for staff presence during active dispatch window',
    zone: 'Loading Bay 3 · CAM 05',
    camId: '05',
    aiPrompt: 'Is there any staff member present at Loading Bay 3? A truck is expected in 10 minutes.',
    detections: [
      { label: '⚠ Bay 3 — No Staff', color: '#ef4444', x: '10%', y: '10%', w: '70%', h: '65%' },
    ],
    output: {
      icon: '🚨', title: 'Bay 3 Unmanned — Truck Incoming', tag: 'Dispatch Alert · 34 min gap',
      borderColor: '#ef444460', bgColor: '#450a0a40', iconBg: '#ef4444', tagColor: '#fca5a5',
      lines: [
        { icon: '🔴', text: 'Loading Bay 3 unmanned for 34 minutes' },
        { icon: '🚚', text: 'Inbound truck ETA 10 min — SLA at risk' },
        { icon: '📍', text: 'Bay 3 · Cam 05 · 14:55' },
      ],
      action: '⚡ Warehouse supervisor alerted — staff reassignment needed',
      whatsapp: '🚚 *BAY 3 UNMANNED — Dispatch Alert*\n\nBay 3 empty for 34 minutes.\nInbound truck arriving in 10 min.\nSLA breach risk.\n\nLoading Bay 3 · Cam 05 · 14:55\n\nPlease assign staff to Bay 3 immediately.',
    },
  },
  {
    sceneLabel: 'Cold Store Breach',
    sceneIcon: '❄️',
    sceneDescription: 'Cold Storage A scan — monitoring authorised access to temperature-controlled zone',
    zone: 'Cold Storage A · CAM 08',
    camId: '08',
    aiPrompt: 'Is the person entering Cold Storage A an authorised staff member?',
    detections: [
      { label: '⚠ Unrecognised Entry', color: '#ef4444', x: '22%', y: '8%', w: '38%', h: '68%' },
    ],
    output: {
      icon: '🚨', title: 'Cold Storage Breach', tag: 'Restricted Zone Alert · 10:14',
      borderColor: '#ef444460', bgColor: '#450a0a40', iconBg: '#ef4444', tagColor: '#fca5a5',
      lines: [
        { icon: '🔴', text: 'Unrecognised person entered Cold Storage A' },
        { icon: '❄️', text: 'Pharmaceutical-grade cold zone — access restricted' },
        { icon: '📄', text: 'Entry logged — chain of custody potentially broken' },
      ],
      action: '🚨 Warehouse manager and compliance team notified',
      whatsapp: '🚨 *COLD STORE BREACH — Store A*\n\nUnrecognised person entered Cold Storage A.\nTimestamp: 10:14 · Cam 08\n\nChain of custody may be compromised.\n\nCompliance team notified immediately.',
    },
  },
  {
    sceneLabel: 'Wrong Zone',
    sceneIcon: '📍',
    sceneDescription: 'Warehouse floor scan — verifying pickers are working in their assigned aisles',
    zone: 'Aisle C · CAM 04',
    camId: '04',
    aiPrompt: 'Which worker is in Aisle C? Is this their assigned zone for this shift?',
    detections: [
      { label: '⚠ Picker 3 — Wrong Zone', color: '#f59e0b', x: '28%', y: '15%', w: '28%', h: '62%' },
    ],
    output: {
      icon: '⚠️', title: 'Picker in Wrong Aisle', tag: 'Zone Mismatch · Picker 3',
      borderColor: '#f59e0b60', bgColor: '#2d1b0040', iconBg: '#f59e0b', tagColor: '#fcd34d',
      lines: [
        { icon: '📍', text: 'Picker 3 detected in Aisle C — assigned to Aisle F' },
        { icon: '📦', text: 'Aisle F orders backing up — pick rate dropping' },
        { icon: '🕐', text: 'Mismatch ongoing for 15 minutes' },
      ],
      action: '📢 Supervisor notified — picker redirected to Aisle F',
      whatsapp: '⚠️ *ZONE MISMATCH — Picker 3*\n\nDetected in: Aisle C\nAssigned to: Aisle F\n\nAisle F orders backing up.\nAisle C · Cam 04 · 13:28\n\nPlease redirect Picker 3 to correct zone.',
    },
  },
  {
    sceneLabel: 'Overtime Audit',
    sceneIcon: '⏱️',
    sceneDescription: 'Post-shift scan — verifying which staff are still present vs overtime claimed on timesheets',
    zone: 'Warehouse Floor · CAM 01',
    camId: '01',
    aiPrompt: 'Which workers are still present in the warehouse after 20:00 closing time?',
    detections: [
      { label: 'Ravi Kumar ✓ OT', color: '#10b981', x: '8%', y: '20%', w: '20%', h: '52%' },
      { label: 'Priya S. ✓ OT', color: '#10b981', x: '58%', y: '22%', w: '20%', h: '50%' },
    ],
    output: {
      icon: '⏱️', title: 'OT Discrepancy Found', tag: 'Payroll Alert · Post-20:00',
      borderColor: '#6366f160', bgColor: '#1e1b4b30', iconBg: '#6366f1', tagColor: '#a5b4fc',
      lines: [
        { icon: '📊', text: 'OT claimed: 5 workers · AI verified: 2 on floor' },
        { icon: '💰', text: '13-hour discrepancy — 3 workers not present' },
        { icon: '📄', text: 'Camera-verified timesheet sent to payroll' },
      ],
      action: '📄 HR payroll report auto-generated with evidence',
      whatsapp: '⏱️ *OVERTIME DISCREPANCY*\n\nOT claimed: 5 workers\nAI verified on floor: 2 workers\n13-hour discrepancy found.\n\nWarehouse Floor · Post 20:00\n\nVerified report sent to HR payroll.',
    },
  },
];

export default function WarehousePage() {
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
            <a href="#demo" className="hidden sm:block text-sm font-semibold text-indigo-600 hover:text-indigo-700">Book Demo</a>
            <Link href="/login" className="btn-primary text-sm px-5 bg-indigo-600 hover:bg-indigo-700">Login →</Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative bg-[#050615] text-white overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-950/80 via-[#050615] to-blue-950/60" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-indigo-600/15 rounded-full blur-[120px]" />
        <div className="absolute inset-0 opacity-[0.04]" style={{backgroundImage:'linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)',backgroundSize:'50px 50px'}} />
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 pt-20 pb-24">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 bg-indigo-500/20 border border-indigo-400/30 rounded-full px-5 py-2 text-sm font-medium text-indigo-300 mb-6">📦 Warehouse & Logistics</div>
              <h1 className="text-5xl md:text-6xl font-extrabold mb-6 leading-[1.1] tracking-tight">
                Every bay staffed.<br />Every cold store<br /><span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-blue-400">accessed by the right person.</span>
              </h1>
              <p className="text-lg text-slate-300 mb-8 leading-relaxed">
                StaffLenz monitors your warehouse floor in real time — tracking loading bay coverage, authorised cold storage access, picker zone assignment, and overtime hours across every shift. Stop managing by spreadsheet and start seeing it live.
              </p>
              <div className="flex flex-wrap gap-4">
                <a href="#demo" className="inline-flex items-center gap-2 bg-indigo-600 text-white font-bold px-8 py-4 rounded-xl hover:bg-indigo-700 transition-all shadow-2xl shadow-indigo-900/40 text-base">Book a Free Demo <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg></a>
                <a href="#dashboard" className="inline-flex items-center gap-2 bg-white/10 border border-white/20 text-white font-semibold px-8 py-4 rounded-xl hover:bg-white/20 transition-all text-base">See the Dashboard</a>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[
                {n:'Bay Coverage',l:'Per Loading Bay',sub:'see which bay is unstaffed and for how long'},
                {n:'Cold Storage',l:'Authorised Access Only',sub:'timestamped log of every entry — controlled area'},
                {n:'Zone Assignment',l:'Picker in Correct Aisle',sub:'alert when staff are idle or in wrong zone'},
                {n:'Overtime',l:'AI-Verified Hours',sub:'compare actual presence vs self-reported timesheets'},
              ].map(({n,l,sub})=>(
                <div key={l} className="bg-white/5 border border-white/10 rounded-2xl p-5 backdrop-blur">
                  <div className="text-lg font-extrabold text-indigo-400 mb-1">{n}</div>
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
            <div className="section-label mb-4">Warehouse-Specific Intelligence</div>
            <h2 className="text-4xl font-extrabold text-gray-900 tracking-tight">Not just "shift started." <br/>Which bay is empty. Who is in cold storage right now. Are the pickers in the right aisles.</h2>
            <p className="mt-4 text-gray-500 max-w-2xl mx-auto">Generic workforce tools tell you a shift began. StaffLenz tells you Bay 3 has been unstaffed for 34 minutes, someone entered cold storage without authorisation, and Picker 7 has been idle in the break area for 22 minutes during a peak dispatch window.</p>
          </div>

          <div className="grid lg:grid-cols-2 gap-8">
            <div className="card p-7 border-l-4 border-l-indigo-400">
              <div className="text-3xl mb-3">🚚</div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Loading Bay Coverage by Bay</h3>
              <p className="text-gray-500 text-sm mb-4 leading-relaxed">Each loading bay is configured as a zone. StaffLenz tracks which bays are actively staffed, how long each bay has been unstaffed, and alerts when a bay goes unmanned during a scheduled dispatch window — so trucks are not kept waiting and SLAs are not breached.</p>
              <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 text-sm">
                <div className="font-bold text-indigo-800 mb-2">Bay coverage right now:</div>
                <ul className="space-y-1 text-indigo-700">
                  <li>⚠ Bay 3: Unmanned for 34 min — dispatch window open</li>
                  <li>✓ Bay 1, 2: Staffed</li>
                  <li>✓ Bay 4: 2 staff — inbound truck in 10 min</li>
                </ul>
              </div>
            </div>

            <div className="card p-7 border-l-4 border-l-blue-400">
              <div className="text-3xl mb-3">❄️</div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Cold Storage & Restricted Zone Access</h3>
              <p className="text-gray-500 text-sm mb-4 leading-relaxed">Cold storage, pharmaceutical areas, and high-value goods zones require controlled access. StaffLenz logs every person who enters these areas with a timestamp and staff ID. Any unrecognised individual triggers an immediate alert — providing full traceability for audits and stock discrepancy investigations.</p>
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm">
                <div className="font-bold text-blue-800 mb-2">Today&apos;s access log — Cold Store A:</div>
                <ul className="space-y-1 text-blue-700">
                  <li>🔴 10:14 — Unrecognised individual entered — alert sent</li>
                  <li>✅ 08:30 — Ravi Kumar (Cold Store Lead) entered — 12 min</li>
                  <li>✅ 11:45 — Priya S. (Supervisor) entered — 8 min</li>
                </ul>
              </div>
            </div>

            <div className="card p-7 border-l-4 border-l-violet-400">
              <div className="text-3xl mb-3">📍</div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Picker Zone Assignment & Idle Detection</h3>
              <p className="text-gray-500 text-sm mb-4 leading-relaxed">Every picker is assigned to a zone for each shift. StaffLenz monitors whether pickers are working in their assigned aisles and flags anyone who has been idle in a non-work area for more than 10 minutes during peak dispatch hours — giving supervisors visibility without walking the floor.</p>
              <div className="bg-violet-50 border border-violet-200 rounded-xl p-4 text-sm">
                <div className="font-bold text-violet-800 mb-2">Zone assignment status:</div>
                <ul className="space-y-1 text-violet-700">
                  <li>⚠ Picker 7: Idle in break area — 22 min during dispatch window</li>
                  <li>⚠ Picker 3: Detected in Aisle C, assigned to Aisle F</li>
                  <li>✓ Pickers 1, 2, 4, 5, 6: In correct zones</li>
                </ul>
              </div>
            </div>

            <div className="card p-7 border-l-4 border-l-sky-400">
              <div className="text-3xl mb-3">⏱️</div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Overtime Verification vs Timesheets</h3>
              <p className="text-gray-500 text-sm mb-4 leading-relaxed">Overtime is a major cost driver in warehouses, especially around peak season. StaffLenz compares actual AI-detected presence on the warehouse floor with self-reported overtime on timesheets — flagging discrepancies for payroll and providing camera-verified evidence for dispute resolution.</p>
              <div className="bg-sky-50 border border-sky-200 rounded-xl p-4 text-sm">
                <div className="font-bold text-sky-800 mb-2">This week&apos;s overtime audit:</div>
                <ul className="space-y-1 text-sky-700">
                  <li>📊 Overtime claimed: 84 hours (self-reported)</li>
                  <li>📷 Overtime verified by AI: 71 hours</li>
                  <li>💰 13-hour discrepancy — flagged for payroll review</li>
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
            <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-indigo-400 bg-indigo-950/60 border border-indigo-800/50 px-4 py-1.5 rounded-full mb-4">Live Dashboard</div>
            <h2 className="text-4xl font-extrabold text-white tracking-tight">What your warehouse manager sees every morning.</h2>
          </div>

          <div className="bg-gray-900 rounded-3xl border border-gray-700 overflow-hidden shadow-2xl">
            <div className="bg-gray-800 px-4 py-3 flex items-center gap-2 border-b border-gray-700">
              <div className="flex gap-1.5"><div className="w-3 h-3 rounded-full bg-red-500"/><div className="w-3 h-3 rounded-full bg-yellow-500"/><div className="w-3 h-3 rounded-full bg-green-500"/></div>
              <div className="flex-1 bg-gray-700 rounded-lg px-3 py-1 text-xs text-gray-400 text-center mx-4">app.stafflenz.com/warehouse</div>
            </div>
            <div className="flex h-[640px]">
              <div className="w-52 bg-gray-950 border-r border-gray-800 p-4 shrink-0 flex flex-col">
                <div className="flex items-center gap-2 mb-5 px-1">
                  <div className="w-7 h-7 bg-gradient-to-br from-blue-600 to-violet-600 rounded-lg flex items-center justify-center text-white font-bold text-xs">SL</div>
                  <span className="font-bold text-white text-sm">StaffLenz</span>
                </div>
                <div className="bg-indigo-500/20 border border-indigo-500/30 rounded-xl px-3 py-2 mb-4">
                  <div className="text-xs font-bold text-indigo-400">📦 Warehouse</div>
                  <div className="text-xs text-gray-400 mt-0.5">FastShip Logistics</div>
                </div>
                {[{i:'📊',l:'Dashboard',a:true},{i:'🚚',l:'Bay Coverage'},{i:'❄️',l:'Cold Storage'},{i:'📍',l:'Zone Assignment'},{i:'⏱️',l:'Overtime'},{i:'🕐',l:'Attendance'}].map(item=>(
                  <div key={item.l} className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl mb-0.5 text-xs cursor-pointer ${item.a?'bg-indigo-500/20 text-indigo-400 font-bold':'text-gray-400 hover:text-white'}`}>{item.i} {item.l}</div>
                ))}
              </div>

              <div className="flex-1 overflow-auto p-5 bg-gray-950 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-extrabold text-white">Warehouse Dashboard</h3>
                    <p className="text-xs text-gray-500">Thursday 3 Apr · Day Shift · Last scan 3 min ago</p>
                  </div>
                  <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400 bg-emerald-900/40 border border-emerald-800/50 px-3 py-1.5 rounded-full"><span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"/>Live</span>
                </div>

                <div className="grid grid-cols-4 gap-3">
                  {[
                    {l:'Staff On Floor',v:'34',s:'of 38 scheduled',c:'text-emerald-400',bg:'bg-emerald-900/30 border-emerald-800/40'},
                    {l:'Bays Unstaffed',v:'1',s:'Bay 3 — 34 min',c:'text-red-400',bg:'bg-red-900/30 border-red-800/40'},
                    {l:'Zone Mismatches',v:'2',s:'Pickers in wrong aisle',c:'text-amber-400',bg:'bg-amber-900/30 border-amber-800/40'},
                    {l:'Restricted Alerts',v:'1',s:'Cold Store A entry',c:'text-violet-400',bg:'bg-violet-900/30 border-violet-800/40'},
                  ].map(k=>(
                    <div key={k.l} className={`border rounded-xl p-3 ${k.bg}`}>
                      <div className={`text-2xl font-extrabold ${k.c}`}>{k.v}</div>
                      <div className="text-xs font-bold text-white mt-0.5">{k.l}</div>
                      <div className="text-xs text-gray-500">{k.s}</div>
                    </div>
                  ))}
                </div>

                <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
                  <h4 className="text-sm font-bold text-white mb-3">Loading Bay Status — Right Now</h4>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      {bay:'Bay 1',status:'Staffed',staff:2,truck:'Inbound · ETA 15 min',ok:true},
                      {bay:'Bay 2',status:'Staffed',staff:1,truck:'Outbound · Loading',ok:true},
                      {bay:'Bay 3',status:'Unmanned',staff:0,truck:'Dispatch window open',ok:false},
                      {bay:'Bay 4',status:'Staffed',staff:2,truck:'Inbound · ETA 10 min',ok:true},
                      {bay:'Bay 5',status:'Idle',staff:1,truck:'No truck scheduled',ok:true},
                      {bay:'Bay 6',status:'Staffed',staff:3,truck:'Outbound · Done',ok:true},
                    ].map(b=>(
                      <div key={b.bay} className={`flex items-center justify-between px-3 py-2.5 rounded-xl border ${b.ok?'bg-emerald-900/20 border-emerald-800/40':'bg-red-900/20 border-red-800/40'}`}>
                        <div>
                          <div className="text-xs font-bold text-white">{b.bay}</div>
                          <div className="text-xs text-gray-500">{b.truck}</div>
                        </div>
                        <div className="text-right">
                          <div className={`text-sm font-extrabold ${b.ok?'text-emerald-400':'text-red-400'}`}>{b.status}</div>
                          <div className="text-xs text-gray-500">{b.staff} staff</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
                    <h4 className="text-sm font-bold text-white mb-3">Cold Storage Access — Today</h4>
                    {[
                      {store:'Cold Store A',time:'10:14',who:'Unrecognised',ok:false},
                      {store:'Cold Store A',time:'08:30',who:'Ravi Kumar',ok:true},
                      {store:'Cold Store B',time:'09:55',who:'Priya S.',ok:true},
                      {store:'Pharma Store',time:'11:20',who:'Anita Lead',ok:true},
                    ].map((z,i)=>(
                      <div key={i} className="flex items-center gap-2 py-2 border-b border-gray-800 last:border-0">
                        <div className={`w-2 h-2 rounded-full shrink-0 ${z.ok?'bg-emerald-500':'bg-red-500'}`}/>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-semibold text-white">{z.store}</div>
                          <div className="text-xs text-gray-500">{z.who}</div>
                        </div>
                        <div className="text-xs text-gray-400">{z.time}</div>
                      </div>
                    ))}
                  </div>

                  <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
                    <h4 className="text-sm font-bold text-white mb-3">Picker Zone Assignment</h4>
                    {[
                      {picker:'Picker 1',assigned:'Aisle A–B',current:'Aisle A',ok:true},
                      {picker:'Picker 2',assigned:'Aisle C–D',current:'Aisle C',ok:true},
                      {picker:'Picker 3',assigned:'Aisle F',current:'Aisle C',ok:false},
                      {picker:'Picker 5',assigned:'Aisle G–H',current:'Aisle G',ok:true},
                      {picker:'Picker 7',assigned:'Aisle I',current:'Break Area',ok:false},
                    ].map(p=>(
                      <div key={p.picker} className="flex items-center gap-2 py-2 border-b border-gray-800 last:border-0">
                        <div className={`w-2 h-2 rounded-full shrink-0 ${p.ok?'bg-emerald-500':'bg-amber-500'}`}/>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-semibold text-white">{p.picker}</div>
                          <div className="text-xs text-gray-500">→ {p.current}</div>
                        </div>
                        {!p.ok && <div className="text-xs text-amber-400 font-bold">⚠</div>}
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
      <IndustryPricing plans={PRICING} accentColor="#6366f1" industryLabel="Warehouse & Logistics" />
      <CameraGrid industry="warehouse" />
      <PipelineDemoSection frames={FRAMES} accentColor="#6366f1" industry="warehouse" />

      <section id="demo" className="py-20 px-4 bg-gradient-to-br from-indigo-600 to-blue-700">
        <div className="max-w-4xl mx-auto text-center text-white">
          <h2 className="text-4xl font-extrabold mb-4">See every bay, every aisle, every access event — live.</h2>
          <p className="text-indigo-100 text-lg mb-8">We configure StaffLenz for your warehouse layout and deliver live bay and zone data within 48 hours.</p>
          <Link href="/#contact" className="inline-flex items-center gap-2 bg-white text-indigo-700 font-bold px-10 py-4 rounded-xl hover:bg-indigo-50 transition-all shadow-2xl text-base">Book Free On-Site Demo <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg></Link>
        </div>
      </section>

      <footer className="py-8 px-4 bg-gray-950 border-t border-gray-900 text-center text-sm text-gray-600">
        <div className="flex items-center justify-center gap-2 mb-3"><div className="w-7 h-7 bg-gradient-to-br from-blue-600 to-violet-600 rounded-lg flex items-center justify-center text-white font-bold text-xs">SL</div><span className="font-extrabold text-white">StaffLenz</span></div>
        <div className="flex flex-wrap items-center justify-center gap-4 mb-2">
          <Link href="/" className="hover:text-white">Home</Link>
          <Link href="/industries/factory" className="hover:text-white">Factory</Link>
          <Link href="/industries/construction" className="hover:text-white">Construction</Link>
          <Link href="/industries/restaurant" className="hover:text-white">Restaurant</Link>
          <Link href="/industries/hospital" className="hover:text-white">Hospital</Link>
          <Link href="/industries/security" className="hover:text-white">Security</Link>
        </div>
        <p>© {new Date().getFullYear()} StaffLenz · AI-Powered Workforce Intelligence</p>
      </footer>
    </div>
  );
}
