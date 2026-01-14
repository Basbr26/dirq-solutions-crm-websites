-- =============================================
-- FIX QUOTE NOTIFICATION TRIGGER
-- Created: January 15, 2026
-- Issue: notify_quote_status_change uses NEW.created_by but column is owner_id
-- Solution: Update trigger function to use owner_id
-- =============================================

BEGIN;

-- Fix notify_quote_status_change to use owner_id instead of created_by
CREATE OR REPLACE FUNCTION notify_quote_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.notifications (
      user_id, type, title, message, related_entity_type, related_entity_id
    ) VALUES (
      NEW.owner_id,  -- Changed from NEW.created_by
      'update',
      'Quote Status Updated',
      'Quote status changed to ' || NEW.status,
      'quote',
      NEW.id
    );
  END IF;
  RETURN NEW;
END;
$$;

COMMIT;

-- Verification
DO $$
BEGIN
  RAISE NOTICE '✅ Fixed notify_quote_status_change function';
  RAISE NOTICE '✅ Changed NEW.created_by → NEW.owner_id';
  RAISE NOTICE '📝 Quote status updates will now work correctly';
END $$;
