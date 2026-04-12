import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { requireAuth } from '@/lib/auth';
import { getAdminClient } from '@/lib/supabase';

// POST /api/onboarding/generate-webhook
// Returns the HTTP webhook URL the client pastes into their DVR.
// The URL contains a per-client secret (webhook_key) so the webhook-receiver
// can identify which client a snapshot belongs to.
//
// If the client has no webhook_key yet (migration not run, or pre-migration
// client), we generate and persist one — best-effort, so the UI doesn't block.
export async function POST(request) {
  const session = await requireAuth(request);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { client } = session;
  const clientId = client?.id;
  if (!clientId) return NextResponse.json({ error: 'No client associated' }, { status: 400 });

  const db = getAdminClient();

  // Look up existing webhook_key
  let webhookKey = null;
  try {
    const { data } = await db
      .from('clients')
      .select('webhook_key')
      .eq('id', clientId)
      .single();
    webhookKey = data?.webhook_key || null;
  } catch { /* column may not exist yet */ }

  // Generate + persist if missing
  if (!webhookKey) {
    webhookKey = crypto.randomBytes(16).toString('hex');
    try {
      await db.from('clients').update({ webhook_key: webhookKey }).eq('id', clientId);
    } catch {
      // webhook_key column may not exist — still return the key so the UI works,
      // the webhook-receiver will fall back to agent_key lookup.
    }
  }

  // Build the full webhook URL. NEXT_PUBLIC_SITE_URL takes precedence, otherwise
  // infer from the request so local dev works without env vars.
  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    (request.headers.get('x-forwarded-proto') && request.headers.get('host')
      ? `${request.headers.get('x-forwarded-proto')}://${request.headers.get('host')}`
      : new URL(request.url).origin);

  const webhookUrl = `${baseUrl}/api/monitor/webhook-receiver?key=${webhookKey}`;

  return NextResponse.json({
    webhook_url: webhookUrl,
    webhook_key: webhookKey,
    method: 'POST',
    content_types: ['multipart/form-data', 'image/jpeg', 'application/json'],
  });
}
