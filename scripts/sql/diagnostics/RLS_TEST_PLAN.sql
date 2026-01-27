-- ═══════════════════════════════════════════════════════════════════════════
-- 🔒 RLS (Row Level Security) TEST PLAN
-- ═══════════════════════════════════════════════════════════════════════════
-- Purpose: Verify that SALES users can only access their own data
-- Date: 8 Januari 2026
-- Status: PENDING EXECUTION
-- ═══════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────
-- STEP 1: CREATE TEST USERS
-- ─────────────────────────────────────────────────────────────────────────
-- Run these via Supabase Dashboard → Authentication → Users → Create User
-- OR via Supabase Auth Admin API

-- User A (Owner): [email protected]
-- User B (Non-Owner): [email protected]
-- Both have role: 'SALES'

-- After creation, note down their UUIDs:
-- User A UUID: [INSERT HERE]
-- User B UUID: [INSERT HERE]

-- ─────────────────────────────────────────────────────────────────────────
-- STEP 2: CREATE TEST DATA AS USER A
-- ─────────────────────────────────────────────────────────────────────────
-- Login to app as [email protected] and create:
-- 1. Company "Test Company Alpha" (status: prospect)
-- 2. Contact "John Doe" linked to Company Alpha
-- 3. Project "Alpha Website" linked to Company Alpha
-- 4. Interaction "Initial Call" linked to Company Alpha

-- Note down the created IDs:
-- Company ID: [INSERT HERE]
-- Contact ID: [INSERT HERE]
-- Project ID: [INSERT HERE]
-- Interaction ID: [INSERT HERE]

-- ─────────────────────────────────────────────────────────────────────────
-- STEP 3: VERIFY RLS POLICIES VIA SQL EDITOR
-- ─────────────────────────────────────────────────────────────────────────
-- Run these queries in Supabase SQL Editor

-- 3.1: Set session to User B (Non-Owner)
SET LOCAL jwt.claims.sub = '[USER-B-UUID]';
SET LOCAL jwt.claims.role = 'SALES';

-- 3.2: TEST - Try to read Company Alpha (owned by User A)
SELECT * FROM companies WHERE id = '[COMPANY-ALPHA-UUID]';
-- ✅ EXPECTED: 0 rows (RLS blocks)
-- ❌ FAIL IF: 1 row returned (data leakage!)

