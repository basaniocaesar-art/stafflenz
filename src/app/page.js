'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import PricingSlider from '@/components/PricingSlider';
import AffiliateTracker, { getAffiliateCode, getAffiliateClickId } from '@/components/AffiliateTracker';

const INDUSTRIES = [
  {
    id: 'factory',
    label: 'Factory',
    icon: '🏭',
    headline: 'Production Line Intelligence',
    sub: 'PPE compliance, line coverage & contractor verification — automated.',
    color: 'text-amber-400',
    border: 'border-amber-500',
    bg: 'bg-amber-500',
    detections: [
      { label: 'Rajesh Kumar', sub: 'Production Line A · Check-in', color: '#10b981', x: '12%', y: '20%', w: '22%', h: '45%' },
      { label: '⚠ PPE Violation', sub: 'No helmet · Welding Bay', color: '#ef4444', x: '55%', y: '15%', w: '20%', h: '48%' },
      { label: 'Suresh P.', sub: 'Zone: Assembly Floor', color: '#10b981', x: '40%', y: '35%', w: '18%', h: '40%' },
    ],
    zone: 'Production Floor · Camera 03',
  },
  {
    id: 'hotel',
    label: 'Hotel',
    icon: '🏨',
    headline: 'Room Turnover & Cover Count',
    sub: 'Track housekeeping floor by floor and restaurant covers in real time.',
    color: 'text-violet-400',
    border: 'border-violet-500',
    bg: 'bg-violet-500',
    detections: [
      { label: 'Priya Menon', sub: 'Housekeeping · Floor 3', color: '#10b981', x: '10%', y: '18%', w: '20%', h: '50%' },
      { label: '⚠ Reception Unmanned', sub: 'Lobby · 4 min gap', color: '#ef4444', x: '50%', y: '10%', w: '40%', h: '30%' },
      { label: 'Anita S.', sub: 'Room 304 · In progress', color: '#10b981', x: '42%', y: '40%', w: '18%', h: '45%' },
    ],
    zone: 'Lobby Level · Camera 01',
  },
  {
    id: 'school',
    label: 'School',
    icon: '🏫',
    headline: 'Period-by-Period Class Coverage',
    sub: 'Know the moment a class is unattended — before a parent calls.',
    color: 'text-emerald-400',
    border: 'border-emerald-500',
    bg: 'bg-emerald-500',
    detections: [
      { label: 'Mrs. Lakshmi R.', sub: 'Class 8A · Period 3', color: '#10b981', x: '8%', y: '15%', w: '22%', h: '55%' },
      { label: '⚠ Class 8C Unattended', sub: 'English period · No teacher', color: '#ef4444', x: '48%', y: '5%', w: '44%', h: '35%' },
      { label: 'Mr. Arjun P.', sub: 'Class 9A · On duty', color: '#10b981', x: '40%', y: '45%', w: '20%', h: '42%' },
    ],
    zone: 'Class Block B · Camera 02',
  },
  {
    id: 'retail',
    label: 'Retail',
    icon: '🛍️',
    headline: 'Section Coverage & Till Status',
    sub: 'See which aisle is unstaffed and how many billing counters are open.',
    color: 'text-rose-400',
    border: 'border-rose-500',
    bg: 'bg-rose-500',
    detections: [
      { label: 'Sneha Raj', sub: 'Billing Counter 3 · Active', color: '#10b981', x: '10%', y: '20%', w: '20%', h: '50%' },
      { label: '⚠ Electronics Uncovered', sub: '22 min · No staff in zone', color: '#ef4444', x: '46%', y: '8%', w: '46%', h: '32%' },
      { label: 'Preethi S.', sub: 'Ladies Fashion · Floor 1', color: '#10b981', x: '38%', y: '42%', w: '18%', h: '44%' },
    ],
    zone: 'Store Floor · Camera 05',
  },
  {
    id: 'hospital',
    label: 'Hospital',
    icon: '🏥',
    headline: 'Ward Ratios & Restricted Zone Access',
    sub: 'Nurse-to-patient ratio breaches and pharmacy access — detected instantly.',
    color: 'text-cyan-400',
    border: 'border-cyan-500',
    bg: 'bg-cyan-600',
    detections: [
      { label: 'Nurse Maria', sub: 'ICU Bay 1 · On duty', color: '#10b981', x: '8%', y: '15%', w: '22%', h: '55%' },
      { label: '⚠ ICU Bay 2: 1:4 ratio', sub: 'Min 1:2 — ratio breach', color: '#ef4444', x: '48%', y: '5%', w: '44%', h: '35%' },
      { label: 'Nurse Priya', sub: 'General Ward A · Rounds', color: '#10b981', x: '40%', y: '45%', w: '20%', h: '42%' },
    ],
    zone: 'ICU Block · Camera 02',
  },
  {
    id: 'construction',
    label: 'Construction',
    icon: '🏗️',
    headline: 'PPE per Zone & Muster Verification',
    sub: 'Harness on scaffold, hard hat at ground level — checked per zone automatically.',
    color: 'text-yellow-400',
    border: 'border-yellow-500',
    bg: 'bg-yellow-500',
    detections: [
      { label: 'Rahul K.', sub: 'Ground Level · Hi-vis ✓', color: '#10b981', x: '12%', y: '20%', w: '20%', h: '50%' },
      { label: '⚠ No Harness Detected', sub: 'Scaffold Level 4 · Violation', color: '#ef4444', x: '50%', y: '8%', w: '42%', h: '33%' },
      { label: 'Sanjay V.', sub: 'Crane Zone · Authorised', color: '#10b981', x: '40%', y: '45%', w: '18%', h: '43%' },
    ],
    zone: 'Site Block A · Camera 07',
  },
  {
    id: 'warehouse',
    label: 'Warehouse',
    icon: '📦',
    headline: 'Bay Coverage & Cold Storage Access',
    sub: 'Which loading bay is empty and who is in cold storage right now.',
    color: 'text-indigo-400',
    border: 'border-indigo-500',
    bg: 'bg-indigo-600',
    detections: [
      { label: 'Ravi Kumar', sub: 'Bay 2 · Loading active', color: '#10b981', x: '10%', y: '18%', w: '20%', h: '52%' },
      { label: '⚠ Bay 3 Unmanned', sub: '34 min · Dispatch window open', color: '#ef4444', x: '46%', y: '6%', w: '46%', h: '33%' },
      { label: 'Picker 5', sub: 'Aisle G · On route', color: '#10b981', x: '38%', y: '44%', w: '18%', h: '43%' },
    ],
    zone: 'Loading Floor · Camera 04',
  },
  {
    id: 'restaurant',
    label: 'Restaurant',
    icon: '🍽️',
    headline: 'Station Staffing & Cover Ratio',
    sub: 'Is the grill unmanned. Are too many waiters on break during dinner service.',
    color: 'text-orange-400',
    border: 'border-orange-500',
    bg: 'bg-orange-500',
    detections: [
      { label: 'Chef Rajan', sub: 'Grill Station · On duty', color: '#10b981', x: '8%', y: '16%', w: '22%', h: '54%' },
      { label: '⚠ No Hairnet — Prep', sub: 'Hygiene violation · Prep station', color: '#ef4444', x: '48%', y: '6%', w: '44%', h: '34%' },
      { label: 'Waiter Tom', sub: 'Floor · 43 covers active', color: '#10b981', x: '38%', y: '44%', w: '20%', h: '43%' },
    ],
    zone: 'Kitchen · Camera 01',
  },
  {
    id: 'security',
    label: 'Security',
    icon: '🔒',
    headline: 'Post Monitoring & Patrol Verification',
    sub: 'Every guard at post. Every checkpoint timestamped. No self-reported logs.',
    color: 'text-slate-300',
    border: 'border-slate-500',
    bg: 'bg-slate-600',
    detections: [
      { label: 'Guard Rajan S.', sub: 'Main Entrance · On post', color: '#10b981', x: '10%', y: '20%', w: '20%', h: '50%' },
      { label: '⚠ Server Room Abandoned', sub: '12 min unattended · Alert sent', color: '#ef4444', x: '46%', y: '8%', w: '46%', h: '32%' },
      { label: 'Guard Meena P.', sub: 'Car Park A · Patrol active', color: '#10b981', x: '38%', y: '44%', w: '18%', h: '43%' },
    ],
    zone: 'Site Perimeter · Camera 09',
  },
];

