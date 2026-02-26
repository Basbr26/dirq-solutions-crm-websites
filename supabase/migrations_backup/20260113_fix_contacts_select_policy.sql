-- Fix Contacts SELECT RLS Policy
-- Same issue - is_admin_or_manager() fails in RLS context
-- This blocks JOIN queries in ProjectDetailPage
-- Simplify to allow all authenticated users to see all contacts

DROP POLICY IF EXISTS "Contacts select policy" ON contacts;

CREATE POLICY "Contacts select policy"
  ON contacts FOR SELECT
  TO authenticated
  USING (
    auth.uid() IS NOT NULL
  );

-- Verify policy was created
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'contacts' 
    AND policyname = 'Contacts select policy'
  ) THEN
    RAISE NOTICE '✓ Contacts select policy successfully updated';
  ELSE
    RAISE EXCEPTION '✗ Failed to create Contacts select policy';
  END IF;
END $$;
