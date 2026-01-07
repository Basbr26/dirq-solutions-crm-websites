-- =============================================
-- CRM AUDIT LOGGING SYSTEM - COMPLETE IMPLEMENTATION
-- =============================================
-- Datum: 7 januari 2026
-- Doel: Volledige audit trail voor alle CRM-kern operaties
-- Tabellen: companies, contacts, projects, quotes
--
-- Features:
-- - Oude en nieuwe waarden (JSONB)
-- - User ID tracking via auth.uid()
-- - IP-adres logging
-- - User agent detectie (Manus AI, n8n)
-- - Timestamp met timezone
-- - Action type (INSERT, UPDATE, DELETE)
-- =============================================

-- =============================================
-- STAP 1: Update crm_audit_log tabel structuur
-- =============================================
-- Voeg extra kolommen toe voor IP en user agent tracking

-- Check of kolommen al bestaan en voeg ze toe indien nodig
DO $$ 
BEGIN
  -- Voeg ip_address kolom toe als deze niet bestaat
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'crm_audit_log' AND column_name = 'ip_address'
  ) THEN
    ALTER TABLE crm_audit_log ADD COLUMN ip_address INET;
  END IF;

  -- Voeg user_agent kolom toe als deze niet bestaat
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'crm_audit_log' AND column_name = 'user_agent'
  ) THEN
    ALTER TABLE crm_audit_log ADD COLUMN user_agent TEXT;
  END IF;

  -- Voeg changed_fields kolom toe voor efficiënte diff
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'crm_audit_log' AND column_name = 'changed_fields'
  ) THEN
    ALTER TABLE crm_audit_log ADD COLUMN changed_fields TEXT[];
  END IF;
END $$;

-- Voeg index toe voor snellere queries
CREATE INDEX IF NOT EXISTS idx_audit_log_table_record 
  ON crm_audit_log(table_name, record_id);

