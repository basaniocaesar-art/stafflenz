'use client';
import Link from 'next/link';
import PipelineDemoSection from '@/components/PipelineDemoSection';
import CameraGrid from '@/components/CameraGrid';
import IndustryPricing from '@/components/IndustryPricing';

const PRICING = [
  {
    name: 'Starter', price: 89, ideal: 'Boutique hotels', highlight: false,
    features: ['Up to 25 staff monitored', '8 cameras (8-ch DVR — lobby, corridors, restaurant)', 'Reception coverage alerts', 'Housekeeping corridor tracker', 'WhatsApp alerts', 'Daily ops summary'],
  },
  {
    name: 'Professional', price: 169, ideal: 'Mid-size hotels', highlight: true,
    features: ['Up to 60 staff monitored', '16 cameras (16-ch DVR) across public areas', 'Restaurant + banquet coverage', 'Cover ratio monitoring', 'Break overlap alerts', 'Hygiene compliance alerts', 'Daily ops report'],
  },
  {
    name: 'Enterprise', price: 329, ideal: 'Hotel chains', highlight: false,
    features: ['Up to 100 staff monitored', '32 cameras (32-ch DVR)', 'Multi-property dashboard', 'Cross-property benchmarking', 'GM morning summary', 'API access', 'Dedicated support'],
  },
];

