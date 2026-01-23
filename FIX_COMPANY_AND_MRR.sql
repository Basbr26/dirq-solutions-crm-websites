-- ============================================================
-- FIX COMPANY STATUS + MRR CALCULATION
-- ============================================================
-- Problem 1: Company status is 'prospect', should be 'active'
-- Problem 2: Prices are yearly, should divide by 12 for MRR
-- ============================================================

-- Fix 1: Change company status to 'active'
UPDATE companies 
SET status = 'active'
WHERE name = 'Dirq Solutions';

-- Fix 2: Recalculate MRR with yearly prices divided by 12
-- Temporary fix: Manually set correct MRR
UPDATE projects
SET monthly_recurring_revenue = 99.00
WHERE id IN (
  SELECT p.id 
  FROM projects p
  JOIN quotes q ON q.project_id = p.id
  WHERE q.quote_number = 'Q-2026-001'
);

-- Fix 3: Update company total_mrr
UPDATE companies c
SET total_mrr = (
  SELECT COALESCE(SUM(p.monthly_recurring_revenue), 0)
  FROM projects p
  WHERE p.company_id = c.id
)
WHERE c.name = 'Dirq Solutions';

-- Verify the fixes
SELECT 
  'COMPANY' as type,
  c.name,
  c.status,
  c.total_mrr,
  CASE WHEN c.status = 'active' THEN '✅' ELSE '❌' END as dashboard_visible
FROM companies c
WHERE c.name = 'Dirq Solutions'

UNION ALL

SELECT 
  'PROJECT' as type,
  p.title,
  p.stage,
  p.monthly_recurring_revenue,
  CASE WHEN p.monthly_recurring_revenue = 99 THEN '✅' ELSE '❌' END
FROM projects p
JOIN companies c ON c.id = p.company_id
WHERE c.name = 'Dirq Solutions'
  AND p.monthly_recurring_revenue > 0;
