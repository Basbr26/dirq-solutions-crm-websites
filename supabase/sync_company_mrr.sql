-- ============================================================
-- SYNC: Aggregate MRR van projects naar companies
-- ============================================================

-- Voeg total_mrr toe aan companies (als die nog niet bestaat)
ALTER TABLE companies ADD COLUMN IF NOT EXISTS total_mrr NUMERIC DEFAULT 0;

-- Functie om company MRR te berekenen uit alle gerelateerde projects
CREATE OR REPLACE FUNCTION update_company_mrr()
RETURNS TRIGGER AS $$
BEGIN
  -- Update de company's total_mrr met de som van alle project MRRs
  UPDATE companies
  SET total_mrr = (
    SELECT COALESCE(SUM(mrr), 0)
    FROM projects
    WHERE company_id = COALESCE(NEW.company_id, OLD.company_id)
    AND stage IN ('live', 'maintenance')  -- Alleen actieve projecten
  )
  WHERE id = COALESCE(NEW.company_id, OLD.company_id);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger bij project insert/update/delete
DROP TRIGGER IF EXISTS sync_company_mrr ON projects;
CREATE TRIGGER sync_company_mrr
  AFTER INSERT OR UPDATE OF mrr, stage, company_id OR DELETE ON projects
  FOR EACH ROW
  EXECUTE FUNCTION update_company_mrr();

-- Update alle bestaande companies met hun totale MRR
UPDATE companies c
SET total_mrr = (
  SELECT COALESCE(SUM(p.mrr), 0)
  FROM projects p
  WHERE p.company_id = c.id
  AND p.stage IN ('live', 'maintenance')
);

-- Check resultaat
SELECT
  c.name as company,
  c.total_mrr as company_mrr,
  COUNT(p.id) as projects,
  SUM(p.mrr) as sum_project_mrr
FROM companies c
LEFT JOIN projects p ON p.company_id = c.id AND p.stage IN ('live', 'maintenance')
GROUP BY c.id, c.name, c.total_mrr
HAVING c.total_mrr > 0 OR SUM(p.mrr) > 0
ORDER BY c.total_mrr DESC;
