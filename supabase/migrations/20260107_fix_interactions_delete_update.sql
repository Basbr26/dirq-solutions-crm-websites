-- =============================================
-- Fix Interactions RLS Policies for Delete/Update
-- Created: January 7, 2026
-- Purpose: Ensure users can properly delete and update their own interactions
-- =============================================

-- Check current policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'interactions';

-- Drop existing policies to recreate them
DROP POLICY IF EXISTS "Interactions delete policy" ON interactions;
DROP POLICY IF EXISTS "Interactions update policy" ON interactions;

-- UPDATE: Users can update their own interactions, ADMIN/MANAGER can update all
CREATE POLICY "Interactions update policy"
  ON interactions FOR UPDATE
  TO authenticated
  USING (
    is_admin_or_manager()
    OR user_id = auth.uid()
  )
  WITH CHECK (
    is_admin_or_manager()
    OR user_id = auth.uid()
  );

-- DELETE: Users can delete their own interactions, ADMIN/MANAGER can delete all
CREATE POLICY "Interactions delete policy"
  ON interactions FOR DELETE
  TO authenticated
  USING (
    is_admin_or_manager()
    OR user_id = auth.uid()
  );

-- Verify the policies are created
SELECT 
  policyname, 
  cmd as command,
  CASE WHEN qual IS NOT NULL THEN 'Has USING clause' ELSE 'No USING clause' END as using_clause,
  CASE WHEN with_check IS NOT NULL THEN 'Has WITH CHECK clause' ELSE 'No WITH CHECK clause' END as with_check_clause
FROM pg_policies 
WHERE tablename = 'interactions' 
AND cmd IN ('UPDATE', 'DELETE')
ORDER BY cmd;
