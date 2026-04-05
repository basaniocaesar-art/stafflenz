'use client';
import Link from 'next/link';
import PipelineDemoSection from '@/components/PipelineDemoSection';
import CameraGrid from '@/components/CameraGrid';
import IndustryPricing from '@/components/IndustryPricing';

const PRICING = [
  {
    name: 'Starter', price: 59, ideal: 'Small schools', highlight: false,
    features: ['Up to 25 teaching staff', '8 cameras (corridors & common areas)', 'Period-by-period duty grid', 'Unattended class alerts', 'WhatsApp alerts', 'Daily duty summary'],
  },
  {
    name: 'Professional', price: 119, ideal: 'Mid-size schools', highlight: true,
    features: ['Up to 60 staff monitored', '16 cameras (corridors, canteen, gates)', 'Exam hall invigilation tracker', 'Canteen & gate duty alerts', 'Bus duty log', 'Break & recess supervision', 'Parent-safe reporting'],
  },
  {
    name: 'Enterprise', price: 229, ideal: 'School groups', highlight: false,
    features: ['Up to 100 staff monitored', '32 cameras (32-ch DVR)', 'Multi-campus dashboard', 'Board-level compliance reports', 'Custom duty schedules', 'API access', 'Dedicated support'],
  },
];

const FRAMES = [
  {
    sceneLabel: 'Class Unattended',
    sceneIcon: '🏫',
    sceneDescription: 'Class 8C camera scan — checking for teacher presence during Period 3',
    zone: 'Class Block B · CAM 02',
    camId: '02',
    aiPrompt: 'Is there a teacher present in this classroom? Are students seated without supervision?',
    detections: [
      { label: '⚠ No Teacher Detected', color: '#ef4444', x: '20%', y: '5%', w: '60%', h: '50%' },
      { label: 'Students Present — 28', color: '#f59e0b', x: '10%', y: '55%', w: '80%', h: '38%' },
    ],
    output: {
      icon: '🚨', title: 'Class 8C Unattended', tag: 'Safety Alert · Period 3',
      borderColor: '#ef444460', bgColor: '#450a0a40', iconBg: '#ef4444', tagColor: '#fca5a5',
      lines: [
        { icon: '🔴', text: 'No teacher detected in Class 8C — Period 3' },
        { icon: '👦', text: '28 students present and unsupervised' },
        { icon: '📍', text: 'Class Block B · Cam 02 · 09:42 AM' },
      ],
      action: '⚡ Principal and class coordinator alerted immediately',
      whatsapp: '🚨 *CLASS UNATTENDED — Class 8C*\n\nNo teacher detected during Period 3.\n28 students unsupervised.\n\nClass Block B · Cam 02 · 09:42 AM\n\nPlease send substitute teacher immediately.',
    },
  },
  {
    sceneLabel: 'Canteen Supervision',
    sceneIcon: '🍱',
    sceneDescription: 'Canteen scan during lunch break — checking supervision count for 200+ students',
    zone: 'School Canteen · CAM 05',
    camId: '05',
    aiPrompt: 'How many staff are supervising the canteen? Are students being monitored?',
    detections: [
      { label: 'Supervisor — Mrs. Anita', color: '#10b981', x: '5%', y: '18%', w: '18%', h: '55%' },
      { label: '⚠ 200+ Students, 1 Staff', color: '#f59e0b', x: '30%', y: '8%', w: '60%', h: '65%' },
    ],
    output: {
      icon: '⚠️', title: 'Canteen Understaffed', tag: 'Supervision Alert · Lunch Break',
      borderColor: '#f59e0b60', bgColor: '#2d1b0040', iconBg: '#f59e0b', tagColor: '#fcd34d',
      lines: [
        { icon: '👨‍🏫', text: 'Only 1 staff member supervising canteen' },
        { icon: '👦', text: '200+ students present — minimum 3 required' },
        { icon: '📍', text: 'Canteen · Cam 05 · 13:05' },
      ],
      action: '📢 Vice principal notified to send 2 more staff',
      whatsapp: '⚠️ *CANTEEN UNDERSTAFFED*\n\nSupervisors present: 1 / Required: 3\n200+ students at lunch.\n\nCanteen · Cam 05 · 13:05\n\nPlease send additional staff to canteen.',
    },
  },
  {
    sceneLabel: 'Exam Hall Check',
    sceneIcon: '📝',
    sceneDescription: 'Exam Hall 2 scan — verifying invigilator count before exam begins',
    zone: 'Exam Hall 2 · CAM 09',
    camId: '09',
    aiPrompt: 'How many invigilators are present in this exam hall? Minimum required is 2 for 40 students.',
    detections: [
      { label: 'Invigilator 1 ✓', color: '#10b981', x: '5%', y: '20%', w: '16%', h: '55%' },
      { label: 'Students — 40 seated', color: '#3b82f6', x: '28%', y: '25%', w: '60%', h: '55%' },
    ],
    output: {
      icon: '📝', title: 'Invigilator Short — Exam Hall 2', tag: 'Exam Alert · Pre-exam check',
      borderColor: '#3b82f660', bgColor: '#1e3a5f30', iconBg: '#3b82f6', tagColor: '#93c5fd',
      lines: [
        { icon: '📝', text: '40 students seated — exam in 10 minutes' },
        { icon: '👨‍🏫', text: 'Only 1 invigilator — 2 required per hall policy' },
        { icon: '📍', text: 'Exam Hall 2 · Cam 09 · 09:50 AM' },
      ],
      action: '🚨 Exam coordinator alerted — 2nd invigilator needed',
      whatsapp: '📝 *INVIGILATOR SHORT — Exam Hall 2*\n\nPresent: 1 / Required: 2\n40 students seated. Exam at 10:00 AM.\n\nExam Hall 2 · Cam 09\n\nPlease send 2nd invigilator immediately.',
    },
  },
  {
    sceneLabel: 'Gate Duty Gap',
    sceneIcon: '🚌',
    sceneDescription: 'School gate scan at 4 PM — checking for duty teacher during student dispersal',
    zone: 'Main Gate · CAM 01',
    camId: '01',
    aiPrompt: 'Is there a duty teacher at the school gate during student dispersal time?',
    detections: [
      { label: '⚠ Gate Unmanned — 4 PM', color: '#ef4444', x: '20%', y: '10%', w: '60%', h: '55%' },
      { label: 'Students Leaving', color: '#f59e0b', x: '10%', y: '60%', w: '80%', h: '32%' },
    ],
    output: {
      icon: '🚌', title: 'Gate Duty Not Covered', tag: 'Safety Alert · 16:02',
      borderColor: '#ef444460', bgColor: '#450a0a40', iconBg: '#ef4444', tagColor: '#fca5a5',
      lines: [
        { icon: '🔴', text: 'Main gate unmanned during student dispersal' },
        { icon: '👦', text: 'Students leaving without teacher supervision' },
        { icon: '📍', text: 'Main Gate · Cam 01 · 16:02' },
      ],
      action: '⚡ Principal alerted — duty roster violation logged',
      whatsapp: '🚨 *GATE DUTY NOT COVERED*\n\nMain gate unmanned at 16:02 during dispersal.\nNo duty teacher detected at gate.\n\nMain Gate · Cam 01\n\nPlease send duty teacher to gate immediately.',
    },
  },
];

