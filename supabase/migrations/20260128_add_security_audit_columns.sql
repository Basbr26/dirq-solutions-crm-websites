-- Migration: Add security audit columns for quote signatures
-- Date: 2026-01-28
-- Purpose: Fix P0 security issues from audit report

-- Add IP logging columns for provider signature
ALTER TABLE quotes 
ADD COLUMN IF NOT EXISTS provider_signed_by_ip VARCHAR(50),
ADD COLUMN IF NOT EXISTS provider_signed_by UUID REFERENCES profiles(id);

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_quotes_provider_signed_by ON quotes(provider_signed_by);
CREATE INDEX IF NOT EXISTS idx_quotes_sign_token ON quotes(sign_token) WHERE sign_token IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN quotes.provider_signed_by_ip IS 'IP address of provider when signing (audit/legal requirement)';
COMMENT ON COLUMN quotes.provider_signed_by IS 'User ID of provider who signed the quote';

-- Existing sign_token and sign_token_expires_at columns are already present
-- They will be set to NULL after signature to prevent replay attacks
