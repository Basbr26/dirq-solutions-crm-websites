-- =============================================
-- CREATE CALENDAR_EVENTS TABLE
-- =============================================
-- Datum: 7 januari 2026
-- Probleem: calendar_events tabel bestaat niet
-- Oplossing: Maak tabel aan voor agenda functionaliteit
-- =============================================

BEGIN;

-- Create calendar_events table
CREATE TABLE IF NOT EXISTS calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Owner
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Event details
  title TEXT NOT NULL,
  description TEXT,
  location TEXT,
  
  -- Timing
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  all_day BOOLEAN DEFAULT FALSE,
  
  -- Type & categorization
  event_type TEXT CHECK (event_type IN ('meeting', 'call', 'task', 'reminder', 'other')),
  color TEXT, -- Hex color for visual distinction
  
  -- Relationships
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  
  -- Recurrence (basic)
  is_recurring BOOLEAN DEFAULT FALSE,
  recurrence_pattern TEXT, -- 'daily', 'weekly', 'monthly', etc.
  recurrence_end_date DATE,
  
  -- Notifications
  reminder_minutes INTEGER, -- Minutes before event to remind
  
  -- Google Calendar sync (for future)
  google_event_id TEXT UNIQUE,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_calendar_events_user_id ON calendar_events(user_id);
CREATE INDEX idx_calendar_events_start_time ON calendar_events(start_time);
CREATE INDEX idx_calendar_events_company_id ON calendar_events(company_id);
CREATE INDEX idx_calendar_events_project_id ON calendar_events(project_id);
CREATE INDEX idx_calendar_events_google_event_id ON calendar_events(google_event_id) WHERE google_event_id IS NOT NULL;

-- Trigger for updated_at
CREATE TRIGGER update_calendar_events_updated_at
  BEFORE UPDATE ON calendar_events
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- RLS POLICIES
-- =============================================

ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;

-- SELECT: Users can see their own events and events they're involved with
CREATE POLICY "Users can view their calendar events"
  ON calendar_events FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR is_admin_or_manager()
  );

-- INSERT: Users can create their own events
CREATE POLICY "Users can create calendar events"
  ON calendar_events FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
  );

-- UPDATE: Users can update their own events
CREATE POLICY "Users can update their calendar events"
  ON calendar_events FOR UPDATE
  TO authenticated
  USING (
    user_id = auth.uid()
    OR is_admin_or_manager()
  );

-- DELETE: Users can delete their own events
CREATE POLICY "Users can delete their calendar events"
  ON calendar_events FOR DELETE
  TO authenticated
  USING (
    user_id = auth.uid()
    OR is_admin_or_manager()
  );

-- =============================================
-- VERIFICATION
-- =============================================

DO $$
BEGIN
  RAISE NOTICE '✅ calendar_events table created successfully';
  RAISE NOTICE 'Features:';
  RAISE NOTICE '- Event scheduling with start/end times';
  RAISE NOTICE '- Links to companies, contacts, projects';
  RAISE NOTICE '- Google Calendar sync ready';
  RAISE NOTICE '- RLS policies for user privacy';
END $$;

COMMIT;
