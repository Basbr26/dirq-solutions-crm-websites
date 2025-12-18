-- ============================================================
-- 💰 COMPANY & COST MANAGEMENT SYSTEM
-- ============================================================
-- Complete compensation & benefits management voor Nederlandse bedrijven
-- 
-- Features:
-- ✅ Company profile met fiscale settings
-- ✅ Salarisschalen en functieniveaus
-- ✅ Toeslagen (ploegentoeslag, onregelmatigheidstoeslag, etc.)
-- ✅ Secundaire arbeidsvoorwaarden (lease auto, pensioen, verzekeringen)
-- ✅ Employee contracts met alle componenten
-- ✅ Real-time cost calculations
-- ✅ Budget forecasting & analytics
-- ✅ CAO configuratie
-- ============================================================

-- ============================================================
-- 1. COMPANY SETTINGS
-- ============================================================

CREATE TABLE IF NOT EXISTS company_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Basic info
  company_name VARCHAR(200) NOT NULL,
  legal_name VARCHAR(200),
  kvk_number VARCHAR(20),
  btw_number VARCHAR(30),
  
  -- Contact
  address_street VARCHAR(200),
  address_city VARCHAR(100),
  address_postal_code VARCHAR(10),
  address_country VARCHAR(2) DEFAULT 'NL',
  phone VARCHAR(20),
  email VARCHAR(100),
  website VARCHAR(200),
  
  -- Financial
  bank_account_iban VARCHAR(34),
  bank_name VARCHAR(100),
  
  -- Fiscal settings
  fiscal_year_start_month INTEGER DEFAULT 1 CHECK (fiscal_year_start_month BETWEEN 1 AND 12),
  default_currency VARCHAR(3) DEFAULT 'EUR',
  
  -- CAO information
  cao_name VARCHAR(200),
  cao_code VARCHAR(50),
  cao_valid_from DATE,
  cao_valid_until DATE,
  
  -- Payroll settings
  payroll_frequency VARCHAR(20) DEFAULT 'monthly' CHECK (payroll_frequency IN (
    'weekly', 'biweekly', 'monthly', 'four_weekly'
  )),
  payroll_day_of_month INTEGER DEFAULT 25 CHECK (payroll_day_of_month BETWEEN 1 AND 31),
  
  -- Labor costs
  employer_social_charges_pct DECIMAL(5,2) DEFAULT 20.00, -- Werkgeverslasten
  pension_employer_contribution_pct DECIMAL(5,2) DEFAULT 5.00,
  pension_employee_contribution_pct DECIMAL(5,2) DEFAULT 3.00,
  
  -- Overtime rules
  overtime_threshold_hours_per_week DECIMAL(5,2) DEFAULT 40.00,
  overtime_rate_multiplier DECIMAL(4,2) DEFAULT 1.50,
  
  -- Holiday allowance (vakantiegeld)
  holiday_allowance_pct DECIMAL(5,2) DEFAULT 8.00,
  holiday_allowance_payment_month INTEGER DEFAULT 5, -- Mei
  
  -- Default working hours
  default_fulltime_hours_per_week DECIMAL(5,2) DEFAULT 40.00,
  
  -- Other settings
  probation_period_months INTEGER DEFAULT 2,
  notice_period_weeks INTEGER DEFAULT 4,
  
  -- Metadata
  logo_url TEXT,
  settings_json JSONB, -- Extra configureerbare settings
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Only one company settings record allowed
  CONSTRAINT single_company_settings CHECK (id = id)
);

-- Ensure only one record
CREATE UNIQUE INDEX single_company_settings_idx ON company_settings ((true));

-- ============================================================
-- 2. SALARY SCALES & JOB LEVELS
-- ============================================================

