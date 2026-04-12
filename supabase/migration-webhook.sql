-- ============================================================
-- StaffLenz: Webhook Receiver + Frame Queue Migration
-- Run in Supabase Dashboard → SQL Editor
-- ============================================================
-- Adds support for the HTTP webhook-receiver:
--   1. clients.webhook_key — per-client secret the DVR uses to authenticate
--   2. frame_queue — table where webhook-received frames sit until the
--      15-min batch cron picks them up and runs Claude analysis
-- ============================================================

-- ─── 1. Webhook key on clients ─────────────────────────────────────────────
-- Each client gets a unique random key. The DVR is configured to POST to
-- /api/monitor/webhook-receiver?key=<webhook_key> and we look the client up.
ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS webhook_key text UNIQUE;

-- Backfill: generate a key for every existing client that doesn't have one.
-- Uses gen_random_uuid() stripped of dashes for a compact 32-char token.
UPDATE clients
   SET webhook_key = replace(gen_random_uuid()::text, '-', '')
 WHERE webhook_key IS NULL;

-- Auto-generate webhook_key for new clients via trigger. Safer than a DEFAULT
-- because it survives explicit INSERTs that pass NULL.
CREATE OR REPLACE FUNCTION set_webhook_key_if_null()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.webhook_key IS NULL THEN
    NEW.webhook_key := replace(gen_random_uuid()::text, '-', '');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS clients_set_webhook_key ON clients;
CREATE TRIGGER clients_set_webhook_key
  BEFORE INSERT ON clients
  FOR EACH ROW
  EXECUTE FUNCTION set_webhook_key_if_null();

CREATE INDEX IF NOT EXISTS clients_webhook_key_idx ON clients(webhook_key);


-- ─── 2. Frame queue ────────────────────────────────────────────────────────
-- When a DVR pushes a snapshot via HTTP webhook, we save it to Supabase
-- Storage and insert a row here. The orchestrator/batch cron claims pending
-- rows, runs Claude analysis, and marks them processed. Keeps Claude cost
-- identical to the email/FTP receivers because everything is batched.
CREATE TABLE IF NOT EXISTS frame_queue (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id     uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  frame_path    text NOT NULL,                 -- path inside the `frames` storage bucket
  source        text NOT NULL DEFAULT 'webhook', -- webhook | email | ftp | agent
  status        text NOT NULL DEFAULT 'pending', -- pending | processing | processed | failed
  error         text,                          -- populated if status = failed
  processed_at  timestamptz,                   -- set when status transitions to processed/failed
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- Hot path: the cron fetches pending rows for a given client, oldest first.
CREATE INDEX IF NOT EXISTS frame_queue_pending_idx
  ON frame_queue(client_id, created_at)
  WHERE status = 'pending';

-- Cleanup path: let operators find failed/old rows quickly.
CREATE INDEX IF NOT EXISTS frame_queue_status_idx
  ON frame_queue(status, created_at DESC);

ALTER TABLE frame_queue ENABLE ROW LEVEL SECURITY;

-- No RLS policies — the webhook-receiver and cron both use the service_role
-- client which bypasses RLS. If you ever want clients to read their own
-- queue via the dashboard, add a SELECT policy keyed on client_id = auth.uid().


-- ─── 3. Helper: auto-expire old processed rows (optional housekeeping) ────
-- Keeps the queue from growing forever. Safe to run from a daily cron or
-- from the orchestrator itself. Deletes processed rows older than 7 days.
CREATE OR REPLACE FUNCTION prune_old_frame_queue()
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
  deleted_count integer;
BEGIN
  DELETE FROM frame_queue
   WHERE status IN ('processed', 'failed')
     AND processed_at < now() - interval '7 days';
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;


-- ─── 4. Verification queries (run these manually after migration) ─────────
-- SELECT id, name, webhook_key FROM clients LIMIT 5;
-- SELECT count(*) FROM frame_queue;
-- SELECT prune_old_frame_queue();
