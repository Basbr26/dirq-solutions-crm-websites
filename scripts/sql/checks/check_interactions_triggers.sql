-- Find triggers on interactions table
SELECT 
  trigger_name,
  event_manipulation,
  action_statement
FROM information_schema.triggers
WHERE event_object_table = 'interactions'
  AND event_object_schema = 'public';
