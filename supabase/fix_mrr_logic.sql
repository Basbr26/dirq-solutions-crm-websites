-- ============================================================
-- FIX: MRR is apart veld, niet berekend uit value
-- ============================================================

-- Verwijder de oude trigger die MRR berekende uit value
DROP TRIGGER IF EXISTS auto_calculate_mrr ON projects;
DROP FUNCTION IF EXISTS calculate_mrr_from_value();

-- MRR wordt handmatig ingevoerd, ARR wordt berekend uit MRR
CREATE OR REPLACE FUNCTION calculate_arr_from_mrr()
RETURNS TRIGGER AS $$
BEGIN
  -- ARR = MRR × 12
  IF NEW.mrr IS NOT NULL AND (OLD.mrr IS DISTINCT FROM NEW.mrr) THEN
    NEW.arr := NEW.mrr * 12;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER auto_calculate_arr
  BEFORE INSERT OR UPDATE OF mrr ON projects
  FOR EACH ROW
  EXECUTE FUNCTION calculate_arr_from_mrr();

-- Fix het Finance project: mrr = 99, value blijft 799.99
UPDATE projects
SET mrr = 99, arr = 1188
WHERE title = 'Finance Starter Website';

-- Sync naar company
UPDATE companies c
SET total_mrr = (
  SELECT COALESCE(SUM(p.mrr), 0)
  FROM projects p
  WHERE p.company_id = c.id
  AND p.stage IN ('live', 'maintenance', 'quote_signed')
);

-- Check resultaat
SELECT
  title,
  value as eenmalig,
  mrr as maandelijks,
  arr as jaarlijks
FROM projects
WHERE mrr > 0;
