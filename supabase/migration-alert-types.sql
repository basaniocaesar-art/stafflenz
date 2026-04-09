-- Expand alerts.alert_type CHECK constraint
--
-- Background: the original constraint only allowed
--   absent | late | zone_violation | ppe_violation | unauthorized | low_confidence
-- but src/lib/promptBuilder.js teaches Claude to emit:
--   ppe_violation | zone_violation | behaviour | safety | staffing
-- so any alert with type 'behaviour', 'safety' or 'staffing' was being silently
-- rejected by the constraint (Supabase returns insert errors as values, not throws,
-- and src/app/api/monitor/analyze/route.js was not checking the error). Net effect:
-- the dashboard showed no new alerts even though the analyzer was producing them.
--
-- This migration:
--   1. Drops the old constraint
--   2. Recreates it with the union of (existing allowed types) ∪ (prompt types)
--      plus 'general' as a safe fallback for any future Claude vocabulary drift.

ALTER TABLE alerts DROP CONSTRAINT IF EXISTS alerts_alert_type_check;

ALTER TABLE alerts ADD CONSTRAINT alerts_alert_type_check
  CHECK (alert_type IN (
    'absent',
    'late',
    'zone_violation',
    'ppe_violation',
    'unauthorized',
    'low_confidence',
    'behaviour',
    'safety',
    'staffing',
    'general'
  ));
