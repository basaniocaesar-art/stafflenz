'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';

// ─── Helpers ────────────────────────────────────────────────────────────────

const INDUSTRY_OPTIONS = [
  { value: 'factory', label: '🏭 Factory' },
  { value: 'hotel', label: '🏨 Hotel' },
  { value: 'school', label: '🏫 School' },
  { value: 'retail', label: '🛒 Retail' },
  { value: 'hospital', label: '🏥 Hospital' },
  { value: 'construction', label: '🏗️ Construction' },
  { value: 'warehouse', label: '📦 Warehouse' },
  { value: 'restaurant', label: '🍽️ Restaurant' },
  { value: 'security', label: '🛡️ Security' },
];

const INDUSTRY_EMOJI = {
  factory: '🏭', hotel: '🏨', school: '🏫', retail: '🛒',
  hospital: '🏥', construction: '🏗️', warehouse: '📦',
  restaurant: '🍽️', security: '🛡️',
};

const PLAN_STYLES = {
  starter: 'bg-gray-100 text-gray-600',
  professional: 'bg-blue-100 text-blue-700',
  enterprise: 'bg-violet-100 text-violet-700',
};

const NAV_ITEMS = [
  { id: 'overview', icon: '📊', label: 'Overview' },
  { id: 'clients', icon: '🏢', label: 'Clients' },
  { id: 'branding', icon: '🎨', label: 'Branding' },
  { id: 'settings', icon: '⚙️', label: 'Settings', soon: true },
];

// ─── Sub-components ──────────────────────────────────────────────────────────

function StatCard({ label, value, accent }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
      <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">{label}</div>
      <div className={`text-3xl font-extrabold ${accent}`}>{value ?? '—'}</div>
    </div>
  );
}

function PlanBadge({ plan }) {
  return (
    <span className={`text-xs font-bold px-2.5 py-1 rounded-full capitalize ${PLAN_STYLES[plan] || 'bg-gray-100 text-gray-600'}`}>
      {plan}
    </span>
  );
}

function StatusBadge({ active }) {
  return active
    ? <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700">Active</span>
    : <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-red-100 text-red-700">Inactive</span>;
}

function TableSkeleton({ rows = 3 }) {
  return (
    <div className="divide-y divide-gray-100">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="px-6 py-4 flex gap-4 items-center animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4" />
          <div className="h-4 bg-gray-200 rounded w-1/6" />
          <div className="h-4 bg-gray-200 rounded w-1/6" />
          <div className="h-4 bg-gray-200 rounded w-1/8" />
          <div className="h-4 bg-gray-200 rounded w-1/8" />
        </div>
      ))}
    </div>
  );
}

