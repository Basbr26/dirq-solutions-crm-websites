-- Add Google Calendar columns to profiles table
-- These columns store OAuth tokens and sync state for Google Calendar integration

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS google_access_token TEXT,
  ADD COLUMN IF NOT EXISTS google_refresh_token TEXT,
  ADD COLUMN IF NOT EXISTS google_token_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS google_calendar_sync BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS last_calendar_sync TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS webhook_channel_id TEXT,
  ADD COLUMN IF NOT EXISTS webhook_resource_id TEXT,
  ADD COLUMN IF NOT EXISTS webhook_expiration TIMESTAMPTZ;
