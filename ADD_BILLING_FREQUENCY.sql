-- ============================================================
-- ADD BILLING FREQUENCY TO QUOTE ITEMS
-- ============================================================
-- Adds billing_frequency field to track if prices are monthly/yearly
-- ============================================================

BEGIN;

-- Add billing_frequency column to quote_items
ALTER TABLE quote_items 
ADD COLUMN IF NOT EXISTS billing_frequency TEXT DEFAULT 'monthly'
CHECK (billing_frequency IN ('monthly', 'yearly', 'quarterly', 'one-time'));

-- Add comment
COMMENT ON COLUMN quote_items.billing_frequency IS 
'Billing frequency: monthly (default), yearly, quarterly, or one-time';

-- Update existing items with 'Abonnement' category to yearly (common for hosting)
UPDATE quote_items 
SET billing_frequency = 'yearly'
WHERE LOWER(category) IN ('abonnement', 'subscription')
  AND billing_frequency IS NULL;

-- Verification
SELECT 
  qi.title,
  qi.category,
  qi.unit_price,
  qi.billing_frequency,
  CASE 
    WHEN qi.billing_frequency = 'yearly' THEN ROUND(qi.unit_price / 12, 2)
    WHEN qi.billing_frequency = 'quarterly' THEN ROUND(qi.unit_price / 3, 2)
    ELSE qi.unit_price
  END as monthly_equivalent
FROM quote_items qi
LIMIT 10;

COMMIT;

DO $$
BEGIN
  RAISE NOTICE '✅ billing_frequency column added to quote_items';
  RAISE NOTICE '✅ Options: monthly, yearly, quarterly, one-time';
  RAISE NOTICE '✅ Default: monthly';
END $$;
