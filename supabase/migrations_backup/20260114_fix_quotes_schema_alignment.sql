-- =============================================
-- FIX QUOTES SCHEMA ALIGNMENT
-- Created: January 14, 2026
-- Issue: Missing columns causing "not in schema cache" errors
-- Solution: Add missing columns to align with code expectations
-- =============================================

BEGIN;

-- 1. Add payment_terms if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'quotes' 
    AND column_name = 'payment_terms'
  ) THEN
    ALTER TABLE quotes ADD COLUMN payment_terms TEXT;
    RAISE NOTICE '✅ Added payment_terms column to quotes table';
  ELSE
    RAISE NOTICE 'ℹ️  payment_terms column already exists';
  END IF;
END $$;

-- 2. Add delivery_time if it doesn't exist (might already exist from previous migration)
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

-- 3. Add client_notes if it doesn't exist (might already exist from previous migration)
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

-- 4. Rename created_by to owner_id if created_by exists
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'quotes' 
    AND column_name = 'created_by'
  ) THEN
    -- Rename the column
    ALTER TABLE quotes RENAME COLUMN created_by TO owner_id;
    RAISE NOTICE '✅ Renamed created_by to owner_id in quotes table';
    
    -- Update foreign key constraint name if it exists
    IF EXISTS (
      SELECT 1 FROM pg_constraint 
      WHERE conname = 'quotes_created_by_fkey'
    ) THEN
      ALTER TABLE quotes RENAME CONSTRAINT quotes_created_by_fkey TO quotes_owner_id_fkey;
      RAISE NOTICE '✅ Renamed FK constraint quotes_created_by_fkey to quotes_owner_id_fkey';
    END IF;
    
    -- Update index if it exists
    IF EXISTS (
      SELECT 1 FROM pg_indexes 
      WHERE indexname = 'idx_quotes_created_by'
    ) THEN
      ALTER INDEX idx_quotes_created_by RENAME TO idx_quotes_owner_id;
      RAISE NOTICE '✅ Renamed index idx_quotes_created_by to idx_quotes_owner_id';
    END IF;
  ELSE
    RAISE NOTICE 'ℹ️  Column created_by does not exist (probably already owner_id)';
  END IF;
END $$;

-- 5. Ensure owner_id exists (in case the table was created without it)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'quotes' 
    AND column_name = 'owner_id'
  ) THEN
    -- This should not happen, but just in case
    ALTER TABLE quotes ADD COLUMN owner_id UUID REFERENCES profiles(id) ON DELETE RESTRICT;
    RAISE NOTICE '✅ Added owner_id column to quotes table';
  ELSE
    RAISE NOTICE '✅ owner_id column exists';
  END IF;
END $$;

-- 5a. Add missing FK constraint for contact_id
DO $$ 
BEGIN
  -- Check if the FK constraint exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'quotes_contact_id_fkey'
  ) THEN
    -- Add the FK constraint
    ALTER TABLE quotes 
    ADD CONSTRAINT quotes_contact_id_fkey 
    FOREIGN KEY (contact_id) 
    REFERENCES contacts(id) 
    ON DELETE SET NULL;
    RAISE NOTICE '✅ Added quotes_contact_id_fkey constraint';
  ELSE
    RAISE NOTICE 'ℹ️  quotes_contact_id_fkey constraint already exists';
  END IF;
END $$;

-- 6. Add currency column if missing
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'quotes' 
    AND column_name = 'currency'
  ) THEN
    ALTER TABLE quotes ADD COLUMN currency TEXT DEFAULT 'EUR';
    RAISE NOTICE '✅ Added currency column to quotes table';
  ELSE
    RAISE NOTICE 'ℹ️  currency column already exists';
  END IF;
END $$;

-- 7. Verification - List all columns
DO $$
DECLARE
  missing_columns TEXT[] := ARRAY[]::TEXT[];
  expected_columns TEXT[] := ARRAY[
    'id', 'quote_number', 'company_id', 'contact_id', 'project_id',
    'title', 'description', 'status', 'valid_until',
    'subtotal', 'tax_rate', 'tax_amount', 'total_amount', 'currency',
    'owner_id', 'payment_terms', 'delivery_time',
    'notes', 'client_notes',
    'created_at', 'updated_at',
    'sent_at', 'viewed_at', 'accepted_at', 'rejected_at'
  ];
  col TEXT;
BEGIN
  FOREACH col IN ARRAY expected_columns
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'quotes' AND column_name = col
    ) THEN
      missing_columns := array_append(missing_columns, col);
    END IF;
  END LOOP;
  
  IF array_length(missing_columns, 1) > 0 THEN
    RAISE WARNING '❌ Missing columns in quotes table: %', array_to_string(missing_columns, ', ');
  ELSE
    RAISE NOTICE '✅ All expected quotes columns present';
  END IF;
  
  -- List actual columns
  RAISE NOTICE 'Actual columns in quotes table:';
  FOR col IN 
    SELECT column_name 
    FROM information_schema.columns 
    WHERE table_name = 'quotes' 
    ORDER BY ordinal_position
  LOOP
    RAISE NOTICE '  - %', col;
  END LOOP;
END $$;

