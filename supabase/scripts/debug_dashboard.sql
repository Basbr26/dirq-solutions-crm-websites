-- ============================================================
-- DEBUG: Dashboard waarden
-- ============================================================

-- Alle projects met relevante velden
SELECT
  title,
  stage,
  value,
  probability,
  mrr,
  CASE
    WHEN stage = 'live' THEN 'Telt voor: Total Revenue'
    WHEN stage IN ('lost', 'maintenance') THEN 'Telt NIET mee'
    ELSE 'Telt voor: Pipeline + Active Deals'
  END as dashboard_categorie
FROM projects;

-- Berekeningen zoals dashboard ze doet:

-- 1. Total Revenue (stage = live)
SELECT 'Total Revenue' as metric, COALESCE(SUM(value), 0) as waarde
FROM projects WHERE stage = 'live';

-- 2. Pipeline Value (gewogen, excl live/lost/maintenance)
SELECT 'Pipeline Value (weighted)' as metric,
  COALESCE(SUM(value * COALESCE(probability, 0) / 100), 0) as waarde
FROM projects WHERE stage NOT IN ('live', 'lost', 'maintenance');

-- 3. Active Deals count
SELECT 'Active Deals' as metric, COUNT(*) as waarde
FROM projects WHERE stage NOT IN ('live', 'lost', 'maintenance');

-- 4. MRR (van companies)
SELECT 'Total MRR' as metric, COALESCE(SUM(total_mrr), 0) as waarde
FROM companies WHERE status = 'active';
