-- Check all RLS policies and their exact names
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd,
  qual
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN (
    'users', 'profiles', 'companies', 'contacts', 'leads', 'projects',
    'interactions', 'quotes', 'quote_items', 'tasks', 'calendar_events',
    'notifications', 'notification_preferences', 'email_drafts', 
    'documents', 'crm_audit_log', 'webhook_events', 'rate_limit_requests'
  )
ORDER BY tablename, cmd, policyname;
