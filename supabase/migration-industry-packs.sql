-- ============================================================
-- StaffLenz Industry Packs Migration
-- Adds presets per vertical: zone templates, default alert rules,
-- dashboard layouts, compliance report definitions. When a new client
-- signs up for industry X, these presets auto-populate so their first
-- experience feels bespoke to their vertical.
-- ============================================================

-- ---------- relax clients.industry CHECK --------------------
-- The original schema limited industry to 4 values. We now support 10.
-- Existing rows won't violate the new CHECK since the 4 old values are
-- still allowed.
ALTER TABLE clients DROP CONSTRAINT IF EXISTS clients_industry_check;
ALTER TABLE clients ADD  CONSTRAINT clients_industry_check CHECK (
  industry IN (
    'gym','factory','construction','retail','warehouse',
    'hotel','restaurant','hospital','school','security'
  )
);

-- ---------- industry_packs table ----------------------------
-- One row per industry slug. jsonb bodies so we can evolve the shape
-- without migrations — the API + client code treats them as opaque.
CREATE TABLE IF NOT EXISTS industry_packs (
  slug                text PRIMARY KEY,
  name                text NOT NULL,
  default_zones       jsonb NOT NULL DEFAULT '[]'::jsonb,    -- zone templates
  default_alert_rules jsonb NOT NULL DEFAULT '[]'::jsonb,    -- alert rule defaults
  default_dashboard   jsonb NOT NULL DEFAULT '{}'::jsonb,    -- dashboard widgets
  compliance_reports  jsonb NOT NULL DEFAULT '[]'::jsonb,    -- auto-generated report defs
  recommended_plan    text,
  is_active           boolean DEFAULT true,
  created_at          timestamptz DEFAULT now()
);

ALTER TABLE industry_packs ENABLE ROW LEVEL SECURITY;

-- Allow public read so the signup flow can fetch pack details.
CREATE POLICY "anon_read_industry_packs" ON industry_packs FOR SELECT TO anon USING (is_active = true);

-- ---------- seed all 10 packs -------------------------------

-- 1. Gym
INSERT INTO industry_packs (slug, name, default_zones, default_alert_rules, default_dashboard, compliance_reports, recommended_plan) VALUES
('gym', 'Gym & Fitness',
 '[
    {"name":"Reception","zone_type":"reception","min_workers":1,"max_workers":2},
    {"name":"Floor","zone_type":"floor","min_workers":1,"max_workers":10},
    {"name":"Cardio","zone_type":"floor","min_workers":0,"max_workers":5},
    {"name":"Weights","zone_type":"floor","min_workers":0,"max_workers":5},
    {"name":"Locker room","zone_type":"locker","min_workers":0,"max_workers":1}
  ]'::jsonb,
 '[
    {"alert_type":"staffing","zone":"Reception","trigger":"unattended_minutes","threshold":3,"severity":"high","message":"Reception unattended"},
    {"alert_type":"staffing","zone":"Floor","trigger":"no_trainer_minutes","threshold":10,"severity":"medium","message":"No trainer on floor"},
    {"alert_type":"zone_violation","zone":"Locker room","trigger":"after_hours_motion","severity":"high","message":"Locker room access after hours"}
  ]'::jsonb,
 '{"widgets":["trainer_on_floor_pct","reception_uptime","class_attendance","peak_footfall_heatmap"]}'::jsonb,
 '[{"name":"Weekly Gym Operations","cadence":"weekly","sections":["trainer_hours","reception_coverage","peak_footfall","incidents"]}]'::jsonb,
 'standard')
ON CONFLICT (slug) DO UPDATE SET
  default_zones = EXCLUDED.default_zones,
  default_alert_rules = EXCLUDED.default_alert_rules,
  default_dashboard = EXCLUDED.default_dashboard,
  compliance_reports = EXCLUDED.compliance_reports,
  recommended_plan = EXCLUDED.recommended_plan;

