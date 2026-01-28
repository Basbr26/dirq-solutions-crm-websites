-- =============================================
-- FIX MRR CALCULATION - USE UNIT_PRICE INSTEAD OF TOTAL_PRICE
-- Created: January 28, 2026
-- Problem: MRR shows yearly values instead of monthly
-- Root Cause: Using total_price (unit_price × quantity) instead of unit_price
-- =============================================

-- EXPLANATION:
-- Quote items store:
--   - unit_price: The price per unit per billing period (€100/month per license)
--   - quantity: Number of units (e.g., 5 licenses, 1 hosting package)
--   - total_price: unit_price × quantity (total for this item per billing period)
--   - billing_frequency: 'monthly', 'yearly', 'quarterly', 'one-time'
--
-- For MRR calculation, we need the MONTHLY revenue:
--   - Monthly billing: unit_price is per month → MRR = unit_price × quantity
--   - Yearly billing: unit_price is per year → MRR = (unit_price × quantity) / 12
--   - Quarterly billing: unit_price is per quarter → MRR = (unit_price × quantity) / 3
--   - One-time: Not recurring → MRR = 0
--
-- Example 1: 5 user licenses at €20/month each
--   unit_price = €20, quantity = 5, billing = 'monthly'
--   MRR = €20 × 5 = €100/month ✓
--
-- Example 2: 1 hosting package at €1,200/year
--   unit_price = €1,200, quantity = 1, billing = 'yearly'
--   MRR = (€1,200 × 1) / 12 = €100/month ✓

-- =============================================
-- STEP 1: Drop and recreate the function with correct logic
-- =============================================

DROP TRIGGER IF EXISTS trigger_update_project_mrr_from_quote ON quotes;
DROP FUNCTION IF EXISTS update_project_mrr_from_quote();

CREATE FUNCTION update_project_mrr_from_quote()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  project_mrr DECIMAL(15,2);
  project_company_id UUID;
BEGIN
  -- Only calculate MRR when quote is signed by provider (becomes active)
  IF NEW.provider_signature_data IS NOT NULL AND OLD.provider_signature_data IS NULL THEN
    
    -- Calculate MRR from quote items using UNIT_PRICE (not total_price)
    SELECT 
      COALESCE(SUM(
        CASE 
          -- Yearly: Unit price is for full year, convert to monthly
          WHEN COALESCE(qi.billing_frequency, 'monthly') = 'yearly' THEN 
            (qi.unit_price * qi.quantity) / 12
          
          -- Quarterly: Unit price is for quarter (3 months), convert to monthly
          WHEN qi.billing_frequency = 'quarterly' THEN 
            (qi.unit_price * qi.quantity) / 3
          
          -- Monthly: Unit price is already monthly
          WHEN COALESCE(qi.billing_frequency, 'monthly') = 'monthly' THEN 
            qi.unit_price * qi.quantity
          
          -- One-time: Not recurring revenue
          ELSE 0
        END
      ), 0)
    INTO project_mrr
    FROM quote_items qi
    WHERE qi.quote_id = NEW.id
      -- Only count recurring revenue categories
      AND LOWER(COALESCE(qi.category, '')) IN (
        'hosting', 'maintenance', 'onderhoud', 'subscription', 
        'abonnement', 'recurring', 'terugkerend', 'licenties', 'licenses'
      );
    
    -- Update project's monthly_recurring_revenue
    UPDATE projects
    SET monthly_recurring_revenue = project_mrr
    WHERE id = NEW.project_id;
    
    -- Get project's company_id
    SELECT company_id INTO project_company_id
    FROM projects
    WHERE id = NEW.project_id;
    
    -- Update company's total_mrr (sum of all project MRRs)
    IF project_company_id IS NOT NULL THEN
      UPDATE companies
      SET 
        total_mrr = (
          SELECT COALESCE(SUM(monthly_recurring_revenue), 0)
          FROM projects
          WHERE company_id = project_company_id
        ),
        -- Set company to active when first contract is signed
        status = CASE 
          WHEN status IN ('prospect', 'lead') THEN 'active'
          ELSE status
        END
      WHERE id = project_company_id;
    END IF;
    
    RAISE NOTICE '✅ Updated MRR for project % to €%', NEW.project_id, project_mrr;
  END IF;

  RETURN NEW;
END;
$$;

-- =============================================
-- STEP 2: Recreate trigger
-- =============================================

CREATE TRIGGER trigger_update_project_mrr_from_quote
  AFTER UPDATE ON quotes
  FOR EACH ROW
  EXECUTE FUNCTION update_project_mrr_from_quote();