const TICKER = [
  '🔌 No Hardware Replacement',
  '📷 Works With Any IP Camera',
  '🤖 Claude AI Vision Engine',
  '⚡ 5-Minute Scan Interval',
  '🔒 Privacy-First — No Video Stored',
  '📱 WhatsApp Alerts',
  '95%+ Detection Accuracy',
  '🌍 Trusted by Businesses Worldwide',
];

const COMPLIANCE = [
  { icon: '🛡️', title: 'Security Compliance', desc: 'Zone access control, unauthorised entry detection, and after-hours monitoring across all areas.' },
  { icon: '⛑️', title: 'Safety Compliance', desc: 'PPE verification per zone — helmet, vest, gloves, face shield — checked automatically every 5 minutes.' },
  { icon: '🧹', title: 'Hygiene Compliance', desc: 'Monitor cleaning staff presence, canteen hygiene duties, and sanitation zone coverage.' },
  { icon: '💼', title: 'Workforce Compliance', desc: 'Attendance accuracy, shift adherence, contractor verification, and duty schedule monitoring.' },
];

const WHY = [
  { icon: '📷', title: 'Works With Existing IP Cameras', desc: 'Plug the StaffLenz Edge Node into your current DVR/NVR. No new cameras, no rewiring, no downtime.' },
  { icon: '🎯', title: '95%+ Detection Accuracy', desc: 'Claude Vision AI delivers industry-leading accuracy. You can act on every alert with confidence.' },
  { icon: '⚡', title: 'Real-Time Alerts in Seconds', desc: 'From camera scan to WhatsApp alert in under 30 seconds. No delay, no batch processing.' },
  { icon: '👁️', title: 'Central Visibility', desc: 'One dashboard for all your sites, all cameras, all industries — with drill-down to individual zones.' },
  { icon: '💰', title: 'Flexible Pricing', desc: 'Plans for every scale — from small sites to enterprise chains. No long-term lock-in required.' },
  { icon: '🔒', title: 'Privacy-First Architecture', desc: 'Camera frames are analysed and immediately discarded. Only structured text data is ever stored.' },
];

