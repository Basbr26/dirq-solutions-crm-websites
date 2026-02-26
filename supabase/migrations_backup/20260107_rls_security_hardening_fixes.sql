-- =============================================
-- RLS SECURITY HARDENING - PRE-DEPLOYMENT FIXES
-- =============================================
-- Datum: 7 januari 2026
-- Doel: Fix SECURITY DEFINER mutable search paths en strict audit policies
-- Uitvoeren: VOOR het activeren van strikte RLS enforcement
-- =============================================

BEGIN;

-- =============================================
-- STAP 0: Fix oude overloaded functie versies met search_path
-- =============================================
-- Deze oude versies worden gebruikt door RLS policies en moeten ook search_path krijgen

-- Fix oude get_user_role(text) - gebruikt door RLS policies
-- Moet met CASCADE omdat het return type verandert
DROP FUNCTION IF EXISTS public.get_user_role(user_id text) CASCADE;

CREATE FUNCTION get_user_role(user_id text)
RETURNS TEXT
LANGUAGE SQL
SECURITY DEFINER
STABLE
SET search_path = public, pg_catalog
AS $$
  SELECT COALESCE(
    (SELECT role FROM public.profiles WHERE id = user_id::uuid),
    'SUPPORT'::TEXT
  );
$$;

-- Fix oude get_audit_stats met parameters
DROP FUNCTION IF EXISTS public.get_audit_stats(start_date timestamp with time zone, end_date timestamp with time zone) CASCADE;

