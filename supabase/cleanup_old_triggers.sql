-- ============================================================
-- CLEANUP: Verwijder oude conflicterende triggers
-- ============================================================

-- Drop oude triggers op projects
DROP TRIGGER IF EXISTS atc_stage_trigger ON projects;
DROP TRIGGER IF EXISTS atc_notify_stage_change ON projects;
DROP TRIGGER IF EXISTS project_stage_change_notification ON projects;

-- Drop oude functies
DROP FUNCTION IF EXISTS atc_notify_stage_change();
DROP FUNCTION IF EXISTS notify_project_stage_change();

-- Verifieer dat alleen onze nieuwe trigger bestaat
SELECT tgname, tgrelid::regclass
FROM pg_trigger
WHERE tgrelid = 'projects'::regclass
AND NOT tgisinternal;
