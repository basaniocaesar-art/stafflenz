-- ============================================================
-- StaffLenz: pg_cron migration — 15-minute scheduled calls
-- Run in Supabase Dashboard → SQL Editor
-- ============================================================
-- Vercel Hobby tier only allows daily cron jobs, which is too slow for the
-- email-receiver and orchestrator. This migration uses Supabase's built-in
-- pg_cron + pg_net extensions to hit those endpoints every 15 minutes from
-- inside your Postgres database. Completely free, runs on your existing
-- Supabase project, no external services needed.
--
-- ⚠ BEFORE RUNNING:
--   1. Find your CRON_SECRET value in Vercel → stafflenz → Settings →
--      Environment Variables. Copy it.
--      If you don't have one yet, generate one (run in a terminal):
--          openssl rand -hex 32
--      and add it to Vercel Env Vars as CRON_SECRET.
--   2. Replace the REPLACE_ME_CRON_SECRET placeholder below with the value.
--   3. Replace the APP_URL placeholder if your domain is different from
--      https://www.stafflenz.com.
--   4. Run the whole file in Supabase SQL Editor.
-- ============================================================

-- ─── 1. Enable the required extensions ────────────────────────────────────
-- pg_cron: in-database scheduler
-- pg_net:  async HTTP client (net.http_post / net.http_get)
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;


-- ─── 2. Remove any previous StaffLenz cron jobs (idempotent) ──────────────
DO $$
BEGIN
  PERFORM cron.unschedule('stafflenz-email-receiver')
    WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'stafflenz-email-receiver');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  PERFORM cron.unschedule('stafflenz-orchestrator')
    WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'stafflenz-orchestrator');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;


-- ─── 3. Schedule email-receiver every 15 minutes ──────────────────────────
-- Pulls new emails from the DVR mailbox, extracts snapshot attachments,
-- stitches them, and runs Claude Vision analysis.
SELECT cron.schedule(
  'stafflenz-email-receiver',
  '*/15 * * * *',
  $cmd$
  SELECT net.http_get(
    url := 'https://www.stafflenz.com/api/monitor/email-receiver',
    headers := jsonb_build_object(
      'Authorization', 'Bearer REPLACE_ME_CRON_SECRET',
      'Content-Type', 'application/json'
    ),
    timeout_milliseconds := 300000
  );
  $cmd$
);


-- ─── 4. Schedule orchestrator every 15 minutes ────────────────────────────
-- Drains the frame_queue (webhook-pushed frames) and runs the capture+motion
-- pull path for any clients using ONVIF/Hik cameras.
SELECT cron.schedule(
  'stafflenz-orchestrator',
  '*/15 * * * *',
  $cmd$
  SELECT net.http_post(
    url := 'https://www.stafflenz.com/api/monitor/orchestrator',
    headers := jsonb_build_object(
      'Authorization', 'Bearer REPLACE_ME_CRON_SECRET',
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 300000
  );
  $cmd$
);


-- ─── 5. Verification ──────────────────────────────────────────────────────
-- After running the above, check that both jobs are scheduled:
--
--   SELECT jobid, jobname, schedule, active FROM cron.job
--    WHERE jobname LIKE 'stafflenz-%';
--
-- Check recent run history:
--
--   SELECT job_pid, status, return_message, start_time, end_time
--     FROM cron.job_run_details
--    WHERE jobid IN (SELECT jobid FROM cron.job WHERE jobname LIKE 'stafflenz-%')
--    ORDER BY start_time DESC LIMIT 20;
--
-- See the actual HTTP response bodies from net.http_get/post calls:
--
--   SELECT id, created, status_code, content_type, content
--     FROM net._http_response
--    ORDER BY created DESC LIMIT 10;
-- ============================================================
