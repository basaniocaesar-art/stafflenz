-- ============================================================
-- StaffLenz Database Schema
-- Run this in Supabase SQL Editor (Dashboard > SQL Editor > New Query)
-- Supabase region: Singapore (ap-southeast-1)
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- PLAN LIMITS (seed data)
-- ============================================================
CREATE TABLE IF NOT EXISTS plan_limits (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan        text NOT NULL UNIQUE CHECK (plan IN ('starter','standard','pro','enterprise')),
  max_workers int NOT NULL DEFAULT 50,
  max_cameras int NOT NULL DEFAULT 8,
  price_inr   int NOT NULL DEFAULT 8000,
  created_at  timestamptz DEFAULT now()
);

INSERT INTO plan_limits (plan, max_workers, max_cameras, price_inr) VALUES
  ('starter',    15,  4,  5000),
  ('standard',   50,  8,  8000),
  ('pro',       150, 16, 14000),
  ('enterprise', 999, 64, 22000)
ON CONFLICT (plan) DO NOTHING;

-- ============================================================
-- CLIENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS clients (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  industry    text NOT NULL CHECK (industry IN ('factory','hotel','school','retail')),
  plan        text NOT NULL DEFAULT 'starter' REFERENCES plan_limits(plan),
  is_active   boolean DEFAULT true,
  timezone    text DEFAULT 'Asia/Kolkata',
  created_at  timestamptz DEFAULT now()
);

-- ============================================================
-- USERS
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id     uuid REFERENCES clients(id) ON DELETE CASCADE,
  email         text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  role          text NOT NULL DEFAULT 'client_admin' CHECK (role IN ('client_admin','client_user','super_admin')),
  full_name     text,
  is_active     boolean DEFAULT true,
  last_login_at timestamptz,
  created_at    timestamptz DEFAULT now()
);

-- ============================================================
-- SESSIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS sessions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash  text UNIQUE NOT NULL,
  expires_at  timestamptz NOT NULL,
  ip_address  text,
  user_agent  text,
  created_at  timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS sessions_token_hash_idx ON sessions(token_hash);
CREATE INDEX IF NOT EXISTS sessions_expires_at_idx ON sessions(expires_at);

-- ============================================================
-- WORKERS
-- ============================================================
CREATE TABLE IF NOT EXISTS workers (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id     uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  full_name     text NOT NULL,
  employee_id   text,
  department    text,
  shift         text DEFAULT 'morning' CHECK (shift IN ('morning','afternoon','night','flexible')),
  photo_path    text,
  is_active     boolean DEFAULT true,
  deleted_at    timestamptz,
  created_at    timestamptz DEFAULT now(),
  UNIQUE (client_id, employee_id)
);
CREATE INDEX IF NOT EXISTS workers_client_id_idx ON workers(client_id) WHERE deleted_at IS NULL;

