#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════════════════════════
// LenzAI Edge Agent v1.0
// Runs on a Raspberry Pi (or any device) on the client's local network.
// Captures camera snapshots via ONVIF/ISAPI and uploads to LenzAI cloud.
// ═══════════════════════════════════════════════════════════════════════════════

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const https = require('https');
const http = require('http');

// ─── Config ──────────────────────────────────────────────────────────────────
const CONFIG_PATH = path.join(__dirname, 'config.json');

function loadConfig() {
  if (!fs.existsSync(CONFIG_PATH)) {
    console.error('No config.json found. Run: node setup.js');
    process.exit(1);
  }
  return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
}

const config = loadConfig();
const {
  agent_key,        // API key for authenticating with LenzAI cloud
  api_url,          // e.g. https://www.stafflenz.com
  supabase_url,     // e.g. https://xxx.supabase.co
  supabase_key,     // service role key for storage uploads
  client_id,        // client UUID in LenzAI
  dvr_ip,           // DVR local IP
  dvr_port = 80,    // DVR HTTP port
  dvr_username,     // DVR login
  dvr_password,     // DVR password
  interval_ms = 300000, // 5 minutes default
  max_channels = 8,
} = config;

// ─── HTTP helpers ────────────────────────────────────────────────────────────
function httpGet(url, headers = {}) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? https : http;
    const req = mod.get(url, { headers, timeout: 15000 }, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks) }));
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Request timeout')); });
  });
}

function httpPost(url, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const mod = parsed.protocol === 'https:' ? https : http;
    const options = {
      hostname: parsed.hostname,
      port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
      path: parsed.pathname + parsed.search,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      timeout: 30000,
    };
    const req = mod.request(options, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(Buffer.concat(chunks).toString()) }); }
        catch { resolve({ status: res.statusCode, body: Buffer.concat(chunks).toString() }); }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Request timeout')); });
    if (typeof body === 'string') req.write(body);
    else if (Buffer.isBuffer(body)) req.write(body);
    req.end();
  });
}

function httpPut(url, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const mod = parsed.protocol === 'https:' ? https : http;
    const options = {
      hostname: parsed.hostname,
      port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
      path: parsed.pathname + parsed.search,
      method: 'POST', // Supabase storage uses POST for upload
      headers,
      timeout: 30000,
    };
    const req = mod.request(options, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(Buffer.concat(chunks).toString()) }); }
        catch { resolve({ status: res.statusCode, body: Buffer.concat(chunks).toString() }); }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Request timeout')); });
    req.write(body);
    req.end();
  });
}

// ─── Digest Auth for Hikvision DVRs ──────────────────────────────────────────
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
  const user = username.trim();
  const pass = password.trim();

  const ha1 = crypto.createHash('md5').update(`${user}:${realm}:${pass}`).digest('hex');
  const ha2 = crypto.createHash('md5').update(`GET:${uri}`).digest('hex');
  const response = qop
    ? crypto.createHash('md5').update(`${ha1}:${nonce}:${nc}:${cnonce}:${qop}:${ha2}`).digest('hex')
    : crypto.createHash('md5').update(`${ha1}:${nonce}:${ha2}`).digest('hex');

  const authHeader = [
    `Digest username="${user}"`,
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

// ─── ONVIF Discovery ─────────────────────────────────────────────────────────
async function discoverChannels() {
  try {
    const { Cam } = require('onvif');
    return new Promise((resolve) => {
      const timeout = setTimeout(() => { log('ONVIF timeout, using fallback'); resolve(max_channels); }, 10000);
      new Cam(
        { hostname: dvr_ip, username: dvr_username, password: dvr_password, port: dvr_port, timeout: 8000 },
        function (err) {
          clearTimeout(timeout);
          if (err) { log(`ONVIF error: ${err.message}, using fallback`); return resolve(max_channels); }
          this.getProfiles((profileErr, profiles) => {
            if (profileErr || !profiles) return resolve(max_channels);
            log(`ONVIF discovered ${profiles.length} channels`);
            resolve(profiles.length);
          });
        }
      );
    });
  } catch (e) {
    log(`ONVIF not available: ${e.message}, using ${max_channels} channels`);
    return max_channels;
  }
}

// ─── Snapshot Capture ────────────────────────────────────────────────────────
function snapshotUrl(channelIndex) {
  const channel = (channelIndex * 100) + 1;
  return `http://${dvr_ip}:${dvr_port}/ISAPI/Streaming/channels/${channel}/picture`;
}

async function captureChannel(ch) {
  const url = snapshotUrl(ch);
  const res = await fetchWithDigest(url, dvr_username, dvr_password);
  if (res.status !== 200) throw new Error(`Channel ${ch}: HTTP ${res.status}`);
  const contentType = (res.headers['content-type'] || '');
  if (!contentType.includes('image')) throw new Error(`Channel ${ch}: not an image`);
  return res.body;
}

async function captureAll(channelCount) {
  const results = await Promise.allSettled(
    Array.from({ length: channelCount }, (_, i) => captureChannel(i + 1))
  );
  const snapshots = results.filter(r => r.status === 'fulfilled').map(r => r.value);
  const failures = results.filter(r => r.status === 'rejected').map(r => r.reason?.message);
  if (failures.length) log(`Capture failures: ${failures.join(', ')}`);
  return { snapshots, failures };
}

// ─── Image Stitching (pure Node.js — no sharp dependency) ────────────────────
// On Pi we just upload individual frames, the cloud stitches them
// But for simplicity, upload the first frame as the "grid" and all individually

// ─── Supabase Upload ─────────────────────────────────────────────────────────
async function uploadToSupabase(buffer, filePath) {
  const url = `${supabase_url}/storage/v1/object/frames/${filePath}`;
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
      timeout: 30000,
    };
    const req = mod.request(options, (res) => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve({ status: res.statusCode, body: Buffer.concat(chunks).toString() }));
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Upload timeout')); });
    req.write(buffer);
    req.end();
  });
}

