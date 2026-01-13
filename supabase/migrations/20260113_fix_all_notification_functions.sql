-- Fix all notification functions to use related_entity_type/related_entity_id
-- This overwrites the functions created in 20260107_rls_security_hardening_fixes.sql

-- Fix 1: log_ai_failure function
CREATE OR REPLACE FUNCTION log_ai_failure(
  p_user_id uuid,
  p_operation text,
  p_entity_type text,
  p_entity_id uuid,
  p_error_message text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  INSERT INTO public.notifications (
    user_id, type, priority, title, message, related_entity_type, related_entity_id
  ) VALUES (
    p_user_id,
    'ai_failure',
    'high',
    'AI Operation Failed',
    'Operation: ' || p_operation || ' - Error: ' || p_error_message,
    p_entity_type,
    p_entity_id
  );
END;
$$;

-- Fix 2: notify_users function
DROP FUNCTION IF EXISTS notify_users(uuid[],text,text,text,text,text,uuid,text,jsonb);

CREATE FUNCTION notify_users(
  p_user_ids uuid[],
  p_title text,
  p_message text,
  p_type text,
  p_priority text,
  p_entity_type text,
  p_entity_id uuid,
  p_deep_link text,
  p_metadata jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  FOREACH v_user_id IN ARRAY p_user_ids
  LOOP
    INSERT INTO public.notifications (
      user_id, type, title, message, priority, related_entity_type, related_entity_id, deep_link, metadata
    ) VALUES (
      v_user_id, p_type, p_title, p_message, p_priority, p_entity_type, p_entity_id, p_deep_link, p_metadata
    );
  END LOOP;
END;
$$;

-- Fix 3: notify_users_simple (simplified version)
CREATE OR REPLACE FUNCTION notify_users_simple(
  p_user_ids uuid[],
  p_title text,
  p_message text,
  p_type text,
  p_entity_type text,
  p_entity_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  FOREACH v_user_id IN ARRAY p_user_ids
  LOOP
    INSERT INTO public.notifications (
      user_id, type, title, message, related_entity_type, related_entity_id
    ) VALUES (
      v_user_id, p_type, p_title, p_message, p_entity_type, p_entity_id
    );
  END LOOP;
END;
$$;

-- Fix 4: notify_lead_stage_change trigger function
CREATE OR REPLACE FUNCTION notify_lead_stage_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  IF OLD.stage IS DISTINCT FROM NEW.stage THEN
    INSERT INTO public.notifications (
      user_id, type, title, message, related_entity_type, related_entity_id
    ) VALUES (
      NEW.assigned_to,
      'lead_stage_change',
      'Lead Status Updated',
      'Lead stage changed from ' || OLD.stage || ' to ' || NEW.stage,
      'lead',
      NEW.id
    );
  END IF;
  RETURN NEW;
END;
$$;

-- Fix 5: notify_quote_status_change trigger function
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
      NEW.created_by,
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

-- Fix 6: notify_project_stage_change trigger function  
CREATE OR REPLACE FUNCTION notify_project_stage_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  IF OLD.stage IS DISTINCT FROM NEW.stage THEN
    INSERT INTO public.notifications (
      user_id, type, title, message, related_entity_type, related_entity_id
    ) VALUES (
      NEW.owner_id,
      'project_stage_change',
      'Project Stage Updated',
      'Project stage changed to ' || NEW.stage,
      'project',
      NEW.id
    );
  END IF;
  RETURN NEW;
END;
$$;

-- Fix 7: notify_ai_failure function
CREATE OR REPLACE FUNCTION notify_ai_failure(
  p_operation TEXT,
  p_error_message TEXT,
  p_entity_type TEXT DEFAULT NULL,
  p_entity_id UUID DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  INSERT INTO public.notifications (
    user_id, type, priority, title, message, related_entity_type, related_entity_id
  )
  SELECT 
    id,
    'ai_failure',
    'high',
    'AI Operation Failed',
    'Operation: ' || p_operation || ' - Error: ' || p_error_message,
    p_entity_type,
    p_entity_id
  FROM public.profiles
  WHERE role = 'ADMIN';
END;
$$;
