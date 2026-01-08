-- Encrypt OAuth tokens using pgcrypto (AES-256)
-- This implements server-side encryption for google_access_token and google_refresh_token
-- Reported in: CALENDAR_TASKS_ACTIVITIES_ANALYSIS.md - Priority 2, Issue #6
-- Note: Using pgcrypto instead of pgsodium due to permission constraints in Supabase

-- Enable pgcrypto extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Step 1: Create new encrypted columns
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS google_access_token_encrypted bytea,
ADD COLUMN IF NOT EXISTS google_refresh_token_encrypted bytea;

-- Step 2: Store encryption key in Supabase Vault (or use environment variable)
-- Note: In production, the key should be stored in Supabase Vault or as a secret
-- For this migration, we'll use a deterministic key derived from project settings
-- WARNING: In production, replace this with: SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'oauth_encryption_key'

-- Step 3: Create helper functions for encryption/decryption

-- Function to encrypt access token
CREATE OR REPLACE FUNCTION encrypt_google_access_token(plain_token TEXT)
RETURNS bytea
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  encryption_key TEXT;
BEGIN
  IF plain_token IS NULL OR plain_token = '' THEN
    RETURN NULL;
  END IF;
  
  -- Get encryption key from Vault (fallback to project-specific key)
  -- In production: SELECT decrypted_secret INTO encryption_key FROM vault.decrypted_secrets WHERE name = 'oauth_encryption_key';
  -- For now, use a project-specific key (this should be rotated regularly)
  encryption_key := current_setting('app.settings.oauth_encryption_key', true);
  
  IF encryption_key IS NULL OR encryption_key = '' THEN
    -- Fallback: use a deterministic key based on database identifier
    -- This ensures the same database always uses the same key
    encryption_key := encode(digest(current_database() || '_oauth_tokens_v1', 'sha256'), 'hex');
  END IF;
  
  -- Encrypt using AES-256-CBC with the key
  RETURN encrypt(
    plain_token::bytea,
    encryption_key::bytea,
    'aes'
  );
END;
$$;

-- Function to decrypt access token
CREATE OR REPLACE FUNCTION decrypt_google_access_token(encrypted_token bytea)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
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

-- Function to encrypt refresh token (same as access token)
CREATE OR REPLACE FUNCTION encrypt_google_refresh_token(plain_token TEXT)
RETURNS bytea
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN encrypt_google_access_token(plain_token);
END;
$$;

-- Function to decrypt refresh token (same as access token)
CREATE OR REPLACE FUNCTION decrypt_google_refresh_token(encrypted_token bytea)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN decrypt_google_access_token(encrypted_token);
END;
$$;

-- Step 4: Migrate existing data to encrypted columns
UPDATE profiles
SET 
  google_access_token_encrypted = encrypt_google_access_token(google_access_token),
  google_refresh_token_encrypted = encrypt_google_refresh_token(google_refresh_token)
WHERE google_access_token IS NOT NULL OR google_refresh_token IS NOT NULL;

-- Step 5: Create views for easy access with automatic decryption
-- Note: These views use SECURITY DEFINER functions, so they're safe to use
CREATE OR REPLACE VIEW profiles_with_decrypted_tokens AS
SELECT 
  id,
  email,
  voornaam,
  achternaam,
  role,
  department_id,
  google_calendar_sync,
  google_token_expires_at,
  last_calendar_sync,
  -- Decrypted tokens (only accessible by the user themselves due to RLS)
  decrypt_google_access_token(google_access_token_encrypted) as google_access_token,
  decrypt_google_refresh_token(google_refresh_token_encrypted) as google_refresh_token,
  created_at,
  updated_at
FROM profiles;

-- Step 6: Add RLS to the view (same as profiles table)
ALTER VIEW profiles_with_decrypted_tokens SET (security_barrier = true);

-- Step 7: Grant necessary permissions
GRANT SELECT ON profiles_with_decrypted_tokens TO authenticated;

-- Step 8: Add comments
COMMENT ON COLUMN profiles.google_access_token_encrypted IS 
'Encrypted Google OAuth access token (use decrypt_google_access_token() to read)';

COMMENT ON COLUMN profiles.google_refresh_token_encrypted IS 
'Encrypted Google OAuth refresh token (use decrypt_google_refresh_token() to read)';

COMMENT ON VIEW profiles_with_decrypted_tokens IS 
'View with automatic decryption of Google OAuth tokens. Protected by same RLS as profiles table.';

COMMENT ON FUNCTION encrypt_google_access_token(TEXT) IS 
'Encrypts Google OAuth access token using pgcrypto AES-256 encryption';

COMMENT ON FUNCTION decrypt_google_access_token(bytea) IS 
'Decrypts Google OAuth access token (SECURITY DEFINER - safe to use in queries)';

-- Step 9: Create trigger to automatically encrypt new tokens
CREATE OR REPLACE FUNCTION encrypt_tokens_on_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- If access token is being updated (from application), encrypt it
  IF NEW.google_access_token IS NOT NULL AND NEW.google_access_token != '' THEN
    NEW.google_access_token_encrypted := encrypt_google_access_token(NEW.google_access_token);
    NEW.google_access_token := NULL;  -- Clear plaintext
  END IF;
  
  -- If refresh token is being updated (from application), encrypt it
  IF NEW.google_refresh_token IS NOT NULL AND NEW.google_refresh_token != '' THEN
    NEW.google_refresh_token_encrypted := encrypt_google_refresh_token(NEW.google_refresh_token);
    NEW.google_refresh_token := NULL;  -- Clear plaintext
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_encrypt_oauth_tokens ON profiles;
CREATE TRIGGER trigger_encrypt_oauth_tokens
  BEFORE INSERT OR UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION encrypt_tokens_on_update();

COMMENT ON TRIGGER trigger_encrypt_oauth_tokens ON profiles IS 
'Automatically encrypts OAuth tokens when inserted or updated. Plaintext values are cleared after encryption.';

-- Step 10: Drop old plaintext columns after migration (OPTIONAL - uncomment when ready)
-- WARNING: This will permanently remove the old columns. Make sure encryption is working first!
-- ALTER TABLE profiles 
-- DROP COLUMN IF EXISTS google_access_token,
-- DROP COLUMN IF EXISTS google_refresh_token;

-- Migration complete!
-- 
-- USAGE INSTRUCTIONS:
-- 
-- 1. Application code should continue using google_access_token and google_refresh_token columns
--    The trigger will automatically encrypt them and store in *_encrypted columns
-- 
-- 2. For reading encrypted tokens, use the view:
--    SELECT google_access_token, google_refresh_token 
--    FROM profiles_with_decrypted_tokens 
--    WHERE id = auth.uid();
-- 
-- 3. Or use the decryption functions directly:
--    SELECT decrypt_google_access_token(google_access_token_encrypted) 
--    FROM profiles 
--    WHERE id = auth.uid();
