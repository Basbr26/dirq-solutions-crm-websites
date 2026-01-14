-- =============================================
-- GOOGLE CALENDAR TOKEN STATUS CHECK
-- Run this to diagnose sync issues
-- =============================================

-- 1. CHECK CURRENT USER TOKEN STATUS
SELECT 
  id,
  email,
  google_access_token IS NOT NULL as has_access_token,
  google_refresh_token IS NOT NULL as has_refresh_token,
  google_token_expires_at,
  CASE 
    WHEN google_token_expires_at IS NULL THEN '❌ NO TOKEN'
    WHEN google_token_expires_at < NOW() THEN '🔴 EXPIRED'
    WHEN google_token_expires_at < NOW() + INTERVAL '10 minutes' THEN '⚠️ EXPIRING SOON'
    WHEN google_token_expires_at < NOW() + INTERVAL '1 hour' THEN '🟡 VALID (< 1 hour)'
    ELSE '✅ VALID'
  END as token_status,
  EXTRACT(EPOCH FROM (google_token_expires_at - NOW())) / 60 as minutes_until_expiry,
  google_calendar_sync as auto_sync_enabled,
  last_calendar_sync,
  CASE 
    WHEN last_calendar_sync IS NULL THEN 'Never synced'
    WHEN last_calendar_sync < NOW() - INTERVAL '1 hour' THEN 'Over 1 hour ago'
    WHEN last_calendar_sync < NOW() - INTERVAL '1 day' THEN 'Over 1 day ago'
    ELSE 'Recent'
  END as last_sync_status
FROM profiles 
WHERE id = auth.uid();

-- 2. CHECK ALL USERS WITH GOOGLE CALENDAR ENABLED
SELECT 
  email,
  google_access_token IS NOT NULL as has_access_token,
  google_refresh_token IS NOT NULL as has_refresh_token,
  CASE 
    WHEN google_token_expires_at IS NULL THEN 'NO TOKEN'
    WHEN google_token_expires_at < NOW() THEN 'EXPIRED'
    WHEN google_token_expires_at < NOW() + INTERVAL '1 hour' THEN 'EXPIRING SOON'
    ELSE 'VALID'
  END as token_status,
  google_calendar_sync,
  last_calendar_sync
FROM profiles 
WHERE google_calendar_sync = true
ORDER BY google_token_expires_at ASC;

-- 3. FIND USERS WITH EXPIRED TOKENS
SELECT 
  email,
  google_token_expires_at,
  NOW() - google_token_expires_at as expired_duration,
  last_calendar_sync
FROM profiles 
WHERE google_token_expires_at < NOW()
  AND google_access_token IS NOT NULL;

-- 4. FIND USERS WITHOUT REFRESH TOKEN (NEED RE-AUTH)
SELECT 
  email,
  google_access_token IS NOT NULL as has_access_token,
  google_refresh_token IS NOT NULL as has_refresh_token,
  google_token_expires_at,
  google_calendar_sync
FROM profiles 
WHERE google_access_token IS NOT NULL
  AND google_refresh_token IS NULL;

-- 5. CHECK WEBHOOK STATUS
SELECT 
  email,
  webhook_channel_id IS NOT NULL as has_webhook,
  webhook_expiration,
  CASE 
    WHEN webhook_expiration IS NULL THEN 'NO WEBHOOK'
    WHEN webhook_expiration < NOW() THEN 'EXPIRED'
    WHEN webhook_expiration < NOW() + INTERVAL '1 day' THEN 'EXPIRING SOON'
    ELSE 'VALID'
  END as webhook_status
FROM profiles 
WHERE google_calendar_sync = true;

-- 6. CLEAN UP EXPIRED TOKENS (OPTIONAL - BE CAREFUL!)
-- Uncomment to clear expired tokens:
/*
UPDATE profiles
SET 
  google_access_token = NULL,
  google_refresh_token = NULL,
  google_token_expires_at = NULL
WHERE google_token_expires_at < NOW();
*/

-- 7. CHECK FOR USERS WHO HAVEN'T SYNCED RECENTLY
SELECT 
  email,
  last_calendar_sync,
  NOW() - last_calendar_sync as time_since_sync,
  google_calendar_sync as auto_sync_enabled,
  google_token_expires_at
FROM profiles 
WHERE google_calendar_sync = true
  AND (last_calendar_sync < NOW() - INTERVAL '1 day' OR last_calendar_sync IS NULL)
ORDER BY last_calendar_sync ASC NULLS FIRST;

-- 8. SUMMARY STATISTICS
SELECT 
  COUNT(*) as total_users,
  COUNT(*) FILTER (WHERE google_calendar_sync = true) as users_with_sync_enabled,
  COUNT(*) FILTER (WHERE google_access_token IS NOT NULL) as users_with_token,
  COUNT(*) FILTER (WHERE google_refresh_token IS NOT NULL) as users_with_refresh_token,
  COUNT(*) FILTER (WHERE google_token_expires_at > NOW()) as users_with_valid_token,
  COUNT(*) FILTER (WHERE google_token_expires_at < NOW()) as users_with_expired_token,
  COUNT(*) FILTER (WHERE last_calendar_sync > NOW() - INTERVAL '1 day') as users_synced_today
FROM profiles;
