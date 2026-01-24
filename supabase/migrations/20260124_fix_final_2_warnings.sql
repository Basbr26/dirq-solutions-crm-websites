-- ============================================================
-- FIX FINAL 2 PERFORMANCE WARNINGS
-- ============================================================

-- =============================================
-- FIX 1: Users table - correct casting position
-- =============================================
DROP POLICY IF EXISTS "allow_own_update" ON users;
CREATE POLICY "allow_own_update" ON users
  FOR UPDATE
  TO authenticated
  USING (id = ((select auth.uid())::text));

-- =============================================
-- FIX 2: CRM Audit Log - consolidate 4 SELECT policies into 1
-- =============================================
-- Merge all role-based audit log access into one smart policy

DROP POLICY IF EXISTS "admin_read_audit_log" ON crm_audit_log;
DROP POLICY IF EXISTS "manager_read_audit_log" ON crm_audit_log;
DROP POLICY IF EXISTS "team_read_related_audit_log" ON crm_audit_log;
DROP POLICY IF EXISTS "read_own_audit_actions" ON crm_audit_log;
DROP POLICY IF EXISTS "audit_log_consolidated_read" ON crm_audit_log;

CREATE POLICY "audit_log_consolidated_read" ON crm_audit_log
  FOR SELECT
  TO authenticated
  USING (
    -- Super admins can see everything
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.role = 'super_admin'
    )
    OR
    -- Admins can see everything
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.role = 'ADMIN'
    )
    OR
    -- Team members can see core business table audits
    (
      table_name IN ('companies', 'contacts', 'leads', 'projects', 'quotes', 'interactions')
      AND EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = (select auth.uid())
        AND profiles.role = 'TEAM'
      )
    )
    OR
    -- Everyone can see their own actions
    user_id = (select auth.uid())
  );

COMMENT ON POLICY "audit_log_consolidated_read" ON crm_audit_log IS
'Consolidated audit log access: super_admin/ADMIN see all, TEAM sees core business tables, everyone sees own actions';

-- =============================================
-- VERIFICATION
-- =============================================

SELECT 'Final 2 performance warnings fixed!' as status;
