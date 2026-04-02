'use client';
import { useState } from 'react';
import Link from 'next/link';

const industries = [
  { id: 'factory', label: 'Factory', icon: '🏭', desc: 'Monitor production lines, PPE compliance, zone access control, and shift attendance.' },
  { id: 'hotel', label: 'Hotel', icon: '🏨', desc: 'Track housekeeping staff, front-desk attendance, service area coverage, and shift changes.' },
  { id: 'school', label: 'School', icon: '🏫', desc: 'Monitor teaching staff attendance, campus zone activity, and duty schedules.' },
  { id: 'retail', label: 'Retail', icon: '🛍️', desc: 'Track floor staff coverage, inventory area access, shift compliance, and peak-hour monitoring.' },
];

const features = [
  { icon: '📹', title: 'CCTV Integration', desc: 'Works with any existing DVR/NVR. A Raspberry Pi at your site does the heavy lifting.' },
  { icon: '🤖', title: 'AI Recognition', desc: 'Claude Vision API identifies workers, activities, and compliance from camera frames every 5 minutes.' },
  { icon: '⚡', title: 'Real-Time Alerts', desc: 'Instant alerts for zone violations, missing PPE, and attendance anomalies.' },
  { icon: '📊', title: 'Rich Reports', desc: 'Daily summaries, weekly trends, and exportable attendance reports.' },
  { icon: '🔒', title: 'Privacy First', desc: 'Frames are processed and discarded. Only structured data is stored — never raw video.' },
  { icon: '📱', title: 'Any Device', desc: 'Responsive dashboard accessible from any browser, desktop or mobile.' },
];

const plans = [
  { name: 'Starter', workers: 15, cameras: 4, price: 5000, color: 'border-gray-200', highlight: false },
  { name: 'Standard', workers: 50, cameras: 8, price: 8000, color: 'border-blue-500', highlight: true },
  { name: 'Pro', workers: 150, cameras: 16, price: 14000, color: 'border-gray-200', highlight: false },
  { name: 'Enterprise', workers: 999, cameras: 64, price: 22000, color: 'border-gray-200', highlight: false },
];

