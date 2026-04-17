'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

/* ─── Constants ─────────────────────────────────────────────────────────── */
const ALL_INDUSTRIES = ['factory','hotel','school','retail','hospital','construction','warehouse','restaurant','security'];
const INDUSTRY_ICONS = {factory:'🏭',hotel:'🏨',school:'🏫',retail:'🛍️',hospital:'🏥',construction:'🏗️',warehouse:'📦',restaurant:'🍽️',security:'🔒'};
const PLANS = ['starter','professional','enterprise'];
const PLAN_COLORS = {starter:'bg-gray-100 text-gray-700',professional:'bg-blue-100 text-blue-700',enterprise:'bg-violet-100 text-violet-700'};
const ALL_TABS = ['overview','clients','leads','partners','affiliates','white labels','revenue','monitoring','lenzai devices','system','demo view'];

/* ─── Shared helpers ─────────────────────────────────────────────────────── */
function cap(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : ''; }

function Spinner() {
  return (
    <div className="flex items-center justify-center py-16">
      <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function Empty({ msg }) {
  return <div className="py-16 text-center text-gray-400 text-sm">{msg}</div>;
}

function StatusBadge({ active }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${active ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'}`}>
      {active ? 'Active' : 'Suspended'}
    </span>
  );
}

function AppStatusBadge({ status }) {
  const map = {
    pending:  'bg-amber-100 text-amber-700',
    approved: 'bg-emerald-100 text-emerald-700',
    rejected: 'bg-red-100 text-red-600',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${map[status] || 'bg-gray-100 text-gray-600'}`}>
      {cap(status || 'unknown')}
    </span>
  );
}

/* ─── Modal shell ────────────────────────────────────────────────────────── */
function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md my-4">
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

/* ─── Add Client Modal ───────────────────────────────────────────────────── */
function AddClientModal({ onClose, onSave }) {
  const [form, setForm] = useState({
    name: '', industry: 'factory', plan: 'starter',
    admin_email: '', admin_password: '', admin_name: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function f(k, v) { setForm(p => ({ ...p, [k]: v })); }

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
    if (!res.ok) { setError(data.error || 'Failed to create client'); setLoading(false); return; }
    onSave(data.client);
  }

  return (
    <Modal title="Add New Client" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Company Name *</label>
          <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={form.name} onChange={e => f('name', e.target.value)} required />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Industry</label>
            <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={form.industry} onChange={e => f('industry', e.target.value)}>
              {ALL_INDUSTRIES.map(i => <option key={i} value={i}>{INDUSTRY_ICONS[i]} {cap(i)}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Plan</label>
            <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={form.plan} onChange={e => f('plan', e.target.value)}>
              {PLANS.map(p => <option key={p} value={p}>{cap(p)}</option>)}
            </select>
          </div>
        </div>
        <hr className="border-gray-100" />
        <p className="text-sm font-medium text-gray-700">Admin Account</p>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Admin Email *</label>
          <input type="email" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={form.admin_email} onChange={e => f('admin_email', e.target.value)} required />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password *</label>
            <input type="password" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" minLength={8} value={form.admin_password} onChange={e => f('admin_password', e.target.value)} required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Admin Name</label>
            <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={form.admin_name} onChange={e => f('admin_name', e.target.value)} />
          </div>
        </div>
        <div className="flex gap-3 pt-1">
          <button type="button" onClick={onClose} className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
          <button type="submit" className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50" disabled={loading}>
            {loading ? 'Creating…' : 'Create Client'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

/* ─── Reset Password Modal ───────────────────────────────────────────────── */
function ResetPasswordModal({ user, onClose }) {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const res = await fetch('/api/admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'reset_password', user_id: user.id, new_password: password }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error || 'Reset failed'); setLoading(false); return; }
    setDone(true);
    setLoading(false);
  }

  return (
    <Modal title="Reset Password" onClose={onClose}>
      {done ? (
        <div className="text-center py-4">
          <div className="text-4xl mb-3">✅</div>
          <p className="text-gray-700 mb-5">Password reset successfully. All active sessions have been invalidated.</p>
          <button onClick={onClose} className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">Done</button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>}
          <p className="text-sm text-gray-500">Setting new password for <strong>{user.email}</strong></p>
          <input type="password" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="New password (min 8 chars)" minLength={8} value={password} onChange={e => setPassword(e.target.value)} required />
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
            <button type="submit" className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50" disabled={loading}>
              {loading ? 'Resetting…' : 'Reset Password'}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}

/* ─── Add Affiliate Modal ────────────────────────────────────────────────── */
function AddAffiliateModal({ onClose, onSave }) {
  const [form, setForm] = useState({
    name: '', email: '', company: '', code: '',
    partner_type: 'referral', commission_rate: 20, password: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function f(k, v) { setForm(p => ({ ...p, [k]: v })); }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const res = await fetch('/api/admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'create_affiliate', ...form, code: form.code.toUpperCase() }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error || 'Failed to create affiliate'); setLoading(false); return; }
    onSave();
  }

  return (
    <Modal title="Add Affiliate" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>}
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
            <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={form.name} onChange={e => f('name', e.target.value)} required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
            <input type="email" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={form.email} onChange={e => f('email', e.target.value)} required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Company</label>
            <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={form.company} onChange={e => f('company', e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Affiliate Code *</label>
            <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-blue-500" value={form.code} onChange={e => f('code', e.target.value.toUpperCase())} required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Partner Type</label>
            <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={form.partner_type} onChange={e => f('partner_type', e.target.value)}>
              <option value="referral">Referral</option>
              <option value="reseller">Reseller</option>
              <option value="white_label">White Label</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Commission %</label>
            <input type="number" min={0} max={100} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={form.commission_rate} onChange={e => f('commission_rate', e.target.value)} />
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Password *</label>
            <input type="password" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" minLength={8} value={form.password} onChange={e => f('password', e.target.value)} required />
          </div>
        </div>
        <div className="flex gap-3 pt-1">
          <button type="button" onClick={onClose} className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
          <button type="submit" className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50" disabled={loading}>
            {loading ? 'Creating…' : 'Create Affiliate'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

/* ─── Add WL Admin Modal ─────────────────────────────────────────────────── */
function AddWLAdminModal({ onClose, onSave }) {
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function f(k, v) { setForm(p => ({ ...p, [k]: v })); }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const res = await fetch('/api/admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'create_white_label_admin', ...form }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error || 'Failed'); setLoading(false); return; }
    onSave();
  }

  return (
    <Modal title="Add White Label Admin" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
          <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={form.name} onChange={e => f('name', e.target.value)} required />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
          <input type="email" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={form.email} onChange={e => f('email', e.target.value)} required />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Password *</label>
          <input type="password" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" minLength={8} value={form.password} onChange={e => f('password', e.target.value)} required />
        </div>
        <div className="flex gap-3 pt-1">
          <button type="button" onClick={onClose} className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
          <button type="submit" className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50" disabled={loading}>
            {loading ? 'Creating…' : 'Create WL Admin'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

/* ─── Tab: Overview ──────────────────────────────────────────────────────── */
function OverviewTab({ data, onAddClient, onResetPassword, onToggleClient, onUpdatePlan, onGoToLeads }) {
  const { clients = [], stats = {} } = data || {};
  const recent = clients.slice(0, 10);

  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total Clients',  value: stats.total_clients  || 0, icon: '🏢', action: null },
          { label: 'Active Workers', value: stats.total_workers  || 0, icon: '👷', action: null },
          { label: 'Events Today',   value: stats.events_today   || 0, icon: '⚡', action: null },
          { label: 'New Leads',      value: stats.new_leads      || 0, icon: '📋', action: onGoToLeads },
        ].map(s => (
          <div key={s.label} onClick={s.action || undefined} className={`bg-white border border-gray-100 rounded-xl p-5 ${s.action ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}`}>
            <div className="text-2xl mb-1">{s.icon}</div>
            <div className="text-3xl font-bold text-gray-900">{s.value}</div>
            <div className="text-sm text-gray-500 mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Recent Clients</h2>
          <button onClick={onAddClient} className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg font-medium hover:bg-blue-700">+ Add Client</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left py-3 px-5 font-medium text-gray-500">Client</th>
                <th className="text-left py-3 px-5 font-medium text-gray-500 hidden sm:table-cell">Industry</th>
                <th className="text-left py-3 px-5 font-medium text-gray-500">Plan</th>
                <th className="text-right py-3 px-5 font-medium text-gray-500 hidden md:table-cell">Today</th>
                <th className="text-left py-3 px-5 font-medium text-gray-500">Status</th>
                <th className="text-right py-3 px-5 font-medium text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {recent.map(c => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="py-3 px-5">
                    <div className="font-medium text-gray-900">{c.name}</div>
                    <div className="text-xs text-gray-400">{new Date(c.created_at).toLocaleDateString()}</div>
                  </td>
                  <td className="py-3 px-5 hidden sm:table-cell text-gray-600">{INDUSTRY_ICONS[c.industry]} {cap(c.industry)}</td>
                  <td className="py-3 px-5">
                    <select
                      className="text-xs border border-gray-200 rounded-md px-2 py-1 bg-white focus:outline-none"
                      value={c.plan}
                      onChange={e => onUpdatePlan(c.id, e.target.value)}
                    >
                      {PLANS.map(p => <option key={p} value={p}>{cap(p)}</option>)}
                    </select>
                  </td>
                  <td className="py-3 px-5 text-right hidden md:table-cell text-blue-600">{c.today?.total_events || 0} events</td>
                  <td className="py-3 px-5"><StatusBadge active={c.is_active} /></td>
                  <td className="py-3 px-5 text-right">
                    <button onClick={() => onToggleClient(c.id, c.is_active)} className={`text-xs font-medium hover:underline ${c.is_active ? 'text-red-500' : 'text-emerald-600'}`}>
                      {c.is_active ? 'Suspend' : 'Activate'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {recent.length === 0 && <Empty msg="No clients yet. Add your first one above." />}
        </div>
      </div>
    </>
  );
}

/* ─── Tab: Clients ───────────────────────────────────────────────────────── */
function ClientsTab({ data, onAddClient, onResetPassword, onToggleClient, onUpdatePlan }) {
  const { clients = [] } = data || {};

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Client Management</h1>
        <button onClick={onAddClient} className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg font-medium hover:bg-blue-700">+ Add Client</button>
      </div>
      <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left py-3 px-5 font-medium text-gray-500">Name</th>
                <th className="text-left py-3 px-5 font-medium text-gray-500 hidden sm:table-cell">Industry</th>
                <th className="text-left py-3 px-5 font-medium text-gray-500">Plan</th>
                <th className="text-right py-3 px-5 font-medium text-gray-500 hidden md:table-cell">Workers</th>
                <th className="text-right py-3 px-5 font-medium text-gray-500 hidden md:table-cell">Events</th>
                <th className="text-right py-3 px-5 font-medium text-gray-500 hidden lg:table-cell">Violations</th>
                <th className="text-left py-3 px-5 font-medium text-gray-500">Status</th>
                <th className="text-right py-3 px-5 font-medium text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {clients.map(c => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="py-3 px-5">
                    <div className="font-medium text-gray-900">{c.name}</div>
                    <div className="text-xs text-gray-400">{new Date(c.created_at).toLocaleDateString()}</div>
                  </td>
                  <td className="py-3 px-5 hidden sm:table-cell text-gray-600">{INDUSTRY_ICONS[c.industry]} {cap(c.industry)}</td>
                  <td className="py-3 px-5">
                    <select
                      className={`text-xs rounded-md px-2 py-1 border-0 font-medium cursor-pointer focus:outline-none ${PLAN_COLORS[c.plan] || 'bg-gray-100 text-gray-700'}`}
                      value={c.plan}
                      onChange={e => onUpdatePlan(c.id, e.target.value)}
                    >
                      {PLANS.map(p => <option key={p} value={p}>{cap(p)}</option>)}
                    </select>
                  </td>
                  <td className="py-3 px-5 text-right hidden md:table-cell text-gray-600">{c.today?.present_count || 0}</td>
                  <td className="py-3 px-5 text-right hidden md:table-cell text-blue-600">{c.today?.total_events || 0}</td>
                  <td className="py-3 px-5 text-right hidden lg:table-cell">
                    {(c.violations || 0) > 0
                      ? <span className="text-red-500 font-medium">{c.violations}</span>
                      : <span className="text-gray-400">0</span>
                    }
                  </td>
                  <td className="py-3 px-5"><StatusBadge active={c.is_active} /></td>
                  <td className="py-3 px-5 text-right flex items-center justify-end gap-3">
                    <button onClick={() => onResetPassword(c)} className="text-xs text-gray-500 hover:text-gray-800 hover:underline whitespace-nowrap">Reset PW</button>
                    <button onClick={() => onToggleClient(c.id, c.is_active)} className={`text-xs font-medium hover:underline whitespace-nowrap ${c.is_active ? 'text-red-500' : 'text-emerald-600'}`}>
                      {c.is_active ? 'Suspend' : 'Activate'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {clients.length === 0 && <Empty msg="No clients yet. Click '+ Add Client' to create the first one." />}
        </div>
      </div>
    </>
  );
}

/* ─── Tab: Leads ─────────────────────────────────────────────────────────── */
function LeadsTab() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin?view=leads')
      .then(r => r.json())
      .then(d => { setLeads(d.leads || []); setLoading(false); });
  }, []);

  if (loading) return <Spinner />;

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Demo Leads</h1>
        <span className="text-sm text-gray-500">{leads.length} total</span>
      </div>
      <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left py-3 px-5 font-medium text-gray-500">Name</th>
                <th className="text-left py-3 px-5 font-medium text-gray-500">Email</th>
                <th className="text-left py-3 px-5 font-medium text-gray-500 hidden sm:table-cell">Company</th>
                <th className="text-left py-3 px-5 font-medium text-gray-500 hidden md:table-cell">Industry</th>
                <th className="text-left py-3 px-5 font-medium text-gray-500 hidden lg:table-cell">Message</th>
                <th className="text-left py-3 px-5 font-medium text-gray-500">Affiliate</th>
                <th className="text-left py-3 px-5 font-medium text-gray-500">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {leads.map(lead => (
                <tr key={lead.id} className="hover:bg-gray-50">
                  <td className="py-3 px-5 font-medium text-gray-900">{lead.name}</td>
                  <td className="py-3 px-5 text-gray-600">{lead.email}</td>
                  <td className="py-3 px-5 text-gray-500 hidden sm:table-cell">{lead.company || '—'}</td>
                  <td className="py-3 px-5 text-gray-500 hidden md:table-cell">
                    {lead.industry ? <>{INDUSTRY_ICONS[lead.industry]} {cap(lead.industry)}</> : '—'}
                  </td>
                  <td className="py-3 px-5 text-gray-400 hidden lg:table-cell max-w-xs truncate">
                    {lead.message ? lead.message.slice(0, 80) + (lead.message.length > 80 ? '…' : '') : '—'}
                  </td>
                  <td className="py-3 px-5">
                    {lead.affiliate_code
                      ? <span className="inline-block px-2 py-0.5 bg-amber-100 text-amber-700 rounded text-xs font-mono">{lead.affiliate_code}</span>
                      : <span className="text-gray-400">—</span>
                    }
                  </td>
                  <td className="py-3 px-5 text-gray-400 text-xs">{new Date(lead.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {leads.length === 0 && <Empty msg="No leads yet. Leads from the demo request form will appear here." />}
        </div>
      </div>
    </>
  );
}

/* ─── Tab: Partners ──────────────────────────────────────────────────────── */
function PartnersTab() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [actionLoading, setActionLoading] = useState(null);

  const fetchPartners = useCallback(() => {
    setLoading(true);
    fetch('/api/admin?view=partners')
      .then(r => r.json())
      .then(d => { setApplications(d.applications || []); setLoading(false); });
  }, []);

  useEffect(() => { fetchPartners(); }, [fetchPartners]);

  async function updateApplication(application_id, status) {
    setActionLoading(application_id + status);
    await fetch('/api/admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'update_application', application_id, status }),
    });
    setActionLoading(null);
    fetchPartners();
  }

  const displayed = filter === 'all' ? applications : applications.filter(a => a.status === filter);

  const partnerTypeBadge = type => {
    const map = { agency: 'bg-purple-100 text-purple-700', reseller: 'bg-blue-100 text-blue-700', referral: 'bg-green-100 text-green-700', white_label: 'bg-indigo-100 text-indigo-700' };
    return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${map[type] || 'bg-gray-100 text-gray-600'}`}>{cap(type?.replace('_', ' ') || 'unknown')}</span>;
  };

  if (loading) return <Spinner />;

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Partner Applications</h1>
        <span className="text-sm text-gray-500">{applications.length} total</span>
      </div>

      <div className="flex gap-2 mb-5">
        {['all','pending','approved','rejected'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${filter === f ? 'bg-gray-900 text-white' : 'bg-white text-gray-500 border border-gray-200 hover:border-gray-300'}`}
          >
            {cap(f)} {f === 'all' ? `(${applications.length})` : `(${applications.filter(a => a.status === f).length})`}
          </button>
        ))}
      </div>

      <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left py-3 px-5 font-medium text-gray-500">Name</th>
                <th className="text-left py-3 px-5 font-medium text-gray-500">Email</th>
                <th className="text-left py-3 px-5 font-medium text-gray-500 hidden sm:table-cell">Company</th>
                <th className="text-left py-3 px-5 font-medium text-gray-500 hidden md:table-cell">Type</th>
                <th className="text-left py-3 px-5 font-medium text-gray-500 hidden lg:table-cell">Industry Focus</th>
                <th className="text-left py-3 px-5 font-medium text-gray-500 hidden xl:table-cell">How Heard</th>
                <th className="text-left py-3 px-5 font-medium text-gray-500">Status</th>
                <th className="text-left py-3 px-5 font-medium text-gray-500">Date</th>
                <th className="text-right py-3 px-5 font-medium text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {displayed.map(a => (
                <tr key={a.id} className="hover:bg-gray-50">
                  <td className="py-3 px-5 font-medium text-gray-900">{a.name}</td>
                  <td className="py-3 px-5 text-gray-600">{a.email}</td>
                  <td className="py-3 px-5 text-gray-500 hidden sm:table-cell">{a.company || '—'}</td>
                  <td className="py-3 px-5 hidden md:table-cell">{partnerTypeBadge(a.partner_type)}</td>
                  <td className="py-3 px-5 text-gray-500 hidden lg:table-cell capitalize">{a.industry_focus || '—'}</td>
                  <td className="py-3 px-5 text-gray-500 hidden xl:table-cell">{a.how_heard || '—'}</td>
                  <td className="py-3 px-5"><AppStatusBadge status={a.status} /></td>
                  <td className="py-3 px-5 text-gray-400 text-xs">{new Date(a.created_at).toLocaleDateString()}</td>
                  <td className="py-3 px-5 text-right">
                    {a.status === 'pending' && (
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => updateApplication(a.id, 'approved')}
                          disabled={actionLoading === a.id + 'approved'}
                          className="px-2.5 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded text-xs font-medium disabled:opacity-50"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => updateApplication(a.id, 'rejected')}
                          disabled={actionLoading === a.id + 'rejected'}
                          className="px-2.5 py-1 bg-red-50 text-red-600 hover:bg-red-100 rounded text-xs font-medium disabled:opacity-50"
                        >
                          Reject
                        </button>
                      </div>
                    )}
                    {a.status !== 'pending' && <span className="text-xs text-gray-400">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {displayed.length === 0 && <Empty msg={filter === 'all' ? 'No partner applications yet.' : `No ${filter} applications.`} />}
        </div>
      </div>
    </>
  );
}

/* ─── Tab: Affiliates ────────────────────────────────────────────────────── */
function AffiliatesTab() {
  const [affiliates, setAffiliates] = useState([]);
  const [conversions, setConversions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addModal, setAddModal] = useState(false);
  const [commissionAmounts, setCommissionAmounts] = useState({});
  const [payingId, setPayingId] = useState(null);

  const fetchAffiliates = useCallback(() => {
    fetch('/api/admin?view=affiliates')
      .then(r => r.json())
      .then(d => {
        setAffiliates(d.affiliates || []);
        setConversions(d.conversions || []);
        setLoading(false);
      });
  }, []);

  useEffect(() => { fetchAffiliates(); }, [fetchAffiliates]);

  async function toggleAffiliate(affiliate_id, currentStatus) {
    const status = currentStatus === 'active' ? 'paused' : 'active';
    await fetch('/api/admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'update_affiliate', affiliate_id, status }),
    });
    fetchAffiliates();
  }

  async function markPaid(conversion_id) {
    setPayingId(conversion_id);
    const commission_amount = commissionAmounts[conversion_id] || 0;
    await fetch('/api/admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'mark_conversion_paid', conversion_id, commission_amount }),
    });
    setPayingId(null);
    fetchAffiliates();
  }

  if (loading) return <Spinner />;

  return (
    <>
      {/* Affiliates Table */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-gray-900">Affiliates</h1>
        <button onClick={() => setAddModal(true)} className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg font-medium hover:bg-blue-700">+ Add Affiliate</button>
      </div>

      <div className="bg-white border border-gray-100 rounded-xl overflow-hidden mb-8">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left py-3 px-5 font-medium text-gray-500">Name</th>
                <th className="text-left py-3 px-5 font-medium text-gray-500">Email</th>
                <th className="text-left py-3 px-5 font-medium text-gray-500">Code</th>
                <th className="text-left py-3 px-5 font-medium text-gray-500 hidden md:table-cell">Type</th>
                <th className="text-right py-3 px-5 font-medium text-gray-500 hidden md:table-cell">Commission%</th>
                <th className="text-right py-3 px-5 font-medium text-gray-500 hidden lg:table-cell">Clicks</th>
                <th className="text-right py-3 px-5 font-medium text-gray-500 hidden lg:table-cell">Conversions</th>
                <th className="text-right py-3 px-5 font-medium text-gray-500 hidden lg:table-cell">Earnings</th>
                <th className="text-left py-3 px-5 font-medium text-gray-500">Status</th>
                <th className="text-right py-3 px-5 font-medium text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {affiliates.map(a => (
                <tr key={a.id} className="hover:bg-gray-50">
                  <td className="py-3 px-5 font-medium text-gray-900">{a.name}</td>
                  <td className="py-3 px-5 text-gray-600">{a.email}</td>
                  <td className="py-3 px-5">
                    <span className="font-mono text-xs px-2 py-1 bg-amber-50 text-amber-700 rounded">{a.code}</span>
                  </td>
                  <td className="py-3 px-5 hidden md:table-cell text-gray-500 capitalize">{a.partner_type?.replace('_', ' ') || '—'}</td>
                  <td className="py-3 px-5 text-right hidden md:table-cell text-gray-600">{a.commission_rate || 0}%</td>
                  <td className="py-3 px-5 text-right hidden lg:table-cell text-gray-600">{a.clicks || 0}</td>
                  <td className="py-3 px-5 text-right hidden lg:table-cell text-gray-600">{a.conversions || 0}</td>
                  <td className="py-3 px-5 text-right hidden lg:table-cell font-medium text-gray-900">${(a.earnings || 0).toFixed(2)}</td>
                  <td className="py-3 px-5">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${a.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}>
                      {a.status === 'active' ? 'Active' : 'Paused'}
                    </span>
                  </td>
                  <td className="py-3 px-5 text-right">
                    <button
                      onClick={() => toggleAffiliate(a.id, a.status)}
                      className={`text-xs font-medium hover:underline ${a.status === 'active' ? 'text-amber-600' : 'text-emerald-600'}`}
                    >
                      {a.status === 'active' ? 'Pause' : 'Activate'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {affiliates.length === 0 && <Empty msg="No affiliates yet. Add one to get started." />}
        </div>
      </div>

      {/* Conversions Table */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-900">Affiliate Conversions</h2>
        <span className="text-sm text-gray-500">{conversions.length} total</span>
      </div>

      <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left py-3 px-5 font-medium text-gray-500">Date</th>
                <th className="text-left py-3 px-5 font-medium text-gray-500">Affiliate Code</th>
                <th className="text-left py-3 px-5 font-medium text-gray-500">Lead Name</th>
                <th className="text-left py-3 px-5 font-medium text-gray-500 hidden md:table-cell">Lead Email</th>
                <th className="text-left py-3 px-5 font-medium text-gray-500 hidden md:table-cell">Type</th>
                <th className="text-right py-3 px-5 font-medium text-gray-500 hidden lg:table-cell">Commission</th>
                <th className="text-left py-3 px-5 font-medium text-gray-500">Status</th>
                <th className="text-right py-3 px-5 font-medium text-gray-500">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {conversions.map(c => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="py-3 px-5 text-gray-400 text-xs">{new Date(c.created_at).toLocaleDateString()}</td>
                  <td className="py-3 px-5">
                    <span className="font-mono text-xs px-2 py-0.5 bg-amber-50 text-amber-700 rounded">{c.affiliate_code}</span>
                  </td>
                  <td className="py-3 px-5 font-medium text-gray-900">{c.lead_name}</td>
                  <td className="py-3 px-5 text-gray-500 hidden md:table-cell">{c.lead_email}</td>
                  <td className="py-3 px-5 text-gray-500 hidden md:table-cell capitalize">{c.conversion_type || '—'}</td>
                  <td className="py-3 px-5 text-right hidden lg:table-cell text-gray-700">${(c.commission_amount || 0).toFixed(2)}</td>
                  <td className="py-3 px-5">
                    <AppStatusBadge status={c.status} />
                  </td>
                  <td className="py-3 px-5 text-right">
                    {c.status === 'pending' ? (
                      <div className="flex items-center justify-end gap-2">
                        <span className="text-gray-400 text-xs">$</span>
                        <input
                          type="number"
                          min={0}
                          step={0.01}
                          className="w-20 border border-gray-200 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                          value={commissionAmounts[c.id] || ''}
                          onChange={e => setCommissionAmounts(prev => ({ ...prev, [c.id]: e.target.value }))}
                          placeholder="0.00"
                        />
                        <button
                          onClick={() => markPaid(c.id)}
                          disabled={payingId === c.id}
                          className="px-2.5 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded text-xs font-medium disabled:opacity-50 whitespace-nowrap"
                        >
                          {payingId === c.id ? '…' : 'Mark Paid'}
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {conversions.length === 0 && <Empty msg="No affiliate conversions recorded yet." />}
        </div>
      </div>

      {addModal && <AddAffiliateModal onClose={() => setAddModal(false)} onSave={() => { setAddModal(false); fetchAffiliates(); }} />}
    </>
  );
}

/* ─── Tab: White Labels ──────────────────────────────────────────────────── */
function WhiteLabelsTab() {
  const [wlAdmins, setWlAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addModal, setAddModal] = useState(false);
  const [resetModal, setResetModal] = useState(null);

  const fetchWL = useCallback(() => {
    fetch('/api/admin?view=white_labels')
      .then(r => r.json())
      .then(d => { setWlAdmins(d.white_label_admins || d.admins || []); setLoading(false); });
  }, []);

  useEffect(() => { fetchWL(); }, [fetchWL]);

  if (loading) return <Spinner />;

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">White Label Accounts</h1>
        <button onClick={() => setAddModal(true)} className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg font-medium hover:bg-blue-700">+ Add WL Admin</button>
      </div>

      <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left py-3 px-5 font-medium text-gray-500">Name</th>
                <th className="text-left py-3 px-5 font-medium text-gray-500">Email</th>
                <th className="text-right py-3 px-5 font-medium text-gray-500 hidden md:table-cell">Sub-clients</th>
                <th className="text-left py-3 px-5 font-medium text-gray-500">Status</th>
                <th className="text-left py-3 px-5 font-medium text-gray-500 hidden sm:table-cell">Created</th>
                <th className="text-right py-3 px-5 font-medium text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {wlAdmins.map(a => (
                <tr key={a.id} className="hover:bg-gray-50">
                  <td className="py-3 px-5 font-medium text-gray-900">{a.name}</td>
                  <td className="py-3 px-5 text-gray-600">{a.email}</td>
                  <td className="py-3 px-5 text-right hidden md:table-cell text-gray-600">{a.sub_clients_count || 0}</td>
                  <td className="py-3 px-5">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">Active</span>
                  </td>
                  <td className="py-3 px-5 text-gray-400 text-xs hidden sm:table-cell">{new Date(a.created_at).toLocaleDateString()}</td>
                  <td className="py-3 px-5 text-right">
                    <button onClick={() => setResetModal(a)} className="text-xs text-gray-500 hover:text-gray-800 hover:underline">Reset Password</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {wlAdmins.length === 0 && <Empty msg="No white label admins yet. Add one to get started." />}
        </div>
      </div>

      {addModal && <AddWLAdminModal onClose={() => setAddModal(false)} onSave={() => { setAddModal(false); fetchWL(); }} />}
      {resetModal && <ResetPasswordModal user={resetModal} onClose={() => setResetModal(null)} />}
    </>
  );
}

/* ─── Tab: Revenue ───────────────────────────────────────────────────────── */
function RevenueTab() {
  const [rev, setRev] = useState(null);
  const [loading, setLoading] = useState(true);
  const [commissionAmounts, setCommissionAmounts] = useState({});
  const [payingId, setPayingId] = useState(null);

  const fetchRevenue = useCallback(() => {
    fetch('/api/admin?view=revenue')
      .then(r => r.json())
      .then(d => { setRev(d); setLoading(false); });
  }, []);

  useEffect(() => { fetchRevenue(); }, [fetchRevenue]);

  async function payCommission(conversion_id) {
    setPayingId(conversion_id);
    const commission_amount = commissionAmounts[conversion_id] || 0;
    await fetch('/api/admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'mark_conversion_paid', conversion_id, commission_amount }),
    });
    setPayingId(null);
    fetchRevenue();
  }

  if (loading) return <Spinner />;

  const { mrr = 0, arr = 0, active_clients = 0, affiliate_paid = 0, by_plan = {}, by_industry = {}, pending_commissions = [] } = rev || {};

  const planColors = { starter: 'bg-gray-400', professional: 'bg-blue-500', enterprise: 'bg-violet-500' };
  const industryColors = ['bg-rose-400','bg-orange-400','bg-amber-400','bg-yellow-400','bg-lime-400','bg-emerald-400','bg-teal-400','bg-cyan-400','bg-blue-400'];

  const maxPlan = Math.max(1, ...Object.values(by_plan));
  const maxInd  = Math.max(1, ...Object.values(by_industry));

  return (
    <>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Revenue Overview</h1>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'MRR',            value: `$${mrr.toLocaleString()}`,            sub: 'Monthly Recurring Revenue' },
          { label: 'ARR',            value: `$${arr.toLocaleString()}`,            sub: 'Annual Recurring Revenue' },
          { label: 'Active Clients', value: active_clients,                        sub: 'Paying subscribers' },
          { label: 'Affiliate Paid', value: `$${(affiliate_paid||0).toFixed(2)}`, sub: 'Total commissions paid' },
        ].map(s => (
          <div key={s.label} className="bg-white border border-gray-100 rounded-xl p-5">
            <div className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-1">{s.label}</div>
            <div className="text-3xl font-bold text-gray-900">{s.value}</div>
            <div className="text-xs text-gray-400 mt-0.5">{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Breakdown charts */}
      <div className="grid md:grid-cols-2 gap-6 mb-8">
        {/* By Plan */}
        <div className="bg-white border border-gray-100 rounded-xl p-5">
          <h3 className="font-semibold text-gray-900 mb-4">Clients by Plan</h3>
          <div className="space-y-3">
            {PLANS.map(p => {
              const count = by_plan[p] || 0;
              const pct = Math.round((count / maxPlan) * 100);
              return (
                <div key={p}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="capitalize text-gray-700">{cap(p)}</span>
                    <span className="font-medium text-gray-900">{count}</span>
                  </div>
                  <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className={`h-full ${planColors[p] || 'bg-gray-400'} rounded-full`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* By Industry */}
        <div className="bg-white border border-gray-100 rounded-xl p-5">
          <h3 className="font-semibold text-gray-900 mb-4">Clients by Industry</h3>
          <div className="space-y-3">
            {ALL_INDUSTRIES.map((ind, idx) => {
              const count = by_industry[ind] || 0;
              const pct = Math.round((count / maxInd) * 100);
              return (
                <div key={ind}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-gray-700">{INDUSTRY_ICONS[ind]} {cap(ind)}</span>
                    <span className="font-medium text-gray-900">{count}</span>
                  </div>
                  <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className={`h-full ${industryColors[idx % industryColors.length]} rounded-full`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Pending Commissions */}
      <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">Pending Commissions</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left py-3 px-5 font-medium text-gray-500">Date</th>
                <th className="text-left py-3 px-5 font-medium text-gray-500">Affiliate Code</th>
                <th className="text-left py-3 px-5 font-medium text-gray-500">Lead</th>
                <th className="text-right py-3 px-5 font-medium text-gray-500">Amount</th>
                <th className="text-right py-3 px-5 font-medium text-gray-500">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {pending_commissions.map(c => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="py-3 px-5 text-gray-400 text-xs">{new Date(c.created_at).toLocaleDateString()}</td>
                  <td className="py-3 px-5">
                    <span className="font-mono text-xs px-2 py-0.5 bg-amber-50 text-amber-700 rounded">{c.affiliate_code}</span>
                  </td>
                  <td className="py-3 px-5 text-gray-700">{c.lead_name}</td>
                  <td className="py-3 px-5 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <span className="text-gray-400 text-xs">$</span>
                      <input
                        type="number"
                        min={0}
                        step={0.01}
                        className="w-20 border border-gray-200 rounded px-2 py-1 text-xs text-right focus:outline-none focus:ring-1 focus:ring-blue-500"
                        value={commissionAmounts[c.id] || ''}
                        onChange={e => setCommissionAmounts(prev => ({ ...prev, [c.id]: e.target.value }))}
                        placeholder="0.00"
                      />
                    </div>
                  </td>
                  <td className="py-3 px-5 text-right">
                    <button
                      onClick={() => payCommission(c.id)}
                      disabled={payingId === c.id}
                      className="px-3 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded text-xs font-medium disabled:opacity-50"
                    >
                      {payingId === c.id ? 'Paying…' : 'Pay'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {pending_commissions.length === 0 && <Empty msg="No pending commissions. All clear!" />}
        </div>
      </div>
    </>
  );
}

/* ─── Tab: Monitoring ───────────────────────────────────────────────────── */
const ALL_PPE_OPTIONS = ['helmet', 'safety vest', 'gloves', 'safety boots', 'goggles', 'harness', 'hair net', 'apron', 'face mask'];
const AI_INDUSTRIES = ['factory', 'hotel', 'school', 'retail', 'gym', 'hospital', 'construction', 'warehouse', 'restaurant', 'security'];
const FREQUENCY_OPTIONS = [1, 2, 5, 10, 15, 30];
const SEVERITY_OPTIONS = ['low', 'medium', 'high'];

function MonitoringTab() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingZoneId, setEditingZoneId] = useState(null);
  const [zoneForm, setZoneForm] = useState({});
  const [clientForm, setClientForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [testResult, setTestResult] = useState(null);
  const [testingClientId, setTestingClientId] = useState(null);
  const [showPassword, setShowPassword] = useState({});

  // AI Analysis Config state
  const [aiConfigClientId, setAiConfigClientId] = useState(null);
  const [aiConfig, setAiConfig] = useState({});
  const [aiConfigSaving, setAiConfigSaving] = useState(false);
  const [aiConfigError, setAiConfigError] = useState('');
  const [promptPreview, setPromptPreview] = useState('');
  const [loadingPreview, setLoadingPreview] = useState(false);

  // Cost & Analytics state
  const [monitorStats, setMonitorStats] = useState(null);
  const [loadingStats, setLoadingStats] = useState(false);

  function reload() {
    fetch('/api/monitor/config')
      .then(r => r.json())
      .then(d => { setClients(d.clients || []); setLoading(false); })
      .catch(() => setLoading(false));
  }

  function loadStats() {
    setLoadingStats(true);
    fetch('/api/monitor/stats')
      .then(r => r.json())
      .then(d => { setMonitorStats(d.clients || []); setLoadingStats(false); })
      .catch(() => setLoadingStats(false));
  }

  useEffect(() => { reload(); loadStats(); }, []);

  function startEditZone(zone, client) {
    setEditingZoneId(zone.id);
    setZoneForm({
      camera_ip:       zone.camera_ip       || '',
      camera_username: zone.camera_username || '',
      camera_password: '',
    });
    setClientForm({
      site_name:             client.site_name             || '',
      industry:              client.industry              || '',
      camera_source:         client.camera_source         || 'onvif',
      hikconnect_account_id: client.hikconnect_account_id || '',
      dvr_host:              client.dvr_host              || '',
      dvr_port:              client.dvr_port              || 80,
      dvr_username:          client.dvr_username          || '',
      dvr_password:          '',
    });
    setError('');
    setTestResult(null);
  }

  async function handleSaveZone(zoneId, clientId) {
    setSaving(true);
    setError('');
    const res = await fetch('/api/monitor/config', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ zone_id: zoneId, client_id: clientId, ...zoneForm, ...clientForm }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) { setError(data.error || 'Save failed'); return; }
    setEditingZoneId(null);
    reload();
  }

  async function handleTest(clientId, source = 'ip') {
    setTestingClientId(clientId);
    setTestResult(null);
    const url = source === 'hik' ? '/api/hik/capture' : '/api/monitor/test';
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_id: clientId }),
    });
    const data = await res.json();
    setTestingClientId(null);
    setTestResult({ clientId, text: JSON.stringify(data, null, 2) });
  }

  function openAiConfig(client) {
    const cfg = client.analysis_config || {};
    setAiConfigClientId(client.id);
    setAiConfig({
      industry: cfg.industry || client.industry || 'factory',
      shift_start: cfg.shift_start || '06:00',
      shift_end: cfg.shift_end || '22:00',
      ppe_requirements: cfg.ppe_requirements || [],
      alert_rules: cfg.alert_rules || [],
      alert_severity_threshold: cfg.alert_severity_threshold || 'medium',
      whatsapp_number: cfg.whatsapp_number || '',
      analysis_frequency_minutes: cfg.analysis_frequency_minutes || 5,
      zones: cfg.zones || [],
    });
    setAiConfigError('');
    setPromptPreview('');
  }

  function updateAiConfig(key, value) {
    setAiConfig(prev => ({ ...prev, [key]: value }));
  }

  function togglePPE(item) {
    setAiConfig(prev => {
      const list = prev.ppe_requirements || [];
      return { ...prev, ppe_requirements: list.includes(item) ? list.filter(x => x !== item) : [...list, item] };
    });
  }

  function addAlertRule() {
    setAiConfig(prev => ({ ...prev, alert_rules: [...(prev.alert_rules || []), ''] }));
  }

  function updateAlertRule(idx, val) {
    setAiConfig(prev => {
      const rules = [...(prev.alert_rules || [])];
      rules[idx] = val;
      return { ...prev, alert_rules: rules };
    });
  }

  function removeAlertRule(idx) {
    setAiConfig(prev => {
      const rules = [...(prev.alert_rules || [])];
      rules.splice(idx, 1);
      return { ...prev, alert_rules: rules };
    });
  }

  function addZoneRule() {
    setAiConfig(prev => ({
      ...prev,
      zones: [...(prev.zones || []), { name: '', min_staff: 0, max_staff: 10, restricted: false, ppe_requirements: [], rules: [] }],
    }));
  }

  function updateZoneRule(idx, key, val) {
    setAiConfig(prev => {
      const zones = [...(prev.zones || [])];
      zones[idx] = { ...zones[idx], [key]: val };
      return { ...prev, zones };
    });
  }

  function removeZoneRule(idx) {
    setAiConfig(prev => {
      const zones = [...(prev.zones || [])];
      zones.splice(idx, 1);
      return { ...prev, zones };
    });
  }

  function toggleZonePPE(zoneIdx, item) {
    setAiConfig(prev => {
      const zones = [...(prev.zones || [])];
      const ppe = zones[zoneIdx].ppe_requirements || [];
      zones[zoneIdx] = { ...zones[zoneIdx], ppe_requirements: ppe.includes(item) ? ppe.filter(x => x !== item) : [...ppe, item] };
      return { ...prev, zones };
    });
  }

  function addZoneCustomRule(zoneIdx) {
    setAiConfig(prev => {
      const zones = [...(prev.zones || [])];
      zones[zoneIdx] = { ...zones[zoneIdx], rules: [...(zones[zoneIdx].rules || []), ''] };
      return { ...prev, zones };
    });
  }

  function updateZoneCustomRule(zoneIdx, ruleIdx, val) {
    setAiConfig(prev => {
      const zones = [...(prev.zones || [])];
      const rules = [...(zones[zoneIdx].rules || [])];
      rules[ruleIdx] = val;
      zones[zoneIdx] = { ...zones[zoneIdx], rules };
      return { ...prev, zones };
    });
  }

  function removeZoneCustomRule(zoneIdx, ruleIdx) {
    setAiConfig(prev => {
      const zones = [...(prev.zones || [])];
      const rules = [...(zones[zoneIdx].rules || [])];
      rules.splice(ruleIdx, 1);
      zones[zoneIdx] = { ...zones[zoneIdx], rules };
      return { ...prev, zones };
    });
  }

  async function handleSaveAiConfig(clientId) {
    setAiConfigSaving(true);
    setAiConfigError('');
    const cleanConfig = {
      ...aiConfig,
      alert_rules: (aiConfig.alert_rules || []).filter(r => r.trim() !== ''),
      zones: (aiConfig.zones || []).map(z => ({
        ...z,
        rules: (z.rules || []).filter(r => r.trim() !== ''),
      })),
    };
    const res = await fetch('/api/monitor/config', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_id: clientId, analysis_config: cleanConfig }),
    });
    const data = await res.json();
    setAiConfigSaving(false);
    if (!res.ok) { setAiConfigError(data.error || 'Save failed'); return; }
    setAiConfigClientId(null);
    reload();
  }

  async function handlePreviewPrompt(clientId) {
    setLoadingPreview(true);
    setPromptPreview('');
    const res = await fetch('/api/monitor/preview-prompt', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_id: clientId }),
    });
    const data = await res.json();
    setLoadingPreview(false);
    setPromptPreview(data.prompt || data.error || 'Failed to generate prompt');
  }

  if (loading) return <Spinner />;

  const statusColor = { normal: 'bg-emerald-500', warning: 'bg-amber-500', critical: 'bg-red-500', none: 'bg-gray-300' };
  const statusLabel = { normal: 'Normal', warning: 'Warning', critical: 'Critical', none: 'No data' };

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">AI Monitoring Engine</h1>
          <p className="text-sm text-gray-500 mt-1">Set the IP address and login for each camera. The engine captures frames every 5 minutes automatically.</p>
        </div>
        <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2">
          <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
          <span className="text-sm font-medium text-emerald-700">Cron: every 5 min</span>
        </div>
      </div>

      <div className="space-y-5">
        {clients.map(c => {
          const configuredZones = (c.zones || []).filter(z => z.camera_ip);
          const totalZones = (c.zones || []).length;

          return (
            <div key={c.id} className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
              {/* Client header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <span className="text-xl">{INDUSTRY_ICONS[c.industry] || '🏢'}</span>
                  <div>
                    <div className="font-semibold text-gray-900">{c.name}</div>
                    <div className="text-xs text-gray-400">
                      {c.site_name || 'No site name'} · {configuredZones.length}/{totalZones} cameras configured
                      {c.camera_source === 'hikconnect' && c.hikconnect_account_id && <span className="ml-2 text-blue-500">· HikConnect ✓</span>}
                      {c.camera_source === 'onvif' && c.dvr_host && <span className="ml-2 text-emerald-500">· ONVIF Direct ✓</span>}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openAiConfig(c)}
                    className="px-4 py-2 bg-violet-600 text-white text-xs font-semibold rounded-lg hover:bg-violet-700 transition-colors"
                  >
                    Configure AI
                  </button>
                  <button
                    onClick={() => handleTest(c.id)}
                    disabled={testingClientId === c.id || configuredZones.length === 0}
                    className="px-4 py-2 bg-slate-800 text-white text-xs font-semibold rounded-lg hover:bg-slate-900 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    {testingClientId === c.id ? 'Running…' : '▶ Test Run'}
                  </button>
                </div>
              </div>

              {/* Camera zones list */}
              {(c.zones || []).length === 0 ? (
                <div className="px-6 py-4 text-sm text-gray-400">No camera zones added yet. Go to Zones in the client dashboard to add cameras first.</div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {(c.zones || []).map(zone => {
                    const isEditingThis = editingZoneId === zone.id;
                    const hasIp = !!zone.camera_ip;

                    return (
                      <div key={zone.id}>
                        {/* Zone row */}
                        <div className="flex items-center justify-between px-6 py-3">
                          <div className="flex items-center gap-3">
                            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${hasIp ? 'bg-emerald-500' : 'bg-gray-300'}`} />
                            <div>
                              <div className="text-sm font-medium text-gray-800">{zone.name}</div>
                              <div className="text-xs text-gray-400">
                                {hasIp
                                  ? <span className="font-mono">{zone.camera_ip} · user: {zone.camera_username || 'admin'}</span>
                                  : 'No IP set — click Configure'}
                              </div>
                            </div>
                          </div>
                          {!isEditingThis && (
                            <button
                              onClick={() => startEditZone(zone, c)}
                              className="text-xs font-medium text-blue-600 hover:text-blue-800 transition-colors"
                            >
                              {hasIp ? 'Edit' : 'Configure →'}
                            </button>
                          )}
                        </div>

                        {/* Zone edit form */}
                        {isEditingThis && (
                          <div className="px-6 pb-5 pt-2 bg-slate-50 border-t border-gray-100">
                            <div className="grid sm:grid-cols-2 gap-4 mb-4">
                              <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1.5">Camera IP Address <span className="text-red-500">*</span></label>
                                <input
                                  type="text"
                                  value={zoneForm.camera_ip}
                                  onChange={e => setZoneForm(p => ({ ...p, camera_ip: e.target.value }))}
                                  placeholder="e.g. 192.168.1.101"
                                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white font-mono"
                                />
                                <p className="text-xs text-gray-400 mt-1">Local network IP of this camera</p>
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1.5">Username</label>
                                <input
                                  type="text"
                                  value={zoneForm.camera_username}
                                  onChange={e => setZoneForm(p => ({ ...p, camera_username: e.target.value }))}
                                  placeholder="admin"
                                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                                />
                              </div>
                              <div className="relative">
                                <label className="block text-xs font-medium text-gray-600 mb-1.5">Password</label>
                                <input
                                  type={showPassword[zone.id] ? 'text' : 'password'}
                                  value={zoneForm.camera_password}
                                  onChange={e => setZoneForm(p => ({ ...p, camera_password: e.target.value }))}
                                  placeholder="Leave blank to keep existing"
                                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white pr-16"
                                />
                                <button
                                  type="button"
                                  onClick={() => setShowPassword(p => ({ ...p, [zone.id]: !p[zone.id] }))}
                                  className="absolute right-3 top-8 text-xs text-gray-400 hover:text-gray-600"
                                >
                                  {showPassword[zone.id] ? 'Hide' : 'Show'}
                                </button>
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1.5">Site Name</label>
                                <input
                                  type="text"
                                  value={clientForm.site_name}
                                  onChange={e => setClientForm(p => ({ ...p, site_name: e.target.value }))}
                                  placeholder="e.g. Manchester Warehouse"
                                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                                />
                              </div>
                            </div>

                            {/* Camera Source Selector */}
                            <div className="mt-4 pt-4 border-t border-gray-200">
                              <div className="flex items-center gap-2 mb-3">
                                <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Camera Source</span>
                              </div>
                              <div className="flex gap-2 mb-4">
                                <button
                                  type="button"
                                  onClick={() => setClientForm(p => ({ ...p, camera_source: 'onvif' }))}
                                  className={`flex-1 px-4 py-2.5 text-xs font-semibold rounded-lg border-2 transition-all ${clientForm.camera_source === 'onvif' ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'}`}
                                >
                                  <div className="font-bold">ONVIF Direct</div>
                                  <div className="text-[10px] mt-0.5 opacity-70">Port-forwarded DVR</div>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setClientForm(p => ({ ...p, camera_source: 'hikconnect' }))}
                                  className={`flex-1 px-4 py-2.5 text-xs font-semibold rounded-lg border-2 transition-all ${clientForm.camera_source === 'hikconnect' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'}`}
                                >
                                  <div className="font-bold">Hik-Connect Cloud</div>
                                  <div className="text-[10px] mt-0.5 opacity-70">Partner API</div>
                                </button>
                              </div>

                              {/* ONVIF Direct fields */}
                              {clientForm.camera_source === 'onvif' && (
                                <div className="space-y-3">
                                  <div className="grid sm:grid-cols-2 gap-3">
                                    <div>
                                      <label className="block text-xs font-medium text-gray-600 mb-1.5">DVR Public IP / Hostname <span className="text-red-500">*</span></label>
                                      <input
                                        type="text"
                                        value={clientForm.dvr_host}
                                        onChange={e => setClientForm(p => ({ ...p, dvr_host: e.target.value }))}
                                        placeholder="e.g. 203.0.113.50 or mydvr.ddns.net"
                                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white font-mono"
                                      />
                                      <p className="text-xs text-gray-400 mt-1">Public IP or DDNS hostname (port-forwarded to DVR)</p>
                                    </div>
                                    <div>
                                      <label className="block text-xs font-medium text-gray-600 mb-1.5">Port</label>
                                      <input
                                        type="number"
                                        value={clientForm.dvr_port}
                                        onChange={e => setClientForm(p => ({ ...p, dvr_port: e.target.value }))}
                                        placeholder="80"
                                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white font-mono"
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-xs font-medium text-gray-600 mb-1.5">DVR Username <span className="text-red-500">*</span></label>
                                      <input
                                        type="text"
                                        value={clientForm.dvr_username}
                                        onChange={e => setClientForm(p => ({ ...p, dvr_username: e.target.value }))}
                                        placeholder="admin"
                                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                                      />
                                    </div>
                                    <div className="relative">
                                      <label className="block text-xs font-medium text-gray-600 mb-1.5">DVR Password <span className="text-red-500">*</span></label>
                                      <input
                                        type={showPassword['dvr'] ? 'text' : 'password'}
                                        value={clientForm.dvr_password}
                                        onChange={e => setClientForm(p => ({ ...p, dvr_password: e.target.value }))}
                                        placeholder="Leave blank to keep existing"
                                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white pr-16"
                                      />
                                      <button
                                        type="button"
                                        onClick={() => setShowPassword(p => ({ ...p, dvr: !p.dvr }))}
                                        className="absolute right-3 top-8 text-xs text-gray-400 hover:text-gray-600"
                                      >
                                        {showPassword['dvr'] ? 'Hide' : 'Show'}
                                      </button>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                                    <span className="text-emerald-600 text-sm">&#9432;</span>
                                    <span className="text-xs text-emerald-700">ONVIF connects directly to the DVR. Port-forward the DVR&apos;s HTTP port on your router so it&apos;s reachable from the internet.</span>
                                  </div>
                                </div>
                              )}

                              {/* Hik-Connect Cloud fields */}
                              {clientForm.camera_source === 'hikconnect' && (
                                <div className="flex gap-3 items-end">
                                  <div className="flex-1">
                                    <label className="block text-xs font-medium text-gray-600 mb-1.5">Client&apos;s HikConnect Account ID <span className="text-red-500">*</span></label>
                                    <input
                                      type="text"
                                      value={clientForm.hikconnect_account_id}
                                      onChange={e => setClientForm(p => ({ ...p, hikconnect_account_id: e.target.value }))}
                                      placeholder="e.g. 12345678"
                                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white font-mono"
                                    />
                                    <p className="text-xs text-gray-400 mt-1">Found in the client&apos;s HikConnect app under Account Settings</p>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => handleTest(c.id, 'hik')}
                                    disabled={testingClientId === c.id || !clientForm.hikconnect_account_id}
                                    className="px-4 py-2 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
                                  >
                                    {testingClientId === c.id ? 'Testing…' : 'Test HikConnect'}
                                  </button>
                                </div>
                              )}
                            </div>

                            {error && (
                              <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">{error}</div>
                            )}

                            <div className="flex items-center gap-3">
                              <button
                                onClick={() => handleSaveZone(zone.id, c.id)}
                                disabled={saving || (!zoneForm.camera_ip && clientForm.camera_source !== 'onvif')}
                                className="px-5 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                              >
                                {saving ? 'Saving…' : 'Save'}
                              </button>
                              <button
                                onClick={() => { setEditingZoneId(null); setError(''); }}
                                className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Test result for this client */}
              {testResult?.clientId === c.id && (
                <div className="px-6 pb-5 border-t border-gray-100">
                  <div className="text-xs font-medium text-gray-500 mt-4 mb-2">Test Result</div>
                  <pre className="bg-gray-900 text-green-400 text-xs rounded-xl p-4 overflow-x-auto max-h-56 overflow-y-auto font-mono">
                    {testResult.text}
                  </pre>
                </div>
              )}

              {/* AI Analysis Config Editor */}
              {aiConfigClientId === c.id && (
                <div className="px-6 pb-6 pt-4 border-t border-violet-200 bg-violet-50/50">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-bold text-violet-900">AI Analysis Configuration</h3>
                    <button onClick={() => setAiConfigClientId(null)} className="text-xs text-gray-400 hover:text-gray-600">&times; Close</button>
                  </div>

                  {/* Row 1: Industry, Shift, Frequency, Severity */}
                  <div className="grid sm:grid-cols-4 gap-4 mb-5">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1.5">Industry Type</label>
                      <select
                        value={aiConfig.industry || 'factory'}
                        onChange={e => updateAiConfig('industry', e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white"
                      >
                        {AI_INDUSTRIES.map(ind => <option key={ind} value={ind}>{cap(ind)}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1.5">Shift Start</label>
                      <input
                        type="time"
                        value={aiConfig.shift_start || '06:00'}
                        onChange={e => updateAiConfig('shift_start', e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1.5">Shift End</label>
                      <input
                        type="time"
                        value={aiConfig.shift_end || '22:00'}
                        onChange={e => updateAiConfig('shift_end', e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1.5">Analysis Frequency</label>
                      <select
                        value={aiConfig.analysis_frequency_minutes || 5}
                        onChange={e => updateAiConfig('analysis_frequency_minutes', Number(e.target.value))}
                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white"
                      >
                        {FREQUENCY_OPTIONS.map(m => <option key={m} value={m}>{m} min</option>)}
                      </select>
                    </div>
                  </div>

                  {/* Row 2: Severity threshold, WhatsApp */}
                  <div className="grid sm:grid-cols-2 gap-4 mb-5">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1.5">Alert Severity Threshold</label>
                      <select
                        value={aiConfig.alert_severity_threshold || 'medium'}
                        onChange={e => updateAiConfig('alert_severity_threshold', e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white"
                      >
                        {SEVERITY_OPTIONS.map(s => <option key={s} value={s}>{cap(s)}</option>)}
                      </select>
                      <p className="text-xs text-gray-400 mt-1">Only send alerts at or above this severity</p>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1.5">WhatsApp Number for Alerts</label>
                      <input
                        type="text"
                        value={aiConfig.whatsapp_number || ''}
                        onChange={e => updateAiConfig('whatsapp_number', e.target.value)}
                        placeholder="e.g. +91 98765 43210"
                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white"
                      />
                    </div>
                  </div>

                  {/* Site-wide PPE Requirements */}
                  <div className="mb-5">
                    <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">Site-Wide PPE Requirements</label>
                    <div className="flex flex-wrap gap-2">
                      {ALL_PPE_OPTIONS.map(item => (
                        <label key={item} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium cursor-pointer transition-all ${(aiConfig.ppe_requirements || []).includes(item) ? 'bg-violet-100 border-violet-300 text-violet-800' : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'}`}>
                          <input
                            type="checkbox"
                            checked={(aiConfig.ppe_requirements || []).includes(item)}
                            onChange={() => togglePPE(item)}
                            className="sr-only"
                          />
                          {(aiConfig.ppe_requirements || []).includes(item) ? '✓ ' : ''}{cap(item)}
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Zone Rules */}
                  <div className="mb-5">
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide">Zone Rules</label>
                      <button onClick={addZoneRule} className="text-xs font-medium text-violet-600 hover:text-violet-800">+ Add Zone</button>
                    </div>
                    {(aiConfig.zones || []).length === 0 && (
                      <p className="text-xs text-gray-400">No zone rules configured. Click &quot;+ Add Zone&quot; to add one.</p>
                    )}
                    <div className="space-y-3">
                      {(aiConfig.zones || []).map((zone, zIdx) => (
                        <div key={zIdx} className="bg-white border border-gray-200 rounded-xl p-4">
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-xs font-semibold text-gray-700">Zone {zIdx + 1}</span>
                            <button onClick={() => removeZoneRule(zIdx)} className="text-xs text-red-500 hover:text-red-700">Remove</button>
                          </div>
                          <div className="grid sm:grid-cols-4 gap-3 mb-3">
                            <div>
                              <label className="block text-xs text-gray-500 mb-1">Zone Name</label>
                              <input
                                type="text"
                                value={zone.name || ''}
                                onChange={e => updateZoneRule(zIdx, 'name', e.target.value)}
                                placeholder="e.g. Main Floor"
                                className="w-full px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white"
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-gray-500 mb-1">Min Staff</label>
                              <input
                                type="number"
                                value={zone.min_staff ?? 0}
                                onChange={e => updateZoneRule(zIdx, 'min_staff', Number(e.target.value))}
                                min="0"
                                className="w-full px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white"
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-gray-500 mb-1">Max Staff</label>
                              <input
                                type="number"
                                value={zone.max_staff ?? 10}
                                onChange={e => updateZoneRule(zIdx, 'max_staff', Number(e.target.value))}
                                min="0"
                                className="w-full px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white"
                              />
                            </div>
                            <div className="flex items-end">
                              <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={zone.restricted || false}
                                  onChange={e => updateZoneRule(zIdx, 'restricted', e.target.checked)}
                                  className="rounded border-gray-300 text-violet-600 focus:ring-violet-500"
                                />
                                Restricted Zone
                              </label>
                            </div>
                          </div>

                          {/* Zone PPE */}
                          <div className="mb-3">
                            <label className="block text-xs text-gray-500 mb-1">PPE Requirements</label>
                            <div className="flex flex-wrap gap-1.5">
                              {ALL_PPE_OPTIONS.map(item => (
                                <label key={item} className={`flex items-center gap-1 px-2 py-1 rounded border text-[10px] font-medium cursor-pointer transition-all ${(zone.ppe_requirements || []).includes(item) ? 'bg-violet-100 border-violet-300 text-violet-700' : 'bg-gray-50 border-gray-200 text-gray-400 hover:border-gray-300'}`}>
                                  <input
                                    type="checkbox"
                                    checked={(zone.ppe_requirements || []).includes(item)}
                                    onChange={() => toggleZonePPE(zIdx, item)}
                                    className="sr-only"
                                  />
                                  {cap(item)}
                                </label>
                              ))}
                            </div>
                          </div>

                          {/* Zone Custom Rules */}
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <label className="block text-xs text-gray-500">Custom Rules</label>
                              <button onClick={() => addZoneCustomRule(zIdx)} className="text-[10px] font-medium text-violet-600 hover:text-violet-800">+ Add Rule</button>
                            </div>
                            {(zone.rules || []).map((rule, rIdx) => (
                              <div key={rIdx} className="flex items-center gap-2 mb-1.5">
                                <input
                                  type="text"
                                  value={rule}
                                  onChange={e => updateZoneCustomRule(zIdx, rIdx, e.target.value)}
                                  placeholder="e.g. No entry without supervisor"
                                  className="flex-1 px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white"
                                />
                                <button onClick={() => removeZoneCustomRule(zIdx, rIdx)} className="text-xs text-red-400 hover:text-red-600">x</button>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Custom Alert Rules */}
                  <div className="mb-5">
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide">Custom Alert Rules</label>
                      <button onClick={addAlertRule} className="text-xs font-medium text-violet-600 hover:text-violet-800">+ Add Rule</button>
                    </div>
                    {(aiConfig.alert_rules || []).length === 0 && (
                      <p className="text-xs text-gray-400">No custom alert rules. Click &quot;+ Add Rule&quot; to create one.</p>
                    )}
                    {(aiConfig.alert_rules || []).map((rule, idx) => (
                      <div key={idx} className="flex items-center gap-2 mb-2">
                        <input
                          type="text"
                          value={rule}
                          onChange={e => updateAlertRule(idx, e.target.value)}
                          placeholder="e.g. Reception must always be staffed during operating hours"
                          className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white"
                        />
                        <button onClick={() => removeAlertRule(idx)} className="text-xs text-red-400 hover:text-red-600 px-2">x</button>
                      </div>
                    ))}
                  </div>

                  {/* Prompt Preview */}
                  <div className="mb-5">
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide">Prompt Preview</label>
                      <button
                        onClick={() => handlePreviewPrompt(c.id)}
                        disabled={loadingPreview}
                        className="text-xs font-medium text-violet-600 hover:text-violet-800 disabled:opacity-50"
                      >
                        {loadingPreview ? 'Generating...' : 'Preview Prompt'}
                      </button>
                    </div>
                    {promptPreview && (
                      <textarea
                        readOnly
                        value={promptPreview}
                        className="w-full h-48 px-3 py-2 text-xs font-mono border border-gray-200 rounded-lg bg-gray-50 text-gray-700 resize-y"
                      />
                    )}
                  </div>

                  {/* Error + Save/Cancel */}
                  {aiConfigError && (
                    <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">{aiConfigError}</div>
                  )}
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handleSaveAiConfig(c.id)}
                      disabled={aiConfigSaving}
                      className="px-5 py-2 bg-violet-600 text-white text-sm font-semibold rounded-lg hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {aiConfigSaving ? 'Saving...' : 'Save AI Config'}
                    </button>
                    <button
                      onClick={() => setAiConfigClientId(null)}
                      className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {clients.length === 0 && <Empty msg="No clients found. Add clients first." />}

      <div className="mt-8 bg-blue-50 border border-blue-100 rounded-2xl p-5">
        <h3 className="font-semibold text-blue-900 mb-2">How it works</h3>
        <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
          <li>Add camera zones in the client dashboard (Zones tab) — each zone = one camera</li>
          <li>Come here and set the <strong>IP address</strong> and login for each camera</li>
          <li>Save — the engine starts capturing automatically at the next 5-minute cycle</li>
          <li>Use <strong>Test Run</strong> to fire the full loop right now and see what Claude detects</li>
        </ol>
      </div>

      {/* ─── Cost & Analytics ───────────────────────────────────────────── */}
      <div className="mt-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900">Cost &amp; Analytics — Today</h2>
          <button
            onClick={loadStats}
            disabled={loadingStats}
            className="text-xs font-medium text-blue-600 hover:text-blue-800 disabled:opacity-50"
          >
            {loadingStats ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>

        {loadingStats && !monitorStats && <Spinner />}

        {monitorStats && (
          <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Client</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Last Analysis</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Alerts</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Analyses</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Cost (USD)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {monitorStats.map(s => (
                    <tr key={s.client_id} className="hover:bg-gray-50/50">
                      <td className="px-4 py-3 font-medium text-gray-900">
                        <span className="mr-1.5">{INDUSTRY_ICONS[s.industry] || '🏢'}</span>
                        {s.client_name}
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">
                        {s.last_analysis ? new Date(s.last_analysis).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '—'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          s.overall_status === 'critical' ? 'bg-red-100 text-red-700' :
                          s.overall_status === 'warning' ? 'bg-amber-100 text-amber-700' :
                          s.overall_status === 'normal' ? 'bg-emerald-100 text-emerald-700' :
                          'bg-gray-100 text-gray-500'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${statusColor[s.overall_status] || 'bg-gray-300'}`} />
                          {statusLabel[s.overall_status] || 'No data'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-gray-700 tabular-nums">{s.alerts_today}</td>
                      <td className="px-4 py-3 text-right text-gray-700 tabular-nums">{s.analyses_today}</td>
                      <td className="px-4 py-3 text-right text-gray-700 font-mono text-xs tabular-nums">${s.cost_today_usd.toFixed(4)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-50 border-t border-gray-200 font-semibold">
                    <td className="px-4 py-3 text-gray-900">Totals</td>
                    <td className="px-4 py-3"></td>
                    <td className="px-4 py-3"></td>
                    <td className="px-4 py-3 text-right text-gray-900 tabular-nums">{monitorStats.reduce((sum, s) => sum + s.alerts_today, 0)}</td>
                    <td className="px-4 py-3 text-right text-gray-900 tabular-nums">{monitorStats.reduce((sum, s) => sum + s.analyses_today, 0)}</td>
                    <td className="px-4 py-3 text-right text-gray-900 font-mono text-xs tabular-nums">${monitorStats.reduce((sum, s) => sum + s.cost_today_usd, 0).toFixed(4)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        {monitorStats && monitorStats.length === 0 && (
          <div className="text-center text-gray-400 text-sm py-8">No monitoring data for today.</div>
        )}
      </div>
    </>
  );
}

/* ─── Tab: LenzAI Devices ──────────────────────────────────────────────────── */
function EdgeAgentsTab() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generatedConfig, setGeneratedConfig] = useState(null);
  const [generating, setGenerating] = useState(null);

  useEffect(() => {
    fetch('/api/monitor/config')
      .then(r => r.json())
      .then(d => { setClients(d.clients || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  async function generateAgentKey(clientId) {
    setGenerating(clientId);
    const res = await fetch('/api/agent/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_id: clientId }),
    });
    const data = await res.json();
    setGenerating(null);
    if (res.ok) setGeneratedConfig({ clientId, ...data });
  }

  if (loading) return <Spinner />;

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">LenzAI Devices</h1>
        <p className="text-sm text-gray-500 mt-1">Deploy a small device at each client site to capture camera frames 24/7. No port forwarding needed.</p>
      </div>

      {/* How it works */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-2xl p-6 mb-6">
        <h2 className="text-sm font-bold text-blue-900 mb-3">How LenzAI Devices Work</h2>
        <div className="flex flex-wrap gap-2 text-xs text-blue-800">
          {['LenzAI device on client WiFi','Discovers cameras via ONVIF','Captures snapshots every 5 min','Uploads to cloud','AI analyzes frames','Dashboard shows results','WhatsApp alerts on violations'].map((step, i) => (
            <div key={i} className="flex items-center gap-1.5">
              {i > 0 && <span className="text-blue-400">→</span>}
              <span className="bg-white border border-blue-200 rounded-lg px-3 py-1.5 font-medium">{step}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Hardware needed */}
      <div className="bg-white border border-gray-100 rounded-2xl p-5 mb-6 shadow-sm">
        <h3 className="text-sm font-bold text-gray-900 mb-3">What You Need Per Site</h3>
        <div className="grid sm:grid-cols-3 gap-4">
          <div className="text-center p-4 bg-gray-50 rounded-xl">
            <div className="text-2xl mb-2">🥧</div>
            <div className="text-sm font-semibold">LenzAI Device</div>
            <div className="text-xs text-gray-500 mt-1">~₹2,500 · 2GB RAM is enough</div>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-xl">
            <div className="text-2xl mb-2">📡</div>
            <div className="text-sm font-semibold">WiFi / Ethernet</div>
            <div className="text-xs text-gray-500 mt-1">Same network as the DVR</div>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-xl">
            <div className="text-2xl mb-2">🔌</div>
            <div className="text-sm font-semibold">Power Supply</div>
            <div className="text-xs text-gray-500 mt-1">USB-C · Always on</div>
          </div>
        </div>
      </div>

      {/* Client list */}
      <div className="space-y-4">
        {clients.map(c => (
          <div key={c.id} className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <span className="text-xl">{INDUSTRY_ICONS[c.industry] || '🏢'}</span>
                <div>
                  <div className="font-semibold text-gray-900">{c.name}</div>
                  <div className="text-xs text-gray-400">{(c.zones || []).length} camera zones</div>
                </div>
              </div>
              <button
                onClick={() => generateAgentKey(c.id)}
                disabled={generating === c.id}
                className="px-4 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-40 transition-colors"
              >
                {generating === c.id ? 'Generating...' : 'Generate Agent Key'}
              </button>
            </div>

            {/* Show generated config */}
            {generatedConfig?.clientId === c.id && (
              <div className="px-6 py-5 bg-gray-50">
                <div className="mb-3">
                  <div className="text-xs font-bold text-green-700 uppercase tracking-wide mb-2">Agent Config Generated</div>
                  <p className="text-xs text-gray-500 mb-3">Copy this config to the LenzAI device, or use the one-liner install command below.</p>
                </div>

                {/* Config JSON */}
                <div className="mb-4">
                  <label className="block text-xs font-medium text-gray-600 mb-1">config.json</label>
                  <pre className="bg-gray-900 text-green-400 text-[11px] p-4 rounded-lg overflow-x-auto font-mono">
{JSON.stringify({
  ...generatedConfig.config,
  dvr_ip: '192.168.1.64',
  dvr_port: 80,
  dvr_username: 'admin',
  dvr_password: 'YOUR_DVR_PASSWORD',
  max_channels: 8,
  interval_ms: 300000,
}, null, 2)}
                  </pre>
                </div>

                {/* Install command */}
                <div className="mb-4">
                  <label className="block text-xs font-medium text-gray-600 mb-1">One-liner install (run on LenzAI device)</label>
                  <div className="bg-gray-900 text-yellow-300 text-xs p-3 rounded-lg font-mono break-all">
                    curl -sL https://www.stafflenz.com/install.sh | sudo bash
                  </div>
                </div>

                {/* Manual steps */}
                <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
                  <div className="text-xs font-semibold text-blue-800 mb-2">Manual Setup Steps</div>
                  <ol className="text-xs text-blue-700 space-y-1 list-decimal list-inside">
                    <li>Copy the config.json above to the Pi</li>
                    <li>Replace DVR IP, username, and password with actual values</li>
                    <li>Run: <code className="bg-blue-100 px-1 rounded">npm install && npm start</code></li>
                    <li>The agent will discover cameras and start capturing automatically</li>
                  </ol>
                </div>
              </div>
            )}
          </div>
        ))}

        {clients.length === 0 && <Empty msg="No clients found. Add a client first." />}
      </div>
    </>
  );
}

/* ─── Tab: System ────────────────────────────────────────────────────────── */
function SystemTab() {
  const info = [
    { label: 'Platform Version', value: 'StaffLenz v1.0 · Next.js 14', icon: '🚀' },
    { label: 'Database',         value: 'Supabase PostgreSQL',          icon: '🗄️' },
    { label: 'AI Engine',        value: 'LenzAI',                       icon: '🤖' },
    { label: 'Cache',            value: '24h Pexels video cache',        icon: '⚡' },
    { label: 'Auth',             value: 'Session-based, bcrypt passwords', icon: '🔒' },
  ];

  const links = [
    { label: 'Affiliate Login', href: '/affiliate/login', sub: 'Partner portal access' },
    { label: 'WL Admin',        href: '/whitelabel',      sub: 'White label management' },
    { label: 'Partner Page',    href: '/partners',        sub: 'Public partner application' },
    { label: 'Blog',            href: '/blog',            sub: 'Content management' },
  ];

  return (
    <>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">System Information</h1>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {info.map(item => (
          <div key={item.label} className="bg-white border border-gray-100 rounded-xl p-5">
            <div className="text-2xl mb-2">{item.icon}</div>
            <div className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-1">{item.label}</div>
            <div className="text-sm font-medium text-gray-900">{item.value}</div>
          </div>
        ))}
      </div>

      <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Links</h2>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {links.map(link => (
          <a
            key={link.label}
            href={link.href}
            className="bg-white border border-gray-100 rounded-xl p-5 hover:border-blue-200 hover:shadow-sm transition-all group"
          >
            <div className="font-medium text-gray-900 group-hover:text-blue-600 mb-1">{link.label} →</div>
            <div className="text-xs text-gray-400">{link.sub}</div>
            <div className="text-xs text-gray-400 mt-1 font-mono">{link.href}</div>
          </a>
        ))}
      </div>
    </>
  );
}

/* ─── Tab: Demo View ─────────────────────────────────────────────────────── */
function DemoViewTab() {
  return (
    <div className="bg-[#05061A] -mx-4 sm:-mx-6 -my-8 min-h-screen p-6 text-white">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Platform Demo View</h1>
          <p className="text-sm text-gray-500 mt-1">This is what clients see — the cinematic workforce dashboard</p>
        </div>
        <a href="/demo" target="_blank" className="text-sm font-semibold text-blue-400 border border-blue-500/30 px-4 py-2 rounded-xl hover:bg-blue-500/10 transition-all">
          Open Full Demo →
        </a>
      </div>
      <div className="bg-gray-900/50 border border-white/5 rounded-2xl overflow-hidden" style={{height:'80vh'}}>
        <iframe src="/demo" className="w-full h-full border-0" title="StaffLenz Demo" />
      </div>
    </div>
  );
}

/* ─── Main Page ──────────────────────────────────────────────────────────── */
export default function AdminPage() {
  const router = useRouter();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('overview');
  const [addClientModal, setAddClientModal] = useState(false);
  const [resetModal, setResetModal] = useState(null);

  const fetchData = useCallback(async () => {
    const res = await fetch('/api/admin');
    if (res.status === 401 || res.status === 403) { router.push('/login'); return; }
    const json = await res.json();
    setData(json);
    setLoading(false);
  }, [router]);

  useEffect(() => { fetchData(); }, [fetchData]);

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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <div className="text-sm text-gray-500">Loading admin panel…</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sticky Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-8 h-8 bg-gray-900 rounded-lg flex items-center justify-center text-white font-bold text-sm select-none">SL</div>
            <span className="font-bold text-gray-900 hidden sm:block">StaffLenz Super Admin</span>
          </div>

          {/* Tab Pills + Sign Out */}
          <div className="flex items-center gap-4 min-w-0">
            <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide py-1">
              {ALL_TABS.map(t => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap capitalize transition-colors ${
                    tab === t
                      ? 'bg-white shadow text-gray-900 border border-gray-200'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
            <button onClick={handleLogout} className="text-sm text-red-600 hover:underline shrink-0 font-medium">
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {tab === 'overview' && (
          <OverviewTab
            data={data}
            onAddClient={() => setAddClientModal(true)}
            onResetPassword={client => setResetModal(client)}
            onToggleClient={toggleClient}
            onUpdatePlan={updatePlan}
            onGoToLeads={() => setTab('leads')}
          />
        )}
        {tab === 'clients' && (
          <ClientsTab
            data={data}
            onAddClient={() => setAddClientModal(true)}
            onResetPassword={client => setResetModal(client)}
            onToggleClient={toggleClient}
            onUpdatePlan={updatePlan}
          />
        )}
        {tab === 'leads'        && <LeadsTab />}
        {tab === 'partners'     && <PartnersTab />}
        {tab === 'affiliates'   && <AffiliatesTab />}
        {tab === 'white labels' && <WhiteLabelsTab />}
        {tab === 'revenue'      && <RevenueTab />}
        {tab === 'monitoring'   && <MonitoringTab />}
        {tab === 'lenzai devices' && <EdgeAgentsTab />}
        {tab === 'system'       && <SystemTab />}
        {tab === 'demo view'    && <DemoViewTab />}
      </main>

      {/* Global Modals */}
      {addClientModal && (
        <AddClientModal
          onClose={() => setAddClientModal(false)}
          onSave={() => { setAddClientModal(false); fetchData(); }}
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
