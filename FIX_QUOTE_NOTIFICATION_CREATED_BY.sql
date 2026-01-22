-- ============================================================
-- FIX REMAINING created_by REFERENCE IN notify_quote_status_change
-- ============================================================
-- Issue: notify_quote_status_change still uses NEW.created_by
-- Fix: Update to use NEW.owner_id
-- ============================================================

-- This function is referenced in multiple old migrations but needs to be updated
-- to match the current quotes table schema (owner_id instead of created_by)

CREATE OR REPLACE FUNCTION notify_quote_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.notifications (
      user_id, type, title, message, entity_type, entity_id
    ) VALUES (
      NEW.owner_id,  -- Changed from NEW.created_by to NEW.owner_id
      'quote_status_change',
      'Quote Status Updated',
      'Quote status changed to ' || NEW.status,
      'quote',
      NEW.id
    );
  END IF;
  RETURN NEW;
END;
$$;

-- Verification
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ =============================================';
  RAISE NOTICE '✅ FIXED notify_quote_status_change FUNCTION';
  RAISE NOTICE '✅ =============================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Changed: NEW.created_by → NEW.owner_id';
  RAISE NOTICE 'Reason: quotes table uses owner_id column';
  RAISE NOTICE '';
END $$;
