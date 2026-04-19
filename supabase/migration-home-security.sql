-- ============================================================
-- StaffLenz Home Security Industry Migration
-- Adds 'home' as an industry + a dedicated Home plan at ₹1,499/mo
-- Run AFTER migration-industry-packs.sql and migration-pricing-hybrid.sql
-- ============================================================

SET search_path TO public;

-- Expand clients.industry CHECK to include 'home'
ALTER TABLE clients DROP CONSTRAINT IF EXISTS clients_industry_check;
ALTER TABLE clients ADD CONSTRAINT clients_industry_check CHECK (
  industry IN (
    'gym','factory','construction','retail','warehouse',
    'hotel','restaurant','hospital','school','security','home'
  )
);

-- Expand plan_limits.plan CHECK to include 'home'
ALTER TABLE plan_limits DROP CONSTRAINT IF EXISTS plan_limits_plan_check;
ALTER TABLE plan_limits ADD CONSTRAINT plan_limits_plan_check
  CHECK (plan IN ('starter','standard','pro','scale','enterprise','home'));

-- Insert Home plan
INSERT INTO plan_limits (plan, price_inr, price_usd, max_workers, max_cameras,
  included_credits, overage_per_credit, overage_cap_inr, billing_period, is_public, features)
VALUES ('home', 1499, 18, 15, 4, 2000, 2.00, 1500, 'monthly', true,
  jsonb_build_object(
    'capture_sec', 60,
    'batch_min', 15,
    'schedule', '24x7',
    'motion_bursts', true,
    'forensic_days', 3,
    'alerts', jsonb_build_array('email', 'whatsapp')
  )
)
ON CONFLICT (plan) DO UPDATE SET
  price_inr = EXCLUDED.price_inr,
  price_usd = EXCLUDED.price_usd,
  max_workers = EXCLUDED.max_workers,
  max_cameras = EXCLUDED.max_cameras,
  included_credits = EXCLUDED.included_credits,
  features = EXCLUDED.features,
  is_public = EXCLUDED.is_public;

-- Insert Home industry pack
INSERT INTO industry_packs (slug, name, default_zones, default_alert_rules, default_dashboard, compliance_reports, recommended_plan) VALUES
('home', 'Home Security',
  '[
    {"name":"Main Gate","zone_type":"entry","after_hours_alert":true},
    {"name":"Living Room","zone_type":"common","inactivity_alert_minutes":120},
    {"name":"Backyard / Garden","zone_type":"perimeter","after_hours_alert":true},
    {"name":"Garage / Parking","zone_type":"parking","after_hours_alert":true},
    {"name":"Kitchen","zone_type":"domestic_staff","staff_tracking":true}
  ]'::jsonb,
  '[
    {"alert_type":"unauthorized","zone":"Main Gate","trigger":"unknown_person","severity":"high","message":"Unknown person at your gate"},
    {"alert_type":"security","trigger":"after_hours_motion","time_window":"23:00-06:00","severity":"high","message":"Motion detected during quiet hours"},
    {"alert_type":"staffing","trigger":"domestic_staff_arrival","severity":"low","message":"Domestic staff arrived"},
    {"alert_type":"staffing","trigger":"domestic_staff_departure","severity":"low","message":"Domestic staff left"},
    {"alert_type":"safety","zone":"Living Room","trigger":"no_motion_waking_hours","threshold":120,"severity":"high","message":"No activity for 2 hours — check on family member"}
  ]'::jsonb,
  '{"widgets":["home_today_summary","domestic_staff_attendance","quiet_hours_status","motion_events_viewer","visitor_log"]}'::jsonb,
  '[{"name":"Weekly Home Activity Report","cadence":"weekly","sections":["visitor_log","staff_attendance","motion_events","quiet_hours_summary"]}]'::jsonb,
  'home')
ON CONFLICT (slug) DO UPDATE SET
  default_zones = EXCLUDED.default_zones,
  default_alert_rules = EXCLUDED.default_alert_rules,
  default_dashboard = EXCLUDED.default_dashboard,
  compliance_reports = EXCLUDED.compliance_reports,
  recommended_plan = EXCLUDED.recommended_plan;

-- Verify
SELECT plan, price_inr, is_public FROM plan_limits WHERE plan = 'home';
SELECT slug, name, recommended_plan FROM industry_packs WHERE slug = 'home';
