-- ============================================================
-- CHECK COMPANY STATUS
-- ============================================================
-- Dashboard filtert op status = 'active'!
-- ============================================================

SELECT 
  c.id,
  c.name,
  c.status,
  c.total_mrr,
  CASE 
    WHEN c.status = 'active' THEN '✅ Will show in dashboard'
    ELSE '❌ NOT ACTIVE - Change status to "active"'
  END as dashboard_visibility
FROM companies c
WHERE c.total_mrr > 0
ORDER BY c.name;

-- If status is NOT 'active', fix it:
-- UPDATE companies SET status = 'active' WHERE name = 'Dirq Solutions';
