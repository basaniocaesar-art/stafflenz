'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://stafflenz.com';

function StatCard({ label, value, sub, accent }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6">
      <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">{label}</div>
      <div className={`text-3xl font-extrabold mb-1 ${accent || 'text-gray-900'}`}>{value}</div>
      {sub && <div className="text-xs text-gray-400">{sub}</div>}
    </div>
  );
}

function Badge({ status }) {
  const map = {
    pending: 'bg-amber-100 text-amber-700',
    approved: 'bg-blue-100 text-blue-700',
    paid: 'bg-emerald-100 text-emerald-700',
    rejected: 'bg-red-100 text-red-700',
  };
  return (
    <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${map[status] || 'bg-gray-100 text-gray-600'}`}>
      {status}
    </span>
  );
}

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function AffiliateDashboard() {
  const router = useRouter();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [clicks, setClicks] = useState(null);
  const [conversions, setConversions] = useState(null);
  const [copied, setCopied] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    fetch('/api/affiliate/me')
      .then((r) => {
        if (r.status === 401) { router.push('/affiliate/login'); return null; }
        return r.json();
      })
      .then((d) => { if (d) setData(d); })
      .catch(() => router.push('/affiliate/login'))
      .finally(() => setLoading(false));
  }, [router]);

  useEffect(() => {
    if (activeTab === 'clicks' && !clicks) {
      fetch('/api/affiliate/me?view=clicks')
        .then((r) => r.json())
        .then((d) => setClicks(d.clicks || []));
    }
    if (activeTab === 'conversions' && !conversions) {
      fetch('/api/affiliate/me?view=conversions')
        .then((r) => r.json())
        .then((d) => setConversions(d.conversions || []));
    }
  }, [activeTab, clicks, conversions]);

  async function handleLogout() {
    setLoggingOut(true);
    await fetch('/api/affiliate/auth/logout', { method: 'POST' });
    router.push('/affiliate/login');
  }

  function copyLink() {
    const link = `${APP_URL}/?ref=${data.affiliate.code}`;
    navigator.clipboard.writeText(link).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-400 text-sm">Loading your dashboard…</div>
      </div>
    );
  }

  if (!data) return null;

  const { affiliate, stats, recent_clicks, recent_conversions } = data;
  const referralLink = `${APP_URL}/?ref=${affiliate.code}`;

  const TABS = ['overview', 'clicks', 'conversions'];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top nav */}
      <nav className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-violet-600 rounded-lg flex items-center justify-center text-white font-bold text-xs shadow-md shadow-blue-200">SL</div>
              <span className="font-extrabold text-gray-900 tracking-tight">StaffLenz</span>
            </Link>
            <span className="text-gray-300">|</span>
            <span className="text-sm font-semibold text-gray-500">Affiliate Dashboard</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center text-white text-xs font-bold">
                {affiliate.name.charAt(0).toUpperCase()}
              </div>
              <span className="text-sm font-semibold text-gray-700">{affiliate.name}</span>
            </div>
            <button
              onClick={handleLogout}
              disabled={loggingOut}
              className="text-xs font-semibold text-gray-500 hover:text-gray-800 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
            >
              {loggingOut ? 'Logging out…' : 'Log out'}
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-extrabold text-gray-900 mb-1">Welcome back, {affiliate.name.split(' ')[0]} 👋</h1>
          <p className="text-gray-500 text-sm">Here's how your referrals are performing.</p>
        </div>

        {/* Referral link box */}
        <div className="bg-gradient-to-r from-blue-600 to-violet-600 rounded-2xl p-6 mb-8 text-white">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="text-xs font-bold uppercase tracking-wider opacity-70 mb-1">Your Referral Link</div>
              <div className="font-mono text-sm bg-white/10 px-3 py-2 rounded-lg break-all">{referralLink}</div>
              <div className="text-xs opacity-60 mt-1.5">30-day cookie · {affiliate.commission_rate}% recurring commission · Code: <span className="font-bold">{affiliate.code}</span></div>
            </div>
            <button
              onClick={copyLink}
              className="shrink-0 px-5 py-2.5 bg-white text-blue-700 font-bold text-sm rounded-xl hover:bg-blue-50 transition-colors shadow-sm"
            >
              {copied ? '✓ Copied!' : 'Copy Link'}
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard label="Total Clicks" value={stats.total_clicks} sub={`${stats.monthly_clicks} this month`} accent="text-blue-600" />
          <StatCard label="Conversions" value={stats.total_conversions} sub="leads referred" accent="text-violet-600" />
          <StatCard label="Pending Earnings" value={`$${stats.pending_earnings}`} sub="awaiting approval" accent="text-amber-600" />
          <StatCard label="Paid Earnings" value={`$${stats.paid_earnings}`} sub="total received" accent="text-emerald-600" />
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-xl w-fit">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-5 py-2 rounded-lg text-sm font-semibold capitalize transition-all ${
                activeTab === tab ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Overview tab */}
        {activeTab === 'overview' && (
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Recent clicks */}
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <h2 className="font-bold text-gray-900">Recent Clicks</h2>
                <button onClick={() => setActiveTab('clicks')} className="text-xs text-blue-600 font-semibold hover:underline">View all</button>
              </div>
              {recent_clicks.length === 0 ? (
                <div className="px-6 py-10 text-center text-sm text-gray-400">No clicks yet. Share your referral link to get started.</div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {recent_clicks.map((c) => (
                    <div key={c.id} className="px-6 py-3.5 flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-gray-700 truncate">{c.landing_page || '/'}</div>
                        <div className="text-xs text-gray-400">{c.referrer ? new URL(c.referrer).hostname : 'Direct'}</div>
                      </div>
                      <div className="text-xs text-gray-400 shrink-0">{formatDate(c.created_at)}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recent conversions */}
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <h2 className="font-bold text-gray-900">Recent Conversions</h2>
                <button onClick={() => setActiveTab('conversions')} className="text-xs text-blue-600 font-semibold hover:underline">View all</button>
              </div>
              {recent_conversions.length === 0 ? (
                <div className="px-6 py-10 text-center text-sm text-gray-400">No conversions yet. Conversions appear when referred visitors submit a demo request.</div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {recent_conversions.map((c) => (
                    <div key={c.id} className="px-6 py-3.5 flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-gray-700 truncate">{c.lead_name || c.lead_email}</div>
                        <div className="text-xs text-gray-400 capitalize">{c.conversion_type}</div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {c.commission_amount && <span className="text-xs font-bold text-emerald-600">${c.commission_amount}</span>}
                        <Badge status={c.status} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Account info */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6 lg:col-span-2">
              <h2 className="font-bold text-gray-900 mb-4">Account Details</h2>
              <div className="grid sm:grid-cols-3 gap-4 text-sm">
                <div><span className="text-gray-400">Partner Type</span><div className="font-semibold text-gray-800 capitalize mt-0.5">{affiliate.partner_type?.replace('_', ' ') || 'Referral'}</div></div>
                <div><span className="text-gray-400">Commission Rate</span><div className="font-semibold text-gray-800 mt-0.5">{affiliate.commission_rate}% recurring</div></div>
                <div><span className="text-gray-400">Your Code</span><div className="font-mono font-bold text-blue-600 mt-0.5">{affiliate.code}</div></div>
                <div><span className="text-gray-400">Email</span><div className="font-semibold text-gray-800 mt-0.5">{affiliate.email}</div></div>
                {affiliate.company && <div><span className="text-gray-400">Company</span><div className="font-semibold text-gray-800 mt-0.5">{affiliate.company}</div></div>}
                <div><span className="text-gray-400">Status</span><div className="mt-0.5"><Badge status={affiliate.status} /></div></div>
              </div>
            </div>
          </div>
        )}

        {/* Clicks tab */}
        {activeTab === 'clicks' && (
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="font-bold text-gray-900">All Clicks <span className="text-gray-400 font-normal text-sm ml-1">({stats.total_clicks} total)</span></h2>
            </div>
            {!clicks ? (
              <div className="p-10 text-center text-sm text-gray-400">Loading…</div>
            ) : clicks.length === 0 ? (
              <div className="p-10 text-center text-sm text-gray-400">No clicks recorded yet.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                      <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Landing Page</th>
                      <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Referrer</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {clicks.map((c) => (
                      <tr key={c.id} className="hover:bg-gray-50">
                        <td className="px-6 py-3.5 text-gray-500 whitespace-nowrap">{formatDate(c.created_at)}</td>
                        <td className="px-6 py-3.5 text-gray-700 truncate max-w-xs">{c.landing_page || '/'}</td>
                        <td className="px-6 py-3.5 text-gray-400">{c.referrer ? (() => { try { return new URL(c.referrer).hostname; } catch { return c.referrer; } })() : 'Direct'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Conversions tab */}
        {activeTab === 'conversions' && (
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="font-bold text-gray-900">All Conversions <span className="text-gray-400 font-normal text-sm ml-1">({stats.total_conversions} total)</span></h2>
            </div>
            {!conversions ? (
              <div className="p-10 text-center text-sm text-gray-400">Loading…</div>
            ) : conversions.length === 0 ? (
              <div className="p-10 text-center text-sm text-gray-400">No conversions yet.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                      <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Lead</th>
                      <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Type</th>
                      <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Commission</th>
                      <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {conversions.map((c) => (
                      <tr key={c.id} className="hover:bg-gray-50">
                        <td className="px-6 py-3.5 text-gray-500 whitespace-nowrap">{formatDate(c.created_at)}</td>
                        <td className="px-6 py-3.5">
                          <div className="font-medium text-gray-700">{c.lead_name || '—'}</div>
                          <div className="text-xs text-gray-400">{c.lead_email}</div>
                        </td>
                        <td className="px-6 py-3.5 text-gray-500 capitalize">{c.conversion_type}</td>
                        <td className="px-6 py-3.5 font-semibold text-emerald-600">{c.commission_amount ? `$${c.commission_amount}` : '—'}</td>
                        <td className="px-6 py-3.5"><Badge status={c.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
