'use client';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { POSTS } from '../posts';

const CATEGORY_COLORS = {
  'Workforce Intelligence': 'bg-blue-100 text-blue-700',
  'Industry Insights': 'bg-violet-100 text-violet-700',
  'AI & Technology': 'bg-emerald-100 text-emerald-700',
  'Cost Savings': 'bg-amber-100 text-amber-700',
  'Safety & Compliance': 'bg-red-100 text-red-700',
};

const NAV_INDUSTRIES = [
  { href: '/industries/factory', label: '🏭 Factory' },
  { href: '/industries/hotel', label: '🏨 Hotel' },
  { href: '/industries/school', label: '🏫 School' },
  { href: '/industries/retail', label: '🛍️ Retail' },
  { href: '/industries/hospital', label: '🏥 Hospital' },
  { href: '/industries/construction', label: '🏗️ Build' },
  { href: '/industries/warehouse', label: '📦 Warehouse' },
  { href: '/industries/restaurant', label: '🍽️ Restaurant' },
  { href: '/industries/security', label: '🔒 Security' },
];

function Navbar() {
  return (
    <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-xl border-b border-gray-100 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-9 h-9 bg-gradient-to-br from-blue-600 to-violet-600 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-blue-200">
            SL
          </div>
          <span className="font-extrabold text-xl text-gray-900 tracking-tight">LenzAI</span>
        </Link>

        <div className="hidden md:flex items-center gap-6 text-sm font-medium text-gray-500">
          <div className="relative group">
            <button className="flex items-center gap-1 hover:text-gray-900 transition-colors py-2">
              Industries <span className="text-xs opacity-60">▾</span>
            </button>
            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-72 bg-white rounded-2xl shadow-xl border border-gray-100 p-3 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 grid grid-cols-3 gap-1">
              {NAV_INDUSTRIES.map(({ href, label }) => (
                <Link
                  key={href}
                  href={href}
                  className="flex items-center gap-1 text-xs font-medium text-gray-600 hover:text-gray-900 px-2 py-1.5 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  {label}
                </Link>
              ))}
            </div>
          </div>
          <Link href="/blog" className="text-blue-600 font-semibold">Blog</Link>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/blog#write" className="hidden sm:block text-sm font-semibold text-gray-500 hover:text-gray-800 transition-colors">
            Write for Us
          </Link>
          <Link
            href="/#contact"
            className="text-sm font-bold px-5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 text-white hover:from-blue-700 hover:to-violet-700 transition-all shadow-md shadow-blue-200"
          >
            Try LenzAI →
          </Link>
        </div>
      </div>
    </nav>
  );
}

function Footer() {
  return (
    <footer className="bg-gray-950 border-t border-gray-900 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8 mb-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-violet-600 rounded-lg flex items-center justify-center text-white font-bold text-xs">
                SL
              </div>
              <span className="font-extrabold text-white text-lg">LenzAI</span>
            </div>
            <p className="text-sm text-gray-500 max-w-xs">
              AI-powered workforce intelligence. Real-time alerts. No new cameras.
            </p>
          </div>
          <div className="flex flex-wrap gap-x-8 gap-y-2 text-sm text-gray-500">
            <Link href="/" className="hover:text-white transition-colors">Home</Link>
            <Link href="/#pricing" className="hover:text-white transition-colors">Pricing</Link>
            <Link href="/blog" className="hover:text-white transition-colors">Blog</Link>
            <Link href="/industries/factory" className="hover:text-white transition-colors">Factory</Link>
            <Link href="/industries/hotel" className="hover:text-white transition-colors">Hotel</Link>
            <Link href="/industries/school" className="hover:text-white transition-colors">School</Link>
            <Link href="/industries/retail" className="hover:text-white transition-colors">Retail</Link>
            <Link href="/industries/hospital" className="hover:text-white transition-colors">Hospital</Link>
            <Link href="/industries/construction" className="hover:text-white transition-colors">Construction</Link>
            <Link href="/industries/warehouse" className="hover:text-white transition-colors">Warehouse</Link>
            <Link href="/industries/restaurant" className="hover:text-white transition-colors">Restaurant</Link>
            <Link href="/industries/security" className="hover:text-white transition-colors">Security</Link>
          </div>
        </div>
        <div className="border-t border-gray-800 pt-6 text-center text-xs text-gray-600">
          © {new Date().getFullYear()} LenzAI · AI-Powered Workforce Intelligence
        </div>
      </div>
    </footer>
  );
}

