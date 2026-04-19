#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════════════════════════
// LenzAI Edge Agent v2 — Temporal Sequence + Motion Bursts
// ─────────────────────────────────────────────────────────────────────────────
// Two independent loops sharing the same DVR:
//
//   CAPTURE LOOP (every capture_sec, e.g. 3s or 60s)
//     for each camera:
//       pull snapshot via ISAPI digest auth
//       upload to supabase frames bucket
//       insert row into frame_buffer
//       run pixel-diff motion detection
//       if motion above threshold:
//         grab last 5 frames from this camera from frame_buffer
//         call /api/agent/analyze-burst (urgent incident analysis)
//
//   ANALYZE LOOP (every analyze_min, e.g. 5 min)
//     pull last N frames per camera from frame_buffer (all channels)
//     call /api/agent/analyze-sequence
//     server returns per-minute timeline
//
// Config loaded from config.json — falls back to plan defaults if missing.
// ═══════════════════════════════════════════════════════════════════════════════

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const https = require('https');
const http = require('http');
const { detectMotion, sharpAvailable } = require('./motion');

// ─── Config ──────────────────────────────────────────────────────────────────
const CONFIG_PATH = path.join(__dirname, 'config.json');
if (!fs.existsSync(CONFIG_PATH)) {
  console.error('No config.json found. Run: node setup.js');
  process.exit(1);
}
const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));

const {
  agent_key,
  api_url,
  supabase_url,
  supabase_key,
  client_id,
  dvr_ip,
  dvr_port = 80,
  dvr_username,
  dvr_password,
  max_channels = 8,
  // v2 knobs — default to the "$3/day" sequence config.
  capture_sec = 60,             // how often to pull frames per camera
  analyze_min = 5,              // analyse window (minutes)
  motion_enabled = true,        // fire burst analyses on pixel-diff motion
  motion_threshold = 10,        // 0-255 mean pixel delta to consider motion
  motion_cooldown_sec = 45,     // don't fire bursts more often than this per camera
  schedule = '24x7',            // '24x7' or 'business_hours' (06:00-22:00 local)
  exclude_cameras = [],         // skip these camera channels entirely
  motion_exclude_cameras = [],  // capture + analyze these but skip motion detection (e.g. [8] for pool — water reflections)
} = config;

const excludeSet = new Set(exclude_cameras);
const motionExcludeSet = new Set(motion_exclude_cameras);

// ─── Small utilities ────────────────────────────────────────────────────────
function log(msg) {
  const ts = new Date().toISOString().replace('T', ' ').slice(0, 19);
  console.log(`[${ts}] ${msg}`);
}

function inScheduleNow() {
  if (schedule === '24x7') return true;
  const h = new Date().getHours();
  return h >= 6 && h < 22; // generous business-hours window
}

function httpGet(url, headers = {}) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? https : http;
    const req = mod.get(url, { headers, timeout: 15_000 }, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks) }));
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Request timeout')); });
  });
}

function httpJson(method, url, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const mod = parsed.protocol === 'https:' ? https : http;
    const payload = body ? (Buffer.isBuffer(body) ? body : Buffer.from(JSON.stringify(body))) : null;
    const options = {
      hostname: parsed.hostname,
      port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
      path: parsed.pathname + parsed.search,
      method,
      headers: {
        ...(body && !Buffer.isBuffer(body) ? { 'Content-Type': 'application/json' } : {}),
        ...(payload ? { 'Content-Length': payload.length } : {}),
        ...headers,
      },
      timeout: 60_000,
    };
    const req = mod.request(options, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        const text = Buffer.concat(chunks).toString();
        let parsedBody = text;
        try { parsedBody = JSON.parse(text); } catch { /* keep text */ }
        resolve({ status: res.statusCode, body: parsedBody });
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Request timeout')); });
    if (payload) req.write(payload);
    req.end();
  });
}

