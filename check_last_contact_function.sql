-- Check update_company_last_contact function
SELECT 
  routine_name,
  routine_definition
FROM information_schema.routines
WHERE routine_name = 'update_company_last_contact'
  AND routine_schema = 'public';