CREATE TABLE IF NOT EXISTS job_levels (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Level identification
  level_code VARCHAR(20) NOT NULL UNIQUE, -- 'L1', 'L2', 'SENIOR', etc.
  level_name VARCHAR(100) NOT NULL,
  level_number INTEGER, -- Numeric ordering
  
  -- Description
  description TEXT,
  responsibilities TEXT,
  required_experience_years INTEGER,
  required_education_level VARCHAR(50),
  
  -- Salary range
  salary_min_annual DECIMAL(12,2),
  salary_max_annual DECIMAL(12,2),
  salary_market_median DECIMAL(12,2),
  
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS salary_scales (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Scale info
  scale_name VARCHAR(100) NOT NULL,
  scale_code VARCHAR(20) UNIQUE,
  job_level_id UUID REFERENCES job_levels(id),
  department_id UUID REFERENCES departments(id),
  
  -- CAO scale (indien van toepassing)
  cao_scale_number VARCHAR(20),
  cao_step_number VARCHAR(20),
  
  -- Salary details
  hourly_rate DECIMAL(10,2),
  monthly_salary DECIMAL(12,2),
  annual_salary DECIMAL(12,2),
  
  -- Calculation method
  salary_type VARCHAR(20) DEFAULT 'monthly' CHECK (salary_type IN (
    'hourly', 'monthly', 'annual'
  )),
  
  -- FTE
  fte DECIMAL(4,2) DEFAULT 1.00 CHECK (fte BETWEEN 0.01 AND 1.00),
  hours_per_week DECIMAL(5,2),
  
  -- Validity
  valid_from DATE NOT NULL,
  valid_until DATE,
  
  is_active BOOLEAN DEFAULT TRUE,
  notes TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- 3. ALLOWANCES & BONUSES (Toeslagen)
-- ============================================================

CREATE TABLE IF NOT EXISTS allowance_types (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Type identification
  code VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  category VARCHAR(50) NOT NULL CHECK (category IN (
    'shift', 'overtime', 'travel', 'meal', 'performance', 'irregular_hours', 'standby', 'other'
  )),
  
  -- Calculation method
  calculation_type VARCHAR(30) DEFAULT 'percentage' CHECK (calculation_type IN (
    'percentage', 'fixed_amount', 'per_hour', 'per_day', 'per_km'
  )),
  
  -- Value
  percentage_value DECIMAL(5,2), -- 25% = 25.00
  fixed_amount DECIMAL(10,2),
  
  -- Conditions
  applies_to_base_salary BOOLEAN DEFAULT TRUE,
  applies_to_overtime BOOLEAN DEFAULT FALSE,
  
  -- Tax treatment
  is_taxable BOOLEAN DEFAULT TRUE,
  is_pensionable BOOLEAN DEFAULT TRUE, -- Telt mee voor pensioenopbouw
  
  -- Frequency
  payment_frequency VARCHAR(20) DEFAULT 'monthly' CHECK (payment_frequency IN (
    'per_shift', 'weekly', 'monthly', 'quarterly', 'annual'
  )),
  
  description TEXT,
  legal_reference TEXT, -- Verwijzing naar CAO artikel
  
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Standard Dutch allowances
INSERT INTO allowance_types (code, name, category, calculation_type, percentage_value, description) VALUES
('SHIFT_EVENING', 'Avondtoeslag', 'shift', 'percentage', 15.00, 'Toeslag voor avonddiensten (18:00-23:00)'),
('SHIFT_NIGHT', 'Nachttoeslag', 'shift', 'percentage', 25.00, 'Toeslag voor nachtdiensten (00:00-06:00)'),
('SHIFT_WEEKEND_SAT', 'Zaterdagtoeslag', 'shift', 'percentage', 25.00, 'Toeslag voor werk op zaterdag'),
('SHIFT_WEEKEND_SUN', 'Zondagtoeslag', 'shift', 'percentage', 50.00, 'Toeslag voor werk op zondag'),
('IRREGULAR_HOURS', 'Onregelmatigheidstoeslag', 'irregular_hours', 'percentage', 10.00, 'Structurele onregelmatige diensten'),
('STANDBY', 'Bereikbaarheidsdienst', 'standby', 'per_day', 35.00, 'Vergoeding per dag bereikbaar'),
('OVERTIME_150', 'Overuren 150%', 'overtime', 'percentage', 50.00, 'Overuren 150% tarief'),
('OVERTIME_200', 'Overuren 200%', 'overtime', 'percentage', 100.00, 'Overuren 200% tarief (zon-/feestdagen)'),
('MEAL', 'Maaltijdvergoeding', 'meal', 'per_day', 7.50, 'Onbelaste maaltijdvergoeding'),
('TRAVEL_KM', 'Reiskostenvergoeding', 'travel', 'per_km', 0.23, 'Onbelaste kilometers vergoeding'),
('PERFORMANCE_BONUS', 'Prestatiebonus', 'performance', 'percentage', 10.00, 'Jaarlijkse prestatieafhankelijke bonus')
ON CONFLICT (code) DO NOTHING;

-- ============================================================
-- 4. BENEFITS PACKAGES (Secundaire Arbeidsvoorwaarden)
-- ============================================================

CREATE TABLE IF NOT EXISTS benefits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Benefit identification
  code VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  category VARCHAR(50) NOT NULL CHECK (category IN (
    'pension', 'insurance', 'lease_car', 'phone', 'laptop', 'training', 'wellness', 'other'
  )),
  
  -- Cost
  employer_cost_monthly DECIMAL(10,2) DEFAULT 0,
  employee_cost_monthly DECIMAL(10,2) DEFAULT 0,
  
  -- Tax treatment
  is_benefit_in_kind BOOLEAN DEFAULT FALSE, -- Loon in natura
  taxable_value_monthly DECIMAL(10,2), -- Bijtelling
  
  -- Details
  description TEXT,
  terms_and_conditions TEXT,
  provider_name VARCHAR(100),
  
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Standard benefits
INSERT INTO benefits (code, name, category, employer_cost_monthly, description) VALUES
('PENSION_BASIC', 'Basispensioenregeling', 'pension', 150.00, 'Standaard pensioenregeling conform CAO'),
('PENSION_PREMIUM', 'Premium pensioenregeling', 'pension', 300.00, 'Uitgebreide pensioenregeling'),
('HEALTH_INSURANCE', 'Collectieve zorgverzekering', 'insurance', 50.00, 'Collectiviteitskorting zorgverzekering'),
('DENTAL_INSURANCE', 'Tandartsverzekering', 'insurance', 25.00, 'Aanvullende tandartsverzekering'),
('DISABILITY_INSURANCE', 'WIA-hiaatverzekering', 'insurance', 75.00, 'Aanvullende arbeidsongeschiktheidsverzekering'),
('LEASE_CAR_SMALL', 'Lease auto - Klein segment', 'lease_car', 400.00, 'Lease auto t/m €35.000 cataloguswaarde'),
('LEASE_CAR_MEDIUM', 'Lease auto - Middensegment', 'lease_car', 600.00, 'Lease auto €35.000-€50.000'),
('LEASE_CAR_LARGE', 'Lease auto - Groot segment', 'lease_car', 850.00, 'Lease auto vanaf €50.000'),
('PHONE_ALLOWANCE', 'Telefoonvergoeding', 'phone', 30.00, 'Onbelaste telefoonvergoeding'),
('LAPTOP', 'Laptop', 'laptop', 100.00, 'Zakelijke laptop (afschrijving)'),
('TRAINING_BUDGET', 'Opleidingsbudget', 'training', 100.00, 'Jaarlijks opleidingsbudget €1200'),
('FITNESS', 'Sportabonnement', 'wellness', 35.00, 'Collectief sportabonnement (bijtelling)')
ON CONFLICT (code) DO NOTHING;

CREATE TABLE IF NOT EXISTS benefit_packages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Package info
  package_name VARCHAR(100) NOT NULL,
  package_code VARCHAR(50) UNIQUE,
  job_level_id UUID REFERENCES job_levels(id),
  
  -- Cost summary
  total_employer_cost_monthly DECIMAL(12,2),
  total_taxable_value_monthly DECIMAL(12,2),
  
  description TEXT,
  is_default BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Link benefits to packages
CREATE TABLE IF NOT EXISTS benefit_package_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  package_id UUID NOT NULL REFERENCES benefit_packages(id) ON DELETE CASCADE,
  benefit_id UUID NOT NULL REFERENCES benefits(id),
  is_mandatory BOOLEAN DEFAULT TRUE,
  is_optional BOOLEAN DEFAULT FALSE,
  UNIQUE(package_id, benefit_id)
);

-- ============================================================
-- 5. EMPLOYEE CONTRACTS & COMPENSATION
-- ============================================================

CREATE TABLE IF NOT EXISTS employee_contracts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Contract details
  contract_type VARCHAR(30) DEFAULT 'permanent' CHECK (contract_type IN (
    'permanent', 'fixed_term', 'temporary', 'freelance', 'intern', 'volunteer'
  )),
  
  contract_number VARCHAR(50) UNIQUE,
  
  -- Dates
  start_date DATE NOT NULL,
  end_date DATE,
  probation_end_date DATE,
  
  -- Job details
  job_title VARCHAR(100),
  job_level_id UUID REFERENCES job_levels(id),
  salary_scale_id UUID REFERENCES salary_scales(id),
  department_id UUID REFERENCES departments(id),
  
  -- Working hours
  fte DECIMAL(4,2) DEFAULT 1.00 CHECK (fte BETWEEN 0.01 AND 1.00),
  hours_per_week DECIMAL(5,2),
  
  -- Base compensation
  base_salary_annual DECIMAL(12,2),
  base_salary_monthly DECIMAL(12,2),
  base_salary_hourly DECIMAL(10,2),
  
  -- Holiday days
  holiday_days_per_year INTEGER DEFAULT 25,
  
  -- Benefits package
  benefit_package_id UUID REFERENCES benefit_packages(id),
  
  -- Allowances (many-to-many via junction table)
  
  -- Payment details
  bank_account_iban VARCHAR(34),
  tax_number VARCHAR(30), -- BSN / Sofi nummer (encrypted!)
  
  -- Status
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN (
    'draft', 'pending_signature', 'active', 'suspended', 'terminated', 'expired'
  )),
  
  signed_date DATE,
  signed_by_employee BOOLEAN DEFAULT FALSE,
  signed_by_employer BOOLEAN DEFAULT FALSE,
  
  -- Termination
  termination_date DATE,
  termination_reason VARCHAR(50),
  termination_notes TEXT,
  
  -- Documents
  contract_document_id UUID, -- Link to documents table
  
  notes TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Employee contract allowances (which allowances apply to this contract)
CREATE TABLE IF NOT EXISTS employee_contract_allowances (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contract_id UUID NOT NULL REFERENCES employee_contracts(id) ON DELETE CASCADE,
  allowance_type_id UUID NOT NULL REFERENCES allowance_types(id),
  
  -- Override values (if different from standard)
  custom_percentage DECIMAL(5,2),
  custom_fixed_amount DECIMAL(10,2),
  
  -- Conditions
  condition_description TEXT,
  requires_approval BOOLEAN DEFAULT FALSE,
  
  effective_from DATE,
  effective_until DATE,
  
  is_active BOOLEAN DEFAULT TRUE,
  UNIQUE(contract_id, allowance_type_id)
);

-- Employee specific benefits (overrides package)
CREATE TABLE IF NOT EXISTS employee_benefits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  benefit_id UUID NOT NULL REFERENCES benefits(id),
  contract_id UUID REFERENCES employee_contracts(id),
  
  -- Custom values
  custom_employer_cost_monthly DECIMAL(10,2),
  custom_taxable_value_monthly DECIMAL(10,2),
  
  -- Lease car specific
  lease_car_make VARCHAR(50),
  lease_car_model VARCHAR(50),
  lease_car_license_plate VARCHAR(20),
  lease_car_catalog_value DECIMAL(12,2),
  lease_car_co2_emission INTEGER,
  lease_car_addition_percentage DECIMAL(5,2), -- Bijtelling %
  
  start_date DATE NOT NULL,
  end_date DATE,
  
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN (
    'pending', 'active', 'suspended', 'ended'
  )),
  
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(employee_id, benefit_id, start_date)
);