-- 8. Comments for documentation
COMMENT ON COLUMN quotes.payment_terms IS 'Payment terms (e.g., "50% upfront, 50% on delivery")';
COMMENT ON COLUMN quotes.delivery_time IS 'Estimated delivery time (e.g., "6-8 weeks")';
COMMENT ON COLUMN quotes.client_notes IS 'Internal notes about client feedback';
COMMENT ON COLUMN quotes.owner_id IS 'User who created/owns the quote';

-- =============================================
-- 9. FIX QUOTE ITEMS TABLE NAME
-- =============================================
-- The code expects 'quote_items' but INIT database has 'quote_line_items'

DO $$ 
BEGIN
  -- Check if quote_line_items exists but quote_items doesn't
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'quote_line_items'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'quote_items'
  ) THEN
    -- Rename the table
    ALTER TABLE quote_line_items RENAME TO quote_items;
    RAISE NOTICE '✅ Renamed quote_line_items to quote_items';
    
    -- Rename the index
    IF EXISTS (
      SELECT 1 FROM pg_indexes 
      WHERE indexname = 'idx_quote_line_items_quote_id'
    ) THEN
      ALTER INDEX idx_quote_line_items_quote_id RENAME TO idx_quote_items_quote_id;
      RAISE NOTICE '✅ Renamed index idx_quote_line_items_quote_id to idx_quote_items_quote_id';
    END IF;
  ELSIF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'quote_items'
  ) THEN
    RAISE NOTICE '✅ quote_items table already exists';
  ELSE
    RAISE WARNING '❌ Neither quote_items nor quote_line_items table exists!';
  END IF;
END $$;

-- =============================================
-- 10. ADD MISSING COLUMNS TO QUOTE_ITEMS
-- =============================================

-- Add title column if it doesn't exist (INIT schema only has description)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'quote_items' 
    AND column_name = 'title'
  ) THEN
    ALTER TABLE quote_items ADD COLUMN title TEXT;
    RAISE NOTICE '✅ Added title column to quote_items table';
    
    -- Migrate description to title if title is empty
    UPDATE quote_items SET title = description WHERE title IS NULL OR title = '';
    
    -- Make title NOT NULL after migration
    ALTER TABLE quote_items ALTER COLUMN title SET NOT NULL;
    RAISE NOTICE '✅ Migrated description to title and made title NOT NULL';
  ELSE
    RAISE NOTICE 'ℹ️  title column already exists in quote_items';
  END IF;
END $$;

-- Ensure description can be NULL (it's optional in the code)
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'quote_items' 
    AND column_name = 'description'
    AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE quote_items ALTER COLUMN description DROP NOT NULL;
    RAISE NOTICE '✅ Made description column nullable in quote_items';
  ELSE
    RAISE NOTICE 'ℹ️  description column already nullable or doesn''t exist';
  END IF;
END $$;

-- Add item_order column if it doesn't exist (INIT schema has sort_order)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'quote_items' 
    AND column_name = 'item_order'
  ) THEN
    -- Check if we have sort_order to migrate from
    IF EXISTS (
      SELECT 1 
      FROM information_schema.columns 
      WHERE table_name = 'quote_items' 
      AND column_name = 'sort_order'
    ) THEN
      ALTER TABLE quote_items RENAME COLUMN sort_order TO item_order;
      RAISE NOTICE '✅ Renamed sort_order to item_order in quote_items';
    ELSE
      ALTER TABLE quote_items ADD COLUMN item_order INTEGER NOT NULL DEFAULT 0;
      RAISE NOTICE '✅ Added item_order column to quote_items table';
    END IF;
  ELSE
    RAISE NOTICE 'ℹ️  item_order column already exists in quote_items';
  END IF;
END $$;

-- Add category column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'quote_items' 
    AND column_name = 'category'
  ) THEN
    ALTER TABLE quote_items ADD COLUMN category TEXT;
    RAISE NOTICE '✅ Added category column to quote_items table';
  ELSE
    RAISE NOTICE 'ℹ️  category column already exists in quote_items';
  END IF;
END $$;

-- Add index on item_order if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE indexname = 'idx_quote_items_order'
  ) THEN
    CREATE INDEX idx_quote_items_order ON quote_items(quote_id, item_order);
    RAISE NOTICE '✅ Created index idx_quote_items_order';
  ELSE
    RAISE NOTICE 'ℹ️  Index idx_quote_items_order already exists';
  END IF;
END $$;

-- =============================================
-- 11. VERIFICATION - QUOTE_ITEMS
-- =============================================
DO $$
DECLARE
  missing_columns TEXT[] := ARRAY[]::TEXT[];
  expected_columns TEXT[] := ARRAY[
    'id', 'quote_id', 'item_order', 'title', 'description',
    'quantity', 'unit_price', 'total_price', 'category', 'created_at'
  ];
  col TEXT;
BEGIN
  FOREACH col IN ARRAY expected_columns
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'quote_items' AND column_name = col
    ) THEN
      missing_columns := array_append(missing_columns, col);
    END IF;
  END LOOP;
  
  IF array_length(missing_columns, 1) > 0 THEN
    RAISE WARNING '❌ Missing columns in quote_items table: %', array_to_string(missing_columns, ', ');
  ELSE
    RAISE NOTICE '✅ All expected quote_items columns present';
  END IF;
END $$;

COMMIT;
