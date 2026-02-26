-- Add webhook support for Google Calendar push notifications
-- This enables real-time sync instead of 15-minute polling

-- Table to store webhook events for audit/debugging
CREATE TABLE IF NOT EXISTS webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  webhook_type TEXT NOT NULL, -- 'google_calendar', 'google_contacts', etc.
  channel_id TEXT,
  resource_state TEXT, -- 'sync', 'exists', 'not_exists'
  resource_id TEXT,
  payload JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for efficient queries
CREATE INDEX IF NOT EXISTS idx_webhook_events_user_id ON webhook_events(user_id);
CREATE INDEX IF NOT EXISTS idx_webhook_events_created_at ON webhook_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_webhook_events_type ON webhook_events(webhook_type);

-- Add webhook state columns to profiles
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS last_webhook_trigger TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS webhook_sync_pending BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS google_webhook_channel_id TEXT,
ADD COLUMN IF NOT EXISTS google_webhook_resource_id TEXT,
ADD COLUMN IF NOT EXISTS google_webhook_expiration TIMESTAMPTZ;

-- Index for webhook expiration checks
CREATE INDEX IF NOT EXISTS idx_profiles_webhook_expiration 
ON profiles(google_webhook_expiration)
WHERE google_webhook_expiration IS NOT NULL;

-- RLS policies for webhook_events
ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;

-- Users can view their own webhook events
CREATE POLICY "Users can view their webhook events"
  ON webhook_events FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Only service role can insert webhook events (from Edge Function)
CREATE POLICY "Service role can insert webhook events"
  ON webhook_events FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Admins can view all webhook events
CREATE POLICY "Admins can view all webhook events"
  ON webhook_events FOR SELECT
  TO authenticated
  USING (is_admin_or_manager());

-- Function to cleanup old webhook events (keep last 30 days)
CREATE OR REPLACE FUNCTION cleanup_old_webhook_events()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM webhook_events
  WHERE created_at < NOW() - INTERVAL '30 days';
END;
$$;

-- Schedule cleanup to run daily (requires pg_cron extension)
-- Note: Uncomment if pg_cron is enabled
-- SELECT cron.schedule(
--   'cleanup-webhook-events',
--   '0 2 * * *', -- Run at 2 AM daily
--   'SELECT cleanup_old_webhook_events();'
-- );

COMMENT ON TABLE webhook_events IS 
'Stores incoming webhook events for audit and debugging purposes';

COMMENT ON COLUMN profiles.last_webhook_trigger IS 
'Timestamp of last webhook notification received from Google Calendar';

COMMENT ON COLUMN profiles.webhook_sync_pending IS 
'Flag indicating a sync is pending due to webhook notification. Client listens to this via realtime.';

COMMENT ON COLUMN profiles.google_webhook_channel_id IS 
'Google Calendar webhook channel ID for push notifications';

COMMENT ON COLUMN profiles.google_webhook_resource_id IS 
'Google Calendar webhook resource ID';

COMMENT ON COLUMN profiles.google_webhook_expiration IS 
'Expiration timestamp of Google Calendar webhook (max 7 days)';
