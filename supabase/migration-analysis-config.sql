-- ============================================================
-- StaffLenz: Per-Client Analysis Config Migration
-- Run in Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- 1. Add analysis_config JSONB column to clients
ALTER TABLE clients ADD COLUMN IF NOT EXISTS analysis_config jsonb DEFAULT '{}';

-- 2. Add missing columns on clients
ALTER TABLE clients ADD COLUMN IF NOT EXISTS site_name text;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS whatsapp_notify text;

-- 3. Add missing columns on camera_zones
ALTER TABLE camera_zones ADD COLUMN IF NOT EXISTS min_workers int DEFAULT 0;
ALTER TABLE camera_zones ADD COLUMN IF NOT EXISTS max_workers int;
ALTER TABLE camera_zones ADD COLUMN IF NOT EXISTS rules text[];
ALTER TABLE camera_zones ADD COLUMN IF NOT EXISTS ppe_requirements text[];

-- 4. Add severity to alerts
ALTER TABLE alerts ADD COLUMN IF NOT EXISTS severity text DEFAULT 'medium';

-- 5. Create monitoring_results table for cost tracking
CREATE TABLE IF NOT EXISTS monitoring_results (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id       uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  analysis_json   jsonb,
  frame_url       text,
  input_tokens    int,
  output_tokens   int,
  model_used      text,
  cost_usd        numeric(10,6),
  processing_ms   int,
  workers_detected int DEFAULT 0,
  alerts_created   int DEFAULT 0,
  overall_status   text,
  created_at      timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS mr_client_time_idx ON monitoring_results(client_id, created_at DESC);
ALTER TABLE monitoring_results ENABLE ROW LEVEL SECURITY;

-- 6. Set default analysis_config for Caesars Fitness Club
UPDATE clients SET analysis_config = '{
  "industry": "gym",
  "shift_start": "06:00",
  "shift_end": "22:00",
  "ppe_requirements": [],
  "alert_rules": [
    "Reception must always be staffed during operating hours",
    "Trainer must be present on gym floor at all times",
    "Pool area requires lifeguard supervision"
  ],
  "alert_severity_threshold": "medium",
  "analysis_frequency_minutes": 5,
  "industry_specific": {
    "track_trainer_presence": true,
    "track_cleaner_schedule": true,
    "pool_supervision_required": true
  }
}'::jsonb WHERE name = 'Caesars Fitness Club';

-- Verify
SELECT name, analysis_config FROM clients;
SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'monitoring_results' ORDER BY ordinal_position;