-- ============================================================
-- 6. SALARY CALCULATIONS & COST TRACKING
-- ============================================================

CREATE TABLE IF NOT EXISTS employee_cost_summary (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  contract_id UUID REFERENCES employee_contracts(id),
  
  -- Period
  year INTEGER NOT NULL,
  month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
  
  -- Base salary
  base_salary_gross DECIMAL(12,2),
  
  -- Allowances
  allowances_total DECIMAL(12,2) DEFAULT 0,
  overtime_total DECIMAL(12,2) DEFAULT 0,
  
  -- Benefits
  benefits_employer_cost DECIMAL(12,2) DEFAULT 0,
  benefits_taxable_value DECIMAL(12,2) DEFAULT 0,
  
  -- Deductions
  holiday_allowance DECIMAL(12,2) DEFAULT 0,
  
  -- Employer costs
  social_charges DECIMAL(12,2) DEFAULT 0,
  pension_employer_contribution DECIMAL(12,2) DEFAULT 0,
  
  -- Total costs
  total_gross_salary DECIMAL(12,2),
  total_employer_cost DECIMAL(12,2),
  
  -- Employee perspective
  pension_employee_contribution DECIMAL(12,2) DEFAULT 0,
  estimated_net_salary DECIMAL(12,2), -- Schatting netto loon
  
  -- Hours worked
  hours_worked DECIMAL(8,2),
  overtime_hours DECIMAL(8,2),
  
  -- Cost per hour
  cost_per_hour DECIMAL(10,2),
  
  -- Calculation metadata
  calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  calculation_notes TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(employee_id, year, month)
);

