import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase';
import { createHash } from 'crypto';
import sharp from 'sharp';

// ─── Hikvision DVRs use HTTP Digest auth for ISAPI ──────────────────────────
async function fetchWithDigest(url, username, password) {
  const user = (username || '').trim();
  const pass = (password || '').trim();
  const res1 = await fetch(url, { headers: { 'ngrok-skip-browser-warning': 'true' }, signal: AbortSignal.timeout(10000) });
  if (res1.status !== 401) return res1;

  const wwwAuth = res1.headers.get('www-authenticate') || '';
  const realm  = ((wwwAuth.match(/realm="([^"]+)"/)  || [])[1] || '').trim();
  const nonce  = ((wwwAuth.match(/nonce="([^"]+)"/)  || [])[1] || '').trim();
  const qop    = ((wwwAuth.match(/qop="([^"]+)"/)    || [])[1] || '').trim();
  const opaque = ((wwwAuth.match(/opaque="([^"]+)"/) || [])[1] || '').trim();

  const method = 'GET';
  const uri = new URL(url).pathname + new URL(url).search;
  const nc = '00000001';
  const cnonce = createHash('md5').update(Math.random().toString()).digest('hex').slice(0, 8);

  const ha1 = createHash('md5').update(`${user}:${realm}:${pass}`).digest('hex');
  const ha2 = createHash('md5').update(`${method}:${uri}`).digest('hex');
  const response = qop
    ? createHash('md5').update(`${ha1}:${nonce}:${nc}:${cnonce}:${qop}:${ha2}`).digest('hex')
    : createHash('md5').update(`${ha1}:${nonce}:${ha2}`).digest('hex');

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

  return fetch(url, {
    headers: { Authorization: authHeader, 'ngrok-skip-browser-warning': 'true' },
    signal: AbortSignal.timeout(10000),
  });
}

function verifyInternalSecret(request) {
  return request.headers.get('x-internal-secret') === process.env.INTERNAL_SECRET;
}

// ISAPI snapshot URL: channels are numbered 101, 201, 301, etc.
// Supports ngrok tunnels (https on port 443) and direct HTTP connections
function snapshotUrl(host, port, channelIndex) {
  const channel = (channelIndex * 100) + 1;
  const protocol = host.includes('ngrok') || Number(port) === 443 ? 'https' : 'http';
  const portSuffix = (protocol === 'https' && Number(port) === 443) || (protocol === 'http' && Number(port) === 80) ? '' : `:${port}`;
  return `${protocol}://${host}${portSuffix}/ISAPI/Streaming/channels/${channel}/picture`;
}

export async function POST(request) {
  if (!verifyInternalSecret(request)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { client_id } = await request.json();
  if (!client_id) return NextResponse.json({ error: 'client_id required' }, { status: 400 });

  const db = getAdminClient();

  // Get client's DVR connection details — try DB columns first, fall back to env vars
  let dvr_host, dvr_port, dvr_username, dvr_password;

  const full = await db.from('clients').select('id, name, dvr_host, dvr_port, dvr_username, dvr_password').eq('id', client_id).single();
  if (full.error && full.error.message?.includes('column')) {
    // Migration hasn't run — check client exists, use env vars
    const base = await db.from('clients').select('id, name').eq('id', client_id).single();
    if (!base.data) return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    dvr_host = process.env.DVR_HOST;
    dvr_port = process.env.DVR_PORT || 80;
    dvr_username = process.env.DVR_USERNAME;
    dvr_password = process.env.DVR_PASSWORD;
  } else if (!full.data) {
    return NextResponse.json({ error: 'Client not found' }, { status: 404 });
  } else {
    dvr_host = full.data.dvr_host || process.env.DVR_HOST;
    dvr_port = full.data.dvr_port || process.env.DVR_PORT || 80;
    dvr_username = full.data.dvr_username || process.env.DVR_USERNAME;
    dvr_password = full.data.dvr_password || process.env.DVR_PASSWORD;
  }

  if (!dvr_host || !dvr_username || !dvr_password) {
    return NextResponse.json({ error: 'DVR connection not configured. Set DVR_HOST, DVR_USERNAME, DVR_PASSWORD env vars or add dvr columns to clients table.' }, { status: 400 });
  }

  const host = dvr_host;
  const port = dvr_port;
  const username = dvr_username;
  const password = dvr_password;

  // Discover how many channels — skip ONVIF discovery for tunneled connections (ngrok)
  // since ONVIF protocol doesn't work through HTTP tunnels
  let channelCount = 0;
  const isTunneled = host.includes('ngrok') || host.includes('cloudflare');

  if (!isTunneled) {
    try {
      const { Cam } = await import('onvif').then(m => m.default || m);

      channelCount = await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('ONVIF connection timed out')), 15000);

        new Cam(
          { hostname: host, username, password, port: Number(port), timeout: 10000 },
          function (err) {
            clearTimeout(timeout);
            if (err) return reject(new Error(err.message || 'ONVIF connection failed'));

            this.getProfiles((profileErr, profiles) => {
              if (profileErr || !profiles) return resolve(0);
              resolve(profiles.length);
            });
          }
        );
      });
    } catch (e) {
      console.warn('ONVIF discovery failed, trying ISAPI fallback:', e.message);
      channelCount = 8; // fallback to max channels for 8-ch DVR
    }
  } else {
    // For tunneled connections, try up to 8 channels (DVR model's max)
    channelCount = 8;
  }

  if (channelCount === 0) {
    return NextResponse.json({ error: 'No camera channels found on DVR' }, { status: 400 });
  }

  // Capture snapshot from each channel via ISAPI — sequential to avoid DVR session limits
  const results = [];
  for (let ch = 1; ch <= channelCount; ch++) {
    try {
      const url = snapshotUrl(host, port, ch);
      const res = await fetchWithDigest(url, username, password);

      if (!res.ok) throw new Error(`Channel ${ch}: HTTP ${res.status}`);

      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('image')) throw new Error(`Channel ${ch}: not an image (${contentType})`);

      results.push({ status: 'fulfilled', value: { channel: ch, buffer: Buffer.from(await res.arrayBuffer()) } });
    } catch (err) {
      results.push({ status: 'rejected', reason: err });
    }
  }

  const snapshots = results.filter(r => r.status === 'fulfilled').map(r => r.value.buffer);
  const failures = results.filter(r => r.status === 'rejected').map(r => r.reason?.message);

  if (failures.length) console.error('ONVIF capture failures:', failures);

  if (!snapshots.length) {
    return NextResponse.json({ error: 'No snapshots captured from DVR', details: failures }, { status: 502 });
  }

  // Stitch into grid and upload to Supabase Storage
  const stitchedBuffer = await stitchImages(snapshots);
  const timestamp = new Date().toISOString();
  const framePath = `${client_id}/${timestamp.replace(/[:.]/g, '-')}.jpg`;

  const { error: uploadError } = await db.storage
    .from('frames')
    .upload(framePath, stitchedBuffer, { contentType: 'image/jpeg', upsert: false });

  if (uploadError) {
    return NextResponse.json({ error: `Storage upload failed: ${uploadError.message}` }, { status: 500 });
  }

  const { data: signed } = await db.storage.from('frames').createSignedUrl(framePath, 3600);

  // Keep only last 5 frames per client
  const { data: existing } = await db.storage.from('frames').list(client_id, {
    sortBy: { column: 'created_at', order: 'asc' },
  });
  if (existing && existing.length > 5) {
    const toDelete = existing.slice(0, existing.length - 5).map(f => `${client_id}/${f.name}`);
    await db.storage.from('frames').remove(toDelete);
  }

  return NextResponse.json({
    success: true,
    frame_url: signed?.signedUrl || null,
    cameras_captured: snapshots.length,
    cameras_failed: failures.length,
    timestamp,
    source: 'onvif',
  });
}

async function stitchImages(buffers) {
  if (buffers.length === 1) return buffers[0];
  const CELL_W = 640, CELL_H = 480;
  const cols = Math.ceil(Math.sqrt(buffers.length));
  const rows = Math.ceil(buffers.length / cols);
  const composites = await Promise.all(
    buffers.map(async (buf, i) => ({
      input: await sharp(buf).resize(CELL_W, CELL_H, { fit: 'cover' }).toBuffer(),
      left: (i % cols) * CELL_W,
      top: Math.floor(i / cols) * CELL_H,
    }))
  );
  return sharp({ create: { width: cols * CELL_W, height: rows * CELL_H, channels: 3, background: { r: 0, g: 0, b: 0 } } })
    .composite(composites)
    .jpeg({ quality: 85 })
    .toBuffer();
}
