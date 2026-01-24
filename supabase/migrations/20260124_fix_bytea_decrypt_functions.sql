-- ============================================================
-- FIX BYTEA OVERLOADS - ADD SEARCH_PATH
-- ============================================================
-- The decrypt functions have 2 overloads each (bytea and text)
-- We fixed the text versions, now fix the bytea versions
-- ============================================================

CREATE OR REPLACE FUNCTION public.decrypt_google_access_token(encrypted_token bytea)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  encryption_key TEXT;
  decrypted bytea;
BEGIN
  IF encrypted_token IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Get encryption key (same as encrypt function)
  encryption_key := current_setting('app.settings.oauth_encryption_key', true);
  
  IF encryption_key IS NULL OR encryption_key = '' THEN
    encryption_key := encode(digest(current_database() || '_oauth_tokens_v1', 'sha256'), 'hex');
  END IF;
  
  -- Decrypt using AES-256-CBC
  decrypted := decrypt(
    encrypted_token,
    encryption_key::bytea,
    'aes'
  );
  
  RETURN convert_from(decrypted, 'UTF8');
END;
$$;

CREATE OR REPLACE FUNCTION public.decrypt_google_refresh_token(encrypted_token bytea)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN decrypt_google_access_token(encrypted_token);
END;
$$;

SELECT 'Bytea decrypt function overloads now have search_path!' as status;
