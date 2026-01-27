-- Check huidige Interactions INSERT policy
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual as using_expression,
  with_check as with_check_expression
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'interactions'
  AND cmd = 'INSERT';

-- Check ook of RLS enabled is
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename = 'interactions';

-- Check welke role je hebt
SELECT 
  auth.uid() as my_user_id,
  get_user_role() as my_role,
  is_admin_or_manager() as am_i_admin_or_manager;
