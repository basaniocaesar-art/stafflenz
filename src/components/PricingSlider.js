'use client';
import { useState } from 'react';
import Link from 'next/link';

const ALL_INDUSTRIES = [
  {
    id: 'factory', label: 'Factory', icon: '🏭', accent: '#f59e0b',
    plans: [
      { name: 'Starter', price: 79, ideal: 'Small plants', highlight: false, features: ['8 cameras (8-ch DVR)', 'Up to 10 workers', 'AI scan every 5 minutes', '3 frames per scan', 'PPE zone monitoring', 'WhatsApp alerts', 'Daily shift report'] },
      { name: 'Professional', price: 149, ideal: 'Mid-size operations', highlight: true, features: ['16 cameras (16-ch DVR)', 'Up to 30 workers', 'AI scan every 5 minutes', '5 frames per scan', 'Night shift monitoring', 'Zone-specific PPE rules', 'Contractor invoice audit', 'Weekly analytics report'] },
      { name: 'Enterprise', price: 299, ideal: 'Multi-site factories', highlight: false, features: ['32 cameras (32-ch DVR)', 'Up to 60 workers', 'AI scan every 2 minutes', '5 frames per scan', 'Multi-site dashboard', 'Custom alert rules', 'API access', 'Dedicated support'] },
      { name: 'Custom', price: 499, ideal: 'Resellers & large deployments', highlight: false, features: ['Unlimited cameras', 'Unlimited workers', 'Real-time 1-minute scans', '10 frames per scan', 'White-label branding', 'Client management portal', 'Priority support', 'Custom integrations'] },
    ],
  },
  {
    id: 'hotel', label: 'Hotel', icon: '🏨', accent: '#8b5cf6',
    plans: [
      { name: 'Starter', price: 89, ideal: 'Boutique hotels', highlight: false, features: ['8 cameras (8-ch DVR)', 'Up to 10 staff', 'AI scan every 5 minutes', '3 frames per scan', 'Reception & corridor alerts', 'WhatsApp alerts', 'Daily ops summary'] },
      { name: 'Professional', price: 169, ideal: 'Mid-size hotels', highlight: true, features: ['16 cameras (16-ch DVR)', 'Up to 30 staff', 'AI scan every 5 minutes', '5 frames per scan', 'Restaurant + banquet coverage', 'Cover ratio monitoring', 'Hygiene alerts', 'Daily ops report'] },
      { name: 'Enterprise', price: 329, ideal: 'Hotel chains', highlight: false, features: ['32 cameras (32-ch DVR)', 'Up to 60 staff', 'AI scan every 2 minutes', '5 frames per scan', 'Multi-property dashboard', 'Cross-property benchmarking', 'API access', 'Dedicated support'] },
      { name: 'Custom', price: 499, ideal: 'Resellers & large groups', highlight: false, features: ['Unlimited cameras', 'Unlimited staff', 'Real-time 1-minute scans', '10 frames per scan', 'White-label branding', 'Client management portal', 'Priority support', 'Custom integrations'] },
    ],
  },
  {
    id: 'school', label: 'School', icon: '🏫', accent: '#10b981',
    plans: [
      { name: 'Starter', price: 59, ideal: 'Small schools', highlight: false, features: ['8 cameras (corridors & common areas)', 'Up to 10 staff', 'AI scan every 5 minutes', '3 frames per scan', 'Unattended class alerts', 'WhatsApp alerts', 'Daily duty summary'] },
      { name: 'Professional', price: 119, ideal: 'Mid-size schools', highlight: true, features: ['16 cameras (corridors, canteen, gates)', 'Up to 30 staff', 'AI scan every 5 minutes', '5 frames per scan', 'Exam hall invigilation tracker', 'Canteen & gate duty alerts', 'Parent-safe reporting'] },
      { name: 'Enterprise', price: 229, ideal: 'School groups', highlight: false, features: ['32 cameras (32-ch DVR)', 'Up to 60 staff', 'AI scan every 2 minutes', '5 frames per scan', 'Multi-campus dashboard', 'Board-level compliance reports', 'API access', 'Dedicated support'] },
      { name: 'Custom', price: 399, ideal: 'Multi-school operators', highlight: false, features: ['Unlimited cameras', 'Unlimited staff', 'Real-time 1-minute scans', '10 frames per scan', 'White-label branding', 'Client management portal', 'Priority support', 'Custom integrations'] },
    ],
  },
  {
    id: 'retail', label: 'Retail', icon: '🛍️', accent: '#f43f5e',
    plans: [
      { name: 'Starter', price: 69, ideal: 'Small stores', highlight: false, features: ['8 cameras (8-ch DVR)', 'Up to 10 staff', 'AI scan every 5 minutes', '3 frames per scan', 'Section heatmap', 'WhatsApp alerts', 'Daily report'] },
      { name: 'Professional', price: 139, ideal: 'Mid-size stores', highlight: true, features: ['16 cameras (16-ch DVR)', 'Up to 30 staff', 'AI scan every 5 minutes', '5 frames per scan', 'Stock room access log', 'Loss prevention alerts', 'Weekly analytics'] },
      { name: 'Enterprise', price: 269, ideal: 'Retail chains', highlight: false, features: ['32 cameras (32-ch DVR)', 'Up to 60 staff', 'AI scan every 2 minutes', '5 frames per scan', 'Multi-store dashboard', 'Custom alert rules', 'API access', 'Dedicated support'] },
      { name: 'Custom', price: 499, ideal: 'Resellers & large chains', highlight: false, features: ['Unlimited cameras', 'Unlimited staff', 'Real-time 1-minute scans', '10 frames per scan', 'White-label branding', 'Client management portal', 'Priority support', 'Custom integrations'] },
    ],
  },
  {
    id: 'hospital', label: 'Hospital', icon: '🏥', accent: '#06b6d4',
    plans: [
      { name: 'Starter', price: 99, ideal: 'Small clinics', highlight: false, features: ['8 cameras (8-ch DVR)', 'Up to 10 clinical staff', 'AI scan every 5 minutes', '3 frames per scan', 'Nurse ratio alerts', 'WhatsApp alerts', 'Daily coverage report'] },
      { name: 'Professional', price: 199, ideal: 'Mid-size hospitals', highlight: true, features: ['16 cameras (16-ch DVR)', 'Up to 30 staff', 'AI scan every 5 minutes', '5 frames per scan', 'Restricted zone access log', 'Shift handover verification', 'PPE per ward type', 'Compliance audit export'] },
      { name: 'Enterprise', price: 399, ideal: 'Hospital groups', highlight: false, features: ['32 cameras (32-ch DVR)', 'Up to 60 staff', 'AI scan every 2 minutes', '5 frames per scan', 'Multi-facility dashboard', 'Accreditation-ready reports', 'API access', 'Dedicated support'] },
      { name: 'Custom', price: 699, ideal: 'Healthcare networks', highlight: false, features: ['Unlimited cameras', 'Unlimited staff', 'Real-time 1-minute scans', '10 frames per scan', 'White-label branding', 'Client management portal', 'Priority support', 'Custom integrations'] },
    ],
  },
  {
    id: 'construction', label: 'Construction', icon: '🏗️', accent: '#eab308',
    plans: [
      { name: 'Starter', price: 89, ideal: 'Single site', highlight: false, features: ['8 cameras (8-ch DVR)', 'Up to 10 workers', 'AI scan every 5 minutes', '3 frames per scan', 'PPE + muster check', 'WhatsApp alerts', 'Daily site report'] },
      { name: 'Professional', price: 179, ideal: 'Growing contractors', highlight: true, features: ['16 cameras (16-ch DVR)', 'Up to 30 workers', 'AI scan every 5 minutes', '5 frames per scan', 'Danger zone enforcement', 'After-hours security', 'Ghost worker detection', 'Contractor invoice audit'] },
      { name: 'Enterprise', price: 349, ideal: 'Large contractors', highlight: false, features: ['32 cameras (32-ch DVR)', 'Up to 60 workers', 'AI scan every 2 minutes', '5 frames per scan', 'Multi-project dashboard', 'Custom zone rules', 'API access', 'Dedicated support'] },
      { name: 'Custom', price: 499, ideal: 'Resellers & large firms', highlight: false, features: ['Unlimited cameras', 'Unlimited workers', 'Real-time 1-minute scans', '10 frames per scan', 'White-label branding', 'Client management portal', 'Priority support', 'Custom integrations'] },
    ],
  },
  {
    id: 'warehouse', label: 'Warehouse', icon: '📦', accent: '#6366f1',
    plans: [
      { name: 'Starter', price: 79, ideal: 'Small warehouses', highlight: false, features: ['8 cameras (8-ch DVR)', 'Up to 10 staff', 'AI scan every 5 minutes', '3 frames per scan', 'Bay coverage alerts', 'WhatsApp alerts', 'Daily ops report'] },
      { name: 'Professional', price: 159, ideal: 'Mid-size logistics', highlight: true, features: ['16 cameras (16-ch DVR)', 'Up to 30 staff', 'AI scan every 5 minutes', '5 frames per scan', 'Cold storage access log', 'Picker zone assignment', 'SLA breach alerts', 'Overtime verification'] },
      { name: 'Enterprise', price: 299, ideal: 'Multi-warehouse', highlight: false, features: ['32 cameras (32-ch DVR)', 'Up to 60 staff', 'AI scan every 2 minutes', '5 frames per scan', 'Multi-warehouse dashboard', 'Custom rules', 'API access', 'Dedicated support'] },
      { name: 'Custom', price: 499, ideal: 'Resellers & 3PL operators', highlight: false, features: ['Unlimited cameras', 'Unlimited staff', 'Real-time 1-minute scans', '10 frames per scan', 'White-label branding', 'Client management portal', 'Priority support', 'Custom integrations'] },
    ],
  },
  {
    id: 'restaurant', label: 'Restaurant', icon: '🍽️', accent: '#f97316',
    plans: [
      { name: 'Starter', price: 69, ideal: 'Single restaurant', highlight: false, features: ['8 cameras (8-ch DVR)', 'Up to 10 staff', 'AI scan every 5 minutes', '3 frames per scan', 'Hygiene PPE alerts', 'WhatsApp alerts', 'Service report'] },
      { name: 'Professional', price: 129, ideal: 'Restaurant groups', highlight: true, features: ['16 cameras (16-ch DVR)', 'Up to 30 staff', 'AI scan every 5 minutes', '5 frames per scan', 'Cover ratio monitoring', 'Break overlap alerts', 'Station coverage live', 'Food safety audit log'] },
      { name: 'Enterprise', price: 249, ideal: 'Chains & franchises', highlight: false, features: ['32 cameras (32-ch DVR)', 'Up to 60 staff', 'AI scan every 2 minutes', '5 frames per scan', 'Chain dashboard', 'Franchise benchmarking', 'API access', 'Dedicated support'] },
      { name: 'Custom', price: 499, ideal: 'Resellers & large chains', highlight: false, features: ['Unlimited cameras', 'Unlimited staff', 'Real-time 1-minute scans', '10 frames per scan', 'White-label branding', 'Client management portal', 'Priority support', 'Custom integrations'] },
    ],
  },
  {
    id: 'security', label: 'Security', icon: '🔒', accent: '#94a3b8',
    plans: [
      { name: 'Starter', price: 89, ideal: 'Small sites', highlight: false, features: ['8 cameras (8-ch DVR)', 'Up to 10 guards', 'AI scan every 5 minutes', '3 frames per scan', 'Post abandonment alerts', 'WhatsApp alerts', 'Daily patrol report'] },
      { name: 'Professional', price: 169, ideal: 'Security companies', highlight: true, features: ['16 cameras (16-ch DVR)', 'Up to 30 guards', 'AI scan every 5 minutes', '5 frames per scan', 'Patrol route verification', 'Shift handover log', 'Client SLA reports', 'Response time tracking'] },
      { name: 'Enterprise', price: 329, ideal: 'Multi-client operations', highlight: false, features: ['32 cameras (32-ch DVR)', 'Up to 60 guards', 'AI scan every 2 minutes', '5 frames per scan', 'Multi-client dashboard', 'API access', 'Custom patrol routes', 'Dedicated support'] },
      { name: 'Custom', price: 499, ideal: 'Resellers & large operators', highlight: false, features: ['Unlimited cameras', 'Unlimited guards', 'Real-time 1-minute scans', '10 frames per scan', 'White-label branding', 'Client management portal', 'Priority support', 'Custom integrations'] },
    ],
  },
  {
    id: 'gym', label: 'Gym', icon: '🏋️', accent: '#22c55e',
    plans: [
      { name: 'Starter', price: 69, ideal: 'Single gym', highlight: false, features: ['4 cameras (floor, weights, cardio, reception)', 'Up to 10 trainers', 'AI scan every 5 minutes', '3 frames per scan', 'Reception coverage alerts', 'WhatsApp alerts', 'Daily footfall summary'] },
      { name: 'Professional', price: 129, ideal: 'Mid-size gyms', highlight: true, features: ['8 cameras (full floor coverage)', 'Up to 25 trainers', 'AI scan every 5 minutes', '5 frames per scan', 'Trainer presence tracking', 'Peak hour footfall', 'Unattended equipment alerts', 'Weekly member activity report'] },
      { name: 'Enterprise', price: 249, ideal: 'Gym chains', highlight: false, features: ['16 cameras (multi-area)', 'Up to 60 trainers', 'AI scan every 2 minutes', '5 frames per scan', 'Multi-branch dashboard', 'Class attendance auto-count', 'API access', 'Dedicated support'] },
      { name: 'Custom', price: 449, ideal: 'Franchise & large chains', highlight: false, features: ['Unlimited cameras', 'Unlimited trainers', 'Real-time 1-minute scans', '10 frames per scan', 'White-label branding', 'Client management portal', 'Priority support', 'Custom integrations'] },
    ],
  },
];