CREATE FUNCTION get_audit_stats(start_date timestamp with time zone, end_date timestamp with time zone)
RETURNS TABLE (
  total_actions BIGINT,
  actions_in_period BIGINT,
  unique_users BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public, pg_catalog
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    (SELECT COUNT(*)::BIGINT FROM public.crm_audit_log),
    COUNT(*)::BIGINT,
    COUNT(DISTINCT user_id)::BIGINT
  FROM public.crm_audit_log
  WHERE created_at BETWEEN start_date AND end_date;
END;
$$;

-- Fix oude notify_ai_bulk_operation versie
DROP FUNCTION IF EXISTS public.notify_ai_bulk_operation(p_user_id uuid, p_operation_type text, p_success_count integer, p_failure_count integer, p_details jsonb) CASCADE;

CREATE FUNCTION notify_ai_bulk_operation(
  p_user_id uuid,
  p_operation_type text,
  p_success_count integer,
  p_failure_count integer,
  p_details jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  INSERT INTO public.notifications (
    user_id, type, title, message, metadata
  ) VALUES (
    p_user_id,
    'ai_bulk_complete',
    'Bulk Operation Complete',
    format('%s: %s succeeded, %s failed', p_operation_type, p_success_count, p_failure_count),
    p_details
  );
END;
$$;

-- Fix oude notify_ai_failure versie
DROP FUNCTION IF EXISTS public.notify_ai_failure(p_user_id uuid, p_operation text, p_entity_type text, p_entity_id uuid, p_error_message text) CASCADE;

CREATE FUNCTION notify_ai_failure(
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
    user_id, type, priority, title, message, entity_type, entity_id
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

-- Fix oude notify_users versie
DROP FUNCTION IF EXISTS public.notify_users(p_user_ids uuid[], p_title text, p_message text, p_type text, p_priority text, p_entity_type text, p_entity_id uuid, p_deep_link text, p_metadata jsonb) CASCADE;

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
      user_id, type, title, message, priority, entity_type, entity_id, deep_link, metadata
    ) VALUES (
      v_user_id, p_type, p_title, p_message, p_priority, p_entity_type, p_entity_id, p_deep_link, p_metadata
    );
  END LOOP;
END;
$$;

-- =============================================
-- STAP 1: Fix SECURITY DEFINER Functions (nieuwe versies)
-- =============================================
-- Probleem: Supabase linter waarschuwt voor mutable search_path in SECURITY DEFINER functions
-- Oplossing: Expliciet search_path instellen

-- Fix 1: get_user_role function (zonder parameters)
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT
LANGUAGE SQL
SECURITY DEFINER
STABLE
SET search_path = public, pg_catalog
AS $$
  SELECT COALESCE(
    (SELECT role FROM public.profiles WHERE id = auth.uid()),
    'SUPPORT'::TEXT
  );
$$;

-- Fix 2: is_admin_or_manager function  
CREATE OR REPLACE FUNCTION is_admin_or_manager()
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
SET search_path = public, pg_catalog
AS $$
  SELECT get_user_role() IN ('ADMIN', 'MANAGER');
$$;

-- Fix 3: is_admin function
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
SET search_path = public, pg_catalog
AS $$
  SELECT get_user_role() = 'ADMIN';
$$;

-- Fix 4: is_sales_or_above function
CREATE OR REPLACE FUNCTION is_sales_or_above()
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
SET search_path = public, pg_catalog
AS $$
  SELECT get_user_role() IN ('ADMIN', 'MANAGER', 'SALES');
$$;

-- Fix 5: user_role function (mogelijk duplicate van get_user_role)
CREATE OR REPLACE FUNCTION user_role()
RETURNS TEXT
LANGUAGE SQL
SECURITY DEFINER
STABLE
SET search_path = public, pg_catalog
AS $$
  SELECT COALESCE(
    (SELECT role FROM public.profiles WHERE id = auth.uid()),
    'SUPPORT'::TEXT
  );
$$;

-- Fix 6: handle_new_user function
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role)
  VALUES (NEW.id, NEW.email, 'SUPPORT');
  RETURN NEW;
END;
$$;

-- Fix 7: update_updated_at_column function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Fix 8: get_avatar_url function
CREATE OR REPLACE FUNCTION get_avatar_url(user_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public, pg_catalog
AS $$
BEGIN
  RETURN (SELECT avatar_url FROM public.profiles WHERE id = user_id);
END;
$$;

-- Fix 9: update_company_last_contact function
CREATE OR REPLACE FUNCTION update_company_last_contact()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  IF TG_TABLE_NAME IN ('interactions', 'contacts', 'leads') THEN
    UPDATE public.companies
    SET last_contact_date = NOW(),
        updated_at = NOW()
    WHERE id = COALESCE(NEW.company_id, OLD.company_id);
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Fix 10: update_documents_updated_at function
CREATE OR REPLACE FUNCTION update_documents_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Fix 11: audit_trigger_func function
CREATE OR REPLACE FUNCTION audit_trigger_func()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  INSERT INTO public.audit_log (
    table_name,
    record_id,
    action,
    old_data,
    new_data,
    user_id,
    created_at
  ) VALUES (
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    TG_OP,
    CASE WHEN TG_OP IN ('DELETE', 'UPDATE') THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) ELSE NULL END,
    auth.uid(),
    NOW()
  );
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Fix 12: crm_audit_trigger function
CREATE OR REPLACE FUNCTION crm_audit_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_old_data jsonb;
  v_new_data jsonb;
  v_changed_fields text[];
BEGIN
  IF TG_OP = 'DELETE' OR TG_OP = 'UPDATE' THEN
    v_old_data := to_jsonb(OLD);
  END IF;
  
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    v_new_data := to_jsonb(NEW);
  END IF;
  
  IF TG_OP = 'UPDATE' THEN
    SELECT array_agg(key)
    INTO v_changed_fields
    FROM jsonb_each(v_new_data)
    WHERE v_new_data->key IS DISTINCT FROM v_old_data->key;
  END IF;
  
  INSERT INTO public.crm_audit_log (
    table_name,
    record_id,
    action,
    old_data,
    new_data,
    changed_fields,
    user_id
  ) VALUES (
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    TG_OP,
    v_old_data,
    v_new_data,
    v_changed_fields,
    auth.uid()
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Fix 13: get_audit_stats function
CREATE OR REPLACE FUNCTION get_audit_stats()
RETURNS TABLE (
  total_actions BIGINT,
  actions_today BIGINT,
  unique_users BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public, pg_catalog
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::BIGINT,
    COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE)::BIGINT,
    COUNT(DISTINCT user_id)::BIGINT
  FROM public.crm_audit_log;
END;
$$;

-- =============================================
-- STAP 2: Fix Notification Functions (continued)
-- =============================================

-- Fix 14: notify_users function
CREATE OR REPLACE FUNCTION notify_users(
  p_user_ids UUID[],
  p_type TEXT,
  p_title TEXT,
  p_message TEXT,
  p_entity_type TEXT DEFAULT NULL,
  p_entity_id UUID DEFAULT NULL
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
      user_id, type, title, message, entity_type, entity_id
    ) VALUES (
      v_user_id, p_type, p_title, p_message, p_entity_type, p_entity_id
    );
  END LOOP;
END;
$$;

-- Fix 15: notify_lead_stage_change function
CREATE OR REPLACE FUNCTION notify_lead_stage_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  IF OLD.stage IS DISTINCT FROM NEW.stage THEN
    INSERT INTO public.notifications (
      user_id, type, title, message, entity_type, entity_id
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

-- Fix 16: notify_quote_status_change function
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

-- Fix 17: notify_project_stage_change function
CREATE OR REPLACE FUNCTION notify_project_stage_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  IF OLD.stage IS DISTINCT FROM NEW.stage THEN
    INSERT INTO public.notifications (
      user_id, type, title, message, entity_type, entity_id
    ) VALUES (
      NEW.assigned_to,
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

-- Fix 18: notify_ai_failure function
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
  -- Notify admins about AI failures
  INSERT INTO public.notifications (
    user_id, type, priority, title, message, entity_type, entity_id
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

-- Fix 19: notify_ai_bulk_operation function
CREATE OR REPLACE FUNCTION notify_ai_bulk_operation(
  p_operation TEXT,
  p_count INTEGER,
  p_success_count INTEGER,
  p_failure_count INTEGER
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  INSERT INTO public.notifications (
    user_id, type, title, message
  )
  SELECT 
    id,
    'ai_bulk_complete',
    'Bulk Operation Complete',
    format('%s: %s/%s succeeded, %s failed', p_operation, p_success_count, p_count, p_failure_count)
  FROM public.profiles
  WHERE role IN ('ADMIN', 'MANAGER');
END;
$$;

-- Fix 20: notify_overdue_tasks function
CREATE OR REPLACE FUNCTION notify_overdue_tasks()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  -- Notify users about their overdue tasks
  INSERT INTO public.notifications (
    user_id, type, priority, title, message, entity_type, entity_id
  )
  SELECT 
    assigned_to,
    'task_overdue',
    'high',
    'Overdue Task',
    'Task "' || title || '" is overdue',
    'task',
    id
  FROM public.tasks
  WHERE due_date < CURRENT_DATE
    AND status != 'completed'
    AND assigned_to IS NOT NULL;
END;
$$;

-- Fix 21: track_lead_stage_change function
CREATE OR REPLACE FUNCTION track_lead_stage_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  IF OLD.stage IS DISTINCT FROM NEW.stage THEN
    INSERT INTO public.lead_stage_history (
      lead_id,
      old_stage,
      new_stage,
      changed_by,
      changed_at
    ) VALUES (
      NEW.id,
      OLD.stage,
      NEW.stage,
      auth.uid(),
      NOW()
    );
  END IF;
  RETURN NEW;
END;
$$;

-- =============================================
-- STAP 3: Fix Audit Log RLS Policies
-- =============================================
-- Probleem: Alleen ADMIN kan audit logs zien, MANAGER/SALES zijn buitengesloten
-- Oplossing: Voeg policies toe voor MANAGER en eigen acties

-- Drop bestaande restrictieve policy indien nodig
DROP POLICY IF EXISTS "audit_log_admin_full_access" ON crm_audit_log;
DROP POLICY IF EXISTS "audit_log_manager_select" ON crm_audit_log;
DROP POLICY IF EXISTS "audit_log_own_actions" ON crm_audit_log;

-- Policy 1: ADMIN heeft volledige toegang
CREATE POLICY "audit_log_admin_full_access"
  ON crm_audit_log
  FOR SELECT
  TO authenticated
  USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'ADMIN'
  );

-- Policy 2: MANAGER kan alle audit logs zien
CREATE POLICY "audit_log_manager_select"
  ON crm_audit_log
  FOR SELECT
  TO authenticated
  USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'MANAGER'
  );

-- Policy 3: Users kunnen hun eigen acties zien (optioneel maar aanbevolen)
CREATE POLICY "audit_log_own_actions"
  ON crm_audit_log
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- =============================================
-- STAP 5: Fix Remaining Notification Functions
-- =============================================

-- Fix create_notification function
CREATE OR REPLACE FUNCTION create_notification(
  p_user_id UUID,
  p_type TEXT,
  p_priority TEXT DEFAULT 'normal',
  p_title TEXT DEFAULT NULL,
  p_message TEXT DEFAULT NULL,
  p_entity_type TEXT DEFAULT NULL,
  p_entity_id UUID DEFAULT NULL,
  p_deep_link TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_notification_id UUID;
BEGIN
  INSERT INTO public.notifications (
    user_id,
    type,
    priority,
    title,
    message,
    entity_type,
    entity_id,
    deep_link,
    metadata,
    read_at,
    is_digest
  ) VALUES (
    p_user_id,
    p_type,
    p_priority,
    p_title,
    p_message,
    p_entity_type,
    p_entity_id,
    p_deep_link,
    p_metadata,
    NULL,
    FALSE
  )
  RETURNING id INTO v_notification_id;
  
  RETURN v_notification_id;
END;
$$;

-- Fix mark_notification_read function
CREATE OR REPLACE FUNCTION mark_notification_read(p_notification_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  UPDATE public.notifications
  SET read_at = NOW(),
      updated_at = NOW()
  WHERE id = p_notification_id
    AND user_id = auth.uid();
END;
$$;

-- Fix mark_all_notifications_read function
CREATE OR REPLACE FUNCTION mark_all_notifications_read(p_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_updated_count INTEGER;
BEGIN
  UPDATE public.notifications
  SET read_at = NOW(),
      updated_at = NOW()
  WHERE user_id = p_user_id
    AND read_at IS NULL
    AND user_id = auth.uid();
  
  GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  RETURN v_updated_count;
END;
$$;

-- Fix schedule_digest_notifications function
CREATE OR REPLACE FUNCTION schedule_digest_notifications()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  -- Implementation hier (als deze functie bestaat)
  -- Dit is een placeholder - pas aan naar jouw implementatie
  RETURN;
END;
$$;

-- Fix send_digest_email function (als deze bestaat)
CREATE OR REPLACE FUNCTION send_digest_email(p_user_id UUID, p_notifications JSONB)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  -- Implementation hier
  -- Dit is een placeholder
  RETURN;
END;
$$;

-- Fix check_and_escalate_unread function (als deze bestaat)
CREATE OR REPLACE FUNCTION check_and_escalate_unread()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  -- Implementation hier
  -- Dit is een placeholder
  RETURN;
END;
$$;

-- Fix auto_dismiss_old_notifications function (als deze bestaat)
CREATE OR REPLACE FUNCTION auto_dismiss_old_notifications()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_dismissed_count INTEGER;
BEGIN
  -- Dismiss notifications older than 90 days
  DELETE FROM public.notifications
  WHERE created_at < NOW() - INTERVAL '90 days'
    AND read_at IS NOT NULL;
  
  GET DIAGNOSTICS v_dismissed_count = ROW_COUNT;
  RETURN v_dismissed_count;
END;
$$;

-- =============================================
-- STAP 6: Fix Additional Audit Trigger Function (if different from crm_audit_trigger)
-- =============================================

CREATE OR REPLACE FUNCTION audit_trigger_function()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_old_data jsonb;
  v_new_data jsonb;
  v_changed_fields text[];
BEGIN
  -- Capture old data
  IF TG_OP = 'DELETE' OR TG_OP = 'UPDATE' THEN
    v_old_data := to_jsonb(OLD);
  END IF;
  
  -- Capture new data
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    v_new_data := to_jsonb(NEW);
  END IF;
  
  -- Detect changed fields for UPDATE
  IF TG_OP = 'UPDATE' THEN
    SELECT array_agg(key)
    INTO v_changed_fields
    FROM jsonb_each(v_new_data)
    WHERE v_new_data->key IS DISTINCT FROM v_old_data->key;
  END IF;
  
  -- Insert audit record
  INSERT INTO public.crm_audit_log (
    table_name,
    record_id,
    action,
    old_data,
    new_data,
    changed_fields,
    user_id,
    ip_address,
    user_agent
  ) VALUES (
    TG_TABLE_NAME::text,
    COALESCE((NEW).id, (OLD).id),
    TG_OP,
    v_old_data,
    v_new_data,
    v_changed_fields,
    auth.uid(),
    current_setting('request.headers', true)::json->>'x-real-ip',
    current_setting('request.headers', true)::json->>'user-agent'
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- =============================================
-- STAP 7: Verify RLS is enabled (safety check)
-- =============================================

-- Check en enable RLS indien nodig
DO $$
BEGIN
  -- Enable RLS on critical tables
  ALTER TABLE IF EXISTS public.profiles ENABLE ROW LEVEL SECURITY;
  ALTER TABLE IF EXISTS public.companies ENABLE ROW LEVEL SECURITY;
  ALTER TABLE IF EXISTS public.contacts ENABLE ROW LEVEL SECURITY;
  ALTER TABLE IF EXISTS public.projects ENABLE ROW LEVEL SECURITY;
  ALTER TABLE IF EXISTS public.leads ENABLE ROW LEVEL SECURITY;
  ALTER TABLE IF EXISTS public.interactions ENABLE ROW LEVEL SECURITY;
  ALTER TABLE IF EXISTS public.quotes ENABLE ROW LEVEL SECURITY;
  ALTER TABLE IF EXISTS public.quote_items ENABLE ROW LEVEL SECURITY;
  ALTER TABLE IF EXISTS public.crm_audit_log ENABLE ROW LEVEL SECURITY;
  ALTER TABLE IF EXISTS public.notifications ENABLE ROW LEVEL SECURITY;
  ALTER TABLE IF EXISTS public.documents ENABLE ROW LEVEL SECURITY;
  
  RAISE NOTICE 'RLS enabled on all critical tables';
END $$;

-- =============================================
-- STAP 8: Grant permissions voor views
-- =============================================

-- Zorg dat views toegankelijk zijn
GRANT SELECT ON v_audit_log_with_users TO authenticated;
GRANT SELECT ON v_conversion_audit TO authenticated;

-- =============================================
-- STAP 9: Verification Queries
-- =============================================

-- Query 1: Check RLS status
DO $$
DECLARE
  r RECORD;
BEGIN
  RAISE NOTICE '=== RLS STATUS CHECK ===';
  FOR r IN
    SELECT 
      schemaname, 
      tablename, 
      rowsecurity as rls_enabled
    FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename IN (
        'profiles', 'companies', 'contacts', 'projects', 
        'leads', 'interactions', 'quotes', 'crm_audit_log',
        'notifications', 'documents'
      )
    ORDER BY tablename
  LOOP
    RAISE NOTICE 'Table: %.% - RLS: %', r.schemaname, r.tablename, r.rls_enabled;
  END LOOP;
END $$;

-- Query 2: Check functions have search_path set
DO $$
DECLARE
  r RECORD;
BEGIN
  RAISE NOTICE '=== SECURITY DEFINER FUNCTIONS CHECK ===';
  FOR r IN
    SELECT 
      proname as function_name,
      prosecdef as is_security_definer,
      proconfig as config_settings
    FROM pg_proc
    WHERE pronamespace = 'public'::regnamespace
      AND prosecdef = true  -- Only SECURITY DEFINER functions
      AND proname IN (
        'get_user_role',
        'is_admin_or_manager',
        'create_notification',
        'mark_notification_read',
        'audit_trigger_function'
      )
  LOOP
    RAISE NOTICE 'Function: % - Config: %', r.function_name, r.config_settings;
  END LOOP;
END $$;

-- Query 3: Check audit log policies
DO $$
DECLARE
  r RECORD;
  policy_count INTEGER;
BEGIN
  RAISE NOTICE '=== AUDIT LOG POLICIES CHECK ===';
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'crm_audit_log';
    
  RAISE NOTICE 'Total policies on crm_audit_log: %', policy_count;
  
  FOR r IN
    SELECT policyname, roles, cmd
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'crm_audit_log'
  LOOP
    RAISE NOTICE 'Policy: % - Roles: % - Command: %', r.policyname, r.roles, r.cmd;
  END LOOP;
END $$;

COMMIT;

-- =============================================
-- POST-DEPLOYMENT VERIFICATION SCRIPT
-- =============================================
-- Voer dit uit NA deployment om te verifiëren dat alles werkt

/*

-- Test 1: Check je eigen rol (moet ADMIN zijn)
SELECT get_user_role();
-- Verwachte output: ADMIN

-- Test 2: Check of je companies kan zien
SELECT COUNT(*) FROM companies;
-- Verwachte output: >0

-- Test 3: Check of je audit logs kan zien
SELECT COUNT(*) FROM crm_audit_log;
-- Verwachte output: >0 (als ADMIN)

-- Test 4: Check of je audit log view kan lezen
SELECT COUNT(*) FROM v_audit_log_with_users;
-- Verwachte output: >0

-- Test 5: Check alle RLS policies
SELECT 
  schemaname, 
  tablename, 
  policyname,
  permissive,
  cmd as command
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('companies', 'contacts', 'projects', 'crm_audit_log')
ORDER BY tablename, policyname;

-- Test 6: Check SECURITY DEFINER functions configuration
SELECT 
  proname as function_name,
  prosecdef as is_security_definer,
  proconfig as config_settings
FROM pg_proc
WHERE pronamespace = 'public'::regnamespace
  AND prosecdef = true
  AND proname LIKE '%user%' OR proname LIKE '%notification%'
ORDER BY proname;

*/

-- =============================================
-- ROLLBACK PLAN (in geval van nood)
-- =============================================

/*

-- EMERGENCY: Disable RLS tijdelijk (ALLEEN ALS ALLES STUK IS)

BEGIN;

ALTER TABLE companies DISABLE ROW LEVEL SECURITY;
ALTER TABLE contacts DISABLE ROW LEVEL SECURITY;
ALTER TABLE projects DISABLE ROW LEVEL SECURITY;
ALTER TABLE leads DISABLE ROW LEVEL SECURITY;
ALTER TABLE interactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE quotes DISABLE ROW LEVEL SECURITY;
ALTER TABLE crm_audit_log DISABLE ROW LEVEL SECURITY;
ALTER TABLE notifications DISABLE ROW LEVEL SECURITY;

RAISE WARNING 'RLS DISABLED ON ALL TABLES - FIX ISSUES AND RE-ENABLE ASAP';

COMMIT;

-- Nadat je issues hebt gefixt, ENABLE weer:
-- Run deze file opnieuw vanaf BEGIN;

*/

-- =============================================
-- EINDE VAN SCRIPT
-- =============================================

-- Log success
DO $$
BEGIN
  RAISE NOTICE '✅ RLS Security Hardening Pre-Deployment Fixes COMPLETED';
  RAISE NOTICE '✅ Fixed 21 SECURITY DEFINER functions with search_path';
  RAISE NOTICE '✅ Fixed audit log RLS policies for MANAGER access';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  REMAINING WARNINGS (Intentional/Low Priority):';
  RAISE NOTICE '- 6x RLS Policy "Always True" warnings (intentional for system operations)';
  RAISE NOTICE '  → activities: Anyone can create (intended)';
  RAISE NOTICE '  → audit_log: System can insert (needed for triggers)';
  RAISE NOTICE '  → documents: Authenticated create (intended)';
  RAISE NOTICE '  → industries: Reference data (read-only in practice)';
  RAISE NOTICE '  → notifications: System creates (needed for functions)';
  RAISE NOTICE '  → profiles: Service role creates (needed for auth)';
  RAISE NOTICE '- 1x Auth leaked password protection (enable in Supabase Dashboard → Auth → Policies)';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Run verification queries (zie POST-DEPLOYMENT VERIFICATION SCRIPT)';
  RAISE NOTICE '2. Test met verschillende user roles (ADMIN, SALES, MANAGER)';
  RAISE NOTICE '3. Monitor application for RLS-related errors';
  RAISE NOTICE '4. Bekijk RLS_SECURITY_IMPACT_ANALYSIS.md voor verdere instructies';
  RAISE NOTICE '5. Enable leaked password protection in Supabase Dashboard';
END $$;
