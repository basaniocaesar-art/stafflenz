-- ============================================================
-- StaffLenz Multi-Location Migration
-- Adds locations table so one client can manage multiple sites
-- from a single dashboard. Run AFTER migration-temporal-analysis.sql.
-- ============================================================

SET search_path TO public;

-- Each client can have multiple locations (branches/sites).
-- If a client has no locations, they operate as a single-site client
-- (backwards compatible — location_id is nullable on all tables).
CREATE TABLE IF NOT EXISTS locations (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id   uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  name        text NOT NULL,
  address     text,
  city        text,
  dvr_ip      text,
  dvr_port    int DEFAULT 80,
  dvr_username text,
  dvr_password text,
  max_cameras int DEFAULT 8,
  is_active   boolean DEFAULT true,
  created_at  timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS locations_client_idx ON locations(client_id);
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;

-- Add location_id to all per-site tables. Nullable so existing
-- single-site clients keep working without migration.
ALTER TABLE camera_zones    ADD COLUMN IF NOT EXISTS location_id uuid REFERENCES locations(id) ON DELETE CASCADE;
ALTER TABLE workers         ADD COLUMN IF NOT EXISTS location_id uuid REFERENCES locations(id) ON DELETE CASCADE;
ALTER TABLE worker_events   ADD COLUMN IF NOT EXISTS location_id uuid REFERENCES locations(id) ON DELETE CASCADE;
ALTER TABLE alerts          ADD COLUMN IF NOT EXISTS location_id uuid REFERENCES locations(id) ON DELETE CASCADE;
ALTER TABLE frame_buffer    ADD COLUMN IF NOT EXISTS location_id uuid REFERENCES locations(id) ON DELETE CASCADE;
ALTER TABLE activity_timeline ADD COLUMN IF NOT EXISTS location_id uuid REFERENCES locations(id) ON DELETE CASCADE;
ALTER TABLE motion_events   ADD COLUMN IF NOT EXISTS location_id uuid REFERENCES locations(id) ON DELETE CASCADE;
ALTER TABLE monitoring_results ADD COLUMN IF NOT EXISTS location_id uuid REFERENCES locations(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS worker_events_location_idx ON worker_events(location_id) WHERE location_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS alerts_location_idx ON alerts(location_id) WHERE location_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS frame_buffer_location_idx ON frame_buffer(location_id) WHERE location_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS activity_timeline_location_idx ON activity_timeline(location_id) WHERE location_id IS NOT NULL;
