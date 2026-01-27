-- Check is_admin_or_manager function definition
SELECT 
  routine_name,
  routine_definition
FROM information_schema.routines
WHERE routine_name = 'is_admin_or_manager'
  AND routine_schema = 'public';
