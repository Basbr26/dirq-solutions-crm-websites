-- ============================================================
-- DEBUG: Check MRR values
-- ============================================================

-- 1. Bekijk alle projects met hun waarden
SELECT
  id,
  title,
  stage,
  value as jaarlijks_value,
  mrr,
  arr,
  company_id
FROM projects
ORDER BY value DESC;

-- 2. Bekijk companies met MRR
SELECT
  id,
  name,
  status,
  total_mrr
FROM companies
WHERE total_mrr > 0 OR total_mrr IS NOT NULL
ORDER BY total_mrr DESC;

-- 3. Check of value correct is omgezet naar MRR
SELECT
  title,
  value,
  value / 12 as berekende_mrr,
  mrr as huidige_mrr,
  CASE WHEN mrr = value / 12 THEN 'OK' ELSE 'FOUT' END as status
FROM projects
WHERE value > 0;
