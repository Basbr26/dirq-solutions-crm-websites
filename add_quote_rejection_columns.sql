-- Add rejection tracking columns to quotes table
-- Run this migration to support quote rejection flow

ALTER TABLE quotes 
ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS rejected_by_name TEXT;

-- Add comment for documentation
COMMENT ON COLUMN quotes.rejection_reason IS 'Customer feedback when quote is rejected';
COMMENT ON COLUMN quotes.rejected_at IS 'Timestamp when quote was rejected';
COMMENT ON COLUMN quotes.rejected_by_name IS 'Name of person who rejected the quote';
