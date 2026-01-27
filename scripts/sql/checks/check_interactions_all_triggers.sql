-- Find ALL triggers on interactions (simpler query)
SELECT 
  trigger_name,
  event_manipulation,
  action_timing,
  action_statement
FROM information_schema.triggers
WHERE event_object_table = 'interactions'
  AND event_object_schema = 'public'
ORDER BY trigger_name;