const FRAMES = [
  {
    sceneLabel: 'Reception Unmanned',
    video_query: 'hotel reception lobby front desk empty',
    sceneIcon: '🏨',
    sceneDescription: 'Lobby camera scan — monitoring front desk staffing during check-in hours',
    zone: 'Lobby Reception · CAM 01',
    camId: '01',
    aiPrompt: 'Is there a staff member present at the hotel reception desk right now?',
    detections: [
      { label: '⚠ Reception Desk Empty', color: '#ef4444', x: '25%', y: '10%', w: '50%', h: '65%' },
      { label: 'Guest Waiting', color: '#f59e0b', x: '72%', y: '30%', w: '18%', h: '45%' },
    ],
    output: {
      icon: '🚨', title: 'Reception Unmanned', tag: 'Lobby Alert · 4 min gap',
      borderColor: '#ef444460', bgColor: '#450a0a40', iconBg: '#ef4444', tagColor: '#fca5a5',
      lines: [
        { icon: '🔴', text: 'Reception desk unmanned for 4 minutes' },
        { icon: '👤', text: '1 guest waiting — no staff in sight' },
        { icon: '📍', text: 'Zone: Lobby · Cam 01 · 14:32' },
      ],
      action: '⚡ Front office manager alerted immediately',
      whatsapp: '🚨 *RECEPTION UNMANNED — Lobby*\n\nFront desk empty for 4+ minutes.\nGuest detected waiting at counter.\n\nLobby · Cam 01 · 14:32\n\nPlease send staff to reception immediately.',
    },
  },
  {
    sceneLabel: 'Room Turnover Delay',
    video_query: 'hotel corridor hallway housekeeping cart',
    sceneIcon: '🛏️',
    sceneDescription: 'Floor 3 housekeeping scan — tracking room turnover progress vs checkout time',
    zone: 'Floor 3 Corridor · CAM 07',
    camId: '07',
    aiPrompt: 'How many housekeeping staff are working on this floor and which rooms are in progress?',
    detections: [
      { label: 'Housekeeper — Rm 301', color: '#10b981', x: '8%', y: '20%', w: '20%', h: '55%' },
      { label: '⚠ Rm 308 — No staff', color: '#ef4444', x: '50%', y: '10%', w: '40%', h: '70%' },
    ],
    output: {
      icon: '⏱️', title: 'Turnover Behind Schedule', tag: 'Housekeeping Alert · Floor 3',
      borderColor: '#f59e0b60', bgColor: '#2d1b0040', iconBg: '#f59e0b', tagColor: '#fcd34d',
      lines: [
        { icon: '🛏️', text: 'Floor 3: 4 of 8 rooms not yet started at 13:00' },
        { icon: '👤', text: 'Only 1 housekeeper detected on this floor' },
        { icon: '⏰', text: 'Check-in begins at 14:00 — risk of delay' },
      ],
      action: '📢 Housekeeping supervisor notified to reallocate staff',
      whatsapp: '⏱️ *TURNOVER DELAY — Floor 3*\n\n4 of 8 rooms not started at 13:00.\nOnly 1 housekeeper on floor.\nCheck-in starts 14:00.\n\nFloor 3 · Cam 07\n\nPlease send additional housekeeping staff.',
    },
  },
  {
    sceneLabel: 'Restaurant Cover Ratio',
    video_query: 'hotel restaurant dining guests tables',
    sceneIcon: '🍽️',
    sceneDescription: 'Restaurant floor scan — checking waiter-to-cover ratio during lunch service',
    zone: 'Restaurant Floor · CAM 04',
    camId: '04',
    aiPrompt: 'Count floor staff visible in the restaurant. How many tables appear occupied?',
    detections: [
      { label: 'Waiter — Priya S.', color: '#10b981', x: '8%', y: '18%', w: '18%', h: '55%' },
      { label: '⚠ 14 covers · 1 waiter', color: '#ef4444', x: '35%', y: '8%', w: '55%', h: '55%' },
    ],
    output: {
      icon: '⚠️', title: 'Cover Ratio Breached', tag: 'Restaurant Alert · Lunch Service',
      borderColor: '#ef444460', bgColor: '#450a0a30', iconBg: '#ef4444', tagColor: '#fca5a5',
      lines: [
        { icon: '🍽️', text: '14 covers seated · only 1 waiter on floor' },
        { icon: '📊', text: 'Ratio 1:14 — target is 1:8' },
        { icon: '⚠️', text: '2 waiters detected in staff room during service' },
      ],
      action: '📢 F&B manager alerted — floor staff recalled',
      whatsapp: '⚠️ *COVER RATIO ALERT — Restaurant*\n\nCovers: 14 · Floor staff: 1\nRatio 1:14 (target: 1:8)\n\n2 waiters in staff room during service.\nRestaurant Floor · Cam 04 · 12:48\n\nPlease recall staff to floor.',
    },
  },
  {
    sceneLabel: 'Banquet Staffing',
    video_query: 'hotel banquet hall event wedding setup',
    sceneIcon: '🎊',
    sceneDescription: 'Banquet hall pre-event check — verifying staffing level before guests arrive',
    zone: 'Banquet Hall A · CAM 08',
    camId: '08',
    aiPrompt: 'How many banquet service staff are present in the hall? Minimum required is 8.',
    detections: [
      { label: 'Staff 1 ✓', color: '#10b981', x: '5%', y: '22%', w: '15%', h: '50%' },
      { label: 'Staff 2 ✓', color: '#10b981', x: '30%', y: '25%', w: '15%', h: '48%' },
      { label: 'Staff 3 ✓', color: '#10b981', x: '55%', y: '20%', w: '15%', h: '52%' },
      { label: '⚠ 5 More Needed', color: '#f59e0b', x: '72%', y: '10%', w: '22%', h: '65%' },
    ],
    output: {
      icon: '🎊', title: 'Banquet Understaffed', tag: 'Event Alert · Hall A · 60 min to start',
      borderColor: '#a855f760', bgColor: '#3b0764 30', iconBg: '#a855f7', tagColor: '#d8b4fe',
      lines: [
        { icon: '🎊', text: 'Hall A: 3 staff present — 8 required' },
        { icon: '⏰', text: 'Event starts in 60 minutes — critical gap' },
        { icon: '👥', text: '5 additional staff needed immediately' },
      ],
      action: '🚨 Banquet manager and GM notified',
      whatsapp: '🚨 *BANQUET UNDERSTAFFED — Hall A*\n\nEvent in 60 minutes.\nStaff present: 3 / Required: 8\n\n5 additional staff needed NOW.\nBanquet Hall A · Cam 08\n\nPlease escalate to banquet manager.',
    },
  },
];