-- ============================================================
-- CAMERA ZONES
-- ============================================================
CREATE TABLE IF NOT EXISTS camera_zones (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id       uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  name            text NOT NULL,
  camera_key      uuid UNIQUE DEFAULT gen_random_uuid(),
  camera_ip       text,
  location_label  text,
  zone_type       text DEFAULT 'floor',
  is_active       boolean DEFAULT true,
  created_at      timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS camera_zones_client_idx ON camera_zones(client_id);
CREATE INDEX IF NOT EXISTS camera_zones_key_idx ON camera_zones(camera_key);

-- ============================================================
-- WORKER EVENTS (high-volume table from Pi)
-- ============================================================
CREATE TABLE IF NOT EXISTS worker_events (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id       uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  worker_id       uuid REFERENCES workers(id) ON DELETE CASCADE,
  zone_id         uuid REFERENCES camera_zones(id) ON DELETE SET NULL,
  worker_name     text,
  activity        text,
  event_type      text DEFAULT 'detected' CHECK (event_type IN ('check_in','check_out','detected','absent','zone_violation','ppe_violation')),
  confidence      numeric(5,2),
  zone_violation  boolean DEFAULT false,
  ppe_compliant   boolean DEFAULT true,
  notes           text,
  device_event_id text UNIQUE,
  occurred_at     timestamptz NOT NULL DEFAULT now(),
  created_at      timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS we_client_time_idx ON worker_events(client_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS we_worker_time_idx ON worker_events(worker_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS we_device_evt_idx ON worker_events(device_event_id);

-- ============================================================
-- ALERTS
-- ============================================================
CREATE TABLE IF NOT EXISTS alerts (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id   uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  worker_id   uuid REFERENCES workers(id) ON DELETE CASCADE,
  event_id    uuid REFERENCES worker_events(id) ON DELETE CASCADE,
  alert_type  text NOT NULL CHECK (alert_type IN ('absent','late','zone_violation','ppe_violation','unauthorized','low_confidence')),
  message     text,
  worker_name text,
  zone_name   text,
  is_resolved boolean DEFAULT false,
  resolved_at timestamptz,
  created_at  timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS alerts_client_unresolved_idx ON alerts(client_id, is_resolved, created_at DESC);

-- ============================================================
-- DAILY SUMMARY (pre-aggregated for dashboard performance)
-- ============================================================
CREATE TABLE IF NOT EXISTS daily_summary (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id       uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  summary_date    date NOT NULL,
  total_workers   int DEFAULT 0,
  present_count   int DEFAULT 0,
  absent_count    int DEFAULT 0,
  late_count      int DEFAULT 0,
  violation_count int DEFAULT 0,
  total_events    int DEFAULT 0,
  updated_at      timestamptz DEFAULT now(),
  UNIQUE (client_id, summary_date)
);
CREATE INDEX IF NOT EXISTS ds_client_date_idx ON daily_summary(client_id, summary_date DESC);

-- ============================================================
-- LEADS (demo booking from homepage)
-- ============================================================
CREATE TABLE IF NOT EXISTS leads (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text NOT NULL,
  email         text NOT NULL,
  phone         text,
  company       text,
  industry      text,
  message       text,
  is_contacted  boolean DEFAULT false,
  ip_address    text,
  created_at    timestamptz DEFAULT now()
);

-- ============================================================
-- STORAGE BUCKET SETUP
-- Run this separately in Supabase Dashboard > Storage > New Bucket
-- Or via SQL:
-- ============================================================
-- INSERT INTO storage.buckets (id, name, public) VALUES ('worker-photos', 'worker-photos', false);

-- ============================================================
-- RLS POLICIES (Row Level Security)
-- Disable RLS for server-side access via service role key
-- Enable for extra safety on client-facing tables
-- ============================================================

-- We use service_role key server-side which bypasses RLS
-- Enable RLS but only allow service_role to mutate
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE workers ENABLE ROW LEVEL SECURITY;
ALTER TABLE camera_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE worker_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_summary ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_limits ENABLE ROW LEVEL SECURITY;

-- Allow service role full access (bypasses RLS automatically)
-- Allow anon to read plan_limits only
CREATE POLICY "anon_read_plan_limits" ON plan_limits FOR SELECT TO anon USING (true);

-- ============================================================
-- HELPER: process_event RPC (called from /api/events)
-- Upserts daily_summary atomically
-- ============================================================
CREATE OR REPLACE FUNCTION process_event_summary(
  p_client_id    uuid,
  p_summary_date date,
  p_is_violation boolean DEFAULT false
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO daily_summary (client_id, summary_date, total_events, violation_count)
  VALUES (p_client_id, p_summary_date, 1, CASE WHEN p_is_violation THEN 1 ELSE 0 END)
  ON CONFLICT (client_id, summary_date) DO UPDATE SET
    total_events    = daily_summary.total_events + 1,
    violation_count = daily_summary.violation_count + CASE WHEN p_is_violation THEN 1 ELSE 0 END,
    updated_at      = now();
END;
$$;

-- ============================================================
-- SEED: Super Admin User
-- Change password after first login!
-- Password: StaffLenz@Admin2024 (bcrypt hash below)
-- Generate your own: node -e "const b=require('bcryptjs');console.log(b.hashSync('YOUR_PASSWORD',12))"
-- ============================================================
-- INSERT INTO users (email, password_hash, role, full_name)
-- VALUES ('admin@stafflenz.com', '$2a$12$REPLACE_WITH_BCRYPT_HASH', 'super_admin', 'StaffLenz Admin');

-- ============================================================
-- DONE
-- Next steps:
-- 1. Create storage bucket 'worker-photos' in Supabase Dashboard > Storage
-- 2. Insert super admin user with bcrypt hash
-- 3. Copy SUPABASE_URL, ANON_KEY, SERVICE_ROLE_KEY to .env.local
-- ============================================================
