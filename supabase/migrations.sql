-- ============================================================
-- StaffLenz Migrations — Run AFTER initial schema.sql
-- Safe to re-run (uses IF NOT EXISTS / ON CONFLICT DO NOTHING)
-- ============================================================

-- ============================================================
-- 1. FIX CLIENTS TABLE
-- Add all 9 industries, add white_label_owner_id column
-- ============================================================
ALTER TABLE clients DROP CONSTRAINT IF EXISTS clients_industry_check;
ALTER TABLE clients ADD CONSTRAINT clients_industry_check
  CHECK (industry IN ('factory','hotel','school','retail','restaurant','warehouse','construction','hospital','security'));

ALTER TABLE clients ADD COLUMN IF NOT EXISTS white_label_owner_id uuid;

-- ============================================================
-- 2. FIX USERS TABLE — add white_label_admin role
-- ============================================================
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check
  CHECK (role IN ('client_admin','client_user','super_admin','white_label_admin'));

-- ============================================================
-- 3. FIX LEADS TABLE — add affiliate_code column
-- ============================================================
ALTER TABLE leads ADD COLUMN IF NOT EXISTS affiliate_code text;

-- ============================================================
-- 4. FIX PLAN_LIMITS — align plan names with code
-- Code uses: starter / professional / enterprise
-- Old schema had: starter / standard / pro / enterprise
-- ============================================================

-- Drop old FK constraint on clients so we can update plan_limits
ALTER TABLE clients DROP CONSTRAINT IF EXISTS clients_plan_fkey;

-- Remove old mismatched plan names
DELETE FROM plan_limits WHERE plan IN ('standard','pro') AND plan NOT IN ('starter','professional','enterprise');

-- Add/update all three tiers (25/60/100 workers, 8/16/32 cameras)
INSERT INTO plan_limits (plan, max_workers, max_cameras, price_inr) VALUES
  ('starter',      25,  8,  7000),
  ('professional', 60, 16, 12000),
  ('enterprise',  100, 32, 20000)
ON CONFLICT (plan) DO UPDATE SET
  max_workers = EXCLUDED.max_workers,
  max_cameras = EXCLUDED.max_cameras,
  price_inr   = EXCLUDED.price_inr;

-- Re-add FK constraint
ALTER TABLE clients ADD CONSTRAINT clients_plan_fkey
  FOREIGN KEY (plan) REFERENCES plan_limits(plan);

-- ============================================================
-- 5. AFFILIATES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS affiliates (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code              text UNIQUE NOT NULL,
  name              text NOT NULL,
  email             text UNIQUE NOT NULL,
  company           text,
  partner_type      text DEFAULT 'referral' CHECK (partner_type IN ('referral','reseller','agency','influencer')),
  commission_rate   numeric(5,2) DEFAULT 20.00,
  password_hash     text NOT NULL,
  status            text DEFAULT 'active' CHECK (status IN ('active','inactive','suspended')),
  total_clicks      int DEFAULT 0,
  total_conversions int DEFAULT 0,
  total_earnings    numeric(10,2) DEFAULT 0.00,
  created_at        timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS affiliates_code_idx  ON affiliates(code);
CREATE INDEX IF NOT EXISTS affiliates_email_idx ON affiliates(email);

-- ============================================================
-- 6. AFFILIATE CLICKS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS affiliate_clicks (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id   uuid NOT NULL REFERENCES affiliates(id) ON DELETE CASCADE,
  affiliate_code text NOT NULL,
  ip_address     text,
  user_agent     text,
  referrer       text,
  landing_page   text,
  created_at     timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS aff_clicks_affiliate_idx ON affiliate_clicks(affiliate_id, created_at DESC);

-- ============================================================
-- 7. AFFILIATE CONVERSIONS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS affiliate_conversions (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id      uuid NOT NULL REFERENCES affiliates(id) ON DELETE CASCADE,
  affiliate_code    text NOT NULL,
  lead_email        text NOT NULL,
  lead_name         text,
  conversion_type   text DEFAULT 'lead' CHECK (conversion_type IN ('lead','trial','paid')),
  commission_amount numeric(10,2),
  status            text DEFAULT 'pending' CHECK (status IN ('pending','approved','paid','rejected')),
  click_id          uuid REFERENCES affiliate_clicks(id) ON DELETE SET NULL,
  created_at        timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS aff_conv_affiliate_idx ON affiliate_conversions(affiliate_id, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS aff_conv_dedup_idx ON affiliate_conversions(affiliate_id, lead_email);

-- ============================================================
-- 8. AFFILIATE SESSIONS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS affiliate_sessions (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id uuid NOT NULL REFERENCES affiliates(id) ON DELETE CASCADE,
  token_hash   text UNIQUE NOT NULL,
  expires_at   timestamptz NOT NULL,
  ip_address   text,
  user_agent   text,
  created_at   timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS aff_sessions_token_idx   ON affiliate_sessions(token_hash);
CREATE INDEX IF NOT EXISTS aff_sessions_expires_idx ON affiliate_sessions(expires_at);

-- ============================================================
-- 9. PARTNER APPLICATIONS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS partner_applications (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name      text NOT NULL,
  email          text NOT NULL,
  company_name   text,
  website_url    text,
  partner_type   text,
  industry_focus text,
  how_heard      text,
  client_base    text,
  status         text DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','contacted')),
  ip_address     text,
  created_at     timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS partner_apps_status_idx ON partner_applications(status, created_at DESC);

-- ============================================================
-- 10. WHITE LABEL CONFIGS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS white_label_configs (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id   uuid UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  brand_name      text NOT NULL DEFAULT 'My Platform',
  logo_url        text,
  primary_color   text DEFAULT '#3b82f6',
  accent_color    text DEFAULT '#8b5cf6',
  support_email   text,
  custom_domain   text,
  footer_text     text,
  welcome_message text,
  updated_at      timestamptz DEFAULT now(),
  created_at      timestamptz DEFAULT now()
);

-- ============================================================
-- 11. RPC FUNCTION — atomic click counter increment
-- ============================================================
CREATE OR REPLACE FUNCTION increment_affiliate_clicks(aff_id uuid)
RETURNS void AS $$
  UPDATE affiliates SET total_clicks = COALESCE(total_clicks, 0) + 1 WHERE id = aff_id;
$$ LANGUAGE sql SECURITY DEFINER;

-- ============================================================
-- 12. CLEANUP — expire old sessions automatically (optional trigger)
-- Run periodically: DELETE FROM sessions WHERE expires_at < now();
-- Run periodically: DELETE FROM affiliate_sessions WHERE expires_at < now();
-- ============================================================

-- ============================================================
-- DONE — verify with:
-- SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;
-- ============================================================
