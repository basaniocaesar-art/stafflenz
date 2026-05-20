import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase';

// ═══════════════════════════════════════════════════════════════════════════════
// HTTP Webhook Receiver — DVR pushes snapshots directly to this endpoint.
// Works with Hikvision "HTTP Listening", Dahua "HTTP Upload", etc.
//
// The DVR is configured with:
//   URL: https://app.stafflenz.com/api/monitor/webhook-receiver?key=<client-secret>
//   Method: POST
//   Content-Type: multipart/form-data OR image/jpeg (raw binary)
//
// We identify the client via the ?key= query param (matches clients.webhook_key)
// and save the snapshot to Supabase Storage under frames/<client_id>/<ts>.jpg.
// Then we insert a row into frame_queue for the 15-min batch cron to analyze —
// this keeps Claude API costs identical to the FTP/email receivers.
//
// If you want INSTANT analysis instead of batched, flip BATCH_MODE to false below
// and Claude will run inline per snapshot. Costs scale linearly with motion events.
// ═══════════════════════════════════════════════════════════════════════════════

const BATCH_MODE = true; // true = queue for cron, false = analyze immediately

export async function POST(request) {
  const { searchParams } = new URL(request.url);
  const webhookKey = searchParams.get('key');

  if (!webhookKey) {
    return NextResponse.json({ error: 'Missing ?key= query parameter' }, { status: 400 });
  }

  const db = getAdminClient();

  // ── Look up client by webhook_key ──────────────────────────────────────────
  // We try webhook_key first, fall back to agent_key if the column doesn't exist.
  let client;
  const webhookResult = await db
    .from('clients')
    .select('id, name, is_active')
    .eq('webhook_key', webhookKey)
    .single();

  if (webhookResult.data) {
    client = webhookResult.data;
  } else {
    // Fallback: allow the agent_key to be reused as a webhook key during migration
    const agentResult = await db
      .from('clients')
      .select('id, name, is_active')
      .eq('agent_key', webhookKey)
      .single();
    client = agentResult.data;
  }

  if (!client) {
    return NextResponse.json({ error: 'Invalid webhook key' }, { status: 403 });
  }
  if (client.is_active === false) {
    return NextResponse.json({ error: 'Client inactive' }, { status: 403 });
  }

  // ── Extract the image from the request ────────────────────────────────────
  // Support three common DVR formats:
  //   1. multipart/form-data with a file field (Hikvision, Dahua)
  //   2. raw image/jpeg body
  //   3. application/x-www-form-urlencoded with base64 image field
  let imageBuffer = null;
  const contentType = request.headers.get('content-type') || '';

  try {
    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      // Try common field names used by DVR brands
      const fileFields = ['file', 'image', 'picture', 'snapshot', 'attachment'];
      for (const field of fileFields) {
        const f = formData.get(field);
        if (f && typeof f.arrayBuffer === 'function') {
          imageBuffer = Buffer.from(await f.arrayBuffer());
          break;
        }
      }
      // Last resort: grab the first file-like entry
      if (!imageBuffer) {
        for (const [, value] of formData.entries()) {
          if (value && typeof value.arrayBuffer === 'function') {
            imageBuffer = Buffer.from(await value.arrayBuffer());
            break;
          }
        }
      }
    } else if (contentType.startsWith('image/')) {
      imageBuffer = Buffer.from(await request.arrayBuffer());
    } else if (contentType.includes('application/json')) {
      const body = await request.json();
      const b64 = body.image || body.snapshot || body.data;
      if (b64) imageBuffer = Buffer.from(b64, 'base64');
    } else {
      // Fallback — try raw arrayBuffer and hope it's an image
      imageBuffer = Buffer.from(await request.arrayBuffer());
    }
  } catch (err) {
    return NextResponse.json({ error: `Failed to parse upload: ${err.message}` }, { status: 400 });
  }

  if (!imageBuffer || imageBuffer.length < 1000) {
    return NextResponse.json({ error: 'No valid image found in request' }, { status: 400 });
  }

  // ── Save to Supabase Storage ───────────────────────────────────────────────
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const framePath = `${client.id}/webhook-${timestamp}.jpg`;

  const { error: uploadErr } = await db.storage.from('frames').upload(
    framePath,
    imageBuffer,
    { contentType: 'image/jpeg', upsert: false }
  );

  if (uploadErr) {
    return NextResponse.json({ error: `Storage upload failed: ${uploadErr.message}` }, { status: 500 });
  }

  // ── Queue for the batch cron OR analyze immediately ───────────────────────
  if (BATCH_MODE) {
    // Insert into frame_queue table for the 15-min cron to pick up.
    // Falls back gracefully if the table doesn't exist yet — the frame is still
    // in storage and a later migration can backfill.
    try {
      await db.from('frame_queue').insert({
        client_id: client.id,
        frame_path: framePath,
        source: 'webhook',
        status: 'pending',
        created_at: new Date().toISOString(),
      });
    } catch { /* frame_queue table may not exist yet */ }

    return NextResponse.json({
      ok: true,
      mode: 'queued',
      client: client.name,
      frame_path: framePath,
      message: 'Snapshot queued — will be analyzed in the next 15-min batch',
    });
  }

  // Inline mode — trigger /api/monitor/analyze immediately
  try {
    const { data: signed } = await db.storage.from('frames').createSignedUrl(framePath, 600);
    if (!signed?.signedUrl) {
      return NextResponse.json({ ok: true, mode: 'stored', warning: 'Could not sign URL for immediate analysis' });
    }

    const analyzeUrl = new URL('/api/monitor/analyze', request.url);
    await fetch(analyzeUrl.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-secret': process.env.INTERNAL_SECRET || '',
      },
      body: JSON.stringify({
        client_id: client.id,
        frame_urls: [signed.signedUrl],
      }),
    });

    return NextResponse.json({
      ok: true,
      mode: 'analyzed',
      client: client.name,
      frame_path: framePath,
    });
  } catch (err) {
    return NextResponse.json({
      ok: true,
      mode: 'stored',
      client: client.name,
      warning: `Inline analysis failed: ${err.message}`,
    });
  }
}

// DVRs that use GET with a query string for testing
export async function GET(request) {
  return NextResponse.json({
    service: 'StaffLenz Webhook Receiver',
    usage: 'POST image to this URL with ?key=<your-webhook-key>',
    supported_formats: ['multipart/form-data', 'image/jpeg', 'application/json (base64)'],
  });
}
