import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase';
import { constructWebhookEvent } from '@/lib/stripe';

// POST /api/billing/stripe/webhook
// Stripe → LenzAI webhook. Configure in Stripe Dashboard → Developers →
// Webhooks → Add endpoint:
//   URL: https://www.lenzai.org/api/billing/stripe/webhook
//   Events:
//     customer.subscription.created
//     customer.subscription.updated
//     customer.subscription.deleted
//     customer.subscription.trial_will_end
//     invoice.payment_succeeded
//     invoice.payment_failed
//     checkout.session.completed
//
// Every event is deduped by event.id in webhook_events. Payments hit the
// payments table. Subscription status denormalises onto clients.

export const dynamic = 'force-dynamic';

async function readRawBody(request) {
  const buf = await request.arrayBuffer();
  return Buffer.from(buf);
}

export async function POST(request) {
  const rawBody = await readRawBody(request);
  const signature = request.headers.get('stripe-signature');

  let event;
  try {
    event = constructWebhookEvent(rawBody, signature);
  } catch (e) {
    console.error('[stripe webhook] signature verification failed', e.message);
    return NextResponse.json({ error: `Webhook signature failed: ${e.message}` }, { status: 400 });
  }

  const db = getAdminClient();

  // Dedupe by event.id
  const { data: existing } = await db
    .from('webhook_events')
    .select('id, processed')
    .eq('provider', 'stripe')
    .eq('event_id', event.id)
    .single();

  if (existing?.processed) {
    return NextResponse.json({ ok: true, deduped: true });
  }

  if (!existing) {
    await db.from('webhook_events').insert({
      provider: 'stripe',
      event_id: event.id,
      event_type: event.type,
      raw_body: event,
      processed: false,
    });
  }

  try {
    await handleStripeEvent(db, event);
    await db
      .from('webhook_events')
      .update({ processed: true })
      .eq('provider', 'stripe')
      .eq('event_id', event.id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[stripe webhook] handler failed', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

async function handleStripeEvent(db, event) {
  const obj = event.data.object;

  switch (event.type) {
    // ── Subscription lifecycle ──────────────────────────────────────────
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted': {
      const client_id = await resolveStripeClientId(db, {
        subscription_id: obj.id,
        customer_id: obj.customer,
        metadata: obj.metadata,
      });
      if (!client_id) return;

      // Map Stripe's many status values to our narrower set.
      //   trialing → trialing
      //   active → active
      //   past_due | unpaid → past_due
      //   canceled | incomplete_expired → cancelled
      //   incomplete → incomplete
      const s = obj.status;
      const subscription_status =
        s === 'trialing' ? 'trialing'
        : s === 'active' ? 'active'
        : s === 'past_due' || s === 'unpaid' ? 'past_due'
        : s === 'canceled' || s === 'incomplete_expired' ? 'cancelled'
        : 'incomplete';

      const patch = {
        stripe_subscription_id: obj.id,
        subscription_status,
      };
      if (obj.current_period_end) {
        patch.current_period_end = new Date(obj.current_period_end * 1000).toISOString();
      }
      if (obj.trial_end) {
        patch.trial_ends_at = new Date(obj.trial_end * 1000).toISOString();
      }
      await db.from('clients').update(patch).eq('id', client_id);
      return;
    }

    // ── Invoice events = payment records ────────────────────────────────
    case 'invoice.payment_succeeded':
    case 'invoice.payment_failed': {
      const client_id = await resolveStripeClientId(db, {
        subscription_id: obj.subscription,
        customer_id: obj.customer,
        metadata: obj.metadata || obj.subscription_details?.metadata,
      });

      const succeeded = event.type === 'invoice.payment_succeeded';

      // amount_paid is in the smallest currency unit already (cents/paise).
      // We store paise in the existing schema — convert USD cents to paise
      // here would be wrong, so keep native cents and rely on payments.currency
      // to disambiguate. Existing Razorpay rows hold amount in paise.
      const amountCents = obj.amount_paid ?? obj.amount_due ?? 0;

      await db.from('payments').upsert({
        client_id,
        provider: 'stripe',
        stripe_invoice_id: obj.id,
        stripe_charge_id: obj.charge,
        amount_inr: amountCents, // misnamed column but preserves schema
        currency: (obj.currency || 'usd').toUpperCase(),
        status: succeeded ? 'succeeded' : 'failed',
        method: obj.collection_method,
        description: obj.description || obj.lines?.data?.[0]?.description || 'Stripe invoice',
        email: obj.customer_email,
        error_description: succeeded ? null : (obj.last_finalization_error?.message || null),
        paid_at: succeeded && obj.status_transitions?.paid_at
          ? new Date(obj.status_transitions.paid_at * 1000).toISOString()
          : (succeeded ? new Date().toISOString() : null),
        raw_event: obj,
      }, { onConflict: 'stripe_invoice_id' });

      if (succeeded && client_id) {
        await db.from('clients').update({ subscription_status: 'active' }).eq('id', client_id);
      }
      return;
    }

    // ── Checkout session closed ─────────────────────────────────────────
    case 'checkout.session.completed': {
      // Good moment to link the subscription id onto the client, just in
      // case the customer.subscription.created event races.
      const client_id = obj.metadata?.client_id;
      if (client_id && obj.subscription) {
        await db
          .from('clients')
          .update({
            stripe_subscription_id: obj.subscription,
            stripe_customer_id: obj.customer,
            payment_provider: 'stripe',
          })
          .eq('id', client_id);
      }
      return;
    }

    default:
      return;
  }
}

async function resolveStripeClientId(db, { subscription_id, customer_id, metadata }) {
  if (metadata?.client_id) return metadata.client_id;

  if (subscription_id) {
    const { data } = await db
      .from('clients')
      .select('id')
      .eq('stripe_subscription_id', subscription_id)
      .single();
    if (data) return data.id;
  }

  if (customer_id) {
    const { data } = await db
      .from('clients')
      .select('id')
      .eq('stripe_customer_id', customer_id)
      .single();
    if (data) return data.id;
  }

  return null;
}
