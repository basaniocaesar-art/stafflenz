-- ============================================================
-- StaffLenz Hybrid Pricing Migration (Phase 1)
-- Bumps flat-tier prices, adds a Scale tier, and lays the credit
-- columns so Phases 2–4 can meter usage. Run AFTER migration-billing.sql
-- and migration-stripe.sql.
-- ============================================================

-- ---------- new columns on plan_limits ----------------------
ALTER TABLE plan_limits ADD COLUMN IF NOT EXISTS included_credits   int          DEFAULT 0;
ALTER TABLE plan_limits ADD COLUMN IF NOT EXISTS overage_per_credit numeric(6,2) DEFAULT 2.00;
ALTER TABLE plan_limits ADD COLUMN IF NOT EXISTS overage_cap_inr    int          DEFAULT 5000;
ALTER TABLE plan_limits ADD COLUMN IF NOT EXISTS features           jsonb        DEFAULT '{}'::jsonb;

-- ---------- allow 'scale' as a plan value -------------------
-- Drop and re-create the CHECK so we can add 'scale' alongside
-- the existing tiers without breaking existing clients.plan FKs.
ALTER TABLE plan_limits DROP CONSTRAINT IF EXISTS plan_limits_plan_check;
ALTER TABLE plan_limits ADD  CONSTRAINT plan_limits_plan_check
  CHECK (plan IN ('starter','standard','pro','scale','enterprise'));

-- ---------- Updated flat-tier prices + credit allowances ----
-- IMPORTANT: we null razorpay_plan_id and stripe_price_id on any row
-- whose price changed. Razorpay and Stripe price objects are immutable
-- once created — to charge the new price on NEW subscriptions we must
-- create fresh Plan/Price objects. Existing subscriptions keep running
-- on their locked-in old plan id until they cancel + resubscribe.
-- Super admin must re-run both sync-plans endpoints after this migration:
--   POST /api/billing/sync-plans
--   POST /api/billing/stripe/sync-plans

UPDATE plan_limits SET
  price_inr          = 4999,
  price_usd          = 59,
  max_workers        = 15,
  max_cameras        = 4,
  included_credits   = 3500,
  overage_per_credit = 2.00,
  overage_cap_inr    = 2500,
  razorpay_plan_id   = NULL,
  stripe_price_id    = NULL,
  stripe_product_id  = NULL,
  features           = jsonb_build_object(
    'capture_sec',   60,
    'batch_min',     15,
    'schedule',      'business_hours',
    'motion_bursts', false,
    'forensic_days', 0,
    'alerts',        jsonb_build_array('email')
  )
WHERE plan = 'starter';

UPDATE plan_limits SET
  price_inr          = 9999,
  price_usd          = 119,
  max_workers        = 50,
  max_cameras        = 8,
  included_credits   = 10000,
  overage_per_credit = 1.60,
  overage_cap_inr    = 5000,
  razorpay_plan_id   = NULL,
  stripe_price_id    = NULL,
  stripe_product_id  = NULL,
  features           = jsonb_build_object(
    'capture_sec',   60,
    'batch_min',     5,
    'schedule',      'business_hours',
    'motion_bursts', false,
    'forensic_days', 1,
    'alerts',        jsonb_build_array('email','whatsapp')
  )
WHERE plan = 'standard';

UPDATE plan_limits SET
  price_inr          = 19999,
  price_usd          = 239,
  max_workers        = 150,
  max_cameras        = 16,
  included_credits   = 30000,
  overage_per_credit = 1.30,
  overage_cap_inr    = 10000,
  razorpay_plan_id   = NULL,
  stripe_price_id    = NULL,
  stripe_product_id  = NULL,
  features           = jsonb_build_object(
    'capture_sec',   3,
    'batch_min',     5,
    'schedule',      'business_hours',
    'motion_bursts', true,
    'forensic_days', 7,
    'alerts',        jsonb_build_array('email','whatsapp','voice')
  )
WHERE plan = 'pro';

UPDATE plan_limits SET
  price_inr          = 75000,
  price_usd          = 899,
  max_workers        = 9999,
  max_cameras        = 9999,
  included_credits   = 999999,
  overage_per_credit = 0.80,
  overage_cap_inr    = 999999,
  razorpay_plan_id   = NULL,
  stripe_price_id    = NULL,
  stripe_product_id  = NULL,
  features           = jsonb_build_object(
    'capture_sec',   3,
    'batch_min',     1,
    'schedule',      '24x7',
    'motion_bursts', true,
    'forensic_days', 30,
    'alerts',        jsonb_build_array('email','whatsapp','voice','webhook'),
    'sla',           true,
    'dedicated_support', true
  )
WHERE plan = 'enterprise';

-- ---------- new Scale tier ---------------------------------
INSERT INTO plan_limits (plan, price_inr, price_usd, max_workers, max_cameras,
                         included_credits, overage_per_credit, overage_cap_inr,
                         billing_period, is_public, features)
VALUES (
  'scale',
  39999,
  479,
  500,
  32,
  75000,
  1.00,
  25000,
  'monthly',
  true,
  jsonb_build_object(
    'capture_sec',   3,
    'batch_min',     1,
    'schedule',      '24x7',
    'motion_bursts', true,
    'forensic_days', 30,
    'alerts',        jsonb_build_array('email','whatsapp','voice','webhook')
  )
)
ON CONFLICT (plan) DO UPDATE SET
  price_inr          = EXCLUDED.price_inr,
  price_usd          = EXCLUDED.price_usd,
  max_workers        = EXCLUDED.max_workers,
  max_cameras        = EXCLUDED.max_cameras,
  included_credits   = EXCLUDED.included_credits,
  overage_per_credit = EXCLUDED.overage_per_credit,
  overage_cap_inr    = EXCLUDED.overage_cap_inr,
  features           = EXCLUDED.features,
  razorpay_plan_id   = NULL,
  stripe_price_id    = NULL,
  stripe_product_id  = NULL;

-- ============================================================
-- POST-MIGRATION CHECKLIST for super_admin:
-- 1. Verify prices:   SELECT plan, price_inr, price_usd, included_credits FROM plan_limits ORDER BY price_inr;
-- 2. Re-sync Razorpay plans: POST /api/billing/sync-plans
-- 3. Re-sync Stripe plans:   POST /api/billing/stripe/sync-plans
-- 4. Grandfather existing clients — their plan id in clients.razorpay_subscription_id
--    is locked to the OLD price; they continue paying old rates until cancel/resub.
-- ============================================================
