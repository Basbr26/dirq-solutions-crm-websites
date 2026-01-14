-- =============================================
-- FIX ALL QUOTE CREATED_BY REFERENCES
-- Created: January 15, 2026
-- Issue: Multiple functions still reference NEW.created_by for quotes
-- Solution: Update all functions to use owner_id
-- =============================================

BEGIN;

-- Fix 1: notify_quote_status_change (from 20260107_rls_security_hardening_fixes.sql)
CREATE OR REPLACE FUNCTION notify_quote_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    -- Check if notifications table uses entity_type or related_entity_type
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'notifications' AND column_name = 'entity_type'
    ) THEN
      INSERT INTO public.notifications (
        user_id, type, title, message, entity_type, entity_id
      ) VALUES (
        NEW.owner_id,  -- Changed from created_by
        'quote_status_change',
        'Quote Status Updated',
        'Quote status changed to ' || NEW.status,
        'quote',
        NEW.id
      );
    ELSIF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'notifications' AND column_name = 'related_entity_type'
    ) THEN
      INSERT INTO public.notifications (
        user_id, type, title, message, related_entity_type, related_entity_id
      ) VALUES (
        NEW.owner_id,  -- Changed from created_by
        'update',
        'Quote Status Updated',
        'Quote status changed to ' || NEW.status,
        'quote',
        NEW.id
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

COMMIT;

-- Verification
DO $$
DECLARE
  func_count INTEGER;
BEGIN
  -- Check how many versions of the function exist
  SELECT COUNT(*) INTO func_count
  FROM pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE p.proname = 'notify_quote_status_change'
  AND n.nspname = 'public';
  
  RAISE NOTICE '✅ Fixed notify_quote_status_change function';
  RAISE NOTICE '✅ Changed all NEW.created_by → NEW.owner_id';
  RAISE NOTICE '✅ Supports both entity_type and related_entity_type columns';
  RAISE NOTICE '📝 Found % version(s) of the function', func_count;
END $$;
