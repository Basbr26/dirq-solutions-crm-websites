-- ============================================================
-- CHECK TRIGGER STATUS
-- ============================================================
-- Snel checken of de MRR triggers geïnstalleerd zijn
-- ============================================================

-- Check 1: Bestaan de triggers?
SELECT 
  'TRIGGERS' as check_type,
  COUNT(*) as count,
  CASE 
    WHEN COUNT(*) = 2 THEN '✓ Triggers installed'
    ELSE '✗ MISSING - Run FIX_QUOTE_AUTOMATION.sql'
  END as status
FROM information_schema.triggers 
WHERE trigger_name IN ('quote_status_update_project', 'quote_signed_update_mrr');

-- Check 2: Bestaan de functions?
SELECT 
  'FUNCTIONS' as check_type,
  COUNT(*) as count,
  CASE 
    WHEN COUNT(*) = 2 THEN '✓ Functions installed'
    ELSE '✗ MISSING - Run FIX_QUOTE_AUTOMATION.sql'
  END as status
FROM information_schema.routines
WHERE routine_name IN ('update_project_on_quote_status_change', 'update_project_mrr_from_quote')
  AND routine_schema = 'public';

-- Check 3: Zijn er getekende quotes zonder MRR?
SELECT 
  'MISSING MRR' as check_type,
  COUNT(*) as quotes_without_mrr,
  CASE 
    WHEN COUNT(*) > 0 THEN '⚠ Run MANUAL_FIX_MRR.sql to fix existing quotes'
    ELSE '✓ All signed quotes have MRR calculated'
  END as status
FROM quotes q
JOIN projects p ON p.id = q.project_id
WHERE q.provider_signature_data IS NOT NULL
  AND (p.monthly_recurring_revenue IS NULL OR p.monthly_recurring_revenue = 0)
  AND EXISTS (
    SELECT 1 FROM quote_items qi 
    WHERE qi.quote_id = q.id 
    AND LOWER(qi.category) IN ('hosting', 'maintenance', 'onderhoud', 'subscription', 'abonnement', 'recurring', 'terugkerend')
  );
