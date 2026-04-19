'use client';
import { useState, useEffect, useRef } from 'react';

const PHASE_MS = [1800, 2200, 3000];
const TOTAL_MS = PHASE_MS.reduce((a, b) => a + b, 0);

export default function PipelineDemoSection({ frames, accentColor = '#3b82f6', sectionBg = 'bg-gray-950', industry = 'factory' }) {
  const [activeFrame, setActiveFrame] = useState(0);
  const [phase, setPhase] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [paused, setPaused] = useState(false);
  const [videoUrls, setVideoUrls] = useState([]);
  const elapsedRef = useRef(0);
  const pausedRef = useRef(false);

  useEffect(() => { pausedRef.current = paused; }, [paused]);

  // Fetch a different Pexels video per scene using each frame's video_query
  // or fall back to the grid queries for this industry (one per camera slot).
  useEffect(() => {
    async function loadVideos() {
      // If frames have video_query fields, use those for per-scene videos
      const hasPerScene = frames.some(f => f.video_query);
      if (hasPerScene) {
        const urls = await Promise.all(frames.map(async (f) => {
          if (!f.video_query) return null;
          try {
            const r = await fetch(`/api/pexels?industry=${industry}&query=${encodeURIComponent(f.video_query)}`);
            const d = await r.json();
            return d.url || null;
          } catch { return null; }
        }));
        setVideoUrls(urls);
      } else {
        // Fall back to grid queries (8 different videos for variety)
        try {
          const r = await fetch(`/api/pexels?industry=${industry}&count=4`);
          const d = await r.json();
          setVideoUrls(d.urls || []);
        } catch {
          // Last fallback: single video
          try {
            const r = await fetch(`/api/pexels?industry=${industry}`);
            const d = await r.json();
            setVideoUrls(d.url ? [d.url, d.url, d.url, d.url] : []);
          } catch { setVideoUrls([]); }
        }
      }
    }
    loadVideos();
  }, [industry, frames]);

  useEffect(() => {
    const iv = setInterval(() => {
      if (pausedRef.current) return;
      elapsedRef.current += 50;
      const e = elapsedRef.current;
      setElapsed(e);
      if (e < PHASE_MS[0]) setPhase(0);
      else if (e < PHASE_MS[0] + PHASE_MS[1]) setPhase(1);
      else setPhase(2);
      if (e >= TOTAL_MS) {
        elapsedRef.current = 0;
        setElapsed(0);
        setPhase(0);
        setActiveFrame(f => (f + 1) % frames.length);
      }
    }, 50);
    return () => clearInterval(iv);
  }, [frames.length]);

  function goToFrame(idx) {
    setActiveFrame(idx);
    elapsedRef.current = 0;
    setElapsed(0);
    setPhase(0);
  }

  const frame = frames[activeFrame];
  const videoUrl = videoUrls[activeFrame] || videoUrls[0] || null;
  const progress = (elapsed / TOTAL_MS) * 100;
  const scanY = ((elapsed % 1200) / 1200) * 100;
  const dotCount = Math.floor(((elapsed - PHASE_MS[0]) % 900) / 300) + 1;
  const now = new Date().toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit', hour12: true });

  return (
    <section className={`py-20 px-4 ${sectionBg}`}>
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest px-4 py-1.5 rounded-full mb-4 border"
            style={{ color: accentColor, borderColor: accentColor + '40', background: accentColor + '15' }}>
            How It Works — Live Demo
          </div>
          <h2 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">
            Camera Captures → LenzAI Detects → WhatsApp Alert Sent
          </h2>
          <p className="mt-3 text-gray-400 max-w-xl mx-auto text-sm leading-relaxed">
            Watch the full pipeline — from CCTV frame capture, through LenzAI analysis, to the real-time WhatsApp alert on your phone. Under 30 seconds, every time.
          </p>
        </div>

        {/* Scene tabs */}
        <div className="flex gap-2 flex-wrap justify-center mb-6">
          {frames.map((f, i) => (
            <button key={i} onClick={() => goToFrame(i)}
              className="text-xs font-bold px-4 py-2 rounded-full border transition-all"
              style={activeFrame === i
                ? { background: accentColor, borderColor: accentColor, color: '#fff' }
                : { borderColor: '#374151', color: '#9ca3af' }}>
              Scene {i + 1}: {f.sceneLabel}
            </button>
          ))}
        </div>

        {/* Demo panel */}
        <div className="bg-gray-900 border border-gray-700 rounded-3xl overflow-hidden shadow-2xl">

          {/* Top bar */}
          <div className="bg-gray-800 px-5 py-3 flex items-center justify-between border-b border-gray-700">
            <div className="flex items-center gap-3">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-500"/>
                <div className="w-3 h-3 rounded-full bg-yellow-500"/>
                <div className="w-3 h-3 rounded-full bg-green-500"/>
              </div>
              <span className="text-xs text-gray-400 font-mono">StaffLenz AI Pipeline · {frame.zone}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
                <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"/>LIVE
              </span>
              <button onClick={() => setPaused(p => !p)}
                className="text-xs text-gray-400 hover:text-white bg-gray-700 hover:bg-gray-600 px-3 py-1 rounded-lg transition-all font-semibold">
                {paused ? '▶ Play' : '⏸ Pause'}
              </button>
            </div>
          </div>

          <div className="grid lg:grid-cols-[1fr_1px_420px]">

            {/* Camera feed */}
            <div className="relative bg-gray-950" style={{ aspectRatio: '16/9' }}>
              {/* Real Pexels video background */}
              {videoUrl && (
                <video
                  key={videoUrl}
                  autoPlay
                  muted
                  playsInline
                  className="absolute inset-0 w-full h-full object-cover"
                  style={{ opacity: 0.42 }}
                  onTimeUpdate={e => {
                    const v = e.target;
                    if (v.duration && v.currentTime > v.duration - 0.25) v.currentTime = 0;
                  }}
                >
                  <source src={videoUrl} type="video/mp4" />
                </video>
              )}

              {/* Grid */}
              <div className="absolute inset-0 opacity-[0.05]"
                style={{ backgroundImage: 'linear-gradient(#0f0,transparent 1px),linear-gradient(90deg,#0f0,transparent 1px)', backgroundSize: '40px 40px' }} />
              {/* Scanlines */}
              <div className="absolute inset-0 pointer-events-none"
                style={{ background: 'repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,0.1) 2px,rgba(0,0,0,0.1) 4px)' }} />
              {/* Scan sweep */}
              <div className="absolute left-0 right-0 h-0.5 pointer-events-none"
                style={{ top: `${scanY}%`, background: `linear-gradient(90deg,transparent,${accentColor}70,transparent)`, boxShadow: `0 0 10px ${accentColor}50` }} />
              {/* HUD top-left */}
              <div className="absolute top-3 left-3 font-mono text-xs text-green-400 bg-black/70 px-2 py-1 rounded">
                {new Date().toLocaleTimeString('en', { hour12: false })} · CAM {frame.camId || '01'}
              </div>
              {/* REC */}
              <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-black/70 px-2 py-1 rounded">
                <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"/>
                <span className="text-xs font-bold text-white font-mono">REC</span>
              </div>

              {/* Scene label overlay — only shown when no detections yet */}
              {phase === 0 && !videoUrl && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-8">
                  <span className="text-5xl">{frame.sceneIcon}</span>
                  <div className="text-sm text-gray-200 bg-black/60 backdrop-blur px-4 py-2 rounded-xl text-center leading-relaxed max-w-xs">
                    {frame.sceneDescription}
                  </div>
                </div>
              )}
              {/* Scene caption strip at bottom-left when video plays */}
              {videoUrl && phase === 0 && (
                <div className="absolute bottom-10 left-3 right-3 flex items-center gap-2 bg-black/60 backdrop-blur px-3 py-2 rounded-xl">
                  <span className="text-lg shrink-0">{frame.sceneIcon}</span>
                  <span className="text-xs text-gray-200 leading-snug">{frame.sceneDescription}</span>
                </div>
              )}

              {/* Detection boxes — phase 1+ */}
              {phase >= 1 && frame.detections.map((d, i) => (
                <div key={i} className="absolute anim-fadeInScale"
                  style={{ left: d.x, top: d.y, width: d.w, height: d.h, border: `2px solid ${d.color}`, boxShadow: `0 0 12px ${d.color}50`, animationDelay: `${i * 120}ms` }}>
                  <div className="absolute -top-6 left-0 text-xs font-bold px-1.5 py-0.5 rounded whitespace-nowrap max-w-[200px] truncate"
                    style={{ background: d.color, color: '#000' }}>{d.label}</div>
                  <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2" style={{ borderColor: d.color }}/>
                  <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2" style={{ borderColor: d.color }}/>
                  <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2" style={{ borderColor: d.color }}/>
                  <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2" style={{ borderColor: d.color }}/>
                </div>
              ))}

              {/* Confidence */}
              {phase >= 1 && (
                <div className="absolute bottom-3 right-3 text-xs font-mono text-green-400 bg-black/70 px-2 py-1 rounded text-right anim-fadeInScale">
                  <div>CONF: {91 + frame.detections.length}%</div>
                  <div>DETECTED: {frame.detections.length}</div>
                </div>
              )}

              {/* Zone label */}
              <div className="absolute bottom-3 left-3 font-mono text-xs text-gray-400 bg-black/60 px-2 py-1 rounded">
                {frame.zone}
              </div>

              {/* Capture phase badge */}
              {phase === 0 && (
                <div className="absolute bottom-12 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-black/70 border border-gray-700 px-3 py-1.5 rounded-full">
                  <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: accentColor }}/>
                  <span className="text-xs font-mono text-gray-300">Capturing frame...</span>
                </div>
              )}
            </div>

            {/* Divider */}
            <div className="bg-gray-800 hidden lg:block"/>

            {/* Pipeline steps */}
            <div className="flex flex-col gap-4 p-5 bg-gray-950 border-t lg:border-t-0 border-gray-800">

              {/* Step 1 */}
              <div className={`rounded-2xl border p-4 transition-all duration-500 ${phase >= 0 ? 'border-emerald-700/60 bg-emerald-900/20' : 'border-gray-800 bg-gray-900'}`}>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-7 h-7 rounded-full bg-emerald-500 flex items-center justify-center text-xs font-bold text-white shrink-0">✓</div>
                  <div>
                    <div className="text-sm font-bold text-white">Frame Captured</div>
                    <div className="text-xs text-gray-500">Edge Node → CCTV feed snapshot</div>
                  </div>
                </div>
                <div className="font-mono text-xs bg-black/40 rounded-xl px-3 py-2 text-gray-400">
                  <span className="text-emerald-400">SNAPSHOT</span> 1280×720px · H.264 · {new Date().toLocaleTimeString('en', { hour12: false })}
                </div>
              </div>

              {/* Step 2 */}
              <div className={`rounded-2xl border p-4 transition-all duration-500 ${phase >= 1 ? 'bg-gray-900' : 'border-gray-800 bg-gray-900 opacity-50'}`}
                style={phase >= 1 ? { borderColor: accentColor + '50', background: accentColor + '10' } : {}}>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-all"
                    style={phase >= 2
                      ? { background: accentColor, color: '#000' }
                      : phase === 1
                        ? { border: `2px solid ${accentColor}`, color: accentColor, background: 'transparent' }
                        : { background: '#374151', color: '#6b7280' }}>
                    {phase >= 2 ? '✓' : phase === 1 ? '⚙' : '2'}
                  </div>
                  <div>
                    <div className="text-sm font-bold text-white">LenzAI</div>
                    <div className="text-xs text-gray-500">claude-opus-4-6 · Vision API</div>
                  </div>
                </div>
                {phase >= 1 && (
                  <div className="anim-slideInUp">
                    <div className="font-mono text-xs bg-black/40 rounded-xl px-3 py-2 mb-2" style={{ color: accentColor }}>
                      &quot;{frame.aiPrompt}&quot;
                    </div>
                    <div className="text-xs italic text-gray-400">
                      {phase === 1 ? `Analyzing${'.'.repeat(dotCount)}` : '✓ Analysis complete'}
                    </div>
                  </div>
                )}
              </div>

              {/* Step 3 — Output */}
              <div className={`rounded-2xl border p-4 transition-all duration-500 ${phase < 2 ? 'border-gray-800 bg-gray-900 opacity-40' : ''}`}
                style={phase >= 2 ? { borderColor: frame.output.borderColor, background: frame.output.bgColor } : {}}>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-sm shrink-0"
                    style={phase >= 2 ? { background: frame.output.iconBg, color: '#fff' } : { background: '#374151', color: '#6b7280' }}>
                    {phase >= 2 ? frame.output.icon : '3'}
                  </div>
                  <div>
                    <div className="text-sm font-bold text-white">{phase >= 2 ? frame.output.title : 'AI Output'}</div>
                    <div className="text-xs" style={{ color: phase >= 2 ? frame.output.tagColor : '#6b7280' }}>
                      {phase >= 2 ? frame.output.tag : 'Waiting...'}
                    </div>
                  </div>
                </div>
                {phase >= 2 && (
                  <div className="ml-9 space-y-1.5 anim-slideInUp">
                    {frame.output.lines.map((line, i) => (
                      <div key={i} className="flex items-start gap-2 text-xs text-gray-300">
                        <span className="shrink-0 mt-0.5">{line.icon}</span>
                        <span>{line.text}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* WhatsApp Notification */}
              {phase >= 2 && (
                <div className="anim-slideInUp rounded-2xl overflow-hidden border border-gray-700">
                  {/* WA header */}
                  <div className="flex items-center gap-3 px-4 py-2.5 bg-[#075E54]">
                    <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-base shrink-0">📲</div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold text-white">StaffLenz Alert Bot</div>
                      <div className="text-xs text-white/60">WhatsApp · {now}</div>
                    </div>
                    <div className="text-white/60 text-xs font-mono">&#x2713;&#x2713;</div>
                  </div>
                  {/* WA message bubble */}
                  <div className="bg-[#0B141A] px-4 py-3">
                    <div className="bg-[#202C33] rounded-xl rounded-tl-none px-4 py-3 max-w-[90%] inline-block">
                      <div className="text-xs text-[#25D366] font-bold mb-1">🤖 StaffLenz AI Alert</div>
                      <div className="text-xs text-white/90 leading-relaxed whitespace-pre-line">{frame.output.whatsapp}</div>
                      <div className="text-right mt-1">
                        <span className="text-xs text-white/30">{now} ✓✓</span>
                      </div>
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <div className="text-xs text-[#25D366] font-semibold">✓ Delivered instantly to manager&apos;s phone</div>
                    </div>
                  </div>
                </div>
              )}

            </div>
          </div>

          {/* Progress bar */}
          <div className="px-5 py-3 bg-gray-800 border-t border-gray-700 flex items-center gap-4">
            <div className="flex gap-2">
              {frames.map((_, i) => (
                <button key={i} onClick={() => goToFrame(i)}
                  className="w-2 h-2 rounded-full transition-all hover:scale-150"
                  style={{ background: activeFrame === i ? accentColor : '#374151' }}/>
              ))}
            </div>
            <div className="flex-1 bg-gray-700 rounded-full h-1.5 overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${progress}%`, background: accentColor, transition: 'none' }}/>
            </div>
            <span className="text-xs text-gray-500 font-mono whitespace-nowrap">Scene {activeFrame + 1}/{frames.length}</span>
          </div>
        </div>

        {/* Phase legend */}
        <div className="flex flex-wrap items-center justify-center gap-8 mt-6">
          {[
            { ph: 0, label: '① Frame Captured',       icon: '📷', c: '#10b981' },
            { ph: 1, label: '② Claude AI Analysis',   icon: '🤖', c: accentColor },
            { ph: 2, label: '③ Alert + WhatsApp',      icon: '📲', c: '#25D366' },
          ].map(s => (
            <div key={s.ph} className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-sm transition-all duration-300"
                style={{ background: (phase >= s.ph ? s.c : '#374151') + '25', border: `2px solid ${phase >= s.ph ? s.c : '#374151'}`, opacity: phase >= s.ph ? 1 : 0.35, transform: phase >= s.ph ? 'scale(1.1)' : 'scale(1)' }}>
                {s.icon}
              </div>
              <span className="text-xs font-semibold transition-colors" style={{ color: phase >= s.ph ? '#fff' : '#4b5563' }}>{s.label}</span>
              {s.ph < 2 && <span className="text-gray-700">→</span>}
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
