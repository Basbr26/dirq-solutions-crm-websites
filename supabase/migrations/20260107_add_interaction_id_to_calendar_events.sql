-- =============================================
-- Add interaction_id to calendar_events with CASCADE DELETE
-- Created: January 7, 2026
-- Purpose: Link calendar events to interactions and auto-delete when interaction is deleted
-- =============================================

-- STAP 1: Voeg interaction_id kolom toe
ALTER TABLE calendar_events 
ADD COLUMN IF NOT EXISTS interaction_id UUID REFERENCES interactions(id) ON DELETE CASCADE;

-- STAP 2: Voeg index toe
CREATE INDEX IF NOT EXISTS idx_calendar_events_interaction_id 
ON calendar_events(interaction_id) 
WHERE interaction_id IS NOT NULL;

-- STAP 3: Voeg comment toe
COMMENT ON COLUMN calendar_events.interaction_id IS 
'Link to interaction record. Event will be automatically deleted when interaction is deleted (CASCADE).';

-- =============================================
-- KLAAR! Nu kun je onderstaande cleanup queries uitvoeren
-- =============================================
