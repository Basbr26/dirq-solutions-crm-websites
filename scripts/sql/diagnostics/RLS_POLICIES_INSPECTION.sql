-- ═══════════════════════════════════════════════════════════════════════════
-- 🔍 RLS POLICIES INSPECTION
-- ═══════════════════════════════════════════════════════════════════════════
-- Purpose: Inspect current RLS policies on all CRM tables
-- Date: 8 Januari 2026
-- ═══════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────
-- CHECK RLS STATUS ON ALL TABLES
-- ─────────────────────────────────────────────────────────────────────────
SELECT 
  schemaname,
  tablename,
  rowsecurity AS "RLS Enabled"
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'companies', 
    'contacts', 
    'projects', 
    'interactions', 
    'quotes',
    'quote_items',
    'calendar_events',
    'notifications',
    'profiles'
  )
ORDER BY tablename;

-- Expected Output: ALL tables should have "RLS Enabled" = true
-- ❌ If any table shows false, RLS is NOT enabled!

-- ─────────────────────────────────────────────────────────────────────────
-- LIST ALL RLS POLICIES
-- ─────────────────────────────────────────────────────────────────────────
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN (
    'companies', 
    'contacts', 
    'projects', 
    'interactions', 
    'quotes',
    'quote_items',
    'calendar_events',
    'notifications',
    'profiles'
  )
ORDER BY tablename, policyname;

-- ─────────────────────────────────────────────────────────────────────────
-- DETAILED POLICY BREAKDOWN BY TABLE
-- ─────────────────────────────────────────────────────────────────────────

-- COMPANIES TABLE
SELECT 
  policyname AS "Policy Name",
  cmd AS "Command",
  CASE 
    WHEN roles::text LIKE '%authenticated%' THEN 'All Authenticated Users'
    ELSE roles::text
  END AS "Applies To",
  qual AS "Using (WHERE clause)",
  with_check AS "With Check (INSERT/UPDATE)"
FROM pg_policies
WHERE tablename = 'companies'
ORDER BY cmd, policyname;

-- PROJECTS TABLE
SELECT 
  policyname AS "Policy Name",
  cmd AS "Command",
  CASE 
    WHEN roles::text LIKE '%authenticated%' THEN 'All Authenticated Users'
    ELSE roles::text
  END AS "Applies To",
  qual AS "Using (WHERE clause)",
  with_check AS "With Check (INSERT/UPDATE)"
FROM pg_policies
WHERE tablename = 'projects'
ORDER BY cmd, policyname;

-- INTERACTIONS TABLE
SELECT 
  policyname AS "Policy Name",
  cmd AS "Command",
  CASE 
    WHEN roles::text LIKE '%authenticated%' THEN 'All Authenticated Users'
    ELSE roles::text
  END AS "Applies To",
  qual AS "Using (WHERE clause)",
  with_check AS "With Check (INSERT/UPDATE)"
FROM pg_policies
WHERE tablename = 'interactions'
ORDER BY cmd, policyname;

-- CONTACTS TABLE
SELECT 
  policyname AS "Policy Name",
  cmd AS "Command",
  CASE 
    WHEN roles::text LIKE '%authenticated%' THEN 'All Authenticated Users'
    ELSE roles::text
  END AS "Applies To",
  qual AS "Using (WHERE clause)",
  with_check AS "With Check (INSERT/UPDATE)"
FROM pg_policies
WHERE tablename = 'contacts'
ORDER BY cmd, policyname;

-- ─────────────────────────────────────────────────────────────────────────
-- CHECK OWNER_ID COLUMNS EXIST
-- ─────────────────────────────────────────────────────────────────────────
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('companies', 'projects', 'quotes', 'interactions')
  AND column_name = 'owner_id'
ORDER BY table_name;

-- Expected: owner_id should exist on companies, projects, quotes
-- ❌ If missing, RLS cannot work properly!

-- ─────────────────────────────────────────────────────────────────────────
-- CHECK FOREIGN KEY CONSTRAINTS
-- ─────────────────────────────────────────────────────────────────────────
SELECT 
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name,
  rc.delete_rule
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
JOIN information_schema.referential_constraints AS rc
  ON tc.constraint_name = rc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
  AND tc.table_name IN ('contacts', 'projects', 'interactions', 'quotes')
  AND kcu.column_name = 'company_id'
ORDER BY tc.table_name;

-- Expected: All company_id FKs should have proper delete rules
-- CASCADE or SET NULL depending on business logic

-- ─────────────────────────────────────────────────────────────────────────
-- VERIFY PROFILES TABLE ACCESS
-- ─────────────────────────────────────────────────────────────────────────
SELECT 
  policyname AS "Policy Name",
  cmd AS "Command",
  qual AS "Using (WHERE clause)"
FROM pg_policies
WHERE tablename = 'profiles';

-- Profiles should be readable by all authenticated users
-- But writable only by the user themselves or ADMIN

-- ─────────────────────────────────────────────────────────────────────────
-- TEST HELPER: Get Current User Info
-- ─────────────────────────────────────────────────────────────────────────
SELECT 
  auth.uid() AS "Current User ID",
  auth.jwt() AS "JWT Claims",
  auth.role() AS "Current Role";

-- Use this to verify which user context you're in during testing

-- ─────────────────────────────────────────────────────────────────────────
-- SECURITY BEST PRACTICES CHECKLIST
-- ─────────────────────────────────────────────────────────────────────────
/*
✅ RLS Checklist:
[ ] ALL tables have RLS enabled (rowsecurity = true)
[ ] Companies: owner_id = auth.uid() OR user has ADMIN role
[ ] Projects: Linked to company owner OR user is project owner
[ ] Contacts: Linked to company owner
[ ] Interactions: Linked to company owner
[ ] Quotes: Linked to company owner
[ ] Calendar Events: User is owner
[ ] Notifications: recipient_id = auth.uid()
[ ] NO policies allow public access (anon role)
[ ] service_role is ONLY used in Edge Functions (not frontend)
[ ] INSERT policies have WITH CHECK constraints
[ ] UPDATE policies prevent ownership changes
[ ] DELETE policies are restrictive (owner only or ADMIN)
*/

-- ═══════════════════════════════════════════════════════════════════════════
-- END OF RLS POLICIES INSPECTION
-- ═══════════════════════════════════════════════════════════════════════════
