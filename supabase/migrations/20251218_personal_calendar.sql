-- Personal Calendar System
-- Calendar events table for personal and work events

CREATE TABLE IF NOT EXISTS calendar_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Event info
  title VARCHAR(200) NOT NULL,
  description TEXT,
  event_type VARCHAR(50) NOT NULL CHECK (event_type IN (
    'meeting', 'task', 'leave', 'birthday', 'training', 'review', 'deadline', 'other'
  )),
  
  -- Timing
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  all_day BOOLEAN DEFAULT FALSE,
  timezone VARCHAR(50) DEFAULT 'Europe/Amsterdam',
  
  -- Recurrence
  recurrence_rule VARCHAR(200), -- RRULE format (e.g., "FREQ=YEARLY")
  recurrence_end DATE,
  parent_event_id UUID REFERENCES calendar_events(id) ON DELETE CASCADE,
  
  -- Location
  location VARCHAR(200),
  is_virtual BOOLEAN DEFAULT FALSE,
  meeting_url VARCHAR(500),
  
  -- Participants (JSON array of user IDs)
  participants JSONB DEFAULT '[]'::jsonb,
  
  -- Linked entities
  leave_request_id UUID REFERENCES leave_requests(id) ON DELETE CASCADE,
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  onboarding_task_id UUID REFERENCES onboarding_tasks(id) ON DELETE CASCADE,
  
  -- Reminders (array of minutes before event, e.g., [15, 60, 1440])
  reminder_minutes INTEGER[],
  
  -- External sync
  google_event_id VARCHAR(200),
  outlook_event_id VARCHAR(200),
  last_synced_at TIMESTAMP WITH TIME ZONE,
  sync_status VARCHAR(20) DEFAULT 'pending' CHECK (sync_status IN ('pending', 'synced', 'error')),
  
  -- Metadata
  color VARCHAR(7) DEFAULT '#3B82F6', -- Hex color
  is_private BOOLEAN DEFAULT FALSE,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_calendar_events_user ON calendar_events(user_id);
CREATE INDEX idx_calendar_events_date ON calendar_events(start_time);
CREATE INDEX idx_calendar_events_type ON calendar_events(event_type);
CREATE INDEX idx_calendar_events_google ON calendar_events(google_event_id) WHERE google_event_id IS NOT NULL;
CREATE INDEX idx_calendar_events_leave ON calendar_events(leave_request_id) WHERE leave_request_id IS NOT NULL;
CREATE INDEX idx_calendar_events_task ON calendar_events(task_id) WHERE task_id IS NOT NULL;

-- RLS Policies
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;

-- Users can see their own events
CREATE POLICY "Users see own events"
  ON calendar_events FOR SELECT
  USING (
    user_id = auth.uid() 
    OR is_private = FALSE
    OR auth.uid()::text = ANY(
      SELECT jsonb_array_elements_text(participants)
    )
  );

-- Users can create their own events
CREATE POLICY "Users create own events"
  ON calendar_events FOR INSERT
  WITH CHECK (user_id = auth.uid() OR created_by = auth.uid());

-- Users can update their own events
CREATE POLICY "Users update own events"
  ON calendar_events FOR UPDATE
  USING (user_id = auth.uid() OR created_by = auth.uid());

-- Users can delete their own events
CREATE POLICY "Users delete own events"
  ON calendar_events FOR DELETE
  USING (user_id = auth.uid() OR created_by = auth.uid());

-- Trigger for updated_at
CREATE TRIGGER update_calendar_events_updated_at
  BEFORE UPDATE ON calendar_events
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add unique constraint for task calendar sync
ALTER TABLE calendar_events 
  ADD CONSTRAINT unique_task_calendar UNIQUE NULLS NOT DISTINCT (task_id);

-- Add unique constraint for leave request calendar sync
ALTER TABLE calendar_events 
  ADD CONSTRAINT unique_leave_calendar UNIQUE NULLS NOT DISTINCT (leave_request_id);

-- ============================================================
-- AUTO-SYNC TRIGGERS
-- ============================================================

-- 1. Sync approved leave requests to calendar
CREATE OR REPLACE FUNCTION sync_leave_to_calendar()
RETURNS TRIGGER AS $$
BEGIN
  -- Only sync approved leave
  IF NEW.status = 'approved' AND (OLD IS NULL OR OLD.status != 'approved') THEN
    INSERT INTO calendar_events (
      user_id,
      title,
      description,
      event_type,
      start_time,
      end_time,
      all_day,
      color,
      leave_request_id,
      created_by
    )
    SELECT
      NEW.employee_id,
      'Verlof: ' || NEW.leave_type,
      COALESCE(NEW.reason, 'Goedgekeurd verlof'),
      'leave',
      NEW.start_date::timestamp,
      (NEW.end_date::timestamp + interval '1 day'),
      TRUE,
      '#10B981', -- Green for leave
      NEW.id,
      auth.uid()
    WHERE NOT EXISTS (
      SELECT 1 FROM calendar_events 
      WHERE leave_request_id = NEW.id
    );
  END IF;
  
  -- Remove calendar event if rejected/cancelled
  IF NEW.status IN ('rejected', 'cancelled') AND OLD.status = 'approved' THEN
    DELETE FROM calendar_events WHERE leave_request_id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER sync_leave_to_calendar_trigger
  AFTER INSERT OR UPDATE ON leave_requests
  FOR EACH ROW
  EXECUTE FUNCTION sync_leave_to_calendar();

