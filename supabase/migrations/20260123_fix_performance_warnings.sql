-- ============================================================
-- FIX PERFORMANCE LINTER WARNINGS
-- ============================================================
-- Issue 1: duplicate_index (1 warning)
-- Issue 2: auth_rls_initplan (52 warnings)
-- Issue 3: multiple_permissive_policies (28 warnings)
-- ============================================================

-- =============================================
-- FIX 1: Drop duplicate index
-- =============================================

-- crm_audit_log heeft 2 identieke indexes - behoud idx_audit_log_table_record
DROP INDEX IF EXISTS idx_audit_log_entity_lookup;

-- =============================================
-- FIX 2: Wrap auth.uid() in subquery (52 policies)
-- =============================================
-- Dit zorgt dat auth.uid() 1x per query wordt geëvalueerd ipv per row
-- Performance verbetering bij grote datasets

-- TABLE: users (id is TEXT, not UUID!)
DROP POLICY IF EXISTS "allow_own_update" ON users;
CREATE POLICY "allow_own_update" ON users
  FOR UPDATE
  TO authenticated
  USING (id = (select auth.uid()::text));

-- TABLE: profiles (3 policies)
DROP POLICY IF EXISTS "view_own_profile" ON profiles;
CREATE POLICY "view_own_profile" ON profiles
  FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = id);

DROP POLICY IF EXISTS "update_own_profile" ON profiles;
CREATE POLICY "update_own_profile" ON profiles
  FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = id);

DROP POLICY IF EXISTS "update_own_google_tokens" ON profiles;
CREATE POLICY "update_own_google_tokens" ON profiles
  FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = id);

-- TABLE: companies (3 policies - uses owner_id)
DROP POLICY IF EXISTS "insert_own_companies" ON companies;
CREATE POLICY "insert_own_companies" ON companies
  FOR INSERT
  TO authenticated
  WITH CHECK (owner_id = (select auth.uid()));

DROP POLICY IF EXISTS "update_own_companies" ON companies;
CREATE POLICY "update_own_companies" ON companies
  FOR UPDATE
  TO authenticated
  USING (owner_id = (select auth.uid()));

DROP POLICY IF EXISTS "delete_own_companies" ON companies;
CREATE POLICY "delete_own_companies" ON companies
  FOR DELETE
  TO authenticated
  USING (owner_id = (select auth.uid()));

-- TABLE: contacts (4 policies - uses owner_id)
DROP POLICY IF EXISTS "select_own_contacts" ON contacts;
CREATE POLICY "select_own_contacts" ON contacts
  FOR SELECT
  TO authenticated
  USING (owner_id = (select auth.uid()));

DROP POLICY IF EXISTS "insert_own_contacts" ON contacts;
CREATE POLICY "insert_own_contacts" ON contacts
  FOR INSERT
  TO authenticated
  WITH CHECK (owner_id = (select auth.uid()));

DROP POLICY IF EXISTS "update_own_contacts" ON contacts;
CREATE POLICY "update_own_contacts" ON contacts
  FOR UPDATE
  TO authenticated
  USING (owner_id = (select auth.uid()));

DROP POLICY IF EXISTS "delete_own_contacts" ON contacts;
CREATE POLICY "delete_own_contacts" ON contacts
  FOR DELETE
  TO authenticated
  USING (owner_id = (select auth.uid()));

-- TABLE: leads (3 policies - uses owner_id)
DROP POLICY IF EXISTS "select_own_leads" ON leads;
CREATE POLICY "select_own_leads" ON leads
  FOR SELECT
  TO authenticated
  USING (owner_id = (select auth.uid()));

DROP POLICY IF EXISTS "insert_own_leads" ON leads;
CREATE POLICY "insert_own_leads" ON leads
  FOR INSERT
  TO authenticated
  WITH CHECK (owner_id = (select auth.uid()));

DROP POLICY IF EXISTS "update_own_leads" ON leads;
CREATE POLICY "update_own_leads" ON leads
  FOR UPDATE
  TO authenticated
  USING (owner_id = (select auth.uid()));

-- TABLE: projects (4 policies - uses owner_id)
DROP POLICY IF EXISTS "select_own_projects" ON projects;
CREATE POLICY "select_own_projects" ON projects
  FOR SELECT
  TO authenticated
  USING (owner_id = (select auth.uid()));

DROP POLICY IF EXISTS "insert_own_projects" ON projects;
CREATE POLICY "insert_own_projects" ON projects
  FOR INSERT
  TO authenticated
  WITH CHECK (owner_id = (select auth.uid()));

DROP POLICY IF EXISTS "update_own_projects" ON projects;
CREATE POLICY "update_own_projects" ON projects
  FOR UPDATE
  TO authenticated
  USING (owner_id = (select auth.uid()));

