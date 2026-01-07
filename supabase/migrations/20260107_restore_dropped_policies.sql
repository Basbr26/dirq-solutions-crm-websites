-- =============================================
-- RESTORE DROPPED RLS POLICIES
-- =============================================
-- Datum: 7 januari 2026
-- Doel: Herstel policies die verwijderd zijn door CASCADE drops
-- Reden: get_user_role(text) CASCADE drop heeft policies verwijderd
-- =============================================

BEGIN;

-- =============================================
-- COMPANIES POLICIES (Herstellen)
-- =============================================

-- DROP bestaande policies (voor zekerheid)
DROP POLICY IF EXISTS "Companies select policy" ON companies;
DROP POLICY IF EXISTS "Companies insert policy" ON companies;
DROP POLICY IF EXISTS "Companies update policy" ON companies;
DROP POLICY IF EXISTS "Companies delete policy" ON companies;

-- Enable RLS (voor zekerheid)
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

-- SELECT: All authenticated users can see all companies
CREATE POLICY "Companies select policy"
  ON companies FOR SELECT
  TO authenticated
  USING (true);

-- INSERT:
-- - ADMIN, SALES, MANAGER can create companies
-- - Auto-assign to creator
CREATE POLICY "Companies insert policy"
  ON companies FOR INSERT
  TO authenticated
  WITH CHECK (
    get_user_role() IN ('ADMIN', 'SALES', 'MANAGER')
    AND owner_id = auth.uid()
  );

-- UPDATE:
-- - ADMIN & MANAGER: Can update all companies
-- - SALES: Can update their own companies
CREATE POLICY "Companies update policy"
  ON companies FOR UPDATE
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
-- - Only ADMIN can delete companies
CREATE POLICY "Companies delete policy"
  ON companies FOR DELETE
  TO authenticated
  USING (get_user_role() = 'ADMIN');

-- =============================================
-- CONTACTS POLICIES (Herstellen)
-- =============================================

-- DROP bestaande policies (voor zekerheid)
DROP POLICY IF EXISTS "Contacts select policy" ON contacts;
DROP POLICY IF EXISTS "Contacts insert policy" ON contacts;
DROP POLICY IF EXISTS "Contacts update policy" ON contacts;
DROP POLICY IF EXISTS "Contacts delete policy" ON contacts;

-- Enable RLS (voor zekerheid)
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;

-- SELECT:
-- - ADMIN & MANAGER: See all contacts
-- - SALES & SUPPORT: See contacts they own OR contacts of companies they own
CREATE POLICY "Contacts select policy"
  ON contacts FOR SELECT
  TO authenticated
  USING (
    is_admin_or_manager()
    OR owner_id = auth.uid()
    OR company_id IN (
      SELECT id FROM companies WHERE owner_id = auth.uid()
    )
  );

-- INSERT:
-- - ADMIN, SALES, MANAGER can create contacts
-- - Must own the related company (if company_id provided)
CREATE POLICY "Contacts insert policy"
  ON contacts FOR INSERT
  TO authenticated
  WITH CHECK (
    get_user_role() IN ('ADMIN', 'SALES', 'MANAGER')
    AND owner_id = auth.uid()
    AND (
      company_id IS NULL
      OR is_admin_or_manager()
      OR company_id IN (SELECT id FROM companies WHERE owner_id = auth.uid())
    )
  );

-- UPDATE:
-- - ADMIN & MANAGER: Update all contacts
-- - SALES: Update own contacts or contacts of companies they own
CREATE POLICY "Contacts update policy"
  ON contacts FOR UPDATE
  TO authenticated
  USING (
    is_admin_or_manager()
    OR owner_id = auth.uid()
    OR company_id IN (
      SELECT id FROM companies WHERE owner_id = auth.uid()
    )
  )
  WITH CHECK (
    is_admin_or_manager()
    OR owner_id = auth.uid()
    OR company_id IN (
      SELECT id FROM companies WHERE owner_id = auth.uid()
    )
  );

-- DELETE:
-- - ADMIN: Delete any contact
-- - MANAGER: Delete any contact
-- - SALES: Delete own contacts
CREATE POLICY "Contacts delete policy"
  ON contacts FOR DELETE
  TO authenticated
  USING (
    is_admin_or_manager()
    OR owner_id = auth.uid()
  );

-- =============================================
-- VERIFICATIE QUERIES
-- =============================================

-- Check policy count per tabel
DO $$
DECLARE
  r RECORD;
BEGIN
  RAISE NOTICE '=== POLICY COUNT PER TABLE ===';
  FOR r IN
    SELECT 
      tablename, 
      COUNT(*) as policy_count
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN ('companies', 'contacts', 'deals', 'activities', 'projects', 'crm_audit_log')
    GROUP BY tablename
    ORDER BY tablename
  LOOP
    RAISE NOTICE 'Table: % - Policies: %', r.tablename, r.policy_count;
  END LOOP;
END $$;

-- Check RLS is enabled
DO $$
DECLARE
  r RECORD;
BEGIN
  RAISE NOTICE '=== RLS STATUS ===';
  FOR r IN
    SELECT 
      schemaname, 
      tablename, 
      rowsecurity as rls_enabled
    FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename IN ('companies', 'contacts')
    ORDER BY tablename
  LOOP
    RAISE NOTICE 'Table: %.% - RLS: %', r.schemaname, r.tablename, r.rls_enabled;
  END LOOP;
END $$;

COMMIT;

-- =============================================
-- SUCCESS MESSAGE
-- =============================================

DO $$
BEGIN
  RAISE NOTICE '✅ RLS Policies restored for companies and contacts';
  RAISE NOTICE '';
  RAISE NOTICE 'Expected policies:';
  RAISE NOTICE '- companies: 4 policies (select, insert, update, delete)';
  RAISE NOTICE '- contacts: 4 policies (select, insert, update, delete)';
  RAISE NOTICE '';
  RAISE NOTICE 'Next step: Test application functionality';
END $$;
