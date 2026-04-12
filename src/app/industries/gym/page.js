'use client';
import Link from 'next/link';
import PipelineDemoSection from '@/components/PipelineDemoSection';
import CameraGrid from '@/components/CameraGrid';
import IndustryPricing from '@/components/IndustryPricing';

const PRICING = [
  {
    name: 'Starter', price: 69, ideal: 'Single gym', highlight: false,
    features: ['Up to 10 trainers monitored', '4 cameras (floor, weights, cardio, reception)', 'Reception coverage alerts', 'Trainer on-duty tracker', 'WhatsApp alerts', 'Daily footfall summary'],
  },
  {
    name: 'Professional', price: 129, ideal: 'Mid-size gyms', highlight: true,
    features: ['Up to 25 trainers monitored', '8 cameras (full floor coverage)', 'Peak hour footfall count', 'Unattended equipment alerts', 'Class attendance auto-count', 'Cleaning compliance tracker', 'Weekly member activity report'],
  },
  {
    name: 'Enterprise', price: 249, ideal: 'Gym chains', highlight: false,
    features: ['Up to 60 trainers monitored', '16 cameras across areas', 'Multi-branch dashboard', 'Cross-branch benchmarking', 'Owner morning summary', 'API access', 'Dedicated support'],
  },
];

const FRAMES = [
  {
    sceneLabel: 'Reception Unmanned',
    sceneIcon: '🏋️',
    sceneDescription: 'Reception camera scan — checking front desk during peak evening hours',
    zone: 'Reception · CAM 01',
    camId: '01',
    aiPrompt: 'Is there a staff member at the gym reception desk right now?',
    detections: [
      { label: '⚠ Reception Empty', color: '#ef4444', x: '25%', y: '10%', w: '50%', h: '65%' },
      { label: 'Member Waiting', color: '#f59e0b', x: '72%', y: '30%', w: '18%', h: '45%' },
    ],
    output: {
      icon: '🚨', title: 'Reception Unmanned', tag: 'Front Desk Alert · 6 min gap',
      borderColor: '#ef444460', bgColor: '#450a0a40', iconBg: '#ef4444', tagColor: '#fca5a5',
      lines: [
        { icon: '🔴', text: 'Reception desk unmanned for 6 minutes' },
        { icon: '👤', text: '1 member waiting to sign in' },
        { icon: '📍', text: 'Zone: Reception · Cam 01 · 18:42' },
      ],
      action: '⚡ Manager notified on WhatsApp instantly',
      whatsapp: '🚨 *RECEPTION UNMANNED — Gym*\n\nFront desk empty for 6+ minutes.\nMember detected waiting.\n\nReception · Cam 01 · 18:42\n\nPlease send staff to reception immediately.',
    },
  },
  {
    sceneLabel: 'Trainer Off Floor',
    sceneIcon: '💪',
    sceneDescription: 'Weights area scan — verifying floor trainer presence during peak hours',
    zone: 'Weights Floor · CAM 03',
    camId: '03',
    aiPrompt: 'Is the floor trainer visible in the weights area? How many members are currently working out?',
    detections: [
      { label: '⚠ No trainer detected', color: '#ef4444', x: '5%', y: '10%', w: '90%', h: '60%' },
      { label: '12 members present', color: '#f59e0b', x: '8%', y: '40%', w: '20%', h: '50%' },
    ],
    output: {
      icon: '💪', title: 'Trainer Off Floor', tag: 'Weights Alert · Peak Hour',
      borderColor: '#f59e0b60', bgColor: '#2d1b0040', iconBg: '#f59e0b', tagColor: '#fcd34d',
      lines: [
        { icon: '🏋️', text: '12 members on weights floor · no trainer visible' },
        { icon: '⏱️', text: 'Trainer last seen 14 minutes ago' },
        { icon: '⚠️', text: 'Liability risk — peak workout hour' },
      ],
      action: '📢 Owner alerted to recall floor trainer',
      whatsapp: '⚠️ *TRAINER OFF FLOOR — Weights*\n\n12 members on floor, no trainer.\nLast seen 14 min ago.\n\nWeights Floor · Cam 03 · 18:52\n\nPlease dispatch a trainer immediately.',
    },
  },
  {
    sceneLabel: 'Peak Hour Footfall',
    sceneIcon: '📊',
    sceneDescription: 'Cardio section headcount — verifying expected evening peak attendance',
    zone: 'Cardio Area · CAM 05',
    camId: '05',
    aiPrompt: 'Count the number of members currently active in the cardio section.',
    detections: [
      { label: 'Member 1', color: '#10b981', x: '5%', y: '20%', w: '15%', h: '55%' },
      { label: 'Member 2', color: '#10b981', x: '25%', y: '25%', w: '15%', h: '50%' },
      { label: 'Member 3', color: '#10b981', x: '45%', y: '18%', w: '15%', h: '55%' },
      { label: '+ 11 more', color: '#22c55e', x: '65%', y: '10%', w: '30%', h: '70%' },
    ],
    output: {
      icon: '📊', title: 'Peak Hour Confirmed', tag: 'Cardio · Live Count',
      borderColor: '#22c55e60', bgColor: '#14532d30', iconBg: '#22c55e', tagColor: '#86efac',
      lines: [
        { icon: '🏃', text: 'Cardio: 14 members active · 78% capacity' },
        { icon: '💪', text: 'Weights Floor: 12 members · Trainer on duty' },
        { icon: '📈', text: 'Live footfall matches expected 18:30–20:00 peak' },
      ],
      action: '✅ Auto-logged into daily footfall report',
      whatsapp: '📊 *PEAK HOUR SUMMARY — Gym*\n\nCardio: 14 members\nWeights: 12 members\nClass Studio A: 18 members\n\nPeak capacity confirmed.\nAll zones covered.\n18:47 · Mon',
    },
  },
];