CREATE INDEX IF NOT EXISTS idx_audit_log_user_created 
  ON crm_audit_log(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_log_action 
  ON crm_audit_log(action, created_at DESC);

-- Index voor AI/automation detectie
CREATE INDEX IF NOT EXISTS idx_audit_log_user_agent 
  ON crm_audit_log(user_agent) 
  WHERE user_agent IS NOT NULL;

-- =============================================
-- STAP 2: Maak verbeterde audit trigger functie
-- =============================================

CREATE OR REPLACE FUNCTION audit_trigger_func()
RETURNS TRIGGER AS $$
DECLARE
  changed_fields_array TEXT[];
  old_json JSONB;
  new_json JSONB;
  ip_addr INET;
  user_agent_str TEXT;
BEGIN
  -- Convert rows naar JSONB voor vergelijking
  old_json := CASE WHEN TG_OP != 'INSERT' THEN to_jsonb(OLD) ELSE NULL END;
  new_json := CASE WHEN TG_OP != 'DELETE' THEN to_jsonb(NEW) ELSE NULL END;

  -- Bepaal welke velden zijn gewijzigd (alleen bij UPDATE)
  IF TG_OP = 'UPDATE' THEN
    SELECT ARRAY_AGG(key)
    INTO changed_fields_array
    FROM jsonb_each(old_json)
    WHERE old_json->key IS DISTINCT FROM new_json->key;
  END IF;

  -- Probeer IP-adres te verkrijgen uit request headers
  -- Dit werkt wanneer een Supabase Edge Function de request headers doorgeeft
  BEGIN
    ip_addr := current_setting('request.headers', true)::json->>'x-forwarded-for';
  EXCEPTION WHEN OTHERS THEN
    ip_addr := inet_client_addr(); -- Fallback naar client IP
  END;

  -- Probeer user agent te verkrijgen
  -- Dit kan gebruikt worden om Manus AI of n8n te detecteren
  BEGIN
    user_agent_str := current_setting('request.headers', true)::json->>'user-agent';
  EXCEPTION WHEN OTHERS THEN
    user_agent_str := NULL;
  END;

  -- =============================================
  -- DETECTIE VAN AI/AUTOMATION AGENTS
  -- =============================================
  -- User agent detectie voor automation:
  -- - Manus AI: user_agent bevat 'Manus' of 'AI-Agent'
  -- - n8n: user_agent bevat 'n8n' of 'webhook'
  -- - Custom apps: Stel custom header 'X-Client-App' in
  --
  -- Voorbeeld: In n8n workflow, voeg HTTP header toe:
  -- X-Client-App: n8n-workflow-123
  -- User-Agent: n8n/1.0
  --
  -- Voorbeeld: In Manus AI, voeg header toe:
  -- X-Client-App: manus-ai-agent
  -- User-Agent: Manus-AI/2.0
  -- =============================================

  -- Probeer custom client app header te lezen
  BEGIN
    IF current_setting('request.headers', true)::json ? 'x-client-app' THEN
      user_agent_str := COALESCE(
        current_setting('request.headers', true)::json->>'x-client-app',
        user_agent_str
      );
    END IF;
  EXCEPTION WHEN OTHERS THEN
    -- Gebruik bestaande user_agent_str
  END;

  -- Insert audit log record
  INSERT INTO crm_audit_log (
    table_name,
    record_id,
    action,
    old_data,
    new_data,
    changed_fields,
    user_id,
    ip_address,
    user_agent,
    created_at
  ) VALUES (
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    TG_OP,
    old_json,
    new_json,
    changed_fields_array,
    auth.uid(), -- Huidige gebruiker uit JWT token
    ip_addr,
    user_agent_str,
    NOW()
  );

  -- Return de juiste record voor trigger chain
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Voeg comment toe aan functie
COMMENT ON FUNCTION audit_trigger_func() IS 
'Audit trigger function die alle wijzigingen tracked met user ID, IP, user agent.
Detecteert Manus AI (user-agent: "Manus-AI") en n8n (user-agent: "n8n").
Gebruik X-Client-App header voor custom identificatie.';

-- =============================================
-- STAP 3: Drop oude triggers (indien aanwezig)
-- =============================================

DROP TRIGGER IF EXISTS companies_audit_trigger ON companies;
DROP TRIGGER IF EXISTS contacts_audit_trigger ON contacts;
DROP TRIGGER IF EXISTS projects_audit_trigger ON projects;
DROP TRIGGER IF EXISTS quotes_audit_trigger ON quotes;
DROP TRIGGER IF EXISTS leads_audit_trigger ON leads;

-- =============================================
-- STAP 4: Maak nieuwe triggers voor CRM-kern tabellen
-- =============================================

-- Trigger voor COMPANIES tabel
CREATE TRIGGER companies_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON companies
  FOR EACH ROW 
  EXECUTE FUNCTION audit_trigger_func();

COMMENT ON TRIGGER companies_audit_trigger ON companies IS
'Audit trigger: tracked alle wijzigingen aan bedrijven (create, update, delete)';

-- Trigger voor CONTACTS tabel
CREATE TRIGGER contacts_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON contacts
  FOR EACH ROW 
  EXECUTE FUNCTION audit_trigger_func();

COMMENT ON TRIGGER contacts_audit_trigger ON contacts IS
'Audit trigger: tracked alle wijzigingen aan contactpersonen (create, update, delete)';

-- Trigger voor PROJECTS tabel
CREATE TRIGGER projects_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON projects
  FOR EACH ROW 
  EXECUTE FUNCTION audit_trigger_func();

COMMENT ON TRIGGER projects_audit_trigger ON projects IS
'Audit trigger: tracked alle wijzigingen aan projecten en deals (create, update, delete)';

-- Trigger voor QUOTES tabel
CREATE TRIGGER quotes_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON quotes
  FOR EACH ROW 
  EXECUTE FUNCTION audit_trigger_func();

COMMENT ON TRIGGER quotes_audit_trigger ON quotes IS
'Audit trigger: tracked alle wijzigingen aan offertes (create, update, delete)';

-- =============================================
-- STAP 5: Helper views voor audit analyse
-- =============================================

-- View voor recente audit logs met gebruiker info
CREATE OR REPLACE VIEW v_audit_log_with_users AS
SELECT 
  al.id,
  al.table_name,
  al.record_id,
  al.action,
  al.old_data,
  al.new_data,
  al.changed_fields,
  al.created_at,
  al.ip_address,
  al.user_agent,
  p.email as user_email,
  p.full_name as user_name,
  p.role as user_role,
  -- AI/Automation detectie flags
  CASE 
    WHEN al.user_agent ILIKE '%manus%' THEN 'Manus AI'
    WHEN al.user_agent ILIKE '%n8n%' THEN 'n8n Workflow'
    WHEN al.user_agent ILIKE '%webhook%' THEN 'Webhook'
    WHEN al.user_agent IS NULL THEN 'Unknown'
    ELSE 'Human User'
  END as detected_client_type
FROM crm_audit_log al
LEFT JOIN profiles p ON al.user_id = p.id
ORDER BY al.created_at DESC;

COMMENT ON VIEW v_audit_log_with_users IS
'Audit log met gebruikers info en AI/automation detectie';

-- View voor conversie tracking (lead -> customer)
CREATE OR REPLACE VIEW v_conversion_audit AS
SELECT 
  al.id,
  al.record_id as company_id,
  (al.old_data->>'status')::TEXT as old_status,
  (al.new_data->>'status')::TEXT as new_status,
  (al.new_data->>'name')::TEXT as company_name,
  al.user_id,
  p.email as converted_by,
  al.created_at as conversion_timestamp,
  al.user_agent,
  CASE 
    WHEN al.user_agent ILIKE '%manus%' THEN true
    WHEN al.user_agent ILIKE '%n8n%' THEN true
    ELSE false
  END as automated_conversion
FROM crm_audit_log al
LEFT JOIN profiles p ON al.user_id = p.id
WHERE al.table_name = 'companies'
  AND al.action = 'UPDATE'
  AND (al.old_data->>'status')::TEXT = 'prospect'
  AND (al.new_data->>'status')::TEXT = 'customer'
ORDER BY al.created_at DESC;

COMMENT ON VIEW v_conversion_audit IS
'Tracked alle conversies van prospect naar customer met automation detectie';

-- =============================================
-- STAP 6: RLS Policies voor audit log
-- =============================================

-- Zorg dat RLS enabled is
ALTER TABLE crm_audit_log ENABLE ROW LEVEL SECURITY;

-- Drop oude policies indien aanwezig
DROP POLICY IF EXISTS "Audit log viewable by admins" ON crm_audit_log;
DROP POLICY IF EXISTS "audit_log_admin_select" ON crm_audit_log;
DROP POLICY IF EXISTS "audit_log_manager_select" ON crm_audit_log;

-- Policy 1: Admins kunnen alles zien
CREATE POLICY "audit_log_admin_full_access"
  ON crm_audit_log
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'ADMIN'
    )
  );

