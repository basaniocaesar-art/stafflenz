'use client';
import Link from 'next/link';
import PipelineDemoSection from '@/components/PipelineDemoSection';
import CameraGrid from '@/components/CameraGrid';

const FRAMES = [
  {
    sceneLabel: 'Late Arrival',
    sceneIcon: '⏰',
    sceneDescription: 'Entrance camera scan — checking staff arrival against scheduled shift start',
    zone: 'Main Entrance · CAM 01',
    camId: '01',
    video_query: 'office building entrance door people walking morning',
    aiPrompt: 'Has the employee arrived at the workplace? What time did they enter?',
    detections: [
      { label: 'Rahul (Sales) — Late', color: '#ef4444', x: '35%', y: '15%', w: '30%', h: '60%' },
      { label: 'Shift started 9:00 AM', color: '#f59e0b', x: '10%', y: '5%', w: '25%', h: '15%' },
    ],
    output: {
      icon: '⏰', title: 'Late Arrival Detected', tag: 'Attendance Alert · 9:23 AM',
      borderColor: '#ef444460', bgColor: '#450a0a40', iconBg: '#ef4444', tagColor: '#fca5a5',
      lines: [
        { icon: '🔴', text: 'Rahul (Sales) arrived 23 minutes late' },
        { icon: '🕐', text: 'Shift start: 9:00 AM · Arrived: 9:23 AM' },
        { icon: '📍', text: 'Main Entrance · Cam 01 · 9:23 AM' },
      ],
      action: '📱 HR manager notified via WhatsApp',
      whatsapp: '⏰ *LATE ARRIVAL*\n\nRahul (Sales) arrived at 9:23 AM\nShift start was 9:00 AM — 23 min late\n\nMain Entrance · Cam 01\n\nThis is the 3rd late arrival this week.',
    },
  },
  {
    sceneLabel: 'Extended Break',
    sceneIcon: '☕',
    sceneDescription: 'Break room camera — monitoring break duration against company policy',
    zone: 'Break Room · CAM 04',
    camId: '04',
    video_query: 'office break room employees coffee lunch sitting',
    aiPrompt: 'How long has this employee been in the break room? Is it within the allowed break time?',
    detections: [
      { label: 'Priya (Accounts) — 47 min break', color: '#f59e0b', x: '25%', y: '20%', w: '30%', h: '55%' },
      { label: 'Policy: 30 min max', color: '#ef4444', x: '60%', y: '5%', w: '35%', h: '15%' },
    ],
    output: {
      icon: '☕', title: 'Extended Break', tag: 'Policy Alert · 47 min',
      borderColor: '#f59e0b60', bgColor: '#2d1b0040', iconBg: '#f59e0b', tagColor: '#fcd34d',
      lines: [
        { icon: '⚠️', text: 'Priya (Accounts) on break for 47 minutes' },
        { icon: '📋', text: 'Company policy allows 30 min — exceeded by 17 min' },
        { icon: '📍', text: 'Break Room · Cam 04 · 1:47 PM' },
      ],
      action: '📊 Logged in attendance report for HR review',
      whatsapp: '☕ *EXTENDED BREAK*\n\nPriya (Accounts) — 47 min in break room\nPolicy limit: 30 min\n\nBreak Room · Cam 04 · 1:47 PM\n\nLogged for attendance report.',
    },
  },
  {
    sceneLabel: 'Idle at Desk',
    sceneIcon: '💤',
    sceneDescription: 'Floor camera scan — detecting employees idle or on phone during work hours',
    zone: 'Open Floor · CAM 02',
    camId: '02',
    video_query: 'office workers sitting desk computer working open plan',
    aiPrompt: 'Is the employee actively working or idle? Are they on their phone during work hours?',
    detections: [
      { label: 'Karthik — On phone 12 min', color: '#ef4444', x: '40%', y: '20%', w: '25%', h: '50%' },
      { label: '3 staff working ✓', color: '#10b981', x: '5%', y: '30%', w: '30%', h: '45%' },
    ],
    output: {
      icon: '💤', title: 'Employee Idle — On Phone', tag: 'Productivity Alert · 12 min',
      borderColor: '#ef444460', bgColor: '#450a0a40', iconBg: '#ef4444', tagColor: '#fca5a5',
      lines: [
        { icon: '📱', text: 'Karthik on personal phone for 12 minutes during shift' },
        { icon: '👥', text: '3 other staff in the same zone are working normally' },
        { icon: '📍', text: 'Open Floor · Cam 02 · 11:14 AM' },
      ],
      action: '📊 Auto-logged as idle time in daily report',
      whatsapp: '💤 *IDLE EMPLOYEE*\n\nKarthik — on phone for 12+ min\nOpen Floor · Cam 02 · 11:14 AM\n\nOther staff in zone are working.\nLogged in daily productivity report.',
    },
  },
  {
    sceneLabel: 'Early Departure',
    sceneIcon: '🚪',
    sceneDescription: 'Exit camera scan — detecting staff leaving before shift end time',
    zone: 'Exit Gate · CAM 01',
    camId: '01',
    video_query: 'person leaving office building exit door evening',
    aiPrompt: 'Has the employee left the premises before the scheduled shift end time?',
    detections: [
      { label: 'Deepa (HR) — Left early', color: '#ef4444', x: '30%', y: '18%', w: '35%', h: '58%' },
      { label: 'Shift ends 6:00 PM', color: '#f59e0b', x: '10%', y: '5%', w: '25%', h: '15%' },
    ],
    output: {
      icon: '🚪', title: 'Early Departure', tag: 'Attendance Alert · 4:42 PM',
      borderColor: '#ef444460', bgColor: '#450a0a40', iconBg: '#ef4444', tagColor: '#fca5a5',
      lines: [
        { icon: '🚪', text: 'Deepa (HR) left at 4:42 PM — 1h 18m early' },
        { icon: '🕐', text: 'Shift end: 6:00 PM · No leave approved for today' },
        { icon: '📍', text: 'Exit Gate · Cam 01 · 4:42 PM' },
      ],
      action: '📱 Manager notified + logged in attendance',
      whatsapp: '🚪 *EARLY DEPARTURE*\n\nDeepa (HR) left at 4:42 PM\nShift ends at 6:00 PM — 1h 18m early\nNo approved leave on record\n\nExit Gate · Cam 01',
    },
  },
];

