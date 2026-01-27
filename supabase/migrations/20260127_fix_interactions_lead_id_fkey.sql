-- ============================================================================
-- FIX: interactions_lead_id_fkey Foreign Key Constraint
-- ============================================================================
-- Issue: "insert or update on table interactions violates foreign key 
--         constraint interactions_lead_id_fkey"
-- 
-- Root Cause: 
-- - De 'leads' tabel is hernoemd naar 'projects' in eerdere migratie
-- - Maar interactions.lead_id FK constraint verwijst nog naar oude 'leads' tabel
-- - Dit geeft constraint violation errors bij het aanmaken van interacties
--
-- Solution:
-- - Drop oude constraint die naar 'leads' verwijst
-- - Create nieuwe constraint die naar 'projects' verwijst
-- - Behoud column naam 'lead_id' voor backwards compatibility met code
-- ============================================================================

BEGIN;

-- Step 1: Check if old constraint exists and drop it
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM pg_constraint 
        WHERE conname = 'interactions_lead_id_fkey'
    ) THEN
        ALTER TABLE interactions 
        DROP CONSTRAINT interactions_lead_id_fkey;
        
        RAISE NOTICE '✅ Dropped old interactions_lead_id_fkey constraint';
    ELSE
        RAISE NOTICE '⚠️  Old constraint interactions_lead_id_fkey not found (already removed?)';
    END IF;
END $$;

-- Step 2: Create new constraint pointing to projects table
-- Note: We keep the column name 'lead_id' for code compatibility
ALTER TABLE interactions
ADD CONSTRAINT interactions_lead_id_fkey 
FOREIGN KEY (lead_id) REFERENCES projects(id) ON DELETE SET NULL;

-- Step 3: Verify the constraint exists
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM pg_constraint 
        WHERE conname = 'interactions_lead_id_fkey'
        AND conrelid = 'interactions'::regclass
    ) THEN
        RAISE NOTICE '✅ Created new interactions_lead_id_fkey → projects(id)';
    ELSE
        RAISE EXCEPTION '❌ Failed to create new foreign key constraint';
    END IF;
END $$;

COMMIT;

-- ============================================================================
-- VERIFICATION QUERY
-- ============================================================================
-- Run this to verify the fix:
/*
SELECT 
    conname AS constraint_name,
    conrelid::regclass AS table_name,
    confrelid::regclass AS referenced_table,
    a.attname AS column_name,
    af.attname AS referenced_column
FROM pg_constraint c
JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY(c.conkey)
JOIN pg_attribute af ON af.attrelid = c.confrelid AND af.attnum = ANY(c.confkey)
WHERE c.conname = 'interactions_lead_id_fkey';
*/