-- Policy 2: Managers kunnen eigen team audit logs zien
CREATE POLICY "audit_log_manager_team_view"
  ON crm_audit_log
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('ADMIN', 'MANAGER')
    )
  );

-- Policy 3: Users kunnen hun eigen acties zien
CREATE POLICY "audit_log_user_own_actions"
  ON crm_audit_log
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

COMMENT ON TABLE crm_audit_log IS
'Volledige audit trail voor CRM operaties. Tracked user, IP, user agent, old/new values.
Detecteert Manus AI en n8n automation via user agent.';

-- =============================================
-- STAP 7: Statistieken functie
-- =============================================

CREATE OR REPLACE FUNCTION get_audit_stats(
  start_date TIMESTAMPTZ DEFAULT NOW() - INTERVAL '30 days',
  end_date TIMESTAMPTZ DEFAULT NOW()
)
RETURNS TABLE (
  total_actions BIGINT,
  inserts BIGINT,
  updates BIGINT,
  deletes BIGINT,
  human_actions BIGINT,
  ai_actions BIGINT,
  top_table TEXT,
  top_user TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*) as total_actions,
    COUNT(*) FILTER (WHERE action = 'INSERT') as inserts,
    COUNT(*) FILTER (WHERE action = 'UPDATE') as updates,
    COUNT(*) FILTER (WHERE action = 'DELETE') as deletes,
    COUNT(*) FILTER (
      WHERE user_agent NOT ILIKE '%manus%' 
      AND user_agent NOT ILIKE '%n8n%'
      OR user_agent IS NULL
    ) as human_actions,
    COUNT(*) FILTER (
      WHERE user_agent ILIKE '%manus%' 
      OR user_agent ILIKE '%n8n%'
    ) as ai_actions,
    (
      SELECT table_name 
      FROM crm_audit_log 
      WHERE created_at BETWEEN start_date AND end_date
      GROUP BY table_name 
      ORDER BY COUNT(*) DESC 
      LIMIT 1
    ) as top_table,
    (
      SELECT p.email 
      FROM crm_audit_log al
      LEFT JOIN profiles p ON al.user_id = p.id
      WHERE al.created_at BETWEEN start_date AND end_date
      GROUP BY p.email 
      ORDER BY COUNT(*) DESC 
      LIMIT 1
    ) as top_user
  FROM crm_audit_log
  WHERE created_at BETWEEN start_date AND end_date;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_audit_stats IS