export default function StaffPage() {
  return (
    <div className="min-h-screen overflow-x-hidden">

      <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-xl border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-gradient-to-br from-blue-600 to-violet-600 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-blue-200">LA</div>
            <span className="font-extrabold text-xl text-gray-900 tracking-tight">LenzAI</span>
          </Link>
          <div className="hidden md:flex items-center gap-4 text-sm font-medium text-gray-500">
            <Link href="/" className="hover:text-gray-900 transition-colors">Home</Link>
            <Link href="/industries" className="hover:text-gray-900 transition-colors">Industries</Link>
            <Link href="/#pricing" className="hover:text-gray-900 transition-colors">Pricing</Link>
          </div>
          <div className="flex items-center gap-3">
            <a href="#demo" className="hidden sm:block text-sm font-semibold text-violet-600 hover:text-violet-700">Book Demo</a>
            <Link href="/login" className="text-sm px-5 py-2 bg-violet-600 hover:bg-violet-700 text-white font-bold rounded-xl transition-all">Login →</Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative bg-[#0A0618] text-white overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-violet-950/80 via-[#0A0618] to-purple-950/60" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-violet-600/20 rounded-full blur-[120px]" />
        <div className="absolute inset-0 opacity-[0.04]" style={{backgroundImage:'linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)',backgroundSize:'50px 50px'}} />
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 pt-20 pb-24">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 bg-violet-500/20 border border-violet-400/30 rounded-full px-5 py-2 text-sm font-medium text-violet-300 mb-6">👥 Staff Monitoring</div>
              <h1 className="text-5xl md:text-6xl font-extrabold mb-6 leading-[1.1] tracking-tight">
                Know who&apos;s working,<br />who&apos;s not, and<br /><span className="bg-clip-text text-transparent bg-gradient-to-r from-violet-400 to-purple-400">prove it with data.</span>
              </h1>
              <p className="text-lg text-slate-300 mb-8 leading-relaxed">
                AI watches your CCTV and tells you exactly when each employee arrived, how long they worked, how many breaks they took, and if they left early — automatically, every day, with zero manual tracking.
              </p>
              <div className="flex flex-wrap gap-4">
                <a href="#demo" className="inline-flex items-center gap-2 bg-violet-600 text-white font-bold px-8 py-4 rounded-xl hover:bg-violet-700 transition-all shadow-2xl shadow-violet-900/40 text-base">Book a Demo →</a>
                <a href="#how-it-works" className="inline-flex items-center gap-2 bg-white/10 border border-white/20 text-white font-semibold px-8 py-4 rounded-xl hover:bg-white/20 transition-all text-base">See How It Works</a>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[
                {n:'Auto',l:'Clock-in/Clock-out',sub:'no fingerprint scanner, no buddy punching'},
                {n:'15 min',l:'Break Tracking',sub:'exact duration, frequency, who\'s on break now'},
                {n:'Daily',l:'Attendance Report',sub:'hours worked, idle time, overtime — per employee'},
                {n:'Instant',l:'WhatsApp Alerts',sub:'late arrival, early departure, extended break'},
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

      <CameraGrid industry="security" />

      <PipelineDemoSection frames={FRAMES} accentColor="#8b5cf6" industry="security" />

      {/* Staff-specific solutions */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <div className="section-label mb-4">What You Get</div>
            <h2 className="text-4xl font-extrabold text-gray-900 tracking-tight">Every hour accounted for.<br/>No arguments, just data.</h2>
            <p className="mt-4 text-gray-500 max-w-2xl mx-auto">Stop relying on sign-in sheets, buddy punching, and &quot;I was here but you didn&apos;t see me.&quot; LenzAI watches the cameras and builds the attendance record automatically.</p>
          </div>

          <div className="grid lg:grid-cols-2 gap-8">
            <div className="card p-7 border-l-4 border-l-violet-400">
              <div className="text-3xl mb-3">⏰</div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Auto Clock-in / Clock-out</h3>
              <p className="text-gray-500 text-sm mb-4 leading-relaxed">The moment an employee walks past any camera, AI recognises their face and logs their arrival. When they leave, it logs their departure. No fingerprint scanner, no app, no buddy punching possible.</p>
              <div className="bg-violet-50 border border-violet-200 rounded-xl p-4 text-sm">
                <div className="font-bold text-violet-800 mb-2">Today&apos;s attendance (auto-generated):</div>
                <ul className="space-y-1 text-violet-700">
                  <li>✅ Rahul — In: 9:23 AM (23 min late) · Out: 6:05 PM · 8h 42m</li>
                  <li>✅ Priya — In: 8:58 AM · Out: 6:00 PM · 9h 2m</li>
                  <li>✅ Karthik — In: 9:01 AM · Out: 5:30 PM · 8h 29m</li>
                  <li>🔴 Deepa — In: 9:15 AM · Out: 4:42 PM (early) · 7h 27m</li>
                  <li>🔴 Suresh — Not detected today · Absent</li>
                </ul>
              </div>
            </div>

            <div className="card p-7 border-l-4 border-l-purple-400">
              <div className="text-3xl mb-3">☕</div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Break Tracking — To the Minute</h3>
              <p className="text-gray-500 text-sm mb-4 leading-relaxed">AI detects when an employee disappears from their work zone for more than 15 minutes and logs it as a break. You see exactly how many breaks, how long each one, and total break time per day.</p>
              <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 text-sm">
                <div className="font-bold text-purple-800 mb-2">Rahul&apos;s breaks today:</div>
                <ul className="space-y-1 text-purple-700">
                  <li>☕ Break 1: 11:15 AM – 11:32 AM (17 min) ✓</li>
                  <li>🍴 Break 2: 1:00 PM – 1:48 PM (48 min) ⚠️ exceeded</li>
                  <li>☕ Break 3: 3:45 PM – 4:02 PM (17 min) ✓</li>
                  <li>📊 Total: 3 breaks, 1h 22m (policy allows 1h max)</li>
                </ul>
              </div>
            </div>

            <div className="card p-7 border-l-4 border-l-fuchsia-400">
              <div className="text-3xl mb-3">📊</div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Weekly & Monthly Reports for Payroll</h3>
              <p className="text-gray-500 text-sm mb-4 leading-relaxed">End-of-week and end-of-month reports auto-generated: total hours per employee, late days, overtime, average arrival time. Export-ready for your accountant or payroll system.</p>
              <div className="bg-fuchsia-50 border border-fuchsia-200 rounded-xl p-4 text-sm">
                <div className="font-bold text-fuchsia-800 mb-2">This week — Rahul (Sales):</div>
                <ul className="space-y-1 text-fuchsia-700">
                  <li>📅 Days present: 4/5 (absent Friday)</li>
                  <li>⏱️ Total hours: 34h 15m</li>
                  <li>⏰ Avg arrival: 9:18 AM (shift starts 9:00)</li>
                  <li>🚪 Avg departure: 6:02 PM</li>
                  <li>☕ Total break time: 5h 40m (above policy by 40m)</li>
                  <li>⚠️ Late arrivals: 3 of 4 days</li>
                </ul>
              </div>
            </div>

            <div className="card p-7 border-l-4 border-l-indigo-400">
              <div className="text-3xl mb-3">📱</div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Instant WhatsApp Alerts</h3>
              <p className="text-gray-500 text-sm mb-4 leading-relaxed">Get a message the moment something happens: late arrival, extended break, early departure, or an employee not showing up at all. You decide which alerts you want and who receives them.</p>
              <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 text-sm">
                <div className="font-bold text-indigo-800 mb-2">Alerts you can turn on:</div>
                <ul className="space-y-1 text-indigo-700">
                  <li>⏰ Late arrival (customisable: 5 / 10 / 15 / 30 min)</li>
                  <li>🚪 Early departure (before shift end)</li>
                  <li>☕ Extended break (over 30 min)</li>
                  <li>🔴 No-show (not detected by 10 AM)</li>
                  <li>💤 Idle for 15+ min during shift</li>
                  <li>📊 Daily summary at 10 PM</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ROI */}
      <section className="py-20 px-4 bg-gray-950">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-violet-400 bg-violet-950/60 border border-violet-800/50 px-4 py-1.5 rounded-full mb-4">The Numbers</div>
          <h2 className="text-4xl font-extrabold text-white tracking-tight mb-8">How much are you losing<br/>to untracked time?</h2>

          <div className="grid md:grid-cols-3 gap-6 text-left">
            <div className="bg-violet-950/30 border border-violet-800/40 rounded-2xl p-6">
              <h3 className="text-lg font-bold text-violet-400 mb-2">Late arrivals</h3>
              <p className="text-3xl font-extrabold text-white mb-2">₹15,000+</p>
              <p className="text-sm text-gray-400">per month in lost productivity from 15-min-late starts across 10 employees</p>
            </div>
            <div className="bg-violet-950/30 border border-violet-800/40 rounded-2xl p-6">
              <h3 className="text-lg font-bold text-violet-400 mb-2">Extended breaks</h3>
              <p className="text-3xl font-extrabold text-white mb-2">₹8,000+</p>
              <p className="text-sm text-gray-400">per month from 45-min breaks where policy allows 30 min, across the team</p>
            </div>
            <div className="bg-violet-950/30 border border-violet-800/40 rounded-2xl p-6">
              <h3 className="text-lg font-bold text-violet-400 mb-2">Buddy punching</h3>
              <p className="text-3xl font-extrabold text-white mb-2">₹0</p>
              <p className="text-sm text-gray-400">with LenzAI — face recognition means nobody can clock in for someone else</p>
            </div>
          </div>

          <p className="mt-8 text-gray-500">LenzAI costs ₹4,999/month. The time it saves you is worth 3–5× that on day one.</p>
        </div>
      </section>

      {/* CTA */}
      <section id="demo" className="py-20 px-4 bg-gradient-to-br from-violet-700 to-purple-800">
        <div className="max-w-4xl mx-auto text-center text-white">
          <h2 className="text-4xl font-extrabold mb-4">Stop guessing who worked how long.<br/>Start knowing.</h2>
          <p className="text-violet-100 text-lg mb-8">Works with any existing CCTV — Hikvision, Dahua, CP Plus. We connect in 20 minutes.</p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link href="/#contact" className="inline-flex items-center gap-2 bg-white text-violet-700 font-bold px-10 py-4 rounded-xl hover:bg-violet-50 transition-all shadow-2xl text-base">Book a Demo →</Link>
            <div className="inline-flex items-center gap-2 text-white/80 font-semibold px-10 py-4 text-base">
              From ₹4,999/month · Cancel anytime
            </div>
          </div>
        </div>
      </section>

      <footer className="py-8 px-4 bg-gray-950 border-t border-gray-900 text-center text-sm text-gray-600">
        <div className="flex items-center justify-center gap-2 mb-3"><div className="w-7 h-7 bg-gradient-to-br from-blue-600 to-violet-600 rounded-lg flex items-center justify-center text-white font-bold text-xs">LA</div><span className="font-extrabold text-white">LenzAI</span></div>
        <div className="flex flex-wrap items-center justify-center gap-4 mb-2">
          <Link href="/" className="hover:text-white">Home</Link>
          <Link href="/industries" className="hover:text-white">Industries</Link>
          <Link href="/industries/gym" className="hover:text-white">Gym</Link>
          <Link href="/industries/factory" className="hover:text-white">Factory</Link>
          <Link href="/industries/home" className="hover:text-white">Home Security</Link>
        </div>
        <p>© {new Date().getFullYear()} LenzAI · AI-Powered Workforce Intelligence</p>
      </footer>
    </div>
  );
}
