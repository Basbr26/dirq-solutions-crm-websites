-- ============================================================
-- DIAGNOSE MRR ISSUE
-- ============================================================
-- Run these queries in Supabase SQL Editor to find the problem
-- ============================================================

-- Step 1: Check if triggers exist
SELECT 
  trigger_name, 
  event_manipulation, 
  event_object_table,
  action_statement
FROM information_schema.triggers 
WHERE trigger_name IN ('quote_status_update_project', 'quote_signed_update_mrr')
ORDER BY trigger_name;

-- Step 2: Check if functions exist
SELECT 
  routine_name,
  routine_type
FROM information_schema.routines
WHERE routine_name IN ('update_project_on_quote_status_change', 'update_project_mrr_from_quote')
  AND routine_schema = 'public';

-- Step 3: Check your signed quotes
SELECT 
  q.id,
  q.quote_number,
  q.project_id,
  q.status,
  q.sign_status,
  CASE 
    WHEN q.signature_data IS NOT NULL THEN 'Customer signed ✓'
    ELSE 'Customer NOT signed ✗'
  END as customer_signature,
  CASE 
    WHEN q.provider_signature_data IS NOT NULL THEN 'Provider signed ✓'
    ELSE 'Provider NOT signed ✗'
  END as provider_signature
FROM quotes q
ORDER BY q.created_at DESC
LIMIT 5;

-- Step 4: Check quote items and their categories
SELECT 
  q.quote_number,
  qi.title,
  qi.category,
  qi.quantity,
  qi.unit_price,
  (qi.quantity * qi.unit_price) as total,
  CASE 
    WHEN LOWER(qi.category) IN ('hosting', 'maintenance', 'onderhoud', 'subscription', 'abonnement', 'recurring', 'terugkerend') 
    THEN '✓ COUNTS for MRR'
    ELSE '✗ NOT counted for MRR'
  END as mrr_status
FROM quotes q
JOIN quote_items qi ON qi.quote_id = q.id
WHERE q.provider_signature_data IS NOT NULL
ORDER BY q.quote_number, qi.item_order;

-- Step 5: Check calculated MRR per quote
SELECT 
  q.quote_number,
  q.project_id,
  p.title as project_title,
  p.monthly_recurring_revenue as current_mrr,
  COALESCE(SUM(
    CASE 
      WHEN LOWER(qi.category) IN ('hosting', 'maintenance', 'onderhoud', 'subscription', 'abonnement', 'recurring', 'terugkerend')
      THEN qi.quantity * qi.unit_price
      ELSE 0
    END
  ), 0) as calculated_mrr,
  COUNT(*) as total_items,
  COUNT(CASE WHEN LOWER(qi.category) IN ('hosting', 'maintenance', 'onderhoud', 'subscription', 'abonnement', 'recurring', 'terugkerend') THEN 1 END) as recurring_items
FROM quotes q
LEFT JOIN projects p ON p.id = q.project_id
LEFT JOIN quote_items qi ON qi.quote_id = q.id
WHERE q.provider_signature_data IS NOT NULL
GROUP BY q.quote_number, q.project_id, p.title, p.monthly_recurring_revenue
ORDER BY q.quote_number;

-- Step 6: Check if category column exists
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'quote_items'
  AND column_name = 'category';

-- Step 7: Show all categories in use
SELECT 
  COALESCE(category, 'NULL') as category,
  COUNT(*) as item_count
FROM quote_items
GROUP BY category
ORDER BY item_count DESC;

-- ============================================================
-- RESULTS INTERPRETATION:
-- ============================================================
-- Step 1: Should show 2 triggers (quote_status_update_project, quote_signed_update_mrr)
--         → If empty: Run FIX_QUOTE_AUTOMATION.sql
--
-- Step 2: Should show 2 functions
--         → If empty: Run FIX_QUOTE_AUTOMATION.sql
--
-- Step 3: Check if provider_signature = 'Provider signed ✓'
--         → If NOT: You need to sign the quote as provider first
--
-- Step 4: Check if items have MRR category (✓ COUNTS for MRR)
--         → Dutch: Abonnement, Onderhoud, Terugkerend, Hosting
--         → English: subscription, maintenance, recurring, hosting
--         → If NOT: Edit quote and add categories to items
--
-- Step 5: Compare current_mrr vs calculated_mrr
--         → If different: Trigger not working or not fired yet
--
-- Step 6: Should show 'category' column
--         → If empty: Run migration to add category column
--
-- Step 7: Shows what categories are being used
--         → Should see: Abonnement, Setup, Hosting, Onderhoud, etc.
-- ============================================================
