'use client';
import { useState, useEffect } from 'react';

const CAM_LABELS = [
  'Main Entrance', 'Zone A', 'Zone B', 'Zone C',
  'Zone D', 'Corridor', 'Exit', 'Overview',
];

function CamFeed({ url, camNum, label, activeAlert }) {
  return (
    <div className="relative bg-gray-950 rounded-lg overflow-hidden border border-gray-800 group cursor-pointer hover:border-green-500/50 transition-colors"
      style={{ aspectRatio: '16/9' }}>
      {url ? (
        <video
          autoPlay muted playsInline loop
          className="absolute inset-0 w-full h-full object-cover opacity-60"
          style={{ animationDelay: `${camNum * 0.7}s` }}
        >
          <source src={url} type="video/mp4" />
        </video>
      ) : (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-gray-700 text-xs font-mono">NO SIGNAL</div>
        </div>
      )}

      {/* Scanlines */}
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: 'repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,0.15) 2px,rgba(0,0,0,0.15) 4px)' }} />

      {/* CAM label */}
      <div className="absolute top-1.5 left-1.5 flex items-center gap-1.5 bg-black/70 px-1.5 py-0.5 rounded font-mono">
        <span className={`w-1.5 h-1.5 rounded-full ${activeAlert ? 'bg-red-500 animate-pulse' : 'bg-green-500'}`} />
        <span className="text-green-400 text-[10px] font-bold">CAM {String(camNum).padStart(2, '0')}</span>
      </div>

      {/* REC */}
      <div className="absolute top-1.5 right-1.5 flex items-center gap-1 bg-black/70 px-1.5 py-0.5 rounded">
        <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
        <span className="text-white text-[9px] font-bold font-mono">REC</span>
      </div>

      {/* Zone label */}
      <div className="absolute bottom-1.5 left-1.5 right-1.5 flex items-center justify-between">
        <span className="text-gray-300 text-[9px] font-mono bg-black/60 px-1.5 py-0.5 rounded">{label}</span>
        {activeAlert && (
          <span className="text-red-400 text-[9px] font-bold bg-red-950/80 px-1.5 py-0.5 rounded animate-pulse">⚠ ALERT</span>
        )}
      </div>

      {/* Alert overlay */}
      {activeAlert && (
        <div className="absolute inset-0 border-2 border-red-500/60 rounded-lg pointer-events-none animate-pulse" />
      )}
    </div>
  );
}

export default function CameraGrid({ industry, accentColor = '#3b82f6', alertCams = [1, 3] }) {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [time, setTime] = useState('');

  useEffect(() => {
    fetch(`/api/pexels?industry=${industry}&count=8`)
      .then(r => r.json())
      .then(d => {
        setVideos(d.urls || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [industry]);

  useEffect(() => {
    const tick = () => setTime(new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    tick();
    const iv = setInterval(tick, 1000);
    return () => clearInterval(iv);
  }, []);

  return (
    <section className="py-20 px-4 bg-gray-950">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest px-4 py-1.5 rounded-full mb-4 border"
            style={{ color: accentColor, borderColor: accentColor + '40', background: accentColor + '15' }}>
            Live Camera Grid
          </div>
          <h2 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">
            All 8 cameras. One view. Every zone covered.
          </h2>
          <p className="mt-3 text-gray-400 max-w-xl mx-auto text-sm">
            LenzAI monitors every camera simultaneously — no switching, no blind spots. Any violation triggers an instant alert on the highlighted feed.
          </p>
        </div>

        {/* DVR-style header */}
        <div className="bg-gray-900 border border-gray-700 rounded-t-2xl px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <div className="w-3 h-3 rounded-full bg-yellow-500" />
              <div className="w-3 h-3 rounded-full bg-green-500" />
            </div>
            <span className="text-xs text-gray-400 font-mono">LenzAI NVR · 8-Channel DVR · All Zones Active</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-xs font-mono text-green-400">{time}</span>
            <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
              <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />LIVE
            </span>
          </div>
        </div>

        {/* Camera grid */}
        <div className="bg-gray-950 border border-t-0 border-gray-700 rounded-b-2xl p-4">
          {loading ? (
            <div className="grid grid-cols-4 gap-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="bg-gray-900 rounded-lg animate-pulse" style={{ aspectRatio: '16/9' }} />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <CamFeed
                  key={i}
                  url={videos[i] || null}
                  camNum={i + 1}
                  label={CAM_LABELS[i]}
                  activeAlert={alertCams.includes(i + 1)}
                />
              ))}
            </div>
          )}

          {/* Status bar */}
          <div className="mt-3 flex items-center justify-between text-[10px] text-gray-600 font-mono px-1">
            <span>8 CHANNELS ACTIVE · H.264 · 1080P</span>
            <span className="text-red-500 font-bold animate-pulse">● {alertCams.length} ALERT{alertCams.length !== 1 ? 'S' : ''} DETECTED</span>
            <span>MOTION DETECT: ON · AI ANALYSIS: ON</span>
          </div>
        </div>
      </div>
    </section>
  );
}
