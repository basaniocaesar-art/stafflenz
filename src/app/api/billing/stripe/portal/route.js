import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getAdminClient } from '@/lib/supabase';
import { createPortalSession } from '@/lib/stripe';

// POST /api/billing/stripe/portal
// Returns a short-lived URL to Stripe's hosted customer portal — users
// can update payment method, download invoices, and cancel from there.
// Stripe handles all the UI.

export const dynamic = 'force-dynamic';

export async function POST(request) {
  const session = await requireAuth(request);
  if (!session || !session.client) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db = getAdminClient();
  const { data: client } = await db
    .from('clients')
    .select('id, stripe_customer_id, payment_provider')
    .eq('id', session.client.id)
    .single();

  if (!client?.stripe_customer_id) {
    return NextResponse.json(
      { error: 'This client is not on Stripe. Use /api/billing/cancel instead.' },
      { status: 400 }
    );
  }

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    `https://${request.headers.get('host') || 'www.stafflenz.com'}`;

  try {
    const portal = await createPortalSession({
      customerId: client.stripe_customer_id,
      returnUrl: `${appUrl}/billing`,
    });
    return NextResponse.json({ url: portal.url });
  } catch (e) {
    return NextResponse.json({ error: `Portal session failed: ${e.message}` }, { status: 502 });
  }
}
