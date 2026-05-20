import Stripe from 'stripe';

// ═══════════════════════════════════════════════════════════════════════════════
// Stripe client wrapper. Mirrors the shape of lib/razorpay.js so the two
// gateways are interchangeable at the call site. apiVersion is pinned so
// Stripe doesn't silently upgrade the API under us — bump it deliberately.
// ═══════════════════════════════════════════════════════════════════════════════

let cached = null;

export function getStripe() {
  if (cached) return cached;
  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret) throw new Error('STRIPE_SECRET_KEY env var is required');
  cached = new Stripe(secret, {
    apiVersion: '2024-11-20.acacia',
    typescript: false,
    maxNetworkRetries: 2,
  });
  return cached;
}

export function stripePublishableKey() {
  const key = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  if (!key) throw new Error('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY not configured');
  return key;
}

// ─── Products + Prices ────────────────────────────────────────────────────────
// One Product per StaffLenz plan, one recurring Price per product. We
// create them idempotently by name → if a product with the exact name
// already exists we reuse it. This keeps sync-plans safe to re-run.

export async function upsertProductAndPrice({ name, description, amountUsd, interval = 'month' }) {
  const stripe = getStripe();

  // Try to find an existing product by exact name.
  const existing = await stripe.products.search({
    query: `name:"${name.replace(/"/g, '\\"')}" AND active:"true"`,
    limit: 1,
  });

  let product;
  if (existing.data[0]) {
    product = existing.data[0];
    // Update metadata if description changed — harmless no-op otherwise.
    if (product.description !== description) {
      product = await stripe.products.update(product.id, { description });
    }
  } else {
    product = await stripe.products.create({
      name,
      description,
      type: 'service',
    });
  }

  // Find an existing active recurring price for this product at this amount.
  const prices = await stripe.prices.list({
    product: product.id,
    active: true,
    limit: 10,
  });
  const amountCents = Math.round(amountUsd * 100);
  let price = prices.data.find(
    (p) =>
      p.unit_amount === amountCents &&
      p.currency === 'usd' &&
      p.recurring?.interval === interval
  );

  if (!price) {
    price = await stripe.prices.create({
      product: product.id,
      unit_amount: amountCents,
      currency: 'usd',
      recurring: { interval },
      nickname: `${name} ${interval}ly`,
    });
  }

  return { product, price };
}

// ─── Customers ────────────────────────────────────────────────────────────────
export async function createStripeCustomer({ name, email, phone, metadata = {} }) {
  const stripe = getStripe();
  // If a customer with this email already exists, reuse it. Stripe doesn't
  // enforce email uniqueness, but reusing avoids duplicate customers on retry.
  const existing = await stripe.customers.list({ email, limit: 1 });
  if (existing.data[0]) {
    return existing.data[0];
  }
  return stripe.customers.create({
    name,
    email,
    phone: phone || undefined,
    metadata,
  });
}

// ─── Checkout session ─────────────────────────────────────────────────────────
// We use Stripe Checkout (hosted page) rather than embedded Elements because
// it handles SCA, Apple/Google Pay, tax, and Indian mandate nuances out of
// the box. Browser redirects to the returned URL.
export async function createCheckoutSession({
  customerId,
  priceId,
  clientId,
  successUrl,
  cancelUrl,
  trialDays,
}) {
  const stripe = getStripe();
  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    subscription_data: {
      metadata: { client_id: clientId },
      ...(trialDays && trialDays > 0 ? { trial_period_days: trialDays } : {}),
    },
    metadata: { client_id: clientId },
    success_url: successUrl,
    cancel_url: cancelUrl,
    allow_promotion_codes: true,
    billing_address_collection: 'auto',
    automatic_tax: { enabled: false }, // enable once you've set up tax registrations
  });
  return session;
}

// ─── Billing portal ───────────────────────────────────────────────────────────
// Stripe hosts a customer portal that handles updating cards, cancelling,
// downloading invoices, etc. Cheaper than building our own.
export async function createPortalSession({ customerId, returnUrl }) {
  const stripe = getStripe();
  return stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });
}

// ─── Subscriptions ────────────────────────────────────────────────────────────
export async function cancelStripeSubscription(subscriptionId, cancelAtPeriodEnd = true) {
  const stripe = getStripe();
  if (cancelAtPeriodEnd) {
    return stripe.subscriptions.update(subscriptionId, { cancel_at_period_end: true });
  }
  return stripe.subscriptions.cancel(subscriptionId);
}

export async function fetchStripeSubscription(subscriptionId) {
  const stripe = getStripe();
  return stripe.subscriptions.retrieve(subscriptionId);
}

// ─── Webhook signature verification ──────────────────────────────────────────
// Stripe signs every webhook with a timestamp-bound HMAC. The SDK handles
// the parsing — we just hand it the raw body + signature header + secret.
export function constructWebhookEvent(rawBody, signature) {
  const stripe = getStripe();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) throw new Error('STRIPE_WEBHOOK_SECRET not configured');
  return stripe.webhooks.constructEvent(rawBody, signature, secret);
}
