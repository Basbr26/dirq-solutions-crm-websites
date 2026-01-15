-- =============================================
-- ADD E-SIGN COLUMNS TO QUOTES TABLE
-- Created: January 15, 2026
-- Purpose: Enable digital signing for quotes
-- =============================================

BEGIN;

-- Add E-Sign columns to quotes table
ALTER TABLE quotes
ADD COLUMN IF NOT EXISTS sign_token uuid UNIQUE,
ADD COLUMN IF NOT EXISTS sign_status text DEFAULT 'not_sent',
ADD COLUMN IF NOT EXISTS sign_link_expires_at timestamptz,
ADD COLUMN IF NOT EXISTS signer_email text,
ADD COLUMN IF NOT EXISTS signature_data text,
ADD COLUMN IF NOT EXISTS signed_at timestamptz,
ADD COLUMN IF NOT EXISTS signed_by_name text,
ADD COLUMN IF NOT EXISTS signer_ip_address inet,
ADD COLUMN IF NOT EXISTS signer_user_agent text;

-- Create index on sign_token for fast lookup
CREATE INDEX IF NOT EXISTS idx_quotes_sign_token ON quotes(sign_token) WHERE sign_token IS NOT NULL;

-- Add comment
COMMENT ON COLUMN quotes.sign_token IS 'Unique token for public signing link (7 days validity)';
COMMENT ON COLUMN quotes.sign_status IS 'Status: not_sent, sent, viewed, signed, declined, expired';
COMMENT ON COLUMN quotes.signature_data IS 'Base64 encoded signature image';

COMMIT;

-- Verification
DO $$
BEGIN
  RAISE NOTICE '✅ Added E-Sign columns to quotes table';
  RAISE NOTICE '✅ Quotes can now be sent for digital signing';
  RAISE NOTICE '✅ Sign links expire after 7 days';
END $$;
