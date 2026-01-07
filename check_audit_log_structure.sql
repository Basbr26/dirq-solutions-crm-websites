-- Check audit_log table structure
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'audit_log'
  AND table_schema = 'public'
ORDER BY ordinal_position;
