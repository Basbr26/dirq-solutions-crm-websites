-- ============================================================
-- FIX QUOTE SIGNATURE AND MRR AUTOMATION
-- ============================================================
-- 1. Auto-update project stage when provider signs quote
-- 2. Auto-calculate MRR from quote items when quote is accepted
-- ============================================================

-- Fix 1: Update trigger to also listen to provider_signature_data
CREATE OR REPLACE FUNCTION update_project_on_quote_status_change()
RETURNS TRIGGER AS $$
DECLARE
  project_exists BOOLEAN;
  current_project_stage TEXT;
  new_stage TEXT;
  new_probability INT;
BEGIN
  -- Only proceed if quote is linked to a project
  IF NEW.project_id IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Check if project exists and get current stage
  SELECT 
    EXISTS(SELECT 1 FROM projects WHERE id = NEW.project_id),
    stage INTO project_exists, current_project_stage
  FROM projects
  WHERE id = NEW.project_id;
  
  IF NOT project_exists THEN
    RETURN NEW;
  END IF;
  
  -- Determine new stage based on quote status changes
  new_stage := NULL;
  new_probability := NULL;
  
  -- Case 1: Quote sent (via email or manual status change)
  IF (NEW.status = 'sent' AND OLD.status != 'sent') OR 
     (NEW.sign_status = 'sent' AND COALESCE(OLD.sign_status, 'not_sent') != 'sent') THEN
    
    -- Move to 'quote_sent' if currently in earlier stage
    IF current_project_stage IN ('lead', 'quote_requested') THEN
      new_stage := 'quote_sent';
      new_probability := 40;
      RAISE NOTICE '📧 Quote % sent → moving project to quote_sent stage', NEW.quote_number;
    END IF;
  END IF;
  
  -- Case 2: Quote accepted (manual status) OR digitally signed OR provider signed
  IF (NEW.status = 'accepted' AND OLD.status != 'accepted') OR
     (NEW.sign_status = 'signed' AND COALESCE(OLD.sign_status, 'not_sent') != 'signed') OR
     (NEW.provider_signature_data IS NOT NULL AND OLD.provider_signature_data IS NULL) THEN
    
    -- Move to 'quote_signed' if not already in later stage
    IF current_project_stage NOT IN ('quote_signed', 'in_development', 'review', 'live', 'maintenance') THEN
      new_stage := 'quote_signed';
      new_probability := 90;
      RAISE NOTICE '✅ Quote % accepted/signed (provider signature added) → moving project to quote_signed stage', NEW.quote_number;
    ELSE
      RAISE NOTICE 'ℹ️ Project already in advanced stage (%), not updated', current_project_stage;
    END IF;
  END IF;
  
  -- Case 3: Quote rejected
  IF (NEW.status = 'rejected' AND OLD.status != 'rejected') OR
     (NEW.sign_status = 'declined' AND COALESCE(OLD.sign_status, 'not_sent') != 'declined') THEN
    
    -- Move to 'lost' if not already won
    IF current_project_stage NOT IN ('quote_signed', 'in_development', 'review', 'live', 'maintenance') THEN
      new_stage := 'lost';
      new_probability := 0;
      RAISE NOTICE '❌ Quote % rejected → moving project to lost stage', NEW.quote_number;
    END IF;
  END IF;
  
  -- Apply the update if new stage determined
  IF new_stage IS NOT NULL THEN
    UPDATE projects
    SET 
      stage = new_stage,
      probability = new_probability,
      updated_at = NOW()
    WHERE id = NEW.project_id;
    
    RAISE NOTICE '✅ Project % automatically updated to % (probability: %%)', NEW.project_id, new_stage, new_probability;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop and recreate trigger to include provider_signature_data
DROP TRIGGER IF EXISTS quote_status_update_project ON quotes;

CREATE TRIGGER quote_status_update_project
  AFTER UPDATE OF status, sign_status, provider_signature_data ON quotes
  FOR EACH ROW
  EXECUTE FUNCTION update_project_on_quote_status_change();

-- Fix 2: Auto-calculate MRR from quote items when quote is signed
CREATE OR REPLACE FUNCTION update_project_mrr_from_quote()
RETURNS TRIGGER AS $$
DECLARE
  calculated_mrr DECIMAL(10,2);
  v_project_id UUID;
BEGIN
  -- Only proceed if quote has provider signature (fully signed)
  IF NEW.provider_signature_data IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Get project_id
  v_project_id := NEW.project_id;
  
  IF v_project_id IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Calculate MRR from quote items with recurring category
  SELECT COALESCE(SUM(qi.unit_price * qi.quantity), 0)
  INTO calculated_mrr
  FROM quote_items qi
  WHERE qi.quote_id = NEW.id
    AND qi.category IN ('hosting', 'maintenance', 'subscription', 'recurring');
  
  -- Update project MRR if we have a value
  IF calculated_mrr > 0 THEN
    UPDATE projects
    SET 
      monthly_recurring_revenue = calculated_mrr,
      updated_at = NOW()
    WHERE id = v_project_id;
    
    RAISE NOTICE '💰 Project % MRR updated to €% from quote %', v_project_id, calculated_mrr, NEW.quote_number;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for MRR calculation
DROP TRIGGER IF EXISTS quote_signed_update_mrr ON quotes;

CREATE TRIGGER quote_signed_update_mrr
  AFTER UPDATE OF provider_signature_data ON quotes
  FOR EACH ROW
  WHEN (NEW.provider_signature_data IS NOT NULL AND OLD.provider_signature_data IS NULL)
  EXECUTE FUNCTION update_project_mrr_from_quote();

-- Add comments
COMMENT ON FUNCTION update_project_on_quote_status_change() IS 
  'Auto-updates project stage: sent→quote_sent, signed→quote_signed (includes provider signature), rejected→lost';

COMMENT ON FUNCTION update_project_mrr_from_quote() IS 
  'Auto-calculates MRR from quote items when provider signs quote';

COMMENT ON TRIGGER quote_signed_update_mrr ON quotes IS 
  'Calculates project MRR from recurring quote items when provider signature is added';

-- Verification message
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ =============================================';
  RAISE NOTICE '✅ QUOTE AUTOMATION ENHANCED';
  RAISE NOTICE '✅ =============================================';
  RAISE NOTICE '';
  RAISE NOTICE '📋 New Automatic Actions:';
  RAISE NOTICE '   1. Provider signature → project.stage = quote_signed';
  RAISE NOTICE '   2. Provider signature → project.monthly_recurring_revenue calculated';
  RAISE NOTICE '';
  RAISE NOTICE '💰 MRR Calculation:';
  RAISE NOTICE '   • Sums quote_items with category IN (hosting, maintenance, subscription, recurring)';
  RAISE NOTICE '   • Updates project.monthly_recurring_revenue';
  RAISE NOTICE '   • Triggers dashboard MRR recalculation';
  RAISE NOTICE '';
  RAISE NOTICE '🎯 Complete Flow:';
  RAISE NOTICE '   1. Create quote → no automation';
  RAISE NOTICE '   2. Customer signs → quote.sign_status = signed';
  RAISE NOTICE '   3. Provider signs → quote.provider_signature_data added';
  RAISE NOTICE '   4. → Project stage = quote_signed (90% probability)';
  RAISE NOTICE '   5. → Project MRR calculated from recurring items';
  RAISE NOTICE '   6. → Dashboard updates automatically! 🎉';
  RAISE NOTICE '';
END $$;
