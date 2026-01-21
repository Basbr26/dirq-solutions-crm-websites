-- ============================================================
-- ADD PROVIDER SIGNATURE COLUMNS TO QUOTES TABLE
-- ============================================================
-- This migration adds fields to store provider (leverancier) signatures
-- Allows Dirq Solutions to sign quotes and generate fully signed documents
-- ============================================================

-- Add provider signature columns
ALTER TABLE quotes 
ADD COLUMN IF NOT EXISTS provider_signature_data TEXT,
ADD COLUMN IF NOT EXISTS provider_signed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS provider_signed_document_url TEXT;

-- Add comments for documentation
COMMENT ON COLUMN quotes.provider_signature_data IS 
'Base64 encoded PNG signature from provider (Dirq Solutions)';

COMMENT ON COLUMN quotes.provider_signed_at IS 
'Timestamp when provider signed the quote';

COMMENT ON COLUMN quotes.provider_signed_document_url IS 
'Public URL to fully signed PDF document (with both customer and provider signatures)';

-- Verification query
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns
WHERE table_name = 'quotes' 
  AND column_name LIKE '%provider%'
ORDER BY ordinal_position;

-- Should show:
-- provider_signature_data | text | YES
-- provider_signed_at | timestamp with time zone | YES
-- provider_signed_document_url | text | YES
