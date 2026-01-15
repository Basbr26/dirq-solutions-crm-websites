-- =============================================
-- AUTO-UPDATE PROJECT STAGE WHEN QUOTE STATUS CHANGES
-- Created: January 15, 2026
-- Purpose: Automatically update project stage based on quote lifecycle
-- =============================================

BEGIN;

-- ============================================================================
-- TRIGGER FUNCTION: Update project stage when quote status changes
-- ============================================================================

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
  
  -- Case 2: Quote accepted (manual status) OR digitally signed
  IF (NEW.status = 'accepted' AND OLD.status != 'accepted') OR
     (NEW.sign_status = 'signed' AND COALESCE(OLD.sign_status, 'not_sent') != 'signed') THEN
    
    -- Move to 'quote_signed' if not already in later stage
    IF current_project_stage NOT IN ('quote_signed', 'in_development', 'review', 'live', 'maintenance') THEN
      new_stage := 'quote_signed';
      new_probability := 90;
      RAISE NOTICE '✅ Quote % accepted/signed → moving project to quote_signed stage', NEW.quote_number;
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

-- ============================================================================
-- CREATE TRIGGER
-- ============================================================================

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS quote_status_update_project ON quotes;
DROP TRIGGER IF EXISTS quote_signed_update_project ON quotes;

-- Create trigger for quote status changes
CREATE TRIGGER quote_status_update_project
  AFTER UPDATE OF status, sign_status ON quotes
  FOR EACH ROW
  EXECUTE FUNCTION update_project_on_quote_status_change();

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON FUNCTION update_project_on_quote_status_change() IS 
  'Automatically updates project stage based on quote status: sent→quote_sent, accepted/signed→quote_signed, rejected→lost';

COMMENT ON TRIGGER quote_status_update_project ON quotes IS 
  'Triggers project stage update when quote status or sign_status changes';

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ =============================================';
  RAISE NOTICE '✅ TRIGGER INSTALLED: quote_status_update_project';
  RAISE NOTICE '✅ =============================================';
  RAISE NOTICE '';
  RAISE NOTICE '📋 Automatic Project Updates:';
  RAISE NOTICE '   ┌─────────────────────┬─────────────────────┬─────────────┐';
  RAISE NOTICE '   │ Quote Status        │ Project Stage       │ Probability │';
  RAISE NOTICE '   ├─────────────────────┼─────────────────────┼─────────────┤';
  RAISE NOTICE '   │ status = sent       │ → quote_sent        │ 40%%         │';
  RAISE NOTICE '   │ sign_status = sent  │ → quote_sent        │ 40%%         │';
  RAISE NOTICE '   │ status = accepted   │ → quote_signed      │ 90%%         │';
  RAISE NOTICE '   │ sign_status = signed│ → quote_signed      │ 90%%         │';
  RAISE NOTICE '   │ status = rejected   │ → lost              │ 0%%          │';
  RAISE NOTICE '   └─────────────────────┴─────────────────────┴─────────────┘';
  RAISE NOTICE '';
  RAISE NOTICE '🎯 Example Flow:';
  RAISE NOTICE '   1. Create quote → project blijft in huidige stage';
  RAISE NOTICE '   2. Send quote (email) → project.stage → quote_sent';
  RAISE NOTICE '   3. Customer signs → project.stage → quote_signed';
  RAISE NOTICE '   4. Pipeline updates automatically! 🎉';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  Protection: Won''t downgrade projects in advanced stages';
  RAISE NOTICE '';
END $$;

COMMIT;

-- ============================================================================
-- TEST SCENARIO (Optional - comment out for production)
-- ============================================================================

/*
-- Test 1: Update quote status to accepted
UPDATE quotes 
SET status = 'accepted', accepted_at = NOW()
WHERE quote_number = 'Q-2026-001';

-- Test 2: Update quote sign_status to signed (digital signing)
UPDATE quotes
SET sign_status = 'signed', signed_at = NOW(), signed_by_name = 'Test User'
WHERE quote_number = 'Q-2026-002';

-- Verify project was updated
SELECT 
  q.quote_number,
  q.status,
  q.sign_status,
  p.title as project_title,
  p.stage as project_stage,
  p.probability
FROM quotes q
LEFT JOIN projects p ON q.project_id = p.id
WHERE q.quote_number IN ('Q-2026-001', 'Q-2026-002');
*/
