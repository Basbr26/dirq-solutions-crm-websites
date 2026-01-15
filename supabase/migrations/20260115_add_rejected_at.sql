-- Add missing rejected_at column to quotes table
ALTER TABLE quotes
ADD COLUMN IF NOT EXISTS rejected_at timestamptz;

COMMENT ON COLUMN quotes.rejected_at IS 'Timestamp when quote was rejected by customer';
