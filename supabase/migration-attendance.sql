-- ============================================================
-- StaffLenz Attendance Tracking Migration
-- Calculates daily clock-in/out, breaks, and hours worked from
-- worker_events detection data. Run AFTER migration-temporal-analysis.sql.
-- ============================================================

SET search_path TO public;

-- One row per worker per day. Recalculated at the end of each analysis
-- cycle by the attendance API. first_seen = clock-in, last_seen = clock-out,
-- gaps > 15 min in detections = breaks.
CREATE TABLE IF NOT EXISTS attendance_log (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id       uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  worker_id       uuid REFERENCES workers(id) ON DELETE CASCADE,
  worker_name     text NOT NULL,
  work_date       date NOT NULL,
  first_seen      timestamptz,           -- clock-in time
  last_seen       timestamptz,           -- clock-out time
  total_minutes   int DEFAULT 0,         -- minutes between first and last seen
  active_minutes  int DEFAULT 0,         -- minutes actually detected (excludes breaks)
  break_minutes   int DEFAULT 0,         -- total break time
  break_count     int DEFAULT 0,         -- number of breaks taken
  breaks          jsonb DEFAULT '[]',    -- [{start, end, minutes}]
  detection_count int DEFAULT 0,         -- how many times detected today
  avg_confidence  numeric(4,2),
  zones_visited   text[],               -- distinct zones seen in
  status          text DEFAULT 'present' CHECK (status IN ('present','absent','partial','left_early')),
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now(),
  UNIQUE (client_id, worker_name, work_date)
);

CREATE INDEX IF NOT EXISTS attendance_log_client_date_idx
  ON attendance_log (client_id, work_date DESC);
CREATE INDEX IF NOT EXISTS attendance_log_worker_date_idx
  ON attendance_log (worker_id, work_date DESC);

ALTER TABLE attendance_log ENABLE ROW LEVEL SECURITY;
