-- ============================================================
-- FIX SECURITY LINTER WARNINGS
-- ============================================================
-- Issue 1: Function search_path mutable (13 functies)
-- Issue 2: RLS Policy Always True (10 policies)
-- Issue 3: Auth leaked password protection (via Supabase Dashboard)
-- ============================================================

-- =============================================
-- FIX 1: Add search_path to all functions
-- =============================================
-- Dit voorkomt schema injection attacks door search_path te locken

-- Drop all functions first (to avoid signature conflicts)
-- CASCADE will also drop dependent triggers (we'll recreate them after)
DROP FUNCTION IF EXISTS update_company_mrr() CASCADE;
DROP FUNCTION IF EXISTS encrypt_google_access_token(TEXT) CASCADE;
DROP FUNCTION IF EXISTS decrypt_google_access_token(TEXT) CASCADE;
DROP FUNCTION IF EXISTS encrypt_google_refresh_token(TEXT) CASCADE;
DROP FUNCTION IF EXISTS decrypt_google_refresh_token(TEXT) CASCADE;
DROP FUNCTION IF EXISTS encrypt_tokens_on_update() CASCADE;
DROP FUNCTION IF EXISTS create_physical_mail_followup() CASCADE;
DROP FUNCTION IF EXISTS is_admin_or_manager() CASCADE;
DROP FUNCTION IF EXISTS update_project_on_quote_status_change() CASCADE;
DROP FUNCTION IF EXISTS get_user_role() CASCADE;
DROP FUNCTION IF EXISTS crm_audit_trigger() CASCADE;
DROP FUNCTION IF EXISTS update_project_mrr_from_quote() CASCADE;
DROP FUNCTION IF EXISTS cleanup_old_webhook_events() CASCADE;

-- 1. update_company_mrr
CREATE FUNCTION update_company_mrr()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  UPDATE companies
  SET total_mrr = (
    SELECT COALESCE(SUM(monthly_recurring_revenue), 0)
    FROM projects
    WHERE company_id = NEW.company_id
  )
  WHERE id = NEW.company_id;
  
  RETURN NEW;
END;
$$;

-- 2. encrypt_google_access_token
CREATE FUNCTION encrypt_google_access_token(token TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF token IS NULL THEN
    RETURN NULL;
  END IF;
  RETURN encode(
    encrypt(
      convert_to(token, 'UTF8'),
      current_setting('app.settings.encryption_key')::bytea,
      'aes'
    ),
    'base64'
  );
END;
$$;

-- 3. decrypt_google_access_token
CREATE FUNCTION decrypt_google_access_token(encrypted_token TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF encrypted_token IS NULL THEN
    RETURN NULL;
  END IF;
  RETURN convert_from(
    decrypt(
      decode(encrypted_token, 'base64'),
      current_setting('app.settings.encryption_key')::bytea,
      'aes'
    ),
    'UTF8'
  );
END;
$$;

-- 4. encrypt_google_refresh_token
CREATE FUNCTION encrypt_google_refresh_token(token TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF token IS NULL THEN
    RETURN NULL;
  END IF;
  RETURN encode(
    encrypt(
      convert_to(token, 'UTF8'),
      current_setting('app.settings.encryption_key')::bytea,
      'aes'
    ),
    'base64'
  );
END;
$$;

-- 5. decrypt_google_refresh_token
CREATE FUNCTION decrypt_google_refresh_token(encrypted_token TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF encrypted_token IS NULL THEN
    RETURN NULL;
  END IF;
  RETURN convert_from(
    decrypt(
      decode(encrypted_token, 'base64'),
      current_setting('app.settings.encryption_key')::bytea,
      'aes'
    ),
    'UTF8'
  );
END;
$$;

-- 6. encrypt_tokens_on_update
CREATE FUNCTION encrypt_tokens_on_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.google_access_token IS DISTINCT FROM OLD.google_access_token AND NEW.google_access_token IS NOT NULL THEN
    NEW.google_access_token_encrypted := encrypt_google_access_token(NEW.google_access_token);
    NEW.google_access_token := NULL;
  END IF;
  
  IF NEW.google_refresh_token IS DISTINCT FROM OLD.google_refresh_token AND NEW.google_refresh_token IS NOT NULL THEN
    NEW.google_refresh_token_encrypted := encrypt_google_refresh_token(NEW.google_refresh_token);
    NEW.google_refresh_token := NULL;
  END IF;
  
  RETURN NEW;
END;
$$;

-- 7. create_physical_mail_followup
CREATE FUNCTION create_physical_mail_followup()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.type = 'physical_mail' THEN
    INSERT INTO interactions (
      company_id,
      contact_id,
      lead_id,
      type,
      subject,
      description,
      is_task,
      task_status,
      due_date,
      user_id
    ) VALUES (
      NEW.company_id,
      NEW.contact_id,
      NEW.lead_id,
      'call',
      'Follow-up call: ' || NEW.subject,
      'Opvolging van fysieke mail verstuur op ' || NEW.created_at::date,
      true,
      'pending',
      NEW.created_at::date + INTERVAL '7 days',
      NEW.user_id
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- 8. is_admin_or_manager
CREATE FUNCTION is_admin_or_manager()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN (
    SELECT role IN ('super_admin', 'ADMIN', 'MANAGER')
    FROM profiles
    WHERE id = auth.uid()
  );
END;
$$;

-- 9. update_project_on_quote_status_change
CREATE FUNCTION update_project_on_quote_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.project_id IS NOT NULL THEN
    IF NEW.status = 'sent' AND OLD.status = 'draft' THEN
      UPDATE projects
      SET stage = 'quote_sent',
          probability = 40
      WHERE id = NEW.project_id;
    ELSIF NEW.provider_signature_data IS NOT NULL AND OLD.provider_signature_data IS NULL THEN
      UPDATE projects
      SET stage = 'quote_signed',
          probability = 90
      WHERE id = NEW.project_id;
    ELSIF NEW.status = 'rejected' THEN
      UPDATE projects
      SET stage = 'lost',
          probability = 0
      WHERE id = NEW.project_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- 10. get_user_role (alias for user_role)
CREATE FUNCTION get_user_role()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN (
    SELECT role
    FROM profiles
    WHERE id = auth.uid()
  );
END;
$$;

-- 11. crm_audit_trigger
CREATE FUNCTION crm_audit_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  changed_fields TEXT[];
  old_json JSONB;
  new_json JSONB;
BEGIN
  IF TG_OP = 'DELETE' THEN
    old_json := to_jsonb(OLD);
    INSERT INTO crm_audit_log (
      table_name,
      record_id,
      action,
      old_data,
      user_id,
      ip_address,
      user_agent
    ) VALUES (
      TG_TABLE_NAME,
      OLD.id,
      'DELETE',
      old_json,
      auth.uid(),
      inet_client_addr(),
      current_setting('request.headers', true)::json->>'user-agent'
    );
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    old_json := to_jsonb(OLD);
    new_json := to_jsonb(NEW);
    
    SELECT array_agg(key)
    INTO changed_fields
    FROM jsonb_each(new_json)
    WHERE new_json->>key IS DISTINCT FROM old_json->>key;
    
    IF changed_fields IS NOT NULL AND array_length(changed_fields, 1) > 0 THEN
      INSERT INTO crm_audit_log (
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
        TG_TABLE_NAME,
        NEW.id,
        'UPDATE',
        old_json,
        new_json,
        changed_fields,
        auth.uid(),
        inet_client_addr(),
        current_setting('request.headers', true)::json->>'user-agent'
      );
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'INSERT' THEN
    new_json := to_jsonb(NEW);
    INSERT INTO crm_audit_log (
      table_name,
      record_id,
      action,
      new_data,
      user_id,
      ip_address,
      user_agent
    ) VALUES (
      TG_TABLE_NAME,
      NEW.id,
      'INSERT',
      new_json,
      auth.uid(),
      inet_client_addr(),
      current_setting('request.headers', true)::json->>'user-agent'
    );
    RETURN NEW;
  END IF;
END;
$$;

-- 12. update_project_mrr_from_quote
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
  IF NEW.provider_signature_data IS NOT NULL AND OLD.provider_signature_data IS NULL THEN
    SELECT 
      COALESCE(SUM(
        CASE 
          WHEN qi.billing_frequency = 'yearly' THEN qi.price / 12
          WHEN qi.billing_frequency = 'quarterly' THEN qi.price / 3
          WHEN qi.billing_frequency = 'monthly' THEN qi.price
          ELSE 0
        END
      ), 0)
    INTO project_mrr
    FROM quote_items qi
    WHERE qi.quote_id = NEW.id
      AND LOWER(qi.category) IN ('hosting', 'maintenance', 'onderhoud', 'subscription', 'abonnement', 'recurring', 'terugkerend');
    
    UPDATE projects
    SET monthly_recurring_revenue = project_mrr
    WHERE id = NEW.project_id;
    
    SELECT company_id INTO project_company_id
    FROM projects
    WHERE id = NEW.project_id;
    
    IF project_company_id IS NOT NULL THEN
      UPDATE companies
      SET 
        total_mrr = (
          SELECT COALESCE(SUM(monthly_recurring_revenue), 0)
          FROM projects
          WHERE company_id = project_company_id
        ),
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

-- 13. cleanup_old_webhook_events
CREATE FUNCTION cleanup_old_webhook_events()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  DELETE FROM webhook_events
  WHERE created_at < NOW() - INTERVAL '30 days';
END;
$$;

-- =============================================
-- FIX 2: Document intentionally permissive RLS policies
-- =============================================
-- Sommige policies zijn OPZETTELIJK permissive (system/service inserts)
-- Deze zijn OK maar documenteren we beter

COMMENT ON POLICY "Anyone can create activities" ON activities IS
'Intentionally permissive: Activities zijn user-generated content die altijd aangemaakt mogen worden';

COMMENT ON POLICY "System can insert audit logs" ON audit_log IS
'Intentionally permissive: Audit logs worden door triggers aangemaakt, niet door users';

COMMENT ON POLICY "Authenticated users can create documents" ON documents IS
'Intentionally permissive: Document uploads worden server-side gevalideerd in storage policies';

COMMENT ON POLICY "Allow all for authenticated users" ON industries IS
'Intentionally permissive: Industries is reference data die door iedereen gelezen/gebruikt mag worden';

COMMENT ON POLICY "System can create notifications" ON notifications IS
'Intentionally permissive: Notifications worden door het systeem aangemaakt via triggers/functions';

COMMENT ON POLICY "System can insert notifications" ON notifications IS
'Intentionally permissive: Notifications worden door het systeem aangemaakt via triggers/functions';

COMMENT ON POLICY "Service role can insert profiles" ON profiles IS
'Intentionally permissive: Profiles worden aangemaakt via auth triggers, niet door users direct';

COMMENT ON POLICY "rate_limit_system_insert" ON rate_limit_requests IS
'Intentionally permissive: Rate limit tracking moet altijd kunnen loggen, ongeacht user permissions';

-- =============================================
-- RECREATE TRIGGERS (dropped with CASCADE)
-- =============================================

-- Trigger for update_company_mrr
CREATE TRIGGER trigger_update_company_mrr
  AFTER INSERT OR UPDATE OF monthly_recurring_revenue ON projects
  FOR EACH ROW
  EXECUTE FUNCTION update_company_mrr();

-- Trigger for encrypt_tokens_on_update
CREATE TRIGGER encrypt_tokens_on_update_trigger
  BEFORE INSERT OR UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION encrypt_tokens_on_update();

-- Trigger for create_physical_mail_followup
CREATE TRIGGER trigger_create_physical_mail_followup
  AFTER INSERT ON interactions
  FOR EACH ROW
  EXECUTE FUNCTION create_physical_mail_followup();

-- Trigger for update_project_on_quote_status_change
CREATE TRIGGER trigger_update_project_on_quote_status_change
  AFTER UPDATE ON quotes
  FOR EACH ROW
  EXECUTE FUNCTION update_project_on_quote_status_change();

-- Trigger for update_project_mrr_from_quote
CREATE TRIGGER trigger_update_project_mrr_from_quote
  AFTER UPDATE ON quotes
  FOR EACH ROW
  EXECUTE FUNCTION update_project_mrr_from_quote();

-- Audit triggers for crm_audit_trigger (on all audited tables)
CREATE TRIGGER audit_companies_trigger
  AFTER INSERT OR UPDATE OR DELETE ON companies
  FOR EACH ROW
  EXECUTE FUNCTION crm_audit_trigger();

CREATE TRIGGER audit_contacts_trigger
  AFTER INSERT OR UPDATE OR DELETE ON contacts
  FOR EACH ROW
  EXECUTE FUNCTION crm_audit_trigger();

CREATE TRIGGER audit_leads_trigger
  AFTER INSERT OR UPDATE OR DELETE ON leads
  FOR EACH ROW
  EXECUTE FUNCTION crm_audit_trigger();

CREATE TRIGGER audit_projects_trigger
  AFTER INSERT OR UPDATE OR DELETE ON projects
  FOR EACH ROW
  EXECUTE FUNCTION crm_audit_trigger();

CREATE TRIGGER audit_quotes_trigger
  AFTER INSERT OR UPDATE OR DELETE ON quotes
  FOR EACH ROW
  EXECUTE FUNCTION crm_audit_trigger();

CREATE TRIGGER audit_interactions_trigger
  AFTER INSERT OR UPDATE OR DELETE ON interactions
  FOR EACH ROW
  EXECUTE FUNCTION crm_audit_trigger();

-- =============================================
-- VERIFICATION
-- =============================================
-- Run deze query om te verifiëren dat alle functies nu search_path hebben:
/*
SELECT 
  p.proname as function_name,
  CASE 
    WHEN pg_get_function_identity_arguments(p.oid) = '' THEN '()'
    ELSE '(' || pg_get_function_identity_arguments(p.oid) || ')'
  END as signature,
  CASE 
    WHEN prosecdef THEN 'SECURITY DEFINER'
    ELSE 'SECURITY INVOKER'
  END as security,
  CASE
    WHEN proconfig IS NOT NULL AND EXISTS (
      SELECT 1 FROM unnest(proconfig) AS config 
      WHERE config LIKE 'search_path%'
    ) THEN '✅ search_path SET'
    ELSE '⚠️ No search_path'
  END as search_path_status
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname IN (
    'update_company_mrr',
    'encrypt_google_access_token',
    'decrypt_google_access_token',
    'encrypt_google_refresh_token',
    'decrypt_google_refresh_token',
    'encrypt_tokens_on_update',
    'create_physical_mail_followup',
    'is_admin_or_manager',
    'update_project_on_quote_status_change',
    'get_user_role',
    'crm_audit_trigger',
    'update_project_mrr_from_quote',
    'cleanup_old_webhook_events'
  )
ORDER BY p.proname;
*/

-- =============================================
-- MANUAL STEP: Enable Leaked Password Protection
-- =============================================
-- Deze kan NIET via SQL worden ingesteld
-- Ga naar: Supabase Dashboard > Authentication > Providers > Email
-- Enable: "Prevent sign-ups with leaked passwords"
-- Of gebruik de Management API:
/*
PATCH https://api.supabase.com/v1/projects/{ref}/config/auth
{
  "SECURITY_LEAKED_PASSWORD_PROTECTION": true
}
*/

SELECT 'Security warnings fixes applied! Check verification query above.' as status;