const PLANS = [
  { name: 'Starter', workers: 15, cameras: 4, usd: 59, highlight: false, ideal: 'Small sites' },
  { name: 'Standard', workers: 50, cameras: 8, usd: 99, highlight: true, ideal: 'Growing businesses' },
  { name: 'Pro', workers: 150, cameras: 16, usd: 169, highlight: false, ideal: 'Large operations' },
  { name: 'Enterprise', workers: 999, cameras: 64, usd: 269, highlight: false, ideal: 'Multi-site chains' },
];

function CCTVPane({ industry, videoUrl }) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick(v => v + 1), 1500);
    return () => clearInterval(t);
  }, []);

  const now = new Date();
  const ts = `${String(now.getDate()).padStart(2,'0')}-${String(now.getMonth()+1).padStart(2,'0')}-${now.getFullYear()} ${['Mon','Tue','Wed','Thu','Fri','Sat','Sun'][now.getDay()-1]} ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}:${String(now.getSeconds()).padStart(2,'0')}`;

  return (
    <div className="relative w-full aspect-video bg-gray-950 rounded-xl overflow-hidden border border-gray-700 shadow-2xl shadow-black/60">
      {/* Real Pexels video background */}
      {videoUrl && (
        <video
          key={videoUrl}
          autoPlay
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
          style={{ opacity: 0.45 }}
          onTimeUpdate={(e) => {
            const v = e.target;
            if (v.duration && v.currentTime > v.duration - 0.25) {
              v.currentTime = 0;
            }
          }}
        >
          <source src={videoUrl} type="video/mp4" />
        </video>
      )}

      {/* dark vignette over video */}
      <div className="absolute inset-0 bg-gradient-to-br from-black/40 via-transparent to-black/60 pointer-events-none" />

      {/* scanline effect */}
      <div className="absolute inset-0 pointer-events-none" style={{background:'repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,0.08) 2px,rgba(0,0,0,0.08) 4px)'}} />

      {/* grid lines */}
      <div className="absolute inset-0 opacity-[0.06]" style={{backgroundImage:'linear-gradient(#0f0,transparent 1px),linear-gradient(90deg,#0f0,transparent 1px)',backgroundSize:'40px 40px'}} />

      {/* timestamp */}
      <div className="absolute top-3 left-3 font-mono text-xs text-green-400 bg-black/60 px-2 py-1 rounded">
        {ts}
      </div>

      {/* REC indicator */}
      <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-black/60 px-2 py-1 rounded">
        <span className="w-2 h-2 bg-red-500 rounded-full" style={{animation:'pulse 1s ease-in-out infinite'}} />
        <span className="text-xs font-bold text-white font-mono">REC</span>
      </div>

      {/* Detection boxes */}
      {industry.detections.map((d, i) => (
        <div
          key={i}
          className="absolute transition-opacity duration-500"
          style={{
            left: d.x, top: d.y, width: d.w, height: d.h,
            border: `2px solid ${d.color}`,
            boxShadow: `0 0 8px ${d.color}40`,
            opacity: tick % 3 === i ? 1 : 0.3,
          }}
        >
          <div
            className="absolute -top-6 left-0 text-xs font-bold px-1.5 py-0.5 rounded whitespace-nowrap max-w-[160px] truncate"
            style={{background: d.color, color: '#000'}}
          >
            {d.label}
          </div>
          <div className="absolute -bottom-5 left-0 text-xs text-gray-300 bg-black/70 px-1 rounded whitespace-nowrap max-w-[160px] truncate">
            {d.sub}
          </div>
          {/* corner marks */}
          <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2" style={{borderColor: d.color}} />
          <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2" style={{borderColor: d.color}} />
          <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2" style={{borderColor: d.color}} />
          <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2" style={{borderColor: d.color}} />
        </div>
      ))}

      {/* confidence */}
      <div className="absolute bottom-10 right-3 text-xs font-mono text-green-400 bg-black/70 px-2 py-1 rounded text-right">
        <div>CONF: {93 + (tick % 5)}%</div>
        <div>ZONE: {industry.detections.length} detected</div>
      </div>

      {/* camera label */}
      <div className="absolute bottom-3 right-3 font-mono text-xs text-gray-400 bg-black/60 px-2 py-1 rounded">
        {industry.zone}
      </div>

      {/* scan line animation */}
      <div
        className="absolute left-0 right-0 h-0.5 bg-green-400/20 pointer-events-none"
        style={{
          top: `${(tick * 8) % 100}%`,
          transition: 'top 1.5s linear',
          boxShadow: '0 0 12px rgba(74,222,128,0.4)',
        }}
      />
    </div>
  );
}

