-- =============================================
-- FIX BILLING FREQUENCY FOR YEARLY CONTRACTS
-- Created: January 27, 2026
-- Problem: Quote items with quantity=12 have billing_frequency='monthly' instead of 'yearly'
-- =============================================

BEGIN;

-- Step 1: Show current wrong data
DO $$
BEGIN
  RAISE NOTICE '=== BEFORE FIX ===';
  RAISE NOTICE 'Quote items with quantity=12 but billing_frequency=monthly:';
END $$;

SELECT 
  qi.title,
  qi.unit_price,
  qi.quantity,
  qi.total_price,
  qi.billing_frequency,
  qi.category
FROM quote_items qi
WHERE qi.quantity = 12
  AND COALESCE(qi.billing_frequency, 'monthly') = 'monthly'
  AND LOWER(qi.category) IN ('hosting', 'maintenance', 'onderhoud', 'subscription', 'abonnement', 'recurring', 'terugkerend');

-- Step 2: Fix billing_frequency for yearly contracts
-- Logic: If quantity = 12 AND category is recurring → it's a yearly contract
UPDATE quote_items
SET billing_frequency = 'yearly'
WHERE quantity = 12
  AND COALESCE(billing_frequency, 'monthly') = 'monthly'
  AND LOWER(category) IN ('hosting', 'maintenance', 'onderhoud', 'subscription', 'abonnement', 'recurring', 'terugkerend');

-- Step 3: Show what was fixed
DO $$
DECLARE
  fixed_count INTEGER;
BEGIN
  GET DIAGNOSTICS fixed_count = ROW_COUNT;
  RAISE NOTICE '✅ Updated % quote items from monthly to yearly', fixed_count;
END $$;

-- Step 4: Recalculate MRR for all signed quotes
DO $$
DECLARE
  quote_record RECORD;
  calculated_mrr DECIMAL(15,2);
  updated_count INTEGER := 0;
BEGIN
  RAISE NOTICE 'Recalculating MRR for all signed quotes...';
  
  FOR quote_record IN 
    SELECT q.id, q.project_id
    FROM quotes q
    WHERE q.provider_signature_data IS NOT NULL
      AND q.project_id IS NOT NULL
  LOOP
    -- Calculate MRR with correct billing_frequency
    SELECT 
      COALESCE(SUM(
        CASE 
          WHEN COALESCE(qi.billing_frequency, 'monthly') = 'yearly' THEN qi.total_price / 12
          WHEN qi.billing_frequency = 'quarterly' THEN qi.total_price / 3
          WHEN COALESCE(qi.billing_frequency, 'monthly') = 'monthly' THEN qi.total_price
          ELSE 0
        END
      ), 0)
    INTO calculated_mrr
    FROM quote_items qi
    WHERE qi.quote_id = quote_record.id
      AND LOWER(qi.category) IN ('hosting', 'maintenance', 'onderhoud', 'subscription', 'abonnement', 'recurring', 'terugkerend');
    
    -- Update project MRR
    UPDATE projects
    SET monthly_recurring_revenue = calculated_mrr
    WHERE id = quote_record.project_id;
    
    updated_count := updated_count + 1;
  END LOOP;
  
  RAISE NOTICE '✅ Updated MRR for % projects', updated_count;
END $$;

-- Step 5: Recalculate company total MRR
UPDATE companies c
SET total_mrr = (
  SELECT COALESCE(SUM(p.monthly_recurring_revenue), 0)
  FROM projects p
  WHERE p.company_id = c.id
);

DO $$
BEGIN
  RAISE NOTICE '✅ Recalculated total_mrr for all companies';
END $$;

-- Step 6: Verify the fix
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=== AFTER FIX ===';
  RAISE NOTICE 'Run this query to verify:';
END $$;

SELECT 
  c.name as company,
  c.total_mrr as company_mrr,
  p.title as project,
  p.monthly_recurring_revenue as project_mrr,
  qi.title,
  qi.unit_price,
  qi.quantity,
  qi.total_price,
  qi.billing_frequency,
  CASE 
    WHEN COALESCE(qi.billing_frequency, 'monthly') = 'yearly' THEN qi.total_price / 12
    WHEN qi.billing_frequency = 'quarterly' THEN qi.total_price / 3
    WHEN COALESCE(qi.billing_frequency, 'monthly') = 'monthly' THEN qi.total_price
    ELSE 0
  END as calculated_mrr
FROM companies c
JOIN projects p ON p.company_id = c.id
JOIN quotes q ON q.project_id = p.id AND q.provider_signature_data IS NOT NULL
JOIN quote_items qi ON qi.quote_id = q.id
WHERE LOWER(qi.category) IN ('hosting', 'maintenance', 'onderhoud', 'subscription', 'abonnement', 'recurring', 'terugkerend')
ORDER BY c.name, p.title, qi.title;

COMMIT;

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '===========================================';
  RAISE NOTICE '✅ BILLING FREQUENCY FIX COMPLETED';
  RAISE NOTICE '===========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Summary:';
  RAISE NOTICE '• Fixed billing_frequency for yearly contracts (quantity=12)';
  RAISE NOTICE '• Recalculated all project MRR values';
  RAISE NOTICE '• Updated all company total_mrr values';
  RAISE NOTICE '';
  RAISE NOTICE 'Your MRR should now show MONTHLY values! 🎉';
END $$;