export default function PricingSlider() {
  const [active, setActive] = useState(0);
  const ind = ALL_INDUSTRIES[active];

  function prev() { setActive(a => (a - 1 + ALL_INDUSTRIES.length) % ALL_INDUSTRIES.length); }
  function next() { setActive(a => (a + 1) % ALL_INDUSTRIES.length); }

  return (
    <section id="pricing" className="py-24 px-4 bg-white">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-10">
          <div className="section-label mb-4">Pricing</div>
          <h2 className="text-4xl font-extrabold text-gray-900 tracking-tight">Pricing for every industry.</h2>
          <p className="mt-3 text-gray-500 text-lg">Industry-specific plans. No hidden fees. Cancel anytime.</p>
        </div>

        {/* Industry tabs */}
        <div className="flex flex-wrap gap-2 justify-center mb-8">
          {ALL_INDUSTRIES.map((ind, i) => (
            <button
              key={ind.id}
              onClick={() => setActive(i)}
              className="text-xs font-bold px-4 py-2 rounded-full border transition-all"
              style={active === i
                ? { background: ind.accent, borderColor: ind.accent, color: '#fff', boxShadow: `0 4px 14px ${ind.accent}40` }
                : { borderColor: '#e5e7eb', color: '#6b7280', background: '#fff' }}
            >
              {ind.icon} {ind.label}
            </button>
          ))}
        </div>

        {/* Slider */}
        <div className="relative">
          {/* Left arrow */}
          <button
            onClick={prev}
            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-5 w-10 h-10 rounded-full bg-white border border-gray-200 shadow-lg flex items-center justify-center text-gray-600 hover:shadow-xl hover:text-gray-900 transition-all z-10 hidden sm:flex"
          >
            ‹
          </button>

          {/* Cards */}
          <div key={ind.id} className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {ind.plans.map((plan) => (
              <div
                key={plan.name}
                className={`relative flex flex-col rounded-3xl border-2 p-7 transition-all duration-300 bg-white ${
                  plan.highlight ? 'scale-[1.03] shadow-2xl' : 'border-gray-200 hover:shadow-xl hover:-translate-y-1'
                }`}
                style={plan.highlight
                  ? { borderColor: ind.accent, boxShadow: `0 20px 60px ${ind.accent}20` }
                  : {}}
              >
                {plan.highlight && (
                  <div
                    className="absolute -top-4 left-1/2 -translate-x-1/2 text-white text-xs font-bold px-5 py-1.5 rounded-full shadow-lg whitespace-nowrap"
                    style={{ background: ind.accent }}
                  >
                    Most Popular
                  </div>
                )}

                {/* Industry badge */}
                <div className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full w-fit mb-4"
                  style={{ background: ind.accent + '18', color: ind.accent }}>
                  {ind.icon} {ind.label}
                </div>

                <div className="mb-5">
                  <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-0.5">{plan.ideal}</div>
                  <h3 className="text-xl font-extrabold text-gray-900">{plan.name}</h3>
                  <div className="mt-2 flex items-end gap-1">
                    <span className="text-4xl font-extrabold text-gray-900">${plan.price}</span>
                    <span className="text-gray-400 text-sm font-medium mb-1">/mo</span>
                  </div>
                </div>

                <ul className="space-y-2 mb-8 flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-gray-600">
                      <span className="shrink-0 font-bold mt-0.5" style={{ color: ind.accent }}>✓</span>
                      {f}
                    </li>
                  ))}
                </ul>

                <Link
                  href="/#contact"
                  className="block text-center py-3 rounded-2xl text-sm font-bold transition-all"
                  style={plan.highlight
                    ? { background: ind.accent, color: '#fff' }
                    : { background: '#f3f4f6', color: '#374151' }}
                >
                  Get Started →
                </Link>
              </div>
            ))}
          </div>

          {/* Right arrow */}
          <button
            onClick={next}
            className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-5 w-10 h-10 rounded-full bg-white border border-gray-200 shadow-lg flex items-center justify-center text-gray-600 hover:shadow-xl hover:text-gray-900 transition-all z-10 hidden sm:flex"
          >
            ›
          </button>
        </div>

        {/* Mobile prev/next */}
        <div className="flex items-center justify-center gap-4 mt-6 sm:hidden">
          <button onClick={prev} className="px-4 py-2 bg-gray-100 rounded-xl font-semibold text-sm text-gray-600">← Prev</button>
          <span className="text-sm text-gray-400">{active + 1} / {ALL_INDUSTRIES.length}</span>
          <button onClick={next} className="px-4 py-2 bg-gray-100 rounded-xl font-semibold text-sm text-gray-600">Next →</button>
        </div>

        {/* Dots */}
        <div className="flex justify-center gap-2 mt-6">
          {ALL_INDUSTRIES.map((ind, i) => (
            <button
              key={ind.id}
              onClick={() => setActive(i)}
              className="w-2 h-2 rounded-full transition-all"
              style={{ background: active === i ? ind.accent : '#d1d5db', transform: active === i ? 'scale(1.4)' : 'scale(1)' }}
            />
          ))}
        </div>

        <div className="mt-8 rounded-2xl border border-amber-200 bg-amber-50 px-6 py-4 text-center text-sm text-amber-800 max-w-2xl mx-auto">
          <span className="font-bold">Installation & hardware not included.</span> A one-time fee applies for DVR/NVR setup, camera mounting, and configuration — quoted after a free site survey.{' '}
          <Link href="/#contact" className="underline font-semibold hover:text-amber-900">Get a free quote →</Link>
        </div>
        <p className="text-center text-xs text-gray-400 mt-4">
          All prices in USD · Monthly billing · <Link href="/#contact" className="underline hover:text-gray-600">Need a custom quote?</Link>
        </p>
      </div>
    </section>
  );
}
