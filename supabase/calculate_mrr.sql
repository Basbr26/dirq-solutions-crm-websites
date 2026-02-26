-- ============================================================
-- MRR automatisch berekenen uit ARR (jaarlijks bedrag)
-- ============================================================

-- Update alle bestaande projects: MRR = value / 12 (als value het jaarlijkse bedrag is)
UPDATE projects
SET mrr = COALESCE(value, 0) / 12,
    arr = COALESCE(value, 0)
WHERE mrr = 0 OR mrr IS NULL;

-- Maak een trigger die MRR automatisch berekent wanneer value wijzigt
CREATE OR REPLACE FUNCTION calculate_mrr_from_value()
RETURNS TRIGGER AS $$
BEGIN
  -- Als value wijzigt, bereken MRR (value = jaarlijks bedrag)
  IF NEW.value IS NOT NULL AND (OLD.value IS DISTINCT FROM NEW.value) THEN
    NEW.mrr := NEW.value / 12;
    NEW.arr := NEW.value;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS auto_calculate_mrr ON projects;
CREATE TRIGGER auto_calculate_mrr
  BEFORE INSERT OR UPDATE OF value ON projects
  FOR EACH ROW
  EXECUTE FUNCTION calculate_mrr_from_value();

-- Check het resultaat
SELECT title, value as jaarlijks, arr, mrr as maandelijks FROM projects LIMIT 5;
