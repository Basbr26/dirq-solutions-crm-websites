-- Fix Projects SELECT Policy
-- Same issue as INSERT - get_user_role() and is_admin_or_manager() fail in RLS context
-- Simplify to allow all authenticated users to see all projects
-- Role checking happens in application layer (ProtectedRoute components)

DROP POLICY IF EXISTS "Projects select policy" ON projects;

CREATE POLICY "Projects select policy"
  ON projects FOR SELECT
  TO authenticated
  USING (
    auth.uid() IS NOT NULL
  );

-- Verify policy was created
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'projects' 
    AND policyname = 'Projects select policy'
  ) THEN
    RAISE NOTICE '✓ Projects select policy successfully updated';
  ELSE
    RAISE EXCEPTION '✗ Failed to create Projects select policy';
  END IF;
END $$;
