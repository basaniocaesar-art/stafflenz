'use client';
import Link from 'next/link';
import { useState } from 'react';
import AffiliateTracker from '@/components/AffiliateTracker';

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

const PARTNER_TIERS = [
  {
    icon: '🤝',
    name: 'Referral Partner',
    ideal: 'Consultants, HR advisors, industry bloggers',
    commission: '20% recurring for 12 months',
    accent: '#3b82f6',
    accentBg: 'bg-blue-50',
    accentBorder: 'border-blue-200',
    accentText: 'text-blue-600',
    accentBadgeBg: 'bg-blue-100',
    highlighted: false,
    features: [
      'Unique referral link',
      'Real-time referral dashboard',
      'Co-branded sales collateral',
      'Monthly commission payout',
      'Email + chat support',
    ],
    cta: 'Apply as Referral',
    ctaHref: '#apply',
  },
  {
    icon: '💼',
    name: 'Reseller Partner',
    ideal: 'IT resellers, SaaS distributors, security integrators',
    commission: '35% recurring ongoing',
    accent: '#8b5cf6',
    accentBg: 'bg-violet-50',
    accentBorder: 'border-violet-400',
    accentText: 'text-violet-600',
    accentBadgeBg: 'bg-violet-100',
    highlighted: true,
    badge: 'Most Popular',
    features: [
      'Everything in Referral',
      'White-label demo environment',
      'Priority onboarding support',
      'Volume pricing discounts',
      'Quarterly business reviews',
      'Co-sell with StaffLenz team',
    ],
    cta: 'Apply as Reseller',
    ctaHref: '#apply',
  },
  {
    icon: '🏷️',
    name: 'White Label Partner',
    ideal: 'Established SaaS companies, enterprise resellers',
    commission: 'Custom pricing + margin',
    accent: '#10b981',
    accentBg: 'bg-emerald-50',
    accentBorder: 'border-emerald-200',
    accentText: 'text-emerald-600',
    accentBadgeBg: 'bg-emerald-100',
    highlighted: false,
    features: [
      'Full white-label platform',
      'Custom domain + branding',
      'Your logo, your product',
      'Dedicated technical support',
      'SLA-backed infrastructure',
      'Custom contract terms',
    ],
    cta: 'Contact for Pricing',
    ctaHref: '#apply',
  },
];

const HOW_STEPS = [
  {
    number: '1',
    title: 'Apply',
    description: 'Fill out the short application form. We review within 24 hours.',
  },
  {
    number: '2',
    title: 'Get Onboarded',
    description: 'Receive your partner portal access, referral links, and sales materials.',
  },
  {
    number: '3',
    title: 'Refer Clients',
    description: 'Share StaffLenz with your network using your unique tracking link.',
  },
  {
    number: '4',
    title: 'Earn Commissions',
    description: 'Get paid monthly via bank transfer or PayPal. Track everything in your dashboard.',
  },
];

const BENEFITS = [
  {
    icon: '💰',
    title: 'Recurring Revenue',
    description: 'Earn commissions every month your referral stays active. No one-time payments.',
  },
  {
    icon: '📈',
    title: 'High Conversion',
    description: 'AI demo converts at 34%. We close deals, you earn.',
  },
  {
    icon: '🌍',
    title: 'Global Market',
    description: '9 industries, works with any IP camera, deployable anywhere.',
  },
  {
    icon: '🛠️',
    title: 'Sales Support',
    description: 'Pitch decks, case studies, demo environments — all provided.',
  },
  {
    icon: '🎯',
    title: 'Dedicated Manager',
    description: 'Every partner gets a named partner manager, not a support ticket.',
  },
  {
    icon: '⚡',
    title: 'Fast Payouts',
    description: 'Commissions paid within 7 days of month close. No 60-day delays.',
  },
];

const STATS = [
  { value: '500+', label: 'Active Deployments' },
  { value: '9', label: 'Industry Verticals' },
  { value: '40%', label: 'Max Partner Commission' },
  { value: '48h', label: 'Average Client Onboarding' },
];

const FAQ_ITEMS = [
  {
    question: 'When do I get paid?',
    answer: 'Commissions are calculated at month-end and paid within 7 business days via bank transfer or PayPal.',
  },
  {
    question: 'Is there a minimum referral requirement?',
    answer: 'No. Refer one client or a hundred — there\'s no minimum. Your dashboard tracks every referral.',
  },
  {
    question: 'Can I white-label the platform with my own branding?',
    answer: 'Yes, White Label partners get full branding control — custom domain, logo, color scheme, and even custom product name.',
  },
  {
    question: 'How long does the referral cookie last?',
    answer: '30 days. If someone you referred signs up within 30 days of clicking your link, you earn the commission.',
  },
  {
    question: 'Do you offer co-selling support?',
    answer: 'Reseller and White Label partners can request joint sales calls with a StaffLenz account executive for strategic accounts.',
  },
  {
    question: 'What industries does StaffLenz support?',
    answer: '9 industries: Factory, Hotel, School, Retail, Hospital, Construction, Warehouse, Restaurant, and Security.',
  },
];