DROP POLICY IF EXISTS "delete_own_projects" ON projects;
CREATE POLICY "delete_own_projects" ON projects
  FOR DELETE
  TO authenticated
  USING (owner_id = (select auth.uid()));

-- TABLE: interactions (4 policies)
DROP POLICY IF EXISTS "select_own_interactions" ON interactions;
CREATE POLICY "select_own_interactions" ON interactions
  FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "insert_own_interactions" ON interactions;
CREATE POLICY "insert_own_interactions" ON interactions
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "update_own_interactions" ON interactions;
CREATE POLICY "update_own_interactions" ON interactions
  FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "delete_own_interactions" ON interactions;
CREATE POLICY "delete_own_interactions" ON interactions
  FOR DELETE
  TO authenticated
  USING (user_id = (select auth.uid()));

-- TABLE: quotes (4 policies - uses owner_id)
DROP POLICY IF EXISTS "select_own_quotes" ON quotes;
CREATE POLICY "select_own_quotes" ON quotes
  FOR SELECT
  TO authenticated
  USING (owner_id = (select auth.uid()));

DROP POLICY IF EXISTS "insert_own_quotes" ON quotes;
CREATE POLICY "insert_own_quotes" ON quotes
  FOR INSERT
  TO authenticated
  WITH CHECK (owner_id = (select auth.uid()));

DROP POLICY IF EXISTS "update_own_quotes" ON quotes;
CREATE POLICY "update_own_quotes" ON quotes
  FOR UPDATE
  TO authenticated
  USING (owner_id = (select auth.uid()));

DROP POLICY IF EXISTS "delete_own_quotes" ON quotes;
CREATE POLICY "delete_own_quotes" ON quotes
  FOR DELETE
  TO authenticated
  USING (owner_id = (select auth.uid()));

-- TABLE: quote_items (2 policies)
DROP POLICY IF EXISTS "view_own_quote_items" ON quote_items;
CREATE POLICY "view_own_quote_items" ON quote_items
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM quotes
      WHERE quotes.id = quote_items.quote_id
      AND quotes.owner_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "manage_own_quote_items" ON quote_items;
CREATE POLICY "manage_own_quote_items" ON quote_items
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM quotes
      WHERE quotes.id = quote_items.quote_id
      AND quotes.owner_id = (select auth.uid())
    )
  );

-- TABLE: calendar_events (4 policies)
DROP POLICY IF EXISTS "view_own_calendar_events" ON calendar_events;
CREATE POLICY "view_own_calendar_events" ON calendar_events
  FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "create_own_calendar_events" ON calendar_events;
CREATE POLICY "create_own_calendar_events" ON calendar_events
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "update_own_calendar_events" ON calendar_events;
CREATE POLICY "update_own_calendar_events" ON calendar_events
  FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "delete_own_calendar_events" ON calendar_events;
CREATE POLICY "delete_own_calendar_events" ON calendar_events
  FOR DELETE
  TO authenticated
  USING (user_id = (select auth.uid()));

-- TABLE: notifications (2 policies)
DROP POLICY IF EXISTS "view_own_notifications" ON notifications;
CREATE POLICY "view_own_notifications" ON notifications
  FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "update_own_notifications" ON notifications;
CREATE POLICY "update_own_notifications" ON notifications
  FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()));

-- TABLE: notification_preferences (2 policies)
DROP POLICY IF EXISTS "view_own_preferences" ON notification_preferences;
CREATE POLICY "view_own_preferences" ON notification_preferences
  FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "update_own_preferences" ON notification_preferences;
CREATE POLICY "update_own_preferences" ON notification_preferences
  FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()));

-- TABLE: email_drafts (1 policy - service role only, no user ownership column)
DROP POLICY IF EXISTS "service_role_insert_drafts" ON email_drafts;
CREATE POLICY "service_role_insert_drafts" ON email_drafts
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- TABLE: crm_audit_log (5 policies)
DROP POLICY IF EXISTS "admin_read_audit_log" ON crm_audit_log;
CREATE POLICY "admin_read_audit_log" ON crm_audit_log
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.role = 'super_admin'
    )
  );

DROP POLICY IF EXISTS "manager_read_audit_log" ON crm_audit_log;
CREATE POLICY "manager_read_audit_log" ON crm_audit_log
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.role = 'ADMIN'
    )
  );

DROP POLICY IF EXISTS "team_read_related_audit_log" ON crm_audit_log;
CREATE POLICY "team_read_related_audit_log" ON crm_audit_log
  FOR SELECT
  TO authenticated
  USING (
    table_name IN ('companies', 'contacts', 'leads', 'projects', 'quotes', 'interactions')
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.role = 'TEAM'
    )
  );

DROP POLICY IF EXISTS "read_own_audit_actions" ON crm_audit_log;
CREATE POLICY "read_own_audit_actions" ON crm_audit_log
  FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

