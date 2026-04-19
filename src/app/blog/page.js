'use client';
import Link from 'next/link';
import { useState } from 'react';
import { POSTS } from './posts';

const CATEGORIES = ['All', 'Workforce Intelligence', 'Industry Insights', 'AI & Technology', 'Cost Savings', 'Safety & Compliance'];

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

export default function BlogPage() {
  const [activeCategory, setActiveCategory] = useState('All');

  const filtered = activeCategory === 'All'
    ? POSTS
    : POSTS.filter((p) => p.category === activeCategory);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      {/* Hero */}
      <section className="bg-[#0a0a0f] text-white py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-blue-500/15 border border-blue-400/25 rounded-full px-5 py-2 text-sm font-semibold text-blue-300 mb-6">
            LenzAI Blog
          </div>
          <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight mb-5 leading-[1.1]">
            Workforce Intelligence<br />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-violet-400">
              Insights
            </span>
          </h1>
          <p className="text-lg text-gray-400 mb-10 max-w-2xl mx-auto leading-relaxed">
            Practical guides, industry analysis, and AI-powered strategies for operations leaders.
          </p>
          <div className="flex items-center justify-center gap-6 text-sm text-gray-500 font-medium">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
              15 Articles
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-violet-500"></span>
              9 Industries
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              Updated Weekly
            </span>
          </div>
        </div>
      </section>

      {/* Filter bar */}
      <div className="sticky top-16 z-40 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-2 overflow-x-auto scrollbar-hide">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`shrink-0 px-4 py-2 rounded-full text-sm font-semibold transition-all ${
                activeCategory === cat
                  ? 'bg-gradient-to-r from-blue-600 to-violet-600 text-white shadow-md'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Posts grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
        {filtered.length === 0 ? (
          <div className="text-center py-24 text-gray-400">No articles in this category yet.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((post) => (
              <article
                key={post.slug}
                className="bg-white rounded-2xl border border-gray-200 hover:border-gray-300 hover:shadow-xl hover:-translate-y-1 transition-all duration-200 flex flex-col overflow-hidden"
              >
                {post.image && (
                  <Link href={`/blog/${post.slug}`}>
                    <div className="w-full h-44 overflow-hidden bg-gray-100">
                      <img src={post.image} alt={post.title} className="w-full h-full object-cover hover:scale-105 transition-transform duration-300" />
                    </div>
                  </Link>
                )}
                <div className="p-6 flex flex-col flex-1">
                  <div className="flex items-center gap-2 mb-3 flex-wrap">
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${CATEGORY_COLORS[post.category] || 'bg-gray-100 text-gray-600'}`}>
                      {post.category}
                    </span>
                    {post.industry && (
                      <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-gray-100 text-gray-500">
                        {post.industry}
                      </span>
                    )}
                  </div>
                  <h2 className="text-base font-bold text-gray-900 mb-2 leading-snug line-clamp-2">
                    {post.title}
                  </h2>
                  <p className="text-sm text-gray-500 leading-relaxed line-clamp-3 flex-1 mb-4">
                    {post.excerpt}
                  </p>
                  <div className="flex items-center justify-between pt-4 border-t border-gray-100 mt-auto">
                    <div className="text-xs text-gray-400 font-medium">
                      {post.date} · {post.readTime}
                    </div>
                    <Link
                      href={`/blog/${post.slug}`}
                      className="text-sm font-bold text-blue-600 hover:text-blue-700 transition-colors"
                    >
                      Read →
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <Footer />
    </div>
  );
}