export default function HomePage() {
  const [activeIndustry, setActiveIndustry] = useState(0);
  const [videos, setVideos] = useState({});
  const [form, setForm] = useState({ name: '', email: '', phone: '', company: '', industry: '', message: '' });
  const [status, setStatus] = useState('idle');

  // Fetch industry videos from Pexels sequentially to avoid rate limiting
  useEffect(() => {
    async function fetchVideos() {
      for (const ind of INDUSTRIES) {
        try {
          const res = await fetch(`/api/pexels?industry=${ind.id}`);
          const data = await res.json();
          setVideos(prev => ({ ...prev, [ind.id]: data.url }));
        } catch {
          setVideos(prev => ({ ...prev, [ind.id]: null }));
        }
      }
    }
    fetchVideos();
  }, []);

  // Auto-cycle industries
  useEffect(() => {
    const t = setInterval(() => setActiveIndustry(v => (v + 1) % INDUSTRIES.length), 5000);
    return () => clearInterval(t);
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setStatus('loading');
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          affiliate_code: getAffiliateCode(),
          affiliate_click_id: getAffiliateClickId(),
        }),
      });
      const data = await res.json();
      if (res.ok) { setStatus('success'); setForm({ name: '', email: '', phone: '', company: '', industry: '', message: '' }); }
      else { alert(data.error || 'Something went wrong'); setStatus('idle'); }
    } catch { alert('Network error. Please try again.'); setStatus('idle'); }
  }

  const ind = INDUSTRIES[activeIndustry];

  return (
    <div className="min-h-screen overflow-x-hidden">
      <AffiliateTracker />

      {/* Navbar */}
      <nav className="sticky top-0 z-50 bg-[#05061A]/95 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-gradient-to-br from-blue-600 to-violet-600 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-blue-900/40">SL</div>
            <span className="font-extrabold text-xl text-white tracking-tight">StaffLenz</span>
          </div>
          <div className="hidden md:flex items-center gap-1 text-sm font-medium text-gray-400">
            <a href="#platform" className="px-3 py-2 rounded-lg hover:bg-white/10 hover:text-white transition-colors">Platform</a>
            <a href="#industries" className="px-3 py-2 rounded-lg hover:bg-white/10 hover:text-white transition-colors">Industries</a>
            <a href="#why" className="px-3 py-2 rounded-lg hover:bg-white/10 hover:text-white transition-colors">Why StaffLenz</a>
            <a href="#pricing" className="px-3 py-2 rounded-lg hover:bg-white/10 hover:text-white transition-colors">Pricing</a>
            <Link href="/blog" className="px-3 py-2 rounded-lg hover:bg-white/10 hover:text-white transition-colors">Blog</Link>
            <Link href="/partners" className="px-3 py-2 rounded-lg hover:bg-white/10 hover:text-white transition-colors">Partners</Link>
          </div>
          <div className="flex items-center gap-3">
            <a href="#contact" className="hidden sm:block text-sm font-semibold text-blue-400 hover:text-blue-300 transition-colors">Request a Demo</a>
            <Link href="/login" className="bg-white text-gray-900 font-bold text-sm px-5 py-2 rounded-xl hover:bg-gray-100 transition-all">Login →</Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative bg-[#05061A] text-white min-h-[92vh] flex items-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-950/50 via-[#05061A] to-violet-950/40" />
        <div className="absolute inset-0 opacity-[0.035]" style={{backgroundImage:'linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)',backgroundSize:'60px 60px'}} />
        <div className="absolute top-0 left-0 w-[600px] h-[600px] bg-blue-700/10 rounded-full blur-[150px] pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-violet-700/10 rounded-full blur-[150px] pointer-events-none" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-16 w-full">
          <div className="grid lg:grid-cols-2 gap-12 items-center">

            {/* Left */}
            <div>
              <div className="inline-flex items-center gap-2 bg-blue-500/15 border border-blue-500/30 rounded-full px-4 py-1.5 text-sm font-semibold text-blue-400 mb-6 tracking-wide">
                <span className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
                AI-POWERED WORKFORCE INTELLIGENCE
              </div>
              <h1 className="text-5xl sm:text-6xl font-extrabold leading-[1.08] tracking-tight mb-6">
                Turn Every Camera Into<br />
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-violet-400 to-blue-300">Intelligent Eyes</span><br />
                for Your Business
              </h1>
              <p className="text-lg text-slate-400 mb-8 leading-relaxed max-w-xl">
                StaffLenz transforms your existing CCTV infrastructure into a real-time AI intelligence platform — detecting attendance, compliance violations, and operational gaps across every industry.
              </p>
              <div className="flex flex-wrap gap-4 mb-10">
                <a href="#contact" className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-violet-600 text-white font-bold px-8 py-4 rounded-xl hover:opacity-90 transition-all shadow-2xl shadow-blue-900/40 text-base">
                  Request a Demo →
                </a>
                <a href="#platform" className="inline-flex items-center gap-2 bg-white/10 border border-white/20 text-white font-semibold px-8 py-4 rounded-xl hover:bg-white/15 transition-all text-base backdrop-blur">
                  Explore Platform
                </a>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-4 gap-4">
                {[
                  { n: '95%+', l: 'Detection Accuracy' },
                  { n: '30s', l: 'Alert Speed' },
                  { n: '500+', l: 'Sites Monitored' },
                  { n: '9+', l: 'Industry Verticals' },
                ].map(s => (
                  <div key={s.l}>
                    <div className="text-2xl font-extrabold text-white">{s.n}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{s.l}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right — interactive CCTV pane */}
            <div>
              {/* Industry tabs */}
              <div className="flex gap-2 mb-4 flex-wrap">
                {INDUSTRIES.map((i, idx) => (
                  <button
                    key={i.id}
                    onClick={() => setActiveIndustry(idx)}
                    className={`text-xs font-bold px-4 py-1.5 rounded-full border transition-all ${activeIndustry === idx ? `${i.bg} text-white border-transparent shadow-lg` : 'border-gray-700 text-gray-400 hover:text-white hover:border-gray-500'}`}
                  >
                    {i.icon} {i.label}
                  </button>
                ))}
              </div>

              {/* CCTV pane */}
              <CCTVPane industry={ind} videoUrl={videos[ind.id] || null} />

              {/* Industry info below pane */}
              <div className="mt-4 flex items-center justify-between">
                <div>
                  <div className={`text-base font-extrabold ${ind.color}`}>{ind.headline}</div>
                  <div className="text-sm text-gray-400 mt-0.5">{ind.sub}</div>
                </div>
                <Link href={`/industries/${ind.id}`} className={`text-xs font-bold px-4 py-2 rounded-xl border ${ind.border} ${ind.color} hover:bg-white/10 transition-all whitespace-nowrap`}>
                  Learn More →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Ticker */}
      <div className="bg-blue-700 py-3 overflow-hidden">
        <div className="flex gap-12 animate-[marquee_30s_linear_infinite] whitespace-nowrap">
          {[...TICKER, ...TICKER].map((t, i) => (
            <span key={i} className="text-sm font-semibold text-white/90 flex items-center gap-2">
              {t} <span className="text-blue-400 mx-4">·</span>
            </span>
          ))}
        </div>
      </div>

      {/* Explainer Video */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-4xl mx-auto text-center">
          <div className="section-label mb-4">See It In Action</div>
          <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-4 tracking-tight">
            60 seconds. That's all it takes to understand StaffLenz.
          </h2>
          <p className="text-gray-500 mb-10 max-w-xl mx-auto">Watch how StaffLenz turns your existing CCTV into a live workforce intelligence system — no new cameras, no new hardware.</p>
          <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-gray-100 bg-gray-950" style={{aspectRatio:'16/9'}}>
            {/* Video placeholder — replace src with real YouTube embed when ready */}
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 bg-gradient-to-br from-gray-900 to-blue-950">
              <div className="w-20 h-20 bg-white/10 border-2 border-white/30 rounded-full flex items-center justify-center backdrop-blur cursor-pointer hover:bg-white/20 transition-all group">
                <svg className="w-8 h-8 text-white ml-1 group-hover:scale-110 transition-transform" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z"/>
                </svg>
              </div>
              <div className="text-white font-bold text-lg">Watch Product Demo</div>
              <div className="text-gray-400 text-sm">How StaffLenz works — 60 second overview</div>
              <div className="absolute bottom-4 right-4 bg-black/60 px-3 py-1 rounded-lg text-xs text-gray-400 font-mono">1:02</div>
            </div>
          </div>
          <p className="mt-4 text-xs text-gray-400">No sign-up required to watch · Full demo available on request</p>
        </div>
      </section>

      {/* What is StaffLenz */}
      <section id="platform" className="py-24 px-4 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-4xl md:text-5xl font-extrabold text-gray-900 tracking-tight mb-5">
              What is <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-violet-600">StaffLenz</span> AI Video Analytics?
            </h2>
            <p className="text-gray-600 text-lg max-w-3xl mx-auto leading-relaxed">
              StaffLenz is an AI-powered workforce intelligence platform that helps your business transform CCTV footage into actionable insights for attendance, safety, and operational compliance. Our StaffLenz Edge Node integrates seamlessly with existing IP cameras and uses Claude Vision AI to analyse feeds in real time — detecting violations, tracking presence, and triggering instant alerts without any manual monitoring.
            </p>
            <p className="text-gray-500 text-base max-w-3xl mx-auto leading-relaxed mt-4">
              Through real-time video analysis, organisations can reduce compliance risks, prevent safety incidents, and maintain operational excellence by automating workforce monitoring across every site.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
            {COMPLIANCE.map(c => (
              <div key={c.title} className="bg-slate-50 border border-slate-200 rounded-2xl p-6 text-center hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
                <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4 shadow-lg shadow-blue-200">
                  {c.icon}
                </div>
                <h3 className="font-bold text-gray-900 mb-2">{c.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{c.desc}</p>
              </div>
            ))}
          </div>

          <div className="text-center">
            <a href="#industries" className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-violet-600 text-white font-bold px-8 py-4 rounded-xl hover:opacity-90 transition-all shadow-xl text-base">
              EXPLORE PLATFORM →
            </a>
          </div>
        </div>
      </section>

      {/* How we do it */}
      <section className="py-24 px-4 bg-slate-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-sm font-bold uppercase tracking-widest text-blue-600 mb-2">How we do it</p>
            <h2 className="text-4xl font-extrabold text-gray-900 tracking-tight">
              StaffLenz Edge Node | <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-violet-600">Vision-Based AI Analysis</span>
            </h2>
            <p className="mt-4 text-gray-500 max-w-2xl mx-auto text-base leading-relaxed">
              The StaffLenz Edge Node is a compact AI compute device that plugs into your existing DVR/NVR via LAN, independently executing visual monitoring every 5 minutes — freeing your team from manual supervision entirely.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: '⏱️', color: 'bg-blue-600',
                title: 'Automate Monitoring, Eliminate Manual Effort',
                points: ['Pre-trained AI models for each industry vertical', 'Automated scanning every 5 minutes, 24/7', 'Instant WhatsApp & dashboard alerts on violations'],
              },
              {
                icon: '⚙️', color: 'bg-violet-600',
                title: 'Easily Configure Rules Across Locations',
                points: ['Define zone-specific compliance rules per site', 'Monitor rule adoption and alert impact over time', 'Update detection rules without any hardware change'],
              },
              {
                icon: '📊', color: 'bg-indigo-700',
                title: 'Organisation-Wide Continuous Improvement',
                points: ['Automated daily and weekly attendance reports', 'Violation trends and compliance score per site', 'Location-wise performance benchmarking'],
              },
            ].map(card => (
              <div key={card.title} className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 hover:shadow-xl transition-all duration-300">
                <div className={`${card.color} px-6 py-5 flex items-center justify-center`}>
                  <span className="text-5xl">{card.icon}</span>
                </div>
                <div className="p-6">
                  <h3 className="font-extrabold text-gray-900 text-lg mb-4 leading-snug">{card.title}</h3>
                  <ul className="space-y-2">
                    {card.points.map(p => (
                      <li key={p} className="flex items-start gap-2 text-sm text-gray-600">
                        <span className="text-blue-500 font-bold mt-0.5">•</span> {p}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Industries */}
      <section id="industries" className="py-24 px-4 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-14">
            <div className="section-label mb-4">Industry Verticals</div>
            <h2 className="text-4xl md:text-5xl font-extrabold text-gray-900 tracking-tight">Built for your sector.<br />Not a generic tool.</h2>
            <p className="mt-4 text-gray-500 text-lg max-w-2xl mx-auto">Each industry gets a completely different dashboard, AI detection rules, and alert system — because a factory and a school have nothing in common.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { id:'factory', label:'Factory & Manufacturing', icon:'🏭', color:'from-amber-500 to-orange-600', bg:'bg-amber-50', border:'border-amber-200', tag:'bg-amber-100 text-amber-700', points:['Production line coverage','PPE per zone','Contractor vs permanent','Night shift monitoring'] },
              { id:'hotel', label:'Hotel & Hospitality', icon:'🏨', color:'from-violet-500 to-purple-600', bg:'bg-violet-50', border:'border-violet-200', tag:'bg-violet-100 text-violet-700', points:['Room turnover by floor','Restaurant cover count','Reception coverage','Banquet staffing ratios'] },
              { id:'school', label:'School & Education', icon:'🏫', color:'from-emerald-500 to-teal-600', bg:'bg-emerald-50', border:'border-emerald-200', tag:'bg-emerald-100 text-emerald-700', points:['Period-by-period grid','Canteen supervision','Exam hall invigilation','Bus & gate duty log'] },
              { id:'retail', label:'Retail & Stores', icon:'🛍️', color:'from-rose-500 to-pink-600', bg:'bg-rose-50', border:'border-rose-200', tag:'bg-rose-100 text-rose-700', points:['Section coverage heatmap','Billing counter status','Stock room access log','Overtime verification'] },
              { id:'hospital', label:'Hospital & Healthcare', icon:'🏥', color:'from-cyan-500 to-teal-600', bg:'bg-cyan-50', border:'border-cyan-200', tag:'bg-cyan-100 text-cyan-700', points:['ICU nurse-to-patient ratio','Ward coverage gaps','Restricted zone access log','PPE per ward type'] },
              { id:'construction', label:'Construction & Infrastructure', icon:'🏗️', color:'from-yellow-500 to-amber-500', bg:'bg-yellow-50', border:'border-yellow-200', tag:'bg-yellow-100 text-yellow-700', points:['Daily muster verification','PPE per zone (harness/helmet)','Danger zone enforcement','After-hours site security'] },
              { id:'warehouse', label:'Warehouse & Logistics', icon:'📦', color:'from-indigo-500 to-blue-600', bg:'bg-indigo-50', border:'border-indigo-200', tag:'bg-indigo-100 text-indigo-700', points:['Loading bay coverage','Cold storage access control','Picker zone assignment','Overtime AI verification'] },
              { id:'restaurant', label:'Restaurant & Food Service', icon:'🍽️', color:'from-orange-500 to-red-600', bg:'bg-orange-50', border:'border-orange-200', tag:'bg-orange-100 text-orange-700', points:['Kitchen station coverage','Floor cover ratio alerts','Hygiene PPE per station','Break overlap prevention'] },
              { id:'security', label:'Security & Guard Services', icon:'🔒', color:'from-slate-600 to-gray-700', bg:'bg-slate-50', border:'border-slate-200', tag:'bg-slate-100 text-slate-700', points:['Live post abandonment alerts','Patrol route verification','Shift handover timestamps','Response time tracking'] },
            ].map(ind => (
              <Link key={ind.id} href={`/industries/${ind.id}`} className={`card-hover p-6 flex flex-col group ${ind.bg} border ${ind.border}`}>
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${ind.color} flex items-center justify-center text-2xl shadow-lg mb-4`}>{ind.icon}</div>
                <div className={`text-xs font-bold uppercase tracking-widest px-2.5 py-1 rounded-full w-fit mb-3 ${ind.tag}`}>{ind.label}</div>
                <ul className="space-y-1.5 mb-5 flex-1">
                  {ind.points.map(p => (
                    <li key={p} className="flex items-center gap-2 text-xs font-medium text-gray-700">
                      <span className="text-emerald-500">✓</span> {p}
                    </li>
                  ))}
                </ul>
                <div className="flex items-center gap-1 text-sm font-bold text-blue-600 group-hover:gap-2 transition-all">
                  Explore solution <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Why Choose */}
      <section id="why" className="py-24 px-4 bg-slate-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-4xl md:text-5xl font-extrabold text-gray-900 tracking-tight">
              Why Choose <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-violet-600">StaffLenz</span>
            </h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {WHY.map(w => (
              <div key={w.title} className="bg-white rounded-2xl p-7 border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 text-center">
                <div className="w-16 h-16 bg-blue-50 border border-blue-100 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4">{w.icon}</div>
                <h3 className="font-extrabold text-gray-900 mb-2 text-base">{w.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{w.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-24 px-4 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <div className="section-label mb-4">Client Stories</div>
            <h2 className="text-4xl font-extrabold text-gray-900 tracking-tight">
              What our clients say
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                quote: "We had 3 ghost workers on payroll for over 6 months. StaffLenz flagged the discrepancy in the first week. The ROI paid for 2 years of subscription in one payroll cycle.",
                name: "Rajesh Nair",
                role: "Operations Manager",
                company: "Precision Auto Parts, Pune",
                industry: "🏭",
                stars: 5,
              },
              {
                quote: "Our housekeeping director used to do floor walks every 2 hours. Now StaffLenz does it continuously. We caught a floor going unattended for 40 minutes — something that would never have shown up in a manual check.",
                name: "Anita Sharma",
                role: "General Manager",
                company: "The Grand Residency, Bengaluru",
                industry: "🏨",
                stars: 5,
              },
              {
                quote: "After a parent complaint about an unattended classroom, our trustees asked for a monitoring solution. StaffLenz gave us a live dashboard that shows every class period — covered or not. No more blind spots.",
                name: "Fr. Thomas Kuriakose",
                role: "Principal",
                company: "St. Joseph's Academy, Kochi",
                industry: "🏫",
                stars: 5,
              },
            ].map((t, i) => (
              <div key={i} className="bg-gray-50 border border-gray-100 rounded-2xl p-7 flex flex-col">
                <div className="flex gap-0.5 mb-4">
                  {Array.from({length: t.stars}).map((_, s) => (
                    <span key={s} className="text-yellow-400 text-lg">★</span>
                  ))}
                </div>
                <p className="text-gray-700 text-sm leading-relaxed flex-1 mb-6">"{t.quote}"</p>
                <div className="flex items-center gap-3 pt-4 border-t border-gray-100">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-violet-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                    {t.name[0]}
                  </div>
                  <div>
                    <div className="font-bold text-gray-900 text-sm">{t.name}</div>
                    <div className="text-xs text-gray-500">{t.role} · {t.company}</div>
                  </div>
                  <span className="ml-auto text-2xl">{t.industry}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Social proof bar */}
          <div className="mt-14 grid grid-cols-2 md:grid-cols-4 gap-6 py-10 border-t border-b border-gray-100">
            {[
              { value: '500+', label: 'Shifts Monitored Daily' },
              { value: '9', label: 'Industry Verticals' },
              { value: '99.9%', label: 'Uptime SLA' },
              { value: '<30s', label: 'Alert to WhatsApp' },
            ].map(s => (
              <div key={s.label} className="text-center">
                <div className="text-3xl font-extrabold text-blue-600 mb-1">{s.value}</div>
                <div className="text-sm text-gray-500">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing — industry-specific slider */}
      <PricingSlider />

      {/* CTA strip */}
      <section className="py-20 px-4 bg-gradient-to-r from-blue-700 to-violet-700">
        <div className="max-w-3xl mx-auto text-center text-white">
          <h2 className="text-3xl md:text-4xl font-extrabold mb-4">Automate inspection of critical<br />repetitive workforce monitoring tasks.</h2>
          <p className="text-blue-100 text-lg mb-8">We install the Edge Node at your site and show live results within 48 hours — free.</p>
          <a href="#contact" className="inline-flex items-center gap-2 bg-white text-blue-700 font-bold px-10 py-4 rounded-xl hover:bg-blue-50 transition-all shadow-2xl text-base">
            Contact Us →
          </a>
        </div>
      </section>

      {/* Contact */}
      <section id="contact" className="py-24 px-4 bg-[#05061A]">
        <div className="max-w-xl mx-auto">
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-blue-400 bg-blue-950/60 border border-blue-800/50 px-4 py-1.5 rounded-full mb-4">Free Demo</div>
            <h2 className="text-4xl font-extrabold text-white">Request a Free Demo</h2>
            <p className="mt-3 text-slate-400">We will set up a live demo at your site within 48 hours.</p>
          </div>
          {status === 'success' ? (
            <div className="text-center py-12 bg-white/5 border border-white/10 rounded-2xl p-10">
              <div className="text-6xl mb-4">✅</div>
              <h3 className="text-2xl font-extrabold text-white">You&apos;re booked!</h3>
              <p className="text-slate-400 mt-3">We will reach you within 24 hours to schedule your demo.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4 bg-white/5 border border-white/10 rounded-2xl p-8">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-1.5">Name *</label>
                  <input className="input bg-white/10 border-white/20 text-white placeholder-slate-500 focus:border-blue-400" placeholder="Your name" value={form.name} onChange={e => setForm({...form,name:e.target.value})} required />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-1.5">Email *</label>
                  <input type="email" className="input bg-white/10 border-white/20 text-white placeholder-slate-500 focus:border-blue-400" placeholder="you@company.com" value={form.email} onChange={e => setForm({...form,email:e.target.value})} required />
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-1.5">Phone</label>
                  <input type="tel" className="input bg-white/10 border-white/20 text-white placeholder-slate-500 focus:border-blue-400" placeholder="+91 98765 43210" value={form.phone} onChange={e => setForm({...form,phone:e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-1.5">Company</label>
                  <input className="input bg-white/10 border-white/20 text-white placeholder-slate-500 focus:border-blue-400" placeholder="Company name" value={form.company} onChange={e => setForm({...form,company:e.target.value})} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-1.5">Industry</label>
                <select className="input bg-white/10 border-white/20 text-white focus:border-blue-400" value={form.industry} onChange={e => setForm({...form,industry:e.target.value})}>
                  <option value="" className="bg-gray-900">Select your industry</option>
                  <option value="factory" className="bg-gray-900">Factory / Manufacturing</option>
                  <option value="hotel" className="bg-gray-900">Hotel / Hospitality</option>
                  <option value="school" className="bg-gray-900">School / Education</option>
                  <option value="retail" className="bg-gray-900">Retail / Store</option>
                  <option value="hospital" className="bg-gray-900">Hospital / Healthcare</option>
                  <option value="construction" className="bg-gray-900">Construction / Infrastructure</option>
                  <option value="warehouse" className="bg-gray-900">Warehouse / Logistics</option>
                  <option value="restaurant" className="bg-gray-900">Restaurant / Food Service</option>
                  <option value="security" className="bg-gray-900">Security / Guard Services</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-1.5">Message</label>
                <textarea className="input bg-white/10 border-white/20 text-white placeholder-slate-500 focus:border-blue-400" rows={3} placeholder="Tell us about your site — number of workers, cameras, locations..." value={form.message} onChange={e => setForm({...form,message:e.target.value})} />
              </div>
              <button type="submit" disabled={status==='loading'} className="w-full bg-gradient-to-r from-blue-600 to-violet-600 text-white font-bold py-4 rounded-xl hover:opacity-90 transition-all shadow-2xl shadow-blue-900/40 text-base disabled:opacity-50">
                {status==='loading' ? 'Sending...' : 'Request Free Demo →'}
              </button>
            </form>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="py-10 px-4 bg-black border-t border-gray-900">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-violet-600 rounded-lg flex items-center justify-center text-white font-bold text-xs">SL</div>
              <span className="font-extrabold text-white tracking-tight">StaffLenz</span>
              <span className="text-gray-600 text-sm ml-2">© {new Date().getFullYear()}</span>
            </div>
            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
              <Link href="/industries/factory" className="hover:text-white transition-colors">Factory</Link>
              <Link href="/industries/hotel" className="hover:text-white transition-colors">Hotel</Link>
              <Link href="/industries/school" className="hover:text-white transition-colors">School</Link>
              <Link href="/industries/retail" className="hover:text-white transition-colors">Retail</Link>
              <Link href="/industries/hospital" className="hover:text-white transition-colors">Hospital</Link>
              <Link href="/industries/construction" className="hover:text-white transition-colors">Construction</Link>
              <Link href="/industries/warehouse" className="hover:text-white transition-colors">Warehouse</Link>
              <Link href="/industries/restaurant" className="hover:text-white transition-colors">Restaurant</Link>
              <Link href="/industries/security" className="hover:text-white transition-colors">Security</Link>
              <Link href="/blog" className="hover:text-white transition-colors">Blog</Link>
            </div>
            <div className="flex items-center gap-4 text-sm text-gray-500">
              <Link href="/login" className="hover:text-white transition-colors">Client Login</Link>
              <a href="mailto:support@stafflenz.com" className="hover:text-white transition-colors">support@stafflenz.com</a>
            </div>
          </div>
          <div className="mt-6 pt-6 border-t border-gray-900 text-center text-xs text-gray-600">
            Built for the world · AI-Powered by Claude Vision · Privacy-first workforce intelligence
          </div>
        </div>
      </footer>
    </div>
  );
}