// ─── Trigger Cloud Analysis ──────────────────────────────────────────────────
async function triggerAnalysis(frameUrl) {
  return httpPost(`${api_url}/api/agent/analyze`, JSON.stringify({
    agent_key,
    client_id,
    frame_url: frameUrl,
  }), { 'Content-Type': 'application/json' });
}

// ─── Heartbeat ───────────────────────────────────────────────────────────────
async function sendHeartbeat(status, channelCount, lastCapture) {
  try {
    await httpPost(`${api_url}/api/agent/heartbeat`, JSON.stringify({
      agent_key,
      client_id,
      status,
      channels: channelCount,
      last_capture: lastCapture,
      uptime: process.uptime(),
    }), { 'Content-Type': 'application/json' });
  } catch (e) {
    log(`Heartbeat failed: ${e.message}`);
  }
}

// ─── Logging ─────────────────────────────────────────────────────────────────
function log(msg) {
  const ts = new Date().toISOString().replace('T', ' ').slice(0, 19);
  console.log(`[${ts}] ${msg}`);
}

// ─── Main Loop ───────────────────────────────────────────────────────────────
async function runCycle(channelCount) {
  const cycleStart = Date.now();
  log(`--- Capture cycle starting (${channelCount} channels) ---`);

  try {
    // 1. Capture all channels
    const { snapshots, failures } = await captureAll(channelCount);
    if (snapshots.length === 0) {
      log('No snapshots captured');
      await sendHeartbeat('capture_failed', channelCount, null);
      return;
    }

    log(`Captured ${snapshots.length}/${channelCount} cameras`);

    // 2. Upload each snapshot individually
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const uploadResults = await Promise.allSettled(
      snapshots.map(async (buf, i) => {
        const filePath = `${client_id}/cam${i + 1}_${timestamp}.jpg`;
        const res = await uploadToSupabase(buf, filePath);
        if (res.status >= 400) throw new Error(`Upload failed: ${res.status} ${res.body}`);
        return filePath;
      })
    );

    const uploaded = uploadResults.filter(r => r.status === 'fulfilled').map(r => r.value);
    const uploadFails = uploadResults.filter(r => r.status === 'rejected').length;
    log(`Uploaded ${uploaded.length} frames (${uploadFails} failed)`);

    // 3. Analyze EVERY uploaded camera, not just camera 01 — otherwise workers
    //    on channels 2-8 are invisible to Claude.
    let totalWorkers = 0;
    let totalAlerts = 0;
    for (let i = 0; i < uploaded.length; i++) {
      const path = uploaded[i];
      const signedRes = await httpPost(
        `${supabase_url}/storage/v1/object/sign/frames/${path}`,
        JSON.stringify({ expiresIn: 3600 }),
        { 'Content-Type': 'application/json', Authorization: `Bearer ${supabase_key}`, apikey: supabase_key }
      );
      const frameUrl = signedRes.body?.signedURL
        ? `${supabase_url}/storage/v1${signedRes.body.signedURL}`
        : null;
      if (!frameUrl) { log(`cam${i + 1}: no signed URL`); continue; }

      const analysis = await triggerAnalysis(frameUrl);
      if (analysis.status === 200 && analysis.body?.success) {
        const a = analysis.body.analysis || {};
        const w = a.detected_workers?.length || 0;
        const al = a.alerts?.length || 0;
        totalWorkers += w;
        totalAlerts += al;
        const names = (a.detected_workers || []).map(d => d.worker_name).filter(Boolean).join(', ') || 'none';
        log(`cam${i + 1}: ${w} workers [${names}], ${al} alerts`);
      } else {
        log(`cam${i + 1}: analysis failed ${analysis.status}`);
      }
    }
    log(`Cycle totals: ${totalWorkers} worker detections, ${totalAlerts} alerts across ${uploaded.length} cameras`);

    // 6. Heartbeat
    await sendHeartbeat('online', channelCount, new Date().toISOString());

    // 7. Cleanup old frames (keep last 10 per camera)
    // Done server-side

    const elapsed = ((Date.now() - cycleStart) / 1000).toFixed(1);
    log(`Cycle complete in ${elapsed}s — next in ${interval_ms / 1000}s`);

  } catch (err) {
    log(`Cycle error: ${err.message}`);
    await sendHeartbeat('error', channelCount, null);
  }
}

// ─── Start ───────────────────────────────────────────────────────────────────
async function main() {
  log('═══════════════════════════════════════════════');
  log('  LenzAI Edge Agent v1.0');
  log(`  DVR: ${dvr_ip}:${dvr_port}`);
  log(`  API: ${api_url}`);
  log(`  Client: ${client_id}`);
  log(`  Interval: ${interval_ms / 1000}s`);
  log('═══════════════════════════════════════════════');

  // Discover channels
  const channelCount = await discoverChannels();
  log(`Using ${channelCount} channels`);

  // Initial heartbeat
  await sendHeartbeat('starting', channelCount, null);

  // Run first cycle immediately
  await runCycle(channelCount);

  // Then run on interval
  setInterval(() => runCycle(channelCount), interval_ms);
}

main().catch((err) => {
  log(`Fatal: ${err.message}`);
  process.exit(1);
});
