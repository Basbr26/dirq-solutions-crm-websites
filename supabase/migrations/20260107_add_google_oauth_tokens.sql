-- =============================================
-- Add Google OAuth Token Storage to Profiles
-- Created: January 7, 2026
-- Purpose: Securely store Google Calendar OAuth tokens for persistent authentication
-- =============================================

-- Add encrypted token columns to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS google_access_token TEXT,
ADD COLUMN IF NOT EXISTS google_refresh_token TEXT,
ADD COLUMN IF NOT EXISTS google_token_expires_at TIMESTAMPTZ;

-- Add indexes for token lookup and expiry checks
CREATE INDEX IF NOT EXISTS idx_profiles_google_access_token 
ON profiles(id) 
WHERE google_access_token IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_google_token_expiry 
ON profiles(google_token_expires_at) 
WHERE google_token_expires_at IS NOT NULL;

-- Add comments for documentation
COMMENT ON COLUMN profiles.google_access_token IS 
'Google OAuth access token (encrypted, expires in 1 hour)';

COMMENT ON COLUMN profiles.google_refresh_token IS 
'Google OAuth refresh token (encrypted, long-lived, used to get new access tokens)';

COMMENT ON COLUMN profiles.google_token_expires_at IS 
'Timestamp when the Google access token expires (UTC)';

-- RLS Policy: Users can only update their own tokens
CREATE POLICY "Users can update own Google tokens" ON profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Grant authenticated users access to their own token columns
-- Note: Tokens should be encrypted at application level before storage
GRANT SELECT, UPDATE ON profiles TO authenticated;