// ─── Hikvision ISAPI digest auth ────────────────────────────────────────────
async function fetchWithDigest(url, username, password) {
  const res1 = await httpGet(url);
  if (res1.status !== 401) return res1;
  const wwwAuth = res1.headers['www-authenticate'] || '';
  const realm  = ((wwwAuth.match(/realm="([^"]+)"/)  || [])[1] || '').trim();
  const nonce  = ((wwwAuth.match(/nonce="([^"]+)"/)  || [])[1] || '').trim();
  const qop    = ((wwwAuth.match(/qop="([^"]+)"/)    || [])[1] || '').trim();
  const opaque = ((wwwAuth.match(/opaque="([^"]+)"/) || [])[1] || '').trim();
  const parsed = new URL(url);
  const uri = parsed.pathname + parsed.search;
  const nc = '00000001';
  const cnonce = crypto.createHash('md5').update(Math.random().toString()).digest('hex').slice(0, 8);
  const ha1 = crypto.createHash('md5').update(`${username.trim()}:${realm}:${password.trim()}`).digest('hex');
  const ha2 = crypto.createHash('md5').update(`GET:${uri}`).digest('hex');
  const response = qop
    ? crypto.createHash('md5').update(`${ha1}:${nonce}:${nc}:${cnonce}:${qop}:${ha2}`).digest('hex')
    : crypto.createHash('md5').update(`${ha1}:${nonce}:${ha2}`).digest('hex');
  const authHeader = [
    `Digest username="${username.trim()}"`,
    `realm="${realm}"`,
    `nonce="${nonce}"`,
    `uri="${uri}"`,
    `algorithm="MD5"`,
    qop ? `qop=${qop}` : '',
    qop ? `nc=${nc}` : '',
    qop ? `cnonce="${cnonce}"` : '',
    `response="${response}"`,
    opaque ? `opaque="${opaque}"` : '',
  ].filter(Boolean).join(', ');
  return httpGet(url, { Authorization: authHeader });
}

function snapshotUrl(channelIndex) {
  const channel = channelIndex * 100 + 1;
  return `http://${dvr_ip}:${dvr_port}/ISAPI/Streaming/channels/${channel}/picture`;
}

async function captureChannel(ch) {
  const res = await fetchWithDigest(snapshotUrl(ch), dvr_username, dvr_password);
  if (res.status !== 200) throw new Error(`cam${ch}: HTTP ${res.status}`);
  if (!(res.headers['content-type'] || '').includes('image')) throw new Error(`cam${ch}: not an image`);
  return res.body;
}

// ─── Supabase: upload frame + index in frame_buffer ─────────────────────────
async function uploadFrame(buffer, storagePath) {
  const url = `${supabase_url}/storage/v1/object/frames/${storagePath}`;
  const parsed = new URL(url);
  const mod = parsed.protocol === 'https:' ? https : http;
  return new Promise((resolve, reject) => {
    const options = {
      hostname: parsed.hostname,
      port: parsed.port || 443,
      path: parsed.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'image/jpeg',
        'Authorization': `Bearer ${supabase_key}`,
        'apikey': supabase_key,
        'Content-Length': buffer.length,
        'x-upsert': 'true',
      },
      timeout: 30_000,
    };
    const req = mod.request(options, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => resolve({ status: res.statusCode, body: Buffer.concat(chunks).toString() }));
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Upload timeout')); });
    req.write(buffer);
    req.end();
  });
}

async function indexFrame({ client_id, camera_channel, frame_path, captured_at, has_motion }) {
  return httpJson(
    'POST',
    `${supabase_url}/rest/v1/frame_buffer`,
    { client_id, camera_channel, frame_path, captured_at, has_motion },
    {
      apikey: supabase_key,
      Authorization: `Bearer ${supabase_key}`,
      Prefer: 'return=minimal',
    }
  );
}

async function signedUrl(storagePath, expiresIn = 3600) {
  const res = await httpJson(
    'POST',
    `${supabase_url}/storage/v1/object/sign/frames/${storagePath}`,
    { expiresIn },
    {
      apikey: supabase_key,
      Authorization: `Bearer ${supabase_key}`,
    }
  );
  if (res.status >= 400 || !res.body?.signedURL) return null;
  return `${supabase_url}/storage/v1${res.body.signedURL}`;
}

async function recentFramesFromBuffer(cameraChannel, limit) {
  const res = await httpJson(
    'GET',
    `${supabase_url}/rest/v1/frame_buffer?select=frame_path,captured_at&client_id=eq.${client_id}&camera_channel=eq.${cameraChannel}&order=captured_at.desc&limit=${limit}`,
    null,
    { apikey: supabase_key, Authorization: `Bearer ${supabase_key}` }
  );
  if (res.status >= 400 || !Array.isArray(res.body)) return [];
  return res.body.reverse(); // chronological
}

// ─── Heartbeat ──────────────────────────────────────────────────────────────
async function heartbeat(status, extra = {}) {
  try {
    await httpJson(
      'POST',
      `${api_url}/api/agent/heartbeat`,
      { agent_key, client_id, status, uptime: process.uptime(), ...extra },
      {}
    );
  } catch { /* non-fatal */ }
}

// ─── Capture + motion per cycle ─────────────────────────────────────────────
const lastBurstAt = new Map(); // camera_channel -> ms timestamp

async function captureCycle(channelCount) {
  if (!inScheduleNow()) {
    log(`Outside schedule window (${schedule}) — skipping capture`);
    return;
  }

  const capturedAt = new Date().toISOString();
  const tsSlug = capturedAt.replace(/[:.]/g, '-');

  const results = await Promise.allSettled(
    Array.from({ length: channelCount }, async (_, idx) => {
      const ch = idx + 1;
      if (excludeSet.has(ch)) return { ch, skipped: true };
      const buffer = await captureChannel(ch);

      // Motion detection on the edge (skip for cameras like pool where
      // water reflections cause constant false triggers).
      // We ALWAYS run pixel-diff (even if motion_enabled=false) so we can
      // track which cameras had activity for the smart-skip optimisation
      // in analyzeCycle. Only the burst-trigger path is gated by motion_enabled.
      let motion = { score: 0, hasMotion: false, available: false };
      if (sharpAvailable && !motionExcludeSet.has(ch)) {
        motion = await detectMotion(ch, buffer, motion_threshold);
        if (motion.hasMotion) camsWithMotionSinceLastAnalysis.add(ch);
      } else {
        // Pool or no sharp — always include in analysis
        camsWithMotionSinceLastAnalysis.add(ch);
      }

      const storagePath = `${client_id}/cam${ch}_${tsSlug}.jpg`;
      const up = await uploadFrame(buffer, storagePath);
      if (up.status >= 400) throw new Error(`cam${ch}: upload ${up.status}`);
      await indexFrame({
        client_id,
        camera_channel: ch,
        frame_path: storagePath,
        captured_at: capturedAt,
        has_motion: motion.hasMotion,
      });

      // Motion-triggered burst analysis (option 4 — theft detection)
      if (motion.hasMotion && !motion.firstFrame) {
        const since = Date.now() - (lastBurstAt.get(ch) || 0);
        if (since > motion_cooldown_sec * 1000) {
          lastBurstAt.set(ch, Date.now());
          triggerBurst(ch, motion.score, capturedAt).catch((e) =>
            log(`cam${ch}: burst trigger failed — ${e.message}`)
          );
        }
      }

      return { ch, motionScore: motion.score.toFixed(1), hasMotion: motion.hasMotion };
    })
  );

  const ok = results.filter((r) => r.status === 'fulfilled').map((r) => r.value);
  const fail = results.filter((r) => r.status === 'rejected').map((r) => r.reason?.message);
  const motionCams = ok.filter((r) => r.hasMotion).map((r) => `cam${r.ch}`);

  let line = `captured ${ok.length}/${channelCount}`;
  if (motionCams.length > 0) line += ` · motion: ${motionCams.join(', ')}`;
  if (fail.length > 0) line += ` · fails: ${fail.slice(0, 3).join('; ')}`;
  log(line);
}

// ─── Burst analysis trigger ────────────────────────────────────────────────
async function triggerBurst(camera_channel, motion_score, detected_at) {
  // Grab the last 5 frames from this camera (1-5s apart at 3s capture rate)
  const frames = await recentFramesFromBuffer(camera_channel, 5);
  if (frames.length < 2) {
    log(`cam${camera_channel}: not enough frames for burst (${frames.length})`);
    return;
  }
  const frame_urls = (await Promise.all(frames.map((f) => signedUrl(f.frame_path)))).filter(Boolean);
  if (frame_urls.length < 2) {
    log(`cam${camera_channel}: couldn't sign burst frames`);
    return;
  }

  log(`cam${camera_channel}: MOTION (score ${motion_score.toFixed(1)}) — firing burst analysis`);
  const res = await httpJson(
    'POST',
    `${api_url}/api/agent/analyze-burst`,
    {
      agent_key,
      client_id,
      camera_channel,
      motion_score,
      detected_at,
      frame_urls,
    },
    {}
  );
  if (res.status !== 200) {
    log(`cam${camera_channel}: burst ${res.status} — ${JSON.stringify(res.body).slice(0, 200)}`);
    return;
  }
  const { severity, incident_summary, alert_sent, cost_usd } = res.body || {};
  log(
    `cam${camera_channel}: burst ${severity} — "${(incident_summary || '').slice(0, 80)}"` +
    (alert_sent ? ' · WhatsApp fired' : '') +
    (cost_usd ? ` · $${cost_usd.toFixed(4)}` : '')
  );
}

// ─── Track which cameras had motion since last analysis ─────────────────
// Only cameras with at least one motion event (pixel-diff > 0) get sent to
// Claude. Empty rooms are skipped entirely — saves 30-60% on input tokens.
const camsWithMotionSinceLastAnalysis = new Set();

// ─── Scheduled sequence analysis ───────────────────────────────────────────
async function analyzeCycle(channelCount) {
  if (!inScheduleNow()) return;

  const windowMin = analyze_min;
  // Fewer frames per camera = cheaper. 3 frames across a 5-min window is
  // enough for a minute-level timeline; 5 was overkill.
  const framesPerCam = Math.min(3, Math.max(2, Math.floor((windowMin * 60) / capture_sec / 60)));

  const camFrames = [];
  for (let ch = 1; ch <= channelCount; ch++) {
    if (excludeSet.has(ch)) continue;

    // Skip cameras that had zero motion since the last analysis cycle.
    // This means empty rooms (e.g., weights room at 7 AM) don't waste tokens.
    // Always include at least cam1 (reception/entrance) as a baseline.
    if (!camsWithMotionSinceLastAnalysis.has(ch) && ch !== 1 && camsWithMotionSinceLastAnalysis.size > 0) {
      continue;
    }

    const rows = await recentFramesFromBuffer(ch, framesPerCam);
    if (rows.length === 0) continue;
    const urls = (await Promise.all(rows.map((r) => signedUrl(r.frame_path)))).filter(Boolean);
    if (urls.length === 0) continue;
    const oldest = new Date(rows[0].captured_at).getTime();
    const minute_offsets = rows.map((r) =>
      Math.round((new Date(r.captured_at).getTime() - oldest) / 60_000)
    );
    camFrames.push({ camera_channel: ch, frame_urls: urls, minute_offsets });
  }

  // Reset motion tracker for next cycle
  camsWithMotionSinceLastAnalysis.clear();

  if (camFrames.length === 0) {
    log('sequence: no frames to analyse');
    return;
  }

  const windowStart = new Date(Date.now() - windowMin * 60_000).toISOString();
  const windowEnd = new Date().toISOString();

  log(`sequence: analysing ${camFrames.length} cameras × ${framesPerCam} frames (window ${windowMin}m)`);
  const res = await httpJson(
    'POST',
    `${api_url}/api/agent/analyze-sequence`,
    {
      agent_key,
      client_id,
      frames: camFrames,
      window_start: windowStart,
      window_end: windowEnd,
    },
    {}
  );

  if (res.status !== 200) {
    log(`sequence: ${res.status} — ${JSON.stringify(res.body).slice(0, 200)}`);
    return;
  }
  const { workers_detected, alerts_created, idle_minutes, away_minutes, cost_usd, summary } = res.body || {};
  log(
    `sequence: ${workers_detected} detections · ${alerts_created} alerts · ` +
    `idle ${idle_minutes}m · away ${away_minutes}m · $${(cost_usd || 0).toFixed(4)}`
  );
  if (summary) log(`   → ${summary.slice(0, 120)}`);
}

// ─── Main ──────────────────────────────────────────────────────────────────
async function main() {
  log('═══════════════════════════════════════════════');
  log('  LenzAI Edge Agent v2 (temporal + motion)');
  log(`  DVR:          ${dvr_ip}:${dvr_port}`);
  log(`  API:          ${api_url}`);
  log(`  Client:       ${client_id}`);
  log(`  Capture:      every ${capture_sec}s`);
  log(`  Analyze:      every ${analyze_min}m (sequence)`);
  log(`  Motion:       ${motion_enabled && sharpAvailable ? `ON (threshold ${motion_threshold})` : 'OFF'}`);
  log(`  Schedule:     ${schedule}`);
  log('═══════════════════════════════════════════════');

  if (motion_enabled && !sharpAvailable) {
    log('warning: sharp not installed — motion detection disabled. Run: npm install sharp');
  }

  await heartbeat('starting', { v: 2 });

  // Run one capture + analyze immediately so you see output fast
  await captureCycle(max_channels).catch((e) => log(`capture error: ${e.message}`));
  await analyzeCycle(max_channels).catch((e) => log(`analyze error: ${e.message}`));

  // Two independent loops
  setInterval(
    () => captureCycle(max_channels).catch((e) => log(`capture error: ${e.message}`)),
    capture_sec * 1000
  );
  setInterval(
    () => analyzeCycle(max_channels).catch((e) => log(`analyze error: ${e.message}`)),
    analyze_min * 60 * 1000
  );
  setInterval(() => heartbeat('online', { v: 2 }), 60_000);
}

main().catch((err) => {
  log(`Fatal: ${err.message}`);
  process.exit(1);
});
