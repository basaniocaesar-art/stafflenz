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

function CameraCaptureModal({ slot, onCapture, onClose }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [error, setError] = useState('');
  const [ready, setReady] = useState(false);
  const [facingMode, setFacingMode] = useState('user');

  useEffect(() => {
    let cancelled = false;
    async function start() {
      setError('');
      setReady(false);
      // Stop any previous stream before requesting a new one
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode, width: { ideal: 1280 }, height: { ideal: 960 } },
          audio: false,
        });
        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
          setReady(true);
        }
      } catch (err) {
        setError(err?.name === 'NotAllowedError'
          ? 'Camera access was blocked. Allow it in your browser settings or use "Upload file instead".'
          : 'Could not open the camera. Use "Upload file instead".');
      }
    }
    start();
    return () => {
      cancelled = true;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    };
  }, [facingMode]);

  function handleCapture() {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => {
      if (!blob) return;
      const file = new File([blob], `capture-${slot.key}-${Date.now()}.jpg`, { type: 'image/jpeg' });
      onCapture(file);
    }, 'image/jpeg', 0.92);
  }

  return (
    <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4">
      <div className="bg-gray-900 rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="flex items-center justify-between p-3 border-b border-gray-800">
          <div>
            <div className="text-sm font-semibold text-white">{slot.label}</div>
            <div className="text-[11px] text-gray-400">{slot.hint}</div>
          </div>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-white text-xl leading-none">&times;</button>
        </div>

        <div className="relative bg-black aspect-[4/3] flex items-center justify-center">
          <video
            ref={videoRef}
            playsInline
            muted
            className="w-full h-full object-cover"
            style={{ transform: facingMode === 'user' ? 'scaleX(-1)' : 'none' }}
          />
          {!ready && !error && (
            <div className="absolute inset-0 flex items-center justify-center text-gray-400 text-xs">Starting camera…</div>
          )}
          {error && (
            <div className="absolute inset-0 flex items-center justify-center p-4 text-center text-red-300 text-xs">{error}</div>
          )}
        </div>

        <div className="flex items-center justify-between gap-2 p-3 bg-gray-900">
          <button
            type="button"
            onClick={() => setFacingMode((m) => (m === 'user' ? 'environment' : 'user'))}
            className="text-[11px] text-gray-300 hover:text-white px-2 py-1"
            title="Switch camera"
          >
            Switch camera
          </button>
          <button
            type="button"
            onClick={handleCapture}
            disabled={!ready}
            className="bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-400 text-white text-sm font-medium px-5 py-2 rounded-full"
          >
            Capture
          </button>
          <button type="button" onClick={onClose} className="text-[11px] text-gray-400 hover:text-white px-2 py-1">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

function PhotoSlot({ slot, preview, onSelect, onRemove }) {
  const inputRef = useRef(null);
  const [cameraOpen, setCameraOpen] = useState(false);

  function openCamera() {
    // Secure context + mediaDevices required. Fall back to file picker otherwise.
    if (typeof navigator !== 'undefined' && navigator.mediaDevices?.getUserMedia) {
      setCameraOpen(true);
    } else {
      inputRef.current?.click();
    }
  }

  function handleFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    onSelect(slot.key, file);
    e.target.value = '';
  }

  function handleCapture(file) {
    onSelect(slot.key, file);
    setCameraOpen(false);
  }

  return (
    <div className="relative group">
      <div
        onClick={() => !preview && openCamera()}
        className={`w-full aspect-square rounded-lg border-2 border-dashed flex flex-col items-center justify-center overflow-hidden cursor-pointer transition-colors ${
          preview ? 'border-blue-300 bg-blue-50' : 'border-gray-300 bg-gray-50 hover:border-blue-400 hover:bg-blue-50'
        }`}
      >
        {preview ? (
          <img src={preview} alt={slot.label} className="w-full h-full object-cover" />
        ) : (
          <>
            <span className="text-lg text-gray-400 mb-0.5">📷</span>
            <span className="text-[10px] font-medium text-gray-500 text-center px-1 leading-tight">{slot.label}</span>
            <span className="text-[9px] text-gray-400 text-center px-1 leading-tight mt-0.5">{slot.hint}</span>
          </>
        )}
      </div>
      {preview && (
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-1">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); openCamera(); }}
            className="text-white bg-white/20 hover:bg-white/30 rounded-full w-7 h-7 flex items-center justify-center text-xs"
            title="Retake photo"
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
      {!preview && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); inputRef.current?.click(); }}
          className="absolute bottom-[22px] left-1/2 -translate-x-1/2 text-[8px] text-gray-400 hover:text-blue-600 underline decoration-dotted"
          title="Upload file instead"
        >
          upload file
        </button>
      )}
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
      <div className="text-[10px] text-gray-500 text-center mt-1 font-medium">{slot.label}</div>
      {cameraOpen && (
        <CameraCaptureModal slot={slot} onCapture={handleCapture} onClose={() => setCameraOpen(false)} />
      )}
    </div>
  );
}

function WorkerModal({ worker, onClose, onSave, clientIndustry, selectedLocation }) {
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

      // Tag new workers with the currently-selected location so they appear
      // under that site's worker list. Only applied on create; editing a
      // worker doesn't change their location here.
      if (!worker && selectedLocation) fd.append('location_id', selectedLocation);

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
              Capture up to 6 photos from different angles for better AI face recognition. Tap a slot to open your camera, or use &ldquo;upload file&rdquo; as a fallback.
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
  const [clientName, setClientName] = useState('');
  const [locations, setLocations] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState(null);

  async function fetchWorkers() {
    setLoading(true);
    try {
      const locParam = selectedLocation ? `?location=${selectedLocation}` : '';
      const res = await fetch(`/api/workers${locParam}`, { cache: 'no-store' });
      if (res.status === 401) { window.location.href = '/login'; return; }
      const data = await res.json();
      setWorkers(data.workers || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetch('/api/locations').then(r => r.json()).then(d => setLocations(d.locations || [])).catch(() => {});
    fetch('/api/client').then(r => r.json()).then(d => {
      if (d?.client?.industry) setClientIndustry(d.client.industry);
      if (d?.client?.name) setClientName(d.client.name);
    }).catch(() => {});
  }, []);

  useEffect(() => { fetchWorkers(); }, [selectedLocation]);

  const activeLocation = locations.find((l) => l.id === selectedLocation);
  const displayIndustry = activeLocation?.industry || clientIndustry;

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

  const locationScoped = selectedLocation
    ? workers.filter((w) => w.location_id === selectedLocation)
    : workers;

  const filtered = locationScoped.filter((w) =>
    w.full_name.toLowerCase().includes(search.toLowerCase()) ||
    w.employee_id?.toLowerCase().includes(search.toLowerCase()) ||
    w.department?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <DashboardLayout industry={clientIndustry} displayIndustry={displayIndustry} clientName={clientName || 'Workers'} userName={clientName}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Workers</h1>
          <p className="text-sm text-gray-500 mt-0.5">{locationScoped.length} enrolled &middot; Add photos for AI recognition</p>
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
            {locationScoped.length === 0 ? 'No workers enrolled yet' : 'No results'}
          </h3>
          {locationScoped.length === 0 && (
            <p className="text-gray-500 text-sm mb-4">Enrol your first worker to start monitoring attendance.</p>
          )}
          {locationScoped.length === 0 && (
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
          selectedLocation={selectedLocation}
        />
      )}
    </DashboardLayout>
  );
}
