-- Fix Companies SELECT RLS Policy
-- Same issue - is_admin_or_manager() fails in RLS context
-- This blocks JOIN queries in ProjectDetailPage
-- Simplify to allow all authenticated users to see all companies

DROP POLICY IF EXISTS "Companies select policy" ON companies;

CREATE POLICY "Companies select policy"
  ON companies FOR SELECT
  TO authenticated
  USING (
    auth.uid() IS NOT NULL
  );

-- Verify policy was created
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'companies' 
    AND policyname = 'Companies select policy'
  ) THEN
    RAISE NOTICE '✓ Companies select policy successfully updated';
  ELSE
    RAISE EXCEPTION '✗ Failed to create Companies select policy';
  END IF;
END $$;
