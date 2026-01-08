-- ═══════════════════════════════════════════════════════════════════════════
-- 🔒 FIX RLS POLICIES - CRITICAL SECURITY ISSUES
-- ═══════════════════════════════════════════════════════════════════════════
-- Date: 8 Januari 2026
-- Issues Fixed:
--   1. Companies SELECT policy had no filtering (qual: true)
--   2. Projects SELECT policy had no filtering (qual: true)
--   3. Duplicate policies on projects table (authenticated + public)
--   4. Quotes policies need proper owner_id filtering
-- ═══════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────
-- FIX 1: COMPANIES SELECT POLICY
-- ─────────────────────────────────────────────────────────────────────────
-- Current: qual = true (ALL users see ALL companies)
-- Fix: Only show companies where user is owner OR user is ADMIN/MANAGER

DROP POLICY IF EXISTS "Companies select policy" ON companies;

CREATE POLICY "Companies select policy"
  ON companies
  FOR SELECT
  TO authenticated
  USING (
    is_admin_or_manager() 
    OR owner_id = auth.uid()
  );

-- ─────────────────────────────────────────────────────────────────────────
-- FIX 2: PROJECTS SELECT POLICY
-- ─────────────────────────────────────────────────────────────────────────
-- Current: Duplicate policies with qual = true
-- Fix: Remove duplicates, create single policy with proper filtering

-- Drop ALL existing SELECT policies on projects
DROP POLICY IF EXISTS "Projects select policy" ON projects;
DROP POLICY IF EXISTS "Users can view projects" ON projects;

-- Create single, correct SELECT policy
CREATE POLICY "Projects select policy"
  ON projects
  FOR SELECT
  TO authenticated
  USING (
    is_admin_or_manager() 
    OR owner_id = auth.uid()
  );

-- ─────────────────────────────────────────────────────────────────────────
-- FIX 3: PROJECTS INSERT POLICY (CLEANUP DUPLICATES)
-- ─────────────────────────────────────────────────────────────────────────
-- Remove duplicate public policy, keep authenticated policy

DROP POLICY IF EXISTS "Users can create projects" ON projects;

-- Keep existing "Projects insert policy" (authenticated role)
-- No changes needed to that one

-- ─────────────────────────────────────────────────────────────────────────
-- FIX 4: PROJECTS UPDATE POLICY (CLEANUP DUPLICATES)
-- ─────────────────────────────────────────────────────────────────────────
-- Remove duplicate public policy, keep authenticated policy

DROP POLICY IF EXISTS "Users can update own projects" ON projects;

-- Keep existing "Projects update policy" (authenticated role)
-- No changes needed to that one

-- ─────────────────────────────────────────────────────────────────────────
-- FIX 5: QUOTES POLICIES (CONVERT FROM PUBLIC TO AUTHENTICATED)
-- ─────────────────────────────────────────────────────────────────────────
-- Current: Uses {public} role which is too permissive
-- Fix: Change to {authenticated} with proper filtering

-- DROP existing quote policies
DROP POLICY IF EXISTS "Users can view quotes" ON quotes;
DROP POLICY IF EXISTS "Users can create quotes" ON quotes;
DROP POLICY IF EXISTS "Users can update own quotes" ON quotes;

-- CREATE new quote policies with authenticated role
CREATE POLICY "Quotes select policy"
  ON quotes
  FOR SELECT
  TO authenticated
  USING (
    is_admin_or_manager() 
    OR owner_id = auth.uid()
  );

CREATE POLICY "Quotes insert policy"
  ON quotes
  FOR INSERT
  TO authenticated
  WITH CHECK (
    get_user_role() = ANY(ARRAY['ADMIN', 'SALES', 'MANAGER'])
    AND owner_id = auth.uid()
  );

CREATE POLICY "Quotes update policy"
  ON quotes
  FOR UPDATE
  TO authenticated
  USING (
    is_admin_or_manager() 
    OR owner_id = auth.uid()
  )
  WITH CHECK (
    is_admin_or_manager() 
    OR owner_id = auth.uid()
  );

CREATE POLICY "Quotes delete policy"
  ON quotes
  FOR DELETE
  TO authenticated
  USING (
    get_user_role() = 'ADMIN'
  );

-- ─────────────────────────────────────────────────────────────────────────
-- VERIFICATION QUERIES
-- ─────────────────────────────────────────────────────────────────────────
-- Run these after migration to verify fixes:

-- Check companies policies
-- SELECT policyname, cmd, qual, with_check 
-- FROM pg_policies 
-- WHERE tablename = 'companies' 
-- ORDER BY cmd;

-- Check projects policies
-- SELECT policyname, cmd, qual, with_check 
-- FROM pg_policies 
-- WHERE tablename = 'projects' 
-- ORDER BY cmd;

-- Check quotes policies
-- SELECT policyname, cmd, qual, with_check 
-- FROM pg_policies 
-- WHERE tablename = 'quotes' 
-- ORDER BY cmd;

-- ═══════════════════════════════════════════════════════════════════════════
-- EXPECTED RESULTS AFTER MIGRATION
-- ═══════════════════════════════════════════════════════════════════════════
/*
✅ Companies:
   - SELECT: is_admin_or_manager() OR owner_id = auth.uid()
   - No more "qual: true"

✅ Projects:
   - SELECT: is_admin_or_manager() OR owner_id = auth.uid()
   - No duplicate policies
   - Only 4 policies: SELECT, INSERT, UPDATE, DELETE

✅ Quotes:
   - All policies use {authenticated} role (not {public})
   - SELECT: Proper owner_id filtering
   - 4 policies total: SELECT, INSERT, UPDATE, DELETE

✅ Security:
   - User A cannot see User B's data
   - ADMIN/MANAGER can see all data
   - SALES users only see own data
*/

-- ═══════════════════════════════════════════════════════════════════════════
-- END OF MIGRATION
-- ═══════════════════════════════════════════════════════════════════════════