-- 2. Factory
INSERT INTO industry_packs (slug, name, default_zones, default_alert_rules, default_dashboard, compliance_reports, recommended_plan) VALUES
('factory', 'Factory & Manufacturing',
 '[
    {"name":"Gate","zone_type":"entry","ppe_requirements":["helmet","vest","boots"]},
    {"name":"Shop floor","zone_type":"floor","ppe_requirements":["helmet","vest","boots","gloves"]},
    {"name":"Chemical storage","zone_type":"restricted","ppe_requirements":["helmet","goggles","chemical_suit"]},
    {"name":"High-voltage area","zone_type":"restricted","authorized_only":true},
    {"name":"Contractor entry","zone_type":"muster"}
  ]'::jsonb,
 '[
    {"alert_type":"ppe_violation","trigger":"ppe_missing","severity":"high","message":"Worker without required PPE"},
    {"alert_type":"unauthorized","zone":"High-voltage area","trigger":"unauthorized_entry","severity":"high","message":"Unauthorized entry to restricted zone"},
    {"alert_type":"staffing","trigger":"contractor_count_mismatch","threshold":5,"severity":"medium","message":"Contractor headcount delta vs invoice"}
  ]'::jsonb,
 '{"widgets":["ppe_compliance_pct","contractor_muster","zone_violations","shift_comparison"]}'::jsonb,
 '[{"name":"Daily EHS Report","cadence":"daily","format":"factories_act","sections":["ppe_compliance","incidents","contractor_muster"]}]'::jsonb,
 'pro')
ON CONFLICT (slug) DO UPDATE SET
  default_zones = EXCLUDED.default_zones,
  default_alert_rules = EXCLUDED.default_alert_rules,
  default_dashboard = EXCLUDED.default_dashboard,
  compliance_reports = EXCLUDED.compliance_reports,
  recommended_plan = EXCLUDED.recommended_plan;

-- 3. Construction
INSERT INTO industry_packs (slug, name, default_zones, default_alert_rules, default_dashboard, compliance_reports, recommended_plan) VALUES
('construction', 'Construction Sites',
 '[
    {"name":"Site gate","zone_type":"entry","ppe_requirements":["helmet","vest","boots"]},
    {"name":"Work zone","zone_type":"floor","ppe_requirements":["helmet","vest","boots","gloves"]},
    {"name":"Crane zone","zone_type":"danger","authorized_only":true,"authorized_roles":["crane_operator","rigger"]},
    {"name":"Wet concrete","zone_type":"danger","restricted_hours":true},
    {"name":"Material yard","zone_type":"storage","after_hours_alert":true}
  ]'::jsonb,
 '[
    {"alert_type":"ppe_violation","zone":"Site gate","trigger":"entry_without_ppe","severity":"high"},
    {"alert_type":"unauthorized","zone":"Crane zone","trigger":"unauthorized_entry","severity":"high"},
    {"alert_type":"zone_violation","zone":"Material yard","trigger":"after_hours_motion","severity":"high","message":"After-hours motion at material yard"}
  ]'::jsonb,
 '{"widgets":["ppe_compliance","contractor_headcount","after_hours_incidents","multi_site_rollup"]}'::jsonb,
 '[{"name":"Weekly Safety Report","cadence":"weekly","sections":["ppe_compliance","contractor_muster","incidents","theft_alerts"]}]'::jsonb,
 'pro')
ON CONFLICT (slug) DO UPDATE SET
  default_zones = EXCLUDED.default_zones,
  default_alert_rules = EXCLUDED.default_alert_rules,
  default_dashboard = EXCLUDED.default_dashboard,
  compliance_reports = EXCLUDED.compliance_reports,
  recommended_plan = EXCLUDED.recommended_plan;

