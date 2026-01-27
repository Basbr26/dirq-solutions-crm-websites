-- =============================================
-- FIX MRR CALCULATION LOGIC
-- Created: January 27, 2026
-- Problem: MRR shows yearly revenue instead of monthly
-- =============================================

-- The issue:
-- Quote items store: unit_price (monthly), quantity (12 months), billing_frequency ('yearly')
-- Current trigger uses: qi.price (which is unit_price × quantity = YEARLY total)
-- Fix: Use unit_price instead of price for MRR calculation

-- =============================================
-- STEP 1: Drop existing trigger and function
-- =============================================

DROP TRIGGER IF EXISTS trigger_update_project_mrr_from_quote ON quotes;
DROP FUNCTION IF EXISTS update_project_mrr_from_quote();

-- =============================================
-- STEP 2: Create corrected MRR function
-- =============================================

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
    
    -- Calculate MRR from quote items
    -- Logic:
    -- - total_price is the TOTAL contract value (unit_price × quantity)
    -- - billing_frequency indicates payment schedule
    -- - For yearly contracts: total_price is the yearly amount, so divide by 12 for MRR
    -- - For quarterly: total_price is quarterly amount, so divide by 3 for MRR  
    -- - For monthly: total_price IS the MRR
    
    SELECT 
      COALESCE(SUM(
        CASE 
          -- Yearly: Total contract value is yearly, convert to monthly
          WHEN COALESCE(qi.billing_frequency, 'monthly') = 'yearly' THEN qi.total_price / 12
          
          -- Quarterly: Total value is for 3 months, convert to monthly
          WHEN qi.billing_frequency = 'quarterly' THEN qi.total_price / 3
          
          -- Monthly: Total price IS the monthly revenue
          WHEN COALESCE(qi.billing_frequency, 'monthly') = 'monthly' THEN qi.total_price
          
          -- One-time: Not recurring, so 0 MRR
          ELSE 0
        END
      ), 0)
    INTO project_mrr
    FROM quote_items qi
    WHERE qi.quote_id = NEW.id
      -- Only count recurring revenue categories
      AND LOWER(qi.category) IN ('hosting', 'maintenance', 'onderhoud', 'subscription', 'abonnement', 'recurring', 'terugkerend');
    
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
  END IF;

  RETURN NEW;
END;
$$;

-- =============================================
-- STEP 3: Recreate trigger
-- =============================================

CREATE TRIGGER trigger_update_project_mrr_from_quote
  AFTER UPDATE ON quotes
  FOR EACH ROW
  EXECUTE FUNCTION update_project_mrr_from_quote();

-- =============================================
-- STEP 4: Add helpful comments
-- =============================================

COMMENT ON FUNCTION update_project_mrr_from_quote() IS 
'Calculates Monthly Recurring Revenue from signed quotes. 
Converts yearly/quarterly total_price to monthly equivalent.
Formula: yearly = total_price / 12, quarterly = total_price / 3, monthly = total_price as-is';

COMMENT ON TRIGGER trigger_update_project_mrr_from_quote ON quotes IS
'Updates project and company MRR when provider signs quote';

-- =============================================
-- STEP 5: Recalculate existing MRR values
-- =============================================

DO $$
DECLARE
  quote_record RECORD;
  calculated_mrr DECIMAL(15,2);
  updated_count INTEGER := 0;
BEGIN
  RAISE NOTICE 'Recalculating MRR for all signed quotes...';
  
  -- Loop through all signed quotes
  FOR quote_record IN 
    SELECT q.id, q.project_id
    FROM quotes q
    WHERE q.provider_signature_data IS NOT NULL
      AND q.project_id IS NOT NULL
  LOOP
    -- Calculate MRR for this quote
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
    
    -- Update project
    UPDATE projects
    SET monthly_recurring_revenue = calculated_mrr
    WHERE id = quote_record.project_id;
    
    updated_count := updated_count + 1;
  END LOOP;
  
  RAISE NOTICE 'Updated MRR for % projects', updated_count;
  
  -- Recalculate all company totals
  UPDATE companies c
  SET total_mrr = (
    SELECT COALESCE(SUM(p.monthly_recurring_revenue), 0)
    FROM projects p
    WHERE p.company_id = c.id
  );
  
  RAISE NOTICE 'Recalculated total_mrr for all companies';
END $$;

-- =============================================
-- VERIFICATION QUERIES
-- =============================================

DO $$
BEGIN
  RAISE NOTICE '===========================================';
  RAISE NOTICE 'MRR FIX APPLIED SUCCESSFULLY';
  RAISE NOTICE '===========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'To verify MRR calculations, run:';
  RAISE NOTICE '';
  RAISE NOTICE 'SELECT ';
  RAISE NOTICE '  c.name as company,';
  RAISE NOTICE '  c.total_mrr as company_mrr,';
  RAISE NOTICE '  p.name as project,';
  RAISE NOTICE '  p.monthly_recurring_revenue as project_mrr,';
  RAISE NOTICE '  q.quote_number,';
  RAISE NOTICE '  qi.description,';
  RAISE NOTICE '  qi.unit_price,';
  RAISE NOTICE '  qi.quantity,';
  RAISE NOTICE '  qi.billing_frequency,';
  RAISE NOTICE '  (qi.unit_price * qi.quantity) as total_contract_value,';
  RAISE NOTICE '  CASE';
  RAISE NOTICE '    WHEN COALESCE(qi.billing_frequency, ''monthly'') = ''yearly'' THEN qi.total_price / 12';
  RAISE NOTICE '    WHEN qi.billing_frequency = ''quarterly'' THEN qi.total_price / 3';
  RAISE NOTICE '    WHEN COALESCE(qi.billing_frequency, ''monthly'') = ''monthly'' THEN qi.total_price';
  RAISE NOTICE '    ELSE 0';
  RAISE NOTICE '  END as calculated_monthly_revenue';
  RAISE NOTICE 'FROM companies c';
  RAISE NOTICE 'LEFT JOIN projects p ON p.company_id = c.id';
  RAISE NOTICE 'LEFT JOIN quotes q ON q.project_id = p.id AND q.provider_signature_data IS NOT NULL';
  RAISE NOTICE 'LEFT JOIN quote_items qi ON qi.quote_id = q.id';
  RAISE NOTICE 'WHERE c.total_mrr > 0';
  RAISE NOTICE 'ORDER BY c.name, p.name, qi.sort_order;';
END $$;