export default function SchoolPage() {
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
            <a href="#demo" className="hidden sm:block text-sm font-semibold text-emerald-600 hover:text-emerald-700">Book Demo</a>
            <Link href="/login" className="btn-primary text-sm px-5 bg-emerald-600 hover:bg-emerald-700">Login →</Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative bg-[#030E0A] text-white overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-950/80 via-[#030E0A] to-teal-950/60" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-emerald-600/20 rounded-full blur-[120px]" />
        <div className="absolute inset-0 opacity-[0.04]" style={{backgroundImage:'linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)',backgroundSize:'50px 50px'}} />
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 pt-20 pb-24">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 bg-emerald-500/20 border border-emerald-400/30 rounded-full px-5 py-2 text-sm font-medium text-emerald-300 mb-6">🏫 School & Education</div>
              <h1 className="text-5xl md:text-6xl font-extrabold mb-6 leading-[1.1] tracking-tight">
                Know if every<br />class period is<br /><span className="bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-teal-400">covered right now.</span>
              </h1>
              <p className="text-lg text-slate-300 mb-8 leading-relaxed">
                StaffLenz monitors each classroom block, lab, canteen, and gate as separate zones. The principal sees a live period-by-period coverage grid, gets an alert the moment a class is unattended, and knows how many staff are in the canteen during lunch — not after a parent complains.
              </p>
              <div className="flex flex-wrap gap-4">
                <a href="#demo" className="inline-flex items-center gap-2 bg-emerald-600 text-white font-bold px-8 py-4 rounded-xl hover:bg-emerald-700 transition-all shadow-2xl shadow-emerald-900/40 text-base">Book a Free Demo <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg></a>
                <a href="#dashboard" className="inline-flex items-center gap-2 bg-white/10 border border-white/20 text-white font-semibold px-8 py-4 rounded-xl hover:bg-white/20 transition-all text-base">See the Dashboard</a>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[
                {n:'Period Grid',l:'Class-by-Class Coverage',sub:'is every class right now attended by a teacher?'},
                {n:'Canteen',l:'Supervision Count',sub:'how many staff are present during lunch break'},
                {n:'Exam Hall',l:'Invigilation Verified',sub:'correct number of invigilators confirmed'},
                {n:'Bus Duty',l:'Morning & Afternoon',sub:'staff at pickup/drop zones confirmed'},
              ].map(({n,l,sub})=>(
                <div key={l} className="bg-white/5 border border-white/10 rounded-2xl p-5 backdrop-blur">
                  <div className="text-lg font-extrabold text-emerald-400 mb-1">{n}</div>
                  <div className="text-sm font-bold text-white">{l}</div>
                  <div className="text-xs text-slate-400 mt-0.5">{sub}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>


      <CameraGrid industry="school" />

      <PipelineDemoSection frames={FRAMES} accentColor="#10b981" industry="school" />


      {/* School-specific solutions */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <div className="section-label mb-4">School-Specific Intelligence</div>
            <h2 className="text-4xl font-extrabold text-gray-900 tracking-tight">Built around the school timetable. <br/>Not a generic clock-in system.</h2>
            <p className="mt-4 text-gray-500 max-w-2xl mx-auto">Schools don't run on shifts — they run on periods, duties, and timetables. StaffLenz understands that and monitors the things that actually matter in a school environment.</p>
          </div>

          <div className="grid lg:grid-cols-2 gap-8">
            <div className="card p-7 border-l-4 border-l-emerald-400">
              <div className="text-3xl mb-3">📚</div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Period-by-Period Class Coverage Grid</h3>
              <p className="text-gray-500 text-sm mb-4 leading-relaxed">Each classroom block is a camera zone. StaffLenz maps teachers to their scheduled rooms and shows a live coverage grid — which period, which class, which teacher is present or absent. The principal sees it all on one screen, updated every 5 minutes throughout the school day.</p>
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-sm">
                <div className="font-bold text-emerald-800 mb-2">Period 3 (10:30 – 11:15 AM) status:</div>
                <ul className="space-y-1 text-emerald-700">
                  <li>✅ 8A — Maths: Mrs. Lakshmi present</li>
                  <li>✅ 8B — Science: Mr. Arjun present</li>
                  <li>🔴 8C — English: Unattended — teacher absent today</li>
                  <li>✅ 9A — History: Ms. Reshma present</li>
                  <li>⚠ Alert sent to VP to arrange substitute</li>
                </ul>
              </div>
            </div>

            <div className="card p-7 border-l-4 border-l-teal-400">
              <div className="text-3xl mb-3">🍱</div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Canteen Supervision During Lunch Break</h3>
              <p className="text-gray-500 text-sm mb-4 leading-relaxed">The canteen zone camera counts how many supervision staff are present when students are having lunch. If the required number of supervisors drops below your minimum (e.g., 2 staff for 300 students), an alert goes to the principal immediately — before any incident can happen.</p>
              <div className="bg-teal-50 border border-teal-200 rounded-xl p-4 text-sm">
                <div className="font-bold text-teal-800 mb-2">Lunch break (12:30 – 1:15 PM) today:</div>
                <ul className="space-y-1 text-teal-700">
                  <li>👨‍🍳 Canteen staff present: 4 ✓</li>
                  <li>👮 Supervision teachers: 2 of 2 required ✓</li>
                  <li>📊 Students in canteen: ~280 (estimated from density)</li>
                  <li>🕐 Yesterday: supervision staff arrived 8 min late — alert was sent</li>
                </ul>
              </div>
            </div>

            <div className="card p-7 border-l-4 border-l-cyan-400">
              <div className="text-3xl mb-3">📝</div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Exam Hall Invigilation Count</h3>
              <p className="text-gray-500 text-sm mb-4 leading-relaxed">During exams, each exam hall needs a set number of invigilators per the board guidelines. StaffLenz counts invigilators in each exam room and alerts the exam controller if any room is short before the exam begins — not after a complaint is filed.</p>
              <div className="bg-cyan-50 border border-cyan-200 rounded-xl p-4 text-sm">
                <div className="font-bold text-cyan-800 mb-2">Annual exam — today 9 AM:</div>
                <ul className="space-y-1 text-cyan-700">
                  <li>📝 Hall 1 (60 students): 2/2 invigilators ✓</li>
                  <li>📝 Hall 2 (60 students): 2/2 invigilators ✓</li>
                  <li>⚠ Hall 3 (60 students): 1/2 invigilators — alert sent at 8:52 AM</li>
                  <li>✅ Resolved: Second invigilator arrived at 8:58 AM</li>
                </ul>
              </div>
            </div>

            <div className="card p-7 border-l-4 border-l-green-400">
              <div className="text-3xl mb-3">🚌</div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Bus Duty & Gate Coverage</h3>
              <p className="text-gray-500 text-sm mb-4 leading-relaxed">The morning drop-off and afternoon pick-up zones are the highest-risk periods of the school day. StaffLenz confirms that duty teachers are in the bus bay and gate zones at the right times — so you always have documented proof that supervision was in place, if ever questioned.</p>
              <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-sm">
                <div className="font-bold text-green-800 mb-2">Today's duty log (auto-generated):</div>
                <ul className="space-y-1 text-green-700">
                  <li>🚌 Morning bus duty (7:30 AM): Mr. Thomas — arrived 7:28 AM ✓</li>
                  <li>🚪 Morning gate duty (8:00 AM): Mrs. Priya — arrived 8:03 AM (3 min late)</li>
                  <li>🚌 Afternoon bus duty (3:30 PM): Ms. Deepa — confirmed</li>
                  <li>📄 Exportable duty log for board/trust inspection</li>
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
            <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-emerald-400 bg-emerald-950/60 border border-emerald-800/50 px-4 py-1.5 rounded-full mb-4">Live Dashboard</div>
            <h2 className="text-4xl font-extrabold text-white tracking-tight">What the principal sees during Period 3.</h2>
          </div>

          <div className="bg-gray-900 rounded-3xl border border-gray-700 overflow-hidden shadow-2xl">
            <div className="bg-gray-800 px-4 py-3 flex items-center gap-2 border-b border-gray-700">
              <div className="flex gap-1.5"><div className="w-3 h-3 rounded-full bg-red-500"/><div className="w-3 h-3 rounded-full bg-yellow-500"/><div className="w-3 h-3 rounded-full bg-green-500"/></div>
              <div className="flex-1 bg-gray-700 rounded-lg px-3 py-1 text-xs text-gray-400 text-center mx-4">app.stafflenz.com/school</div>
            </div>
            <div className="flex h-[640px]">
              <div className="w-52 bg-gray-950 border-r border-gray-800 p-4 shrink-0 flex flex-col">
                <div className="flex items-center gap-2 mb-5 px-1">
                  <div className="w-7 h-7 bg-gradient-to-br from-blue-600 to-violet-600 rounded-lg flex items-center justify-center text-white font-bold text-xs">SL</div>
                  <span className="font-bold text-white text-sm">StaffLenz</span>
                </div>
                <div className="bg-emerald-500/20 border border-emerald-500/30 rounded-xl px-3 py-2 mb-4">
                  <div className="text-xs font-bold text-emerald-400">🏫 School</div>
                  <div className="text-xs text-gray-400 mt-0.5">St. Mary&apos;s Public School</div>
                </div>
                {[{i:'📊',l:'Dashboard',a:true},{i:'📚',l:'Period Grid'},{i:'🍱',l:'Canteen'},{i:'📝',l:'Exam Halls'},{i:'🕐',l:'Attendance'},{i:'👷',l:'Staff'}].map(item=>(
                  <div key={item.l} className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl mb-0.5 text-xs cursor-pointer ${item.a?'bg-emerald-500/20 text-emerald-400 font-bold':'text-gray-400 hover:text-white'}`}>{item.i} {item.l}</div>
                ))}
              </div>

              <div className="flex-1 overflow-auto p-5 bg-gray-950 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-extrabold text-white">School Dashboard</h3>
                    <p className="text-xs text-gray-500">Wednesday 2 Apr · 10:35 AM · Period 3 in progress</p>
                  </div>
                  <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400 bg-emerald-900/40 border border-emerald-800/50 px-3 py-1.5 rounded-full"><span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"/>Live</span>
                </div>

                <div className="grid grid-cols-4 gap-3">
                  {[
                    {l:'Staff Present',v:'62',s:'of 68 today',c:'text-emerald-400',bg:'bg-emerald-900/30 border-emerald-800/40'},
                    {l:'Classes Covered',v:'18/20',s:'2 need substitute',c:'text-amber-400',bg:'bg-amber-900/30 border-amber-800/40'},
                    {l:'On-Time Rate',v:'94%',s:'this week',c:'text-emerald-400',bg:'bg-emerald-900/30 border-emerald-800/40'},
                    {l:'Open Alerts',v:'1',s:'8C unattended',c:'text-red-400',bg:'bg-red-900/30 border-red-800/40'},
                  ].map(k=>(
                    <div key={k.l} className={`border rounded-xl p-3 ${k.bg}`}>
                      <div className={`text-2xl font-extrabold ${k.c}`}>{k.v}</div>
                      <div className="text-xs font-bold text-white mt-0.5">{k.l}</div>
                      <div className="text-xs text-gray-500">{k.s}</div>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Period grid */}
                  <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-bold text-white">Period 3 — Class Coverage Grid</h4>
                      <span className="text-xs text-gray-500">10:30 – 11:15</span>
                    </div>
                    <div className="space-y-1.5">
                      {[
                        {cls:'Class 8A',sub:'Maths',teacher:'Mrs. Lakshmi R.',ok:true},
                        {cls:'Class 8B',sub:'Science',teacher:'Mr. Arjun P.',ok:true},
                        {cls:'Class 8C',sub:'English',teacher:'Unattended',ok:false},
                        {cls:'Class 9A',sub:'History',teacher:'Ms. Reshma K.',ok:true},
                        {cls:'Class 9B',sub:'Maths',teacher:'Mr. Santhosh',ok:true},
                        {cls:'Class 10A',sub:'Physics',teacher:'Dr. Vijay M.',ok:true},
                        {cls:'Class 10B',sub:'English',teacher:'Mrs. Asha N.',ok:true},
                      ].map(c=>(
                        <div key={c.cls} className={`flex items-center gap-2 px-3 py-2 rounded-lg ${c.ok?'bg-gray-800/60':'bg-red-900/20 border border-red-800/40'}`}>
                          <span className={`w-2 h-2 rounded-full shrink-0 ${c.ok?'bg-emerald-500':'bg-red-500'}`}/>
                          <span className="text-xs font-bold text-white w-16 shrink-0">{c.cls}</span>
                          <span className="text-xs text-gray-400 w-14 shrink-0">{c.sub}</span>
                          <span className={`text-xs flex-1 truncate ${c.ok?'text-gray-300':'text-red-400 font-semibold'}`}>{c.teacher}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Duty + canteen */}
                  <div className="space-y-4">
                    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
                      <h4 className="text-sm font-bold text-white mb-3">Today&apos;s Duty Log</h4>
                      <div className="space-y-2">
                        {[
                          {duty:'Morning Gate (8:00 AM)',staff:'Mrs. Priya S.',status:'Arrived 8:03 AM',c:'text-amber-400'},
                          {duty:'Bus Duty (7:30 AM)',staff:'Mr. Thomas K.',status:'Arrived 7:28 AM',c:'text-emerald-400'},
                          {duty:'Canteen Supervision',staff:'Ms. Deepa + 1',status:'Confirmed for 12:30',c:'text-emerald-400'},
                          {duty:'Afternoon Gate (3:30 PM)',staff:'Mr. Rajan',status:'Scheduled',c:'text-gray-400'},
                        ].map((d,i)=>(
                          <div key={i} className="flex items-start gap-2 py-1.5 border-b border-gray-800 last:border-0">
                            <div className="flex-1">
                              <div className="text-xs font-semibold text-white">{d.duty}</div>
                              <div className="text-xs text-gray-500">{d.staff}</div>
                            </div>
                            <span className={`text-xs font-semibold shrink-0 ${d.c}`}>{d.status}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="bg-red-900/20 border border-red-800/40 rounded-2xl p-4">
                      <h4 className="text-sm font-bold text-white mb-2">⚠ Alert</h4>
                      <div className="text-xs text-red-300 font-semibold">Class 8C — English period unattended</div>
                      <div className="text-xs text-gray-400 mt-1">Teacher absent today · No substitute arranged yet</div>
                      <button className="mt-2 text-xs font-bold text-emerald-400 hover:text-emerald-300">Arrange Substitute →</button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>      <PipelineDemoSection frames={FRAMES} accentColor="#10b981" industry="school" />

      <section id="demo" className="py-20 px-4 bg-gradient-to-br from-emerald-700 to-teal-800">
        <div className="max-w-4xl mx-auto text-center text-white">
          <h2 className="text-4xl font-extrabold mb-4">Know the moment a class is unattended — before a parent does.</h2>
          <p className="text-emerald-100 text-lg mb-8">We install the device at your school and show live period coverage data within 48 hours.</p>
          <Link href="/#contact" className="inline-flex items-center gap-2 bg-white text-emerald-700 font-bold px-10 py-4 rounded-xl hover:bg-emerald-50 transition-all shadow-2xl text-base">Book Free On-Site Demo <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg></Link>
        </div>
      </section>

      <footer className="py-8 px-4 bg-gray-950 border-t border-gray-900 text-center text-sm text-gray-600">
        <div className="flex items-center justify-center gap-2 mb-3"><div className="w-7 h-7 bg-gradient-to-br from-blue-600 to-violet-600 rounded-lg flex items-center justify-center text-white font-bold text-xs">SL</div><span className="font-extrabold text-white">StaffLenz</span></div>
        <div className="flex flex-wrap items-center justify-center gap-4 mb-2">
          <Link href="/" className="hover:text-white">Home</Link>
          <Link href="/industries/factory" className="hover:text-white">Factory</Link>
          <Link href="/industries/hotel" className="hover:text-white">Hotel</Link>
          <Link href="/industries/retail" className="hover:text-white">Retail</Link>
        </div>
        <p>© {new Date().getFullYear()} StaffLenz · AI-Powered Workforce Intelligence</p>
      </footer>
    </div>
  );
}