-- 4. Retail
INSERT INTO industry_packs (slug, name, default_zones, default_alert_rules, default_dashboard, compliance_reports, recommended_plan) VALUES
('retail', 'Retail & Stores',
 '[
    {"name":"Entrance","zone_type":"entry"},
    {"name":"Sales floor","zone_type":"floor","min_workers":1},
    {"name":"Checkout","zone_type":"reception","min_workers":1,"max_workers":3},
    {"name":"Stockroom","zone_type":"restricted","access_log":true},
    {"name":"Cash office","zone_type":"restricted","authorized_only":true}
  ]'::jsonb,
 '[
    {"alert_type":"staffing","zone":"Checkout","trigger":"unattended_minutes","threshold":3,"severity":"high","message":"Cash counter unattended"},
    {"alert_type":"zone_violation","zone":"Stockroom","trigger":"after_hours_motion","severity":"high","message":"After-hours stockroom access"},
    {"alert_type":"unauthorized","zone":"Cash office","trigger":"unauthorized_entry","severity":"high"}
  ]'::jsonb,
 '{"widgets":["shrinkage_trend","stockroom_access_log","checkout_queue","after_hours_incidents"]}'::jsonb,
 '[{"name":"Weekly Loss Prevention","cadence":"weekly","sections":["incidents","stockroom_access","queue_analytics","shrinkage_estimate"]}]'::jsonb,
 'pro')
ON CONFLICT (slug) DO UPDATE SET
  default_zones = EXCLUDED.default_zones,
  default_alert_rules = EXCLUDED.default_alert_rules,
  default_dashboard = EXCLUDED.default_dashboard,
  compliance_reports = EXCLUDED.compliance_reports,
  recommended_plan = EXCLUDED.recommended_plan;

-- 5. Warehouse
INSERT INTO industry_packs (slug, name, default_zones, default_alert_rules, default_dashboard, compliance_reports, recommended_plan) VALUES
('warehouse', 'Warehouse & Logistics',
 '[
    {"name":"Loading dock","zone_type":"dock","after_hours_alert":true},
    {"name":"Pick zone A","zone_type":"picker","min_workers":1},
    {"name":"Pick zone B","zone_type":"picker","min_workers":1},
    {"name":"Cold storage","zone_type":"restricted","access_log":true},
    {"name":"Dispatch","zone_type":"dispatch","sla_enforced":true}
  ]'::jsonb,
 '[
    {"alert_type":"staffing","zone":"Loading dock","trigger":"unattended_minutes","threshold":5,"severity":"medium"},
    {"alert_type":"zone_violation","zone":"Cold storage","trigger":"door_open_duration","threshold":300,"severity":"high","message":"Cold storage door open >5 min"},
    {"alert_type":"zone_violation","zone":"Loading dock","trigger":"after_hours_motion","severity":"high"}
  ]'::jsonb,
 '{"widgets":["pick_rate_per_picker","cold_storage_access","loading_dock_utilisation","sla_adherence"]}'::jsonb,
 '[{"name":"Daily Ops Report","cadence":"daily","sections":["pick_rate","sla_breaches","cold_chain","incidents"]}]'::jsonb,
 'scale')
ON CONFLICT (slug) DO UPDATE SET
  default_zones = EXCLUDED.default_zones,
  default_alert_rules = EXCLUDED.default_alert_rules,
  default_dashboard = EXCLUDED.default_dashboard,
  compliance_reports = EXCLUDED.compliance_reports,
  recommended_plan = EXCLUDED.recommended_plan;

-- 6. Hotel
INSERT INTO industry_packs (slug, name, default_zones, default_alert_rules, default_dashboard, compliance_reports, recommended_plan) VALUES
('hotel', 'Hotels & Hospitality',
 '[
    {"name":"Reception","zone_type":"reception","min_workers":1,"uniform_required":true},
    {"name":"Concierge","zone_type":"reception","min_workers":1},
    {"name":"Restaurant","zone_type":"fnb","service_hours":"12:00-15:00,19:00-23:00"},
    {"name":"Banquet","zone_type":"fnb","event_driven":true},
    {"name":"Lobby","zone_type":"public"}
  ]'::jsonb,
 '[
    {"alert_type":"staffing","zone":"Reception","trigger":"unattended_minutes","threshold":2,"severity":"high"},
    {"alert_type":"staffing","zone":"Restaurant","trigger":"coverage_during_service","severity":"medium"},
    {"alert_type":"ppe_violation","trigger":"uniform_violation","zone":"Reception","severity":"low","message":"Uniform standard not met"}
  ]'::jsonb,
 '{"widgets":["reception_uptime","fnb_coverage","uniform_compliance","guest_staff_ratio"]}'::jsonb,
 '[{"name":"Daily Service Report","cadence":"daily","sections":["coverage_by_zone","uniform_compliance","incidents"]}]'::jsonb,
 'standard')
