'use client';
import { useState, useEffect, useRef } from 'react';
import DashboardLayout from '@/components/DashboardLayout';

const PHOTO_SLOTS = [
  { key: 0, label: 'Front', hint: 'Face straight at camera' },
  { key: 1, label: 'Left Profile', hint: 'Looking left' },
  { key: 2, label: 'Right Profile', hint: 'Looking right' },
  { key: 3, label: 'From Above', hint: 'Camera angle from above' },
  { key: 4, label: 'Alt 1', hint: 'Different lighting' },
  { key: 5, label: 'Alt 2', hint: 'With PPE / hat' },
];

function PhotoSlot({ slot, preview, onSelect, onRemove }) {
  const inputRef = useRef(null);

  function handleFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    onSelect(slot.key, file);
    e.target.value = '';
  }

  return (
    <div className="relative group">
      <div
        onClick={() => !preview && inputRef.current?.click()}
        className={`w-full aspect-square rounded-lg border-2 border-dashed flex flex-col items-center justify-center overflow-hidden cursor-pointer transition-colors ${
          preview ? 'border-blue-300 bg-blue-50' : 'border-gray-300 bg-gray-50 hover:border-blue-400 hover:bg-blue-50'
        }`}
      >
        {preview ? (
          <img src={preview} alt={slot.label} className="w-full h-full object-cover" />
        ) : (
          <>
            <span className="text-xl text-gray-300 mb-1">+</span>
            <span className="text-[10px] font-medium text-gray-400 text-center px-1 leading-tight">{slot.label}</span>
            <span className="text-[9px] text-gray-300 text-center px-1 leading-tight mt-0.5">{slot.hint}</span>
          </>
        )}
      </div>
      {preview && (
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-1">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); inputRef.current?.click(); }}
            className="text-white bg-white/20 hover:bg-white/30 rounded-full w-7 h-7 flex items-center justify-center text-xs"
            title="Replace photo"
          >
            &#8635;
          </button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onRemove(slot.key); }}
            className="text-white bg-red-500/60 hover:bg-red-500/80 rounded-full w-7 h-7 flex items-center justify-center text-xs"
            title="Remove photo"
          >
            &times;
          </button>
        </div>
      )}
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
      <div className="text-[10px] text-gray-500 text-center mt-1 font-medium">{slot.label}</div>
    </div>
  );
}

