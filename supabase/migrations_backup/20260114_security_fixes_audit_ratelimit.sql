-- =============================================
-- SECURITY FIXES - AUDIT LOG ACCESS & RATE LIMITING
-- Created: 2026-01-14
-- Purpose: Expand audit log access + Add rate limiting infrastructure
-- =============================================

-- =============================================
-- STAP 1: Expand Audit Log Access
-- =============================================
-- Probleem: SUPPORT en SALES users kunnen audit logs niet zien
-- Oplossing: Expand toegang naar alle team members (behalve klanten)

-- Drop oude restrictieve policies
DROP POLICY IF EXISTS "audit_log_user_own_actions" ON crm_audit_log;

-- Nieuwe policy: All team members kunnen audit logs lezen
CREATE POLICY "audit_log_team_read_access"
  ON crm_audit_log
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('super_admin', 'ADMIN', 'MANAGER', 'SALES', 'SUPPORT')
    )
  );

-- Audit logs zijn immutable: geen UPDATE of DELETE policies
-- (Als er geen policy is, wordt de actie denied)

COMMENT ON POLICY "audit_log_team_read_access" ON crm_audit_log IS
'All team members can read audit logs for compliance and debugging. Audit logs are immutable - no update/delete allowed.';

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at_desc 
ON crm_audit_log(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_log_entity_lookup 
ON crm_audit_log(table_name, record_id);

CREATE INDEX IF NOT EXISTS idx_audit_log_user_action 
ON crm_audit_log(user_id, action);

COMMENT ON INDEX idx_audit_log_created_at_desc IS 
'Fast chronological audit log queries';

COMMENT ON INDEX idx_audit_log_entity_lookup IS 
'Fast entity-specific audit history lookups';

-- =============================================
-- STAP 2: Rate Limiting Infrastructure
-- =============================================

-- Table voor tracking API requests
CREATE TABLE IF NOT EXISTS rate_limit_requests (
  id BIGSERIAL PRIMARY KEY,
  client_id TEXT NOT NULL,
  endpoint TEXT,
  timestamp INTEGER NOT NULL,
  ip_address INET,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes voor snelle lookups
CREATE INDEX IF NOT EXISTS idx_rate_limit_client_timestamp 
ON rate_limit_requests(client_id, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_rate_limit_endpoint 
ON rate_limit_requests(endpoint, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_rate_limit_user 
ON rate_limit_requests(user_id, timestamp DESC) 
WHERE user_id IS NOT NULL;

COMMENT ON TABLE rate_limit_requests IS
'Tracks API requests for rate limiting. Records: client IP, endpoint, user, timestamp.
Cleanup: Auto-delete entries older than 1 hour.';

-- Cleanup function: Verwijder oude rate limit entries
CREATE OR REPLACE FUNCTION cleanup_rate_limit_requests()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Verwijder entries ouder dan 1 uur
  DELETE FROM rate_limit_requests
  WHERE timestamp < EXTRACT(EPOCH FROM NOW())::INTEGER - 3600;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RETURN deleted_count;
END;
$$;

COMMENT ON FUNCTION cleanup_rate_limit_requests() IS
'Cleans up rate limit request entries older than 1 hour. Returns count of deleted rows.
Run periodically (e.g., via cron job or pg_cron extension).';

-- Helper function: Check rate limit for client
CREATE OR REPLACE FUNCTION check_rate_limit(
  p_client_id TEXT,
  p_endpoint TEXT DEFAULT NULL,
  p_window_seconds INTEGER DEFAULT 60,
  p_max_requests INTEGER DEFAULT 100
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  request_count INTEGER;
  window_start INTEGER;
  is_limited BOOLEAN;
  remaining INTEGER;
BEGIN
  window_start := EXTRACT(EPOCH FROM NOW())::INTEGER - p_window_seconds;
  
  -- Count recent requests
  SELECT COUNT(*)
  INTO request_count
  FROM rate_limit_requests
  WHERE client_id = p_client_id
    AND timestamp >= window_start
    AND (p_endpoint IS NULL OR endpoint = p_endpoint);
  
  is_limited := request_count >= p_max_requests;
  remaining := GREATEST(0, p_max_requests - request_count - 1);
  
  RETURN jsonb_build_object(
    'limited', is_limited,
    'current_requests', request_count,
    'max_requests', p_max_requests,
    'remaining', remaining,
    'window_seconds', p_window_seconds,
    'retry_after', CASE WHEN is_limited THEN p_window_seconds ELSE 0 END
  );
END;
$$;

COMMENT ON FUNCTION check_rate_limit(TEXT, TEXT, INTEGER, INTEGER) IS
'Checks if client has exceeded rate limit. Returns JSON with:
- limited (boolean): Whether rate limit is exceeded
- current_requests (int): Request count in window
- remaining (int): Requests left before limit
- retry_after (int): Seconds to wait if limited
Default: 100 requests per 60 seconds.';

-- =============================================
-- STAP 3: Rate Limit Statistics View
-- =============================================

CREATE OR REPLACE VIEW rate_limit_stats AS
SELECT
  DATE_TRUNC('hour', TO_TIMESTAMP(timestamp)) AS hour,
  client_id,
  endpoint,
  COUNT(*) AS request_count,
  COUNT(DISTINCT user_id) AS unique_users,
  MIN(TO_TIMESTAMP(timestamp)) AS first_request,
  MAX(TO_TIMESTAMP(timestamp)) AS last_request
FROM rate_limit_requests
WHERE timestamp >= EXTRACT(EPOCH FROM NOW() - INTERVAL '24 hours')::INTEGER
GROUP BY 1, 2, 3
ORDER BY hour DESC, request_count DESC;

COMMENT ON VIEW rate_limit_stats IS
'Hourly rate limit statistics for last 24 hours. Shows request counts per client and endpoint.';

-- =============================================
-- STAP 4: Enable RLS on Rate Limit Table
-- =============================================

ALTER TABLE rate_limit_requests ENABLE ROW LEVEL SECURITY;

-- Policy: Only admins can view rate limit data
CREATE POLICY "rate_limit_admin_read"
  ON rate_limit_requests
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('super_admin', 'ADMIN')
    )
  );

-- Policy: System can insert (via edge functions)
CREATE POLICY "rate_limit_system_insert"
  ON rate_limit_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

COMMENT ON POLICY "rate_limit_admin_read" ON rate_limit_requests IS
'Only admins can view rate limit data for security monitoring.';

-- =============================================
-- VERIFICATIE QUERIES
-- =============================================

-- Check audit log policies
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE tablename = 'crm_audit_log'
ORDER BY policyname;

-- Check rate limit table setup
SELECT
  'rate_limit_requests' AS table_name,
  COUNT(*) AS current_rows,
  pg_size_pretty(pg_total_relation_size('rate_limit_requests')) AS table_size
FROM rate_limit_requests;

-- Test rate limit check function
SELECT check_rate_limit('test_client_123', '/api/test', 60, 100);
