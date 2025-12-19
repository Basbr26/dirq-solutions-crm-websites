-- ============================================================================
-- FIX HR NOTES RLS - COPY PASTE THIS INTO SUPABASE SQL EDITOR
-- ============================================================================
-- Problem: Current RLS blocks everyone including HR/Managers
-- Solution: Explicit allow policies for each role
-- ============================================================================

-- Step 1: Drop all existing hr_notes policies
DROP POLICY IF EXISTS "Employees cannot access hr_notes" ON hr_notes;
DROP POLICY IF EXISTS "HR can see all notes" ON hr_notes;
DROP POLICY IF EXISTS "Managers can see team notes" ON hr_notes;
DROP POLICY IF EXISTS "HR and Managers can create notes" ON hr_notes;
DROP POLICY IF EXISTS "Creator can update own notes" ON hr_notes;
DROP POLICY IF EXISTS "Creator can delete own notes" ON hr_notes;

-- Step 2: Create new SELECT policies
CREATE POLICY "super_admins_select_all_notes" ON hr_notes FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'super_admin'));
CREATE POLICY "hr_select_all_notes" ON hr_notes FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'hr'));
CREATE POLICY "managers_select_team_notes" ON hr_notes FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'manager') AND (created_by = auth.uid() OR employee_id IN (SELECT id FROM profiles WHERE manager_id = auth.uid()) OR visibility = 'manager_shared'));

-- Step 3: Create new INSERT policies
CREATE POLICY "super_admins_insert_notes" ON hr_notes FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'super_admin') AND created_by = auth.uid());
CREATE POLICY "hr_insert_notes" ON hr_notes FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'hr') AND created_by = auth.uid());
CREATE POLICY "managers_insert_team_notes" ON hr_notes FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'manager') AND created_by = auth.uid());

-- Step 4: Create new UPDATE policies
CREATE POLICY "super_admins_update_all_notes" ON hr_notes FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'super_admin')) WITH CHECK (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'super_admin'));
CREATE POLICY "hr_update_all_notes" ON hr_notes FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'hr')) WITH CHECK (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'hr'));
CREATE POLICY "managers_update_own_notes" ON hr_notes FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'manager') AND created_by = auth.uid()) WITH CHECK (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'manager') AND created_by = auth.uid());

-- Step 5: Create new DELETE policies
CREATE POLICY "super_admins_delete_all_notes" ON hr_notes FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'super_admin'));
CREATE POLICY "hr_delete_all_notes" ON hr_notes FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'hr'));
CREATE POLICY "managers_delete_own_notes" ON hr_notes FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'manager') AND created_by = auth.uid());

-- Done! Test by running: SELECT * FROM hr_notes;
