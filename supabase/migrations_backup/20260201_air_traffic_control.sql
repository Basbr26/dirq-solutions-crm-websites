-- ============================================================
-- AIR TRAFFIC CONTROL - Database Setup
-- Migration: 20260130_air_traffic_control.sql
-- Purpose: Orchestrator voor stage changes, notificaties en event processing
-- ============================================================

-- ============================================================
-- 1. IDEMPOTENCY TABLE - Voorkom duplicate event processing
-- ============================================================
CREATE TABLE IF NOT EXISTS atc_processed_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_hash TEXT UNIQUE NOT NULL,
  event_type TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  workflow_execution_id TEXT,
  processed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_atc_processed_events_hash
  ON atc_processed_events(event_hash);
CREATE INDEX IF NOT EXISTS idx_atc_processed_events_entity
  ON atc_processed_events(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_atc_processed_events_time
  ON atc_processed_events(processed_at DESC);

COMMENT ON TABLE atc_processed_events IS 'Tracks processed events for idempotency in Air Traffic Control';

-- ============================================================
-- 2. DEAD LETTER QUEUE - Failed events voor retry
-- ============================================================
CREATE TABLE IF NOT EXISTS atc_failed_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  payload JSONB NOT NULL,
  error_message TEXT,
  error_code TEXT,
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  next_retry_at TIMESTAMPTZ,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'retrying', 'failed', 'resolved')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_atc_failed_events_status
  ON atc_failed_events(status);
CREATE INDEX IF NOT EXISTS idx_atc_failed_events_retry
  ON atc_failed_events(next_retry_at)
  WHERE status IN ('pending', 'retrying');

COMMENT ON TABLE atc_failed_events IS 'Dead Letter Queue for failed ATC events';