function WorkerModal({ worker, onClose, onSave, clientIndustry }) {
  const [form, setForm] = useState({
    full_name: worker?.full_name || '',
    employee_id: worker?.employee_id || '',
    department: worker?.department || '',
    shift: worker?.shift || 'morning',
  });
  // photos[slotIndex] = File object (new upload) or null
  const [photos, setPhotos] = useState([null, null, null, null, null, null]);
  // previews[slotIndex] = URL string or null
  const [previews, setPreviews] = useState([null, null, null, null, null, null]);
  // Track which slots were removed (for existing workers)
  const [removedSlots, setRemovedSlots] = useState(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Initialize previews from existing worker photos
  useEffect(() => {
    if (worker) {
      const newPreviews = [null, null, null, null, null, null];
      if (Array.isArray(worker.photo_urls) && worker.photo_urls.length > 0) {
        worker.photo_urls.forEach((url, i) => {
          if (i < 6 && url) newPreviews[i] = url;
        });
      } else if (worker.photo_url) {
        newPreviews[0] = worker.photo_url;
      }
      setPreviews(newPreviews);
    }
  }, [worker]);

  function handlePhotoSelect(slotIndex, file) {
    const newPhotos = [...photos];
    newPhotos[slotIndex] = file;
    setPhotos(newPhotos);

    const newPreviews = [...previews];
    newPreviews[slotIndex] = URL.createObjectURL(file);
    setPreviews(newPreviews);

    // If it was marked as removed, unmark
    const newRemoved = new Set(removedSlots);
    newRemoved.delete(slotIndex);
    setRemovedSlots(newRemoved);
  }

  function handlePhotoRemove(slotIndex) {
    const newPhotos = [...photos];
    newPhotos[slotIndex] = null;
    setPhotos(newPhotos);

    const newPreviews = [...previews];
    newPreviews[slotIndex] = null;
    setPreviews(newPreviews);

    // Mark as removed if this was an existing photo
    if (worker) {
      const newRemoved = new Set(removedSlots);
      newRemoved.add(slotIndex);
      setRemovedSlots(newRemoved);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));

      // Append photos by slot index
      photos.forEach((file, i) => {
        if (file) fd.append(`photo_${i}`, file);
      });

      // Append removed slots
      removedSlots.forEach((slot) => {
        fd.append(`remove_photo_${slot}`, 'true');
      });

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

  const photoCount = previews.filter(Boolean).length;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h2 className="text-lg font-semibold">{worker ? 'Edit Worker' : 'Enrol New Worker'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>}

          {/* Multi-photo upload grid */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Reference Photos ({photoCount}/6)
            </label>
            <p className="text-xs text-gray-400 mb-3">
              Upload up to 6 photos from different angles for better AI face recognition. JPEG recommended, max 5MB each.
            </p>
            <div className="grid grid-cols-3 gap-2">
              {PHOTO_SLOTS.map((slot) => (
                <PhotoSlot
                  key={slot.key}
                  slot={slot}
                  preview={previews[slot.key]}
                  onSelect={handlePhotoSelect}
                  onRemove={handlePhotoRemove}
                />
              ))}
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
  const [locations, setLocations] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState(null);

  async function fetchWorkers() {
    setLoading(true);
    try {
      const locParam = selectedLocation ? `?location=${selectedLocation}` : '';
      const res = await fetch(`/api/workers${locParam}`);
      if (res.status === 401) { window.location.href = '/login'; return; }
      const data = await res.json();
      setWorkers(data.workers || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetch('/api/locations').then(r => r.json()).then(d => setLocations(d.locations || [])).catch(() => {});
  }, []);

  useEffect(() => { fetchWorkers(); }, [selectedLocation]);

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
          <p className="text-sm text-gray-500 mt-0.5">{workers.length} enrolled &middot; Add photos for AI recognition</p>
        </div>
        <button onClick={() => { setEditWorker(null); setModalOpen(true); }} className="btn-primary">
          + Enrol Worker
        </button>
      </div>

      {/* Location picker */}
      {locations.length > 0 && (
        <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-1">
          <button onClick={() => setSelectedLocation(null)} className={`shrink-0 px-3 py-1.5 text-xs font-semibold rounded-lg border transition ${!selectedLocation ? 'bg-blue-50 text-blue-700 border-blue-300' : 'text-gray-500 border-gray-200 hover:border-gray-300'}`}>All locations</button>
          {locations.map(loc => (
            <button key={loc.id} onClick={() => setSelectedLocation(loc.id)} className={`shrink-0 px-3 py-1.5 text-xs font-semibold rounded-lg border transition ${selectedLocation === loc.id ? 'bg-blue-50 text-blue-700 border-blue-300' : 'text-gray-500 border-gray-200 hover:border-gray-300'}`}>{loc.name}</button>
          ))}
        </div>
      )}

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
          <div className="text-4xl mb-3">&#128119;</div>
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
                <th className="text-left py-3 px-4 font-medium text-gray-600 hidden sm:table-cell">Photos</th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">Status</th>
                <th className="text-right py-3 px-4 font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((worker) => {
                const photoCount = Array.isArray(worker.photo_urls)
                  ? worker.photo_urls.filter(Boolean).length
                  : (worker.photo_url ? 1 : 0);
                return (
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
                    <td className="py-3 px-4 text-gray-500 hidden sm:table-cell">{worker.employee_id || '\u2014'}</td>
                    <td className="py-3 px-4 text-gray-500 hidden md:table-cell">{worker.department || '\u2014'}</td>
                    <td className="py-3 px-4 hidden md:table-cell">
                      <span className="badge-blue capitalize">{worker.shift}</span>
                    </td>
                    <td className="py-3 px-4 hidden sm:table-cell">
                      <span className={`text-xs font-medium ${photoCount >= 3 ? 'text-green-600' : photoCount > 0 ? 'text-amber-600' : 'text-gray-400'}`}>
                        {photoCount}/6
                      </span>
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
                );
              })}
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
