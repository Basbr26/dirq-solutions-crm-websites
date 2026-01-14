-- =============================================
-- CONTACTS PRIMARY CONTACT CONSTRAINT
-- Created: January 15, 2026
-- Issue: Multiple contacts can be marked as primary for same company
-- Solution: Add unique constraint + trigger to ensure only 1 primary per company
-- =============================================

BEGIN;

-- Step 1: Fix any existing duplicate primary contacts
-- Keep the most recently updated one as primary, set others to false
WITH ranked_primaries AS (
  SELECT 
    id,
    company_id,
    ROW_NUMBER() OVER (
      PARTITION BY company_id 
      ORDER BY updated_at DESC, created_at DESC
    ) as rn
  FROM contacts
  WHERE is_primary = true
    AND company_id IS NOT NULL
)
UPDATE contacts
SET 
  is_primary = false,
  updated_at = NOW()
WHERE id IN (
  SELECT id 
  FROM ranked_primaries 
  WHERE rn > 1
);

-- Step 2: Create unique partial index
-- This ensures only one primary contact per company
CREATE UNIQUE INDEX idx_contacts_one_primary_per_company
  ON contacts (company_id)
  WHERE is_primary = true AND company_id IS NOT NULL;

-- Step 3: Create trigger function to auto-unset previous primary
CREATE OR REPLACE FUNCTION ensure_one_primary_contact()
RETURNS TRIGGER AS $$
BEGIN
  -- If setting a contact as primary
  IF NEW.is_primary = true AND NEW.company_id IS NOT NULL THEN
    -- Unset any other primary contacts for this company
    UPDATE contacts
    SET is_primary = false
    WHERE company_id = NEW.company_id
      AND id != NEW.id
      AND is_primary = true;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 4: Attach trigger to contacts table
DROP TRIGGER IF EXISTS trigger_ensure_one_primary_contact ON contacts;

CREATE TRIGGER trigger_ensure_one_primary_contact
  BEFORE INSERT OR UPDATE OF is_primary, company_id
  ON contacts
  FOR EACH ROW
  EXECUTE FUNCTION ensure_one_primary_contact();

COMMIT;

-- Verification
DO $$
DECLARE
  duplicate_count INTEGER;
BEGIN
  -- Check for any remaining duplicates
  SELECT COUNT(*) INTO duplicate_count
  FROM (
    SELECT company_id, COUNT(*) as cnt
    FROM contacts
    WHERE is_primary = true
      AND company_id IS NOT NULL
    GROUP BY company_id
    HAVING COUNT(*) > 1
  ) duplicates;
  
  IF duplicate_count > 0 THEN
    RAISE WARNING '⚠️ Found % companies with multiple primary contacts!', duplicate_count;
  ELSE
    RAISE NOTICE '✅ Primary contact constraint applied successfully';
    RAISE NOTICE '✅ Unique index created: idx_contacts_one_primary_per_company';
    RAISE NOTICE '✅ Trigger created: trigger_ensure_one_primary_contact';
  END IF;
END $$;
