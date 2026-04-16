-- ============================================================
-- StaffLenz Temporal Analysis Migration
-- Adds frame indexing, timeline results, and motion events so the
-- edge agent can capture at a high rate (3 sec) and batch analysis
-- into 5-minute sequence windows. Run AFTER migration-billing.sql.
-- ============================================================

-- ---------- frame_buffer: index of all captured frames -------
-- Agent uploads frames to Supabase Storage and inserts a row here.
-- The analyze loop queries this to find the last N frames per camera
-- within a rolling window. 'analyzed' flips true once a frame has
-- participated in a scheduled sequence analysis.
CREATE TABLE IF NOT EXISTS frame_buffer (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id      uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  camera_channel int  NOT NULL,
  frame_path     text NOT NULL,             -- supabase storage path
  captured_at    timestamptz NOT NULL DEFAULT now(),
  analyzed       boolean DEFAULT false,
  has_motion     boolean DEFAULT false,     -- set when agent's pixel-diff
                                             -- flagged motion on this frame
  created_at     timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS frame_buffer_client_cam_time_idx
  ON frame_buffer (client_id, camera_channel, captured_at DESC);
CREATE INDEX IF NOT EXISTS frame_buffer_unanalyzed_idx
  ON frame_buffer (client_id, captured_at DESC) WHERE analyzed = false;

ALTER TABLE frame_buffer ENABLE ROW LEVEL SECURITY;

-- ---------- activity_timeline: per-window sequence results ---
-- One row per scheduled analysis window (e.g. every 5 min). Claude's
-- output contains a minute-by-minute breakdown so the dashboard can
-- render "Basanio at reception 14:00-14:03, gone 14:03-14:05, back at 14:05".
CREATE TABLE IF NOT EXISTS activity_timeline (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id         uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  window_start      timestamptz NOT NULL,
  window_end        timestamptz NOT NULL,
  camera_channel    int,                    -- null if stitched multi-camera
  timeline          jsonb NOT NULL,         -- [{minute, people:[{name,zone,activity}], ...}]
  summary           text,
  workers_detected  int DEFAULT 0,
  alerts_created    int DEFAULT 0,
  idle_minutes      int DEFAULT 0,
  away_minutes      int DEFAULT 0,
  model_used        text,
  input_tokens      int,
  output_tokens     int,
  cost_usd          numeric(10,6),
  processing_ms     int,
  created_at        timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS activity_timeline_client_time_idx
  ON activity_timeline (client_id, window_start DESC);

ALTER TABLE activity_timeline ENABLE ROW LEVEL SECURITY;

-- ---------- motion_events: agent-detected motion triggers ----
-- When the agent's pixel-diff flags motion above threshold, it grabs
-- a 5-frame burst around the event and calls /api/agent/analyze-burst.
-- Rows here record both the trigger and the analysis result.
CREATE TABLE IF NOT EXISTS motion_events (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id         uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  camera_channel    int NOT NULL,
  detected_at       timestamptz NOT NULL,
  motion_score      numeric(6,2),           -- 0-255 mean pixel delta
  frame_paths       jsonb NOT NULL DEFAULT '[]'::jsonb,  -- array of storage paths
  analyzed          boolean DEFAULT false,
  analysis_json     jsonb,
  severity          text CHECK (severity IN ('low','medium','high','critical')),
  incident_summary  text,
  identified_people text[],
  alert_sent        boolean DEFAULT false,
  cost_usd          numeric(10,6),
  created_at        timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS motion_events_client_time_idx
  ON motion_events (client_id, detected_at DESC);
CREATE INDEX IF NOT EXISTS motion_events_unanalyzed_idx
  ON motion_events (client_id, detected_at DESC) WHERE analyzed = false;

ALTER TABLE motion_events ENABLE ROW LEVEL SECURITY;

-- ---------- frame retention function -------------------------
-- Prunes frames older than the client's forensic_days retention from
-- plan_limits.features. Called by a scheduled pg_cron every hour.
CREATE OR REPLACE FUNCTION prune_old_frames() RETURNS void
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  r record;
  cutoff timestamptz;
BEGIN
  FOR r IN
    SELECT c.id AS client_id,
           COALESCE((pl.features->>'forensic_days')::int, 1) AS retention_days
    FROM clients c
    JOIN plan_limits pl ON pl.plan = c.plan
  LOOP
    cutoff := now() - (r.retention_days || ' days')::interval;
    DELETE FROM frame_buffer
      WHERE client_id = r.client_id AND captured_at < cutoff;
  END LOOP;
END;
$$;

-- Note: the actual storage objects (JPEGs in 'frames' bucket) must also
-- be pruned. That's handled agent-side or via a separate storage cleanup
-- cron that reads frame_buffer-deleted paths and removes them. Kept out
-- of this migration to avoid coupling SQL to storage semantics.

-- ============================================================
-- DONE.
-- The edge agent v2 will start writing to these tables immediately
-- once it's running. Existing monitoring_results rows stay untouched —
-- the old /api/agent/analyze route still works for legacy single-frame
-- analysis, the new routes write to activity_timeline + motion_events.
-- ============================================================
