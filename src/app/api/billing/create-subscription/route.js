import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getAdminClient } from '@/lib/supabase';
import { createCustomer, createSubscription, razorpayKeyId } from '@/lib/razorpay';

// POST /api/billing/create-subscription
// Body: { plan: 'starter' | 'standard' | 'pro' | 'enterprise' }
//
// Creates (or reuses) a Razorpay customer for the caller's client and opens
// a Razorpay subscription. Returns the subscription id + Razorpay key_id so
// the browser can hand off to the Razorpay checkout widget.
//
// The caller must be an authenticated client_admin (the client's billing owner).
// The first invoice is charged immediately at checkout; Razorpay drives the
// recurring cycle after that.

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

  // Resolve plan → Razorpay plan id
  const { data: planRow, error: planErr } = await db
    .from('plan_limits')
    .select('plan, price_inr, razorpay_plan_id')
    .eq('plan', requestedPlan)
    .single();

  if (planErr || !planRow) {
    return NextResponse.json({ error: `Unknown plan: ${requestedPlan}` }, { status: 400 });
  }
  if (!planRow.razorpay_plan_id) {
    return NextResponse.json(
      { error: 'Plan has not been synced with Razorpay yet. Super admin must run /api/billing/sync-plans.' },
      { status: 503 }
    );
  }

  // Fetch current client row (we need the possibly-already-set razorpay_customer_id)
  const { data: client } = await db
    .from('clients')
    .select('id, name, billing_email, billing_phone, razorpay_customer_id, razorpay_subscription_id, subscription_status')
    .eq('id', session.client.id)
    .single();

  if (!client) return NextResponse.json({ error: 'Client not found' }, { status: 404 });

  // Block if they already have an active/past-due subscription — cancel first.
  if (
    client.razorpay_subscription_id &&
    ['active', 'past_due'].includes(client.subscription_status)
  ) {
    return NextResponse.json(
      {
        error: 'This client already has an active subscription. Cancel it before creating a new one.',
        razorpay_subscription_id: client.razorpay_subscription_id,
      },
      { status: 409 }
    );
  }

  // Email/phone for Razorpay customer. Fall back to the authenticated user.
  const email = client.billing_email || session.user.email;
  const contact = client.billing_phone || undefined;
  const name = client.name || session.user.full_name || email;

  // Create or reuse Razorpay customer
  let customer_id = client.razorpay_customer_id;
  if (!customer_id) {
    try {
      const customer = await createCustomer({
        name,
        email,
        contact,
        notes: { client_id: client.id },
      });
      customer_id = customer.id;
      await db.from('clients').update({ razorpay_customer_id: customer_id }).eq('id', client.id);
    } catch (e) {
      return NextResponse.json({ error: `Razorpay customer create failed: ${e.message}` }, { status: 502 });
    }
  }

  // Create the subscription.
  try {
    const sub = await createSubscription({
      plan_id: planRow.razorpay_plan_id,
      customer_notify: 1,
      total_count: 120, // 10 years of monthly cycles — Razorpay requires a bound
      notes: { client_id: client.id, stafflenz_plan: planRow.plan },
    });

    await db
      .from('clients')
      .update({
        razorpay_subscription_id: sub.id,
        plan: planRow.plan,
        subscription_status: 'incomplete', // flips to 'active' once webhook confirms first payment
      })
      .eq('id', client.id);

    return NextResponse.json({
      ok: true,
      subscription_id: sub.id,
      razorpay_key_id: razorpayKeyId(),
      plan: planRow.plan,
      amount_inr: planRow.price_inr,
      customer: { name, email, contact },
    });
  } catch (e) {
    return NextResponse.json({ error: `Razorpay subscription create failed: ${e.message}` }, { status: 502 });
  }
}
