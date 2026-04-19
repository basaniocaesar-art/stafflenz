'use client';
import Link from 'next/link';
import PipelineDemoSection from '@/components/PipelineDemoSection';
import CameraGrid from '@/components/CameraGrid';
import IndustryPricing from '@/components/IndustryPricing';

const PRICING = [
  {
    name: 'Starter', price: 99, ideal: 'Small clinics', highlight: false,
    features: ['Up to 5 wards', 'Up to 25 clinical staff', '8 cameras (8-ch DVR)', 'Nurse ratio alerts', 'WhatsApp alerts', 'Daily coverage report'],
  },
  {
    name: 'Professional', price: 199, ideal: 'Mid-size hospitals', highlight: true,
    features: ['Up to 10 wards', 'Up to 60 staff', '16 cameras (16-ch DVR)', 'Restricted zone access log', 'Shift handover verification', 'PPE per ward type', 'Compliance audit export'],
  },
  {
    name: 'Enterprise', price: 399, ideal: 'Hospital groups', highlight: false,
    features: ['Up to 20 wards', 'Up to 100 staff', '32 cameras (32-ch DVR)', 'Multi-facility dashboard', 'Accreditation-ready reports', 'Custom ratio rules', 'API access', 'Dedicated support'],
  },
];

const FRAMES = [
  {
    sceneLabel: 'ICU Ratio Breach',
    video_query: 'hospital ICU intensive care unit nurse patient monitor',
    sceneIcon: '🩺',
    sceneDescription: 'ICU Bay 2 scan — checking nurse-to-patient ratio against minimum 1:2 requirement',
    zone: 'ICU Bay 2 · CAM 04',
    camId: '04',
    aiPrompt: 'How many nurses are present in this ICU bay? How many patients are in beds?',
    detections: [
      { label: 'Nurse Maria ✓', color: '#10b981', x: '5%', y: '20%', w: '18%', h: '55%' },
      { label: 'Patient 1–4 in beds', color: '#3b82f6', x: '28%', y: '15%', w: '62%', h: '60%' },
    ],
    output: {
      icon: '🚨', title: 'ICU Nurse Ratio Breach', tag: 'Critical Alert · ICU Bay 2',
      borderColor: '#ef444460', bgColor: '#450a0a40', iconBg: '#ef4444', tagColor: '#fca5a5',
      lines: [
        { icon: '🔴', text: '1 nurse covering 4 ICU patients — ratio 1:4' },
        { icon: '⚕️', text: 'Minimum required: 1:2 — critical breach' },
        { icon: '📍', text: 'ICU Bay 2 · Cam 04 · 14:22' },
      ],
      action: '🚨 Ward sister and duty manager notified immediately',
      whatsapp: '🚨 *ICU RATIO BREACH — Bay 2*\n\nNurse:Patient ratio — 1:4\nMinimum required: 1:2\n\n4 ICU patients with 1 nurse only.\nICU Bay 2 · Cam 04 · 14:22\n\nPlease send additional nurse to ICU immediately.',
    },
  },
  {
    sceneLabel: 'Pharmacy Breach',
    video_query: 'hospital pharmacy medicine shelf restricted access',
    sceneIcon: '💊',
    sceneDescription: 'Pharmacy restricted zone — monitoring access during dispensing hours',
    zone: 'Pharmacy Store · CAM 11',
    camId: '11',
    aiPrompt: 'Is the person entering the pharmacy a recognised authorised staff member or doctor?',
    detections: [
      { label: '⚠ Unrecognised Entry', color: '#ef4444', x: '28%', y: '10%', w: '32%', h: '65%' },
    ],
    output: {
      icon: '🚨', title: 'Pharmacy Unauthorised Entry', tag: 'Restricted Zone Alert',
      borderColor: '#ef444460', bgColor: '#450a0a40', iconBg: '#ef4444', tagColor: '#fca5a5',
      lines: [
        { icon: '🔴', text: 'Unrecognised person entered pharmacy at 14:32' },
        { icon: '🔒', text: 'Not on authorised staff list — access violation' },
        { icon: '📄', text: 'Entry timestamped for compliance audit log' },
      ],
      action: '🚨 Security and pharmacy manager alerted',
      whatsapp: '🚨 *PHARMACY BREACH — Restricted Zone*\n\nUnrecognised person detected.\nTimestamp: 14:32 · Cam 11\n\nNot on authorised staff list.\n\nSecurity and pharmacy manager notified.\nFull audit log saved.',
    },
  },
  {
    sceneLabel: 'Ward Coverage Gap',
    video_query: 'hospital ward corridor nurse walking patient room',
    sceneIcon: '🏥',
    sceneDescription: 'General Ward C nurse station scan — checking for staff presence during rounds',
    zone: 'Ward C Nurse Station · CAM 06',
    camId: '06',
    aiPrompt: 'Is there a nurse present at the Ward C nurse station right now?',
    detections: [
      { label: '⚠ Station Unmanned 18 min', color: '#ef4444', x: '15%', y: '10%', w: '65%', h: '55%' },
    ],
    output: {
      icon: '⚠️', title: 'Ward C Station Unmanned', tag: 'Coverage Alert · 18 min gap',
      borderColor: '#f59e0b60', bgColor: '#2d1b0040', iconBg: '#f59e0b', tagColor: '#fcd34d',
      lines: [
        { icon: '🔴', text: 'Nurse station Ward C unmanned for 18 minutes' },
        { icon: '🛎️', text: 'Call bell unanswered — patient risk' },
        { icon: '📍', text: 'Ward C · Cam 06 · 11:08' },
      ],
      action: '📢 Matron and ward coordinator notified immediately',
      whatsapp: '⚠️ *WARD C UNMANNED — Nurse Station*\n\nStation empty for 18 minutes.\nCall bell may be unanswered.\n\nWard C · Cam 06 · 11:08\n\nPlease send nurse to Ward C station immediately.',
    },
  },
  {
    sceneLabel: 'PPE Violation — ICU',
    video_query: 'hospital doctor surgeon mask gloves PPE gown',
    sceneIcon: '🧤',
    sceneDescription: 'ICU Bay 1 hygiene check — verifying gloves and mask compliance for all staff',
    zone: 'ICU Bay 1 · CAM 03',
    camId: '03',
    aiPrompt: 'Is the nurse wearing gloves, mask, and gown as required in the ICU zone?',
    detections: [
      { label: '⚠ No Gloves — Nurse A', color: '#ef4444', x: '15%', y: '15%', w: '26%', h: '60%' },
      { label: 'Nurse B — Full PPE ✓', color: '#10b981', x: '55%', y: '18%', w: '26%', h: '58%' },
    ],
    output: {
      icon: '🧤', title: 'ICU PPE Violation', tag: 'Hygiene Alert · ICU Bay 1',
      borderColor: '#ef444460', bgColor: '#450a0a40', iconBg: '#ef4444', tagColor: '#fca5a5',
      lines: [
        { icon: '🔴', text: 'Nurse A detected without gloves in ICU' },
        { icon: '✅', text: 'Nurse B: gloves + mask + gown — compliant' },
        { icon: '📍', text: 'ICU Bay 1 · Cam 03 · 09:14' },
      ],
      action: '⚡ Ward sister notified for immediate corrective action',
      whatsapp: '🚨 *ICU PPE VIOLATION — Bay 1*\n\nNurse detected without gloves.\nICU requires: Gloves + Mask + Gown\n\nICU Bay 1 · Cam 03 · 09:14\n\nPlease ensure PPE compliance immediately.',
    },
  },
];

