import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { getAdminClient } from '@/lib/supabase';
import { verifyWebhookSignature } from '@/lib/razorpay';

// POST /api/billing/webhook
// Razorpay → LenzAI webhook handler. Configure in Razorpay Dashboard:
//   URL:     https://www.lenzai.org/api/billing/webhook
//   Secret:  value you set as RAZORPAY_WEBHOOK_SECRET
//   Events:  payment.captured, payment.failed,
//            subscription.activated, subscription.charged,
//            subscription.cancelled, subscription.halted,
//            subscription.pending, subscription.updated
//
// Every event we process is recorded in webhook_events (dedupe by id) and
// every payment in payments (audit log). The clients.subscription_status
// field is the denormalised view used by the gating middleware.

export const dynamic = 'force-dynamic';

async function readRawBody(request) {
  const arrayBuffer = await request.arrayBuffer();
  return Buffer.from(arrayBuffer).toString('utf8');
}

export async function POST(request) {
  const rawBody = await readRawBody(request);
  const signature = request.headers.get('x-razorpay-signature');

  if (!verifyWebhookSignature(rawBody, signature)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  let body;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const event_id = body.id || body.event_id || crypto.randomUUID();
  const event_type = body.event;
  if (!event_type) return NextResponse.json({ error: 'Missing event type' }, { status: 400 });

  const db = getAdminClient();

  // Idempotency — if we've seen this event id before, short-circuit.
  const { data: existing } = await db
    .from('webhook_events')
    .select('id, processed')
    .eq('provider', 'razorpay')
    .eq('event_id', event_id)
    .single();

  if (existing?.processed) {
    return NextResponse.json({ ok: true, deduped: true });
  }

  if (!existing) {
    await db.from('webhook_events').insert({
      provider: 'razorpay',
      event_id,
      event_type,
      raw_body: body,
      processed: false,
    });
  }

  try {
    await handleEvent(db, event_type, body);
    await db
      .from('webhook_events')
      .update({ processed: true })
      .eq('provider', 'razorpay')
      .eq('event_id', event_id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    // Leave webhook_events row with processed=false so Razorpay's retry
    // (or a manual replay) can try again.
    console.error('[razorpay webhook] handler failed', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

async function handleEvent(db, event_type, body) {
  const payload = body.payload || {};

  // ─── Payment events ───────────────────────────────────────────────────────
  if (event_type === 'payment.captured' || event_type === 'payment.authorized') {
    const p = payload.payment?.entity;
    if (!p) return;
    const client_id = await resolveClientId(db, {
      subscription_id: p.subscription_id,
      customer_id: p.customer_id,
      notes: p.notes,
    });
    await upsertPayment(db, {
      client_id,
      razorpay_payment_id: p.id,
      razorpay_order_id: p.order_id,
      razorpay_invoice_id: p.invoice_id,
      razorpay_subscription_id: p.subscription_id,
      amount_inr: p.amount,
      currency: p.currency,
      status: 'captured',
      method: p.method,
      description: p.description,
      email: p.email,
      contact: p.contact,
      paid_at: p.created_at ? new Date(p.created_at * 1000).toISOString() : new Date().toISOString(),
      raw_event: p,
    });
    // If this payment is on a subscription and we have a client, mark active.
    if (client_id && p.subscription_id) {
      await db
        .from('clients')
        .update({ subscription_status: 'active' })
        .eq('id', client_id);
    }
    return;
  }

  if (event_type === 'payment.failed') {
    const p = payload.payment?.entity;
    if (!p) return;
    const client_id = await resolveClientId(db, {
      subscription_id: p.subscription_id,
      customer_id: p.customer_id,
      notes: p.notes,
    });
    await upsertPayment(db, {
      client_id,
      razorpay_payment_id: p.id,
      razorpay_order_id: p.order_id,
      razorpay_invoice_id: p.invoice_id,
      razorpay_subscription_id: p.subscription_id,
      amount_inr: p.amount,
      currency: p.currency,
      status: 'failed',
      method: p.method,
      description: p.description,
      email: p.email,
      contact: p.contact,
      error_code: p.error_code,
      error_description: p.error_description,
      raw_event: p,
    });
    return;
  }

  // ─── Subscription lifecycle events ────────────────────────────────────────
  if (
    event_type === 'subscription.activated' ||
    event_type === 'subscription.charged' ||
    event_type === 'subscription.updated' ||
    event_type === 'subscription.pending' ||
    event_type === 'subscription.halted' ||
    event_type === 'subscription.cancelled' ||
    event_type === 'subscription.completed'
  ) {
    const sub = payload.subscription?.entity;
    if (!sub) return;
    const client_id = await resolveClientId(db, {
      subscription_id: sub.id,
      customer_id: sub.customer_id,
      notes: sub.notes,
    });
    if (!client_id) return;

    const statusMap = {
      'subscription.activated': 'active',
      'subscription.charged':   'active',
      'subscription.updated':   'active',
      'subscription.pending':   'past_due',
      'subscription.halted':    'past_due',
      'subscription.cancelled': 'cancelled',
      'subscription.completed': 'cancelled',
    };

    const patch = {
      subscription_status: statusMap[event_type] || 'incomplete',
      razorpay_subscription_id: sub.id,
    };
    if (sub.current_end) {
      patch.current_period_end = new Date(sub.current_end * 1000).toISOString();
    }
    await db.from('clients').update(patch).eq('id', client_id);
    return;
  }

  // Unknown events — just ignore, we already stored the raw_body in webhook_events.
}

// Resolve a client id from whatever identifiers the webhook carries.
async function resolveClientId(db, { subscription_id, customer_id, notes }) {
  if (notes?.client_id) return notes.client_id;

  if (subscription_id) {
    const { data } = await db
      .from('clients')
      .select('id')
      .eq('razorpay_subscription_id', subscription_id)
      .single();
    if (data) return data.id;
  }

  if (customer_id) {
    const { data } = await db
      .from('clients')
      .select('id')
      .eq('razorpay_customer_id', customer_id)
      .single();
    if (data) return data.id;
  }

  return null;
}

async function upsertPayment(db, row) {
  // Dedupe by razorpay_payment_id via the unique index.
  const { error } = await db.from('payments').upsert(row, { onConflict: 'razorpay_payment_id' });
  if (error && !error.message?.includes('duplicate')) throw error;
}
