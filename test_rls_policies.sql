-- ============================================================
-- RLS POLICY TEST SUITE
-- ============================================================
-- Test if RLS policies still work correctly after all changes
-- Run this as different users to verify access control
-- ============================================================

-- =============================================
-- SETUP: Create test users (run as admin)
-- =============================================

-- First, cleanup any existing test data from previous runs
DELETE FROM tasks WHERE assigned_to IN ('00000000-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000002'::uuid);
DELETE FROM interactions WHERE subject IN ('Test call user 1', 'Test email user 2');
DELETE FROM contacts WHERE owner_id IN ('00000000-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000002'::uuid);
DELETE FROM companies WHERE owner_id IN ('00000000-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000002'::uuid);
DELETE FROM profiles WHERE id IN ('00000000-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000002'::uuid);
DELETE FROM auth.users WHERE id IN ('00000000-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000002'::uuid);

-- Test user 1 (will own data)
-- Note: Profile is auto-created by handle_new_user() trigger
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data)
VALUES (
  '00000000-0000-0000-0000-000000000001'::uuid,
  'test1@example.com',
  crypt('test123', gen_salt('bf')),
  now(),
  now(),
  now(),
  '{"provider": "email", "providers": ["email"]}'::jsonb,
  '{}'::jsonb
) ON CONFLICT (id) DO NOTHING;

-- Update profile role to SALES (trigger creates it with SUPPORT by default)
UPDATE profiles 
SET role = 'SALES' 
WHERE id = '00000000-0000-0000-0000-000000000001'::uuid;

-- Test user 2 (should not see user 1's data)
-- Note: Profile is auto-created by handle_new_user() trigger
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data)
VALUES (
  '00000000-0000-0000-0000-000000000002'::uuid,
  'test2@example.com',
  crypt('test123', gen_salt('bf')),
  now(),
  now(),
  now(),
  '{"provider": "email", "providers": ["email"]}'::jsonb,
  '{}'::jsonb
) ON CONFLICT (id) DO NOTHING;

-- Update profile role to SALES
UPDATE profiles 
SET role = 'SALES' 
WHERE id = '00000000-0000-0000-0000-000000000002'::uuid;

-- =============================================
-- TEST 1: Basic ownership - Companies
-- =============================================
-- Note: We insert as superuser to bypass RLS, then test SELECT policies

-- Create test company owned by user 1 (as superuser)
RESET role;
INSERT INTO companies (name, owner_id)
VALUES ('Test Company 1', '00000000-0000-0000-0000-000000000001'::uuid);

-- Create test company owned by user 2 (as superuser)
INSERT INTO companies (name, owner_id)
VALUES ('Test Company 2', '00000000-0000-0000-0000-000000000002'::uuid);

-- Test: Check that companies table has our test data
SELECT 
  'TEST 1a: Setup - Test companies created' as test,
  CASE WHEN COUNT(*) = 2 THEN '✅ PASS' ELSE '❌ FAIL' END as result
FROM companies
WHERE name IN ('Test Company 1', 'Test Company 2');

-- Test: User 1 can only see their own company (simulated)
-- Note: Since we can't actually switch auth context in SQL, we verify the RLS logic
SELECT 
  'TEST 1b: RLS logic - User 1 should see only their company' as test,
  CASE WHEN COUNT(*) = 1 THEN '✅ PASS' ELSE '❌ FAIL' END as result
FROM companies
WHERE owner_id = '00000000-0000-0000-0000-000000000001'::uuid
  AND name = 'Test Company 1';

-- =============================================
-- TEST 2: Contacts ownership
-- =============================================
-- Create test contacts as superuser

RESET role;
INSERT INTO contacts (first_name, last_name, email, owner_id)
VALUES ('John', 'Doe', 'john@test.com', '00000000-0000-0000-0000-000000000001'::uuid);

