-- ============================================================
-- FIX SECURITY LINTER ISSUES
-- ============================================================
-- Issue 1-3: SECURITY DEFINER views → vervang met SECURITY INVOKER
-- Issue 4: RLS disabled on public.tasks table
-- ============================================================

-- =============================================
-- FIX 1: rate_limit_stats view
-- =============================================
-- Drop en recreate zonder SECURITY DEFINER
DROP VIEW IF EXISTS rate_limit_stats CASCADE;

CREATE VIEW rate_limit_stats 
WITH (security_invoker = true) AS
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
'Hourly rate limit statistics for last 24 hours. Shows request counts per client and endpoint. (SECURITY INVOKER)';

-- Grant permissions
GRANT SELECT ON rate_limit_stats TO authenticated;

-- =============================================
-- FIX 2: profiles_with_decrypted_tokens view
-- =============================================
-- Deze view moet SECURITY DEFINER blijven omdat het decryptie functies gebruikt
-- Maar we maken het veiliger door alleen eigen data te tonen via WHERE clause
DROP VIEW IF EXISTS profiles_with_decrypted_tokens CASCADE;

CREATE VIEW profiles_with_decrypted_tokens 
WITH (security_invoker = true, security_barrier = true) AS
SELECT 
  id,
  email,
  voornaam,
  achternaam,
  role,
  department_id,
  google_calendar_sync,
  google_token_expires_at,
  last_calendar_sync,
  -- Decrypted tokens (only accessible by the user themselves)
  decrypt_google_access_token(google_access_token_encrypted) as google_access_token,
  decrypt_google_refresh_token(google_refresh_token_encrypted) as google_refresh_token,
  created_at,
  updated_at
FROM profiles
WHERE id = auth.uid(); -- Alleen eigen profiel!

COMMENT ON VIEW profiles_with_decrypted_tokens IS 
'View with decrypted OAuth tokens. Uses SECURITY INVOKER and filters to current user only.';

-- Grant permissions
GRANT SELECT ON profiles_with_decrypted_tokens TO authenticated;

-- =============================================
-- FIX 3: v_weekly_outreach_stats view
-- =============================================
DROP VIEW IF EXISTS v_weekly_outreach_stats CASCADE;

CREATE VIEW v_weekly_outreach_stats 
WITH (security_invoker = true) AS
SELECT 
  date_trunc('week', created_at) as week_start,
  type,
  COUNT(*) as count,
  user_id
FROM interactions
WHERE type IN ('physical_mail', 'linkedin_video_audit', 'call')
  AND created_at >= date_trunc('week', CURRENT_DATE) - INTERVAL '12 weeks'
GROUP BY date_trunc('week', created_at), type, user_id
ORDER BY week_start DESC, type;

COMMENT ON VIEW v_weekly_outreach_stats IS 
'Weekly outreach statistics for tracking finance professional targeting goals. (SECURITY INVOKER)';

-- Grant permissions
GRANT SELECT ON v_weekly_outreach_stats TO authenticated;

-- =============================================
-- FIX 4: Enable RLS on tasks table (if exists)
-- =============================================
-- Check if tasks table exists and enable RLS
DO $$
BEGIN
  IF EXISTS (
    SELECT FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'tasks'
  ) THEN
    -- Enable RLS
    ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
    
    -- Policy: Users can view their own tasks or tasks they created
    CREATE POLICY "Users can view own tasks" ON tasks
      FOR SELECT USING (
        assigned_to = auth.uid() OR
        created_by = auth.uid() OR
        public.user_role() IN ('super_admin', 'ADMIN', 'MANAGER')
      );
    
    -- Policy: Users can create tasks
    CREATE POLICY "Users can create tasks" ON tasks
      FOR INSERT WITH CHECK (
        public.user_role() IN ('super_admin', 'ADMIN', 'SALES', 'MANAGER')
      );
    
    -- Policy: Users can update own tasks
    CREATE POLICY "Users can update own tasks" ON tasks
      FOR UPDATE USING (
        assigned_to = auth.uid() OR
        created_by = auth.uid() OR
        public.user_role() IN ('super_admin', 'ADMIN', 'MANAGER')
      );
    
    -- Policy: Admin/Manager can delete tasks
    CREATE POLICY "Admins can delete tasks" ON tasks
      FOR DELETE USING (
        public.user_role() IN ('super_admin', 'ADMIN', 'MANAGER')
      );
    
    RAISE NOTICE 'RLS enabled on tasks table with policies';
  ELSE
    RAISE NOTICE 'Tasks table does not exist, skipping RLS setup';
  END IF;
END $$;

-- =============================================
-- Verification Query
-- =============================================
-- Run this to verify all fixes are applied:
/*
SELECT 
  'View' as object_type,
  viewname as name,
  CASE 
    WHEN definition LIKE '%security_invoker%' THEN '✅ SECURITY INVOKER'
    ELSE '⚠️ Check manually'
  END as status
FROM pg_views
WHERE schemaname = 'public' 
  AND viewname IN ('rate_limit_stats', 'profiles_with_decrypted_tokens', 'v_weekly_outreach_stats')
  
UNION ALL

SELECT 
  'Table' as object_type,
  tablename as name,
  CASE 
    WHEN rowsecurity = true THEN '✅ RLS Enabled'
    ELSE '❌ RLS Disabled'
  END as status
FROM pg_tables
WHERE schemaname = 'public' 
  AND tablename = 'tasks';
*/
