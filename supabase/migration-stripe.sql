-- ============================================================
-- StaffLenz Stripe Migration
-- Adds Stripe as a second payment gateway alongside Razorpay.
-- Country-based routing: Indian clients hit Razorpay (INR), everyone
-- else hits Stripe (USD). Schema stays backwards compatible — existing
-- Razorpay-only flows keep working.
-- Run AFTER migration-billing.sql.
-- ============================================================

-- ---------- clients: which provider + Stripe IDs ------------
ALTER TABLE clients ADD COLUMN IF NOT EXISTS payment_provider text
  DEFAULT 'razorpay'
  CHECK (payment_provider IN ('razorpay','stripe','none'));
ALTER TABLE clients ADD COLUMN IF NOT EXISTS stripe_customer_id     text;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS stripe_subscription_id text;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS billing_country        text;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS billing_currency       text
  DEFAULT 'INR'
  CHECK (billing_currency IN ('INR','USD'));

CREATE INDEX IF NOT EXISTS clients_stripe_sub_idx  ON clients(stripe_subscription_id)
  WHERE stripe_subscription_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS clients_stripe_cust_idx ON clients(stripe_customer_id)
  WHERE stripe_customer_id IS NOT NULL;

-- ---------- plan_limits: USD prices + Stripe Price IDs ------
-- We create Stripe Price objects (via the Dashboard or the SDK) and cache
-- the IDs here. Two rows per plan effectively — one Razorpay price (INR)
-- and one Stripe price (USD) — but kept on the same plan row since plan
-- limits (max_workers/cameras) are identical across currencies.
ALTER TABLE plan_limits ADD COLUMN IF NOT EXISTS price_usd         int;
ALTER TABLE plan_limits ADD COLUMN IF NOT EXISTS stripe_price_id   text;
ALTER TABLE plan_limits ADD COLUMN IF NOT EXISTS stripe_product_id text;

-- Seed USD prices matching the public pricing slider (middle tier of each
-- band). These are defaults — you can override via Stripe Dashboard later.
UPDATE plan_limits SET price_usd = 79  WHERE plan = 'starter'    AND price_usd IS NULL;
UPDATE plan_limits SET price_usd = 149 WHERE plan = 'standard'   AND price_usd IS NULL;
UPDATE plan_limits SET price_usd = 299 WHERE plan = 'pro'        AND price_usd IS NULL;
UPDATE plan_limits SET price_usd = 499 WHERE plan = 'enterprise' AND price_usd IS NULL;

-- ---------- payments: mark provider + Stripe IDs ------------
ALTER TABLE payments ADD COLUMN IF NOT EXISTS provider text
  DEFAULT 'razorpay'
  CHECK (provider IN ('razorpay','stripe'));
ALTER TABLE payments ADD COLUMN IF NOT EXISTS stripe_payment_intent_id text;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS stripe_invoice_id        text;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS stripe_charge_id         text;

CREATE INDEX IF NOT EXISTS payments_stripe_pi_idx ON payments(stripe_payment_intent_id)
  WHERE stripe_payment_intent_id IS NOT NULL;

-- Relax the status CHECK to include Stripe-specific statuses
-- (succeeded/processing/requires_action etc mapped to existing where possible,
-- but storing the raw Stripe status is useful for debugging).
ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_status_check;
ALTER TABLE payments ADD CONSTRAINT payments_status_check
  CHECK (status IN ('created','authorized','captured','succeeded','processing','requires_action','refunded','failed','cancelled'));

-- Backfill provider on historical rows (all pre-migration payments were Razorpay)
UPDATE payments SET provider = 'razorpay' WHERE provider IS NULL;

-- webhook_events.provider already supports both via its text column — no
-- change needed there.

-- ============================================================
-- DONE
-- Next: set STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, STRIPE_PUBLISHABLE_KEY
-- in Vercel env vars. Then hit POST /api/billing/stripe/sync-plans once as
-- super_admin to create Stripe Product + Price objects and populate
-- plan_limits.stripe_price_id.
-- ============================================================
