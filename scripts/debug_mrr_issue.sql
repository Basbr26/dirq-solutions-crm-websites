-- DEBUG: Check actual data in database
-- Run this to see what's really happening

-- 1. Check if billing_frequency column exists
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'quote_items'
  AND column_name = 'billing_frequency';

-- 2. Check actual quote item data
SELECT 
  qi.id,
  qi.title,
  qi.unit_price,
  qi.quantity,
  qi.total_price,
  qi.billing_frequency,
  qi.category,
  LOWER(qi.category) as category_lower,
  -- Check if category matches filter
  CASE 
    WHEN LOWER(qi.category) IN ('hosting', 'maintenance', 'onderhoud', 'subscription', 'abonnement', 'recurring', 'terugkerend')
    THEN '✅ MATCHES'
    ELSE '❌ NO MATCH'
  END as category_filter_match,
  -- Calculate what MRR should be
  CASE 
    WHEN COALESCE(qi.billing_frequency, 'monthly') = 'yearly' THEN qi.total_price / 12
    WHEN qi.billing_frequency = 'quarterly' THEN qi.total_price / 3
    WHEN COALESCE(qi.billing_frequency, 'monthly') = 'monthly' THEN qi.total_price
    ELSE 0
  END as should_be_mrr
FROM quote_items qi
JOIN quotes q ON q.id = qi.quote_id
WHERE q.provider_signature_data IS NOT NULL
LIMIT 20;

-- 3. Check actual MRR values in projects and companies
SELECT 
  c.name as company,
  c.total_mrr as company_mrr,
  p.title as project,
  p.monthly_recurring_revenue as project_mrr,
  q.quote_number,
  COUNT(qi.id) as num_items,
  SUM(qi.total_price) as total_contract_value
FROM companies c
LEFT JOIN projects p ON p.company_id = c.id
LEFT JOIN quotes q ON q.project_id = p.id AND q.provider_signature_data IS NOT NULL
LEFT JOIN quote_items qi ON qi.quote_id = q.id
WHERE c.total_mrr > 0
GROUP BY c.name, c.total_mrr, p.title, p.monthly_recurring_revenue, q.quote_number
ORDER BY c.name;

-- 4. Check if trigger exists
SELECT 
  trigger_name,
  event_manipulation,
  action_timing,
  action_statement
FROM information_schema.triggers
WHERE trigger_name = 'trigger_update_project_mrr_from_quote';
