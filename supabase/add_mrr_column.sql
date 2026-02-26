-- ============================================================
-- MRR (Monthly Recurring Revenue) toevoegen aan projects
-- ============================================================

-- Voeg MRR kolom toe
ALTER TABLE projects ADD COLUMN IF NOT EXISTS mrr NUMERIC DEFAULT 0;

-- Voeg ARR (Annual Recurring Revenue) toe als die nog niet bestaat
ALTER TABLE projects ADD COLUMN IF NOT EXISTS arr NUMERIC DEFAULT 0;

-- Optioneel: Bereken MRR automatisch uit ARR
COMMENT ON COLUMN projects.mrr IS 'Monthly Recurring Revenue (bijv. maintenance contract)';
COMMENT ON COLUMN projects.arr IS 'Annual Recurring Revenue (jaarlijkse waarde)';

-- Update trigger om MRR mee te sturen
CREATE OR REPLACE FUNCTION trigger_atc_project_stage_change()
RETURNS TRIGGER AS $$
DECLARE
  company_name TEXT;
  owner_email TEXT;
BEGIN
  IF OLD.stage IS NOT DISTINCT FROM NEW.stage THEN
    RETURN NEW;
  END IF;

  SELECT name INTO company_name FROM companies WHERE id = NEW.company_id;
  SELECT email INTO owner_email FROM profiles WHERE id = NEW.owner_id;

  PERFORM call_atc_webhook(jsonb_build_object(
    'event_type', 'stage_change',
    'entity_type', 'project',
    'project_id', NEW.id,
    'old_stage', OLD.stage,
    'new_stage', NEW.stage,
    'owner_id', NEW.owner_id,
    'project', jsonb_build_object(
      'id', NEW.id,
      'title', NEW.title,
      'value', COALESCE(NEW.value, 0),
      'mrr', COALESCE(NEW.mrr, 0),
      'arr', COALESCE(NEW.arr, 0),
      'owner_id', NEW.owner_id
    ),
    'company', jsonb_build_object(
      'id', NEW.company_id,
      'name', company_name
    ),
    'owner_email', owner_email,
    'timestamp', NOW()
  ));

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
