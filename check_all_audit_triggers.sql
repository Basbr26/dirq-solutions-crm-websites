-- Check all triggers that use audit functions
SELECT 
  event_object_table,
  trigger_name,
  action_statement
FROM information_schema.triggers
WHERE action_statement LIKE '%audit%'
  AND event_object_schema = 'public'
ORDER BY event_object_table;
