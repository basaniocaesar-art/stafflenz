'use client';
import Link from 'next/link';
import PipelineDemoSection from '@/components/PipelineDemoSection';
import CameraGrid from '@/components/CameraGrid';

const PRICING = [
  {
    name: 'Home', price: 1499, ideal: 'Apartments & villas', highlight: true, currency: '₹',
    features: ['4 cameras (gate, living room, garden, parking)', 'Up to 15 known persons', '24/7 AI monitoring + motion alerts', 'Maid/cook/driver attendance tracking', 'Intruder alert on WhatsApp instantly', '3-day evidence archive', 'Daily "who came today" summary'],
  },
];

const FRAMES = [
  {
    sceneLabel: 'Unknown at Gate',
    sceneIcon: '🚨',
    sceneDescription: 'Main gate camera scan — checking if person matches registered family or staff',
    zone: 'Main Gate · CAM 01',
    camId: '01',
    video_query: 'person walking to house front door night security camera',
    aiPrompt: 'Is the person at the gate a registered family member or domestic staff?',
    detections: [
      { label: '⚠ UNKNOWN PERSON', color: '#ef4444', x: '30%', y: '15%', w: '40%', h: '65%' },
    ],
    output: {
      icon: '🚨', title: 'Unknown Person at Gate', tag: 'Security Alert · 2:47 AM',
      borderColor: '#ef444460', bgColor: '#450a0a40', iconBg: '#ef4444', tagColor: '#fca5a5',
      lines: [
        { icon: '🔴', text: 'Unknown person detected at main gate' },
        { icon: '🕐', text: 'Quiet hours (11 PM – 6 AM) — high priority' },
        { icon: '📍', text: 'Main Gate · Cam 01 · 2:47 AM' },
      ],
      action: '⚡ WhatsApp alert sent to homeowner with photo',
      whatsapp: '🚨 *INTRUDER ALERT*\n\nUnknown person at your main gate\nTime: 2:47 AM\n\nThis is during quiet hours.\nCheck your StaffLenz app immediately.',
    },
  },
  {
    sceneLabel: 'Maid Arrived',
    sceneIcon: '🧹',
    sceneDescription: 'Gate camera scan — domestic staff arrival check against registered faces',
    zone: 'Main Gate · CAM 01',
    camId: '01',
    video_query: 'woman entering house door morning domestic helper',
    aiPrompt: 'Has the registered domestic staff (maid) arrived? What time?',
    detections: [
      { label: 'Lakshmi (Maid) ✓', color: '#10b981', x: '35%', y: '18%', w: '30%', h: '60%' },
    ],
    output: {
      icon: '✅', title: 'Maid Arrived', tag: 'Staff Update · 8:32 AM',
      borderColor: '#10b98160', bgColor: '#14532d30', iconBg: '#10b981', tagColor: '#86efac',
      lines: [
        { icon: '👩', text: 'Lakshmi (maid) arrived at main gate' },
        { icon: '🕐', text: 'Arrived: 8:32 AM — expected by 8:30 AM (2 min late)' },
        { icon: '📍', text: 'Main Gate · Cam 01 · 8:32 AM' },
      ],
      action: '📱 Arrival logged + WhatsApp notification sent',
      whatsapp: '✅ *Staff Update*\n\nLakshmi (maid) arrived at 8:32 AM\nMain Gate · Cam 01\n\nAttendance logged automatically.',
    },
  },
  {
    sceneLabel: 'No Activity — Elderly',
    sceneIcon: '❤️',
    sceneDescription: 'Living room scan — checking for elderly family member activity during daytime',
    zone: 'Living Room · CAM 02',
    camId: '02',
    video_query: 'empty living room home interior couch sofa',
    aiPrompt: 'Is there any person present in the living room? When was the last detected activity?',
    detections: [
      { label: '⚠ No activity 2+ hours', color: '#f59e0b', x: '10%', y: '10%', w: '80%', h: '70%' },
    ],
    output: {
      icon: '❤️', title: 'Wellness Check Needed', tag: 'Family Alert · 11:15 AM',
      borderColor: '#f59e0b60', bgColor: '#2d1b0040', iconBg: '#f59e0b', tagColor: '#fcd34d',
      lines: [
        { icon: '⚠️', text: 'No activity in living room for 2 hours 15 minutes' },
        { icon: '👴', text: 'Last activity detected at 9:00 AM' },
        { icon: '📍', text: 'Living Room · Cam 02 · 11:15 AM' },
      ],
      action: '📞 WhatsApp sent to family — please check on parent',
      whatsapp: '❤️ *WELLNESS CHECK NEEDED*\n\nNo activity detected in Living Room for 2h 15m\nLast activity: 9:00 AM\n\nPlease check on your family member.',
    },
  },
  {
    sceneLabel: 'Child Home from School',
    sceneIcon: '🎒',
    sceneDescription: 'Gate camera scan — verifying child arrival during school pickup window',
    zone: 'Main Gate · CAM 01',
    camId: '01',
    video_query: 'child walking to house front door school backpack',
    aiPrompt: 'Has a registered family member (child) arrived at the gate during school pickup time?',
    detections: [
      { label: 'Aarav (Son) ✓', color: '#3b82f6', x: '40%', y: '20%', w: '25%', h: '55%' },
    ],
    output: {
      icon: '🎒', title: 'Child Arrived Home', tag: 'Family Update · 3:15 PM',
      borderColor: '#3b82f660', bgColor: '#1e3a5f30', iconBg: '#3b82f6', tagColor: '#93c5fd',
      lines: [
        { icon: '✅', text: 'Aarav arrived at main gate from school' },
        { icon: '🕐', text: 'Arrived: 3:15 PM — within expected 3:00–3:30 window' },
        { icon: '📍', text: 'Main Gate · Cam 01 · 3:15 PM' },
      ],
      action: '📱 WhatsApp sent to parents — child is home safe',
      whatsapp: '🎒 *Child Home*\n\nAarav arrived home at 3:15 PM\nMain Gate · Cam 01\n\nYour child is home safe.',
    },
  },
];