export default function BlogPostPage() {
  const { slug } = useParams();
  const post = POSTS.find((p) => p.slug === slug);

  if (!post) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-2xl mx-auto px-4 py-32 text-center">
          <div className="text-6xl mb-6">404</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-3">Article not found</h1>
          <p className="text-gray-500 mb-8">
            The article you are looking for doesn't exist or may have been moved.
          </p>
          <Link
            href="/blog"
            className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-violet-600 text-white font-bold px-6 py-3 rounded-xl hover:from-blue-700 hover:to-violet-700 transition-all"
          >
            ← Back to Blog
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  const relatedPosts = POSTS.filter((p) => p.slug !== slug).slice(0, 4);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
        <div className="flex gap-10 items-start">

          {/* Main article */}
          <article className="flex-1 min-w-0">
            {/* Back link */}
            <Link
              href="/blog"
              className="inline-flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-gray-800 transition-colors mb-8 group"
            >
              <svg className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Blog
            </Link>

            {/* Meta row */}
            <div className="flex flex-wrap items-center gap-3 mb-5">
              <span className={`text-xs font-bold px-3 py-1.5 rounded-full ${CATEGORY_COLORS[post.category] || 'bg-gray-100 text-gray-600'}`}>
                {post.category}
              </span>
              {post.industry && (
                <span className="text-xs font-medium px-3 py-1.5 rounded-full bg-gray-100 text-gray-500">
                  {post.industry}
                </span>
              )}
              <span className="text-sm text-gray-400">{post.date}</span>
              <span className="text-sm text-gray-400">·</span>
              <span className="text-sm text-gray-400">{post.readTime}</span>
            </div>

            {/* Title */}
            <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 leading-tight tracking-tight mb-6">
              {post.title}
            </h1>

            {/* Hero image */}
            {post.image && (
              <div className="w-full h-64 md:h-80 rounded-2xl overflow-hidden mb-8 bg-gray-100">
                <img src={post.image} alt={post.title} className="w-full h-full object-cover" />
              </div>
            )}

            {/* Divider */}
            <div className="h-px bg-gradient-to-r from-blue-200 via-violet-200 to-transparent mb-8" />

            {/* Content */}
            <div className="max-w-3xl">
              {post.content.map((paragraph, i) => (
                <p key={i} className="mb-6 text-gray-700 leading-relaxed text-[1.0625rem]">
                  {paragraph}
                </p>
              ))}
            </div>

            {/* Bottom CTA */}
            <div className="mt-14 max-w-3xl rounded-2xl overflow-hidden bg-gradient-to-br from-gray-900 via-blue-950 to-violet-950 border border-blue-900/40 p-8 md:p-10">
              <div className="inline-flex items-center gap-2 bg-blue-500/20 border border-blue-400/30 rounded-full px-4 py-1.5 text-xs font-bold text-blue-300 mb-4">
                Live Demo Available
              </div>
              <h2 className="text-2xl md:text-3xl font-extrabold text-white mb-3 leading-snug">
                See LenzAI in Action
              </h2>
              <p className="text-gray-400 mb-7 leading-relaxed max-w-lg">
                Connect your existing CCTV cameras and get real-time AI alerts for attendance issues, PPE violations, and coverage gaps — within 48 hours of setup. No new hardware required.
              </p>
              <div className="flex flex-wrap gap-3">
                <Link
                  href="/#contact"
                  className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-violet-600 text-white font-bold px-6 py-3 rounded-xl hover:from-blue-700 hover:to-violet-700 transition-all shadow-lg shadow-blue-900/40 text-sm"
                >
                  Book a Free Demo
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </Link>
                <Link
                  href="/#pricing"
                  className="inline-flex items-center gap-2 bg-white/10 border border-white/20 text-white font-semibold px-6 py-3 rounded-xl hover:bg-white/20 transition-all text-sm"
                >
                  View Pricing
                </Link>
              </div>
            </div>
          </article>

          {/* Sidebar */}
          <aside className="hidden lg:block w-72 shrink-0">
            <div className="sticky top-24">
              <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100">
                  <h3 className="text-sm font-bold text-gray-900">More Articles</h3>
                </div>
                <div className="divide-y divide-gray-100">
                  {relatedPosts.map((related) => (
                    <Link
                      key={related.slug}
                      href={`/blog/${related.slug}`}
                      className="block px-5 py-4 hover:bg-gray-50 transition-colors group"
                    >
                      <div className="mb-1.5">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${CATEGORY_COLORS[related.category] || 'bg-gray-100 text-gray-600'}`}>
                          {related.category}
                        </span>
                      </div>
                      <h4 className="text-sm font-semibold text-gray-800 leading-snug group-hover:text-blue-600 transition-colors line-clamp-2">
                        {related.title}
                      </h4>
                      <p className="text-xs text-gray-400 mt-1.5">{related.readTime}</p>
                    </Link>
                  ))}
                </div>
                <div className="px-5 py-4 border-t border-gray-100">
                  <Link
                    href="/blog"
                    className="text-sm font-semibold text-blue-600 hover:text-blue-700 transition-colors"
                  >
                    View all articles →
                  </Link>
                </div>
              </div>

              {/* Mini CTA */}
              <div className="mt-4 bg-gradient-to-br from-blue-600 to-violet-600 rounded-2xl p-5 text-white">
                <div className="text-sm font-bold mb-1.5">Get real-time workforce alerts</div>
                <p className="text-xs text-blue-100 mb-4 leading-relaxed">
                  WhatsApp alerts when coverage gaps, PPE violations, or ghost worker anomalies are detected.
                </p>
                <Link
                  href="/#contact"
                  className="block text-center text-xs font-bold bg-white text-blue-700 rounded-xl px-4 py-2.5 hover:bg-blue-50 transition-colors"
                >
                  Book Free Demo
                </Link>
              </div>
            </div>
          </aside>
        </div>
      </div>

      <Footer />
    </div>
  );
}
