'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

/* ─── Constants ─────────────────────────────────────────────────────────── */
const ALL_INDUSTRIES = ['factory','hotel','school','retail','hospital','construction','warehouse','restaurant','security'];
const INDUSTRY_ICONS = {factory:'🏭',hotel:'🏨',school:'🏫',retail:'🛍️',hospital:'🏥',construction:'🏗️',warehouse:'📦',restaurant:'🍽️',security:'🔒'};
const PLANS = ['starter','professional','enterprise'];
const PLAN_COLORS = {starter:'bg-gray-100 text-gray-700',professional:'bg-blue-100 text-blue-700',enterprise:'bg-violet-100 text-violet-700'};
const ALL_TABS = ['overview','clients','leads','partners','affiliates','white labels','revenue','system','demo view'];

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
