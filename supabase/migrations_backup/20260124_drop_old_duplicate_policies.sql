-- ============================================================
-- DROP OLD DUPLICATE RLS POLICIES
-- ============================================================
-- The previous migration created new optimized policies but didn't
-- drop the old unoptimized ones. This causes double evaluation.
-- This migration removes all old duplicate policies.
-- ============================================================

-- TABLE: calendar_events
DROP POLICY IF EXISTS "Users can create calendar events" ON calendar_events;

-- TABLE: companies
DROP POLICY IF EXISTS "Companies delete policy" ON companies;
DROP POLICY IF EXISTS "Companies insert policy" ON companies;
DROP POLICY IF EXISTS "Companies select policy" ON companies;

-- TABLE: contacts  
DROP POLICY IF EXISTS "Contacts insert policy" ON contacts;

-- TABLE: crm_audit_log
DROP POLICY IF EXISTS "audit_log_admin_full_access" ON crm_audit_log;
DROP POLICY IF EXISTS "audit_log_manager_select" ON crm_audit_log;
DROP POLICY IF EXISTS "audit_log_manager_team_view" ON crm_audit_log;
DROP POLICY IF EXISTS "audit_log_own_actions" ON crm_audit_log;
DROP POLICY IF EXISTS "audit_log_team_read_access" ON crm_audit_log;

-- TABLE: documents
DROP POLICY IF EXISTS "Users can delete documents" ON documents;
DROP POLICY IF EXISTS "Authenticated users can create documents" ON documents;
DROP POLICY IF EXISTS "Authenticated users can view documents" ON documents;
DROP POLICY IF EXISTS "Users can update own documents" ON documents;

-- TABLE: email_drafts
DROP POLICY IF EXISTS "Service role can insert email drafts" ON email_drafts;
DROP POLICY IF EXISTS "Users can insert email drafts" ON email_drafts;
DROP POLICY IF EXISTS "Users can view email drafts" ON email_drafts;
DROP POLICY IF EXISTS "Users can update email drafts" ON email_drafts;

-- TABLE: interactions
DROP POLICY IF EXISTS "Interactions insert policy" ON interactions;

-- TABLE: notification_preferences
DROP POLICY IF EXISTS "Users can view own preferences" ON notification_preferences;
DROP POLICY IF EXISTS "Users can update own preferences" ON notification_preferences;

-- TABLE: notifications
DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;

-- TABLE: profiles
DROP POLICY IF EXISTS "Service role can insert profiles" ON profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own Google tokens" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

-- TABLE: projects
DROP POLICY IF EXISTS "Projects delete policy" ON projects;
DROP POLICY IF EXISTS "Projects insert policy" ON projects;
DROP POLICY IF EXISTS "Projects select policy" ON projects;
DROP POLICY IF EXISTS "Projects update policy" ON projects;

-- TABLE: quote_items
DROP POLICY IF EXISTS "Users can manage line items" ON quote_items;
DROP POLICY IF EXISTS "Users can view line items" ON quote_items;

-- TABLE: quotes
DROP POLICY IF EXISTS "Quotes insert policy" ON quotes;

-- TABLE: rate_limit_requests
DROP POLICY IF EXISTS "rate_limit_system_insert" ON rate_limit_requests;
DROP POLICY IF EXISTS "rate_limit_admin_read" ON rate_limit_requests;

-- TABLE: tasks
DROP POLICY IF EXISTS "Admins can delete tasks" ON tasks;
DROP POLICY IF EXISTS "Users can create tasks" ON tasks;
DROP POLICY IF EXISTS "Users can view assigned tasks" ON tasks;
DROP POLICY IF EXISTS "Users can update assigned tasks" ON tasks;

-- TABLE: webhook_events
DROP POLICY IF EXISTS "Service role can insert webhook events" ON webhook_events;
DROP POLICY IF EXISTS "Users can view their webhook events" ON webhook_events;

-- =============================================
-- VERIFICATION
-- =============================================

SELECT 'Old duplicate policies dropped!' as status;

/*
-- Verify no duplicate policies remain:
SELECT tablename, cmd, COUNT(*) as policy_count
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN (
    'companies', 'contacts', 'leads', 'projects', 'interactions',
    'quotes', 'quote_items', 'tasks', 'calendar_events', 'notifications',
    'notification_preferences', 'email_drafts', 'documents', 
    'crm_audit_log', 'webhook_events', 'rate_limit_requests'
  )
GROUP BY tablename, cmd
HAVING COUNT(*) > 1
ORDER BY tablename, cmd;
*/
