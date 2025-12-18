-- ============================================================
-- 🔍 DATABASE VERIFICATION QUERY
-- ============================================================
-- Run this in Supabase SQL Editor to verify all migrations
-- Expected: All tables present, RLS enabled, default data loaded
-- ============================================================

-- 1. Check all expected tables exist
SELECT 
  '📋 TABLE CHECK' as check_type,
  COUNT(*) as total_tables,
  COUNT(*) FILTER (WHERE tablename IN (
    -- Core tables
    'profiles', 'departments',
    -- Planning tables (15 new)
    'skills', 'employee_skills', 'shifts', 'schedule_templates', 'template_shifts',
    'demand_forecast', 'employee_schedules', 'schedule_history', 'employee_availability',
    'time_off_blocks', 'shift_swap_requests', 'schedule_conflicts', 'labor_rules',
    'shift_costs', 'department_budgets',
    -- Cost management tables (12 new)
    'company_settings', 'job_levels', 'salary_scales', 'allowance_types',
    'benefits', 'benefit_packages', 'benefit_package_items', 'employee_contracts',
    'employee_contract_allowances', 'employee_benefits', 'employee_cost_summary',
    'offer_letter_templates',
    -- Calendar table (1 new)
    'calendar_events'
  )) as expected_tables_found,
  ARRAY_AGG(tablename ORDER BY tablename) FILTER (WHERE tablename IN (
    'skills', 'employee_skills', 'shifts', 'schedule_templates', 'template_shifts',
    'demand_forecast', 'employee_schedules', 'schedule_history', 'employee_availability',
    'time_off_blocks', 'shift_swap_requests', 'schedule_conflicts', 'labor_rules',
    'shift_costs', 'department_budgets',
    'company_settings', 'job_levels', 'salary_scales', 'allowance_types',
    'benefits', 'benefit_packages', 'benefit_package_items', 'employee_contracts',
    'employee_contract_allowances', 'employee_benefits', 'employee_cost_summary',
    'offer_letter_templates', 'calendar_events'
  )) as new_tables_found
FROM pg_tables 
WHERE schemaname = 'public';

-- 2. Check RLS is enabled on new tables
SELECT 
  '🔒 RLS CHECK' as check_type,
  COUNT(*) as total_tables_with_rls,
  COUNT(*) FILTER (WHERE rowsecurity = true AND tablename IN (
    'skills', 'employee_skills', 'shifts', 'schedule_templates', 'template_shifts',
    'demand_forecast', 'employee_schedules', 'schedule_history', 'employee_availability',
    'time_off_blocks', 'shift_swap_requests', 'schedule_conflicts', 'labor_rules',
    'shift_costs', 'department_budgets',
    'company_settings', 'job_levels', 'salary_scales', 'allowance_types',
    'benefits', 'benefit_packages', 'benefit_package_items', 'employee_contracts',
    'employee_contract_allowances', 'employee_benefits', 'employee_cost_summary',
    'offer_letter_templates', 'calendar_events'
  )) as new_tables_with_rls
FROM pg_tables 
WHERE schemaname = 'public' AND tablename IN (
  'skills', 'employee_skills', 'shifts', 'schedule_templates', 'template_shifts',
  'demand_forecast', 'employee_schedules', 'schedule_history', 'employee_availability',
  'time_off_blocks', 'shift_swap_requests', 'schedule_conflicts', 'labor_rules',
  'shift_costs', 'department_budgets',
  'company_settings', 'job_levels', 'salary_scales', 'allowance_types',
  'benefits', 'benefit_packages', 'benefit_package_items', 'employee_contracts',
  'employee_contract_allowances', 'employee_benefits', 'employee_cost_summary',
  'offer_letter_templates', 'calendar_events'
);

-- 3. Check profiles table has required columns
SELECT 
  '👤 PROFILES CHECK' as check_type,
  COUNT(*) FILTER (WHERE column_name = 'role') as has_role_column,
  COUNT(*) FILTER (WHERE column_name = 'full_name') as has_full_name_column,
  COUNT(*) FILTER (WHERE column_name = 'employee_number') as has_employee_number_column,
  COUNT(*) FILTER (WHERE column_name = 'department_id') as has_department_id_column,
  COUNT(*) FILTER (WHERE column_name = 'birth_date') as has_birth_date_column,
  COUNT(*) FILTER (WHERE column_name = 'status') as has_status_column
