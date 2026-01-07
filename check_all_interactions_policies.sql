-- Check ALL policies for interactions table
SELECT 
  policyname,
  cmd,
  roles,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'interactions'
ORDER BY cmd;
