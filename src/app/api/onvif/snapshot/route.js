import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { createHash } from 'crypto';

// Returns a single camera snapshot as a proxied image
// GET /api/onvif/snapshot?channel=1
// Uses env vars for DVR connection (same as capture route)

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

export async function GET(request) {
  const session = await requireAuth(request);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const channel = new URL(request.url).searchParams.get('channel') || '1';
  const ch = (Number(channel) * 100) + 1; // 1→101, 2→201, etc.

  const host = process.env.DVR_HOST;
  const port = process.env.DVR_PORT || 80;
  const username = process.env.DVR_USERNAME;
  const password = process.env.DVR_PASSWORD;

  if (!host || !username || !password) {
    return NextResponse.json({ error: 'DVR not configured' }, { status: 400 });
  }

  const protocol = host.includes('ngrok') || Number(port) === 443 ? 'https' : 'http';
  const portSuffix = (protocol === 'https' && Number(port) === 443) || (protocol === 'http' && Number(port) === 80) ? '' : `:${port}`;
  const url = `${protocol}://${host}${portSuffix}/ISAPI/Streaming/channels/${ch}/picture`;

  try {
    const res = await fetchWithDigest(url, username, password);
    if (!res.ok) return NextResponse.json({ error: `Camera ${channel}: HTTP ${res.status}` }, { status: 502 });

    const buffer = Buffer.from(await res.arrayBuffer());
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'image/jpeg',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 502 });
  }
}