ON CONFLICT (slug) DO UPDATE SET
  default_zones = EXCLUDED.default_zones,
  default_alert_rules = EXCLUDED.default_alert_rules,
  default_dashboard = EXCLUDED.default_dashboard,
  compliance_reports = EXCLUDED.compliance_reports,
  recommended_plan = EXCLUDED.recommended_plan;

-- 7. Restaurant
INSERT INTO industry_packs (slug, name, default_zones, default_alert_rules, default_dashboard, compliance_reports, recommended_plan) VALUES
('restaurant', 'Restaurants & F&B',
 '[
    {"name":"Kitchen","zone_type":"kitchen","ppe_requirements":["hairnet","gloves","apron"]},
    {"name":"Prep station","zone_type":"kitchen","ppe_requirements":["hairnet","gloves"]},
    {"name":"Grill","zone_type":"kitchen","min_workers":1,"service_hours":"12:00-15:00,19:00-23:00"},
    {"name":"Counter","zone_type":"service","min_workers":1},
    {"name":"Hand-wash station","zone_type":"hygiene","visit_frequency":"hourly"}
  ]'::jsonb,
 '[
    {"alert_type":"ppe_violation","zone":"Kitchen","trigger":"hygiene_missing","severity":"high","message":"Kitchen hygiene violation"},
    {"alert_type":"staffing","zone":"Grill","trigger":"unattended_during_service","severity":"high"},
    {"alert_type":"behaviour","zone":"Hand-wash station","trigger":"frequency_below","threshold":4,"severity":"medium","message":"Hand-wash frequency below FSSAI norm"}
  ]'::jsonb,
 '{"widgets":["hygiene_compliance","station_coverage","cover_ratio","handwash_frequency"]}'::jsonb,
 '[{"name":"FSSAI Audit Log","cadence":"monthly","format":"fssai","sections":["hygiene_compliance","handwash_frequency","incidents"]}]'::jsonb,
 'standard')
ON CONFLICT (slug) DO UPDATE SET
  default_zones = EXCLUDED.default_zones,
  default_alert_rules = EXCLUDED.default_alert_rules,
  default_dashboard = EXCLUDED.default_dashboard,
  compliance_reports = EXCLUDED.compliance_reports,
  recommended_plan = EXCLUDED.recommended_plan;

-- 8. Hospital
INSERT INTO industry_packs (slug, name, default_zones, default_alert_rules, default_dashboard, compliance_reports, recommended_plan) VALUES
('hospital', 'Hospitals & Clinics',
 '[
    {"name":"ICU","zone_type":"ward","ppe_requirements":["mask","gloves","gown"],"nurse_ratio":0.5},
    {"name":"General ward","zone_type":"ward","ppe_requirements":["mask"],"nurse_ratio":0.1},
    {"name":"OT","zone_type":"restricted","ppe_requirements":["mask","gloves","gown","cap"],"authorized_only":true},
    {"name":"Pharmacy","zone_type":"restricted","access_log":true,"authorized_only":true},
    {"name":"Records room","zone_type":"restricted","access_log":true}
  ]'::jsonb,
 '[
    {"alert_type":"staffing","zone":"ICU","trigger":"ratio_below_minimum","severity":"high","message":"Nurse ratio below NABH minimum in ICU"},
    {"alert_type":"ppe_violation","zone":"OT","trigger":"ppe_missing","severity":"high"},
    {"alert_type":"unauthorized","zone":"Pharmacy","trigger":"unauthorized_entry","severity":"high"}
  ]'::jsonb,
 '{"widgets":["nurse_ratio_by_ward","ppe_compliance","restricted_access_log","handwash_frequency"]}'::jsonb,
 '[{"name":"NABH Audit Summary","cadence":"quarterly","format":"nabh","sections":["nurse_ratios","ppe_compliance","restricted_access","incidents"]}]'::jsonb,
 'pro')
