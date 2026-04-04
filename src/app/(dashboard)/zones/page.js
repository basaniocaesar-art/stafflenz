'use client';
import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';

function ZoneModal({ zone, onClose, onSave }) {
  const [form, setForm] = useState({
    name: zone?.name || '',
    camera_ip: zone?.camera_ip || '',
    location_label: zone?.location_label || '',
    zone_type: zone?.zone_type || 'floor',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [cameraKey, setCameraKey] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const url = zone ? `/api/zones?id=${zone.id}` : '/api/zones';
      const method = zone ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Failed'); setLoading(false); return; }
      if (data.camera_key) setCameraKey(data.camera_key);
      else onSave(data.zone);
    } catch {
      setError('Network error');
      setLoading(false);
    }
  }

  if (cameraKey) {
    return (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 text-center">
          <div className="text-4xl mb-3">🔑</div>
          <h2 className="text-lg font-bold text-gray-900 mb-2">Zone Created!</h2>
          <p className="text-sm text-gray-600 mb-4">
            Copy this Camera Key to your StaffLenz Edge Node config. It will not be shown again.
          </p>
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 font-mono text-xs text-gray-700 break-all select-all mb-4">
            {cameraKey}
          </div>
          <p className="text-xs text-gray-500 mb-4">
            In your Edge Node, set:<br />
            <code className="bg-gray-100 px-1 rounded">CAMERA_KEY = &quot;{cameraKey}&quot;</code>
          </p>
          <button onClick={() => onSave()} className="btn-primary w-full">Done</button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h2 className="text-lg font-semibold">{zone ? 'Edit Zone' : 'Add Camera Zone'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Zone Name *</label>
            <input className="input" placeholder="e.g. Production Floor A" value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Zone Type</label>
            <select className="input" value={form.zone_type} onChange={(e) => setForm({...form, zone_type: e.target.value})}>
              <option value="floor">Floor</option>
              <option value="entrance">Entrance</option>
              <option value="exit">Exit</option>
              <option value="lobby">Lobby</option>
              <option value="restricted">Restricted Area</option>
              <option value="cafeteria">Cafeteria</option>
              <option value="parking">Parking</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Location Label</label>
            <input className="input" placeholder="e.g. Building A, Floor 2" value={form.location_label} onChange={(e) => setForm({...form, location_label: e.target.value})} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Camera IP Address</label>
            <input className="input" placeholder="e.g. 192.168.1.101" value={form.camera_ip} onChange={(e) => setForm({...form, camera_ip: e.target.value})} />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" className="btn-primary flex-1" disabled={loading}>
              {loading ? 'Saving...' : (zone ? 'Update Zone' : 'Add Zone')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const ZONE_TYPE_ICONS = {
  floor: '🏭', entrance: '🚪', exit: '🚪', lobby: '🏢', restricted: '🔒', cafeteria: '🍽️', parking: '🅿️',
};

export default function ZonesPage() {
  const [zones, setZones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editZone, setEditZone] = useState(null);

  async function fetchZones() {
    setLoading(true);
    try {
      const res = await fetch('/api/zones');
      if (res.status === 401) { window.location.href = '/login'; return; }
      const data = await res.json();
      setZones(data.zones || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchZones(); }, []);

  async function handleDelete(id) {
    if (!confirm('Deactivate this camera zone?')) return;
    await fetch(`/api/zones?id=${id}`, { method: 'DELETE' });
    fetchZones();
  }

  return (
    <DashboardLayout industry="factory" clientName="Zones" userName="">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Camera Zones</h1>
          <p className="text-sm text-gray-500 mt-0.5">{zones.length} zones configured</p>
        </div>
        <button onClick={() => { setEditZone(null); setModalOpen(true); }} className="btn-primary">
          + Add Zone
        </button>
      </div>

      {/* Pi integration guide */}
      <div className="card p-4 mb-6 bg-blue-50 border-blue-200">
        <h3 className="font-medium text-blue-900 mb-1 text-sm">📡 Edge Node Integration</h3>
        <p className="text-xs text-blue-700">
          Each zone gets a unique Camera Key. Your Edge Node uses this key to post detections to{' '}
          <code className="bg-blue-100 px-1 rounded">POST /api/events</code> with the{' '}
          <code className="bg-blue-100 px-1 rounded">Authorization: Bearer {'<camera_key>'}</code> header.
        </p>
      </div>

      {loading ? (
        <div className="card p-12 text-center text-gray-400">Loading zones...</div>
      ) : zones.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="text-4xl mb-3">📹</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No camera zones yet</h3>
          <p className="text-gray-500 text-sm mb-4">Add a zone for each camera location your StaffLenz Edge Node monitors.</p>
          <button onClick={() => setModalOpen(true)} className="btn-primary">Add First Zone</button>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {zones.map((zone) => (
            <div key={zone.id} className="card p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{ZONE_TYPE_ICONS[zone.zone_type] || '📹'}</span>
                  <div>
                    <div className="font-semibold text-gray-900">{zone.name}</div>
                    <div className="text-xs text-gray-500 capitalize">{zone.zone_type}</div>
                  </div>
                </div>
                <span className={zone.is_active ? 'badge-green' : 'badge-gray'}>
                  {zone.is_active ? 'Active' : 'Off'}
                </span>
              </div>
              {zone.location_label && (
                <div className="text-sm text-gray-600 mb-2">📍 {zone.location_label}</div>
              )}
              {zone.camera_ip && (
                <div className="text-xs text-gray-400 font-mono mb-3">IP: {zone.camera_ip}</div>
              )}
              <div className="flex gap-2 pt-3 border-t border-gray-100">
                <button onClick={() => { setEditZone(zone); setModalOpen(true); }} className="text-xs text-blue-600 hover:underline">
                  Edit
                </button>
                <button onClick={() => handleDelete(zone.id)} className="text-xs text-red-500 hover:underline">
                  Deactivate
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {modalOpen && (
        <ZoneModal
          zone={editZone}
          onClose={() => { setModalOpen(false); setEditZone(null); }}
          onSave={() => { setModalOpen(false); setEditZone(null); fetchZones(); }}
        />
      )}
    </DashboardLayout>
  );
}
