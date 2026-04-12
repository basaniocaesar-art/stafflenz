import { NextResponse } from 'next/server';
import { createHmac } from 'crypto';
import { getAdminClient } from '@/lib/supabase';
import sharp from 'sharp';

// ─── Hikvision Open Platform API ────────────────────────────────────────────
// Docs: https://open.hikvisioneurope.com (Technology Partner Portal → API Docs)
// Base URL may vary by region — check partner portal for your region's endpoint
const HIK_BASE_URL = 'https://open.hikconnect.com/open/api';

// Generate HMAC-SHA256 signature for Hikvision Open Platform requests
// StringToSign = method\nContentMD5\nContentType\nDate\nCanonicalizedResource
function buildAuthHeader(method, path, contentType = '') {
  const accessKey = process.env.HIK_ACCESS_KEY;
  const secretKey = process.env.HIK_SECRET_KEY;
  if (!accessKey || !secretKey) throw new Error('HIK_ACCESS_KEY / HIK_SECRET_KEY not set');

  const date = new Date().toUTCString();
  const stringToSign = [method.toUpperCase(), '', contentType, date, path].join('\n');
  const signature = createHmac('sha256', secretKey).update(stringToSign).digest('base64');

  return {
    Authorization: `HikvisionAK ${accessKey}:${signature}`,
    Date: date,
    'Content-Type': contentType || 'application/json',
  };
}

// Fetch JSON from Hikvision Open Platform
async function hikFetch(path, options = {}) {
  const method = options.method || 'GET';
  const headers = buildAuthHeader(method, path, options.contentType);
  const res = await fetch(`${HIK_BASE_URL}${path}`, {
    method,
    headers: { ...headers, ...options.extraHeaders },
    body: options.body,
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HikConnect API error ${res.status}: ${text}`);
  }
  return res.json();
}

// Get all devices registered to a HikConnect account
async function getDevices(accountId) {
  const data = await hikFetch(`/v1/account/${accountId}/device/list`);
  return data.data || data.devices || [];
}

// Get camera channels for a device
async function getChannels(deviceSerial) {
  const data = await hikFetch(`/v1/device/${deviceSerial}/channel/list`);
  return data.data || data.channels || [];
}

// Get a snapshot URL for a specific channel
async function getSnapshotUrl(deviceSerial, channelNo) {
  const data = await hikFetch(`/v1/device/${deviceSerial}/channel/${channelNo}/snapshot`);
  // Response contains a pre-signed URL to the snapshot image
  return data.data?.url || data.url || null;
}

function verifyInternalSecret(request) {
  return request.headers.get('x-internal-secret') === process.env.INTERNAL_SECRET;
}

export async function POST(request) {
  if (!verifyInternalSecret(request)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json();
  const { client_id } = body;
  if (!client_id) return NextResponse.json({ error: 'client_id required' }, { status: 400 });

  const db = getAdminClient();

  // Get client's HikConnect account ID
  const { data: client, error: clientError } = await db
    .from('clients')
    .select('id, name, hikconnect_account_id')
    .eq('id', client_id)
    .single();

  if (clientError || !client) return NextResponse.json({ error: 'Client not found' }, { status: 404 });
  if (!client.hikconnect_account_id) {
    return NextResponse.json({ error: 'No HikConnect account ID configured for this client' }, { status: 400 });
  }

  // Get devices for this account
  let devices;
  try {
    devices = await getDevices(client.hikconnect_account_id);
  } catch (e) {
    return NextResponse.json({ error: `HikConnect device fetch failed: ${e.message}` }, { status: 502 });
  }

  if (!devices.length) {
    return NextResponse.json({ error: 'No devices found for this HikConnect account' }, { status: 400 });
  }

  // For each device, get channels and capture a snapshot
  const snapshotResults = await Promise.allSettled(
    devices.flatMap(device =>
      (device.channels || [{ channelNo: 1 }]).map(async ch => {
        const snapshotUrl = await getSnapshotUrl(device.deviceSerial || device.serial, ch.channelNo || ch.channel_no || 1);
        if (!snapshotUrl) throw new Error(`No snapshot URL for device ${device.deviceSerial}`);
        const res = await fetch(snapshotUrl, { signal: AbortSignal.timeout(10000) });
        if (!res.ok) throw new Error(`Snapshot fetch failed: HTTP ${res.status}`);
        const buffer = Buffer.from(await res.arrayBuffer());
        return { label: `${device.deviceName || device.name} / Ch${ch.channelNo || 1}`, buffer };
      })
    )
  );

  const snapshots = snapshotResults.filter(r => r.status === 'fulfilled').map(r => r.value.buffer);
  const failures  = snapshotResults.filter(r => r.status === 'rejected').map(r => r.reason?.message);

  if (failures.length) console.error('HikConnect capture failures:', failures);

  if (!snapshots.length) {
    return NextResponse.json({ error: 'No snapshots captured', details: failures }, { status: 502 });
  }

  // Stitch snapshots into grid and store in Supabase Storage
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

  // Keep only last 5 frames
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
    source: 'hikconnect',
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