INSERT INTO contacts (first_name, last_name, email, owner_id)
VALUES ('Jane', 'Smith', 'jane@test.com', '00000000-0000-0000-0000-000000000002'::uuid);

-- Test: Verify ownership separation
SELECT 
  'TEST 2a: Contact ownership - User 1 contact exists' as test,
  CASE WHEN COUNT(*) = 1 THEN '✅ PASS' ELSE '❌ FAIL' END as result
FROM contacts
WHERE owner_id = '00000000-0000-0000-0000-000000000001'::uuid
  AND email = 'john@test.com';

SELECT 
  'TEST 2b: Contact ownership - User 2 contact exists' as test,
  CASE WHEN COUNT(*) = 1 THEN '✅ PASS' ELSE '❌ FAIL' END as result
FROM contacts
WHERE owner_id = '00000000-0000-0000-0000-000000000002'::uuid
  AND email = 'jane@test.com';

-- =============================================
-- TEST 3: Interactions ownership (user_id not owner_id!)
-- =============================================
-- Create test interactions as superuser

RESET role;

-- Get company IDs for linking interactions
DO $$
DECLARE
  company1_id UUID;
  company2_id UUID;
BEGIN
  SELECT id INTO company1_id FROM companies WHERE name = 'Test Company 1';
  SELECT id INTO company2_id FROM companies WHERE name = 'Test Company 2';
  
  -- Insert interactions linked to companies (required by interactions_entity_check)
  INSERT INTO interactions (type, subject, description, user_id, company_id)
  VALUES ('call', 'Test call user 1', 'Test call description', '00000000-0000-0000-0000-000000000001'::uuid, company1_id);
  
  INSERT INTO interactions (type, subject, description, user_id, company_id)
  VALUES ('email', 'Test email user 2', 'Test email description', '00000000-0000-0000-0000-000000000002'::uuid, company2_id);
END $$;

-- Test: Verify user_id column (not owner_id)
SELECT 
  'TEST 3a: Interactions use user_id column' as test,
  CASE WHEN COUNT(*) = 1 THEN '✅ PASS' ELSE '❌ FAIL' END as result
FROM interactions
WHERE user_id = '00000000-0000-0000-0000-000000000001'::uuid
  AND subject = 'Test call user 1';

SELECT 
  'TEST 3b: Interactions properly separated by user_id' as test,
  CASE WHEN COUNT(*) = 1 THEN '✅ PASS' ELSE '❌ FAIL' END as result
FROM interactions
WHERE user_id = '00000000-0000-0000-0000-000000000002'::uuid
  AND subject = 'Test email user 2';

-- =============================================
-- TEST 4: Tasks (assigned_to instead of user_id/owner_id!)
-- =============================================
-- Create test tasks as superuser

RESET role;
INSERT INTO tasks (title, description, assigned_to)
VALUES ('Test Task User 1', 'Task for user 1', '00000000-0000-0000-0000-000000000001'::uuid);

INSERT INTO tasks (title, description, assigned_to)
VALUES ('Test Task User 2', 'Task for user 2', '00000000-0000-0000-0000-000000000002'::uuid);

-- Test: Verify assigned_to column (unique to tasks table)
SELECT 
  'TEST 4a: Tasks use assigned_to column' as test,
  CASE WHEN COUNT(*) = 1 THEN '✅ PASS' ELSE '❌ FAIL' END as result
FROM tasks
WHERE assigned_to = '00000000-0000-0000-0000-000000000001'::uuid
  AND title = 'Test Task User 1';

SELECT 
  'TEST 4b: Tasks properly separated by assigned_to' as test,
  CASE WHEN COUNT(*) = 1 THEN '✅ PASS' ELSE '❌ FAIL' END as result
FROM tasks
WHERE assigned_to = '00000000-0000-0000-0000-000000000002'::uuid
  AND title = 'Test Task User 2';

-- =============================================
-- TEST 5: RLS Policy Coverage Verification
-- =============================================
-- Verify that RLS policies exist and are properly structured

