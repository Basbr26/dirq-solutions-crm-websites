-- Check column structure for all tables
SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('companies', 'contacts', 'interactions', 'leads', 'projects', 'quotes', 'documents', 'tasks', 'calendar_events', 'email_drafts')
  AND column_name IN ('owner_id', 'user_id', 'uploaded_by', 'assigned_to', 'created_by')
ORDER BY table_name, column_name;
