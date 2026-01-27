-- ============================================================
-- MANUAL MRR FIX - Direct Update
-- ============================================================
-- Dit script berekent MRR handmatig voor alle getekende quotes
-- Gebruik dit als de triggers nog niet zijn geïnstalleerd
-- ============================================================

-- First, let's see what we're working with
SELECT 
  q.quote_number,
  q.project_id,
  p.title as project_title,
  p.monthly_recurring_revenue as current_mrr,
  COALESCE(SUM(
    CASE 
      WHEN LOWER(qi.category) IN ('hosting', 'maintenance', 'onderhoud', 'subscription', 'abonnement', 'recurring', 'terugkerend')
      THEN qi.quantity * qi.unit_price
      ELSE 0
    END
  ), 0) as should_be_mrr
FROM quotes q
LEFT JOIN projects p ON p.id = q.project_id
LEFT JOIN quote_items qi ON qi.quote_id = q.id
WHERE q.provider_signature_data IS NOT NULL
  AND q.project_id IS NOT NULL
GROUP BY q.quote_number, q.project_id, p.title, p.monthly_recurring_revenue
ORDER BY q.quote_number;

-- Now update the MRR for all projects with signed quotes
UPDATE projects p
SET 
  monthly_recurring_revenue = subquery.calculated_mrr,
  updated_at = NOW()
FROM (
  SELECT 
    q.project_id,
    COALESCE(SUM(
      CASE 
        WHEN LOWER(qi.category) IN ('hosting', 'maintenance', 'onderhoud', 'subscription', 'abonnement', 'recurring', 'terugkerend')
        THEN qi.quantity * qi.unit_price
        ELSE 0
      END
    ), 0) as calculated_mrr
  FROM quotes q
  JOIN quote_items qi ON qi.quote_id = q.id
  WHERE q.provider_signature_data IS NOT NULL
    AND q.project_id IS NOT NULL
  GROUP BY q.project_id
) AS subquery
WHERE p.id = subquery.project_id
  AND subquery.calculated_mrr > 0;

-- Verify the update
SELECT 
  p.id,
  p.title,
  p.monthly_recurring_revenue as mrr,
  q.quote_number
FROM projects p
JOIN quotes q ON q.project_id = p.id
WHERE q.provider_signature_data IS NOT NULL
  AND p.monthly_recurring_revenue > 0
ORDER BY p.title;
