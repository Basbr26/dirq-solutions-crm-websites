-- =============================================
-- FIX QUOTES DELETE POLICY
-- Created: January 14, 2026
-- Issue: Only ADMIN can delete quotes, users should be able to delete their own
-- Solution: Allow users to delete their own quotes OR admins to delete any
-- =============================================

BEGIN;

-- Drop existing restrictive delete policy
DROP POLICY IF EXISTS "Quotes delete policy" ON quotes;

-- Create new policy: users can delete their own quotes, admins can delete any
CREATE POLICY "Quotes delete policy"
  ON quotes
  FOR DELETE
  TO authenticated
  USING (
    owner_id = auth.uid() OR get_user_role() = 'ADMIN'
  );

COMMIT;

-- Verification
DO $$
BEGIN
  RAISE NOTICE '✅ Updated quotes delete policy - users can now delete their own quotes';
END $$;
