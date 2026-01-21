-- ============================================================
-- FIX: MRR TRIGGER - Handle company_id changes correctly
-- ============================================================
-- Problem: When a project's company_id changes (reassignment), 
-- the old company's total_mrr is not recalculated.
-- Solution: Update BOTH old and new companies on UPDATE.
-- ============================================================

-- Drop old trigger and function
DROP TRIGGER IF EXISTS trigger_update_company_mrr ON projects;
DROP FUNCTION IF EXISTS update_company_mrr();

-- Create improved MRR aggregation function
CREATE OR REPLACE FUNCTION update_company_mrr()
RETURNS TRIGGER AS $$
DECLARE
  old_company_id UUID;
  new_company_id UUID;
BEGIN
  -- Determine which companies need updating
  IF TG_OP = 'DELETE' THEN
    old_company_id := OLD.company_id;
  ELSIF TG_OP = 'INSERT' THEN
    new_company_id := NEW.company_id;
  ELSIF TG_OP = 'UPDATE' THEN
    old_company_id := OLD.company_id;
    new_company_id := NEW.company_id;
    
    -- If company_id changed, update BOTH companies
    IF old_company_id IS DISTINCT FROM new_company_id THEN
      -- Update old company (if exists)
      IF old_company_id IS NOT NULL THEN
        UPDATE companies
        SET total_mrr = (
          SELECT COALESCE(SUM(monthly_recurring_revenue), 0)
          FROM projects
          WHERE company_id = old_company_id
        )
        WHERE id = old_company_id;
      END IF;
      
      -- Update new company (if exists)
      IF new_company_id IS NOT NULL THEN
        UPDATE companies
        SET total_mrr = (
          SELECT COALESCE(SUM(monthly_recurring_revenue), 0)
          FROM projects
          WHERE company_id = new_company_id
        )
        WHERE id = new_company_id;
      END IF;
      
      RETURN NEW;
    END IF;
  END IF;

  -- Standard case: only one company affected
  IF new_company_id IS NOT NULL THEN
    UPDATE companies
    SET total_mrr = (
      SELECT COALESCE(SUM(monthly_recurring_revenue), 0)
      FROM projects
      WHERE company_id = new_company_id
    )
    WHERE id = new_company_id;
  ELSIF old_company_id IS NOT NULL THEN
    UPDATE companies
    SET total_mrr = (
      SELECT COALESCE(SUM(monthly_recurring_revenue), 0)
      FROM projects
      WHERE company_id = old_company_id
    )
    WHERE id = old_company_id;
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Create trigger with better conditions
CREATE TRIGGER trigger_update_company_mrr
  AFTER INSERT OR UPDATE OF monthly_recurring_revenue, company_id OR DELETE ON projects
  FOR EACH ROW
  EXECUTE FUNCTION update_company_mrr();

-- Add comment
COMMENT ON TRIGGER trigger_update_company_mrr ON projects IS 
'Automatically recalculates company.total_mrr when project MRR changes or company reassignment occurs';

COMMENT ON FUNCTION update_company_mrr() IS
'Handles MRR aggregation for both old and new companies when project is reassigned';

-- ============================================================
-- VERIFICATION: Check if all companies have correct total_mrr
-- ============================================================
-- Run this query to verify MRR calculations:
/*
SELECT 
  c.name,
  c.total_mrr AS current_total_mrr,
  COALESCE(SUM(p.monthly_recurring_revenue), 0) AS calculated_mrr,
  c.total_mrr - COALESCE(SUM(p.monthly_recurring_revenue), 0) AS difference
FROM companies c
LEFT JOIN projects p ON p.company_id = c.id
GROUP BY c.id, c.name, c.total_mrr
HAVING c.total_mrr != COALESCE(SUM(p.monthly_recurring_revenue), 0)
ORDER BY ABS(c.total_mrr - COALESCE(SUM(p.monthly_recurring_revenue), 0)) DESC;
*/

-- ============================================================
-- FIX EXISTING DATA: Recalculate all company total_mrr values
-- ============================================================
UPDATE companies
SET total_mrr = (
  SELECT COALESCE(SUM(monthly_recurring_revenue), 0)
  FROM projects
  WHERE company_id = companies.id
);

-- Verify the fix worked
SELECT 
  COUNT(*) AS companies_with_discrepancies
FROM companies c
LEFT JOIN (
  SELECT company_id, SUM(monthly_recurring_revenue) AS project_sum
  FROM projects
  GROUP BY company_id
) p ON p.company_id = c.id
WHERE c.total_mrr != COALESCE(p.project_sum, 0);

-- Should return 0 if all fixed correctly