-- ============================================================
-- 3. CIRCUIT BREAKER STATE - Service health tracking
-- ============================================================
CREATE TABLE IF NOT EXISTS atc_circuit_breaker (
  service_name TEXT PRIMARY KEY,
  state TEXT DEFAULT 'closed' CHECK (state IN ('closed', 'open', 'half-open')),
  failure_count INTEGER DEFAULT 0,
  success_count INTEGER DEFAULT 0,
  last_failure_at TIMESTAMPTZ,
  last_success_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  half_open_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Initialize circuit breakers for known services
INSERT INTO atc_circuit_breaker (service_name, state) VALUES
  ('n8n_webhook', 'closed'),
  ('ai_chat_handler', 'closed'),
  ('send_email', 'closed'),
  ('supabase_db', 'closed')
ON CONFLICT (service_name) DO NOTHING;

COMMENT ON TABLE atc_circuit_breaker IS 'Circuit breaker state for ATC service dependencies';

-- ============================================================
-- 4. POSTGRES TRIGGER - Notify n8n on stage changes
-- ============================================================
CREATE OR REPLACE FUNCTION atc_notify_stage_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company_name TEXT;
  v_owner_email TEXT;
  v_contact_name TEXT;
  v_event_hash TEXT;
BEGIN
  -- Only trigger on actual stage changes
  IF OLD.stage IS NOT DISTINCT FROM NEW.stage THEN
    RETURN NEW;
  END IF;

  -- Generate unique event hash for idempotency
  v_event_hash := encode(
    sha256(
      (NEW.id::TEXT || COALESCE(OLD.stage, 'null') || NEW.stage || NOW()::TEXT)::bytea
    ),
    'hex'
  );

  -- Get company name
  SELECT name INTO v_company_name
  FROM companies
  WHERE id = NEW.company_id;

  -- Get owner email
  SELECT email INTO v_owner_email
  FROM profiles
  WHERE id = NEW.owner_id;

  -- Get contact name if exists
  IF NEW.contact_id IS NOT NULL THEN
    SELECT CONCAT(first_name, ' ', last_name) INTO v_contact_name
    FROM contacts
    WHERE id = NEW.contact_id;
  END IF;

  -- Send notification to n8n via pg_notify
  PERFORM pg_notify(
    'atc_events',
    json_build_object(
      'event_type', 'stage_change',
      'event_hash', v_event_hash,
      'timestamp', NOW(),
      'project', json_build_object(
        'id', NEW.id,
        'title', NEW.title,
        'old_stage', COALESCE(OLD.stage, 'none'),
        'new_stage', NEW.stage,
        'value', COALESCE(NEW.value, 0),
        'mrr', COALESCE(NEW.mrr, 0),
        'probability', COALESCE(NEW.probability, 0),
        'expected_close_date', NEW.expected_close_date
      ),
      'company', json_build_object(
        'id', NEW.company_id,
        'name', v_company_name
      ),
      'owner', json_build_object(
        'id', NEW.owner_id,
        'email', v_owner_email
      ),
      'contact', json_build_object(
        'id', NEW.contact_id,
        'name', v_contact_name
      )
    )::text
  );

  RETURN NEW;
END;
$$;

-- Drop existing trigger if exists and create new one
DROP TRIGGER IF EXISTS atc_stage_trigger ON projects;
CREATE TRIGGER atc_stage_trigger
  AFTER UPDATE OF stage ON projects
  FOR EACH ROW
  EXECUTE FUNCTION atc_notify_stage_change();

COMMENT ON FUNCTION atc_notify_stage_change IS 'Notifies Air Traffic Control on project stage changes';

-- ============================================================
-- 5. HELPER FUNCTIONS
-- ============================================================

-- Function to check if event was already processed
CREATE OR REPLACE FUNCTION atc_is_event_processed(p_event_hash TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM atc_processed_events WHERE event_hash = p_event_hash
  );
END;
$$;

-- Function to mark event as processed
CREATE OR REPLACE FUNCTION atc_mark_event_processed(
  p_event_hash TEXT,
  p_event_type TEXT,
  p_entity_type TEXT,
  p_entity_id UUID,
  p_workflow_execution_id TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO atc_processed_events (event_hash, event_type, entity_type, entity_id, workflow_execution_id)
  VALUES (p_event_hash, p_event_type, p_entity_type, p_entity_id, p_workflow_execution_id)
  ON CONFLICT (event_hash) DO NOTHING
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

-- Function to record circuit breaker failure
CREATE OR REPLACE FUNCTION atc_record_failure(p_service_name TEXT)
RETURNS TEXT
LANGUAGE plpgsql
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

  -- Open circuit after 3 failures
  IF v_new_count >= 3 THEN
    UPDATE atc_circuit_breaker
    SET state = 'open', opened_at = NOW()
    WHERE service_name = p_service_name
    RETURNING state INTO v_new_state;
  ELSE
    SELECT state INTO v_new_state FROM atc_circuit_breaker WHERE service_name = p_service_name;
  END IF;

  RETURN v_new_state;
END;
$$;

-- Function to record circuit breaker success
CREATE OR REPLACE FUNCTION atc_record_success(p_service_name TEXT)
RETURNS TEXT
LANGUAGE plpgsql
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

-- Function to get ATC metrics
CREATE OR REPLACE FUNCTION atc_get_metrics()
RETURNS JSON
LANGUAGE plpgsql
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

-- ============================================================
-- 6. RLS POLICIES
-- ============================================================
ALTER TABLE atc_processed_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE atc_failed_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE atc_circuit_breaker ENABLE ROW LEVEL SECURITY;

-- Allow service role full access (for n8n)
CREATE POLICY "Service role full access on atc_processed_events"
  ON atc_processed_events FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access on atc_failed_events"
  ON atc_failed_events FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access on atc_circuit_breaker"
  ON atc_circuit_breaker FOR ALL
  USING (auth.role() = 'service_role');

-- Allow admins to view metrics
CREATE POLICY "Admins can view atc_processed_events"
  ON atc_processed_events FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ADMIN'
  ));

CREATE POLICY "Admins can view atc_failed_events"
  ON atc_failed_events FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ADMIN'
  ));

CREATE POLICY "Admins can view atc_circuit_breaker"
  ON atc_circuit_breaker FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ADMIN'
  ));

-- ============================================================
-- COMMENTS
-- ============================================================
COMMENT ON FUNCTION atc_is_event_processed IS 'Check if event hash was already processed (idempotency)';
COMMENT ON FUNCTION atc_mark_event_processed IS 'Mark event as processed with metadata';
COMMENT ON FUNCTION atc_record_failure IS 'Record service failure and potentially open circuit breaker';
COMMENT ON FUNCTION atc_record_success IS 'Record service success and reset circuit breaker';
COMMENT ON FUNCTION atc_get_metrics IS 'Get Air Traffic Control system metrics for monitoring';
