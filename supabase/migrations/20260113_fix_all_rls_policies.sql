-- =============================================
-- RLS POLICIES FIX - COMPREHENSIVE
-- Created: January 13, 2026
-- Purpose: Fix all RLS policy issues reported
-- Issues:
--   1. Companies cannot be deleted
--   2. Activities (interactions) cannot be created
--   3. Contacts cannot be created  
--   4. Quotes cannot be created
-- =============================================

BEGIN;

-- =============================================
-- 1. FIX COMPANIES DELETE POLICY
-- =============================================
-- Allow ADMIN, MANAGER, and SALES (owner) to delete companies

DROP POLICY IF EXISTS "Companies delete policy" ON companies;

CREATE POLICY "Companies delete policy"
  ON companies FOR DELETE
  TO authenticated
  USING (
    -- Owner can always delete their own companies
    owner_id = auth.uid()
    -- OR user is ADMIN/MANAGER (check role directly from profiles)
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('ADMIN', 'MANAGER', 'super_admin')
    )
  );

-- =============================================
-- 2. FIX INTERACTIONS INSERT POLICY
-- =============================================
-- Simplify: If you can SEE a company, you can add interactions
-- All authenticated users can create interactions for visible entities

DROP POLICY IF EXISTS "Interactions insert policy" ON interactions;

CREATE POLICY "Interactions insert policy"
  ON interactions FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND (
      -- Standalone interaction (no company)
      company_id IS NULL
      
      -- OR interaction linked to a company you can see
      OR EXISTS (
        SELECT 1 FROM companies 
        WHERE companies.id = interactions.company_id
      )
      
      -- OR interaction linked to a lead/project (if lead_id column exists)
      OR (
        CASE 
          WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'interactions' 
            AND column_name = 'lead_id'
          ) 
          THEN lead_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM projects 
            WHERE projects.id = interactions.lead_id
          )
          ELSE FALSE
        END
      )
    )
  );

-- =============================================
-- 3. FIX CONTACTS INSERT POLICY  
-- =============================================
-- Simplified: All authenticated users with proper role can create contacts

DROP POLICY IF EXISTS "Contacts insert policy" ON contacts;

CREATE POLICY "Contacts insert policy"
  ON contacts FOR INSERT
  TO authenticated
  WITH CHECK (
    owner_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('ADMIN', 'SALES', 'MANAGER', 'SUPPORT', 'super_admin')
    )
  );

-- =============================================
-- 4. FIX QUOTES INSERT POLICY
-- =============================================
-- SALES, MANAGER, and ADMIN can create quotes
-- Note: quotes table might not exist yet, skip if missing

DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'quotes') THEN
    DROP POLICY IF EXISTS "Quotes insert policy" ON quotes;
    
    -- Check which owner column exists (created_by or owner_id)
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'quotes' AND column_name = 'created_by'
    ) THEN
      CREATE POLICY "Quotes insert policy"
        ON quotes FOR INSERT
        TO authenticated
        WITH CHECK (
          created_by = auth.uid()
          AND EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('ADMIN', 'SALES', 'MANAGER', 'super_admin')
          )
        );
    ELSIF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'quotes' AND column_name = 'owner_id'
    ) THEN
      CREATE POLICY "Quotes insert policy"
        ON quotes FOR INSERT
        TO authenticated
        WITH CHECK (
          owner_id = auth.uid()
          AND EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('ADMIN', 'SALES', 'MANAGER', 'super_admin')
          )
        );
    ELSE
      -- No owner column, just check role
      CREATE POLICY "Quotes insert policy"
        ON quotes FOR INSERT
        TO authenticated
        WITH CHECK (
          EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('ADMIN', 'SALES', 'MANAGER', 'super_admin')
          )
        );
    END IF;
  END IF;
END $$;

-- =============================================
-- VERIFICATION QUERIES
-- =============================================

DO $$
DECLARE
  companies_delete_exists BOOLEAN;
  interactions_insert_exists BOOLEAN;
  contacts_insert_exists BOOLEAN;
  quotes_insert_exists BOOLEAN;
BEGIN
  -- Check if policies exist
  SELECT EXISTS(
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'companies' 
    AND policyname = 'Companies delete policy'
  ) INTO companies_delete_exists;
  
  SELECT EXISTS(
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'interactions' 
    AND policyname = 'Interactions insert policy'
  ) INTO interactions_insert_exists;
  
  SELECT EXISTS(
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'contacts' 
    AND policyname = 'Contacts insert policy'
  ) INTO contacts_insert_exists;
  
  SELECT EXISTS(
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'quotes' 
    AND policyname = 'Quotes insert policy'
  ) INTO quotes_insert_exists;
  
  -- Report results
  RAISE NOTICE '';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'RLS POLICIES FIX - VERIFICATION RESULTS';
  RAISE NOTICE '============================================';
  
  IF companies_delete_exists THEN
    RAISE NOTICE '✅ Companies DELETE policy: FIXED';
  ELSE
    RAISE WARNING '❌ Companies DELETE policy: FAILED';
  END IF;
  
  IF interactions_insert_exists THEN
    RAISE NOTICE '✅ Interactions INSERT policy: FIXED';
  ELSE
    RAISE WARNING '❌ Interactions INSERT policy: FAILED';
  END IF;
  
  IF contacts_insert_exists THEN
    RAISE NOTICE '✅ Contacts INSERT policy: FIXED';
  ELSE
    RAISE WARNING '❌ Contacts INSERT policy: FAILED';
  END IF;
  
  IF quotes_insert_exists THEN
    RAISE NOTICE '✅ Quotes INSERT policy: FIXED';
  ELSE
    RAISE WARNING '❌ Quotes INSERT policy: FAILED';
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE 'Summary:';
  RAISE NOTICE '- Bedrijven verwijderen: ADMIN, MANAGER, or owner';
  RAISE NOTICE '- Activiteiten toevoegen: Any authenticated user for visible companies/projects';
  RAISE NOTICE '- Contactpersonen toevoegen: ADMIN, SALES, MANAGER, SUPPORT';
  RAISE NOTICE '- Offertes maken: ADMIN, SALES, MANAGER';
  RAISE NOTICE '============================================';
  RAISE NOTICE '';
END $$;

COMMIT;
