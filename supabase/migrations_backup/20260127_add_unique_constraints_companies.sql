-- =============================================
-- ADD UNIQUE CONSTRAINTS TO COMPANIES TABLE
-- Created: January 27, 2026
-- Purpose: Prevent duplicate companies (name & KVK)
-- =============================================

-- =============================================
-- STEP 1: Clean up existing duplicates (if any)
-- =============================================

-- Find and mark duplicate companies by name (case-insensitive)
-- Keep oldest, flag others for review
DO $$
DECLARE
  duplicate_record RECORD;
BEGIN
  FOR duplicate_record IN 
    SELECT LOWER(name) as lower_name, MIN(created_at) as first_created
    FROM companies
    WHERE name IS NOT NULL
    GROUP BY LOWER(name)
    HAVING COUNT(*) > 1
  LOOP
    -- Log duplicates (for manual review if needed)
    RAISE NOTICE 'Duplicate company name found: %, first created: %', 
                 duplicate_record.lower_name, 
                 duplicate_record.first_created;
    
    -- Optionally: Update duplicate names by appending (OLD) or ID
    -- UPDATE companies 
    -- SET name = name || ' (DUPLICATE ' || id::text || ')'
    -- WHERE LOWER(name) = duplicate_record.lower_name
    --   AND created_at > duplicate_record.first_created;
  END LOOP;
END $$;

-- =============================================
-- STEP 2: Add UNIQUE constraint on KVK number
-- =============================================

-- First check if constraint already exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'companies_kvk_number_key'
  ) THEN
    -- Add UNIQUE constraint (NULL values allowed, multiples NULLs ok)
    ALTER TABLE companies 
    ADD CONSTRAINT companies_kvk_number_key 
    UNIQUE (kvk_number);
    
    RAISE NOTICE 'Added UNIQUE constraint on kvk_number';
  ELSE
    RAISE NOTICE 'UNIQUE constraint on kvk_number already exists';
  END IF;
END $$;

-- =============================================
-- STEP 3: Add case-insensitive UNIQUE index on name
-- =============================================

-- Drop index if exists (for re-running migration)
DROP INDEX IF EXISTS companies_name_unique_idx;

-- Create case-insensitive UNIQUE index
-- This prevents: "Acme BV" and "ACME BV" from both existing
CREATE UNIQUE INDEX companies_name_unique_idx 
ON companies (LOWER(name));

-- =============================================
-- STEP 4: Add helpful comment
-- =============================================

COMMENT ON INDEX companies_name_unique_idx IS 
'Case-insensitive unique constraint on company name. Prevents duplicates like "Acme BV" and "ACME BV".';

COMMENT ON CONSTRAINT companies_kvk_number_key ON companies IS
'Ensures KVK numbers are unique across all companies.';

-- =============================================
-- VERIFICATION QUERIES (for testing)
-- =============================================

-- Check if constraints are active
DO $$
BEGIN
  -- Verify KVK constraint
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'companies_kvk_number_key'
  ) THEN
    RAISE NOTICE '✅ KVK number UNIQUE constraint is active';
  ELSE
    RAISE WARNING '❌ KVK number UNIQUE constraint NOT found';
  END IF;
  
  -- Verify name unique index
  IF EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE indexname = 'companies_name_unique_idx'
  ) THEN
    RAISE NOTICE '✅ Company name case-insensitive UNIQUE index is active';
  ELSE
    RAISE WARNING '❌ Company name UNIQUE index NOT found';
  END IF;
END $$;

-- =============================================
-- ROLLBACK SCRIPT (if needed)
-- =============================================
-- To rollback this migration:
-- DROP INDEX IF EXISTS companies_name_unique_idx;
-- ALTER TABLE companies DROP CONSTRAINT IF EXISTS companies_kvk_number_key;
