-- ============================================================
-- FIX SECURITY WARNINGS
-- Created: 2026-03-02
--
-- Fixes three categories from Supabase Security Linter:
--
-- 1. rls_disabled_in_public (ERROR):
--    chat_memory and atc_config exposed without RLS.
--    Fix: ALTER TABLE ... ENABLE ROW LEVEL SECURITY
--    Note: chat_memory is n8n-internal (service_role only).
--          atc_config gets an admin-read policy.
--
-- 2. function_search_path_mutable (WARN — 13 functions):
--    Functions without SET search_path = public are vulnerable
--    to schema injection via search_path manipulation.
--    Fix: CREATE OR REPLACE with SET search_path = public.
--    Trigger associations are preserved (no CASCADE needed).
--
-- 3. rls_policy_always_true (WARN):
--    notifications: WITH CHECK (true) TO authenticated lets any
--    user insert notifications for any recipient.
--    Fix: drop the policy. Inserts are done by SECURITY DEFINER
--    functions (notify_users, triggers) and n8n service_role —
--    both bypass RLS, so no user-facing INSERT policy is needed.
--
-- 4. auth_leaked_password_protection (WARN):
--    Cannot be fixed via SQL — see manual step at the bottom.
--
-- All operations are idempotent (IF EXISTS, CREATE OR REPLACE).
-- ============================================================


-- ============================================================
-- PART 1: ENABLE RLS ON EXPOSED TABLES
-- ============================================================

-- chat_memory: LangChain Postgres Chat Memory table used by n8n.
-- Only accessed by n8n (service_role) — no user policies needed.
-- service_role bypasses RLS entirely, so n8n reads/writes are unaffected.
-- If your n8n Postgres Chat Memory node uses a different table name,
-- update the name below accordingly.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'chat_memory'
  ) THEN
    EXECUTE 'ALTER TABLE chat_memory ENABLE ROW LEVEL SECURITY';
    RAISE NOTICE 'RLS enabled on chat_memory';
  ELSE
    RAISE NOTICE 'chat_memory not found — skipping (check n8n Postgres Chat Memory table name config)';
  END IF;
END $$;

-- atc_config: ATC webhook URL/config table.
-- n8n (service_role) reads/writes this via Supabase nodes → bypasses RLS.
-- Authenticated admins get SELECT so they can inspect config in the Dashboard.
ALTER TABLE atc_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view atc_config" ON atc_config;

CREATE POLICY "Admins can view atc_config" ON atc_config
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.role IN ('ADMIN', 'super_admin')
    )
  );


-- ============================================================
-- PART 2: FIX FUNCTION SEARCH_PATH (13 functions)
--
-- Adds SET search_path = public to prevent schema injection attacks.
-- Only the search_path clause changes — function body is identical
-- to the original definition.
-- ============================================================

-- 1. update_session_last_message
--    Trigger: AFTER INSERT ON chat_messages (trigger_update_session_last_message)
CREATE OR REPLACE FUNCTION update_session_last_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  UPDATE chat_sessions
  SET last_message_at = NEW.created_at,
      updated_at = NOW()
  WHERE id = NEW.session_id;
  RETURN NEW;
END;
$$;

-- 2. atc_is_event_processed
--    Idempotency check: returns TRUE if event hash already processed.
CREATE OR REPLACE FUNCTION atc_is_event_processed(p_event_hash TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM atc_processed_events WHERE event_hash = p_event_hash
  );
END;
$$;

