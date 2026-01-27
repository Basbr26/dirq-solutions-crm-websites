-- ============================================================
-- SHOW ACTUAL MRR DATA
-- ============================================================
-- Laat zien wat er daadwerkelijk in de database staat
-- ============================================================

-- Toon alle projects met hun MRR
SELECT 
  p.id,
  p.title as project_naam,
  p.monthly_recurring_revenue as mrr_in_database,
  c.name as company_naam,
  p.stage,
  CASE 
    WHEN p.monthly_recurring_revenue IS NULL THEN '❌ NULL'
    WHEN p.monthly_recurring_revenue = 0 THEN '⚠️ ZERO'
    ELSE '✅ HAS VALUE: €' || p.monthly_recurring_revenue::text
  END as mrr_status
FROM projects p
LEFT JOIN companies c ON c.id = p.company_id
ORDER BY p.created_at DESC
LIMIT 10;

-- Toon quotes met hun berekende MRR
SELECT 
  q.quote_number,
  q.status,
  CASE 
    WHEN q.provider_signature_data IS NOT NULL THEN '✅ Signed'
    ELSE '❌ Not signed'
  END as provider_signed,
  p.title as project_naam,
  p.monthly_recurring_revenue as project_mrr,
  STRING_AGG(qi.title || ' (' || qi.category || '): €' || (qi.quantity * qi.unit_price)::text, ', ') as items_breakdown,
  SUM(
    CASE 
      WHEN LOWER(qi.category) IN ('hosting', 'maintenance', 'onderhoud', 'subscription', 'abonnement', 'recurring', 'terugkerend')
      THEN qi.quantity * qi.unit_price
      ELSE 0
    END
  ) as calculated_mrr_from_items
FROM quotes q
LEFT JOIN projects p ON p.id = q.project_id
LEFT JOIN quote_items qi ON qi.quote_id = q.id
GROUP BY q.id, q.quote_number, q.status, q.provider_signature_data, p.id, p.title, p.monthly_recurring_revenue
ORDER BY q.created_at DESC
LIMIT 5;

-- Check company total_mrr
SELECT 
  c.id,
  c.name as company_naam,
  c.total_mrr as company_total_mrr,
  SUM(p.monthly_recurring_revenue) as sum_of_project_mrrs,
  CASE 
    WHEN c.total_mrr = SUM(p.monthly_recurring_revenue) THEN '✅ MATCH'
    ELSE '⚠️ MISMATCH - company.total_mrr should update'
  END as status
FROM companies c
LEFT JOIN projects p ON p.company_id = c.id
GROUP BY c.id, c.name, c.total_mrr
HAVING c.total_mrr > 0 OR SUM(p.monthly_recurring_revenue) > 0
ORDER BY c.name;