FROM information_schema.columns
WHERE table_name = 'profiles' AND table_schema = 'public';

-- 4. Check default data was inserted
SELECT 
  '📊 DEFAULT DATA CHECK' as check_type,
  (SELECT COUNT(*) FROM shifts) as shifts_count,
  (SELECT COUNT(*) FROM labor_rules) as labor_rules_count,
  (SELECT COUNT(*) FROM allowance_types) as allowance_types_count,
  (SELECT COUNT(*) FROM benefits) as benefits_count,
  (SELECT COUNT(*) FROM offer_letter_templates) as offer_templates_count;

-- 5. Check functions exist
SELECT 
  '⚙️ FUNCTIONS CHECK' as check_type,
  COUNT(*) FILTER (WHERE proname = 'calculate_shift_cost') as has_calculate_shift_cost,
  COUNT(*) FILTER (WHERE proname = 'check_schedule_conflicts') as has_check_schedule_conflicts,
  COUNT(*) FILTER (WHERE proname = 'calculate_employee_monthly_cost') as has_calculate_employee_monthly_cost,
  COUNT(*) FILTER (WHERE proname = 'generate_offer_letter') as has_generate_offer_letter,
  COUNT(*) FILTER (WHERE proname = 'sync_leave_to_calendar') as has_sync_leave_to_calendar,
  COUNT(*) FILTER (WHERE proname = 'sync_birthdays_to_calendar') as has_sync_birthdays_to_calendar
FROM pg_proc 
WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

-- 6. Check views exist
SELECT 
  '👁️ VIEWS CHECK' as check_type,
  COUNT(*) FILTER (WHERE viewname = 'v_schedule_overview') as has_schedule_overview_view,
  COUNT(*) FILTER (WHERE viewname = 'v_active_conflicts') as has_active_conflicts_view,
  COUNT(*) FILTER (WHERE viewname = 'v_employee_total_compensation') as has_total_compensation_view
FROM pg_views 
WHERE schemaname = 'public';

-- 7. List any missing expected tables
SELECT 
  '❌ MISSING TABLES' as check_type,
  expected_table as table_name,
  'MISSING - Migration not run!' as status
FROM (
  SELECT unnest(ARRAY[
    'skills', 'employee_skills', 'shifts', 'schedule_templates', 'template_shifts',
    'demand_forecast', 'employee_schedules', 'schedule_history', 'employee_availability',
    'time_off_blocks', 'shift_swap_requests', 'schedule_conflicts', 'labor_rules',
    'shift_costs', 'department_budgets',
    'company_settings', 'job_levels', 'salary_scales', 'allowance_types',
    'benefits', 'benefit_packages', 'benefit_package_items', 'employee_contracts',
    'employee_contract_allowances', 'employee_benefits', 'employee_cost_summary',
    'offer_letter_templates', 'calendar_events'
  ]) as expected_table
) expected
WHERE expected_table NOT IN (
  SELECT tablename FROM pg_tables WHERE schemaname = 'public'
);

-- 8. Summary report
SELECT 
  '📈 SUMMARY' as check_type,
  (SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public') as total_tables,
  (SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public' AND rowsecurity = true) as tables_with_rls,
  (SELECT COUNT(*) FROM pg_proc WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')) as total_functions,
  (SELECT COUNT(*) FROM pg_views WHERE schemaname = 'public') as total_views,
  (SELECT COUNT(*) FROM profiles) as total_users,
  (SELECT COUNT(*) FROM departments) as total_departments;

-- ============================================================
-- ✅ EXPECTED RESULTS (if all migrations successful):
-- ============================================================
-- TABLE CHECK: 28+ expected tables found
-- RLS CHECK: 28 new tables with RLS enabled
-- PROFILES CHECK: All 6 columns present (role, full_name, employee_number, department_id, birth_date, status)
-- DEFAULT DATA CHECK: 4 shifts, 7 labor_rules, 11 allowance_types, 12 benefits, 1+ offer_templates
-- FUNCTIONS CHECK: All 6 functions present
-- VIEWS CHECK: All 3 views present
-- MISSING TABLES: Empty result (no missing tables)
-- SUMMARY: 50+ total tables, 40+ with RLS, 30+ functions, 5+ views
-- ============================================================