function ClientsTable({ clients, compact }) {
  const rows = compact ? (clients || []).slice(0, 5) : (clients || []);

  if (!clients) return <TableSkeleton rows={compact ? 3 : 5} />;

  if (rows.length === 0) {
    return (
      <div className="px-6 py-14 text-center text-sm text-gray-400">
        No clients yet. Add your first client to get started.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 border-b border-gray-100">
          <tr>
            <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Name</th>
            <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Industry</th>
            <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Plan</th>
            <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Workers</th>
            <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
            <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {rows.map((c) => (
            <tr key={c.id} className="hover:bg-gray-50 transition-colors">
              <td className="px-6 py-3.5 font-medium text-gray-800">{c.name}</td>
              <td className="px-6 py-3.5 text-gray-600">
                {INDUSTRY_EMOJI[c.industry] || '🏢'} <span className="capitalize ml-1">{c.industry}</span>
              </td>
              <td className="px-6 py-3.5"><PlanBadge plan={c.plan} /></td>
              <td className="px-6 py-3.5 text-gray-600">{c.worker_count ?? 0}</td>
              <td className="px-6 py-3.5"><StatusBadge active={c.is_active} /></td>
              <td className="px-6 py-3.5">
                <Link
                  href={`/${c.industry}`}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline"
                >
                  View →
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Sidebar ─────────────────────────────────────────────────────────────────

function Sidebar({ activeTab, setActiveTab, onLogout }) {
  return (
    <aside
      className="hidden md:flex flex-col w-64 shrink-0 sticky top-0 h-screen"
      style={{ backgroundColor: '#0f172a' }}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-white/10">
        <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-violet-600 rounded-xl flex items-center justify-center text-white font-extrabold text-sm shadow-lg">
          SL
        </div>
        <span className="text-white font-extrabold tracking-tight text-lg">StaffLenz</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => !item.soon && setActiveTab(item.id)}
              disabled={item.soon}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-left ${
                isActive
                  ? 'bg-blue-500/10 text-blue-400 border-l-2 border-blue-500 pl-[10px]'
                  : item.soon
                  ? 'text-gray-600 cursor-not-allowed'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <span className="text-base leading-none">{item.icon}</span>
              <span className="flex-1">{item.label}</span>
              {item.soon && (
                <span className="text-[10px] font-bold bg-gray-700 text-gray-400 px-1.5 py-0.5 rounded-full">
                  Soon
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* User section */}
      <div className="px-4 py-4 border-t border-white/10">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
            W
          </div>
          <div className="min-w-0">
            <div className="text-white text-xs font-semibold truncate">White Label Admin</div>
            <div className="text-gray-500 text-xs">Administrator</div>
          </div>
        </div>
        <button
          onClick={onLogout}
          className="w-full text-xs font-semibold text-gray-400 hover:text-white py-2 px-3 rounded-lg hover:bg-white/5 transition-colors text-left"
        >
          Log out
        </button>
      </div>
    </aside>
  );
}

// ─── TopNav ───────────────────────────────────────────────────────────────────

function TopNav({ activeTab, onAddClient }) {
  const showAdd = activeTab === 'overview' || activeTab === 'clients';
  const label = NAV_ITEMS.find((n) => n.id === activeTab)?.label || activeTab;

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-gray-200 h-14 flex items-center px-6 justify-between">
      <h1 className="font-bold text-gray-800 capitalize">{label}</h1>
      <div className="flex items-center gap-3">
        {showAdd && (
          <button
            onClick={onAddClient}
            className="px-4 py-2 bg-gradient-to-r from-blue-600 to-violet-600 text-white text-sm font-semibold rounded-xl hover:opacity-90 transition-opacity shadow-sm"
          >
            + Add Client
          </button>
        )}
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center text-white text-xs font-bold">
          W
        </div>
      </div>
    </header>
  );
}

// ─── Overview Tab ─────────────────────────────────────────────────────────────

function OverviewTab({ stats, clients, setActiveTab, onAddClient }) {
  return (
    <div className="space-y-8">
      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Clients" value={stats?.total_clients} accent="text-blue-600" />
        <StatCard label="Active Clients" value={stats?.active_clients} accent="text-emerald-600" />
        <StatCard label="Total Workers" value={stats?.total_workers} accent="text-violet-600" />
        <StatCard label="Events Today" value={stats?.events_today} accent="text-amber-600" />
      </div>

      {/* Quick actions */}
      <div className="flex flex-wrap gap-3">
        <button
          onClick={onAddClient}
          className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-violet-600 text-white text-sm font-semibold rounded-xl hover:opacity-90 transition-opacity shadow-sm"
        >
          ＋ Add New Client
        </button>
        <button
          onClick={() => setActiveTab('branding')}
          className="px-5 py-2.5 border border-gray-300 text-gray-700 text-sm font-semibold rounded-xl hover:bg-gray-50 transition-colors"
        >
          🎨 Configure Branding
        </button>
        <button
          onClick={() => window.open('/', '_blank')}
          className="px-5 py-2.5 border border-gray-300 text-gray-700 text-sm font-semibold rounded-xl hover:bg-gray-50 transition-colors"
        >
          🔗 View Portal
        </button>
      </div>

      {/* Recent clients table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-bold text-gray-900">Recent Clients</h2>
          <button
            onClick={() => setActiveTab('clients')}
            className="text-xs font-semibold text-blue-600 hover:underline"
          >
            View All →
          </button>
        </div>
        <ClientsTable clients={clients} compact />
      </div>
    </div>
  );
}

// ─── Clients Tab ──────────────────────────────────────────────────────────────

function ClientsTab({ clients, onAddClient }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="font-bold text-gray-900 text-lg">Your Clients</h2>
          {clients !== null && (
            <span className="text-xs font-bold bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full">
              {clients.length}
            </span>
          )}
        </div>
        <button
          onClick={onAddClient}
          className="px-4 py-2 bg-gradient-to-r from-blue-600 to-violet-600 text-white text-sm font-semibold rounded-xl hover:opacity-90 transition-opacity shadow-sm"
        >
          + Add Client
        </button>
      </div>
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <ClientsTable clients={clients} compact={false} />
      </div>
    </div>
  );
}

// ─── Branding Tab ─────────────────────────────────────────────────────────────

function BrandingTab({ config, setConfig, saving, saved, onSave }) {
  function handleChange(key, value) {
    setConfig((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <div className="grid lg:grid-cols-2 gap-8">
      {/* Left: Form */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
        <h2 className="font-bold text-gray-900 text-lg mb-1">Brand Settings</h2>
        <p className="text-sm text-gray-400 mb-6">Changes are applied to your white-label portal.</p>

        <div className="space-y-5">
          {/* Brand Name */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Brand Name</label>
            <input
              type="text"
              required
              value={config.brand_name}
              onChange={(e) => handleChange('brand_name', e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
            />
          </div>

          {/* Logo URL */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Logo URL</label>
            <input
              type="url"
              placeholder="https://..."
              value={config.logo_url}
              onChange={(e) => handleChange('logo_url', e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
            />
          </div>

          {/* Primary Color */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Primary Color</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={config.primary_color}
                onChange={(e) => handleChange('primary_color', e.target.value)}
                className="w-12 h-10 rounded-lg cursor-pointer border border-gray-200 p-0.5"
              />
              <input
                type="text"
                value={config.primary_color}
                onChange={(e) => handleChange('primary_color', e.target.value)}
                className="flex-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
              />
            </div>
          </div>

          {/* Accent Color */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Accent Color</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={config.accent_color}
                onChange={(e) => handleChange('accent_color', e.target.value)}
                className="w-12 h-10 rounded-lg cursor-pointer border border-gray-200 p-0.5"
              />
              <input
                type="text"
                value={config.accent_color}
                onChange={(e) => handleChange('accent_color', e.target.value)}
                className="flex-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
              />
            </div>
          </div>

          {/* Support Email */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Support Email</label>
            <input
              type="email"
              value={config.support_email}
              onChange={(e) => handleChange('support_email', e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
            />
          </div>

          {/* Custom Domain */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Custom Domain</label>
            <input
              type="text"
              placeholder="app.yourdomain.com"
              value={config.custom_domain}
              onChange={(e) => handleChange('custom_domain', e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
            />
          </div>

          {/* Welcome Message */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Welcome Message</label>
            <textarea
              rows={3}
              value={config.welcome_message}
              onChange={(e) => handleChange('welcome_message', e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 resize-none"
            />
          </div>

          {/* Footer Text */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Footer Text</label>
            <textarea
              rows={2}
              value={config.footer_text}
              onChange={(e) => handleChange('footer_text', e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 resize-none"
            />
          </div>

          {/* Save button */}
          <button
            onClick={onSave}
            disabled={saving}
            className="w-full py-3 bg-gradient-to-r from-blue-600 to-violet-600 text-white font-semibold rounded-xl hover:opacity-90 transition-opacity disabled:opacity-60 text-sm"
          >
            {saving ? 'Saving…' : saved ? '✓ Saved!' : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* Right: Live Preview */}
      <div>
        <h2 className="font-bold text-gray-900 text-lg mb-3">Live Preview</h2>
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          {/* Fake browser chrome */}
          <div className="bg-gray-100 px-4 py-2.5 flex items-center gap-3 border-b border-gray-200">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-red-400" />
              <div className="w-3 h-3 rounded-full bg-yellow-400" />
              <div className="w-3 h-3 rounded-full bg-green-400" />
            </div>
            <div className="flex-1 bg-white rounded-md px-3 py-1 text-xs text-gray-400 font-mono truncate border border-gray-200">
              {config.custom_domain || 'app.yourdomain.com'}
            </div>
          </div>

          {/* Simulated content */}
          <div className="text-sm">
            {/* Mini nav */}
            <div
              className="flex items-center gap-3 px-4 py-3"
              style={{ backgroundColor: config.primary_color }}
            >
              {config.logo_url && (
                <img src={config.logo_url} alt="logo" className="h-6 w-auto object-contain" />
              )}
              <span className="text-white font-bold text-sm">{config.brand_name || 'My Platform'}</span>
            </div>

            {/* Hero */}
            <div
              className="px-4 py-6"
              style={{ backgroundColor: config.primary_color + '0d' }}
            >
              <div className="font-extrabold text-gray-900 text-base mb-1">Welcome</div>
              <div className="text-xs text-gray-500">
                {config.welcome_message || 'Your workforce intelligence platform.'}
              </div>
            </div>

            {/* Mini stat cards */}
            <div className="grid grid-cols-3 gap-2 px-4 py-4">
              {['Workers', 'Zones', 'Events'].map((label) => (
                <div
                  key={label}
                  className="rounded-xl border p-3 text-center"
                  style={{ borderColor: config.primary_color + '4d' }}
                >
                  <div
                    className="text-lg font-extrabold mb-0.5"
                    style={{ color: config.primary_color }}
                  >
                    —
                  </div>
                  <div className="text-[10px] text-gray-400">{label}</div>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="bg-gray-900 px-4 py-3 text-[10px] text-gray-400">
              {config.footer_text || `© 2026 ${config.brand_name || 'My Platform'}`}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Add Client Modal ─────────────────────────────────────────────────────────

function AddClientModal({ show, onClose, clientForm, setClientForm, showPassword, setShowPassword, adding, addError, onSubmit }) {
  if (!show) return null;

  function handleChange(key, value) {
    setClientForm((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-bold text-gray-900 text-lg">Add New Client</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700 transition-colors text-xl font-light leading-none"
          >
            ✕
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          {/* Client Name */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Client Name</label>
            <input
              type="text"
              required
              value={clientForm.name}
              onChange={(e) => handleChange('name', e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
              placeholder="Acme Corp"
            />
          </div>

          {/* Industry */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Industry</label>
            <select
              value={clientForm.industry}
              onChange={(e) => handleChange('industry', e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 bg-white"
            >
              {INDUSTRY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          {/* Plan */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Plan</label>
            <select
              value={clientForm.plan}
              onChange={(e) => handleChange('plan', e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 bg-white"
            >
              <option value="starter">Starter</option>
              <option value="professional">Professional</option>
              <option value="enterprise">Enterprise</option>
            </select>
          </div>

          {/* Admin Email */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Admin Email</label>
            <input
              type="email"
              required
              value={clientForm.admin_email}
              onChange={(e) => handleChange('admin_email', e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
              placeholder="admin@company.com"
            />
          </div>

          {/* Admin Password */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Admin Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                minLength={8}
                value={clientForm.admin_password}
                onChange={(e) => handleChange('admin_password', e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
                placeholder="Min. 8 characters"
              />
              <button
                type="button"
                onClick={() => setShowPassword((p) => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs"
              >
                {showPassword ? '🙈' : '👁'}
              </button>
            </div>
          </div>

          {/* Admin Full Name */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Admin Full Name</label>
            <input
              type="text"
              value={clientForm.admin_name}
              onChange={(e) => handleChange('admin_name', e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
              placeholder="Jane Doe"
            />
          </div>

          {/* Error */}
          {addError && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
              {addError}
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 border border-gray-300 text-gray-700 text-sm font-semibold rounded-xl hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={adding}
              className="flex-1 py-2.5 bg-gradient-to-r from-blue-600 to-violet-600 text-white text-sm font-semibold rounded-xl hover:opacity-90 transition-opacity disabled:opacity-60"
            >
              {adding ? 'Creating…' : 'Create Client →'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────

export default function WhitelabelDashboard() {
  const router = useRouter();

  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState(null);
  const [clients, setClients] = useState(null);
  const [config, setConfig] = useState({
    brand_name: 'My Platform',
    logo_url: '',
    primary_color: '#3b82f6',
    accent_color: '#8b5cf6',
    support_email: '',
    custom_domain: '',
    welcome_message: '',
    footer_text: '',
  });
  const [showAddModal, setShowAddModal] = useState(false);
  const [clientForm, setClientForm] = useState({
    name: '',
    industry: 'factory',
    plan: 'starter',
    admin_email: '',
    admin_password: '',
    admin_name: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  async function loadClients() {
    try {
      const r = await fetch('/api/whitelabel/clients');
      if (r.ok) {
        const data = await r.json();
        setClients(data.clients || []);
      }
    } catch {
      // silently fail — table shows empty state
    }
  }

  useEffect(() => {
    // Auth check + stats
    fetch('/api/whitelabel/stats')
      .then((r) => {
        if (r.status === 401 || r.status === 403) {
          router.push('/login?redirect=/whitelabel/dashboard');
          return null;
        }
        return r.json();
      })
      .then((data) => {
        if (data) setStats(data);
      })
      .catch(() => router.push('/login?redirect=/whitelabel/dashboard'))
      .finally(() => setLoading(false));

    // Clients
    loadClients();

    // Config
    fetch('/api/whitelabel/config')
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data) setConfig((prev) => ({ ...prev, ...data }));
      })
      .catch(() => {});
  }, [router]);

  async function handleAddClient(e) {
    e.preventDefault();
    setAdding(true);
    setAddError('');
    try {
      const r = await fetch('/api/whitelabel/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(clientForm),
      });
      const data = await r.json();
      if (!r.ok) {
        setAddError(data.error || 'Failed to create client.');
      } else {
        setShowAddModal(false);
        setAddError('');
        setClientForm({ name: '', industry: 'factory', plan: 'starter', admin_email: '', admin_password: '', admin_name: '' });
        await loadClients();
      }
    } catch {
      setAddError('Network error. Please try again.');
    } finally {
      setAdding(false);
    }
  }

  async function handleSaveConfig() {
    setSaving(true);
    setSaved(false);
    try {
      await fetch('/api/whitelabel/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      // fail silently
    } finally {
      setSaving(false);
    }
  }

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  }

  function openAddModal() {
    setAddError('');
    setShowAddModal(true);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-400 font-medium">Loading dashboard…</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen flex">
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} onLogout={handleLogout} />

        <div className="flex-1 bg-gray-50 min-w-0">
          <TopNav activeTab={activeTab} onAddClient={openAddModal} />

          <main className="px-6 py-8">
            {activeTab === 'overview' && (
              <OverviewTab
                stats={stats}
                clients={clients}
                setActiveTab={setActiveTab}
                onAddClient={openAddModal}
              />
            )}
            {activeTab === 'clients' && (
              <ClientsTab clients={clients} onAddClient={openAddModal} />
            )}
            {activeTab === 'branding' && (
              <BrandingTab
                config={config}
                setConfig={setConfig}
                saving={saving}
                saved={saved}
                onSave={handleSaveConfig}
              />
            )}
          </main>
        </div>
      </div>

      <AddClientModal
        show={showAddModal}
        onClose={() => setShowAddModal(false)}
        clientForm={clientForm}
        setClientForm={setClientForm}
        showPassword={showPassword}
        setShowPassword={setShowPassword}
        adding={adding}
        addError={addError}
        onSubmit={handleAddClient}
      />
    </>
  );
}
