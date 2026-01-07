-- Check SELECT policy for interactions
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'interactions'
  AND cmd = 'SELECT';
