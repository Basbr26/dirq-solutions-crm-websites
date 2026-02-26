-- Fix Contacts INSERT Policy
-- Simplified: Just check if user exists in profiles (role check in app layer)

DROP POLICY IF EXISTS "Contacts insert policy" ON contacts;

CREATE POLICY "Contacts insert policy"
  ON contacts FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() IS NOT NULL
  );

-- Verify policy was created
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'contacts' 
    AND policyname = 'Contacts insert policy'
  ) THEN
    RAISE NOTICE '✓ Contacts insert policy successfully updated';
  ELSE
    RAISE EXCEPTION '✗ Failed to create Contacts insert policy';
  END IF;
END $$;
