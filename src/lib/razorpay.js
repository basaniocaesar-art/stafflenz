import crypto from 'crypto';
import Razorpay from 'razorpay';

// ═══════════════════════════════════════════════════════════════════════════════
// Razorpay client wrapper. Centralises config, signature verification, and the
// handful of API calls we actually need so the route handlers stay small.
// ═══════════════════════════════════════════════════════════════════════════════

let cachedClient = null;

export function getRazorpay() {
  if (cachedClient) return cachedClient;
  const key_id = process.env.RAZORPAY_KEY_ID;
  const key_secret = process.env.RAZORPAY_KEY_SECRET;
  if (!key_id || !key_secret) {
    throw new Error('RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET env vars are required');
  }
  cachedClient = new Razorpay({ key_id, key_secret });
  return cachedClient;
}

export function razorpayKeyId() {
  const id = process.env.RAZORPAY_KEY_ID;
  if (!id) throw new Error('RAZORPAY_KEY_ID not configured');
  return id;
}

// ─── Signature verification ───────────────────────────────────────────────────
// Razorpay returns three values after a successful checkout — razorpay_order_id,
// razorpay_payment_id, razorpay_signature — and we MUST verify the signature
// server-side before trusting the payment. Same HMAC pattern applies to webhooks.

export function verifyPaymentSignature({ order_id, payment_id, signature }) {
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!secret) throw new Error('RAZORPAY_KEY_SECRET not configured');
  const expected = crypto
    .createHmac('sha256', secret)
    .update(`${order_id}|${payment_id}`)
    .digest('hex');
  return timingSafeEqual(expected, signature);
}

export function verifySubscriptionSignature({ subscription_id, payment_id, signature }) {
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!secret) throw new Error('RAZORPAY_KEY_SECRET not configured');
  const expected = crypto
    .createHmac('sha256', secret)
    .update(`${payment_id}|${subscription_id}`)
    .digest('hex');
  return timingSafeEqual(expected, signature);
}

export function verifyWebhookSignature(rawBody, signatureHeader) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) throw new Error('RAZORPAY_WEBHOOK_SECRET not configured');
  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  return timingSafeEqual(expected, signatureHeader || '');
}

// Constant-time compare — hex-string inputs only.
function timingSafeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  if (a.length !== b.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(a, 'hex'), Buffer.from(b, 'hex'));
  } catch {
    return false;
  }
}

// ─── Plans ────────────────────────────────────────────────────────────────────
// Razorpay "Plan" objects hold price + interval. We create one per StaffLenz
// plan (starter/standard/pro/enterprise) and persist the returned ID in
// plan_limits.razorpay_plan_id. Sync is idempotent — re-running is safe.

export async function createPlan({ name, amountInPaise, description, period = 'monthly' }) {
  const rp = getRazorpay();
  return rp.plans.create({
    period,
    interval: 1,
    item: {
      name,
      amount: amountInPaise,
      currency: 'INR',
      description,
    },
  });
}

// ─── Customers ────────────────────────────────────────────────────────────────
export async function createCustomer({ name, email, contact, notes = {} }) {
  const rp = getRazorpay();
  return rp.customers.create({
    name,
    email,
    contact: contact || undefined,
    fail_existing: '0', // return existing if email matches
    notes,
  });
}

// ─── Subscriptions ────────────────────────────────────────────────────────────
// total_count = 120 means "charge up to 10 years" — Razorpay requires a bound.
// quantity = 1 by default. Customer pays the first invoice at checkout; Razorpay
// drives the recurring schedule automatically after that.
export async function createSubscription({
  plan_id,
  customer_notify = 1,
  total_count = 120,
  notes = {},
  start_at, // optional unix timestamp — use to delay first charge past the trial
}) {
  const rp = getRazorpay();
  const payload = {
    plan_id,
    customer_notify,
    total_count,
    quantity: 1,
    notes,
  };
  if (start_at) payload.start_at = start_at;
  return rp.subscriptions.create(payload);
}

export async function cancelSubscription(subscription_id, cancelAtCycleEnd = true) {
  const rp = getRazorpay();
  return rp.subscriptions.cancel(subscription_id, cancelAtCycleEnd);
}

export async function fetchSubscription(subscription_id) {
  const rp = getRazorpay();
  return rp.subscriptions.fetch(subscription_id);
}
