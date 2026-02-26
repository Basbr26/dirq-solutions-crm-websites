-- Add RLS policies for projects table
-- Migration: 20260108_projects_rls_policies.sql

-- Enable RLS on projects table
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- SELECT: All authenticated users can see all projects
DROP POLICY IF EXISTS "Projects select policy" ON projects;
CREATE POLICY "Projects select policy"
  ON projects FOR SELECT
  TO authenticated
  USING (true);

-- INSERT: ADMIN, SALES, MANAGER can create projects
DROP POLICY IF EXISTS "Projects insert policy" ON projects;
CREATE POLICY "Projects insert policy"
  ON projects FOR INSERT
  TO authenticated
  WITH CHECK (
    get_user_role() IN ('ADMIN', 'SALES', 'MANAGER')
    AND owner_id = auth.uid()
  );

-- UPDATE: 
-- - ADMIN & MANAGER: Update any project
-- - SALES: Update own projects
DROP POLICY IF EXISTS "Projects update policy" ON projects;
CREATE POLICY "Projects update policy"
  ON projects FOR UPDATE
  TO authenticated
  USING (
    is_admin_or_manager()
    OR owner_id = auth.uid()
  )
  WITH CHECK (
    is_admin_or_manager()
    OR owner_id = auth.uid()
  );

-- DELETE:
-- - ADMIN & MANAGER: Delete any project
-- - SALES: Delete own projects
DROP POLICY IF EXISTS "Projects delete policy" ON projects;
CREATE POLICY "Projects delete policy"
  ON projects FOR DELETE
  TO authenticated
  USING (
    is_admin_or_manager()
    OR owner_id = auth.uid()
  );

-- Add comment
COMMENT ON TABLE projects IS 'Website projects/deals with RLS policies';
