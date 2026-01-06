-- Allow all authenticated users to view all companies
-- Migration: 20260108_allow_all_users_view_companies.sql

-- Drop existing policy
DROP POLICY IF EXISTS "Companies select policy" ON companies;

-- Create new policy: All authenticated users can see all companies
CREATE POLICY "Companies select policy"
  ON companies FOR SELECT
  TO authenticated
  USING (true);

-- Add comment
COMMENT ON POLICY "Companies select policy" ON companies IS 'All authenticated users can view all companies';