export default function HomePage() {
  const [form, setForm] = useState({ name: '', email: '', phone: '', company: '', industry: '', message: '' });
  const [status, setStatus] = useState('idle'); // idle | loading | success | error

  async function handleSubmit(e) {
    e.preventDefault();
    setStatus('loading');
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (res.ok) {
        setStatus('success');
        setForm({ name: '', email: '', phone: '', company: '', industry: '', message: '' });
      } else {
        setStatus('error');
        alert(data.error || 'Something went wrong');
        setStatus('idle');
      }
    } catch {
      setStatus('error');
      alert('Network error. Please try again.');
      setStatus('idle');
    }
  }

  return (
    <div className="min-h-screen">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">SL</div>
            <span className="font-bold text-lg text-gray-900">StaffLenz</span>
          </div>
          <div className="hidden md:flex items-center gap-6 text-sm font-medium text-gray-600">
            <a href="#features" className="hover:text-blue-600 transition-colors">Features</a>
            <a href="#industries" className="hover:text-blue-600 transition-colors">Industries</a>
            <a href="#pricing" className="hover:text-blue-600 transition-colors">Pricing</a>
            <a href="#contact" className="hover:text-blue-600 transition-colors">Contact</a>
          </div>
          <Link href="/login" className="btn-primary text-sm">Login</Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative bg-gradient-to-br from-blue-900 via-blue-800 to-blue-600 text-white py-24 px-4">
        <div className="max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-blue-700/50 rounded-full px-4 py-1.5 text-sm mb-6">
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
            Live monitoring for Indian enterprises
          </div>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold mb-6 leading-tight">
            AI-Powered Workforce<br />Intelligence Platform
          </h1>
          <p className="text-xl text-blue-100 mb-10 max-w-3xl mx-auto">
            Connect your existing CCTV to StaffLenz. Our Raspberry Pi device analyses camera feeds every 5 minutes using Claude AI — giving you real-time attendance, safety alerts, and workforce insights.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <a href="#contact" className="btn-primary bg-white text-blue-700 hover:bg-blue-50 text-base px-8 py-3">
              Book a Free Demo
            </a>
            <a href="#features" className="btn-secondary bg-transparent text-white border-white/40 hover:bg-white/10 text-base px-8 py-3">
              See How It Works
            </a>
          </div>
          <div className="mt-12 grid grid-cols-3 gap-8 max-w-lg mx-auto">
            {[['500+', 'Sites Monitored'], ['99.9%', 'Uptime SLA'], ['5 min', 'Scan Interval']].map(([n, l]) => (
              <div key={l}>
                <div className="text-2xl font-bold">{n}</div>
                <div className="text-sm text-blue-200">{l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Industries */}
      <section id="industries" className="py-20 px-4 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900">Built for Your Industry</h2>
            <p className="mt-3 text-gray-600">Customised dashboards and AI models for each sector.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {industries.map((ind) => (
              <div key={ind.id} className="card p-6 hover:shadow-md transition-shadow">
                <div className="text-4xl mb-3">{ind.icon}</div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{ind.label}</h3>
                <p className="text-sm text-gray-600">{ind.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900">How StaffLenz Works</h2>
          </div>
          <div className="grid md:grid-cols-4 gap-0 relative">
            <div className="hidden md:block absolute top-8 left-1/8 right-1/8 h-0.5 bg-blue-200"></div>
            {[
              { step: '1', title: 'Install Pi Device', desc: 'Our Raspberry Pi connects to your existing CCTV DVR via LAN — no rewiring needed.' },
              { step: '2', title: 'Enrol Workers', desc: 'Upload one photo per worker in the StaffLenz dashboard. Done in minutes.' },
              { step: '3', title: 'AI Scans 24/7', desc: 'Every 5 minutes, Claude Vision identifies faces, activities, and zones.' },
              { step: '4', title: 'See Insights', desc: 'Your dashboard shows live status, attendance, alerts, and weekly reports.' },
            ].map((s) => (
              <div key={s.step} className="relative flex flex-col items-center text-center p-6">
                <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center text-white text-2xl font-bold mb-4 z-10">
                  {s.step}
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">{s.title}</h3>
                <p className="text-sm text-gray-600">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 px-4 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900">Everything You Need</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f) => (
              <div key={f.title} className="card p-6">
                <div className="text-3xl mb-3">{f.icon}</div>
                <h3 className="text-base font-semibold text-gray-900 mb-2">{f.title}</h3>
                <p className="text-sm text-gray-600">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900">Simple, Transparent Pricing</h2>
            <p className="mt-3 text-gray-600">All plans include unlimited scan events, reports, and 24/7 support.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {plans.map((plan) => (
              <div key={plan.name} className={`card p-6 border-2 ${plan.color} ${plan.highlight ? 'ring-2 ring-blue-500 ring-offset-2' : ''} relative`}>
                {plan.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-xs font-medium px-3 py-1 rounded-full">
                    Most Popular
                  </div>
                )}
                <h3 className="text-lg font-bold text-gray-900 mb-1">{plan.name}</h3>
                <div className="text-3xl font-extrabold text-gray-900 mb-1">
                  ₹{plan.price.toLocaleString('en-IN')}
                  <span className="text-base font-normal text-gray-500">/mo</span>
                </div>
                <ul className="mt-4 space-y-2 text-sm text-gray-600">
                  <li className="flex items-center gap-2"><span className="text-green-500">✓</span> {plan.workers} workers</li>
                  <li className="flex items-center gap-2"><span className="text-green-500">✓</span> {plan.cameras} cameras</li>
                  <li className="flex items-center gap-2"><span className="text-green-500">✓</span> All 4 industries</li>
                  <li className="flex items-center gap-2"><span className="text-green-500">✓</span> Unlimited events</li>
                  <li className="flex items-center gap-2"><span className="text-green-500">✓</span> Email alerts</li>
                </ul>
                <a href="#contact" className={`mt-6 block text-center py-2 rounded-lg text-sm font-medium transition-colors ${plan.highlight ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                  Get Started
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact / Demo booking */}
      <section id="contact" className="py-20 px-4 bg-blue-900 text-white">
        <div className="max-w-xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold">Book a Free Demo</h2>
            <p className="mt-3 text-blue-200">We will set up a live demo at your site within 48 hours.</p>
          </div>
          {status === 'success' ? (
            <div className="text-center py-12">
              <div className="text-5xl mb-4">✅</div>
              <h3 className="text-xl font-semibold">Thank you!</h3>
              <p className="text-blue-200 mt-2">We will reach you within 24 hours to schedule your demo.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-blue-100 mb-1">Name *</label>
                  <input className="input bg-blue-800/50 border-blue-700 text-white placeholder-blue-400 focus:border-white" placeholder="Your name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-blue-100 mb-1">Email *</label>
                  <input type="email" className="input bg-blue-800/50 border-blue-700 text-white placeholder-blue-400 focus:border-white" placeholder="you@company.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-blue-100 mb-1">Phone</label>
                  <input type="tel" className="input bg-blue-800/50 border-blue-700 text-white placeholder-blue-400 focus:border-white" placeholder="+91 98765 43210" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-blue-100 mb-1">Company</label>
                  <input className="input bg-blue-800/50 border-blue-700 text-white placeholder-blue-400 focus:border-white" placeholder="Company name" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-blue-100 mb-1">Industry</label>
                <select className="input bg-blue-800/50 border-blue-700 text-white focus:border-white" value={form.industry} onChange={(e) => setForm({ ...form, industry: e.target.value })}>
                  <option value="">Select your industry</option>
                  <option value="factory">Factory / Manufacturing</option>
                  <option value="hotel">Hotel / Hospitality</option>
                  <option value="school">School / Education</option>
                  <option value="retail">Retail / Store</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-blue-100 mb-1">Message</label>
                <textarea className="input bg-blue-800/50 border-blue-700 text-white placeholder-blue-400 focus:border-white" rows={3} placeholder="Tell us about your site — number of workers, cameras, etc." value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} />
              </div>
              <button type="submit" className="btn-primary w-full bg-white text-blue-700 hover:bg-blue-50 py-3 text-base" disabled={status === 'loading'}>
                {status === 'loading' ? 'Sending...' : 'Book Free Demo →'}
              </button>
            </form>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 border-t border-gray-200 text-center text-sm text-gray-500">
        <div className="flex items-center justify-center gap-2 mb-2">
          <div className="w-6 h-6 bg-blue-600 rounded flex items-center justify-center text-white font-bold text-xs">SL</div>
          <span className="font-semibold text-gray-700">StaffLenz</span>
        </div>
        <p>© {new Date().getFullYear()} StaffLenz. All rights reserved. Made in Kerala, India.</p>
        <p className="mt-1">
          <Link href="/login" className="text-blue-600 hover:underline">Client Login</Link>
          {' · '}
          <a href="mailto:support@stafflenz.com" className="text-blue-600 hover:underline">support@stafflenz.com</a>
        </p>
      </footer>
    </div>
  );
}
