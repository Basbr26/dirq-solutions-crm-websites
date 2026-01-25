-- Quick check: Which INSERT policies exist for companies?
SELECT schemaname, tablename, policyname, cmd, roles, qual, with_check
FROM pg_policies 
WHERE tablename = 'companies' 
  AND cmd = 'INSERT';

-- Also check if RLS is enabled
SELECT relname, relrowsecurity 
FROM pg_class 
WHERE relname = 'companies';
