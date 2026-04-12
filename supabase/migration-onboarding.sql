-- ============================================================
-- StaffLenz: Onboarding Migration
-- Run in Supabase Dashboard → SQL Editor
-- ============================================================

-- Sites table (one per client location)
CREATE TABLE IF NOT EXISTS sites (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id       uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  site_name       text NOT NULL,
  address         text,
  industry        text,
  num_cameras     int DEFAULT 0,
  connection_method text DEFAULT 'ftp',
  ftp_username    text,
  ftp_password    text,
  ftp_directory   text,
  is_active       boolean DEFAULT true,
  created_at      timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS sites_client_idx ON sites(client_id);
ALTER TABLE sites ENABLE ROW LEVEL SECURITY;

-- Onboarding state on clients
ALTER TABLE clients ADD COLUMN IF NOT EXISTS onboarding_completed boolean DEFAULT false;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS onboarding_step int DEFAULT 1;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS monitoring_active boolean DEFAULT false;

-- Site reference on existing tables (for multi-site support later)
ALTER TABLE camera_zones ADD COLUMN IF NOT EXISTS site_id uuid REFERENCES sites(id) ON DELETE SET NULL;
ALTER TABLE workers ADD COLUMN IF NOT EXISTS site_id uuid REFERENCES sites(id) ON DELETE SET NULL;
