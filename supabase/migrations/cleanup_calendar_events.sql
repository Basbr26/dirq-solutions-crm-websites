-- =============================================
-- Check en cleanup calendar events
-- =============================================

-- STAP 1: Bekijk alle calendar events
SELECT 
  id,
  title,
  event_type,
  start_time,
  end_time,
  google_event_id,
  created_at
FROM calendar_events
WHERE user_id = auth.uid()
ORDER BY start_time DESC;

-- STAP 2: Verwijder de specifieke "ASD" event (DIRECT UITVOERBAAR):
DELETE FROM calendar_events 
WHERE user_id = auth.uid() 
  AND title = 'ASD';

-- STAP 3: Of verwijder ALLE oude events (ouder dan vandaag):
-- DELETE FROM calendar_events 
-- WHERE user_id = auth.uid() 
--   AND start_time < NOW();

-- STAP 4: Of verwijder ALLE calendar events:
-- DELETE FROM calendar_events WHERE user_id = auth.uid();

-- STAP 5: Of verwijder alleen Google Calendar synced events:
-- DELETE FROM calendar_events 
-- WHERE user_id = auth.uid() 
--   AND google_event_id IS NOT NULL;
