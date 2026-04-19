import Link from 'next/link';

// Reusable landing page for every industry. Takes one config object from
// src/data/industries.js. Styling matches the main marketing site.

export default function IndustryLandingPage({ industry }) {
  const i = industry;
  if (!i) return null;

  return (
    <main className="min-h-screen bg-white text-gray-900">
      {/* ─── Hero ─────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden" style={{ background: `linear-gradient(135deg, ${i.accent}0f 0%, ${i.accentDark}14 100%)` }}>
        <div className="max-w-6xl mx-auto px-4 py-20 md:py-28">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-6"
               style={{ background: `${i.accent}20`, color: i.accentDark }}>
            <span className="text-lg">{i.icon}</span>
            {i.name}
          </div>
          <h1 className="text-4xl md:text-6xl font-extrabold leading-tight tracking-tight max-w-4xl">
            {i.hero.headline}
          </h1>
          <p className="mt-6 text-lg md:text-xl text-gray-600 max-w-3xl leading-relaxed">
            {i.hero.subheadline}
          </p>
          <div className="mt-10 flex flex-wrap gap-3">
            <Link
              href="/#contact"
              className="inline-flex items-center gap-2 px-7 py-4 rounded-xl text-white font-bold text-base shadow-xl transition-all hover:opacity-90"
              style={{ background: `linear-gradient(135deg, ${i.accent} 0%, ${i.accentDark} 100%)`, boxShadow: `0 20px 40px ${i.accent}40` }}
            >
              Book a Demo →
            </Link>
            <Link
              href="#pricing"
              className="inline-flex items-center gap-2 px-7 py-4 rounded-xl bg-white border-2 border-gray-200 font-bold text-base hover:border-gray-300 transition-all"
            >
              See pricing
            </Link>
          </div>
          <div className="mt-6 text-xs text-gray-500 flex flex-wrap gap-4">
            <span>✓ Works with your existing CCTV</span>
            <span>✓ No new cameras needed</span>
            <span>✓ Setup in 20 minutes</span>
          </div>
        </div>
      </section>

      {/* ─── Pain points ──────────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-4 py-16 md:py-24">
        <div className="text-center mb-12">
          <div className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: i.accentDark }}>
            What you&apos;re dealing with today
          </div>
          <h2 className="text-3xl md:text-4xl font-extrabold">Sound familiar?</h2>
        </div>
        <div className="grid md:grid-cols-2 gap-4 max-w-4xl mx-auto">
          {i.pains.map((pain, idx) => (
            <div key={idx} className="flex items-start gap-3 p-5 rounded-2xl bg-red-50 border border-red-100">
              <span className="text-xl">😓</span>
              <p className="text-gray-800">{pain}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── ROI scenarios ────────────────────────────────────────────── */}
      <section className="bg-gray-50 py-16 md:py-24">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-12">
            <div className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: i.accentDark }}>
              Real numbers
            </div>
            <h2 className="text-3xl md:text-4xl font-extrabold">ROI that pays for itself in weeks</h2>
            <p className="mt-3 text-gray-600 max-w-2xl mx-auto">
              Three concrete scenarios showing how LenzAI saves more than it costs.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {i.roi_scenarios.map((s, idx) => (
              <div key={idx} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200 flex flex-col">
                <div className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: i.accentDark }}>
                  {s.label}
                </div>
                <div className="mb-4">
                  <div className="text-sm text-gray-500 mb-1">The problem</div>
                  <p className="text-gray-900">{s.problem}</p>
                </div>
                <div className="mb-4">
                  <div className="text-sm text-gray-500 mb-1">What it costs you</div>
                  <p className="font-bold text-red-600">{s.cost}</p>
                </div>
                <div className="mb-4">
                  <div className="text-sm text-gray-500 mb-1">What LenzAI does</div>
                  <p className="text-gray-900">{s.solution}</p>
                </div>
                <div className="mt-auto pt-4 border-t border-gray-100">
                  <div className="text-sm text-gray-500 mb-1">Net value</div>
                  <p className="font-bold text-green-700">{s.net_value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Features ─────────────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-4 py-16 md:py-24">
        <div className="text-center mb-12">
          <div className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: i.accentDark }}>
            Built specifically for {i.name.toLowerCase()}
          </div>
          <h2 className="text-3xl md:text-4xl font-extrabold">What you get</h2>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {i.features.map((f, idx) => (
            <div key={idx} className="p-6 rounded-2xl border border-gray-200 hover:border-gray-300 hover:shadow-md transition-all">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4" style={{ background: `${i.accent}20`, color: i.accentDark }}>
                <span className="text-xl font-bold">{idx + 1}</span>
              </div>
              <h3 className="font-bold text-gray-900 mb-2">{f.title}</h3>
              <p className="text-sm text-gray-600 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Who this is for ──────────────────────────────────────────── */}
      <section className="bg-gray-50 py-16 md:py-24">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <div className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: i.accentDark }}>
            Who buys LenzAI
          </div>
          <h2 className="text-3xl md:text-4xl font-extrabold mb-8">Is this you?</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="p-6 bg-white rounded-2xl shadow-sm border border-gray-200">
              <div className="text-sm font-semibold text-gray-500 mb-2">Typical site</div>
              <p className="text-gray-900 font-medium">{i.typical_size}</p>
            </div>
            <div className="p-6 bg-white rounded-2xl shadow-sm border border-gray-200">
              <div className="text-sm font-semibold text-gray-500 mb-2">Typical buyer</div>
              <p className="text-gray-900 font-medium">{i.buyers}</p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Recommended plan ─────────────────────────────────────────── */}
      <section className="max-w-4xl mx-auto px-4 py-16 md:py-24 text-center">
        <div className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: i.accentDark }}>
          Recommended plan
        </div>
        <h2 className="text-3xl md:text-4xl font-extrabold mb-8">Start with what fits</h2>
        <div className="inline-block text-left bg-white rounded-3xl shadow-xl p-8 border-2" style={{ borderColor: i.accent }}>
          <div className="flex items-center gap-3 mb-3">
            <span className="text-xs font-bold px-2 py-1 rounded-full uppercase tracking-wider" style={{ background: `${i.accent}20`, color: i.accentDark }}>
              Best for {i.name}
            </span>
          </div>
          <div className="text-2xl font-extrabold capitalize mb-1">{i.recommended_plan} plan</div>
          <p className="text-gray-600 mb-6">
            Includes all the {i.name.toLowerCase()}-specific features above. If you grow, upgrade to <span className="font-semibold capitalize">{i.upsell_plan}</span> any time.
          </p>
          <Link
            href={`/signup?industry=${i.db_industry}&plan=${i.recommended_plan}`}
            className="inline-flex items-center gap-2 px-8 py-4 rounded-xl text-white font-bold shadow-xl transition-all hover:opacity-90"
            style={{ background: `linear-gradient(135deg, ${i.accent} 0%, ${i.accentDark} 100%)` }}
          >
            Book a Demo →
          </Link>
          <div className="mt-4 text-xs text-gray-500">No credit card · Cancel anytime</div>
        </div>
      </section>

      {/* ─── Final CTA ───────────────────────────────────────────────── */}
      <section className="py-16 md:py-24" style={{ background: `linear-gradient(135deg, ${i.accent} 0%, ${i.accentDark} 100%)` }}>
        <div className="max-w-4xl mx-auto px-4 text-center text-white">
          <h2 className="text-3xl md:text-5xl font-extrabold mb-4">
            See it running on your CCTV in 20 minutes
          </h2>
          <p className="text-lg md:text-xl opacity-90 mb-8">
            No new cameras. No rewiring. Just your existing DVR and our LenzAI device.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link
              href={`/signup?industry=${i.db_industry}&plan=${i.recommended_plan}`}
              className="inline-flex items-center gap-2 px-8 py-4 bg-white text-gray-900 rounded-xl font-bold shadow-xl hover:shadow-2xl transition-all"
            >
              Book a Demo →
            </Link>
            <Link
              href="/industries"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-xl border-2 border-white/40 text-white font-bold hover:bg-white/10 transition-all"
            >
              Compare industries
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
