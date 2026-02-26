-- =============================================
-- FIX COMPANIES INSERT POLICY
-- Created: January 13, 2026
-- Issue: "new row violates row-level security policy for table companies"
-- Root cause: INSERT policy uses get_user_role() function which may not work correctly
-- Solution: Use direct profile lookup like other fixed policies
-- =============================================

BEGIN;

-- Drop existing insert policy
DROP POLICY IF EXISTS "Companies insert policy" ON companies;

-- Create new insert policy with direct profile lookup
-- ADMIN, SALES, MANAGER, and super_admin can create companies
CREATE POLICY "Companies insert policy"
  ON companies FOR INSERT
  TO authenticated
  WITH CHECK (
    owner_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('ADMIN', 'SALES', 'MANAGER', 'super_admin')
    )
  );

-- Verification
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'companies' 
    AND policyname = 'Companies insert policy'
  ) THEN
    RAISE NOTICE '✅ Companies INSERT policy: FIXED';
    RAISE NOTICE '   Allowed roles: ADMIN, SALES, MANAGER, super_admin';
    RAISE NOTICE '   Condition: owner_id must be current user';
  ELSE
    RAISE WARNING '❌ Companies INSERT policy: FAILED';
  END IF;
END $$;

COMMIT;
