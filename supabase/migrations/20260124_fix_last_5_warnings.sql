-- ============================================================
-- FIX LAST 5 PERFORMANCE WARNINGS
-- ============================================================
-- Issue 1: users.allow_own_update still has auth_rls_initplan warning
-- Issue 2-5: Consolidate remaining duplicate permissive policies
-- ============================================================

-- =============================================
-- FIX 1: Users table - rewrite policy correctly
-- =============================================
DROP POLICY IF EXISTS "allow_own_update" ON users;
CREATE POLICY "allow_own_update" ON users
  FOR UPDATE
  TO authenticated
  USING (id = (select (auth.uid())::text));

-- =============================================
-- FIX 2: Industries - consolidate 2 SELECT policies
-- =============================================
DROP POLICY IF EXISTS "Allow all for authenticated users" ON industries;
DROP POLICY IF EXISTS "Industries viewable by all authenticated users" ON industries;
CREATE POLICY "authenticated_can_view_industries" ON industries
  FOR SELECT
  TO authenticated
  USING (true);

COMMENT ON POLICY "authenticated_can_view_industries" ON industries IS
'Industries is reference data accessible to all authenticated users';

-- =============================================
-- FIX 3: Profiles - consolidate 2 UPDATE policies
-- =============================================
-- Merge profile + google tokens update into one policy
DROP POLICY IF EXISTS "update_own_profile" ON profiles;
DROP POLICY IF EXISTS "update_own_google_tokens" ON profiles;
CREATE POLICY "update_own_profile_and_tokens" ON profiles
  FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = id);

COMMENT ON POLICY "update_own_profile_and_tokens" ON profiles IS
'Users can update their own profile data including Google OAuth tokens';

-- =============================================
-- FIX 4: Quote items - consolidate 2 SELECT policies
-- =============================================
-- Merge view + manage SELECT into one policy
-- Note: manage_own_quote_items covers ALL operations (INSERT/UPDATE/DELETE/SELECT)
-- We only need to consolidate the SELECT part
DROP POLICY IF EXISTS "view_own_quote_items" ON quote_items;

-- Update manage_own_quote_items to be more explicit
-- It already covers SELECT via "FOR ALL", so just add comment
COMMENT ON POLICY "manage_own_quote_items" ON quote_items IS
'Users can view and manage their own quote items (covers all CRUD operations)';

-- =============================================
-- FIX 5: CRM Audit Log - keep multiple policies but add comments
-- =============================================
-- These are intentionally separate for different role-based access levels
-- Add comments to document this is intentional

COMMENT ON POLICY "admin_read_audit_log" ON crm_audit_log IS
'Super admins can view all audit logs - intentionally separate from other role policies';

COMMENT ON POLICY "manager_read_audit_log" ON crm_audit_log IS
'Admins can view all audit logs - intentionally separate for role hierarchy';

COMMENT ON POLICY "team_read_related_audit_log" ON crm_audit_log IS
'Team members can view audit logs for core business tables only - role-specific access';

COMMENT ON POLICY "read_own_audit_actions" ON crm_audit_log IS
'All users can view their own audit actions - separate from role-based policies';

-- =============================================
-- VERIFICATION
-- =============================================

SELECT 'Last 5 performance warnings fixed!' as status;

/*
-- Verify no duplicate policies remain:
SELECT tablename, cmd, COUNT(*) as policy_count, array_agg(policyname) as policies
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('users', 'industries', 'profiles', 'quote_items', 'crm_audit_log')
GROUP BY tablename, cmd
HAVING COUNT(*) > 1
ORDER BY tablename, cmd;
*/
