-- ============================================================
-- 🔍 DEBUG PROFILES TABLE
-- ============================================================

-- 1. Check profiles table structure
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default,
  is_generated
FROM information_schema.columns
WHERE table_name = 'profiles' AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. Check if any data exists
SELECT COUNT(*) as total_profiles FROM profiles;

-- 3. Try to select from profiles (this will show the actual error)
SELECT 
  id,
  email,
  full_name,
  role,
  voornaam,
  achternaam,
  birth_date,
  geboortedatum,
  status
FROM profiles
LIMIT 5;

-- 4. Check RLS policies on profiles
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'profiles';

-- 5. Check for any broken views
SELECT 
  table_name,
  view_definition
FROM information_schema.views
WHERE table_schema = 'public'
  AND view_definition LIKE '%profiles%'
LIMIT 5;
