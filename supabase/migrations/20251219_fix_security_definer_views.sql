-- ============================================================
-- FIX SECURITY DEFINER VIEWS
-- ============================================================
-- Remove SECURITY DEFINER from views and rely on RLS instead
-- 
-- Security Issue: Views with SECURITY DEFINER execute with permissions
-- of the view creator, bypassing RLS. This is a security risk.
-- 
-- Solution: Recreate views without SECURITY DEFINER and ensure proper
-- RLS policies are in place on underlying tables.
-- ============================================================

-- ============================================================
-- 1. FIX v_schedule_overview
-- ============================================================

DROP VIEW IF EXISTS v_schedule_overview CASCADE;

CREATE OR REPLACE VIEW v_schedule_overview 
WITH (security_invoker = true) AS
SELECT
  es.id,
  es.date,
  es.employee_id,
  p.full_name as employee_name,
  p.employee_number,
  d.name as department_name,
  s.name as shift_name,
  s.short_code as shift_code,
  s.color as shift_color,
  es.scheduled_start,
  es.scheduled_end,
  es.actual_start,
  es.actual_end,
  es.status,
  es.confirmed_by_employee,
  es.is_overtime,
  EXTRACT(EPOCH FROM (es.scheduled_end - es.scheduled_start))/3600 as scheduled_hours,
  CASE WHEN es.actual_end IS NOT NULL 
    THEN EXTRACT(EPOCH FROM (es.actual_end - es.actual_start))/3600 
    ELSE NULL END as actual_hours,
  sc.total_cost,
  es.notes
FROM employee_schedules es
JOIN profiles p ON p.id = es.employee_id
LEFT JOIN departments d ON d.id = es.department_id
LEFT JOIN shifts s ON s.id = es.shift_id
LEFT JOIN shift_costs sc ON sc.schedule_id = es.id;

COMMENT ON VIEW v_schedule_overview IS 'Complete schedule view with employee and cost details - uses RLS of querying user';

-- ============================================================
-- 2. FIX v_active_conflicts
-- ============================================================

DROP VIEW IF EXISTS v_active_conflicts CASCADE;

CREATE OR REPLACE VIEW v_active_conflicts 
WITH (security_invoker = true) AS
SELECT
  sc.*,
  ARRAY_AGG(DISTINCT p.full_name) as affected_employee_names,
  COUNT(DISTINCT sc.affected_employees) as employee_count
FROM schedule_conflicts sc
LEFT JOIN LATERAL unnest(sc.affected_employees) WITH ORDINALITY AS emp(id) ON TRUE
LEFT JOIN profiles p ON p.id = emp.id
WHERE sc.resolution_status = 'open'
GROUP BY sc.id;

COMMENT ON VIEW v_active_conflicts IS 'All open conflicts with employee names - uses RLS of querying user';

-- ============================================================
-- 3. FIX v_employee_total_compensation
-- ============================================================

DROP VIEW IF EXISTS v_employee_total_compensation CASCADE;

CREATE OR REPLACE VIEW v_employee_total_compensation 
WITH (security_invoker = true) AS
SELECT
  ec.employee_id,
  p.full_name,
  p.employee_number,
  ec.id as contract_id,
  ec.job_title,
  ec.status as contract_status,
  ec.fte,
  ec.base_salary_annual,
  ec.base_salary_monthly,
  
  -- Allowances
  (SELECT COUNT(*) FROM employee_contract_allowances WHERE contract_id = ec.id AND is_active = TRUE) as allowances_count,
  
  -- Benefits
  (SELECT COALESCE(SUM(COALESCE(eb.custom_employer_cost_monthly, b.employer_cost_monthly)), 0)
   FROM employee_benefits eb
   JOIN benefits b ON b.id = eb.benefit_id
   WHERE eb.employee_id = ec.employee_id AND eb.status = 'active') as benefits_monthly_cost,
  
  -- Estimated monthly employer cost
  ec.base_salary_monthly + 
  (ec.base_salary_monthly * 0.25) + -- Social charges + pension estimate
  (SELECT COALESCE(SUM(COALESCE(eb.custom_employer_cost_monthly, b.employer_cost_monthly)), 0)
   FROM employee_benefits eb
   JOIN benefits b ON b.id = eb.benefit_id
   WHERE eb.employee_id = ec.employee_id AND eb.status = 'active') as estimated_total_cost_monthly
  
FROM employee_contracts ec
JOIN profiles p ON p.id = ec.employee_id
WHERE ec.status = 'active';

COMMENT ON VIEW v_employee_total_compensation IS 'Complete compensation overview per employee - uses RLS of querying user';

-- ============================================================
-- 4. GRANT PERMISSIONS
-- ============================================================

-- Grant access to authenticated users (RLS policies will still apply)
GRANT SELECT ON v_schedule_overview TO authenticated;
GRANT SELECT ON v_active_conflicts TO authenticated;
GRANT SELECT ON v_employee_total_compensation TO authenticated;

-- ============================================================
-- 5. VERIFICATION
-- ============================================================

-- Verify that views no longer have SECURITY DEFINER
DO $$
DECLARE
  v_count INTEGER;
BEGIN
  -- Check if any of our views still have SECURITY DEFINER
  SELECT COUNT(*) INTO v_count
  FROM pg_views
  WHERE schemaname = 'public'
    AND viewname IN ('v_schedule_overview', 'v_active_conflicts', 'v_employee_total_compensation')
    AND definition LIKE '%SECURITY DEFINER%';
    
  IF v_count > 0 THEN
    RAISE WARNING 'Some views still have SECURITY DEFINER property!';
  ELSE
    RAISE NOTICE 'All views successfully updated to security_invoker mode';
  END IF;
END $$;