-- 3. atc_mark_event_processed
--    Idempotency write: inserts event hash, silently ignores duplicates.
CREATE OR REPLACE FUNCTION atc_mark_event_processed(
  p_event_hash TEXT,
  p_event_type TEXT,
  p_entity_type TEXT,
  p_entity_id UUID,
  p_workflow_execution_id TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO atc_processed_events (
    event_hash, event_type, entity_type, entity_id, workflow_execution_id
  )
  VALUES (
    p_event_hash, p_event_type, p_entity_type, p_entity_id, p_workflow_execution_id
  )
  ON CONFLICT (event_hash) DO NOTHING
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

-- 4. atc_record_failure
--    Circuit breaker: records service failure, opens circuit after 3 failures.
CREATE OR REPLACE FUNCTION atc_record_failure(p_service_name TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_new_count INTEGER;
  v_new_state TEXT;
BEGIN
  UPDATE atc_circuit_breaker
  SET
    failure_count = failure_count + 1,
    last_failure_at = NOW(),
    updated_at = NOW()
  WHERE service_name = p_service_name
  RETURNING failure_count INTO v_new_count;

  -- Open circuit after 3 consecutive failures
  IF v_new_count >= 3 THEN
    UPDATE atc_circuit_breaker
    SET state = 'open', opened_at = NOW()
    WHERE service_name = p_service_name
    RETURNING state INTO v_new_state;
  ELSE
    SELECT state INTO v_new_state
    FROM atc_circuit_breaker
    WHERE service_name = p_service_name;
  END IF;

  RETURN v_new_state;
END;
$$;

-- 5. atc_record_success
--    Circuit breaker: records success, resets failure count, closes circuit.
CREATE OR REPLACE FUNCTION atc_record_success(p_service_name TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_new_state TEXT;
BEGIN
  UPDATE atc_circuit_breaker
  SET
    failure_count = 0,
    success_count = success_count + 1,
    last_success_at = NOW(),
    state = 'closed',
    updated_at = NOW()
  WHERE service_name = p_service_name
  RETURNING state INTO v_new_state;

  RETURN v_new_state;
END;
$$;

-- 6. atc_get_metrics
--    Returns system health metrics as JSON for monitoring dashboard.
CREATE OR REPLACE FUNCTION atc_get_metrics()
RETURNS JSON
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_result JSON;
BEGIN
  SELECT json_build_object(
    'processed_last_hour', (
      SELECT COUNT(*) FROM atc_processed_events
      WHERE processed_at > NOW() - INTERVAL '1 hour'
    ),
    'processed_last_24h', (
      SELECT COUNT(*) FROM atc_processed_events
      WHERE processed_at > NOW() - INTERVAL '24 hours'
    ),
    'pending_retries', (
      SELECT COUNT(*) FROM atc_failed_events WHERE status = 'pending'
    ),
    'failed_events', (
      SELECT COUNT(*) FROM atc_failed_events WHERE status = 'failed'
    ),
    'circuit_states', (
      SELECT json_object_agg(service_name, state) FROM atc_circuit_breaker
    ),
    'system_health', CASE
      WHEN EXISTS (SELECT 1 FROM atc_circuit_breaker WHERE state = 'open') THEN 'degraded'
      WHEN (SELECT COUNT(*) FROM atc_failed_events WHERE status = 'pending') > 10 THEN 'warning'
      ELSE 'healthy'
    END
  ) INTO v_result;

  RETURN v_result;
END;
$$;

-- 7. call_atc_webhook
--    SECURITY DEFINER: reads atc_config and fires HTTP POST to n8n via pg_net.
CREATE OR REPLACE FUNCTION call_atc_webhook(payload JSONB)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  webhook_url TEXT;
  is_enabled TEXT;
BEGIN
  SELECT value INTO webhook_url FROM atc_config WHERE key = 'webhook_url';
  SELECT value INTO is_enabled FROM atc_config WHERE key = 'webhook_enabled';

  IF is_enabled = 'true' AND webhook_url IS NOT NULL THEN
    PERFORM net.http_post(
      url := webhook_url,
      headers := '{"Content-Type": "application/json"}'::jsonb,
      body := payload
    );
  END IF;
END;
$$;

-- 8. trigger_atc_project_stage_change
--    SECURITY DEFINER trigger on projects.stage changes.
CREATE OR REPLACE FUNCTION trigger_atc_project_stage_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  company_name TEXT;
  owner_email TEXT;
BEGIN
  IF OLD.stage IS NOT DISTINCT FROM NEW.stage THEN
    RETURN NEW;
  END IF;

  SELECT name INTO company_name FROM companies WHERE id = NEW.company_id;
  SELECT email INTO owner_email FROM profiles WHERE id = NEW.owner_id;

  PERFORM call_atc_webhook(jsonb_build_object(
    'event_type', 'stage_change',
    'entity_type', 'project',
    'project_id', NEW.id,
    'old_stage', OLD.stage,
    'new_stage', NEW.stage,
    'owner_id', NEW.owner_id,
    'project', jsonb_build_object(
      'id', NEW.id,
      'title', NEW.title,
      'value', NEW.value,
      'owner_id', NEW.owner_id
    ),
    'company', jsonb_build_object(
      'id', NEW.company_id,
      'name', company_name
    ),
    'owner_email', owner_email,
    'timestamp', NOW()
  ));

  RETURN NEW;
END;
$$;

-- 9. trigger_atc_quote_status_change
--    SECURITY DEFINER trigger on quotes.status changes.
CREATE OR REPLACE FUNCTION trigger_atc_quote_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  project_title TEXT;
  company_name TEXT;
  owner_id UUID;
BEGIN
  IF OLD.status IS NOT DISTINCT FROM NEW.status THEN
    RETURN NEW;
  END IF;

  SELECT p.title, c.name, p.owner_id
  INTO project_title, company_name, owner_id
  FROM projects p
  JOIN companies c ON p.company_id = c.id
  WHERE p.id = NEW.project_id;

  PERFORM call_atc_webhook(jsonb_build_object(
    'event_type', 'quote_status_change',
    'entity_type', 'quote',
    'quote_id', NEW.id,
    'old_status', OLD.status,
    'new_status', NEW.status,
    'owner_id', owner_id,
    'quote', jsonb_build_object(
      'id', NEW.id,
      'quote_number', NEW.quote_number,
      'total_amount', NEW.total_amount,
      'valid_until', NEW.valid_until
    ),
    'project', jsonb_build_object(
      'id', NEW.project_id,
      'title', project_title
    ),
    'company', jsonb_build_object(
      'name', company_name
    ),
    'timestamp', NOW()
  ));

  RETURN NEW;
END;
$$;

-- 10. trigger_atc_new_company
--     SECURITY DEFINER trigger on companies INSERT.
CREATE OR REPLACE FUNCTION trigger_atc_new_company()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM call_atc_webhook(jsonb_build_object(
    'event_type', 'new_prospect',
    'entity_type', 'company',
    'company_id', NEW.id,
    'company_name', NEW.name,
    'source', COALESCE(NEW.source, 'manual'),
    'owner_id', NEW.owner_id,
    'company', jsonb_build_object(
      'id', NEW.id,
      'name', NEW.name,
      'website_url', NEW.website_url,
      'kvk_number', NEW.kvk_number
    ),
    'timestamp', NOW()
  ));

  RETURN NEW;
END;
$$;

-- 11. cleanup_old_atc_events
--     Deletes atc_processed_events older than 7 days (called by pg_cron).
CREATE OR REPLACE FUNCTION cleanup_old_atc_events()
RETURNS void
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  DELETE FROM atc_processed_events
  WHERE processed_at < NOW() - INTERVAL '7 days';
END;
$$;

-- 12. calculate_arr_from_mrr
--     BEFORE trigger on projects: sets arr = mrr * 12 on MRR changes.
CREATE OR REPLACE FUNCTION calculate_arr_from_mrr()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.mrr IS NOT NULL AND (OLD.mrr IS DISTINCT FROM NEW.mrr) THEN
    NEW.arr := NEW.mrr * 12;
  END IF;
  RETURN NEW;
END;
$$;

-- 13. update_company_mrr
--     AFTER trigger on projects: syncs company.total_mrr from project MRR sum.
CREATE OR REPLACE FUNCTION update_company_mrr()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  UPDATE companies
  SET total_mrr = (
    SELECT COALESCE(SUM(monthly_recurring_revenue), 0)
    FROM projects
    WHERE company_id = NEW.company_id
  )
  WHERE id = NEW.company_id;

  RETURN NEW;
END;
$$;


-- ============================================================
-- PART 3: FIX rls_policy_always_true ON notifications
--
-- The "system_insert_notifications" policy allows ANY authenticated
-- user to INSERT notifications for ANY recipient (WITH CHECK (true)).
-- This is a real vulnerability: anyone can spam other users.
--
-- Safe to remove because all legitimate inserts come from:
--   • notify_users()              — SECURITY DEFINER, bypasses RLS
--   • Database triggers           — SECURITY DEFINER, bypasses RLS
--   • n8n workflows               — service_role, bypasses RLS
--
-- The "view_own_notifications" and "update_own_notifications" SELECT/UPDATE
-- policies remain unchanged — users can still read and update their own.
--
-- Note on activities & audit_log: those WITH CHECK (true) policies are
-- used exclusively by SECURITY DEFINER trigger functions and are safe,
-- but left as-is here to avoid risk. They can be addressed separately
-- once the activities table schema is confirmed.
-- ============================================================

DROP POLICY IF EXISTS "system_insert_notifications" ON notifications;
DROP POLICY IF EXISTS "System can create notifications" ON notifications;
DROP POLICY IF EXISTS "System can insert notifications" ON notifications;


-- ============================================================
-- PART 4: MANUAL STEP — auth_leaked_password_protection
-- ============================================================
-- This setting cannot be changed via SQL migration.
-- Action required (one-time, ~30 seconds):
--
--   Supabase Dashboard
--   → Authentication
--   → Providers
--   → Email
--   → Toggle ON: "Prevent sign-ups with leaked passwords"
--
-- This checks new passwords against the HaveIBeenPwned.org database.
-- ============================================================


-- ============================================================
-- VERIFICATIE
-- Run in SQL Editor na toepassen:
--
-- 1. RLS ingeschakeld:
-- SELECT tablename, rowsecurity
-- FROM pg_tables
-- WHERE schemaname = 'public'
--   AND tablename IN ('chat_memory', 'atc_config');
-- → Verwacht: beide rowsecurity = true
--
-- 2. Functies hebben search_path:
-- SELECT proname
-- FROM pg_proc p
-- JOIN pg_namespace n ON p.pronamespace = n.oid
-- WHERE n.nspname = 'public'
--   AND proname IN (
--     'update_session_last_message', 'atc_is_event_processed',
--     'atc_mark_event_processed', 'atc_record_failure',
--     'atc_record_success', 'atc_get_metrics', 'call_atc_webhook',
--     'trigger_atc_project_stage_change', 'trigger_atc_quote_status_change',
--     'trigger_atc_new_company', 'cleanup_old_atc_events',
--     'calculate_arr_from_mrr', 'update_company_mrr'
--   )
--   AND NOT EXISTS (
--     SELECT 1 FROM unnest(proconfig) AS c WHERE c LIKE 'search_path%'
--   );
-- → Verwacht: 0 rijen
--
-- 3. Geen WITH CHECK (true) INSERT policy meer op notifications:
-- SELECT policyname, cmd, with_check
-- FROM pg_policies
-- WHERE schemaname = 'public' AND tablename = 'notifications'
--   AND cmd = 'INSERT';
-- → Verwacht: 0 rijen
-- ============================================================

SELECT 'Security warnings fixed! Handmatige stap nog nodig: Leaked Password Protection in Dashboard.' AS status;