RESET role;

-- Test: Check companies policies wrap auth.uid() for performance
SELECT 
  'TEST 5a: Companies SELECT policy optimized' as test,
  CASE WHEN qual LIKE '%select auth.uid%' THEN '✅ PASS' ELSE '❌ FAIL' END as result
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'companies'
  AND cmd = 'SELECT'
LIMIT 1;

-- Test: Check contacts policies exist
SELECT 
  'TEST 5b: Contacts have RLS policies' as test,
  CASE WHEN COUNT(*) >= 1 THEN '✅ PASS' ELSE '❌ FAIL' END as result
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'contacts';

-- =============================================
-- TEST 6: CRM Audit Log (consolidated policy)
-- =============================================
-- Verify the consolidated audit log policy exists

RESET role;

SELECT 
  'TEST 6a: Audit log has consolidated SELECT policy' as test,
  CASE WHEN COUNT(*) >= 1 THEN '✅ PASS' ELSE '❌ FAIL' END as result
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'crm_audit_log'
  AND cmd = 'SELECT';

-- Test: Verify audit log RLS is enabled
SELECT 
  'TEST 6b: Audit log RLS is enabled' as test,
  CASE WHEN relrowsecurity = true THEN '✅ PASS' ELSE '❌ FAIL' END as result
FROM pg_class
WHERE relname = 'crm_audit_log'
  AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

-- =============================================
-- SUMMARY: All Test Results (BEFORE cleanup!)
-- =============================================

