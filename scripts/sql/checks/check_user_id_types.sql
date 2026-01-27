-- Check data types of user_id and related columns across all tables
SELECT 
  c.table_name,
  c.column_name,
  c.data_type,
  c.udt_name
FROM information_schema.columns c
WHERE c.table_schema = 'public'
  AND c.column_name IN ('user_id', 'assigned_to', 'created_by', 'updated_by', 'id')
  AND c.table_name IN (
    'users', 'profiles', 'companies', 'contacts', 'leads', 'projects', 
    'interactions', 'quotes', 'quote_items', 'tasks', 
    'calendar_events', 'notifications', 'notification_preferences',
    'email_drafts', 'documents', 'crm_audit_log', 'webhook_events'
  )
ORDER BY c.table_name, c.column_name;
