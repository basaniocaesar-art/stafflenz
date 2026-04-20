'use client';
import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';

// ─── DVR Wizard ──────────────────────────────────────────────────────────────
function DVRWizard({ onClose, onDone }) {
  const [step, setStep] = useState('connect'); // connect | discovering | select | saving | done
  const [form, setForm] = useState({ ip: '', username: 'admin', password: '', port: '80' });
  const [error, setError] = useState('');
  const [cameras, setCameras] = useState([]);
  const [selected, setSelected] = useState({});
  const [savedCount, setSavedCount] = useState(0);

  async function handleDiscover() {
    setError('');
    setStep('discovering');
    try {
      const res = await fetch('/api/onvif/discover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Discovery failed'); setStep('connect'); return; }
      setCameras(data.cameras);
      // Select all by default
      const all = {};
      data.cameras.forEach(c => { all[c.channel] = true; });
      setSelected(all);
      setStep('select');
    } catch {
      setError('Network error — check your connection');
      setStep('connect');
    }
  }

  async function handleSave() {
    setStep('saving');
    const toSave = cameras.filter(c => selected[c.channel]);
    let count = 0;
    for (const cam of toSave) {
      await fetch('/api/zones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: cam.name,
          camera_ip: form.ip,
          location_label: `Channel ${cam.channel}${cam.resolution ? ` · ${cam.resolution}` : ''}`,
          zone_type: 'floor',
          device_type: 'dvr',
        }),
      });
      count++;
    }
    setSavedCount(count);
    setStep('done');
  }

  function toggleAll() {
    const allSelected = cameras.every(c => selected[c.channel]);
    const next = {};
    cameras.forEach(c => { next[c.channel] = !allSelected; });
    setSelected(next);
  }

  const selectedCount = Object.values(selected).filter(Boolean).length;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">

        {/* Header */}
        <div className="bg-gradient-to-r from-slate-800 to-slate-700 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">📡</span>
            <div>
              <h2 className="text-white font-bold text-base">Connect DVR / NVR</h2>
              <p className="text-slate-400 text-xs">Auto-detect all cameras in seconds</p>
            </div>
          </div>
          {step !== 'discovering' && step !== 'saving' && (
            <button onClick={onClose} className="text-slate-400 hover:text-white text-2xl leading-none">×</button>
          )}
        </div>

        {/* Step: Connect */}
        {step === 'connect' && (
          <div className="p-6">
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-5 flex gap-3">
              <span className="text-blue-500 text-lg mt-0.5">ℹ️</span>
              <p className="text-sm text-blue-700">
                Enter your DVR&apos;s local IP address and login credentials. LenzAI will automatically find all connected cameras.
              </p>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-100 rounded-xl p-4 mb-5 flex gap-3">
                <span className="text-lg">⚠️</span>
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">DVR / NVR IP Address <span className="text-red-500">*</span></label>
                <input
                  className="input font-mono"
                  placeholder="e.g. 192.168.1.64"
                  value={form.ip}
                  onChange={e => setForm(f => ({ ...f, ip: e.target.value }))}
                  autoFocus
                />
                <p className="text-xs text-gray-400 mt-1">Find this on your DVR screen under Network Settings, or check your router</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Username <span className="text-red-500">*</span></label>
                  <input
                    className="input"
                    placeholder="admin"
                    value={form.username}
                    onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Password <span className="text-red-500">*</span></label>
                  <input
                    className="input"
                    type="password"
                    placeholder="Your DVR password"
                    value={form.password}
                    onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Port</label>
                <input
                  className="input font-mono w-28"
                  placeholder="80"
                  value={form.port}
                  onChange={e => setForm(f => ({ ...f, port: e.target.value }))}
                />
                <p className="text-xs text-gray-400 mt-1">Default is 80 — only change if your DVR uses a different port</p>
              </div>
            </div>

            <button
              onClick={handleDiscover}
              disabled={!form.ip || !form.username || !form.password}
              className="btn-primary w-full mt-6 py-3 text-base"
            >
              🔍 Find My Cameras
            </button>
          </div>
        )}

        {/* Step: Discovering */}
        {step === 'discovering' && (
          <div className="p-10 text-center">
            <div className="text-5xl mb-4 animate-pulse">📡</div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Connecting to DVR...</h3>
            <p className="text-sm text-gray-500 mb-1">Talking to <span className="font-mono font-semibold">{form.ip}</span></p>
            <p className="text-xs text-gray-400">Scanning for cameras — this takes about 10 seconds</p>
            <div className="mt-6 flex justify-center gap-1.5">
              {[0,1,2].map(i => (
                <div key={i} className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
              ))}
            </div>
          </div>
        )}

        {/* Step: Select cameras */}
        {step === 'select' && (
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-gray-900">🎉 Found {cameras.length} camera{cameras.length !== 1 ? 's' : ''}!</h3>
                <p className="text-xs text-gray-500 mt-0.5">Select which ones to add to LenzAI</p>
              </div>
              <button onClick={toggleAll} className="text-xs text-blue-600 hover:underline font-medium">
                {cameras.every(c => selected[c.channel]) ? 'Deselect all' : 'Select all'}
              </button>
            </div>

            <div className="space-y-2 max-h-64 overflow-y-auto mb-5">
              {cameras.map(cam => (
                <label key={cam.channel} className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${selected[cam.channel] ? 'border-blue-500 bg-blue-50' : 'border-gray-100 bg-gray-50 hover:border-gray-200'}`}>
                  <input
                    type="checkbox"
                    checked={!!selected[cam.channel]}
                    onChange={e => setSelected(s => ({ ...s, [cam.channel]: e.target.checked }))}
                    className="w-4 h-4 accent-blue-600"
                  />
                  <span className="text-xl">📹</span>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-gray-900 text-sm truncate">{cam.name}</div>
                    <div className="text-xs text-gray-400">Channel {cam.channel}{cam.resolution ? ` · ${cam.resolution}` : ''}</div>
                  </div>
                  {selected[cam.channel] && <span className="text-blue-500 text-lg">✓</span>}
                </label>
              ))}
            </div>

            <div className="flex gap-3">
              <button onClick={() => setStep('connect')} className="btn-secondary flex-1">Back</button>
              <button
                onClick={handleSave}
                disabled={selectedCount === 0}
                className="btn-primary flex-1"
              >
                Add {selectedCount} Camera{selectedCount !== 1 ? 's' : ''}
              </button>
            </div>
          </div>
        )}

        {/* Step: Saving */}
        {step === 'saving' && (
          <div className="p-10 text-center">
            <div className="text-5xl mb-4 animate-pulse">💾</div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Adding cameras...</h3>
            <p className="text-sm text-gray-500">Setting up your zones</p>
          </div>
        )}

        {/* Step: Done */}
        {step === 'done' && (
          <div className="p-8 text-center">
            <div className="text-5xl mb-4">🎉</div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">All done!</h3>
            <p className="text-sm text-gray-600 mb-1">
              <span className="font-semibold text-green-600">{savedCount} camera{savedCount !== 1 ? 's' : ''}</span> added and ready for monitoring.
            </p>
            <p className="text-xs text-gray-400 mb-6">LenzAI will start analysing footage on the next scheduled capture.</p>
            <button onClick={onDone} className="btn-primary w-full py-3">View My Cameras</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Manual Zone Modal ────────────────────────────────────────────────────────
function ZoneModal({ zone, onClose, onSave }) {
  const [form, setForm] = useState({
    name: zone?.name || '',
    camera_ip: zone?.camera_ip || '',
    location_label: zone?.location_label || '',
    zone_type: zone?.zone_type || 'floor',
    device_type: zone?.device_type || 'ip_camera',
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
            Copy this Camera Key to your LenzAI Edge Node config. It will not be shown again.
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Device Type</label>
            <select className="input" value={form.device_type} onChange={(e) => setForm({...form, device_type: e.target.value})}>
              <option value="ip_camera">IP Camera</option>
              <option value="dvr">DVR</option>
              <option value="nvr">NVR</option>
              <option value="ptz">PTZ Camera</option>
              <option value="fisheye">Fisheye Camera</option>
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

// ─── Icons & Labels ───────────────────────────────────────────────────────────
const ZONE_TYPE_ICONS = {
  floor: '🏭', entrance: '🚪', exit: '🚪', lobby: '🏢', restricted: '🔒', cafeteria: '🍽️', parking: '🅿️',
};

const DEVICE_TYPE_LABELS = {
  ip_camera: 'IP Camera', dvr: 'DVR', nvr: 'NVR', ptz: 'PTZ Camera', fisheye: 'Fisheye Camera',
};

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function ZonesPage() {
  const [zones, setZones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [dvrWizardOpen, setDvrWizardOpen] = useState(false);
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
        <div className="flex gap-2">
          <button onClick={() => { setEditZone(null); setModalOpen(true); }} className="btn-secondary text-sm">
            + Add Manually
          </button>
          <button onClick={() => setDvrWizardOpen(true)} className="btn-primary">
            📡 Connect DVR
          </button>
        </div>
      </div>

      {/* DVR connect prompt — shown when no zones yet */}
      {!loading && zones.length === 0 && (
        <div className="card p-10 text-center mb-6">
          <div className="text-5xl mb-4">📹</div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">Connect your DVR or NVR</h3>
          <p className="text-gray-500 text-sm mb-6 max-w-md mx-auto">
            Have a Hikvision DVR or any ONVIF-compatible recorder? Click below and LenzAI will automatically find all your cameras.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button onClick={() => setDvrWizardOpen(true)} className="btn-primary px-8 py-3 text-base">
              📡 Connect DVR / NVR
            </button>
            <button onClick={() => setModalOpen(true)} className="btn-secondary px-8 py-3 text-base">
              Add Camera Manually
            </button>
          </div>
        </div>
      )}

      {/* Edge Node info removed — clients don't need to see internal integration details */}

      {loading ? (
        <div className="card p-12 text-center text-gray-400">Loading zones...</div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {zones.map((zone) => (
            <div key={zone.id} className="card p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{ZONE_TYPE_ICONS[zone.zone_type] || '📹'}</span>
                  <div>
                    <div className="font-semibold text-gray-900">{zone.name}</div>
                    <div className="text-xs text-gray-500 capitalize">{zone.zone_type} · {DEVICE_TYPE_LABELS[zone.device_type] || zone.device_type || 'IP Camera'}</div>
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

      {dvrWizardOpen && (
        <DVRWizard
          onClose={() => setDvrWizardOpen(false)}
          onDone={() => { setDvrWizardOpen(false); fetchZones(); }}
        />
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