-- 3.3: TEST - Try to read all companies (should only see User B's companies)
SELECT id, name, owner_id FROM companies;
-- ✅ EXPECTED: Only companies where owner_id = USER-B-UUID
-- ❌ FAIL IF: Company Alpha (owned by User A) appears in results

-- 3.4: TEST - Try to update Company Alpha
UPDATE companies 
SET notes = 'HACKED BY USER B' 
WHERE id = '[COMPANY-ALPHA-UUID]';
-- ✅ EXPECTED: 0 rows affected (RLS blocks)
-- ❌ FAIL IF: 1 row affected (security breach!)

-- 3.5: TEST - Try to delete Company Alpha
DELETE FROM companies WHERE id = '[COMPANY-ALPHA-UUID]';
-- ✅ EXPECTED: 0 rows affected (RLS blocks)
-- ❌ FAIL IF: 1 row affected (critical security issue!)

-- 3.6: TEST - Try to create interaction for Company Alpha (not owned)
INSERT INTO interactions (
  company_id, 
  user_id, 
  type, 
  subject,
  direction
) VALUES (
  '[COMPANY-ALPHA-UUID]',
  '[USER-B-UUID]',
  'call',
  'Unauthorized call',
  'outbound'
);
-- ✅ EXPECTED: Error - RLS policy blocks insert
-- ❌ FAIL IF: Insert succeeds (User B can add interactions to User A's companies)

-- 3.7: TEST - Try to read interactions for Company Alpha
SELECT * FROM interactions WHERE company_id = '[COMPANY-ALPHA-UUID]';
-- ✅ EXPECTED: 0 rows (RLS blocks)
-- ❌ FAIL IF: Interactions appear (data leakage)

-- 3.8: TEST - Try to read projects for Company Alpha
SELECT * FROM projects WHERE company_id = '[COMPANY-ALPHA-UUID]';
-- ✅ EXPECTED: 0 rows (RLS blocks)
-- ❌ FAIL IF: Projects appear (data leakage)

-- 3.9: TEST - Try to read contacts for Company Alpha
SELECT * FROM contacts WHERE company_id = '[COMPANY-ALPHA-UUID]';
-- ✅ EXPECTED: 0 rows (RLS blocks)
-- ❌ FAIL IF: Contacts appear (data leakage)

-- ─────────────────────────────────────────────────────────────────────────
-- STEP 4: VERIFY USER A CAN STILL ACCESS THEIR DATA
-- ─────────────────────────────────────────────────────────────────────────
-- Reset session to User A (Owner)
RESET jwt.claims.sub;
RESET jwt.claims.role;
SET LOCAL jwt.claims.sub = '[USER-A-UUID]';
SET LOCAL jwt.claims.role = 'SALES';

-- 4.1: TEST - User A can read their own company
SELECT * FROM companies WHERE id = '[COMPANY-ALPHA-UUID]';
-- ✅ EXPECTED: 1 row (User A owns this company)
-- ❌ FAIL IF: 0 rows (RLS too restrictive)

-- 4.2: TEST - User A can update their own company
UPDATE companies 
SET notes = 'Updated by owner' 
WHERE id = '[COMPANY-ALPHA-UUID]';
-- ✅ EXPECTED: 1 row affected
-- ❌ FAIL IF: 0 rows affected (RLS too restrictive)

-- 4.3: TEST - User A can create interactions for their company
INSERT INTO interactions (
  company_id, 
  user_id, 
  type, 
  subject,
  direction
) VALUES (
  '[COMPANY-ALPHA-UUID]',
  '[USER-A-UUID]',
  'email',
  'Follow-up email',
  'outbound'
) RETURNING *;
-- ✅ EXPECTED: Insert succeeds, returns new interaction
-- ❌ FAIL IF: Error (RLS blocking owner)

-- 4.4: TEST - User A can read their interactions
SELECT * FROM interactions WHERE company_id = '[COMPANY-ALPHA-UUID]';
-- ✅ EXPECTED: All interactions for Company Alpha
-- ❌ FAIL IF: 0 rows (RLS too restrictive)

-- ─────────────────────────────────────────────────────────────────────────
-- STEP 5: TEST ADMIN ROLE (if applicable)
-- ─────────────────────────────────────────────────────────────────────────
SET LOCAL jwt.claims.sub = '[ADMIN-USER-UUID]';
SET LOCAL jwt.claims.role = 'ADMIN';

-- 5.1: TEST - Admin can see all companies
SELECT COUNT(*) FROM companies;
-- ✅ EXPECTED: Total count of ALL companies (ADMIN has full access)
-- ❌ FAIL IF: Only subset (RLS blocking ADMIN)

-- 5.2: TEST - Admin can update any company
UPDATE companies 
SET notes = 'Admin access verified' 
WHERE id = '[COMPANY-ALPHA-UUID]';
-- ✅ EXPECTED: 1 row affected
-- ❌ FAIL IF: 0 rows (RLS blocking ADMIN)

-- ─────────────────────────────────────────────────────────────────────────
-- STEP 6: CLEANUP TEST DATA
-- ─────────────────────────────────────────────────────────────────────────
-- Reset to service role (full access)
RESET jwt.claims.sub;
RESET jwt.claims.role;

-- Delete test data
DELETE FROM interactions WHERE company_id = '[COMPANY-ALPHA-UUID]';
DELETE FROM projects WHERE company_id = '[COMPANY-ALPHA-UUID]';
DELETE FROM contacts WHERE company_id = '[COMPANY-ALPHA-UUID]';
DELETE FROM companies WHERE id = '[COMPANY-ALPHA-UUID]';

-- Optionally delete test users via Supabase Dashboard

-- ─────────────────────────────────────────────────────────────────────────
-- TEST RESULTS TEMPLATE
-- ─────────────────────────────────────────────────────────────────────────
/*
TEST EXECUTION RESULTS:
Date: [INSERT DATE]
Tester: [INSERT NAME]

User A UUID: [INSERT]
User B UUID: [INSERT]
Company Alpha UUID: [INSERT]

Test 3.2 - Read Company (User B): [ ] PASS [ ] FAIL
Test 3.3 - List Companies (User B): [ ] PASS [ ] FAIL
Test 3.4 - Update Company (User B): [ ] PASS [ ] FAIL
Test 3.5 - Delete Company (User B): [ ] PASS [ ] FAIL
Test 3.6 - Insert Interaction (User B): [ ] PASS [ ] FAIL
Test 3.7 - Read Interactions (User B): [ ] PASS [ ] FAIL
Test 3.8 - Read Projects (User B): [ ] PASS [ ] FAIL
Test 3.9 - Read Contacts (User B): [ ] PASS [ ] FAIL

Test 4.1 - Read Own Company (User A): [ ] PASS [ ] FAIL
Test 4.2 - Update Own Company (User A): [ ] PASS [ ] FAIL
Test 4.3 - Insert Own Interaction (User A): [ ] PASS [ ] FAIL
Test 4.4 - Read Own Interactions (User A): [ ] PASS [ ] FAIL

Test 5.1 - Admin See All (ADMIN): [ ] PASS [ ] FAIL
Test 5.2 - Admin Update Any (ADMIN): [ ] PASS [ ] FAIL

OVERALL RESULT: [ ] ALL TESTS PASSED [ ] SOME FAILED

Notes:
[INSERT ANY OBSERVATIONS]

Issues Found:
[INSERT ANY SECURITY ISSUES]
*/

-- ═══════════════════════════════════════════════════════════════════════════
-- END OF RLS TEST PLAN
-- ═══════════════════════════════════════════════════════════════════════════
