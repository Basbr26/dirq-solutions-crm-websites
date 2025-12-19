-- Fix HR Notes RLS Policies
-- Problem: "Employees cannot access hr_notes" policy blocks EVERYONE including HR/Managers
-- Solution: Rewrite policies to explicitly allow HR/Managers while blocking employees

-- Drop all existing policies on hr_notes
DROP POLICY IF EXISTS "Employees cannot access hr_notes" ON hr_notes;
DROP POLICY IF EXISTS "HR can see all notes" ON hr_notes;
DROP POLICY IF EXISTS "Managers can see team notes" ON hr_notes;
DROP POLICY IF EXISTS "HR and Managers can create notes" ON hr_notes;
DROP POLICY IF EXISTS "Creator can update own notes" ON hr_notes;
DROP POLICY IF EXISTS "Creator can delete own notes" ON hr_notes;

-- ============================================================================
-- SELECT POLICIES
-- ============================================================================

-- Policy 1: Super Admins can see ALL notes
CREATE POLICY "super_admins_select_all_notes"
  ON hr_notes
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_roles.user_id = auth.uid() 
      AND user_roles.role = 'super_admin'
    )
  );

-- Policy 2: HR can see ALL notes
CREATE POLICY "hr_select_all_notes"
  ON hr_notes
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_roles.user_id = auth.uid() 
      AND user_roles.role = 'hr'
    )
  );

-- Policy 3: Managers can see notes they created OR notes about their team
CREATE POLICY "managers_select_team_notes"
  ON hr_notes
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_roles.user_id = auth.uid() 
      AND user_roles.role = 'manager'
    )
    AND (
      -- Notes they created
      created_by = auth.uid()
      OR 
      -- Notes about their direct reports
      employee_id IN (
        SELECT id FROM profiles 
        WHERE manager_id = auth.uid()
      )
      OR
      -- Notes explicitly shared with managers
      visibility = 'manager_shared'
    )
  );

-- ============================================================================
-- INSERT POLICIES
-- ============================================================================

-- Policy 4: Super Admins can create notes
CREATE POLICY "super_admins_insert_notes"
  ON hr_notes
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_roles.user_id = auth.uid() 
      AND user_roles.role = 'super_admin'
    )
    AND created_by = auth.uid()
  );

-- Policy 5: HR can create notes
CREATE POLICY "hr_insert_notes"
  ON hr_notes
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_roles.user_id = auth.uid() 
      AND user_roles.role = 'hr'
    )
    AND created_by = auth.uid()
  );

-- Policy 6: Managers can create notes about their team members
CREATE POLICY "managers_insert_team_notes"
  ON hr_notes
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_roles.user_id = auth.uid() 
      AND user_roles.role = 'manager'
    )
    AND created_by = auth.uid()
    AND (
      -- Can create notes about their direct reports
      employee_id IN (
        SELECT id FROM profiles 
        WHERE manager_id = auth.uid()
      )
      OR
      -- Super admins and HR can create notes about anyone (covered by other policies)
      EXISTS (
        SELECT 1 FROM user_roles 
        WHERE user_roles.user_id = auth.uid() 
        AND user_roles.role IN ('super_admin', 'hr')
      )
    )
  );

-- ============================================================================
-- UPDATE POLICIES
-- ============================================================================

-- Policy 7: Super Admins can update all notes
CREATE POLICY "super_admins_update_all_notes"
  ON hr_notes
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_roles.user_id = auth.uid() 
      AND user_roles.role = 'super_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_roles.user_id = auth.uid() 
      AND user_roles.role = 'super_admin'
    )
  );

-- Policy 8: HR can update all notes
CREATE POLICY "hr_update_all_notes"
  ON hr_notes
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_roles.user_id = auth.uid() 
      AND user_roles.role = 'hr'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_roles.user_id = auth.uid() 
      AND user_roles.role = 'hr'
    )
  );

-- Policy 9: Managers can update notes they created
CREATE POLICY "managers_update_own_notes"
  ON hr_notes
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_roles.user_id = auth.uid() 
      AND user_roles.role = 'manager'
    )
    AND created_by = auth.uid()
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_roles.user_id = auth.uid() 
      AND user_roles.role = 'manager'
    )
    AND created_by = auth.uid()
  );

-- ============================================================================
-- DELETE POLICIES
-- ============================================================================

-- Policy 10: Super Admins can delete all notes
CREATE POLICY "super_admins_delete_all_notes"
  ON hr_notes
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_roles.user_id = auth.uid() 
      AND user_roles.role = 'super_admin'
    )
  );

-- Policy 11: HR can delete all notes
CREATE POLICY "hr_delete_all_notes"
  ON hr_notes
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_roles.user_id = auth.uid() 
      AND user_roles.role = 'hr'
    )
  );

-- Policy 12: Managers can delete notes they created
CREATE POLICY "managers_delete_own_notes"
  ON hr_notes
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_roles.user_id = auth.uid() 
      AND user_roles.role = 'manager'
    )
    AND created_by = auth.uid()
  );

-- ============================================================================
-- VERIFICATION QUERY (for testing)
-- ============================================================================

-- To test these policies after applying:
-- SELECT * FROM hr_notes; -- Should return notes based on your role
-- INSERT INTO hr_notes (...) VALUES (...); -- Should allow HR/Managers to insert
-- UPDATE hr_notes SET ... WHERE ...; -- Should allow based on role
-- DELETE FROM hr_notes WHERE ...; -- Should allow based on role

COMMENT ON TABLE hr_notes IS 'HR Notes - Private notes about employees. Only accessible by HR, Super Admins, and Managers (limited). Employees cannot see notes about themselves.';