export default function GymPage() {
  return (
    <div className="min-h-screen overflow-x-hidden">

      <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-xl border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-gradient-to-br from-blue-600 to-violet-600 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-blue-200">SL</div>
            <span className="font-extrabold text-xl text-gray-900 tracking-tight">StaffLenz</span>
          </Link>
          <div className="hidden md:flex items-center gap-4 text-sm font-medium text-gray-500">
            <Link href="/" className="hover:text-gray-900 transition-colors">Home</Link>
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
                <Link href="/industries/gym" className="flex items-center gap-1 text-xs font-medium text-gray-600 hover:text-gray-900 px-2 py-1.5 rounded-lg hover:bg-gray-50">🏋️ Gym</Link>
              </div>
            </div>
            <Link href="/#pricing" className="hover:text-gray-900 transition-colors">Pricing</Link>
          </div>
          <div className="flex items-center gap-3">
            <a href="#demo" className="hidden sm:block text-sm font-semibold text-green-600 hover:text-green-700">Book Demo</a>
            <Link href="/login" className="btn-primary text-sm px-5 bg-green-600 hover:bg-green-700">Login →</Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative bg-[#041408] text-white overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-green-950/80 via-[#041408] to-emerald-950/60" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-green-600/20 rounded-full blur-[120px]" />
        <div className="absolute inset-0 opacity-[0.04]" style={{backgroundImage:'linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)',backgroundSize:'50px 50px'}} />
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 pt-20 pb-24">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 bg-green-500/20 border border-green-400/30 rounded-full px-5 py-2 text-sm font-medium text-green-300 mb-6">🏋️ Gym & Fitness</div>
              <h1 className="text-5xl md:text-6xl font-extrabold mb-6 leading-[1.1] tracking-tight">
                Know when your trainer is<br />off the floor. See your real<br /><span className="bg-clip-text text-transparent bg-gradient-to-r from-green-400 to-emerald-400">peak hour footfall.</span>
              </h1>
              <p className="text-lg text-slate-300 mb-8 leading-relaxed">
                StaffLenz turns your gym CCTV into a live operations dashboard — tracking trainer presence on every floor, counting members in each zone, flagging unmanned reception at peak, and verifying cleaning compliance. No new hardware. Live in 5 minutes.
              </p>
              <div className="flex flex-wrap gap-4">
                <a href="#demo" className="inline-flex items-center gap-2 bg-green-600 text-white font-bold px-8 py-4 rounded-xl hover:bg-green-700 transition-all shadow-2xl shadow-green-900/40 text-base">Book a Free Demo <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg></a>
                <a href="#dashboard" className="inline-flex items-center gap-2 bg-white/10 border border-white/20 text-white font-semibold px-8 py-4 rounded-xl hover:bg-white/20 transition-all text-base">See the Dashboard</a>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[
                {n:'Trainer Presence',l:'Live On-Floor',sub:'know the moment a trainer walks off the weights floor'},
                {n:'Peak Footfall',l:'Real Hour-by-Hour',sub:'count members by zone — cardio, weights, studio'},
                {n:'Reception',l:'Always Manned',sub:'alert if front desk is empty for more than 3 minutes'},
                {n:'Class Attendance',l:'Auto-Counted',sub:'no more manual headcount — photo says it all'},
              ].map(({n,l,sub})=>(
                <div key={l} className="bg-white/5 border border-white/10 rounded-2xl p-5 backdrop-blur">
                  <div className="text-lg font-extrabold text-green-400 mb-1">{n}</div>
                  <div className="text-sm font-bold text-white">{l}</div>
                  <div className="text-xs text-slate-400 mt-0.5">{sub}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <CameraGrid industry="gym" />

      <PipelineDemoSection frames={FRAMES} accentColor="#22c55e" industry="gym" />

      {/* Gym-specific solutions */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <div className="section-label mb-4">Gym-Specific Intelligence</div>
            <h2 className="text-4xl font-extrabold text-gray-900 tracking-tight">Built around how a gym actually runs.<br/>Not how a software company thinks it runs.</h2>
            <p className="mt-4 text-gray-500 max-w-2xl mx-auto">From trainer presence on the weights floor to real peak hour footfall to cleaning compliance — StaffLenz tracks the things that directly affect member experience and retention.</p>
          </div>

          <div className="grid lg:grid-cols-2 gap-8">
            <div className="card p-7 border-l-4 border-l-green-400">
              <div className="text-3xl mb-3">💪</div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Trainer On-Floor Verification</h3>
              <p className="text-gray-500 text-sm mb-4 leading-relaxed">Members pay for a trainer on the floor. StaffLenz checks every 5 minutes whether a trainer is visible in the weights area, cardio zone, and studio — and alerts you the moment the floor goes unattended during peak hours.</p>
              <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-sm">
                <div className="font-bold text-green-800 mb-2">Live trainer status at 7 PM:</div>
                <ul className="space-y-1 text-green-700">
                  <li>🟢 Weights Floor: Trainer Karthik · On duty</li>
                  <li>🟢 Cardio Zone: Trainer Priya · On duty</li>
                  <li>🔴 Functional Area: No trainer detected · 8 min</li>
                  <li>⚡ Alert sent to owner WhatsApp</li>
                </ul>
              </div>
            </div>

            <div className="card p-7 border-l-4 border-l-emerald-400">
              <div className="text-3xl mb-3">📊</div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Real Peak Hour Footfall</h3>
              <p className="text-gray-500 text-sm mb-4 leading-relaxed">Stop guessing when your real peak hours are. StaffLenz counts members in every zone every 5 minutes and builds an hour-by-hour footfall chart — so you know when to staff more, when to run classes, and whether your 18:00–20:00 peak is actually your peak.</p>
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-sm">
                <div className="font-bold text-emerald-800 mb-2">Mon Apr 12 — Member count by hour:</div>
                <ul className="space-y-1 text-emerald-700">
                  <li>06:00–08:00 morning: avg 18 members</li>
                  <li>12:00–14:00 lunch: avg 9 members</li>
                  <li>18:00–20:00 evening: avg 42 members ★</li>
                  <li>20:00–22:00 late: avg 21 members</li>
                </ul>
              </div>
            </div>

            <div className="card p-7 border-l-4 border-l-teal-400">
              <div className="text-3xl mb-3">🧹</div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Cleaning Compliance</h3>
              <p className="text-gray-500 text-sm mb-4 leading-relaxed">Cleanliness directly affects member retention. StaffLenz monitors cleaning staff presence in changing rooms, around equipment, and in common areas — and alerts you if a scheduled cleaning round wasn't performed.</p>
              <div className="bg-teal-50 border border-teal-200 rounded-xl p-4 text-sm">
                <div className="font-bold text-teal-800 mb-2">Cleaning schedule — Today:</div>
                <ul className="space-y-1 text-teal-700">
                  <li>🟢 10:00 changing rooms: Completed ✓</li>
                  <li>🟢 14:00 weights floor wipedown: Completed ✓</li>
                  <li>🔴 18:00 cardio wipedown: MISSED (not yet done)</li>
                  <li>⚠ Reminder sent to cleaning staff</li>
                </ul>
              </div>
            </div>

            <div className="card p-7 border-l-4 border-l-lime-400">
              <div className="text-3xl mb-3">🎓</div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Class Attendance Auto-Count</h3>
              <p className="text-gray-500 text-sm mb-4 leading-relaxed">No more paper registers. The class studio camera auto-counts participants at the start of each class — so you know which classes are popular, which are underfilled, and whether your morning yoga is actually making its break-even headcount.</p>
              <div className="bg-lime-50 border border-lime-200 rounded-xl p-4 text-sm">
                <div className="font-bold text-lime-800 mb-2">Today's classes — Studio A:</div>
                <ul className="space-y-1 text-lime-700">
                  <li>🟢 06:00 Yoga: 12 participants (break-even: 8) ✓</li>
                  <li>🟢 08:00 HIIT: 18 participants (capacity: 20)</li>
                  <li>🟡 11:00 Pilates: 5 participants (break-even: 8) ✗</li>
                  <li>🟢 18:00 Zumba: 22 participants — full capacity</li>
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
            <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-green-400 bg-green-950/60 border border-green-800/50 px-4 py-1.5 rounded-full mb-4">Live Dashboard</div>
            <h2 className="text-4xl font-extrabold text-white tracking-tight">What you see on the owner's dashboard at 7 PM.</h2>
          </div>

          <div className="bg-gray-900 rounded-3xl border border-gray-700 overflow-hidden shadow-2xl">
            <div className="bg-gray-800 px-4 py-3 flex items-center gap-2 border-b border-gray-700">
              <div className="flex gap-1.5"><div className="w-3 h-3 rounded-full bg-red-500"/><div className="w-3 h-3 rounded-full bg-yellow-500"/><div className="w-3 h-3 rounded-full bg-green-500"/></div>
              <div className="flex-1 bg-gray-700 rounded-lg px-3 py-1 text-xs text-gray-400 text-center mx-4">app.stafflenz.com/gym</div>
            </div>
            <div className="flex h-[640px]">
              <div className="w-52 bg-gray-950 border-r border-gray-800 p-4 shrink-0 flex flex-col">
                <div className="flex items-center gap-2 mb-5 px-1">
                  <div className="w-7 h-7 bg-gradient-to-br from-blue-600 to-violet-600 rounded-lg flex items-center justify-center text-white font-bold text-xs">SL</div>
                  <span className="font-bold text-white text-sm">StaffLenz</span>
                </div>
                <div className="bg-green-500/20 border border-green-500/30 rounded-xl px-3 py-2 mb-4">
                  <div className="text-xs font-bold text-green-400">🏋️ Gym</div>
                  <div className="text-xs text-gray-400 mt-0.5">FitLenz HQ · Kochi</div>
                </div>
                {[{i:'📊',l:'Dashboard',a:true},{i:'💪',l:'Trainer Floor'},{i:'📈',l:'Footfall'},{i:'🎓',l:'Classes'},{i:'🕐',l:'Attendance'},{i:'👷',l:'Staff'}].map(item=>(
                  <div key={item.l} className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl mb-0.5 text-xs cursor-pointer ${item.a?'bg-green-500/20 text-green-400 font-bold':'text-gray-400 hover:text-white'}`}>{item.i} {item.l}</div>
                ))}
              </div>

              <div className="flex-1 overflow-auto p-5 bg-gray-950 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-extrabold text-white">Gym Dashboard</h3>
                    <p className="text-xs text-gray-500">Monday 12 Apr · 18:47 · Peak hour</p>
                  </div>
                  <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400 bg-emerald-900/40 border border-emerald-800/50 px-3 py-1.5 rounded-full"><span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"/>Live</span>
                </div>

                <div className="grid grid-cols-4 gap-3">
                  {[
                    {l:'Members on Floor',v:'42',s:'cardio + weights + studio',c:'text-emerald-400',bg:'bg-emerald-900/30 border-emerald-800/40'},
                    {l:'Trainers On-Duty',v:'3',s:'of 4 scheduled',c:'text-green-400',bg:'bg-green-900/30 border-green-800/40'},
                    {l:'Peak Utilisation',v:'78%',s:'target 70–85%',c:'text-lime-400',bg:'bg-lime-900/30 border-lime-800/40'},
                    {l:'Open Alerts',v:'1',s:'functional area',c:'text-red-400',bg:'bg-red-900/30 border-red-800/40'},
                  ].map(k=>(
                    <div key={k.l} className={`border rounded-xl p-3 ${k.bg}`}>
                      <div className={`text-xl font-extrabold ${k.c}`}>{k.v}</div>
                      <div className="text-xs font-bold text-white mt-0.5">{k.l}</div>
                      <div className="text-xs text-gray-500">{k.s}</div>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Zone status */}
                  <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
                    <h4 className="text-sm font-bold text-white mb-3">Live Zone Status</h4>
                    {[
                      {zone:'Weights Floor',members:12,trainer:'Karthik',status:'On duty',ok:true},
                      {zone:'Cardio Area',members:14,trainer:'Priya',status:'On duty',ok:true},
                      {zone:'Studio A (Zumba)',members:16,trainer:'Meera',status:'Class running',ok:true},
                      {zone:'Functional Area',members:4,trainer:null,status:'No trainer · 8 min',warn:true},
                      {zone:'Reception',members:1,trainer:'Sneha',status:'On duty',ok:true},
                    ].map(f=>(
                      <div key={f.zone} className="mb-2.5">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-semibold text-white">{f.zone}</span>
                          <span className={`text-xs font-semibold ${f.warn?'text-amber-400':f.ok?'text-emerald-400':'text-gray-400'}`}>{f.members} members · {f.status}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Footfall + alerts */}
                  <div className="space-y-4">
                    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
                      <h4 className="text-sm font-bold text-white mb-3">Footfall — Today</h4>
                      <div className="grid grid-cols-2 gap-3">
                        {[
                          {l:'Morning (6–10)',v:'34',c:'text-white'},
                          {l:'Lunch (12–14)',v:'11',c:'text-gray-400'},
                          {l:'Evening (17–21)',v:'67 so far',c:'text-green-400'},
                          {l:'Peak Utilisation',v:'78%',c:'text-lime-400'},
                        ].map(s=>(
                          <div key={s.l} className="bg-gray-800/60 rounded-xl p-2.5 text-center">
                            <div className={`text-lg font-extrabold ${s.c}`}>{s.v}</div>
                            <div className="text-xs text-gray-500">{s.l}</div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
                      <h4 className="text-sm font-bold text-white mb-2">Open Alerts</h4>
                      <div className="space-y-2">
                        {[
                          {t:'Functional Area — No Trainer',s:'4 members active · 8 min gap',c:'border-red-500 bg-red-900/20'},
                        ].map((a,i)=>(
                          <div key={i} className={`border-l-2 rounded-r-xl px-3 py-2 ${a.c}`}>
                            <div className="text-xs font-bold text-white">{a.t}</div>
                            <div className="text-xs text-gray-400">{a.s}</div>
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

      <IndustryPricing plans={PRICING} accentColor="#22c55e" industryLabel="Gym & Fitness" />

      <section id="demo" className="py-20 px-4 bg-gradient-to-br from-green-700 to-emerald-800">
        <div className="max-w-4xl mx-auto text-center text-white">
          <h2 className="text-4xl font-extrabold mb-4">Know the moment your trainer walks off the floor — before a member complains.</h2>
          <p className="text-green-100 text-lg mb-8">We set up your gym's cameras and show you live trainer presence and footfall within 48 hours.</p>
          <Link href="/#contact" className="inline-flex items-center gap-2 bg-white text-green-700 font-bold px-10 py-4 rounded-xl hover:bg-green-50 transition-all shadow-2xl text-base">Book Free On-Site Demo <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg></Link>
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
