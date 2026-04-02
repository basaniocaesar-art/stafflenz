'use client';
import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';

function WorkerModal({ worker, onClose, onSave, clientIndustry }) {
  const [form, setForm] = useState({
    full_name: worker?.full_name || '',
    employee_id: worker?.employee_id || '',
    department: worker?.department || '',
    shift: worker?.shift || 'morning',
  });
  const [photo, setPhoto] = useState(null);
  const [preview, setPreview] = useState(worker?.photo_url || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function handlePhoto(e) {
    const file = e.target.files[0];
    if (!file) return;
    setPhoto(file);
    setPreview(URL.createObjectURL(file));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
      if (photo) fd.append('photo', photo);

      const url = worker ? `/api/workers?id=${worker.id}` : '/api/workers';
      const method = worker ? 'PUT' : 'POST';
      const res = await fetch(url, { method, body: fd });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to save');
        setLoading(false);
        return;
      }
      onSave(data.worker);
    } catch {
      setError('Network error');
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h2 className="text-lg font-semibold">{worker ? 'Edit Worker' : 'Enrol New Worker'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>}

          {/* Photo upload */}
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-full bg-gray-100 overflow-hidden flex items-center justify-center border-2 border-dashed border-gray-300">
              {preview
                ? <img src={preview} alt="" className="w-full h-full object-cover" />
                : <span className="text-2xl">👤</span>
              }
            </div>
            <div>
              <label className="btn-secondary text-xs cursor-pointer">
                📷 {preview ? 'Change Photo' : 'Upload Photo'}
                <input type="file" accept="image/*" className="hidden" onChange={handlePhoto} />
              </label>
              <p className="text-xs text-gray-400 mt-1">JPEG recommended, max 5MB</p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
            <input className="input" value={form.full_name} onChange={(e) => setForm({...form, full_name: e.target.value})} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Employee ID</label>
              <input className="input" value={form.employee_id} onChange={(e) => setForm({...form, employee_id: e.target.value})} placeholder="EMP001" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Shift</label>
              <select className="input" value={form.shift} onChange={(e) => setForm({...form, shift: e.target.value})}>
                <option value="morning">Morning</option>
                <option value="afternoon">Afternoon</option>
                <option value="night">Night</option>
                <option value="flexible">Flexible</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Department / Role</label>
            <input className="input" value={form.department} onChange={(e) => setForm({...form, department: e.target.value})} placeholder="Production, Housekeeping, etc." />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" className="btn-primary flex-1" disabled={loading}>
              {loading ? 'Saving...' : (worker ? 'Update Worker' : 'Enrol Worker')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function WorkersPage() {
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editWorker, setEditWorker] = useState(null);
  const [search, setSearch] = useState('');
  const [clientIndustry, setClientIndustry] = useState('factory');

  async function fetchWorkers() {
    setLoading(true);
    try {
      const res = await fetch('/api/workers');
      if (res.status === 401) { window.location.href = '/login'; return; }
      const data = await res.json();
      setWorkers(data.workers || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchWorkers(); }, []);

  async function handleDelete(id) {
    if (!confirm('Remove this worker? Their event history will be preserved.')) return;
    await fetch(`/api/workers?id=${id}`, { method: 'DELETE' });
    fetchWorkers();
  }

  function handleSave(worker) {
    setModalOpen(false);
    setEditWorker(null);
    fetchWorkers();
  }

  const filtered = workers.filter((w) =>
    w.full_name.toLowerCase().includes(search.toLowerCase()) ||
    w.employee_id?.toLowerCase().includes(search.toLowerCase()) ||
    w.department?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <DashboardLayout industry={clientIndustry} clientName="Workers" userName="">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Workers</h1>
          <p className="text-sm text-gray-500 mt-0.5">{workers.length} enrolled · Add photos for AI recognition</p>
        </div>
        <button onClick={() => { setEditWorker(null); setModalOpen(true); }} className="btn-primary">
          + Enrol Worker
        </button>
      </div>

      {/* Search */}
      <div className="mb-4">
        <input
          className="input max-w-sm"
          placeholder="Search by name, ID, department..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="card p-12 text-center text-gray-400">Loading workers...</div>
      ) : filtered.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="text-4xl mb-3">👷</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {workers.length === 0 ? 'No workers enrolled yet' : 'No results'}
          </h3>
          {workers.length === 0 && (
            <p className="text-gray-500 text-sm mb-4">Enrol your first worker to start monitoring attendance.</p>
          )}
          {workers.length === 0 && (
            <button onClick={() => setModalOpen(true)} className="btn-primary">Enrol First Worker</button>
          )}
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left py-3 px-4 font-medium text-gray-600">Worker</th>
                <th className="text-left py-3 px-4 font-medium text-gray-600 hidden sm:table-cell">Employee ID</th>
                <th className="text-left py-3 px-4 font-medium text-gray-600 hidden md:table-cell">Department</th>
                <th className="text-left py-3 px-4 font-medium text-gray-600 hidden md:table-cell">Shift</th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">Status</th>
                <th className="text-right py-3 px-4 font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((worker) => (
                <tr key={worker.id} className="hover:bg-gray-50 transition-colors">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      {worker.photo_url ? (
                        <img src={worker.photo_url} alt={worker.full_name} className="w-8 h-8 rounded-full object-cover" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 text-sm font-medium">
                          {worker.full_name[0]}
                        </div>
                      )}
                      <span className="font-medium text-gray-900">{worker.full_name}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-gray-500 hidden sm:table-cell">{worker.employee_id || '—'}</td>
                  <td className="py-3 px-4 text-gray-500 hidden md:table-cell">{worker.department || '—'}</td>
                  <td className="py-3 px-4 hidden md:table-cell">
                    <span className="badge-blue capitalize">{worker.shift}</span>
                  </td>
                  <td className="py-3 px-4">
                    <span className={worker.is_active ? 'badge-green' : 'badge-gray'}>
                      {worker.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => { setEditWorker(worker); setModalOpen(true); }}
                        className="text-xs text-blue-600 hover:underline"
                      >Edit</button>
                      <button
                        onClick={() => handleDelete(worker.id)}
                        className="text-xs text-red-500 hover:underline"
                      >Remove</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modalOpen && (
        <WorkerModal
          worker={editWorker}
          onClose={() => { setModalOpen(false); setEditWorker(null); }}
          onSave={handleSave}
          clientIndustry={clientIndustry}
        />
      )}
    </DashboardLayout>
  );
}
