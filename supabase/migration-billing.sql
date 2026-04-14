-- ============================================================
-- StaffLenz Billing Migration
-- Adds Razorpay subscription/payment tracking on top of existing
-- clients + plan_limits tables. Run this in Supabase SQL Editor.
-- ============================================================

-- ---------- extend clients with subscription state ----------
ALTER TABLE clients ADD COLUMN IF NOT EXISTS subscription_status  text
  DEFAULT 'trialing'
  CHECK (subscription_status IN ('trialing','active','past_due','cancelled','incomplete','none'));

ALTER TABLE clients ADD COLUMN IF NOT EXISTS trial_ends_at        timestamptz;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS razorpay_customer_id text;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS razorpay_subscription_id text;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS current_period_end   timestamptz;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS billing_email        text;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS billing_phone        text;

CREATE INDEX IF NOT EXISTS clients_rzp_sub_idx ON clients(razorpay_subscription_id)
  WHERE razorpay_subscription_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS clients_rzp_cust_idx ON clients(razorpay_customer_id)
  WHERE razorpay_customer_id IS NOT NULL;

-- ---------- map StaffLenz plans to Razorpay plan IDs --------
-- We create Razorpay Plan objects via the API and persist the returned ID
-- here so subsequent subscriptions reference the same plan. Interval is
-- always monthly for now.
ALTER TABLE plan_limits ADD COLUMN IF NOT EXISTS razorpay_plan_id text;
ALTER TABLE plan_limits ADD COLUMN IF NOT EXISTS billing_period   text
  DEFAULT 'monthly'
  CHECK (billing_period IN ('monthly','yearly'));
ALTER TABLE plan_limits ADD COLUMN IF NOT EXISTS is_public boolean DEFAULT true;

-- ---------- payments audit log -------------------------------
-- Every Razorpay payment event (success or failure) we see lands here.
-- This is the source of truth for "has this client paid"; clients.subscription_status
-- is the denormalised view for fast reads.
CREATE TABLE IF NOT EXISTS payments (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id            uuid REFERENCES clients(id) ON DELETE CASCADE,
  razorpay_payment_id  text UNIQUE,
  razorpay_order_id    text,
  razorpay_invoice_id  text,
  razorpay_subscription_id text,
  amount_inr           int NOT NULL,   -- amount in paise (Razorpay native unit)
  currency             text DEFAULT 'INR',
  status               text NOT NULL CHECK (status IN ('created','authorized','captured','refunded','failed')),
  method               text,           -- card / upi / netbanking / wallet
  description          text,
  email                text,
  contact              text,
  error_code           text,
  error_description    text,
  paid_at              timestamptz,
  created_at           timestamptz DEFAULT now(),
  raw_event            jsonb           -- full Razorpay payload for audit
);
CREATE INDEX IF NOT EXISTS payments_client_idx ON payments(client_id, created_at DESC);
CREATE INDEX IF NOT EXISTS payments_sub_idx    ON payments(razorpay_subscription_id);

-- ---------- webhook idempotency -----------------------------
-- Razorpay occasionally retries webhooks. Dedupe by event id.
CREATE TABLE IF NOT EXISTS webhook_events (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider        text NOT NULL DEFAULT 'razorpay',
  event_id        text NOT NULL,
  event_type      text NOT NULL,
  received_at     timestamptz DEFAULT now(),
  processed       boolean DEFAULT false,
  raw_body        jsonb,
  UNIQUE (provider, event_id)
);
CREATE INDEX IF NOT EXISTS webhook_events_unprocessed_idx
  ON webhook_events(provider, received_at DESC) WHERE processed = false;

-- ---------- RLS: block everything, service role bypasses ----
ALTER TABLE payments        ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_events  ENABLE ROW LEVEL SECURITY;

-- ---------- convenience: seed existing clients as trialing --
-- Any existing client without a subscription_status gets put into
-- trialing with a 14-day window from today so they aren't accidentally
-- deactivated when the gating middleware ships.
UPDATE clients
SET subscription_status = 'trialing',
    trial_ends_at = now() + interval '14 days'
WHERE subscription_status IS NULL
   OR (subscription_status = 'trialing' AND trial_ends_at IS NULL);

-- ============================================================
-- DONE
-- Next: set RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, RAZORPAY_WEBHOOK_SECRET
-- in Vercel env vars. Then hit POST /api/billing/sync-plans once as
-- super_admin to create Razorpay Plan objects and populate
-- plan_limits.razorpay_plan_id.
-- ============================================================
