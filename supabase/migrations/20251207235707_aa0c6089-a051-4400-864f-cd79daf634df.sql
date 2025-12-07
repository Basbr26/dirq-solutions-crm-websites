-- Schedule daily deadline check at 8:00 AM UTC
SELECT cron.schedule(
  'check-deadlines-daily',
  '0 8 * * *',
  $$
  SELECT net.http_post(
    url := 'https://fnhyekshkdcxuhcvhvfz.supabase.co/functions/v1/check-deadlines',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZuaHlla3Noa2RjeHVoY3ZodmZ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMxMzYzNjYsImV4cCI6MjA3ODcxMjM2Nn0.LLJ8ECYoqSYFDoXxmQYscbOnJuSaNupo93VoEnR2AAA"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);