ON CONFLICT (slug) DO UPDATE SET
  default_zones = EXCLUDED.default_zones,
  default_alert_rules = EXCLUDED.default_alert_rules,
  default_dashboard = EXCLUDED.default_dashboard,
  compliance_reports = EXCLUDED.compliance_reports,
  recommended_plan = EXCLUDED.recommended_plan;

-- 9. School
INSERT INTO industry_packs (slug, name, default_zones, default_alert_rules, default_dashboard, compliance_reports, recommended_plan) VALUES
('school', 'Schools & Education',
 '[
    {"name":"Main gate","zone_type":"entry","duty_schedule":"08:00-09:00,14:00-15:00"},
    {"name":"Classroom block A","zone_type":"classroom","occupied_hours":"08:30-14:30"},
    {"name":"Exam hall","zone_type":"classroom","event_driven":true},
    {"name":"Canteen","zone_type":"supervised","supervision_required":true},
    {"name":"Playground","zone_type":"supervised","supervision_required":true}
  ]'::jsonb,
 '[
    {"alert_type":"staffing","zone":"Main gate","trigger":"missing_during_duty","severity":"high","message":"Gate unattended during duty hours"},
    {"alert_type":"staffing","zone":"Classroom block A","trigger":"unattended_during_class","severity":"high","message":"Classroom without adult supervision"},
    {"alert_type":"staffing","zone":"Exam hall","trigger":"invigilator_missing","severity":"high"}
  ]'::jsonb,
 '{"widgets":["classroom_supervision_pct","gate_duty_adherence","exam_hall_proof","canteen_supervision"]}'::jsonb,
 '[{"name":"Safety & Supervision Report","cadence":"monthly","sections":["classroom_supervision","gate_duty","exam_proof","incidents"]}]'::jsonb,
 'standard')
ON CONFLICT (slug) DO UPDATE SET
  default_zones = EXCLUDED.default_zones,
  default_alert_rules = EXCLUDED.default_alert_rules,
  default_dashboard = EXCLUDED.default_dashboard,
  compliance_reports = EXCLUDED.compliance_reports,
  recommended_plan = EXCLUDED.recommended_plan;

-- 10. Security services
INSERT INTO industry_packs (slug, name, default_zones, default_alert_rules, default_dashboard, compliance_reports, recommended_plan) VALUES
('security', 'Security Services',
 '[
    {"name":"Gate 1","zone_type":"post","min_workers":1,"always_manned":true},
    {"name":"Reception pedestal","zone_type":"post","min_workers":1,"always_manned":true},
    {"name":"Back dock","zone_type":"post","patrol_schedule":"every_30min"},
    {"name":"Perimeter","zone_type":"patrol","patrol_schedule":"every_60min"}
  ]'::jsonb,
 '[
    {"alert_type":"staffing","trigger":"post_abandoned_minutes","threshold":3,"severity":"high","message":"Guard abandoned post"},
    {"alert_type":"behaviour","trigger":"patrol_missed","severity":"medium","message":"Patrol route missed check-in"}
  ]'::jsonb,
 '{"widgets":["post_adherence_pct","patrol_completion","response_time","client_sla_rollup"]}'::jsonb,
 '[{"name":"Weekly Client SLA Report","cadence":"weekly","white_label":true,"sections":["post_adherence","patrol_completion","incidents","response_times"]}]'::jsonb,
 'scale')
ON CONFLICT (slug) DO UPDATE SET
  default_zones = EXCLUDED.default_zones,
  default_alert_rules = EXCLUDED.default_alert_rules,
  default_dashboard = EXCLUDED.default_dashboard,
  compliance_reports = EXCLUDED.compliance_reports,
  recommended_plan = EXCLUDED.recommended_plan;

-- ============================================================
-- DONE. No further steps — packs are read by the signup flow and
-- applied via /api/industries/packs/apply when a new client signs up.
-- ============================================================
