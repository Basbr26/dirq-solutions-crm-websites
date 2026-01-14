-- =============================================
-- ADD QUOTE_ID TO INTERACTIONS
-- Created: January 15, 2026
-- Issue: Interactions created for quotes don't show under quote detail page
-- Solution: Add quote_id foreign key to interactions table
-- =============================================

BEGIN;

-- Step 1: Add quote_id column to interactions
ALTER TABLE interactions
ADD COLUMN IF NOT EXISTS quote_id UUID REFERENCES quotes(id) ON DELETE CASCADE;

-- Step 2: Create index for quote_id
CREATE INDEX IF NOT EXISTS idx_interactions_quote_id ON interactions(quote_id);

-- Step 3: Update the check constraint to allow interactions without company_id
-- if they have a quote_id (quotes already have company_id)
ALTER TABLE interactions
DROP CONSTRAINT IF EXISTS interactions_entity_check;

ALTER TABLE interactions
ADD CONSTRAINT interactions_entity_check CHECK (
  company_id IS NOT NULL OR 
  contact_id IS NOT NULL OR 
  lead_id IS NOT NULL OR 
  quote_id IS NOT NULL
);

COMMIT;

-- Verification
DO $$
DECLARE
  column_exists BOOLEAN;
  index_exists BOOLEAN;
BEGIN
  -- Check if column was added
  SELECT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'interactions' 
    AND column_name = 'quote_id'
  ) INTO column_exists;
  
  -- Check if index was created
  SELECT EXISTS (
    SELECT 1 
    FROM pg_indexes 
    WHERE tablename = 'interactions' 
    AND indexname = 'idx_interactions_quote_id'
  ) INTO index_exists;
  
  IF column_exists AND index_exists THEN
    RAISE NOTICE '✅ Added quote_id column to interactions table';
    RAISE NOTICE '✅ Created index idx_interactions_quote_id';
    RAISE NOTICE '✅ Updated entity check constraint';
    RAISE NOTICE '📝 Interactions can now be linked to quotes';
  ELSE
    RAISE WARNING '⚠️ Migration may not have completed successfully';
  END IF;
END $$;
