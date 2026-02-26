-- ============================================================
-- ATC WEBHOOK TRIGGERS
-- Database triggers that call n8n webhook directly via pg_net
-- No need for Postgres credentials in n8n!
-- ============================================================

-- Enable pg_net extension for HTTP calls from database
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- ============================================================
-- ATC WEBHOOK URL (configureerbaar)
-- ============================================================
-- Store webhook URL in a config table for easy updates
CREATE TABLE IF NOT EXISTS atc_config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO atc_config (key, value) VALUES
  ('webhook_url', 'https://dirqsolutions.app.n8n.cloud/webhook/atc/event'),
  ('webhook_enabled', 'true')
ON CONFLICT (key) DO NOTHING;

-- ============================================================
-- HELPER FUNCTION: Call ATC Webhook
-- ============================================================
CREATE OR REPLACE FUNCTION call_atc_webhook(payload JSONB)
RETURNS void AS $$
DECLARE
  webhook_url TEXT;
  is_enabled TEXT;
BEGIN
  -- Get config
  SELECT value INTO webhook_url FROM atc_config WHERE key = 'webhook_url';
  SELECT value INTO is_enabled FROM atc_config WHERE key = 'webhook_enabled';

  -- Only call if enabled
  IF is_enabled = 'true' AND webhook_url IS NOT NULL THEN
    PERFORM net.http_post(
      url := webhook_url,
      headers := '{"Content-Type": "application/json"}'::jsonb,
      body := payload
    );
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- TRIGGER: Project Stage Changes
-- ============================================================
CREATE OR REPLACE FUNCTION trigger_atc_project_stage_change()
RETURNS TRIGGER AS $$
DECLARE
  company_name TEXT;
  owner_email TEXT;
BEGIN
  -- Only fire if stage actually changed
  IF OLD.stage IS NOT DISTINCT FROM NEW.stage THEN
    RETURN NEW;
  END IF;

  -- Get related data
  SELECT name INTO company_name FROM companies WHERE id = NEW.company_id;
  SELECT email INTO owner_email FROM profiles WHERE id = NEW.owner_id;

  -- Call ATC webhook
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS atc_project_stage_change ON projects;
CREATE TRIGGER atc_project_stage_change
  AFTER UPDATE OF stage ON projects
  FOR EACH ROW
  EXECUTE FUNCTION trigger_atc_project_stage_change();

-- ============================================================
-- TRIGGER: New Company (Prospect)
-- ============================================================
CREATE OR REPLACE FUNCTION trigger_atc_new_company()
RETURNS TRIGGER AS $$
BEGIN
  -- Call ATC webhook for new companies
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS atc_new_company ON companies;
CREATE TRIGGER atc_new_company
  AFTER INSERT ON companies
  FOR EACH ROW
  EXECUTE FUNCTION trigger_atc_new_company();

-- ============================================================
-- TRIGGER: Quote Status Changes
-- ============================================================
CREATE OR REPLACE FUNCTION trigger_atc_quote_status_change()
RETURNS TRIGGER AS $$
DECLARE
  project_title TEXT;
  company_name TEXT;
  owner_id UUID;
BEGIN
  -- Only fire if status actually changed
  IF OLD.status IS NOT DISTINCT FROM NEW.status THEN
    RETURN NEW;
  END IF;

  -- Get related data
  SELECT p.title, c.name, p.owner_id
  INTO project_title, company_name, owner_id
  FROM projects p
  JOIN companies c ON p.company_id = c.id
  WHERE p.id = NEW.project_id;

  -- Call ATC webhook
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS atc_quote_status_change ON quotes;
CREATE TRIGGER atc_quote_status_change
  AFTER UPDATE OF status ON quotes
  FOR EACH ROW
  EXECUTE FUNCTION trigger_atc_quote_status_change();

-- ============================================================
-- ATC SUPPORTING TABLES (for idempotency & error handling)
-- ============================================================

-- Processed events (idempotency)
CREATE TABLE IF NOT EXISTS atc_processed_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_hash TEXT UNIQUE NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  processed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_atc_processed_hash ON atc_processed_events(event_hash);
CREATE INDEX IF NOT EXISTS idx_atc_processed_entity ON atc_processed_events(entity_type, entity_id);

-- Auto-cleanup old processed events (keep 7 days)
CREATE OR REPLACE FUNCTION cleanup_old_atc_events()
RETURNS void AS $$
BEGIN
  DELETE FROM atc_processed_events
  WHERE processed_at < NOW() - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql;

-- Failed events (Dead Letter Queue)
CREATE TABLE IF NOT EXISTS atc_failed_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  next_retry_at TIMESTAMPTZ,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'retrying', 'completed', 'failed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_atc_failed_status ON atc_failed_events(status, next_retry_at);

-- Circuit breaker state
CREATE TABLE IF NOT EXISTS atc_circuit_breaker (
  service_name TEXT PRIMARY KEY,
  state TEXT DEFAULT 'closed' CHECK (state IN ('closed', 'open', 'half-open')),
  failure_count INTEGER DEFAULT 0,
  last_failure_at TIMESTAMPTZ,
  last_success_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Initialize circuit breaker for main services
INSERT INTO atc_circuit_breaker (service_name, state) VALUES
  ('n8n_webhook', 'closed'),
  ('gemini_ai', 'closed'),
  ('resend_email', 'closed')
ON CONFLICT (service_name) DO NOTHING;

-- ============================================================
-- GRANT PERMISSIONS
-- ============================================================
GRANT USAGE ON SCHEMA extensions TO postgres, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION call_atc_webhook(JSONB) TO postgres, service_role;

COMMENT ON TABLE atc_config IS 'Configuration for ATC webhook system';
COMMENT ON TABLE atc_processed_events IS 'Idempotency tracking for ATC events';
COMMENT ON TABLE atc_failed_events IS 'Dead Letter Queue for failed ATC events';
COMMENT ON TABLE atc_circuit_breaker IS 'Circuit breaker state for external services';
