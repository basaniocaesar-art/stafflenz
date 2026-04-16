'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';

// Forensic incident detail page.
// Shows: the burst frames that triggered analysis, a scrubber of the
// surrounding ±60s context frames, Claude's narrative, identified people,
// related alerts, and a resolve action.

const SEVERITY_COLORS = {
  low:      { bg: 'bg-gray-100',    text: 'text-gray-700',    border: 'border-gray-300' },
  medium:   { bg: 'bg-yellow-100',  text: 'text-yellow-800',  border: 'border-yellow-300' },
  high:     { bg: 'bg-orange-100',  text: 'text-orange-800',  border: 'border-orange-300' },
  critical: { bg: 'bg-red-100',     text: 'text-red-800',     border: 'border-red-300' },
};

export default function IncidentDetailPage() {
  const router = useRouter();
  const params = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedFrameIdx, setSelectedFrameIdx] = useState(null);
  const [playing, setPlaying] = useState(false);
  const [resolving, setResolving] = useState(false);

  useEffect(() => {
    load();
  }, [params.id]);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`/api/incidents/${params.id}`);
      if (res.status === 401) { router.push('/login?next=/incidents'); return; }
      if (res.status === 404) { setError('Incident not found'); return; }
      const body = await res.json();
      setData(body);

      // Default the scrubber to the frame closest to detected_at
      if (body.incident?.detected_at && body.context_frames?.length > 0) {
        const eventMs = new Date(body.incident.detected_at).getTime();
        let closestIdx = 0;
        let closestDiff = Infinity;
        body.context_frames.forEach((f, i) => {
          const diff = Math.abs(new Date(f.captured_at).getTime() - eventMs);
          if (diff < closestDiff) { closestDiff = diff; closestIdx = i; }
        });
        setSelectedFrameIdx(closestIdx);
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  const contextFrames = data?.context_frames || [];
  const burstFrames = data?.burst_frames || [];
  const incident = data?.incident;
  const alerts = data?.related_alerts || [];

  // Play/pause scrubber animation
  useEffect(() => {
    if (!playing || contextFrames.length === 0) return;
    const timer = setInterval(() => {
      setSelectedFrameIdx((i) => {
        if (i === null) return 0;
        return (i + 1) % contextFrames.length;
      });
    }, 250);
    return () => clearInterval(timer);
  }, [playing, contextFrames.length]);

  const resolveIncident = useCallback(async () => {
    setResolving(true);
    try {
      await fetch(`/api/incidents/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resolved: true }),
      });
      load();
    } finally {
      setResolving(false);
    }
  }, [params.id]);

  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-500">Loading incident…</div>;
  if (error) return (
    <div className="min-h-screen flex items-center justify-center flex-col gap-3">
      <div className="text-gray-600">{error}</div>
      <a href="/incidents" className="text-indigo-600 underline">← back to incidents</a>
    </div>
  );

  const sev = SEVERITY_COLORS[incident?.severity] || SEVERITY_COLORS.low;
  const analysis = incident?.analysis_json || {};
  const selected = selectedFrameIdx !== null ? contextFrames[selectedFrameIdx] : null;
  const eventMs = incident ? new Date(incident.detected_at).getTime() : null;

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 px-4 py-4 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <a href="/incidents" className="text-sm text-gray-400 hover:text-white">← incidents</a>
            <div className="text-sm text-gray-500">·</div>
            <div className="text-sm font-semibold">Camera {incident?.camera_channel}</div>
            <span className={`text-xs font-bold px-2 py-1 rounded border ${sev.bg} ${sev.text} ${sev.border}`}>
              {incident?.severity?.toUpperCase()}
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <span>{new Date(incident?.detected_at).toLocaleString('en-IN')}</span>
            {incident?.alert_sent && <span className="px-2 py-1 bg-green-600/20 text-green-400 rounded">📱 WhatsApp sent</span>}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4 grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Main: big frame + scrubber */}
        <div className="lg:col-span-2 space-y-4">
          {/* Big frame */}
          <div className="aspect-video bg-black rounded-2xl overflow-hidden relative">
            {selected?.url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={selected.url} alt="Frame" className="w-full h-full object-contain" />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-gray-500">
                No frame selected
              </div>
            )}
            {selected && eventMs && (
              <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-xs">
                <span className="bg-black/70 px-2 py-1 rounded">
                  {new Date(selected.captured_at).toLocaleTimeString('en-IN')}
                  {(() => {
                    const diff = Math.round((new Date(selected.captured_at).getTime() - eventMs) / 1000);
                    if (diff === 0) return ' · AT EVENT';
                    return diff > 0 ? ` · +${diff}s` : ` · ${diff}s`;
                  })()}
                </span>
                {selected.has_motion && (
                  <span className="bg-red-600/80 px-2 py-1 rounded font-semibold">
                    ⚡ motion
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Playback controls */}
          <div className="flex items-center gap-3 bg-gray-800 rounded-xl p-3">
            <button
              onClick={() => setPlaying(!playing)}
              className="w-10 h-10 rounded-full bg-indigo-600 hover:bg-indigo-500 flex items-center justify-center"
            >
              {playing ? '⏸' : '▶'}
            </button>
            <button
              onClick={() => { setSelectedFrameIdx(0); setPlaying(false); }}
              className="px-3 py-1.5 rounded bg-gray-700 hover:bg-gray-600 text-sm"
            >
              ⏮ Start
            </button>
            <button
              onClick={() => {
                if (!eventMs) return;
                const idx = contextFrames.findIndex((f) => Math.abs(new Date(f.captured_at).getTime() - eventMs) < 3500);
                if (idx >= 0) { setSelectedFrameIdx(idx); setPlaying(false); }
              }}
              className="px-3 py-1.5 rounded bg-gray-700 hover:bg-gray-600 text-sm"
            >
              ⚡ Event
            </button>
            <div className="ml-auto text-xs text-gray-400">
              Frame {selectedFrameIdx !== null ? selectedFrameIdx + 1 : '—'} / {contextFrames.length}
              <span className="ml-2">· {data?.context_window_seconds}s window</span>
            </div>
          </div>

          {/* Scrubber: horizontal timeline of thumbnails */}
          <div className="bg-gray-800 rounded-xl p-3">
            <div className="flex gap-1 overflow-x-auto pb-2">
              {contextFrames.map((f, i) => {
                const isSelected = i === selectedFrameIdx;
                const diff = eventMs ? Math.round((new Date(f.captured_at).getTime() - eventMs) / 1000) : null;
                const isEvent = diff !== null && Math.abs(diff) < 3;
                return (
                  <button
                    key={f.id}
                    onClick={() => { setSelectedFrameIdx(i); setPlaying(false); }}
                    className={`relative flex-shrink-0 w-20 aspect-video rounded overflow-hidden border-2 transition ${
                      isSelected ? 'border-indigo-500 ring-2 ring-indigo-500/50' : 'border-gray-700 hover:border-gray-500'
                    } ${f.has_motion ? 'ring-1 ring-red-500/60' : ''}`}
                  >
                    {f.url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={f.url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gray-700" />
                    )}
                    {isEvent && (
                      <div className="absolute inset-0 flex items-center justify-center bg-red-500/30">
                        <span className="text-[10px] font-bold bg-red-600 px-1 rounded">EVT</span>
                      </div>
                    )}
                    {f.has_motion && !isEvent && (
                      <div className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Burst frames strip */}
          <div className="bg-gray-800 rounded-xl p-3">
            <div className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">
              Burst frames analysed by AI ({burstFrames.length})
            </div>
            <div className="grid grid-cols-5 gap-2">
              {burstFrames.map((f, i) => (
                <div key={i} className="aspect-video rounded overflow-hidden bg-gray-700 border border-gray-600">
                  {f.url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={f.url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar: analysis + alerts + actions */}
        <div className="space-y-4">
          {/* AI narrative */}
          <div className="bg-gray-800 rounded-2xl p-5">
            <div className="text-xs font-bold uppercase tracking-wider text-indigo-400 mb-2">
              AI analysis
            </div>
            <h3 className="text-lg font-bold mb-3">{incident?.incident_summary || 'Motion event'}</h3>
            {analysis.narrative && (
              <p className="text-sm text-gray-300 mb-4 whitespace-pre-wrap">{analysis.narrative}</p>
            )}
            {analysis.suggested_action && (
              <div className="bg-indigo-900/40 border border-indigo-700 rounded-lg p-3 text-sm">
                <div className="text-xs font-bold uppercase tracking-wider text-indigo-400 mb-1">
                  Suggested action
                </div>
                <p className="text-indigo-100">{analysis.suggested_action}</p>
              </div>
            )}
          </div>

          {/* Identified people */}
          {incident?.identified_people?.length > 0 && (
            <div className="bg-gray-800 rounded-2xl p-5">
              <div className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">
                People identified
              </div>
              <div className="space-y-1.5">
                {incident.identified_people.map((name, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${/unknown/i.test(name) ? 'bg-gray-500' : 'bg-green-500'}`} />
                    <span className="text-sm">{name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Related alerts */}
          {alerts.length > 0 && (
            <div className="bg-gray-800 rounded-2xl p-5">
              <div className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">
                Related alerts ({alerts.length})
              </div>
              <div className="space-y-2">
                {alerts.map((a) => (
                  <div key={a.id} className={`p-2 rounded text-xs border ${a.is_resolved ? 'opacity-60 border-gray-700' : 'border-gray-600 bg-gray-700/40'}`}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold">{a.alert_type}</span>
                      {a.is_resolved && <span className="text-green-400">✓ resolved</span>}
                    </div>
                    <div className="text-gray-300">{a.message}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Metadata */}
          <div className="bg-gray-800 rounded-2xl p-5 text-xs space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-500">Detected at</span>
              <span className="text-gray-200">{new Date(incident?.detected_at).toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Motion score</span>
              <span className="text-gray-200">{incident?.motion_score || '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Burst cost</span>
              <span className="text-gray-200">${(incident?.cost_usd || 0).toFixed(4)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Frames in archive</span>
              <span className="text-gray-200">{contextFrames.length}</span>
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-2">
            <button
              onClick={resolveIncident}
              disabled={resolving || alerts.every((a) => a.is_resolved)}
              className="w-full py-3 bg-green-600 hover:bg-green-500 disabled:bg-gray-700 disabled:text-gray-500 rounded-xl font-semibold transition"
            >
              {resolving ? 'Resolving…' : alerts.every((a) => a.is_resolved) ? '✓ All alerts resolved' : 'Mark resolved'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
