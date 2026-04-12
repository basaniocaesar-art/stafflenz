import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { createHash } from 'crypto';

// Quick test: tries to grab a single snapshot from the DVR via env vars
// Used to verify the ngrok tunnel + DVR connection is working

async function fetchWithDigest(url, username, password) {
  const res1 = await fetch(url, { headers: { 'ngrok-skip-browser-warning': 'true' }, signal: AbortSignal.timeout(10000) });
  if (res1.status !== 401) return res1;

  const wwwAuth = res1.headers.get('www-authenticate') || '';
  const realm  = (wwwAuth.match(/realm="([^"]+)"/)  || [])[1] || '';
  const nonce  = (wwwAuth.match(/nonce="([^"]+)"/)  || [])[1] || '';
  const qop    = (wwwAuth.match(/qop="([^"]+)"/)    || [])[1] || '';
  const opaque = (wwwAuth.match(/opaque="([^"]+)"/) || [])[1] || '';

  const method = 'GET';
  const uri = new URL(url).pathname + new URL(url).search;
  const nc = '00000001';
  const cnonce = createHash('md5').update(Math.random().toString()).digest('hex').slice(0, 8);

  const ha1 = createHash('md5').update(`${username}:${realm}:${password}`).digest('hex');
  const ha2 = createHash('md5').update(`${method}:${uri}`).digest('hex');
  const response = qop
    ? createHash('md5').update(`${ha1}:${nonce}:${nc}:${cnonce}:${qop}:${ha2}`).digest('hex')
    : createHash('md5').update(`${ha1}:${nonce}:${ha2}`).digest('hex');

  const authHeader = [
    `Digest username="${username}"`,
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

  const host = process.env.DVR_HOST;
  const port = process.env.DVR_PORT || 80;
  const username = process.env.DVR_USERNAME;
  const password = process.env.DVR_PASSWORD;

  if (!host || !username || !password) {
    return NextResponse.json({ error: 'DVR env vars not set (DVR_HOST, DVR_USERNAME, DVR_PASSWORD)' }, { status: 400 });
  }

  const protocol = host.includes('ngrok') || Number(port) === 443 ? 'https' : 'http';
  const portSuffix = (protocol === 'https' && Number(port) === 443) || (protocol === 'http' && Number(port) === 80) ? '' : `:${port}`;
  const url = `${protocol}://${host}${portSuffix}/ISAPI/Streaming/channels/101/picture`;

  try {
    const res = await fetchWithDigest(url, username, password);

    if (!res.ok) {
      return NextResponse.json({
        error: `DVR returned HTTP ${res.status}`,
        url: url.replace(password, '***'),
        headers: Object.fromEntries(res.headers.entries()),
      }, { status: 502 });
    }

    const contentType = res.headers.get('content-type') || '';
    const buffer = Buffer.from(await res.arrayBuffer());

    return new NextResponse(buffer, {
      status: 200,
      headers: { 'Content-Type': contentType || 'image/jpeg' },
    });
  } catch (err) {
    return NextResponse.json({
      error: err.message,
      url: url.replace(password, '***'),
    }, { status: 502 });
  }
}
