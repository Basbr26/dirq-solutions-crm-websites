-- =============================================
-- ADD MISSING QUOTES COLUMNS
-- Created: January 14, 2026
-- Issue: delivery_time column missing from quotes table
-- Solution: Add column if not exists
-- =============================================

BEGIN;

-- Add delivery_time column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'quotes' 
    AND column_name = 'delivery_time'
  ) THEN
    ALTER TABLE quotes ADD COLUMN delivery_time TEXT;
    RAISE NOTICE '✅ Added delivery_time column to quotes table';
  ELSE
    RAISE NOTICE 'ℹ️  delivery_time column already exists';
  END IF;
END $$;

-- Add client_notes column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'quotes' 
    AND column_name = 'client_notes'
  ) THEN
    ALTER TABLE quotes ADD COLUMN client_notes TEXT;
    RAISE NOTICE '✅ Added client_notes column to quotes table';
  ELSE
    RAISE NOTICE 'ℹ️  client_notes column already exists';
  END IF;
END $$;

-- Verification
DO $$
DECLARE
  missing_columns TEXT[] := ARRAY[]::TEXT[];
BEGIN
  -- Check for delivery_time
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'quotes' AND column_name = 'delivery_time'
  ) THEN
    missing_columns := array_append(missing_columns, 'delivery_time');
  END IF;
  
  -- Check for client_notes
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'quotes' AND column_name = 'client_notes'
  ) THEN
    missing_columns := array_append(missing_columns, 'client_notes');
  END IF;
  
  -- Report results
  IF array_length(missing_columns, 1) > 0 THEN
    RAISE WARNING '❌ Missing columns: %', array_to_string(missing_columns, ', ');
  ELSE
    RAISE NOTICE '✅ All required quotes columns present';
  END IF;
END $$;

COMMIT;