-- 2. Sync tasks with due dates to calendar
CREATE OR REPLACE FUNCTION sync_task_to_calendar()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.due_date IS NOT NULL THEN
    -- Insert or update calendar event
    INSERT INTO calendar_events (
      user_id,
      title,
      description,
      event_type,
      start_time,
      end_time,
      all_day,
      color,
      task_id,
      created_by
    )
    VALUES (
      COALESCE(NEW.assigned_to, NEW.created_by),
      'Taak: ' || NEW.title,
      NEW.description,
      'task',
      (NEW.due_date::timestamp - interval '1 hour'),
      NEW.due_date::timestamp,
      FALSE,
      '#F59E0B', -- Orange for tasks
      NEW.id,
      COALESCE(NEW.created_by, auth.uid())
    )
    ON CONFLICT (task_id) 
    DO UPDATE SET
      title = EXCLUDED.title,
      description = EXCLUDED.description,
      start_time = EXCLUDED.start_time,
      end_time = EXCLUDED.end_time,
      user_id = EXCLUDED.user_id,
      updated_at = NOW();
  ELSE
    -- Remove calendar event if due date is removed
    DELETE FROM calendar_events WHERE task_id = NEW.id;
  END IF;
  
  -- Delete if task is deleted
  IF TG_OP = 'DELETE' THEN
    DELETE FROM calendar_events WHERE task_id = OLD.id;
    RETURN OLD;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER sync_task_to_calendar_trigger
  AFTER INSERT OR UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION sync_task_to_calendar();

-- 3. Function to sync birthdays for all users (called by edge function)
CREATE OR REPLACE FUNCTION sync_birthdays_to_calendar(year_to_sync INTEGER)
RETURNS INTEGER AS $$
DECLARE
  birthday_count INTEGER := 0;
  employee_record RECORD;
BEGIN
  FOR employee_record IN
    SELECT 
      id, 
      voornaam, 
      achternaam, 
      geboortedatum
    FROM profiles
    WHERE geboortedatum IS NOT NULL
  LOOP
    -- Create birthday event for each employee for all other users
    INSERT INTO calendar_events (
      user_id,
      title,
      description,
      event_type,
      start_time,
      end_time,
      all_day,
      color,
      recurrence_rule,
      is_private
    )
    SELECT
      p.id as viewer_id,
      '🎂 Verjaardag: ' || employee_record.voornaam || ' ' || employee_record.achternaam,
      'Verjaardag van collega',
      'birthday',
      make_date(
        year_to_sync, 
        EXTRACT(MONTH FROM employee_record.geboortedatum)::integer, 
        EXTRACT(DAY FROM employee_record.geboortedatum)::integer
      )::timestamp,
      make_date(
        year_to_sync, 
        EXTRACT(MONTH FROM employee_record.geboortedatum)::integer, 
        EXTRACT(DAY FROM employee_record.geboortedatum)::integer
      )::timestamp + interval '1 day',
      TRUE,
      '#EC4899', -- Pink for birthdays
      'FREQ=YEARLY',
      FALSE
    FROM profiles p
    WHERE 
      p.id != employee_record.id
      AND NOT EXISTS (
        SELECT 1 FROM calendar_events ce
        WHERE ce.user_id = p.id
          AND ce.event_type = 'birthday'
          AND ce.title LIKE '%' || employee_record.voornaam || ' ' || employee_record.achternaam || '%'
          AND EXTRACT(YEAR FROM ce.start_time) = year_to_sync
      );
    
    GET DIAGNOSTICS birthday_count = ROW_COUNT + birthday_count;
  END LOOP;
  
  RETURN birthday_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Initial sync of birthdays for current year
SELECT sync_birthdays_to_calendar(EXTRACT(YEAR FROM CURRENT_DATE)::integer);

COMMENT ON TABLE calendar_events IS 'Personal calendar events with auto-sync from leave requests, tasks, and birthdays';
COMMENT ON FUNCTION sync_leave_to_calendar() IS 'Automatically creates calendar events for approved leave requests';
COMMENT ON FUNCTION sync_task_to_calendar() IS 'Automatically creates calendar events for tasks with due dates';
COMMENT ON FUNCTION sync_birthdays_to_calendar(integer) IS 'Syncs employee birthdays to all user calendars for specified year';