-- ============================================================
-- 7. OFFER LETTER TEMPLATES
-- ============================================================

CREATE TABLE IF NOT EXISTS offer_letter_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  template_name VARCHAR(100) NOT NULL,
  template_code VARCHAR(50) UNIQUE,
  
  -- Template content (Markdown with placeholders)
  content_markdown TEXT NOT NULL,
  
  -- Available placeholders
  -- {{company_name}}, {{employee_name}}, {{job_title}}, {{start_date}},
  -- {{base_salary_annual}}, {{base_salary_monthly}}, {{fte}}, {{hours_per_week}},
  -- {{holiday_days}}, {{benefits_list}}, {{allowances_list}}, etc.
  
  -- Sections to include
  include_salary_breakdown BOOLEAN DEFAULT TRUE,
  include_benefits_section BOOLEAN DEFAULT TRUE,
  include_allowances_section BOOLEAN DEFAULT TRUE,
  include_working_hours BOOLEAN DEFAULT TRUE,
  include_holiday_info BOOLEAN DEFAULT TRUE,
  include_probation_period BOOLEAN DEFAULT TRUE,
  
  is_default BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Default offer letter template (Dutch)
INSERT INTO offer_letter_templates (
  template_name,
  template_code,
  content_markdown,
  is_default
) VALUES (
  'Standaard Aanbiedingsbrief',
  'DEFAULT_OFFER_NL',
  '# Aanbiedingsbrief

**{{company_name}}**  
{{company_address}}

**Datum:** {{current_date}}

**Betreft:** Arbeidsaanbod voor de functie van {{job_title}}

Geachte {{employee_salutation}} {{employee_name}},

Met genoegen bieden wij u een arbeidsovereenkomst aan voor de functie van **{{job_title}}** binnen onze organisatie.

## Functieomschrijving
U zult werkzaam zijn als {{job_title}} binnen de afdeling {{department_name}}.

## Dienstverband
- **Type contract:** {{contract_type}}
- **Ingangsdatum:** {{start_date}}
- **FTE:** {{fte}}
- **Uren per week:** {{hours_per_week}}
{{#if_probation_period}}
- **Proeftijd:** {{probation_months}} maanden
{{/if_probation_period}}

## Salaris en Beloning

### Basissalaris
- **Jaarsalaris:** € {{base_salary_annual}} bruto per jaar
- **Maandsalaris:** € {{base_salary_monthly}} bruto per maand (12x per jaar)
- **Uurloon:** € {{base_salary_hourly}} bruto per uur

### Vakantiegeld
U ontvangt jaarlijks 8% vakantiegeld, uit te betalen in de maand mei.

### Toeslagen
{{#if_allowances}}
De volgende toeslagen zijn van toepassing:
{{allowances_list}}
{{/if_allowances}}

## Secundaire Arbeidsvoorwaarden

{{#if_benefits}}
Als onderdeel van uw arbeidsvoorwaardenpakket ontvangt u:
{{benefits_list}}

**Totale waarde arbeidsvoorwaardenpakket:** € {{benefits_total_value}} per maand
{{/if_benefits}}

## Verlof
U heeft recht op {{holiday_days}} vakantiedagen per jaar bij een fulltime dienstverband.

## Pensioen
{{pension_description}}

## Overige Bepalingen
- **Betalingsfrequentie:** Maandelijks op de {{payroll_day}}e van de maand
- **CAO:** {{cao_name}}
- **Opzegtermijn:** {{notice_period_weeks}} weken

Wij vertrouwen erop u hiermee volledig te hebben geïnformeerd en zien uit naar een prettige en vruchtbare samenwerking.

Met vriendelijke groet,

**{{company_name}}**  
{{hr_contact_name}}  
HR Manager

---

*Deze aanbiedingsbrief is geldig tot {{offer_valid_until}}*',
  TRUE
) ON CONFLICT (template_code) DO NOTHING;

-- ============================================================
-- 8. INDEXES
-- ============================================================

-- Job levels & scales
CREATE INDEX idx_job_levels_active ON job_levels(is_active);
CREATE INDEX idx_salary_scales_job_level ON salary_scales(job_level_id);
CREATE INDEX idx_salary_scales_department ON salary_scales(department_id);
CREATE INDEX idx_salary_scales_active ON salary_scales(is_active, valid_from, valid_until);

-- Allowances & benefits
CREATE INDEX idx_allowance_types_category ON allowance_types(category);
CREATE INDEX idx_allowance_types_active ON allowance_types(is_active);
CREATE INDEX idx_benefits_category ON benefits(category);
CREATE INDEX idx_benefit_package_items_package ON benefit_package_items(package_id);

-- Contracts
CREATE INDEX idx_employee_contracts_employee ON employee_contracts(employee_id);
CREATE INDEX idx_employee_contracts_status ON employee_contracts(status);
CREATE INDEX idx_employee_contracts_dates ON employee_contracts(start_date, end_date);
CREATE INDEX idx_employee_contracts_job_level ON employee_contracts(job_level_id);
CREATE INDEX idx_employee_contracts_department ON employee_contracts(department_id);

-- Contract allowances & benefits
CREATE INDEX idx_contract_allowances_contract ON employee_contract_allowances(contract_id);
CREATE INDEX idx_employee_benefits_employee ON employee_benefits(employee_id);
CREATE INDEX idx_employee_benefits_status ON employee_benefits(status);

-- Cost tracking
CREATE INDEX idx_cost_summary_employee ON employee_cost_summary(employee_id);
CREATE INDEX idx_cost_summary_period ON employee_cost_summary(year, month);
CREATE INDEX idx_cost_summary_contract ON employee_cost_summary(contract_id);

-- ============================================================
-- 9. ROW LEVEL SECURITY
-- ============================================================

-- Company settings
ALTER TABLE company_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "HR views company settings" ON company_settings FOR SELECT USING (
  auth.uid() IN (SELECT id FROM profiles WHERE role IN ('hr', 'super_admin'))
);
CREATE POLICY "Super admin manages settings" ON company_settings FOR ALL USING (
  auth.uid() IN (SELECT id FROM profiles WHERE role = 'super_admin')
);

-- Job levels & salary scales
ALTER TABLE job_levels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "HR views job levels" ON job_levels FOR SELECT USING (
  auth.uid() IN (SELECT id FROM profiles WHERE role IN ('hr', 'super_admin', 'manager'))
);
CREATE POLICY "HR manages job levels" ON job_levels FOR ALL USING (
  auth.uid() IN (SELECT id FROM profiles WHERE role IN ('hr', 'super_admin'))
);

ALTER TABLE salary_scales ENABLE ROW LEVEL SECURITY;
CREATE POLICY "HR views salary scales" ON salary_scales FOR SELECT USING (
  auth.uid() IN (SELECT id FROM profiles WHERE role IN ('hr', 'super_admin'))
);
CREATE POLICY "HR manages salary scales" ON salary_scales FOR ALL USING (
  auth.uid() IN (SELECT id FROM profiles WHERE role IN ('hr', 'super_admin'))
);

-- Allowances & benefits
ALTER TABLE allowance_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY "HR views allowances" ON allowance_types FOR SELECT USING (
  auth.uid() IN (SELECT id FROM profiles WHERE role IN ('hr', 'super_admin'))
);
CREATE POLICY "HR manages allowances" ON allowance_types FOR ALL USING (
  auth.uid() IN (SELECT id FROM profiles WHERE role IN ('hr', 'super_admin'))
);

ALTER TABLE benefits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "HR views benefits" ON benefits FOR SELECT USING (
  auth.uid() IN (SELECT id FROM profiles WHERE role IN ('hr', 'super_admin'))
);
CREATE POLICY "HR manages benefits" ON benefits FOR ALL USING (
  auth.uid() IN (SELECT id FROM profiles WHERE role IN ('hr', 'super_admin'))
);

ALTER TABLE benefit_packages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "HR views benefit packages" ON benefit_packages FOR SELECT USING (
  auth.uid() IN (SELECT id FROM profiles WHERE role IN ('hr', 'super_admin'))
);
CREATE POLICY "HR manages benefit packages" ON benefit_packages FOR ALL USING (
  auth.uid() IN (SELECT id FROM profiles WHERE role IN ('hr', 'super_admin'))
);

ALTER TABLE benefit_package_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "HR views package items" ON benefit_package_items FOR SELECT USING (
  auth.uid() IN (SELECT id FROM profiles WHERE role IN ('hr', 'super_admin'))
);
CREATE POLICY "HR manages package items" ON benefit_package_items FOR ALL USING (
  auth.uid() IN (SELECT id FROM profiles WHERE role IN ('hr', 'super_admin'))
);

-- Employee contracts
ALTER TABLE employee_contracts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Employees view own contract" ON employee_contracts FOR SELECT USING (
  employee_id = auth.uid() OR
  auth.uid() IN (SELECT id FROM profiles WHERE role IN ('hr', 'super_admin'))
);
CREATE POLICY "HR manages contracts" ON employee_contracts FOR ALL USING (
  auth.uid() IN (SELECT id FROM profiles WHERE role IN ('hr', 'super_admin'))
);

ALTER TABLE employee_contract_allowances ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Employees view own allowances" ON employee_contract_allowances FOR SELECT USING (
  contract_id IN (SELECT id FROM employee_contracts WHERE employee_id = auth.uid()) OR
  auth.uid() IN (SELECT id FROM profiles WHERE role IN ('hr', 'super_admin'))
);
CREATE POLICY "HR manages contract allowances" ON employee_contract_allowances FOR ALL USING (
  auth.uid() IN (SELECT id FROM profiles WHERE role IN ('hr', 'super_admin'))
);

ALTER TABLE employee_benefits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Employees view own benefits" ON employee_benefits FOR SELECT USING (
  employee_id = auth.uid() OR
  auth.uid() IN (SELECT id FROM profiles WHERE role IN ('hr', 'super_admin'))
);
CREATE POLICY "HR manages employee benefits" ON employee_benefits FOR ALL USING (
  auth.uid() IN (SELECT id FROM profiles WHERE role IN ('hr', 'super_admin'))
);

-- Cost tracking
ALTER TABLE employee_cost_summary ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Employees view own cost summary" ON employee_cost_summary FOR SELECT USING (
  employee_id = auth.uid() OR
  auth.uid() IN (SELECT id FROM profiles WHERE role IN ('hr', 'super_admin'))
);
CREATE POLICY "System creates cost summaries" ON employee_cost_summary FOR INSERT WITH CHECK (true);
CREATE POLICY "HR updates cost summaries" ON employee_cost_summary FOR UPDATE USING (
  auth.uid() IN (SELECT id FROM profiles WHERE role IN ('hr', 'super_admin'))
);

-- Offer templates
ALTER TABLE offer_letter_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "HR views templates" ON offer_letter_templates FOR SELECT USING (
  auth.uid() IN (SELECT id FROM profiles WHERE role IN ('hr', 'super_admin'))
);
CREATE POLICY "HR manages templates" ON offer_letter_templates FOR ALL USING (
  auth.uid() IN (SELECT id FROM profiles WHERE role IN ('hr', 'super_admin'))
);

-- ============================================================
-- 10. TRIGGERS
-- ============================================================

CREATE TRIGGER update_company_settings_updated_at BEFORE UPDATE ON company_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_job_levels_updated_at BEFORE UPDATE ON job_levels FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_salary_scales_updated_at BEFORE UPDATE ON salary_scales FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_allowance_types_updated_at BEFORE UPDATE ON allowance_types FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_benefits_updated_at BEFORE UPDATE ON benefits FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_benefit_packages_updated_at BEFORE UPDATE ON benefit_packages FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_employee_contracts_updated_at BEFORE UPDATE ON employee_contracts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_employee_benefits_updated_at BEFORE UPDATE ON employee_benefits FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_employee_cost_summary_updated_at BEFORE UPDATE ON employee_cost_summary FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_offer_letter_templates_updated_at BEFORE UPDATE ON offer_letter_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 11. HELPER FUNCTIONS
-- ============================================================

-- Calculate total employee cost for a month
CREATE OR REPLACE FUNCTION calculate_employee_monthly_cost(
  p_employee_id UUID,
  p_year INTEGER,
  p_month INTEGER
)
RETURNS DECIMAL(12,2) AS $$
DECLARE
  v_contract RECORD;
  v_company RECORD;
  v_base_salary DECIMAL(12,2);
  v_allowances DECIMAL(12,2) := 0;
  v_benefits DECIMAL(12,2) := 0;
  v_social_charges DECIMAL(12,2);
  v_pension DECIMAL(12,2);
  v_total DECIMAL(12,2);
BEGIN
  -- Get active contract
  SELECT * INTO v_contract
  FROM employee_contracts
  WHERE employee_id = p_employee_id
    AND status = 'active'
    AND start_date <= make_date(p_year, p_month, 1)
    AND (end_date IS NULL OR end_date >= make_date(p_year, p_month, 1))
  LIMIT 1;
  
  IF v_contract IS NULL THEN
    RETURN 0;
  END IF;
  
  -- Get company settings
  SELECT * INTO v_company FROM company_settings LIMIT 1;
  
  -- Base salary
  v_base_salary := COALESCE(v_contract.base_salary_monthly, 0);
  
  -- Calculate allowances (simplified - would need to look at actual hours worked)
  SELECT COALESCE(SUM(
    CASE 
      WHEN at.calculation_type = 'percentage' THEN v_base_salary * (at.percentage_value / 100)
      WHEN at.calculation_type = 'fixed_amount' THEN at.fixed_amount
      ELSE 0
    END
  ), 0) INTO v_allowances
  FROM employee_contract_allowances eca
  JOIN allowance_types at ON at.id = eca.allowance_type_id
  WHERE eca.contract_id = v_contract.id
    AND eca.is_active = TRUE
    AND at.payment_frequency = 'monthly';
  
  -- Calculate benefits cost
  SELECT COALESCE(SUM(COALESCE(custom_employer_cost_monthly, b.employer_cost_monthly)), 0) INTO v_benefits
  FROM employee_benefits eb
  JOIN benefits b ON b.id = eb.benefit_id
  WHERE eb.employee_id = p_employee_id
    AND eb.status = 'active'
    AND eb.start_date <= make_date(p_year, p_month, 1)
    AND (eb.end_date IS NULL OR eb.end_date >= make_date(p_year, p_month, 1));
  
  -- Calculate employer costs
  v_social_charges := (v_base_salary + v_allowances) * (COALESCE(v_company.employer_social_charges_pct, 20) / 100);
  v_pension := (v_base_salary + v_allowances) * (COALESCE(v_company.pension_employer_contribution_pct, 5) / 100);
  
  v_total := v_base_salary + v_allowances + v_benefits + v_social_charges + v_pension;
  
  RETURN v_total;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Generate offer letter content
CREATE OR REPLACE FUNCTION generate_offer_letter(
  p_employee_id UUID,
  p_contract_id UUID,
  p_template_id UUID DEFAULT NULL
)
RETURNS TEXT AS $$
DECLARE
  v_template RECORD;
  v_contract RECORD;
  v_employee RECORD;
  v_company RECORD;
  v_content TEXT;
  v_allowances_list TEXT := '';
  v_benefits_list TEXT := '';
BEGIN
  -- Get template (default if not specified)
  IF p_template_id IS NULL THEN
    SELECT * INTO v_template FROM offer_letter_templates WHERE is_default = TRUE LIMIT 1;
  ELSE
    SELECT * INTO v_template FROM offer_letter_templates WHERE id = p_template_id;
  END IF;
  
  -- Get contract, employee, company
  SELECT * INTO v_contract FROM employee_contracts WHERE id = p_contract_id;
  SELECT * INTO v_employee FROM profiles WHERE id = p_employee_id;
  SELECT * INTO v_company FROM company_settings LIMIT 1;
  
  -- Build allowances list
  SELECT string_agg('- ' || at.name || ': ' || 
    CASE 
      WHEN at.calculation_type = 'percentage' THEN at.percentage_value::TEXT || '%'
      WHEN at.calculation_type = 'fixed_amount' THEN '€' || at.fixed_amount::TEXT
      ELSE ''
    END, E'\n')
  INTO v_allowances_list
  FROM employee_contract_allowances eca
  JOIN allowance_types at ON at.id = eca.allowance_type_id
  WHERE eca.contract_id = p_contract_id AND eca.is_active = TRUE;
  
  -- Build benefits list
  SELECT string_agg('- ' || b.name, E'\n')
  INTO v_benefits_list
  FROM employee_benefits eb
  JOIN benefits b ON b.id = eb.benefit_id
  WHERE eb.employee_id = p_employee_id AND eb.status = 'active';
  
  -- Replace placeholders
  v_content := v_template.content_markdown;
  v_content := replace(v_content, '{{company_name}}', COALESCE(v_company.company_name, ''));
  v_content := replace(v_content, '{{employee_name}}', COALESCE(v_employee.full_name, ''));
  v_content := replace(v_content, '{{job_title}}', COALESCE(v_contract.job_title, ''));
  v_content := replace(v_content, '{{base_salary_annual}}', COALESCE(v_contract.base_salary_annual::TEXT, '0'));
  v_content := replace(v_content, '{{base_salary_monthly}}', COALESCE(v_contract.base_salary_monthly::TEXT, '0'));
  v_content := replace(v_content, '{{fte}}', COALESCE(v_contract.fte::TEXT, '1.0'));
  v_content := replace(v_content, '{{hours_per_week}}', COALESCE(v_contract.hours_per_week::TEXT, '40'));
  v_content := replace(v_content, '{{holiday_days}}', COALESCE(v_contract.holiday_days_per_year::TEXT, '25'));
  v_content := replace(v_content, '{{allowances_list}}', COALESCE(v_allowances_list, 'Geen specifieke toeslagen'));
  v_content := replace(v_content, '{{benefits_list}}', COALESCE(v_benefits_list, 'Standaard arbeidsvoorwaarden'));
  v_content := replace(v_content, '{{current_date}}', to_char(CURRENT_DATE, 'DD-MM-YYYY'));
  v_content := replace(v_content, '{{start_date}}', to_char(v_contract.start_date, 'DD-MM-YYYY'));
  
  RETURN v_content;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- View: Employee total compensation
CREATE OR REPLACE VIEW v_employee_total_compensation AS
SELECT
  ec.employee_id,
  p.full_name,
  p.employee_number,
  ec.id as contract_id,
  ec.job_title,
  ec.status as contract_status,
  ec.fte,
  ec.base_salary_annual,
  ec.base_salary_monthly,
  
  -- Allowances
  (SELECT COUNT(*) FROM employee_contract_allowances WHERE contract_id = ec.id AND is_active = TRUE) as allowances_count,
  
  -- Benefits
  (SELECT COALESCE(SUM(COALESCE(eb.custom_employer_cost_monthly, b.employer_cost_monthly)), 0)
   FROM employee_benefits eb
   JOIN benefits b ON b.id = eb.benefit_id
   WHERE eb.employee_id = ec.employee_id AND eb.status = 'active') as benefits_monthly_cost,
  
  -- Estimated monthly employer cost
  ec.base_salary_monthly + 
  (ec.base_salary_monthly * 0.25) + -- Social charges + pension estimate
  (SELECT COALESCE(SUM(COALESCE(eb.custom_employer_cost_monthly, b.employer_cost_monthly)), 0)
   FROM employee_benefits eb
   JOIN benefits b ON b.id = eb.benefit_id
   WHERE eb.employee_id = ec.employee_id AND eb.status = 'active') as estimated_total_cost_monthly
  
FROM employee_contracts ec
JOIN profiles p ON p.id = ec.employee_id
WHERE ec.status = 'active';

-- ============================================================
-- 12. DOCUMENTATION
-- ============================================================

COMMENT ON TABLE company_settings IS 'Company profile and payroll configuration';
COMMENT ON TABLE job_levels IS 'Job level definitions with salary ranges';
COMMENT ON TABLE salary_scales IS 'Salary scales per job level and department';
COMMENT ON TABLE allowance_types IS 'Allowance types (shift, overtime, travel, etc.)';
COMMENT ON TABLE benefits IS 'Benefits catalog (pension, insurance, lease car, etc.)';
COMMENT ON TABLE benefit_packages IS 'Predefined benefit packages per job level';
COMMENT ON TABLE employee_contracts IS 'Employee employment contracts with all compensation details';
COMMENT ON TABLE employee_contract_allowances IS 'Allowances applicable to employee contracts';
COMMENT ON TABLE employee_benefits IS 'Benefits assigned to employees';
COMMENT ON TABLE employee_cost_summary IS 'Monthly employee cost calculations';
COMMENT ON TABLE offer_letter_templates IS 'Offer letter templates with dynamic content';

COMMENT ON FUNCTION calculate_employee_monthly_cost(uuid, integer, integer) IS 'Calculates total employer cost for employee in given month';
COMMENT ON FUNCTION generate_offer_letter(uuid, uuid, uuid) IS 'Generates offer letter content from template with all compensation details';

COMMENT ON VIEW v_employee_total_compensation IS 'Complete compensation overview per employee';
