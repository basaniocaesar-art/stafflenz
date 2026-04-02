'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const PLANS = ['starter', 'standard', 'pro', 'enterprise'];
const INDUSTRIES = ['factory', 'hotel', 'school', 'retail'];
const PLAN_PRICES = { starter: '₹5,000', standard: '₹8,000', pro: '₹14,000', enterprise: '₹22,000' };

function AddClientModal({ onClose, onSave }) {
  const [form, setForm] = useState({
    name: '', industry: 'factory', plan: 'starter',
    admin_email: '', admin_password: '', admin_name: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const res = await fetch('/api/admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'create_client', ...form }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error || 'Failed'); setLoading(false); return; }
    onSave(data.client);
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
        <div className="flex items-center justify-between p-5 border-b">
          <h2 className="text-lg font-semibold">Add New Client</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>}
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Company Name *</label>
              <input className="input" value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Industry</label>
              <select className="input" value={form.industry} onChange={(e) => setForm({...form, industry: e.target.value})}>
                {INDUSTRIES.map((i) => <option key={i} value={i} className="capitalize">{i.charAt(0).toUpperCase()+i.slice(1)}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Plan</label>
              <select className="input" value={form.plan} onChange={(e) => setForm({...form, plan: e.target.value})}>
                {PLANS.map((p) => <option key={p} value={p}>{p.charAt(0).toUpperCase()+p.slice(1)} — {PLAN_PRICES[p]}</option>)}
              </select>
            </div>
          </div>
          <hr className="border-gray-100" />
          <p className="text-sm font-medium text-gray-700">Admin User</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Admin Email *</label>
              <input type="email" className="input" value={form.admin_email} onChange={(e) => setForm({...form, admin_email: e.target.value})} required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password *</label>
              <input type="password" className="input" minLength={8} value={form.admin_password} onChange={(e) => setForm({...form, admin_password: e.target.value})} required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Admin Name</label>
              <input className="input" value={form.admin_name} onChange={(e) => setForm({...form, admin_name: e.target.value})} />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" className="btn-primary flex-1" disabled={loading}>
              {loading ? 'Creating...' : 'Create Client'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ResetPasswordModal({ user, onClose }) {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    const res = await fetch('/api/admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'reset_password', user_id: user.id, new_password: password }),
    });
    if (res.ok) setDone(true);
    setLoading(false);
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
        <h2 className="text-lg font-semibold mb-4">Reset Password</h2>
        {done ? (
          <div className="text-center py-4">
            <div className="text-3xl mb-2">✅</div>
            <p className="text-gray-700 mb-4">Password reset. All sessions invalidated.</p>
            <button onClick={onClose} className="btn-primary w-full">Done</button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <p className="text-sm text-gray-500">Setting new password for <strong>{user.email}</strong></p>
            <input type="password" className="input" placeholder="New password (min 8 chars)" minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} required />
            <div className="flex gap-3">
              <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
              <button type="submit" className="btn-primary flex-1" disabled={loading}>
                {loading ? 'Resetting...' : 'Reset'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

const INDUSTRY_ICONS = { factory: '🏭', hotel: '🏨', school: '🏫', retail: '🛍️' };
const PLAN_COLORS = { starter: 'badge-gray', standard: 'badge-blue', pro: 'badge-green', enterprise: 'badge-yellow' };

export default function AdminPage() {
  const router = useRouter();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('overview');
  const [addModal, setAddModal] = useState(false);
  const [resetModal, setResetModal] = useState(null);
  const [leads, setLeads] = useState([]);

  async function fetchData() {
    const res = await fetch('/api/admin');
    if (res.status === 401 || res.status === 403) { router.push('/login'); return; }
    const json = await res.json();
    setData(json);
    setLoading(false);
  }

  async function fetchLeads() {
    const res = await fetch('/api/admin?view=leads');
    const json = await res.json();
    setLeads(json.leads || []);
  }

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (tab === 'leads') fetchLeads();
  }, [tab]);

  async function toggleClient(clientId, isActive) {
    await fetch('/api/admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'toggle_client', client_id: clientId, is_active: !isActive }),
    });
    fetchData();
  }

  async function updatePlan(clientId, plan) {
    await fetch('/api/admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'update_plan', client_id: clientId, plan }),
    });
    fetchData();
  }

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <div className="text-gray-500">Loading admin panel...</div>
        </div>
      </div>
    );
  }

  const { clients = [], stats = {} } = data || {};

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gray-900 rounded-lg flex items-center justify-center text-white font-bold text-sm">SL</div>
            <span className="font-bold text-gray-900">StaffLenz Admin</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex bg-gray-100 rounded-lg p-1 gap-1 text-sm">
              {['overview', 'clients', 'leads'].map((t) => (
                <button key={t} onClick={() => setTab(t)} className={`px-3 py-1.5 rounded-md font-medium capitalize transition-colors ${tab === t ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
                  {t}
                </button>
              ))}
            </div>
            <button onClick={handleLogout} className="text-sm text-red-600 hover:underline">Sign Out</button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {tab === 'overview' && (
          <>
            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              {[
                { label: 'Total Clients', value: stats.total_clients || 0, icon: '🏢' },
                { label: 'Active Workers', value: stats.total_workers || 0, icon: '👷' },
                { label: 'Events Today', value: stats.events_today || 0, icon: '⚡' },
                { label: 'New Leads', value: stats.new_leads || 0, icon: '📋', action: () => setTab('leads') },
              ].map((s) => (
                <button key={s.label} onClick={s.action} className={`card p-5 text-left ${s.action ? 'hover:shadow-md transition-shadow cursor-pointer' : ''}`}>
                  <div className="text-2xl mb-1">{s.icon}</div>
                  <div className="text-2xl font-bold text-gray-900">{s.value}</div>
                  <div className="text-sm text-gray-500">{s.label}</div>
                </button>
              ))}
            </div>
            {/* Quick client list */}
            <div className="card overflow-hidden">
              <div className="flex items-center justify-between p-5 border-b border-gray-100">
                <h2 className="font-semibold text-gray-900">All Clients</h2>
                <button onClick={() => setAddModal(true)} className="btn-primary text-sm">+ Add Client</button>
              </div>
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="text-left py-3 px-5 font-medium text-gray-600">Client</th>
                    <th className="text-left py-3 px-5 font-medium text-gray-600 hidden sm:table-cell">Industry</th>
                    <th className="text-left py-3 px-5 font-medium text-gray-600">Plan</th>
                    <th className="text-right py-3 px-5 font-medium text-gray-600 hidden md:table-cell">Today</th>
                    <th className="text-left py-3 px-5 font-medium text-gray-600">Status</th>
                    <th className="text-right py-3 px-5 font-medium text-gray-600">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {clients.map((c) => (
                    <tr key={c.id} className="hover:bg-gray-50">
                      <td className="py-3 px-5">
                        <div className="font-medium text-gray-900">{c.name}</div>
                        <div className="text-xs text-gray-400">{new Date(c.created_at).toLocaleDateString('en-IN')}</div>
                      </td>
                      <td className="py-3 px-5 hidden sm:table-cell">
                        <span>{INDUSTRY_ICONS[c.industry]} {c.industry}</span>
                      </td>
                      <td className="py-3 px-5">
                        <select
                          className="text-xs border border-gray-200 rounded px-2 py-1 bg-white"
                          value={c.plan}
                          onChange={(e) => updatePlan(c.id, e.target.value)}
                        >
                          {PLANS.map((p) => <option key={p} value={p}>{p.charAt(0).toUpperCase()+p.slice(1)}</option>)}
                        </select>
                      </td>
                      <td className="py-3 px-5 text-right hidden md:table-cell">
                        <span className="text-blue-600">{c.today?.total_events || 0} events</span>
                      </td>
                      <td className="py-3 px-5">
                        <span className={c.is_active ? 'badge-green' : 'badge-red'}>
                          {c.is_active ? 'Active' : 'Suspended'}
                        </span>
                      </td>
                      <td className="py-3 px-5 text-right">
                        <button
                          onClick={() => toggleClient(c.id, c.is_active)}
                          className={`text-xs ${c.is_active ? 'text-red-500 hover:underline' : 'text-green-600 hover:underline'}`}
                        >
                          {c.is_active ? 'Suspend' : 'Activate'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {clients.length === 0 && (
                <div className="py-12 text-center text-gray-400">
                  No clients yet. <button onClick={() => setAddModal(true)} className="text-blue-600 hover:underline">Add the first one →</button>
                </div>
              )}
            </div>
          </>
        )}

        {tab === 'clients' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-2xl font-bold text-gray-900">Client Management</h1>
              <button onClick={() => setAddModal(true)} className="btn-primary">+ Add Client</button>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {clients.map((c) => (
                <div key={c.id} className="card p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="font-semibold text-gray-900 mb-0.5">{c.name}</div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm">{INDUSTRY_ICONS[c.industry]}</span>
                        <span className="text-sm text-gray-500 capitalize">{c.industry}</span>
                      </div>
                    </div>
                    <span className={PLAN_COLORS[c.plan] || 'badge-gray'}>{c.plan}</span>
                  </div>
                  <div className="text-xs text-gray-500 mb-3 font-mono">{c.id}</div>
                  <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 mb-4">
                    <div>📊 {c.today?.total_events || 0} events today</div>
                    <div>👥 {c.today?.present_count || 0} present</div>
                  </div>
                  <div className="flex items-center gap-2 pt-3 border-t border-gray-100">
                    <select
                      className="text-xs border border-gray-200 rounded px-2 py-1 flex-1 bg-white"
                      value={c.plan}
                      onChange={(e) => updatePlan(c.id, e.target.value)}
                    >
                      {PLANS.map((p) => <option key={p} value={p}>{p.charAt(0).toUpperCase()+p.slice(1)} — {PLAN_PRICES[p]}/mo</option>)}
                    </select>
                    <button
                      onClick={() => toggleClient(c.id, c.is_active)}
                      className={`text-xs px-2 py-1 rounded ${c.is_active ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}
                    >
                      {c.is_active ? 'Suspend' : 'Activate'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'leads' && (
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-6">Demo Leads</h1>
            <div className="card overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Name</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Email</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600 hidden sm:table-cell">Company</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600 hidden md:table-cell">Industry</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {leads.map((lead) => (
                    <tr key={lead.id} className="hover:bg-gray-50">
                      <td className="py-3 px-4 font-medium text-gray-900">{lead.name}</td>
                      <td className="py-3 px-4 text-gray-600">{lead.email}</td>
                      <td className="py-3 px-4 text-gray-500 hidden sm:table-cell">{lead.company || '—'}</td>
                      <td className="py-3 px-4 text-gray-500 hidden md:table-cell capitalize">{lead.industry || '—'}</td>
                      <td className="py-3 px-4 text-gray-400 text-xs">
                        {new Date(lead.created_at).toLocaleDateString('en-IN')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {leads.length === 0 && (
                <div className="py-12 text-center text-gray-400">No leads yet.</div>
              )}
            </div>
          </div>
        )}
      </main>

      {addModal && (
        <AddClientModal
          onClose={() => setAddModal(false)}
          onSave={() => { setAddModal(false); fetchData(); }}
        />
      )}
      {resetModal && (
        <ResetPasswordModal
          user={resetModal}
          onClose={() => setResetModal(null)}
        />
      )}
    </div>
  );
}
