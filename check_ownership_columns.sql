-- Check which ownership column each table uses
SELECT 
  c.table_name,
  string_agg(c.column_name, ', ' ORDER BY c.column_name) as ownership_columns
FROM information_schema.columns c
WHERE c.table_schema = 'public'
  AND c.column_name IN ('user_id', 'owner_id', 'assigned_to', 'created_by')
  AND c.table_name IN (
    'companies', 'contacts', 'leads', 'projects', 
    'interactions', 'quotes', 'quote_items', 'tasks', 
    'calendar_events', 'notifications', 'notification_preferences',
    'email_drafts', 'documents', 'crm_audit_log', 'webhook_events'
  )
GROUP BY c.table_name
ORDER BY c.table_name;
