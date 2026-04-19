import Link from 'next/link';
import { INDUSTRIES } from '@/data/industries';

export const metadata = {
  title: 'Industries — LenzAI',
  description: 'Pick your industry. Each gets a pack of alert rules, zone templates, and reports built specifically for that vertical.',
};

export default function IndustriesHub() {
  return (
    <main className="min-h-screen bg-white text-gray-900">
      {/* Hero */}
      <section className="bg-gradient-to-br from-indigo-50 via-white to-purple-50 py-16 md:py-24">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <div className="text-xs font-bold uppercase tracking-wider text-indigo-600 mb-3">
            Industries we serve
          </div>
          <h1 className="text-4xl md:text-6xl font-extrabold leading-tight mb-6">
            Built for your vertical, not a generic dashboard.
          </h1>
          <p className="text-lg md:text-xl text-gray-600 max-w-3xl mx-auto">
            Each industry gets its own pack of alert rules, zone templates, compliance reports,
            and an opinionated default setup. Pick yours and sign up in under 5 minutes.
          </p>
        </div>
      </section>

      {/* Grid of industry cards */}
      <section className="max-w-6xl mx-auto px-4 py-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {INDUSTRIES.map((i) => (
            <Link
              key={i.slug}
              href={`/industries/${i.slug}`}
              className="group relative bg-white rounded-2xl p-6 border border-gray-200 hover:border-gray-300 hover:shadow-xl transition-all overflow-hidden"
            >
              <div
                className="absolute top-0 right-0 w-32 h-32 rounded-full opacity-10 -translate-y-10 translate-x-10 group-hover:scale-125 transition-transform"
                style={{ background: i.accent }}
              />
              <div className="relative">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl mb-4"
                     style={{ background: `${i.accent}20` }}>
                  {i.icon}
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">{i.name}</h3>
                <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                  {i.hero.headline}
                </p>
                <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                  <span className="text-xs text-gray-500">From ₹4,999/mo</span>
                  <span className="text-sm font-semibold" style={{ color: i.accentDark }}>
                    See details →
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-4xl mx-auto px-4 py-16 text-center">
        <h2 className="text-3xl md:text-4xl font-extrabold mb-4">
          Not sure which fits?
        </h2>
        <p className="text-gray-600 mb-8">
          Tell us your industry and we'll configure everything for you.
        </p>
        <Link
          href="/#contact"
          className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-blue-600 to-violet-600 text-white font-bold rounded-xl shadow-xl hover:opacity-90 transition-all"
        >
          Book a Demo →
        </Link>
      </section>
    </main>
  );
}
