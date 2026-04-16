import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getAdminClient } from '@/lib/supabase';
import { createStripeCustomer, createCheckoutSession } from '@/lib/stripe';

// POST /api/billing/stripe/create-checkout
// Body: { plan: 'starter' | 'standard' | 'pro' | 'enterprise', include_trial?: boolean }
//
// Creates (or reuses) a Stripe customer for the caller's client and opens
// a Stripe Checkout Session in subscription mode. Returns the hosted URL
// the browser should redirect to. On success Stripe redirects back to
// /billing?welcome=1; on cancel, back to /signup/checkout.

export const dynamic = 'force-dynamic';

export async function POST(request) {
  const session = await requireAuth(request);
  if (!session || !session.client) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (session.user.role !== 'client_admin' && session.user.role !== 'super_admin') {
    return NextResponse.json({ error: 'Only client admins can manage billing' }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const requestedPlan = body.plan || session.client.plan || 'standard';

  const db = getAdminClient();

  // Resolve plan → Stripe price id
  const { data: planRow, error: planErr } = await db
    .from('plan_limits')
    .select('plan, price_usd, stripe_price_id')
    .eq('plan', requestedPlan)
    .single();

  if (planErr || !planRow) {
    return NextResponse.json({ error: `Unknown plan: ${requestedPlan}` }, { status: 400 });
  }
  if (!planRow.stripe_price_id) {
    return NextResponse.json(
      { error: 'Plan has not been synced with Stripe yet. Super admin must run /api/billing/stripe/sync-plans.' },
      { status: 503 }
    );
  }

  // Fetch full client row for billing info
  const { data: client } = await db
    .from('clients')
    .select('id, name, billing_email, billing_phone, stripe_customer_id, stripe_subscription_id, subscription_status, trial_ends_at')
    .eq('id', session.client.id)
    .single();

  if (!client) return NextResponse.json({ error: 'Client not found' }, { status: 404 });

  // Block if they already have an active/past-due Stripe subscription.
  if (
    client.stripe_subscription_id &&
    ['active', 'past_due'].includes(client.subscription_status)
  ) {
    return NextResponse.json(
      { error: 'This client already has an active Stripe subscription.' },
      { status: 409 }
    );
  }

  // Create or reuse Stripe customer
  const email = client.billing_email || session.user.email;
  const name = client.name || session.user.full_name || email;
  const phone = client.billing_phone || undefined;

  let customerId = client.stripe_customer_id;
  if (!customerId) {
    try {
      const customer = await createStripeCustomer({
        name,
        email,
        phone,
        metadata: { client_id: client.id, stafflenz_plan: planRow.plan },
      });
      customerId = customer.id;
      await db
        .from('clients')
        .update({ stripe_customer_id: customerId, payment_provider: 'stripe', billing_currency: 'USD' })
        .eq('id', client.id);
    } catch (e) {
      return NextResponse.json({ error: `Stripe customer create failed: ${e.message}` }, { status: 502 });
    }
  }

  // Figure out remaining trial days (if any) so Stripe continues honouring
  // the StaffLenz trial rather than charging immediately.
  let trialDays = 0;
  if (body.include_trial !== false && client.trial_ends_at) {
    const msLeft = new Date(client.trial_ends_at).getTime() - Date.now();
    trialDays = Math.max(0, Math.ceil(msLeft / (1000 * 60 * 60 * 24)));
  }

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    `https://${request.headers.get('host') || 'www.stafflenz.com'}`;

  try {
    const checkout = await createCheckoutSession({
      customerId,
      priceId: planRow.stripe_price_id,
      clientId: client.id,
      successUrl: `${appUrl}/billing?welcome=1&provider=stripe`,
      cancelUrl: `${appUrl}/signup/checkout?cancelled=1`,
      trialDays,
    });

    // Pre-record the chosen plan so if the webhook lands before we poll
    // status the UI still shows the right plan.
    await db
      .from('clients')
      .update({ plan: planRow.plan, subscription_status: 'incomplete' })
      .eq('id', client.id);

    return NextResponse.json({
      ok: true,
      checkout_url: checkout.url,
      session_id: checkout.id,
      plan: planRow.plan,
      amount_usd: planRow.price_usd,
      trial_days: trialDays,
    });
  } catch (e) {
    return NextResponse.json({ error: `Stripe checkout create failed: ${e.message}` }, { status: 502 });
  }
}
