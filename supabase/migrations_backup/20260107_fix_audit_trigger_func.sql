-- =============================================
-- FIX audit_trigger_func FOR audit_log TABLE
-- =============================================
-- Datum: 7 januari 2026
-- Probleem: audit_trigger_func gebruikt verkeerde kolomnamen
-- Oorzaak: Function probeert table_name in te voegen, maar audit_log heeft subject_type
-- Oplossing: Pas function aan voor correcte audit_log schema
-- =============================================

BEGIN;

-- Drop en hermaak de functie met correcte kolomnamen
CREATE OR REPLACE FUNCTION audit_trigger_func()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  audit_action_value audit_action;
BEGIN
  -- Map TG_OP to audit_action enum
  audit_action_value := CASE TG_OP
    WHEN 'INSERT' THEN 'CREATE'::audit_action
    WHEN 'UPDATE' THEN 'UPDATE'::audit_action
    WHEN 'DELETE' THEN 'DELETE'::audit_action
    ELSE 'UPDATE'::audit_action
  END;

  INSERT INTO public.audit_log (
    id,
    user_id,
    action,
    subject_type,
    subject_id,
    route,
    ip,
    user_agent,
    payload_hash,
    timestamp
  ) VALUES (
    gen_random_uuid()::text,
    auth.uid()::text,
    audit_action_value,
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id)::text,
    '/' || TG_TABLE_NAME,
    NULL,  -- IP wordt niet getrackt in triggers
    NULL,  -- User agent wordt niet getrackt in triggers
    NULL,  -- Payload hash wordt niet gebruikt
    NOW()
  );
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Verificatie
DO $$
BEGIN
  RAISE NOTICE '✅ audit_trigger_func() updated to use correct audit_log columns';
  RAISE NOTICE 'Mapped: table_name → subject_type';
  RAISE NOTICE 'Mapped: record_id → subject_id';
END $$;

COMMIT;
