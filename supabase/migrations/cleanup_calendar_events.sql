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

-- STAP 2: Verwijder specifieke event (pas titel aan):
-- DELETE FROM calendar_events 
-- WHERE user_id = auth.uid() 
--   AND title = 'ASD';

-- STAP 3: Verwijder ALLE oude events (ouder dan vandaag):
-- DELETE FROM calendar_events 
-- WHERE user_id = auth.uid() 
--   AND start_time < NOW();

-- STAP 4: Verwijder ALLE calendar events:
-- DELETE FROM calendar_events WHERE user_id = auth.uid();

-- STAP 5: Verwijder alleen Google Calendar synced events:
-- DELETE FROM calendar_events 
-- WHERE user_id = auth.uid() 
--   AND google_event_id IS NOT NULL;