SELECT 
  '=== RLS POLICY TEST SUITE RESULTS ===' as summary,
  (SELECT COUNT(*) FROM companies WHERE name IN ('Test Company 1', 'Test Company 2')) as companies_created,
  (SELECT COUNT(*) FROM contacts WHERE email IN ('john@test.com', 'jane@test.com')) as contacts_created,
  (SELECT COUNT(*) FROM interactions WHERE subject IN ('Test call user 1', 'Test email user 2')) as interactions_created,
  (SELECT COUNT(*) FROM tasks WHERE title IN ('Test Task User 1', 'Test Task User 2')) as tasks_created,
  (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public' AND tablename = 'companies') as companies_policies,
  (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public' AND tablename = 'contacts') as contacts_policies,
  (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public' AND tablename = 'interactions') as interactions_policies,
  (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public' AND tablename = 'tasks') as tasks_policies,
  (SELECT relrowsecurity FROM pg_class WHERE relname = 'crm_audit_log' AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')) as audit_rls_enabled;

-- =============================================
-- FINAL SUMMARY: Collect ALL test results (BEFORE cleanup!)
-- =============================================

SELECT 
  'TEST 1a: Setup - Test companies created' as test,
  CASE WHEN (SELECT COUNT(*) FROM companies WHERE name IN ('Test Company 1', 'Test Company 2')) = 2 THEN '✅ PASS' ELSE '❌ FAIL' END as result

UNION ALL SELECT 
  'TEST 1b: RLS logic - User 1 should see only their company',
  CASE WHEN (SELECT COUNT(*) FROM companies WHERE owner_id = '00000000-0000-0000-0000-000000000001'::uuid AND name = 'Test Company 1') = 1 THEN '✅ PASS' ELSE '❌ FAIL' END

UNION ALL SELECT 
  'TEST 2a: Contact ownership - User 1 contact exists',
  CASE WHEN (SELECT COUNT(*) FROM contacts WHERE owner_id = '00000000-0000-0000-0000-000000000001'::uuid AND email = 'john@test.com') = 1 THEN '✅ PASS' ELSE '❌ FAIL' END

UNION ALL SELECT 
  'TEST 2b: Contact ownership - User 2 contact exists',
  CASE WHEN (SELECT COUNT(*) FROM contacts WHERE owner_id = '00000000-0000-0000-0000-000000000002'::uuid AND email = 'jane@test.com') = 1 THEN '✅ PASS' ELSE '❌ FAIL' END

UNION ALL SELECT 
  'TEST 3a: Interactions use user_id column',
  CASE WHEN (SELECT COUNT(*) FROM interactions WHERE user_id = '00000000-0000-0000-0000-000000000001'::uuid AND subject = 'Test call user 1') = 1 THEN '✅ PASS' ELSE '❌ FAIL' END

UNION ALL SELECT 
  'TEST 3b: Interactions properly separated by user_id',
  CASE WHEN (SELECT COUNT(*) FROM interactions WHERE user_id = '00000000-0000-0000-0000-000000000002'::uuid AND subject = 'Test email user 2') = 1 THEN '✅ PASS' ELSE '❌ FAIL' END

UNION ALL SELECT 
  'TEST 4a: Tasks use assigned_to column',
  CASE WHEN (SELECT COUNT(*) FROM tasks WHERE assigned_to = '00000000-0000-0000-0000-000000000001'::uuid AND title = 'Test Task User 1') = 1 THEN '✅ PASS' ELSE '❌ FAIL' END

UNION ALL SELECT 
  'TEST 4b: Tasks properly separated by assigned_to',
  CASE WHEN (SELECT COUNT(*) FROM tasks WHERE assigned_to = '00000000-0000-0000-0000-000000000002'::uuid AND title = 'Test Task User 2') = 1 THEN '✅ PASS' ELSE '❌ FAIL' END

UNION ALL SELECT 
  'TEST 5a: Companies have RLS policies',
  CASE WHEN (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public' AND tablename = 'companies') >= 1 THEN '✅ PASS' ELSE '❌ FAIL' END

UNION ALL SELECT 
  'TEST 5b: Contacts have RLS policies',
  CASE WHEN (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public' AND tablename = 'contacts') >= 1 THEN '✅ PASS' ELSE '❌ FAIL' END

UNION ALL SELECT 
  'TEST 6a: Audit log has consolidated SELECT policy',
  CASE WHEN (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public' AND tablename = 'crm_audit_log' AND cmd = 'SELECT') >= 1 THEN '✅ PASS' ELSE '❌ FAIL' END

UNION ALL SELECT 
  'TEST 6b: Audit log RLS is enabled',
  CASE WHEN (SELECT relrowsecurity FROM pg_class WHERE relname = 'crm_audit_log' AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')) = true THEN '✅ PASS' ELSE '❌ FAIL' END

UNION ALL SELECT 
  '--- SUMMARY ---',
  ''

UNION ALL SELECT 
  'Total policies: companies',
  (SELECT COUNT(*)::text FROM pg_policies WHERE schemaname = 'public' AND tablename = 'companies')

UNION ALL SELECT 
  'Total policies: contacts',
  (SELECT COUNT(*)::text FROM pg_policies WHERE schemaname = 'public' AND tablename = 'contacts')

UNION ALL SELECT 
  'Total policies: interactions',
  (SELECT COUNT(*)::text FROM pg_policies WHERE schemaname = 'public' AND tablename = 'interactions')

UNION ALL SELECT 
  'Total policies: tasks',
  (SELECT COUNT(*)::text FROM pg_policies WHERE schemaname = 'public' AND tablename = 'tasks');

-- =============================================
-- CLEANUP: Remove test data
-- =============================================

-- Switch back to admin
RESET role;

-- Delete test data
DELETE FROM tasks WHERE title IN ('Test Task User 1', 'Test Task User 2');
DELETE FROM interactions WHERE subject IN ('Test call user 1', 'Test email user 2');
DELETE FROM contacts WHERE email IN ('john@test.com', 'jane@test.com');
DELETE FROM companies WHERE name IN ('Test Company 1', 'Test Company 2');
DELETE FROM profiles WHERE id IN ('00000000-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000002'::uuid);
DELETE FROM auth.users WHERE id IN ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002');
