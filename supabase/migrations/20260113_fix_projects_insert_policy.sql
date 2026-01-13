-- Fix Projects INSERT Policy
-- Same issue as contacts - simplify to allow authenticated users

DROP POLICY IF EXISTS "Projects insert policy" ON projects;

CREATE POLICY "Projects insert policy"
  ON projects FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() IS NOT NULL
  );

-- Verify policy was created
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'projects' 
    AND policyname = 'Projects insert policy'
  ) THEN
    RAISE NOTICE '✓ Projects insert policy successfully updated';
  ELSE
    RAISE EXCEPTION '✗ Failed to create Projects insert policy';
  END IF;
END $$;
