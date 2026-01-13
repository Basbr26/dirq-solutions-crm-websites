-- Fix Contacts INSERT Policy
-- The WITH CHECK clause was too restrictive - it required owner_id = auth.uid()
-- but this is set by the client code, not by the database
-- We should check that IF owner_id is provided, it matches auth.uid()

DROP POLICY IF EXISTS "Contacts insert policy" ON contacts;

CREATE POLICY "Contacts insert policy"
  ON contacts FOR INSERT
  TO authenticated
  WITH CHECK (
    get_user_role() IN ('ADMIN', 'SALES', 'MANAGER')
    AND (
      -- If owner_id is provided, it must match the authenticated user
      owner_id IS NULL OR owner_id = auth.uid()
    )
    AND (
      -- If company_id is provided, user must have access to that company
      company_id IS NULL
      OR is_admin_or_manager()
      OR company_id IN (SELECT id FROM companies WHERE owner_id = auth.uid())
    )
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
