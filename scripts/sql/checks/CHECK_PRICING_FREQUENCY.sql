-- ============================================================
-- CHECK QUOTE ITEM PRIJZEN
-- ============================================================
-- Zijn de prijzen maandelijks of jaarlijks?
-- ============================================================

-- Toon alle quote items met hun prijzen
SELECT 
  q.quote_number,
  qi.title,
  qi.category,
  qi.quantity,
  qi.unit_price as prijs_in_database,
  (qi.quantity * qi.unit_price) as totaal_bedrag,
  CASE 
    WHEN LOWER(qi.category) IN ('hosting', 'maintenance', 'onderhoud', 'subscription', 'abonnement', 'recurring', 'terugkerend')
    THEN '✓ Telt mee voor MRR'
    ELSE '✗ Telt NIET mee'
  END as mrr_status,
  CASE
    WHEN qi.unit_price > 1000 THEN '⚠️ WAARSCHUWING: Prijs lijkt jaarlijks te zijn!'
    WHEN qi.unit_price > 100 THEN 'ℹ️ Check: Is dit maandelijks of jaarlijks?'
    ELSE '✓ Lijkt maandelijks bedrag'
  END as prijs_check
FROM quotes q
JOIN quote_items qi ON qi.quote_id = q.id
WHERE q.provider_signature_data IS NOT NULL
ORDER BY q.quote_number, qi.item_order;

-- Bereken MRR (maandelijks) voor getekende quotes
SELECT 
  q.quote_number,
  p.title as project,
  SUM(qi.quantity * qi.unit_price) as huidige_mrr_berekening,
  '↓ Als prijzen JAARLIJKS zijn, deel dan door 12:' as opmerking,
  ROUND(SUM(qi.quantity * qi.unit_price) / 12, 2) as mrr_als_prijzen_jaarlijks_zijn
FROM quotes q
JOIN projects p ON p.id = q.project_id
JOIN quote_items qi ON qi.quote_id = q.id
WHERE q.provider_signature_data IS NOT NULL
  AND LOWER(qi.category) IN ('hosting', 'maintenance', 'onderhoud', 'subscription', 'abonnement', 'recurring', 'terugkerend')
GROUP BY q.quote_number, p.title;
