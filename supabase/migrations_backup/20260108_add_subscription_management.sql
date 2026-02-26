-- Add Subscription Management voor MRR tracking
-- Implementeert: MRR dashboard, churn alerts, renewal calendar
-- Reported in: Agency Upgrade Requirements

-- Step 1: Create subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Relations
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  -- Subscription Details
  plan_name TEXT NOT NULL DEFAULT 'Standard Onderhoud',
  monthly_amount DECIMAL(10, 2) NOT NULL DEFAULT 50.00,
  currency TEXT DEFAULT 'EUR',
  
  -- Status
  status TEXT NOT NULL CHECK (status IN ('active', 'cancelled', 'paused', 'pending')) DEFAULT 'active',
  
  -- Dates
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  next_billing_date DATE NOT NULL,
  cancellation_date DATE,
  
  -- Pricing & Indexation
  annual_increase_percentage DECIMAL(5, 2) DEFAULT 3.50, -- 3.5% indexering
  last_price_increase_date DATE,
  
  -- Payment
  payment_method TEXT CHECK (payment_method IN ('automatische_incasso', 'factuur', 'creditcard')),
  last_payment_date DATE,
  payment_failures INTEGER DEFAULT 0,
  
  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id)
);

-- Step 2: Add subscription_id to projects table
ALTER TABLE projects
ADD COLUMN IF NOT EXISTS subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL;

-- Step 3: Create indexes
CREATE INDEX idx_subscriptions_project_id ON subscriptions(project_id);
CREATE INDEX idx_subscriptions_company_id ON subscriptions(company_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
CREATE INDEX idx_subscriptions_next_billing ON subscriptions(next_billing_date);
CREATE INDEX idx_subscriptions_active ON subscriptions(status, next_billing_date) 
  WHERE status = 'active';

-- Step 4: Create function to calculate MRR
CREATE OR REPLACE FUNCTION calculate_total_mrr()
RETURNS DECIMAL(10, 2)
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(SUM(monthly_amount), 0)
  FROM subscriptions
  WHERE status = 'active';
$$;

-- Step 5: Create function to calculate MRR growth
CREATE OR REPLACE FUNCTION calculate_mrr_growth()
RETURNS TABLE(
  current_mrr DECIMAL(10, 2),
  previous_month_mrr DECIMAL(10, 2),
  growth_amount DECIMAL(10, 2),
  growth_percentage DECIMAL(5, 2)
)
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  current_mrr_val DECIMAL(10, 2);
  prev_mrr_val DECIMAL(10, 2);
BEGIN
  -- Current MRR
  SELECT calculate_total_mrr() INTO current_mrr_val;
  
  -- Previous month MRR (subscriptions that were active 1 month ago)
  SELECT COALESCE(SUM(monthly_amount), 0)
  INTO prev_mrr_val
  FROM subscriptions
  WHERE status = 'active'
    AND start_date <= (CURRENT_DATE - INTERVAL '1 month');
  
  RETURN QUERY SELECT 
    current_mrr_val,
    prev_mrr_val,
    current_mrr_val - prev_mrr_val AS growth_amount,
    CASE 
      WHEN prev_mrr_val > 0 THEN ((current_mrr_val - prev_mrr_val) / prev_mrr_val) * 100
      ELSE 0
    END AS growth_percentage;
END;
$$;

-- Step 6: Create churn detection function
CREATE OR REPLACE FUNCTION detect_churn_risk()
RETURNS TABLE(
  subscription_id UUID,
  company_name TEXT,
  monthly_amount DECIMAL(10, 2),
  payment_failures INTEGER,
  days_overdue INTEGER,
  risk_level TEXT
)
LANGUAGE sql
STABLE
AS $$
  SELECT 
    s.id,
    c.naam,
    s.monthly_amount,
    s.payment_failures,
    EXTRACT(DAY FROM (CURRENT_DATE - s.next_billing_date))::INTEGER,
    CASE 
      WHEN s.payment_failures >= 3 THEN 'high'
      WHEN s.payment_failures >= 2 THEN 'medium'
      WHEN CURRENT_DATE > s.next_billing_date + INTERVAL '14 days' THEN 'medium'
      ELSE 'low'
    END AS risk_level
  FROM subscriptions s
  JOIN companies c ON c.id = s.company_id
  WHERE s.status = 'active'
    AND (s.payment_failures > 0 OR CURRENT_DATE > s.next_billing_date)
  ORDER BY s.payment_failures DESC, s.next_billing_date ASC;
$$;

-- Step 7: Create renewal reminder view
CREATE OR REPLACE VIEW upcoming_renewals AS
SELECT 
  s.id,
  s.project_id,
  c.naam AS company_name,
  p.naam AS project_name,
  s.monthly_amount,
  s.next_billing_date,
  EXTRACT(DAY FROM (s.next_billing_date - CURRENT_DATE))::INTEGER AS days_until_renewal,
  s.annual_increase_percentage
FROM subscriptions s
JOIN companies c ON c.id = s.company_id
JOIN projects p ON p.id = s.project_id
WHERE s.status = 'active'
  AND s.next_billing_date <= CURRENT_DATE + INTERVAL '30 days'
ORDER BY s.next_billing_date ASC;

-- Step 8: Create automatic updater for updated_at
CREATE OR REPLACE FUNCTION update_subscription_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_update_subscription_timestamp
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_subscription_updated_at();

-- Step 9: Enable RLS
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- Step 10: Create RLS policies
CREATE POLICY "Users can view subscriptions"
  ON subscriptions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = subscriptions.project_id
        AND (projects.user_id = auth.uid() OR is_admin_or_manager())
    )
  );

CREATE POLICY "Admin can manage subscriptions"
  ON subscriptions FOR ALL
  USING (is_admin_or_manager())
  WITH CHECK (is_admin_or_manager());

-- Step 11: Add comments
COMMENT ON TABLE subscriptions IS 
'Monthly recurring revenue (MRR) tracking voor website onderhoud abonnementen';

COMMENT ON COLUMN subscriptions.payment_failures IS 
'Aantal mislukte betalingen - trigger churn alert bij >= 2';

COMMENT ON COLUMN subscriptions.annual_increase_percentage IS 
'Jaarlijkse prijsindexering percentage (standaard 3.5%)';

COMMENT ON FUNCTION calculate_total_mrr() IS 
'Berekent totale Monthly Recurring Revenue van alle actieve subscriptions';

COMMENT ON FUNCTION detect_churn_risk() IS 
'Detecteert subscriptions met verhoogd churn risico (mislukte betalingen, overdue)';

COMMENT ON VIEW upcoming_renewals IS 
'Toont subscriptions die binnen 30 dagen verlengd moeten worden';
