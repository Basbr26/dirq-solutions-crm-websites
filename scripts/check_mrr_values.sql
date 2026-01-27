-- Check current MRR values and calculations
SELECT 
  c.name as company,
  c.total_mrr as company_total_mrr,
  p.name as project_name,
  p.monthly_recurring_revenue as project_mrr,
  q.quote_number,
  qi.title,
  qi.unit_price,
  qi.quantity,
  qi.total_price,
  qi.billing_frequency,
  qi.category,
  -- Show what MRR SHOULD be based on billing frequency
  CASE 
    WHEN COALESCE(qi.billing_frequency, 'monthly') = 'yearly' THEN qi.total_price / 12
    WHEN qi.billing_frequency = 'quarterly' THEN qi.total_price / 3
    WHEN COALESCE(qi.billing_frequency, 'monthly') = 'monthly' THEN qi.total_price
    ELSE 0
  END as calculated_monthly_mrr
FROM companies c
JOIN projects p ON p.company_id = c.id
JOIN quotes q ON q.project_id = p.id AND q.provider_signature_data IS NOT NULL
JOIN quote_items qi ON qi.quote_id = q.id
WHERE LOWER(qi.category) IN ('hosting', 'maintenance', 'onderhoud', 'subscription', 'abonnement', 'recurring', 'terugkerend')
ORDER BY c.name, p.name, qi.title;
