-- Check columns for email_drafts and documents
SELECT 
  table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('email_drafts', 'documents')
ORDER BY table_name, ordinal_position;