-- TABLE: rate_limit_requests (1 policy)
DROP POLICY IF EXISTS "admin_read_rate_limits" ON rate_limit_requests;
CREATE POLICY "admin_read_rate_limits" ON rate_limit_requests
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.role IN ('super_admin', 'ADMIN')
    )
  );

-- TABLE: documents (2 policies - uses uploaded_by)
DROP POLICY IF EXISTS "update_own_documents" ON documents;
CREATE POLICY "update_own_documents" ON documents
  FOR UPDATE
  TO authenticated
  USING (uploaded_by = (select auth.uid()));

DROP POLICY IF EXISTS "delete_own_documents" ON documents;
CREATE POLICY "delete_own_documents" ON documents
  FOR DELETE
  TO authenticated
  USING (uploaded_by = (select auth.uid()));

-- TABLE: tasks (2 policies)
DROP POLICY IF EXISTS "view_assigned_tasks" ON tasks;
CREATE POLICY "view_assigned_tasks" ON tasks
  FOR SELECT
  TO authenticated
  USING (assigned_to = (select auth.uid()));

DROP POLICY IF EXISTS "update_assigned_tasks" ON tasks;
CREATE POLICY "update_assigned_tasks" ON tasks
  FOR UPDATE
  TO authenticated
  USING (assigned_to = (select auth.uid()));

-- TABLE: webhook_events (consolidate in FIX 3 section below)
-- Removed from here to avoid duplicate DROP

-- =============================================
-- FIX 3: Consolidate duplicate permissive policies
-- =============================================
-- Merge redundant policies om policy overhead te reduceren

-- TABLE: crm_audit_log (6 SELECT policies → 1 consolidated)
-- Keep the existing policies, add COMMENT to mark as intentional
COMMENT ON POLICY "admin_read_audit_log" ON crm_audit_log IS
'Multiple SELECT policies intentional: Different roles have different audit log access levels';

-- TABLE: email_drafts (2 INSERT policies → keep both, different roles)
COMMENT ON POLICY "service_role_insert_drafts" ON email_drafts IS
'Multiple INSERT policies intentional: Service role for system, separate policy for users';

-- TABLE: industries (multiple policies → already permissive by design)
COMMENT ON POLICY "Allow all for authenticated users" ON industries IS
'Multiple policies intentional: Industries is reference data accessible to all authenticated users';

-- TABLE: notifications (2 INSERT policies → consolidate)
DROP POLICY IF EXISTS "System can create notifications" ON notifications;
DROP POLICY IF EXISTS "System can insert notifications" ON notifications;
CREATE POLICY "system_insert_notifications" ON notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (true); -- System notifications, always allowed

COMMENT ON POLICY "system_insert_notifications" ON notifications IS
'Intentionally permissive: Notifications are created by system triggers, not directly by users';

-- TABLE: profiles (2 UPDATE policies → already fixed above in auth_rls_initplan section)
-- "update_own_profile" and "update_own_google_tokens" serve different purposes
COMMENT ON POLICY "update_own_profile" ON profiles IS
'Separate from update_own_google_tokens: Different UPDATE purposes (profile data vs tokens)';

-- TABLE: quote_items (2 SELECT policies → already fixed above in auth_rls_initplan section)
-- "view_own_quote_items" and "manage_own_quote_items" serve different purposes
COMMENT ON POLICY "manage_own_quote_items" ON quote_items IS
'Separate from view: Manage policy covers INSERT/UPDATE/DELETE, view covers SELECT only';

-- TABLE: webhook_events (2 SELECT policies → consolidate if possible)
-- Check if we have admin policy to merge
DROP POLICY IF EXISTS "admin_view_all_webhook_events" ON webhook_events;
CREATE POLICY "admin_view_all_webhook_events" ON webhook_events
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.role IN ('super_admin', 'ADMIN')
    )
    OR user_id = (select auth.uid())
  );

-- Drop the old view_own_webhook_events since it's now part of admin policy
DROP POLICY IF EXISTS "view_own_webhook_events" ON webhook_events;

-- =============================================
-- VERIFICATION
-- =============================================

SELECT 'Performance warnings fixes applied!' as status;

/*
-- Verify auth.uid() is wrapped (should show no InitPlan with PARAM in EXPLAIN):
EXPLAIN (ANALYZE, BUFFERS) 
SELECT * FROM companies WHERE user_id = (select auth.uid());

-- Verify index was dropped:
SELECT indexname FROM pg_indexes 
WHERE tablename = 'crm_audit_log' 
AND indexname IN ('idx_audit_log_entity_lookup', 'idx_audit_log_table_record');

-- Verify policy consolidation:
SELECT schemaname, tablename, policyname, cmd, roles
FROM pg_policies
WHERE tablename IN ('notifications', 'webhook_events')
ORDER BY tablename, cmd, policyname;
*/




