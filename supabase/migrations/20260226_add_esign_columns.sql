-- ============================================================
-- ADD E-SIGN COLUMNS TO QUOTES TABLE
-- Created: 2026-02-26
-- Purpose: Add missing e-sign and provider signature columns
--          required by handleGenerateSignLink() in QuoteDetailPage
-- ============================================================

-- E-sign kolommen voor offerte-ondertekening (client-side)
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

-- Provider (leverancier) handtekening kolommen
ALTER TABLE quotes
  ADD COLUMN IF NOT EXISTS provider_signature_data text,
  ADD COLUMN IF NOT EXISTS provider_signed_at timestamptz,
  ADD COLUMN IF NOT EXISTS provider_signed_document_url text,
  ADD COLUMN IF NOT EXISTS provider_signed_by uuid REFERENCES profiles(id),
  ADD COLUMN IF NOT EXISTS provider_signed_by_ip varchar(50);

-- Indexen
CREATE INDEX IF NOT EXISTS idx_quotes_sign_token ON quotes(sign_token) WHERE sign_token IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_quotes_provider_signed_by ON quotes(provider_signed_by);

-- Verificatie
DO $$
DECLARE
  missing_columns TEXT[] := ARRAY[]::TEXT[];
  expected_columns TEXT[] := ARRAY[
    'sign_token', 'sign_status', 'sign_link_expires_at', 'signer_email',
    'signature_data', 'signed_at', 'signed_by_name', 'signer_ip_address', 'signer_user_agent',
    'provider_signature_data', 'provider_signed_at', 'provider_signed_document_url',
    'provider_signed_by', 'provider_signed_by_ip'
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
    RAISE WARNING '❌ Nog ontbrekende kolommen in quotes: %', array_to_string(missing_columns, ', ');
  ELSE
    RAISE NOTICE '✅ Alle e-sign kolommen aanwezig in quotes tabel';
  END IF;
END $$;
