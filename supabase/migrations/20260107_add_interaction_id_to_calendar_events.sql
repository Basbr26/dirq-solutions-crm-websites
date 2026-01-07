-- =============================================
-- Add interaction_id to calendar_events with CASCADE DELETE
-- Created: January 7, 2026
-- Purpose: Link calendar events to interactions and auto-delete when interaction is deleted
-- =============================================

BEGIN;

-- Add interaction_id column to calendar_events
ALTER TABLE calendar_events 
ADD COLUMN IF NOT EXISTS interaction_id UUID REFERENCES interactions(id) ON DELETE CASCADE;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_calendar_events_interaction_id 
ON calendar_events(interaction_id) 
WHERE interaction_id IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN calendar_events.interaction_id IS 
'Link to interaction record. Event will be automatically deleted when interaction is deleted (CASCADE).';

COMMIT;

-- =============================================
-- CLEANUP: Remove orphaned calendar events
-- =============================================
-- Run this after adding the column to clean up existing orphaned events:

-- Find calendar events that might be orphaned (no matching interaction)
-- SELECT ce.id, ce.title, ce.start_time, ce.created_at
-- FROM calendar_events ce
-- WHERE ce.interaction_id IS NULL
--   AND ce.google_event_id IS NULL  -- Keep Google synced events
--   AND ce.user_id = auth.uid()
-- ORDER BY ce.start_time DESC;

-- Delete orphaned events (CAREFUL - uncomment to execute):
-- DELETE FROM calendar_events 
-- WHERE user_id = auth.uid()
--   AND interaction_id IS NULL
--   AND google_event_id IS NULL
--   AND title = 'ASD';  -- Pas specifieke titel aan of verwijder deze regel voor bulk delete