export default function HomePage() {
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
            <Link href="/industries" className="hover:text-gray-900 transition-colors">Industries</Link>
            <Link href="/#pricing" className="hover:text-gray-900 transition-colors">Pricing</Link>
          </div>
          <div className="flex items-center gap-3">
            <a href="#demo" className="hidden sm:block text-sm font-semibold text-blue-600 hover:text-blue-700">Book Demo</a>
            <Link href="/login" className="text-sm px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all">Login →</Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative bg-[#030A18] text-white overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-950/80 via-[#030A18] to-indigo-950/60" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-blue-600/20 rounded-full blur-[120px]" />
        <div className="absolute inset-0 opacity-[0.04]" style={{backgroundImage:'linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)',backgroundSize:'50px 50px'}} />
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 pt-20 pb-24">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 bg-blue-500/20 border border-blue-400/30 rounded-full px-5 py-2 text-sm font-medium text-blue-300 mb-6">🏠 Home Security</div>
              <h1 className="text-5xl md:text-6xl font-extrabold mb-6 leading-[1.1] tracking-tight">
                Know who&apos;s at your<br />gate before they<br /><span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-cyan-400">ring the bell.</span>
              </h1>
              <p className="text-lg text-slate-300 mb-8 leading-relaxed">
                Your CCTV already records everything — StaffLenz makes it intelligent. Get instant WhatsApp alerts for intruders, track your maid&apos;s attendance automatically, and know your elderly parent is safe — all from your existing cameras.
              </p>
              <div className="flex flex-wrap gap-4">
                <a href="#demo" className="inline-flex items-center gap-2 bg-blue-600 text-white font-bold px-8 py-4 rounded-xl hover:bg-blue-700 transition-all shadow-2xl shadow-blue-900/40 text-base">Book a Demo →</a>
                <a href="#how-it-works" className="inline-flex items-center gap-2 bg-white/10 border border-white/20 text-white font-semibold px-8 py-4 rounded-xl hover:bg-white/20 transition-all text-base">See How It Works</a>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[
                {n:'₹1,499/mo',l:'AI Security Guard',sub:'vs ₹15,000+ for a human guard'},
                {n:'15 sec',l:'Alert Speed',sub:'WhatsApp with photo on unknown person'},
                {n:'24/7',l:'Never Sleeps',sub:'monitors every camera all night'},
                {n:'3 days',l:'Evidence Archive',sub:'police-ready footage when you need it'},
              ].map(({n,l,sub})=>(
                <div key={l} className="bg-white/5 border border-white/10 rounded-2xl p-5 backdrop-blur">
                  <div className="text-lg font-extrabold text-blue-400 mb-1">{n}</div>
                  <div className="text-sm font-bold text-white">{l}</div>
                  <div className="text-xs text-slate-400 mt-0.5">{sub}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <CameraGrid industry="home" />

      <PipelineDemoSection frames={FRAMES} accentColor="#3b82f6" industry="home" />

      {/* Home-specific solutions */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <div className="section-label mb-4">What You Get</div>
            <h2 className="text-4xl font-extrabold text-gray-900 tracking-tight">Your home, actually watched.<br/>Not just recorded.</h2>
            <p className="mt-4 text-gray-500 max-w-2xl mx-auto">Most CCTV just records. Nobody watches until after something happens. StaffLenz watches in real-time and alerts you the moment something needs your attention.</p>
          </div>

          <div className="grid lg:grid-cols-2 gap-8">
            <div className="card p-7 border-l-4 border-l-red-400">
              <div className="text-3xl mb-3">🚨</div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Intruder Detection — Instant WhatsApp</h3>
              <p className="text-gray-500 text-sm mb-4 leading-relaxed">AI knows every family member and staff member by face. The moment someone who isn&apos;t recognised appears at your gate, you get a WhatsApp message with their photo within 15 seconds — day or night.</p>
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm">
                <div className="font-bold text-red-800 mb-2">Last night (2:47 AM):</div>
                <ul className="space-y-1 text-red-700">
                  <li>🔴 Unknown person detected at main gate</li>
                  <li>📱 WhatsApp sent to homeowner with photo in 12 seconds</li>
                  <li>👤 Person left after 45 seconds — logged as suspicious</li>
                  <li>📋 Footage saved for 3 days — available for police report</li>
                </ul>
              </div>
            </div>

            <div className="card p-7 border-l-4 border-l-green-400">
              <div className="text-3xl mb-3">🧹</div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Maid & Staff Attendance — Auto-Tracked</h3>
              <p className="text-gray-500 text-sm mb-4 leading-relaxed">No more arguments about whether the maid came, what time she arrived, or how long she stayed. AI tracks every domestic worker&apos;s arrival, departure, break time, and sends you a daily summary.</p>
              <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-sm">
                <div className="font-bold text-green-800 mb-2">Today&apos;s staff report:</div>
                <ul className="space-y-1 text-green-700">
                  <li>👩 Lakshmi (maid): 8:32 AM → 12:45 PM · 4h 13m · ✓</li>
                  <li>👨‍🍳 Ramu (cook): 10:00 AM → 2:30 PM · 4h 30m · ✓</li>
                  <li>🚗 Ravi (driver): not arrived yet · expected by 5 PM</li>
                  <li>📊 Month total: Lakshmi 22/26 days, Ramu 25/26 days</li>
                </ul>
              </div>
            </div>

            <div className="card p-7 border-l-4 border-l-amber-400">
              <div className="text-3xl mb-3">❤️</div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Elderly Parent Wellness Check</h3>
              <p className="text-gray-500 text-sm mb-4 leading-relaxed">If your parent lives alone and there&apos;s no movement in the living room for 2+ hours during daytime, you get an alert. Simple but potentially life-saving — catches falls, medical emergencies, or just &quot;they&apos;re napping too long.&quot;</p>
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm">
                <div className="font-bold text-amber-800 mb-2">Wellness monitoring today:</div>
                <ul className="space-y-1 text-amber-700">
                  <li>✅ 7:00 AM — Activity in kitchen (morning routine)</li>
                  <li>✅ 9:30 AM — Activity in living room (reading)</li>
                  <li>⚠️ 11:45 AM — No activity for 2h 15m → alert sent to son</li>
                  <li>✅ 12:00 PM — Activity resumed (was napping in bedroom)</li>
                </ul>
              </div>
            </div>

            <div className="card p-7 border-l-4 border-l-blue-400">
              <div className="text-3xl mb-3">🎒</div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Kids Home Safe — Confirmed</h3>
              <p className="text-gray-500 text-sm mb-4 leading-relaxed">Get a WhatsApp the moment your child walks through the gate after school. If they don&apos;t arrive by the expected time, you get a different alert. Peace of mind for working parents.</p>
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm">
                <div className="font-bold text-blue-800 mb-2">School pickup tracking:</div>
                <ul className="space-y-1 text-blue-700">
                  <li>🎒 Aarav arrived home at 3:15 PM ✓</li>
                  <li>📱 WhatsApp sent to both parents</li>
                  <li>📊 This week: arrived on time 4/5 days, 12 min late on Wednesday</li>
                  <li>🚌 School bus drop-off: consistent 3:10–3:20 PM window</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Cost comparison */}
      <section className="py-20 px-4 bg-gray-950">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-blue-400 bg-blue-950/60 border border-blue-800/50 px-4 py-1.5 rounded-full mb-4">Save ₹13,000+/month</div>
          <h2 className="text-4xl font-extrabold text-white tracking-tight mb-8">Cheaper than a security guard.<br/>Smarter than any camera app.</h2>

          <div className="grid md:grid-cols-2 gap-6 text-left">
            <div className="bg-red-950/30 border border-red-800/40 rounded-2xl p-6">
              <h3 className="text-lg font-bold text-red-400 mb-4">❌ Security Guard</h3>
              <ul className="space-y-2 text-sm text-gray-300">
                <li>💸 ₹15,000–25,000/month</li>
                <li>😴 Sleeps on duty at night</li>
                <li>📵 No photos, no evidence, no log</li>
                <li>🔄 Takes leave, needs replacement</li>
                <li>👁️ Watches one gate, misses everything else</li>
              </ul>
            </div>
            <div className="bg-blue-950/30 border border-blue-800/40 rounded-2xl p-6">
              <h3 className="text-lg font-bold text-blue-400 mb-4">✅ StaffLenz Home — ₹1,499/mo</h3>
              <ul className="space-y-2 text-sm text-gray-300">
                <li>💰 10× cheaper than a guard</li>
                <li>🌙 Never sleeps — 24/7 AI monitoring</li>
                <li>📱 Instant WhatsApp with photo evidence</li>
                <li>🧹 Auto-tracks maid/cook/driver attendance</li>
                <li>📹 Watches ALL cameras simultaneously</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section id="demo" className="py-20 px-4 bg-gradient-to-br from-blue-700 to-indigo-800">
        <div className="max-w-4xl mx-auto text-center text-white">
          <h2 className="text-4xl font-extrabold mb-4">Your CCTV is already watching.<br/>Make it intelligent.</h2>
          <p className="text-blue-100 text-lg mb-8">Works with Hikvision, Dahua, CP Plus — any DVR with existing cameras. We connect in 20 minutes.</p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link href="/#contact" className="inline-flex items-center gap-2 bg-white text-blue-700 font-bold px-10 py-4 rounded-xl hover:bg-blue-50 transition-all shadow-2xl text-base">Book a Demo →</Link>
            <div className="inline-flex items-center gap-2 text-white/80 font-semibold px-10 py-4 text-base">
              Just ₹1,499/month · Cancel anytime
            </div>
          </div>
        </div>
      </section>

      <footer className="py-8 px-4 bg-gray-950 border-t border-gray-900 text-center text-sm text-gray-600">
        <div className="flex items-center justify-center gap-2 mb-3"><div className="w-7 h-7 bg-gradient-to-br from-blue-600 to-violet-600 rounded-lg flex items-center justify-center text-white font-bold text-xs">SL</div><span className="font-extrabold text-white">StaffLenz</span></div>
        <div className="flex flex-wrap items-center justify-center gap-4 mb-2">
          <Link href="/" className="hover:text-white">Home</Link>
          <Link href="/industries" className="hover:text-white">Industries</Link>
          <Link href="/industries/gym" className="hover:text-white">Gym</Link>
          <Link href="/industries/factory" className="hover:text-white">Factory</Link>
          <Link href="/industries/restaurant" className="hover:text-white">Restaurant</Link>
        </div>
        <p>© {new Date().getFullYear()} StaffLenz · AI-Powered Home & Workforce Intelligence</p>
      </footer>
    </div>
  );
}