-- =============================================
-- STEP 3: Add comments
-- =============================================

COMMENT ON FUNCTION update_project_mrr_from_quote() IS 
'Calculates MRR from quote items using unit_price (not total_price).
For yearly billing: (unit_price × quantity) / 12
For quarterly: (unit_price × quantity) / 3  
For monthly: unit_price × quantity';

COMMENT ON TRIGGER trigger_update_project_mrr_from_quote ON quotes IS
'Updates project and company MRR when provider signs quote. Uses unit_price for accurate monthly calculations.';

-- =============================================
-- STEP 4: Recalculate ALL existing MRR values
-- =============================================

DO $$
DECLARE
  quote_record RECORD;
  calculated_mrr DECIMAL(15,2);
  updated_count INTEGER := 0;
BEGIN
  RAISE NOTICE '🔄 Recalculating MRR for all signed quotes using unit_price...';
  
  -- Loop through all signed quotes
  FOR quote_record IN 
    SELECT q.id, q.project_id, q.quote_number
    FROM quotes q
    WHERE q.provider_signature_data IS NOT NULL
      AND q.project_id IS NOT NULL
  LOOP
    -- Calculate MRR using UNIT_PRICE (correct method)
    SELECT 
      COALESCE(SUM(
        CASE 
          WHEN COALESCE(qi.billing_frequency, 'monthly') = 'yearly' THEN 
            (qi.unit_price * qi.quantity) / 12
          WHEN qi.billing_frequency = 'quarterly' THEN 
            (qi.unit_price * qi.quantity) / 3
          WHEN COALESCE(qi.billing_frequency, 'monthly') = 'monthly' THEN 
            qi.unit_price * qi.quantity
          ELSE 0
        END
      ), 0)
    INTO calculated_mrr
    FROM quote_items qi
    WHERE qi.quote_id = quote_record.id
      AND LOWER(COALESCE(qi.category, '')) IN (
        'hosting', 'maintenance', 'onderhoud', 'subscription', 
        'abonnement', 'recurring', 'terugkerend', 'licenties', 'licenses'
      );
    
    -- Update project MRR
    UPDATE projects
    SET monthly_recurring_revenue = calculated_mrr
    WHERE id = quote_record.project_id;
    
    updated_count := updated_count + 1;
    
    RAISE NOTICE '  → Quote % → Project % → MRR: €%', 
      quote_record.quote_number, 
      quote_record.project_id, 
      calculated_mrr;
  END LOOP;
  
  RAISE NOTICE '✅ Updated MRR for % projects', updated_count;
  
  -- Recalculate all company total_mrr values
  UPDATE companies c
  SET total_mrr = (
    SELECT COALESCE(SUM(p.monthly_recurring_revenue), 0)
    FROM projects p
    WHERE p.company_id = c.id
  );
  
  RAISE NOTICE '✅ Recalculated total_mrr for all companies';
  RAISE NOTICE '';
  RAISE NOTICE '===========================================';
  RAISE NOTICE '✅ MRR FIX COMPLETED SUCCESSFULLY';
  RAISE NOTICE '===========================================';
END $$;

-- =============================================
-- VERIFICATION QUERY
-- =============================================

-- Run this to verify MRR calculations:
-- SELECT 
--   c.name as company,
--   c.total_mrr as company_mrr,
--   p.name as project,
--   p.monthly_recurring_revenue as project_mrr,
--   q.quote_number,
--   qi.title,
--   qi.unit_price,
--   qi.quantity,
--   qi.billing_frequency,
--   qi.category,
--   CASE
--     WHEN COALESCE(qi.billing_frequency, 'monthly') = 'yearly' THEN (qi.unit_price * qi.quantity) / 12
--     WHEN qi.billing_frequency = 'quarterly' THEN (qi.unit_price * qi.quantity) / 3
--     WHEN COALESCE(qi.billing_frequency, 'monthly') = 'monthly' THEN qi.unit_price * qi.quantity
--     ELSE 0
--   END as calculated_mrr_per_item
-- FROM companies c
-- JOIN projects p ON p.company_id = c.id
-- JOIN quotes q ON q.project_id = p.id
-- JOIN quote_items qi ON qi.quote_id = q.id
-- WHERE q.provider_signature_data IS NOT NULL
--   AND LOWER(COALESCE(qi.category, '')) IN ('hosting', 'maintenance', 'onderhoud', 'subscription', 'abonnement', 'recurring', 'terugkerend', 'licenties', 'licenses')
-- ORDER BY c.name, p.name, qi.item_order;