export default function HospitalPage() {
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
            <a href="#demo" className="hidden sm:block text-sm font-semibold text-cyan-600 hover:text-cyan-700">Book Demo</a>
            <Link href="/login" className="btn-primary text-sm px-5 bg-cyan-600 hover:bg-cyan-700">Login →</Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative bg-[#020B0D] text-white overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-950/80 via-[#020B0D] to-teal-950/60" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-cyan-600/15 rounded-full blur-[120px]" />
        <div className="absolute inset-0 opacity-[0.04]" style={{backgroundImage:'linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)',backgroundSize:'50px 50px'}} />
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 pt-20 pb-24">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 bg-cyan-500/20 border border-cyan-400/30 rounded-full px-5 py-2 text-sm font-medium text-cyan-300 mb-6">🏥 Hospital & Healthcare</div>
              <h1 className="text-5xl md:text-6xl font-extrabold mb-6 leading-[1.1] tracking-tight">
                Know if every ward<br />has the right nurse<br /><span className="bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-teal-400">staffed and compliant.</span>
              </h1>
              <p className="text-lg text-slate-300 mb-8 leading-relaxed">
                LenzAI monitors ICU nurse ratios, ward coverage gaps, restricted zone access, and hygiene PPE compliance across your entire facility — automatically, every 5 minutes. Know about a staffing gap before a patient is affected.
              </p>
              <div className="flex flex-wrap gap-4">
                <a href="#demo" className="inline-flex items-center gap-2 bg-cyan-500 text-white font-bold px-8 py-4 rounded-xl hover:bg-cyan-600 transition-all shadow-2xl shadow-cyan-900/40 text-base">Book a Free Demo <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg></a>
                <a href="#dashboard" className="inline-flex items-center gap-2 bg-white/10 border border-white/20 text-white font-semibold px-8 py-4 rounded-xl hover:bg-white/20 transition-all text-base">See the Dashboard</a>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[
                {n:'ICU Ratio',l:'Nurse-to-Patient',sub:'alert when ratio drops below 1:2 in critical care'},
                {n:'Ward Coverage',l:'Per Floor, Per Shift',sub:'know which ward has a gap before rounds begin'},
                {n:'Restricted Zones',l:'OT · ICU · Pharmacy',sub:'timestamped access log, unauthorised entry alerts'},
                {n:'PPE Hygiene',l:'Gloves · Masks · Gowns',sub:'different rules per ward — ICU vs general vs OPD'},
              ].map(({n,l,sub})=>(
                <div key={l} className="bg-white/5 border border-white/10 rounded-2xl p-5 backdrop-blur">
                  <div className="text-lg font-extrabold text-cyan-400 mb-1">{n}</div>
                  <div className="text-sm font-bold text-white">{l}</div>
                  <div className="text-xs text-slate-400 mt-0.5">{sub}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <CameraGrid industry="hospital" />

      <PipelineDemoSection frames={FRAMES} accentColor="#06b6d4" industry="hospital" />


      {/* What's unique */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <div className="section-label mb-4">Healthcare-Specific Intelligence</div>
            <h2 className="text-4xl font-extrabold text-gray-900 tracking-tight">Not just "staff present." <br/>Which ward is under ratio. Which zone was accessed without clearance.</h2>
            <p className="mt-4 text-gray-500 max-w-2xl mx-auto">Generic attendance tools count heads. LenzAI tells you whether ICU has met its minimum nurse-to-patient ratio for the current shift, and whether anyone has entered the pharmacy without authorisation in the last 2 hours.</p>
          </div>

          <div className="grid lg:grid-cols-2 gap-8">
            <div className="card p-7 border-l-4 border-l-cyan-400">
              <div className="text-3xl mb-3">🩺</div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">ICU & Ward Nurse-to-Patient Ratio</h3>
              <p className="text-gray-500 text-sm mb-4 leading-relaxed">Configure the minimum nurse ratio per ward type. LenzAI counts nurses physically present in each ward zone every 5 minutes and sends an immediate alert if any ward drops below its required ratio — before the shift manager notices it manually.</p>
              <div className="bg-cyan-50 border border-cyan-200 rounded-xl p-4 text-sm">
                <div className="font-bold text-cyan-800 mb-2">Example alerts you will get:</div>
                <ul className="space-y-1 text-cyan-700">
                  <li>⚠ ICU Bay 2: 1 nurse for 4 patients — ratio breach (min 1:2)</li>
                  <li>⚠ Ward C: No nurse detected for 18 minutes</li>
                  <li>✓ ICU Bay 1, General Ward A & B: Ratios met</li>
                </ul>
              </div>
            </div>

            <div className="card p-7 border-l-4 border-l-teal-400">
              <div className="text-3xl mb-3">🚫</div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Restricted Zone Access Log</h3>
              <p className="text-gray-500 text-sm mb-4 leading-relaxed">Pharmacy, OT, ICU, and sterile storage are restricted zones. LenzAI logs every person detected entering these zones with a timestamp and staff ID. Any unrecognised individual triggers an immediate alert — providing a full audit trail for compliance.</p>
              <div className="bg-teal-50 border border-teal-200 rounded-xl p-4 text-sm">
                <div className="font-bold text-teal-800 mb-2">Your access audit shows:</div>
                <ul className="space-y-1 text-teal-700">
                  <li>🔴 Pharmacy: 1 unrecognised entry at 14:32 — alert triggered</li>
                  <li>✅ OT Suite: 3 authorised entries — Dr. Singh, Nurse Priya, Anaesthetist</li>
                  <li>📄 Full log exportable for accreditation audits</li>
                </ul>
              </div>
            </div>

            <div className="card p-7 border-l-4 border-l-sky-400">
              <div className="text-3xl mb-3">🧤</div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Ward-Specific Hygiene & PPE Compliance</h3>
              <p className="text-gray-500 text-sm mb-4 leading-relaxed">ICU requires gloves + mask + gown. OPD requires mask only. Isolation wards require full PPE. LenzAI checks the correct PPE for each ward — not a blanket rule for the whole hospital. Non-compliance triggers an alert to the ward sister immediately.</p>
              <div className="bg-sky-50 border border-sky-200 rounded-xl p-4 text-sm">
                <div className="font-bold text-sky-800 mb-2">Ward-level compliance tracking:</div>
                <ul className="space-y-1 text-sky-700">
                  <li>🔴 ICU: 1 nurse without gloves detected — alert sent to ward sister</li>
                  <li>✅ Isolation Ward: All 3 staff in full PPE</li>
                  <li>✅ OPD: 8/8 staff wearing masks</li>
                </ul>
              </div>
            </div>

            <div className="card p-7 border-l-4 border-l-indigo-400">
              <div className="text-3xl mb-3">🔄</div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Shift Handover Verification</h3>
              <p className="text-gray-500 text-sm mb-4 leading-relaxed">Night to day handover is a critical risk window. LenzAI verifies that the incoming shift staff have physically arrived in each ward before the outgoing shift leaves — flagging early departures that would leave wards understaffed during handover.</p>
              <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 text-sm">
                <div className="font-bold text-indigo-800 mb-2">Handover verification report:</div>
                <ul className="space-y-1 text-indigo-700">
                  <li>✅ General Ward A: Incoming nurse detected before outgoing left</li>
                  <li>⚠ Ward C: Outgoing nurse left at 07:02, incoming arrived at 07:19 — 17 min gap</li>
                  <li>📱 Matron notified via WhatsApp within 30 seconds</li>
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
            <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-cyan-400 bg-cyan-950/60 border border-cyan-800/50 px-4 py-1.5 rounded-full mb-4">Live Dashboard</div>
            <h2 className="text-4xl font-extrabold text-white tracking-tight">What your nursing manager sees every morning.</h2>
          </div>

          <div className="bg-gray-900 rounded-3xl border border-gray-700 overflow-hidden shadow-2xl">
            <div className="bg-gray-800 px-4 py-3 flex items-center gap-2 border-b border-gray-700">
              <div className="flex gap-1.5"><div className="w-3 h-3 rounded-full bg-red-500"/><div className="w-3 h-3 rounded-full bg-yellow-500"/><div className="w-3 h-3 rounded-full bg-green-500"/></div>
              <div className="flex-1 bg-gray-700 rounded-lg px-3 py-1 text-xs text-gray-400 text-center mx-4">app.lenzai.org/hospital</div>
            </div>
            <div className="flex h-[640px]">
              <div className="w-52 bg-gray-950 border-r border-gray-800 p-4 shrink-0 flex flex-col">
                <div className="flex items-center gap-2 mb-5 px-1">
                  <div className="w-7 h-7 bg-gradient-to-br from-blue-600 to-violet-600 rounded-lg flex items-center justify-center text-white font-bold text-xs">LA</div>
                  <span className="font-bold text-white text-sm">LenzAI</span>
                </div>
                <div className="bg-cyan-500/20 border border-cyan-500/30 rounded-xl px-3 py-2 mb-4">
                  <div className="text-xs font-bold text-cyan-400">🏥 Hospital</div>
                  <div className="text-xs text-gray-400 mt-0.5">City General Hospital</div>
                </div>
                {[{i:'📊',l:'Dashboard',a:true},{i:'🩺',l:'Ward Coverage'},{i:'🚫',l:'Zone Access'},{i:'🧤',l:'PPE Compliance'},{i:'👩‍⚕️',l:'Staff'},{i:'🕐',l:'Attendance'}].map(item=>(
                  <div key={item.l} className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl mb-0.5 text-xs cursor-pointer ${item.a?'bg-cyan-500/20 text-cyan-400 font-bold':'text-gray-400 hover:text-white'}`}>{item.i} {item.l}</div>
                ))}
              </div>

              <div className="flex-1 overflow-auto p-5 bg-gray-950 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-extrabold text-white">Hospital Dashboard</h3>
                    <p className="text-xs text-gray-500">Day Shift · 08:00–20:00 · Last scan 2 min ago</p>
                  </div>
                  <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400 bg-emerald-900/40 border border-emerald-800/50 px-3 py-1.5 rounded-full"><span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"/>Live</span>
                </div>

                <div className="grid grid-cols-4 gap-3">
                  {[
                    {l:'Staff On-Duty',v:'62',s:'of 68 scheduled',c:'text-emerald-400',bg:'bg-emerald-900/30 border-emerald-800/40'},
                    {l:'Ratio Breaches',v:'1',s:'ICU Bay 2 — 1:4',c:'text-red-400',bg:'bg-red-900/30 border-red-800/40'},
                    {l:'PPE Violations',v:'2',s:'ICU: gloves, mask',c:'text-amber-400',bg:'bg-amber-900/30 border-amber-800/40'},
                    {l:'Restricted Alerts',v:'1',s:'Pharmacy — unauth.',c:'text-rose-400',bg:'bg-rose-900/30 border-rose-800/40'},
                  ].map(k=>(
                    <div key={k.l} className={`border rounded-xl p-3 ${k.bg}`}>
                      <div className={`text-2xl font-extrabold ${k.c}`}>{k.v}</div>
                      <div className="text-xs font-bold text-white mt-0.5">{k.l}</div>
                      <div className="text-xs text-gray-500">{k.s}</div>
                    </div>
                  ))}
                </div>

                <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
                  <h4 className="text-sm font-bold text-white mb-3">Ward Coverage — Nurse Ratio Right Now</h4>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      {name:'ICU Bay 1',ratio:'1:2',min:'1:2',ok:true,nurses:4,patients:8},
                      {name:'ICU Bay 2',ratio:'1:4',min:'1:2',ok:false,nurses:1,patients:4},
                      {name:'General Ward A',ratio:'1:5',min:'1:6',ok:true,nurses:3,patients:15},
                      {name:'General Ward B',ratio:'1:6',min:'1:6',ok:true,nurses:2,patients:12},
                      {name:'Isolation Ward',ratio:'1:3',min:'1:4',ok:true,nurses:2,patients:6},
                      {name:'OPD',ratio:'—',min:'2 staff',ok:true,nurses:3,patients:null},
                    ].map(w=>(
                      <div key={w.name} className={`flex items-center justify-between px-3 py-2.5 rounded-xl border ${w.ok?'bg-emerald-900/20 border-emerald-800/40':'bg-red-900/20 border-red-800/40'}`}>
                        <div>
                          <div className="text-xs font-bold text-white">{w.name}</div>
                          <div className="text-xs text-gray-500">{w.nurses} nurses · {w.patients !== null ? `${w.patients} patients` : 'Outpatient'}</div>
                        </div>
                        <div className="text-right">
                          <div className={`text-sm font-extrabold ${w.ok?'text-emerald-400':'text-red-400'}`}>{w.ratio}</div>
                          <div className="text-xs text-gray-500">min {w.min}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
                    <h4 className="text-sm font-bold text-white mb-3">Restricted Zone Access — Today</h4>
                    {[
                      {zone:'Pharmacy',time:'14:32',who:'Unrecognised',ok:false},
                      {zone:'OT Suite 1',time:'09:15',who:'Dr. Sharma + 2',ok:true},
                      {zone:'ICU Entry',time:'11:40',who:'Nurse Maria',ok:true},
                      {zone:'Sterile Store',time:'13:05',who:'Nurse Priya',ok:true},
                    ].map(z=>(
                      <div key={z.zone+z.time} className="flex items-center gap-2 py-2 border-b border-gray-800 last:border-0">
                        <div className={`w-2 h-2 rounded-full shrink-0 ${z.ok?'bg-emerald-500':'bg-red-500'}`}/>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-semibold text-white">{z.zone}</div>
                          <div className="text-xs text-gray-500">{z.who}</div>
                        </div>
                        <div className="text-xs text-gray-400">{z.time}</div>
                      </div>
                    ))}
                  </div>

                  <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
                    <h4 className="text-sm font-bold text-white mb-3">PPE Compliance by Ward</h4>
                    {[
                      {ward:'ICU Bay 1',compliant:4,total:4,item:'Gloves + mask + gown'},
                      {ward:'ICU Bay 2',compliant:0,total:1,item:'Gloves + mask + gown'},
                      {ward:'Isolation',compliant:2,total:2,item:'Full PPE'},
                      {ward:'General A',compliant:3,total:3,item:'Mask'},
                      {ward:'OPD',compliant:8,total:8,item:'Mask'},
                    ].map(z=>(
                      <div key={z.ward} className="flex items-center gap-2 py-2 border-b border-gray-800 last:border-0">
                        <div className={`w-2 h-2 rounded-full shrink-0 ${z.compliant===z.total?'bg-emerald-500':'bg-red-500'}`}/>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-semibold text-white">{z.ward}</div>
                          <div className="text-xs text-gray-500">{z.item}</div>
                        </div>
                        <div className={`text-xs font-bold ${z.compliant===z.total?'text-emerald-400':'text-red-400'}`}>{z.compliant}/{z.total}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <IndustryPricing plans={PRICING} accentColor="#06b6d4" industryLabel="Hospital & Healthcare" />

      {/* CTA */}
      <section id="demo" className="py-20 px-4 bg-gradient-to-br from-cyan-600 to-teal-700">
        <div className="max-w-4xl mx-auto text-center text-white">
          <h2 className="text-4xl font-extrabold mb-4">Know if every ward is staffed to ratio — live.</h2>
          <p className="text-cyan-100 text-lg mb-8">We configure LenzAI for your ward layout and show live nurse ratio data within 48 hours.</p>
          <Link href="/#contact" className="inline-flex items-center gap-2 bg-white text-cyan-700 font-bold px-10 py-4 rounded-xl hover:bg-cyan-50 transition-all shadow-2xl text-base">Book Free On-Site Demo <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg></Link>
        </div>
      </section>

      <footer className="py-8 px-4 bg-gray-950 border-t border-gray-900 text-center text-sm text-gray-600">
        <div className="flex items-center justify-center gap-2 mb-3"><div className="w-7 h-7 bg-gradient-to-br from-blue-600 to-violet-600 rounded-lg flex items-center justify-center text-white font-bold text-xs">LA</div><span className="font-extrabold text-white">LenzAI</span></div>
        <div className="flex flex-wrap items-center justify-center gap-4 mb-2">
          <Link href="/" className="hover:text-white">Home</Link>
          <Link href="/industries/factory" className="hover:text-white">Factory</Link>
          <Link href="/industries/hotel" className="hover:text-white">Hotel</Link>
          <Link href="/industries/construction" className="hover:text-white">Construction</Link>
          <Link href="/industries/restaurant" className="hover:text-white">Restaurant</Link>
          <Link href="/industries/security" className="hover:text-white">Security</Link>
        </div>
        <p>© {new Date().getFullYear()} LenzAI · AI-Powered Workforce Intelligence</p>
      </footer>
    </div>
  );
}
