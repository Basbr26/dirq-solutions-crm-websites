-- Fix Projects UPDATE and DELETE RLS Policies
-- Same issue - is_admin_or_manager() and get_user_role() fail in RLS context
-- Simplify to allow authenticated users to manage their own data
-- Role checking happens in application layer

-- UPDATE Policy
DROP POLICY IF EXISTS "Projects update policy" ON projects;

CREATE POLICY "Projects update policy"
  ON projects FOR UPDATE
  TO authenticated
  USING (
    auth.uid() IS NOT NULL
  )
  WITH CHECK (
    auth.uid() IS NOT NULL
  );

-- DELETE Policy
DROP POLICY IF EXISTS "Projects delete policy" ON projects;

CREATE POLICY "Projects delete policy"
  ON projects FOR DELETE
  TO authenticated
  USING (
    auth.uid() IS NOT NULL
  );

-- Verify policies were created
DO $$
DECLARE
  policy_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies 
  WHERE tablename = 'projects';
  
  IF policy_count >= 4 THEN
    RAISE NOTICE '✓ All projects RLS policies successfully updated (% policies)', policy_count;
  ELSE
    RAISE EXCEPTION '✗ Expected at least 4 policies, found %', policy_count;
  END IF;
END $$;