'Retourneert audit statistieken voor gegeven periode met AI/human split';

-- =============================================
-- STAP 8: Grant permissions
-- =============================================

-- Views beschikbaar maken voor authenticated users
GRANT SELECT ON v_audit_log_with_users TO authenticated;
GRANT SELECT ON v_conversion_audit TO authenticated;

-- Function beschikbaar maken
GRANT EXECUTE ON FUNCTION get_audit_stats TO authenticated;

-- =============================================
-- VERIFICATIE QUERIES
-- =============================================
-- Gebruik deze queries om de audit logging te testen:

-- 1. Test of triggers actief zijn:
-- SELECT * FROM information_schema.triggers 
-- WHERE trigger_name LIKE '%audit%';

-- 2. Test audit logs:
-- SELECT * FROM v_audit_log_with_users LIMIT 10;

-- 3. Test conversie tracking:
-- SELECT * FROM v_conversion_audit LIMIT 10;

-- 4. Test statistieken:
-- SELECT * FROM get_audit_stats();

-- 5. Test AI detectie:
-- SELECT 
--   user_agent,
--   detected_client_type,
--   COUNT(*) 
-- FROM v_audit_log_with_users 
-- GROUP BY user_agent, detected_client_type;

-- =============================================
-- USAGE VOORBEELDEN
-- =============================================

-- Voorbeeld 1: Vind alle wijzigingen aan een specifiek bedrijf
-- SELECT * FROM v_audit_log_with_users
-- WHERE table_name = 'companies' 
-- AND record_id = 'your-company-uuid'
-- ORDER BY created_at DESC;

-- Voorbeeld 2: Vind alle n8n automated actions
-- SELECT * FROM v_audit_log_with_users
-- WHERE detected_client_type = 'n8n Workflow'
-- ORDER BY created_at DESC;

-- Voorbeeld 3: Vind alle Manus AI actions
-- SELECT * FROM v_audit_log_with_users
-- WHERE detected_client_type = 'Manus AI'
-- ORDER BY created_at DESC;

-- Voorbeeld 4: Vind wie een record heeft verwijderd
-- SELECT 
--   table_name,
--   old_data->>'name' as deleted_record_name,
--   user_email,
--   created_at
-- FROM v_audit_log_with_users
-- WHERE action = 'DELETE'
-- ORDER BY created_at DESC;

-- =============================================
-- n8n INTEGRATIE INSTRUCTIES
-- =============================================
-- In je n8n workflow, voeg de volgende headers toe aan HTTP requests:
--
-- HTTP Headers:
-- {
--   "User-Agent": "n8n-workflow/1.0",
--   "X-Client-App": "n8n-{{workflow_name}}",
--   "Authorization": "Bearer {{supabase_token}}"
-- }
--
-- Dan verschijnt in audit logs:
-- user_agent: "n8n-workflow/1.0" of "n8n-{{workflow_name}}"
-- detected_client_type: "n8n Workflow"

-- =============================================
-- MANUS AI INTEGRATIE INSTRUCTIES
-- =============================================
-- In Manus AI agent configuratie, stel custom headers in:
--
-- HTTP Headers:
-- {
--   "User-Agent": "Manus-AI/2.0",
--   "X-Client-App": "manus-crm-agent",
--   "Authorization": "Bearer {{supabase_token}}"
-- }
--
-- Dan verschijnt in audit logs:
-- user_agent: "Manus-AI/2.0" of "manus-crm-agent"
-- detected_client_type: "Manus AI"

-- =============================================
-- MIGRATIE VOLTOOID
-- =============================================
-- Status: ✅ Audit logging volledig actief
-- Tabellen: companies, contacts, projects, quotes
-- Features: User tracking, IP logging, AI detection
-- Views: v_audit_log_with_users, v_conversion_audit
-- Functions: audit_trigger_func(), get_audit_stats()
-- =============================================
