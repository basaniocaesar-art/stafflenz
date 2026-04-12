'use client';
import Link from 'next/link';

export default function IndustryPricing({ plans, accentColor = '#3b82f6', industryLabel }) {
  return (
    <section className="py-20 px-4 bg-white">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest px-4 py-1.5 rounded-full mb-4 border"
            style={{ color: accentColor, borderColor: accentColor + '40', background: accentColor + '12' }}>
            Pricing
          </div>
          <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 tracking-tight">
            Simple, transparent pricing<br />for {industryLabel}
          </h2>
          <p className="mt-3 text-gray-500 text-base max-w-xl mx-auto">
            All plans include unlimited AI scans, WhatsApp alerts, and live dashboard access. Cancel anytime.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative flex flex-col rounded-3xl border-2 p-7 transition-all duration-300 ${
                plan.highlight
                  ? 'shadow-2xl scale-[1.03]'
                  : 'border-gray-200 bg-white hover:shadow-xl hover:-translate-y-1'
              }`}
              style={plan.highlight ? { borderColor: accentColor, background: '#fff', boxShadow: `0 20px 60px ${accentColor}20` } : {}}
            >
              {plan.highlight && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 text-white text-xs font-bold px-5 py-1.5 rounded-full shadow-lg whitespace-nowrap"
                  style={{ background: `linear-gradient(135deg, ${accentColor}, ${accentColor}cc)` }}>
                  Most Popular
                </div>
              )}

              <div className="mb-5">
                <div className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-1">{plan.ideal}</div>
                <h3 className="text-2xl font-extrabold text-gray-900">{plan.name}</h3>
                <div className="mt-3 flex items-end gap-1">
                  <span className="text-4xl font-extrabold text-gray-900">${plan.price}</span>
                  <span className="text-gray-400 text-sm font-medium mb-1">/month</span>
                </div>
              </div>

              <ul className="space-y-2.5 mb-8 flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm text-gray-600">
                    <span className="mt-0.5 shrink-0 font-bold" style={{ color: accentColor }}>✓</span>
                    {f}
                  </li>
                ))}
              </ul>

              <Link
                href="/#contact"
                className="block text-center py-3.5 rounded-2xl text-sm font-bold transition-all"
                style={plan.highlight
                  ? { background: accentColor, color: '#fff' }
                  : { background: '#f3f4f6', color: '#374151' }}
              >
                Get Started →
              </Link>
            </div>
          ))}
        </div>

        <div className="mt-8 rounded-2xl border border-amber-200 bg-amber-50 px-6 py-4 text-center text-sm text-amber-800 max-w-2xl mx-auto">
          <span className="font-bold">Installation & hardware not included.</span> A one-time installation fee applies, quoted after a free site survey. Covers DVR/NVR setup, camera mounting, and system configuration.{' '}
          <Link href="/#contact" className="underline font-semibold hover:text-amber-900">Request a free quote →</Link>
        </div>
        <p className="text-center text-xs text-gray-400 mt-4">
          All prices in USD · Billed monthly · Need a custom quote? <Link href="/#contact" className="underline hover:text-gray-600">Contact us</Link>
        </p>
      </div>
    </section>
  );
}