export default function HotelPage() {
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
            <a href="#demo" className="hidden sm:block text-sm font-semibold text-violet-600 hover:text-violet-700">Book Demo</a>
            <Link href="/login" className="btn-primary text-sm px-5 bg-violet-600 hover:bg-violet-700">Login →</Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative bg-[#0A0414] text-white overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-violet-950/80 via-[#0A0414] to-purple-950/60" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-violet-600/20 rounded-full blur-[120px]" />
        <div className="absolute inset-0 opacity-[0.04]" style={{backgroundImage:'linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)',backgroundSize:'50px 50px'}} />
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 pt-20 pb-24">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 bg-violet-500/20 border border-violet-400/30 rounded-full px-5 py-2 text-sm font-medium text-violet-300 mb-6">🏨 Hotel & Hospitality</div>
              <h1 className="text-5xl md:text-6xl font-extrabold mb-6 leading-[1.1] tracking-tight">
                Know which rooms<br />are cleaned, how<br /><span className="bg-clip-text text-transparent bg-gradient-to-r from-violet-400 to-purple-400">full the restaurant is.</span>
              </h1>
              <p className="text-lg text-slate-300 mb-8 leading-relaxed">
                StaffLenz gives you live room turnover progress floor by floor, real-time restaurant cover count, reception coverage status, and alerts when any guest-facing area is left unmanned — things no other workforce tool tracks.
              </p>
              <div className="flex flex-wrap gap-4">
                <a href="#demo" className="inline-flex items-center gap-2 bg-violet-600 text-white font-bold px-8 py-4 rounded-xl hover:bg-violet-700 transition-all shadow-2xl shadow-violet-900/40 text-base">Book a Free Demo <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg></a>
                <a href="#dashboard" className="inline-flex items-center gap-2 bg-white/10 border border-white/20 text-white font-semibold px-8 py-4 rounded-xl hover:bg-white/20 transition-all text-base">See the Dashboard</a>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[
                {n:'Room Turnover',l:'Floor-by-Floor Progress',sub:'which rooms are done, in progress, or pending'},
                {n:'Restaurant Covers',l:'Live Guest Count',sub:'how many guests are seated vs capacity right now'},
                {n:'Reception',l:'Always Manned',sub:'alert if front desk is empty for over 3 minutes'},
                {n:'Banquet Staffing',l:'Event-Specific',sub:'right number of staff for the event size'},
              ].map(({n,l,sub})=>(
                <div key={l} className="bg-white/5 border border-white/10 rounded-2xl p-5 backdrop-blur">
                  <div className="text-lg font-extrabold text-violet-400 mb-1">{n}</div>
                  <div className="text-sm font-bold text-white">{l}</div>
                  <div className="text-xs text-slate-400 mt-0.5">{sub}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>


      <CameraGrid industry="hotel" />

      <PipelineDemoSection frames={FRAMES} accentColor="#8b5cf6" industry="hotel" />


      {/* Hotel-specific solutions */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <div className="section-label mb-4">Hotel-Specific Intelligence</div>
            <h2 className="text-4xl font-extrabold text-gray-900 tracking-tight">Built around how a hotel actually runs. <br/>Not how an IT company thinks it runs.</h2>
            <p className="mt-4 text-gray-500 max-w-2xl mx-auto">From housekeeping floor progress to restaurant cover count to banquet staffing ratios — StaffLenz tracks the things that directly affect your guest experience and TripAdvisor score.</p>
          </div>

          <div className="grid lg:grid-cols-2 gap-8">
            <div className="card p-7 border-l-4 border-l-violet-400">
              <div className="text-3xl mb-3">🛏️</div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Room Turnover Tracking, Floor by Floor</h3>
              <p className="text-gray-500 text-sm mb-4 leading-relaxed">Each floor is a camera zone. StaffLenz tracks when a housekeeper enters and exits a room area, estimates cleaning time, and gives you a live progress count of how many rooms are done, in-progress, or untouched — so your front desk knows exactly when rooms are ready for check-in.</p>
              <div className="bg-violet-50 border border-violet-200 rounded-xl p-4 text-sm">
                <div className="font-bold text-violet-800 mb-2">What you see on the dashboard at 11 AM:</div>
                <ul className="space-y-1 text-violet-700">
                  <li>🟢 Floor 2: 8/10 rooms complete · 2 in progress</li>
                  <li>🟡 Floor 3: 4/12 rooms complete · 8 pending</li>
                  <li>🔴 Floor 5: Not started — housekeeper absent</li>
                  <li>⚡ Expected ready-for-check-in: 14:30</li>
                </ul>
              </div>
            </div>

            <div className="card p-7 border-l-4 border-l-purple-400">
              <div className="text-3xl mb-3">🍽️</div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Restaurant Cover Count & Waiter Ratio</h3>
              <p className="text-gray-500 text-sm mb-4 leading-relaxed">The restaurant camera zone counts how many guests are seated and how many waiters are on the floor — giving you a live cover-to-waiter ratio. When guests per waiter exceeds your threshold, you get an alert to send additional staff before service quality drops.</p>
              <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 text-sm">
                <div className="font-bold text-purple-800 mb-2">Live restaurant status at 1 PM:</div>
                <ul className="space-y-1 text-purple-700">
                  <li>🍽 Covers seated: 47 guests</li>
                  <li>👨‍🍳 Waiters on floor: 3 (ratio: 15.6 covers per waiter)</li>
                  <li>⚠ Alert: Ratio exceeded 12:1 — send 1 more waiter</li>
                  <li>✅ Kitchen: 6 staff present · Prep on schedule</li>
                </ul>
              </div>
            </div>

            <div className="card p-7 border-l-4 border-l-pink-400">
              <div className="text-3xl mb-3">🎪</div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Banquet & Event Staffing Compliance</h3>
              <p className="text-gray-500 text-sm mb-4 leading-relaxed">Banquet events need specific staffing ratios — typically 1 waiter per 20 guests for a sit-down dinner. StaffLenz monitors headcount in the banquet hall before and during the event, alerting you if your setup crew hasn't fully arrived or your service ratio drops mid-event.</p>
              <div className="bg-pink-50 border border-pink-200 rounded-xl p-4 text-sm">
                <div className="font-bold text-pink-800 mb-2">Banquet Hall A — Wedding Dinner tonight:</div>
                <ul className="space-y-1 text-pink-700">
                  <li>🎪 Expected guests: 250 · Required staff: 12</li>
                  <li>👷 Setup crew present: 8/8 ✓</li>
                  <li>🍽 Service staff confirmed for 7 PM: 11/12</li>
                  <li>⚠ 1 waiter short — confirming replacement</li>
                </ul>
              </div>
            </div>

            <div className="card p-7 border-l-4 border-l-indigo-400">
              <div className="text-3xl mb-3">🏊</div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Pool, Gym & Recreation Coverage</h3>
              <p className="text-gray-500 text-sm mb-4 leading-relaxed">Unmanned pool or gym is a liability. StaffLenz monitors your pool deck and gym floor for lifeguard and trainer presence. If the pool is open and no lifeguard is detected in the zone for more than 5 minutes, you get an immediate alert — before a guest notices or a liability incident occurs.</p>
              <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 text-sm">
                <div className="font-bold text-indigo-800 mb-2">Amenity area status:</div>
                <ul className="space-y-1 text-indigo-700">
                  <li>🏊 Pool (Open 6AM–9PM): Lifeguard present ✓</li>
                  <li>🏋️ Gym (Open 24h): Trainer on duty 7AM–9PM ✓</li>
                  <li>🧘 Spa: 3 therapists · 2 booked sessions active</li>
                  <li>⚠ Pool unmanned alert: Sent 2 days ago at 8:45 AM</li>
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
            <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-violet-400 bg-violet-950/60 border border-violet-800/50 px-4 py-1.5 rounded-full mb-4">Live Dashboard</div>
            <h2 className="text-4xl font-extrabold text-white tracking-tight">What your hotel manager sees at 11 AM.</h2>
          </div>

          <div className="bg-gray-900 rounded-3xl border border-gray-700 overflow-hidden shadow-2xl">
            <div className="bg-gray-800 px-4 py-3 flex items-center gap-2 border-b border-gray-700">
              <div className="flex gap-1.5"><div className="w-3 h-3 rounded-full bg-red-500"/><div className="w-3 h-3 rounded-full bg-yellow-500"/><div className="w-3 h-3 rounded-full bg-green-500"/></div>
              <div className="flex-1 bg-gray-700 rounded-lg px-3 py-1 text-xs text-gray-400 text-center mx-4">app.stafflenz.com/hotel</div>
            </div>
            <div className="flex h-[640px]">
              <div className="w-52 bg-gray-950 border-r border-gray-800 p-4 shrink-0 flex flex-col">
                <div className="flex items-center gap-2 mb-5 px-1">
                  <div className="w-7 h-7 bg-gradient-to-br from-blue-600 to-violet-600 rounded-lg flex items-center justify-center text-white font-bold text-xs">SL</div>
                  <span className="font-bold text-white text-sm">StaffLenz</span>
                </div>
                <div className="bg-violet-500/20 border border-violet-500/30 rounded-xl px-3 py-2 mb-4">
                  <div className="text-xs font-bold text-violet-400">🏨 Hotel</div>
                  <div className="text-xs text-gray-400 mt-0.5">Leela Grand Kochi</div>
                </div>
                {[{i:'📊',l:'Dashboard',a:true},{i:'🛏️',l:'Room Turnover'},{i:'🍽️',l:'Restaurant'},{i:'🎪',l:'Banquets'},{i:'🕐',l:'Attendance'},{i:'👷',l:'Staff'}].map(item=>(
                  <div key={item.l} className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl mb-0.5 text-xs cursor-pointer ${item.a?'bg-violet-500/20 text-violet-400 font-bold':'text-gray-400 hover:text-white'}`}>{item.i} {item.l}</div>
                ))}
              </div>

              <div className="flex-1 overflow-auto p-5 bg-gray-950 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-extrabold text-white">Hotel Dashboard</h3>
                    <p className="text-xs text-gray-500">Wednesday 2 Apr · 11:15 AM · Check-out rush</p>
                  </div>
                  <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400 bg-emerald-900/40 border border-emerald-800/50 px-3 py-1.5 rounded-full"><span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"/>Live</span>
                </div>

                <div className="grid grid-cols-4 gap-3">
                  {[
                    {l:'Staff On Duty',v:'42',s:'of 48 rostered',c:'text-emerald-400',bg:'bg-emerald-900/30 border-emerald-800/40'},
                    {l:'Rooms Turned Over',v:'31/124',s:'23 in progress',c:'text-violet-400',bg:'bg-violet-900/30 border-violet-800/40'},
                    {l:'Restaurant Covers',v:'47',s:'3 waiters · ratio 15:1',c:'text-amber-400',bg:'bg-amber-900/30 border-amber-800/40'},
                    {l:'Open Alerts',v:'2',s:'reception + Floor 5',c:'text-red-400',bg:'bg-red-900/30 border-red-800/40'},
                  ].map(k=>(
                    <div key={k.l} className={`border rounded-xl p-3 ${k.bg}`}>
                      <div className={`text-xl font-extrabold ${k.c}`}>{k.v}</div>
                      <div className="text-xs font-bold text-white mt-0.5">{k.l}</div>
                      <div className="text-xs text-gray-500">{k.s}</div>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Room turnover */}
                  <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
                    <h4 className="text-sm font-bold text-white mb-3">Room Turnover — Floor Progress</h4>
                    {[
                      {floor:'Floor 2',done:8,total:10,status:'In progress'},
                      {floor:'Floor 3',done:4,total:12,status:'Behind schedule',warn:true},
                      {floor:'Floor 4',done:10,total:10,status:'Complete',done_:true},
                      {floor:'Floor 5',done:0,total:8,status:'Not started — staff absent',err:true},
                      {floor:'Floor 6',done:7,total:10,status:'In progress'},
                    ].map(f=>(
                      <div key={f.floor} className="mb-2.5">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-semibold text-white">{f.floor}</span>
                          <span className={`text-xs font-semibold ${f.err?'text-red-400':f.warn?'text-amber-400':f.done_?'text-emerald-400':'text-gray-400'}`}>{f.done}/{f.total} · {f.status}</span>
                        </div>
                        <div className="h-1.5 bg-gray-800 rounded-full">
                          <div className={`h-1.5 rounded-full transition-all ${f.err?'bg-red-500':f.warn?'bg-amber-500':f.done_?'bg-emerald-500':'bg-violet-500'}`} style={{width:`${(f.done/f.total)*100}%`}}/>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Restaurant + alerts */}
                  <div className="space-y-4">
                    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
                      <h4 className="text-sm font-bold text-white mb-3">Restaurant — Live Status</h4>
                      <div className="grid grid-cols-2 gap-3">
                        {[
                          {l:'Guests Seated',v:'47',c:'text-white'},
                          {l:'Capacity',v:'80',c:'text-gray-400'},
                          {l:'Waiters on Floor',v:'3',c:'text-violet-400'},
                          {l:'Cover Ratio',v:'15.6:1',c:'text-amber-400'},
                        ].map(s=>(
                          <div key={s.l} className="bg-gray-800/60 rounded-xl p-2.5 text-center">
                            <div className={`text-lg font-extrabold ${s.c}`}>{s.v}</div>
                            <div className="text-xs text-gray-500">{s.l}</div>
                          </div>
                        ))}
                      </div>
                      <div className="mt-3 bg-amber-900/30 border border-amber-800/40 rounded-xl px-3 py-2">
                        <div className="text-xs font-bold text-amber-400">⚠ Ratio exceeded 12:1 — send 1 more waiter</div>
                      </div>
                    </div>

                    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
                      <h4 className="text-sm font-bold text-white mb-2">Open Alerts</h4>
                      <div className="space-y-2">
                        {[
                          {t:'Reception Unmanned',s:'Ground floor · 3 min gap',c:'border-red-500 bg-red-900/20'},
                          {t:'Floor 5 Housekeeping',s:'Housekeeper not on floor',c:'border-orange-500 bg-orange-900/20'},
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

      <IndustryPricing plans={PRICING} accentColor="#8b5cf6" industryLabel="Hotel & Hospitality" />

      <section id="demo" className="py-20 px-4 bg-gradient-to-br from-violet-700 to-purple-800">
        <div className="max-w-4xl mx-auto text-center text-white">
          <h2 className="text-4xl font-extrabold mb-4">Know the moment a floor falls behind — before check-in time.</h2>
          <p className="text-violet-100 text-lg mb-8">We install the device and show you live room turnover and restaurant data within 48 hours.</p>
          <Link href="/#contact" className="inline-flex items-center gap-2 bg-white text-violet-700 font-bold px-10 py-4 rounded-xl hover:bg-violet-50 transition-all shadow-2xl text-base">Book Free On-Site Demo <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg></Link>
        </div>
      </section>

      <footer className="py-8 px-4 bg-gray-950 border-t border-gray-900 text-center text-sm text-gray-600">
        <div className="flex items-center justify-center gap-2 mb-3"><div className="w-7 h-7 bg-gradient-to-br from-blue-600 to-violet-600 rounded-lg flex items-center justify-center text-white font-bold text-xs">SL</div><span className="font-extrabold text-white">StaffLenz</span></div>
        <div className="flex flex-wrap items-center justify-center gap-4 mb-2">
          <Link href="/" className="hover:text-white">Home</Link>
          <Link href="/industries/factory" className="hover:text-white">Factory</Link>
          <Link href="/industries/school" className="hover:text-white">School</Link>
          <Link href="/industries/retail" className="hover:text-white">Retail</Link>
        </div>
        <p>© {new Date().getFullYear()} StaffLenz · AI-Powered Workforce Intelligence</p>
      </footer>
    </div>
  );
}