const EMPTY_FORM = {
  fullName: '',
  email: '',
  company: '',
  website: '',
  partnerType: '',
  industryFocus: '',
  hearAbout: '',
  clientBase: '',
};

export default function PartnersPage() {
  const [openFaq, setOpenFaq] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  function handleChange(e) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setSubmitError('');
    try {
      const res = await fetch('/api/applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Submission failed');
      setSubmitted(true);
    } catch (err) {
      setSubmitError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen overflow-x-hidden">
      <AffiliateTracker />

      {/* ── Navbar ── */}
      <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-xl border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-gradient-to-br from-blue-600 to-violet-600 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-blue-200">
              SL
            </div>
            <span className="font-extrabold text-xl text-gray-900 tracking-tight">StaffLenz</span>
          </Link>

          <div className="hidden md:flex items-center gap-6 text-sm font-medium text-gray-500">
            {/* Industries dropdown */}
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
            <Link href="/blog" className="hover:text-gray-900 transition-colors">Blog</Link>
          </div>

          <div className="flex items-center gap-3">
            <a
              href="#apply"
              className="text-sm font-bold px-5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 text-white hover:from-blue-700 hover:to-violet-700 transition-all shadow-md shadow-blue-200"
            >
              Become a Partner →
            </a>
          </div>
        </div>
      </nav>

      {/* ── 1. Hero ── */}
      <section className="relative bg-[#0a0a0f] text-white overflow-hidden">
        {/* Ambient glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-blue-600/15 rounded-full blur-[140px] pointer-events-none" />
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-violet-700/10 rounded-full blur-[120px] pointer-events-none" />
        {/* Subtle grid */}
        <div
          className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{
            backgroundImage:
              'linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)',
            backgroundSize: '60px 60px',
          }}
        />

        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 pt-24 pb-28 text-center">
          {/* Pill label */}
          <div className="inline-flex items-center gap-2 bg-blue-500/15 border border-blue-400/25 rounded-full px-5 py-2 text-sm font-semibold text-blue-300 mb-7">
            Partner Program
          </div>

          <h1 className="text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.08] mb-6">
            Grow Your Revenue<br />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-violet-400">
              With StaffLenz
            </span>
          </h1>

          <p className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            Join our partner network and earn recurring commissions by bringing AI workforce intelligence to your clients. Three ways to partner — choose what fits you best.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-14">
            <a
              href="#apply"
              className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-violet-600 text-white font-bold px-9 py-4 rounded-2xl hover:from-blue-700 hover:to-violet-700 transition-all shadow-2xl shadow-blue-900/40 text-base"
            >
              Apply Now →
            </a>
            <a
              href="#"
              className="inline-flex items-center gap-2 border border-white/25 text-white font-semibold px-9 py-4 rounded-2xl hover:bg-white/10 transition-all text-base"
            >
              Download Partner Deck
            </a>
          </div>

          {/* Stats strip */}
          <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm font-semibold text-gray-400">
            {[
              '40% Recurring Commission',
              '9 Industries',
              '30-Day Cookie',
              'Dedicated Partner Manager',
            ].map((stat, i) => (
              <span key={stat} className="flex items-center gap-2">
                {i > 0 && <span className="hidden sm:inline text-gray-700">·</span>}
                <span>{stat}</span>
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── 2. Partner Tiers ── */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-blue-600 bg-blue-50 border border-blue-100 px-4 py-1.5 rounded-full mb-4">
              Partner Tiers
            </div>
            <h2 className="text-4xl font-extrabold text-gray-900 tracking-tight">
              Three Ways to Partner With Us
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
            {PARTNER_TIERS.map((tier) => (
              <div
                key={tier.name}
                className={`relative rounded-2xl border-2 p-8 flex flex-col transition-all duration-200 ${
                  tier.highlighted
                    ? 'border-violet-400 shadow-2xl scale-[1.03] bg-white'
                    : `${tier.accentBorder} bg-white shadow-sm hover:shadow-lg`
                }`}
              >
                {/* Most Popular badge */}
                {tier.highlighted && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <span className="inline-flex items-center px-4 py-1.5 rounded-full text-xs font-bold bg-gradient-to-r from-blue-600 to-violet-600 text-white shadow-lg shadow-violet-200">
                      Most Popular
                    </span>
                  </div>
                )}

                {/* Icon + name */}
                <div className="mb-5">
                  <div className="text-4xl mb-3">{tier.icon}</div>
                  <h3 className="text-xl font-extrabold text-gray-900 mb-1">{tier.name}</h3>
                  <p className="text-sm text-gray-500">Ideal for: {tier.ideal}</p>
                </div>

                {/* Commission */}
                <div className={`rounded-xl px-4 py-3 mb-6 ${tier.accentBg} ${tier.accentBorder} border`}>
                  <div className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-0.5">Commission</div>
                  <div className={`text-base font-extrabold ${tier.accentText}`}>{tier.commission}</div>
                </div>

                {/* Features */}
                <ul className="space-y-2.5 mb-8 flex-1">
                  {tier.features.map((feat) => (
                    <li key={feat} className="flex items-start gap-2.5 text-sm text-gray-600">
                      <svg className={`w-4 h-4 mt-0.5 shrink-0 ${tier.accentText}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      {feat}
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                <a
                  href={tier.ctaHref}
                  className={`w-full text-center text-sm font-bold px-6 py-3.5 rounded-xl transition-all ${
                    tier.highlighted
                      ? 'bg-gradient-to-r from-blue-600 to-violet-600 text-white hover:from-blue-700 hover:to-violet-700 shadow-lg shadow-violet-200'
                      : `border-2 ${tier.accentBorder} ${tier.accentText} hover:bg-gray-50`
                  }`}
                >
                  {tier.cta}
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 3. How It Works ── */}
      <section className="py-20 px-4 bg-gray-50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-blue-600 bg-blue-50 border border-blue-100 px-4 py-1.5 rounded-full mb-4">
              Simple Process
            </div>
            <h2 className="text-4xl font-extrabold text-gray-900 tracking-tight">
              From Application to First Commission in 7 Days
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {HOW_STEPS.map((step) => (
              <div key={step.number} className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm hover:shadow-lg transition-all">
                {/* Numbered circle */}
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-600 to-violet-600 flex items-center justify-center text-white font-extrabold text-lg shadow-md shadow-blue-200 mb-5">
                  {step.number}
                </div>
                <h3 className="text-base font-extrabold text-gray-900 mb-2">{step.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 4. Why Partner ── */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-blue-600 bg-blue-50 border border-blue-100 px-4 py-1.5 rounded-full mb-4">
              Partner Benefits
            </div>
            <h2 className="text-4xl font-extrabold text-gray-900 tracking-tight">
              Built for Partners Who Want Real Returns
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {BENEFITS.map((b) => (
              <div
                key={b.title}
                className="bg-white rounded-2xl border border-gray-200 p-7 hover:shadow-xl hover:-translate-y-1 transition-all duration-200"
              >
                <div className="text-3xl mb-4">{b.icon}</div>
                <h3 className="text-base font-extrabold text-gray-900 mb-2">{b.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{b.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 5. Social Proof / Numbers ── */}
      <section className="py-20 px-4 bg-gray-50">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {STATS.map((stat) => (
              <div key={stat.label} className="bg-white rounded-2xl border border-gray-200 p-8 text-center shadow-sm">
                <div className="text-5xl font-extrabold bg-clip-text text-transparent bg-gradient-to-br from-blue-600 to-violet-600 mb-2">
                  {stat.value}
                </div>
                <div className="text-sm font-semibold text-gray-500">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 6. Application Form ── */}
      <section id="apply" className="py-20 px-4 bg-white">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-blue-600 bg-blue-50 border border-blue-100 px-4 py-1.5 rounded-full mb-4">
              Apply Now
            </div>
            <h2 className="text-4xl font-extrabold text-gray-900 tracking-tight mb-3">
              Start Your Partner Application
            </h2>
            <p className="text-gray-500 text-base">
              Takes 3 minutes. We'll review and respond within 24 hours.
            </p>
          </div>

          {submitted ? (
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-12 text-center">
              <div className="text-5xl mb-4">🎉</div>
              <h3 className="text-2xl font-extrabold text-gray-900 mb-2">Thanks! We'll be in touch within 24 hours.</h3>
              <p className="text-gray-500 text-sm">Our partner team will review your application and reach out via email.</p>
            </div>
          ) : (
            <form
              onSubmit={handleSubmit}
              className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 space-y-6"
            >
              {/* Row 1: Full Name + Email */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Full Name</label>
                  <input
                    type="text"
                    name="fullName"
                    value={form.fullName}
                    onChange={handleChange}
                    required
                    placeholder="Jane Smith"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Email Address</label>
                  <input
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    required
                    placeholder="jane@company.com"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all"
                  />
                </div>
              </div>

              {/* Row 2: Company + Website */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Company Name</label>
                  <input
                    type="text"
                    name="company"
                    value={form.company}
                    onChange={handleChange}
                    required
                    placeholder="Acme Corp"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Website URL</label>
                  <input
                    type="url"
                    name="website"
                    value={form.website}
                    onChange={handleChange}
                    placeholder="https://acme.com"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all"
                  />
                </div>
              </div>

              {/* Row 3: Partner Type + Industry Focus */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Partner Type</label>
                  <select
                    name="partnerType"
                    value={form.partnerType}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all"
                  >
                    <option value="">Select partner type…</option>
                    <option value="referral">Referral Partner</option>
                    <option value="reseller">Reseller Partner</option>
                    <option value="whitelabel">White Label Partner</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Industry Focus</label>
                  <select
                    name="industryFocus"
                    value={form.industryFocus}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all"
                  >
                    <option value="">Select industry…</option>
                    <option value="all">All Industries</option>
                    <option value="factory">Factory & Manufacturing</option>
                    <option value="hotel">Hotel & Hospitality</option>
                    <option value="school">School & Education</option>
                    <option value="retail">Retail</option>
                    <option value="hospital">Hospital & Healthcare</option>
                    <option value="construction">Construction</option>
                    <option value="warehouse">Warehouse & Logistics</option>
                    <option value="restaurant">Restaurant & Food Service</option>
                    <option value="security">Security</option>
                  </select>
                </div>
              </div>

              {/* Row 4: How did you hear */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">How did you hear about us?</label>
                <select
                  name="hearAbout"
                  value={form.hearAbout}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all"
                >
                  <option value="">Select an option…</option>
                  <option value="google">Google</option>
                  <option value="linkedin">LinkedIn</option>
                  <option value="referral">Referral</option>
                  <option value="blog">Blog</option>
                  <option value="other">Other</option>
                </select>
              </div>

              {/* Row 5: Client base textarea */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Tell us about your client base</label>
                <textarea
                  name="clientBase"
                  value={form.clientBase}
                  onChange={handleChange}
                  rows={3}
                  placeholder="Describe the industries you serve, typical company sizes, and how you currently help them…"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm text-gray-900 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all"
                />
              </div>

              {/* Submit */}
              {submitError && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">{submitError}</p>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-blue-600 to-violet-600 text-white font-bold text-base hover:from-blue-700 hover:to-violet-700 transition-all shadow-lg shadow-blue-200 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {submitting ? 'Submitting…' : 'Submit Application →'}
              </button>

              <p className="text-center text-xs text-gray-400">
                ✓ No commitment required · We respond within 24 hours · Your data is safe
              </p>
            </form>
          )}
        </div>
      </section>

      {/* ── 7. FAQ ── */}
      <section className="py-20 px-4 bg-gray-50">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-blue-600 bg-blue-50 border border-blue-100 px-4 py-1.5 rounded-full mb-4">
              FAQ
            </div>
            <h2 className="text-4xl font-extrabold text-gray-900 tracking-tight">
              Partner Program Questions
            </h2>
          </div>

          <div className="space-y-3">
            {FAQ_ITEMS.map((item, idx) => (
              <div
                key={idx}
                className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                  className="w-full flex items-center justify-between px-6 py-5 text-left hover:bg-gray-50 transition-colors"
                >
                  <span className="text-sm font-bold text-gray-900 pr-4">{item.question}</span>
                  <span
                    className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold transition-all ${
                      openFaq === idx
                        ? 'bg-gradient-to-br from-blue-600 to-violet-600 rotate-45'
                        : 'bg-gray-200 text-gray-600'
                    }`}
                  >
                    {openFaq === idx ? '×' : '+'}
                  </span>
                </button>
                {openFaq === idx && (
                  <div className="px-6 pb-5">
                    <p className="text-sm text-gray-500 leading-relaxed">{item.answer}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 8. Footer ── */}
      <footer className="bg-gray-950 border-t border-gray-900 py-12 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8 mb-10">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-violet-600 rounded-lg flex items-center justify-center text-white font-bold text-xs">
                  SL
                </div>
                <span className="font-extrabold text-white text-lg">StaffLenz</span>
              </div>
              <p className="text-sm text-gray-500 max-w-xs">
                AI-powered workforce intelligence. Real-time alerts. No new cameras.
              </p>
            </div>
            <div className="flex flex-wrap gap-x-8 gap-y-2 text-sm text-gray-500">
              <Link href="/" className="hover:text-white transition-colors">Home</Link>
              <Link href="/#pricing" className="hover:text-white transition-colors">Pricing</Link>
              <Link href="/blog" className="hover:text-white transition-colors">Blog</Link>
              <Link href="/partners" className="hover:text-white transition-colors">Partners</Link>
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
            © {new Date().getFullYear()} StaffLenz · AI-Powered Workforce Intelligence
          </div>
        </div>
      </footer>

    </div>
  );
}
