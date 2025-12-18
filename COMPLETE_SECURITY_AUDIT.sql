-- ============================================================
-- 🔍 COMPLETE DATABASE & SECURITY AUDIT
-- ============================================================

-- 1. CHECK ALL TABLES WITH RLS STATUS
SELECT 
  '📋 RLS STATUS' as check_type,
  schemaname,
  tablename,
  rowsecurity as rls_enabled,
  (SELECT COUNT(*) FROM pg_policies WHERE tablename = t.tablename) as policy_count
FROM pg_tables t
WHERE schemaname = 'public'
ORDER BY tablename;

-- 2. CHECK ALL POLICIES (grouped by table)
SELECT 
  '🔒 POLICIES' as check_type,
  tablename,
  COUNT(*) as policy_count,
  string_agg(policyname, ', ' ORDER BY policyname) as policies
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY tablename
ORDER BY tablename;

-- 3. CHECK FOR CIRCULAR REFERENCES IN POLICIES
SELECT 
  '⚠️ POLICY CHECKS' as check_type,
  tablename,
  policyname,
  CASE 
    WHEN qual LIKE '%SELECT%profiles%' AND tablename = 'profiles' THEN '❌ CIRCULAR REFERENCE'
    WHEN qual LIKE '%SELECT%' || tablename || '%' THEN '⚠️ SELF-REFERENCE'
    ELSE '✅ OK'
  END as status,
  qual as policy_definition
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- 4. CHECK ALL FUNCTIONS
SELECT 
  '⚙️ FUNCTIONS' as check_type,
  n.nspname as schema_name,
  p.proname as function_name,
  pg_get_function_result(p.oid) as return_type,
  CASE p.provolatile
    WHEN 'i' THEN 'IMMUTABLE'
    WHEN 's' THEN 'STABLE'
    WHEN 'v' THEN 'VOLATILE'
  END as volatility,
  CASE p.prosecdef
    WHEN true THEN 'SECURITY DEFINER'
    ELSE 'SECURITY INVOKER'
  END as security
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN (
    'get_user_role',
    'calculate_shift_cost',
    'check_schedule_conflicts',
    'calculate_employee_monthly_cost',
    'generate_offer_letter',
    'sync_leave_to_calendar',
    'sync_birthdays_to_calendar',
    'update_updated_at_column'
  )
ORDER BY p.proname;

-- 5. CHECK ALL TRIGGERS
SELECT 
  '🎯 TRIGGERS' as check_type,
  event_object_table as table_name,
  trigger_name,
  event_manipulation as event_type,
  action_timing as timing,
  action_orientation as level
FROM information_schema.triggers
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;

-- 6. CHECK PROFILES TABLE STRUCTURE
SELECT 
  '👤 PROFILES COLUMNS' as check_type,
  column_name,
  data_type,
  is_nullable,
  CASE 
    WHEN is_generated = 'ALWAYS' THEN '✅ COMPUTED'
    WHEN column_default IS NOT NULL THEN '✅ DEFAULT'
    ELSE ''
  END as special
FROM information_schema.columns
WHERE table_name = 'profiles' AND table_schema = 'public'
ORDER BY ordinal_position;

-- 7. CHECK FOR MISSING INDEXES
SELECT 
  '📊 INDEXES' as check_type,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN (
    'profiles', 'employee_schedules', 'calendar_events', 
    'employee_contracts', 'leave_requests'
  )
ORDER BY tablename, indexname;

-- 8. CHECK FOREIGN KEY CONSTRAINTS
SELECT 
  '🔗 FOREIGN KEYS' as check_type,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name,
  rc.delete_rule,
  rc.update_rule
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
LEFT JOIN information_schema.referential_constraints rc
  ON tc.constraint_name = rc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND tc.table_schema = 'public'
  AND tc.table_name IN (
    'employee_schedules', 'calendar_events', 'employee_contracts',
    'shift_costs', 'employee_skills'
  )
ORDER BY tc.table_name, kcu.column_name;

-- 9. CHECK VIEWS
SELECT 
  '👁️ VIEWS' as check_type,
  table_name as view_name,
  CASE 
    WHEN view_definition LIKE '%profiles%' THEN '✅ Uses profiles'
    ELSE ''
  END as references_profiles
FROM information_schema.views
WHERE table_schema = 'public'
ORDER BY table_name;

-- 10. TEST GET_USER_ROLE FUNCTION
SELECT 
  '🧪 FUNCTION TEST' as check_type,
  'get_user_role()' as function_name,
  public.get_user_role() as current_user_role,
  auth.uid() as current_user_id;

-- 11. CHECK FOR TABLES WITHOUT RLS
SELECT 
  '❌ TABLES WITHOUT RLS' as check_type,
  tablename
FROM pg_tables
WHERE schemaname = 'public'
  AND rowsecurity = false
  AND tablename NOT LIKE 'pg_%'
  AND tablename NOT IN ('spatial_ref_sys', 'geography_columns', 'geometry_columns')
ORDER BY tablename;

-- 11B. CHECK FOR TABLES WITH RLS BUT NO POLICIES (INACCESSIBLE!)
SELECT 
  '⚠️ RLS WITHOUT POLICIES' as check_type,
  tablename,
  '❌ BLOCKED - No access policies defined' as status
FROM pg_tables 
WHERE schemaname = 'public' 
  AND rowsecurity = true
  AND tablename NOT IN (
    SELECT DISTINCT tablename 
    FROM pg_policies 
    WHERE schemaname = 'public'
  )
ORDER BY tablename;

-- 12. SUMMARY
SELECT 
  '📈 SUMMARY' as check_type,
  (SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public') as total_tables,
  (SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public' AND rowsecurity = true) as tables_with_rls,
  (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public') as total_policies,
  (SELECT COUNT(DISTINCT tablename) FROM pg_policies WHERE schemaname = 'public') as tables_with_policies,
  (SELECT COUNT(*) FROM pg_proc WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')) as total_functions,
  (SELECT COUNT(*) FROM information_schema.triggers WHERE trigger_schema = 'public') as total_triggers,
  (SELECT COUNT(*) FROM information_schema.views WHERE table_schema = 'public') as total_views;
