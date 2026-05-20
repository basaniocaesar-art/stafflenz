import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getAdminClient } from '@/lib/supabase';

// POST /api/onboarding/generate-email
// Returns SMTP settings the client should enter into their DVR's email config.
// Our email-receiver polls the single inbox (admin@stafflenz.com) and routes
// emails to the right client by matching on:
//   1. analysis_config.dvr_email_from  (the DVR's sender address)
//   2. client name appearing in email subject
//   3. fallback to the only active client
export async function POST(request) {
  const session = await requireAuth(request);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { client } = session;
  const clientId = client?.id;
  if (!clientId) return NextResponse.json({ error: 'No client associated' }, { status: 400 });

  const db = getAdminClient();

  // These are the SMTP settings the DVR should use to SEND emails to us.
  // The user's DVR connects to mail.stafflenz.com SMTP and sends snapshots to
  // admin@stafflenz.com (or a dedicated ingest address).
  const smtp_host        = process.env.DVR_SMTP_HOST || 'mail.stafflenz.com';
  const smtp_port        = Number(process.env.DVR_SMTP_PORT || 465);
  const smtp_username    = process.env.DVR_SMTP_USERNAME || 'admin@stafflenz.com';
  const smtp_password    = process.env.DVR_SMTP_PASSWORD || '';
  const recipient_email  = process.env.DVR_RECIPIENT_EMAIL || 'admin@stafflenz.com';

  // Mark the client's site as using email connection method (best-effort)
  try {
    const { data: existing } = await db
      .from('sites')
      .select('id')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false })
      .limit(1);
    if (existing?.length) {
      await db.from('sites').update({ connection_method: 'email' }).eq('id', existing[0].id);
    }
  } catch { /* sites table may not exist */ }

  return NextResponse.json({
    smtp_host,
    smtp_port,
    smtp_username,
    smtp_password,
    recipient_email,
    ssl: true,
  });
}
