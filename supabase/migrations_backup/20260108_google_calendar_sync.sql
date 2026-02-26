-- Add Google Calendar sync fields to profiles table
-- This migration adds support for Google Calendar synchronization

-- Add columns for Google Calendar sync settings to profiles
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS google_calendar_sync BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS last_calendar_sync TIMESTAMP WITH TIME ZONE;

-- Add column to calendar_events to track Google Calendar event IDs
ALTER TABLE calendar_events 
ADD COLUMN IF NOT EXISTS google_event_id TEXT UNIQUE;

-- Create index for faster Google Calendar event lookups
CREATE INDEX IF NOT EXISTS idx_calendar_events_google_event_id 
ON calendar_events(google_event_id) 
WHERE google_event_id IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN profiles.google_calendar_sync IS 
'Enables automatic synchronization with Google Calendar';

COMMENT ON COLUMN profiles.last_calendar_sync IS 
'Timestamp of the last successful Google Calendar sync';

COMMENT ON COLUMN calendar_events.google_event_id IS 
'Google Calendar event ID for synced events (prevents duplicates)';
