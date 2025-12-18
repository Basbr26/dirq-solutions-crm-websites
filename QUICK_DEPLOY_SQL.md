# ⚡ Quick Deploy SQL - Kopieer & Plak Scripts

**Gebruik:** Kopieer deze SQL blocks en plak in Supabase SQL Editor  
**Volgorde:** Voer uit van boven naar beneden!

---

## 1️⃣ COMPANY SETTINGS (VERPLICHT)

```sql
-- Pas aan met jouw bedrijfsgegevens!
INSERT INTO company_settings (
  company_name,
  legal_name,
  kvk_number,
  btw_number,
  address_street,
  address_postal_code,
  address_city,
  address_country,
  contact_email,
  contact_phone,
  iban,
  bank_name,
  fiscal_year_start_month,
  employer_social_charges_percentage,
  pension_employer_percentage,
  pension_employee_percentage,
  holiday_allowance_percentage,
  default_fulltime_hours,
  probation_period_months,
  notice_period_weeks
) VALUES (
  'Dirq Solutions',
  'Dirq Solutions B.V.',
  '12345678',
  'NL123456789B01',
  'Voorbeeldstraat 123',
  '1234 AB',
  'Amsterdam',
  'Nederland',
  'info@dirq.nl',
  '+31 20 1234567',
  'NL00BANK0123456789',
  'ING Bank',
  1,
  20.0,
  5.0,
  3.0,
  8.0,
  40.0,
  2,
  4
);
```

---

## 2️⃣ AFDELINGEN (VERPLICHT)

```sql
-- Basis afdelingen
INSERT INTO departments (name, description, budget_yearly) VALUES
  ('HR & Administratie', 'Human Resources en administratieve taken', 500000),
  ('Operationeel', 'Operationele medewerkers en dienstverlening', 1500000),
  ('Management', 'Management en directie', 800000),
  ('IT & Support', 'IT ondersteuning en technische zaken', 600000),
  ('Sales & Marketing', 'Verkoop en marketing activiteiten', 700000);
```

---

## 3️⃣ JOB LEVELS (AANBEVOLEN)

```sql
-- Functieniveaus voor salary management
INSERT INTO job_levels (
  level_code, 
  level_name, 
  level_number, 
  min_salary, 
  max_salary, 
  median_salary
) VALUES
  ('ENTRY', 'Junior/Entry Level', 1, 28000, 38000, 33000),
  ('MID', 'Medior/Professional', 2, 38000, 55000, 46000),
  ('SENIOR', 'Senior/Expert', 3, 55000, 75000, 65000),
  ('LEAD', 'Lead/Principal', 4, 75000, 95000, 85000),
  ('MGR', 'Manager', 5, 85000, 110000, 97000),
  ('DIR', 'Director', 6, 110000, 150000, 130000);
```

---

## 4️⃣ SALARY SCALES (AANBEVOLEN)

```sql
-- Auto-genereer salary scales voor alle combinaties
INSERT INTO salary_scales (
  job_level_id,
  department_id,
  cao_scale,
  hourly_rate,
  monthly_rate,
  annual_rate,
  fte,
  valid_from
)
SELECT 
  jl.id,
  d.id,
  'Schaal ' || jl.level_number,
  jl.median_salary / 1840.0,
  jl.median_salary / 12.0,
  jl.median_salary,
  1.0,
  CURRENT_DATE
FROM job_levels jl
CROSS JOIN departments d
WHERE jl.is_active = true;
```

---

## 5️⃣ DEFAULT OFFER LETTER TEMPLATE (AANBEVOLEN)

```sql
-- Nederlandse aanbiedingsbrief template
INSERT INTO offer_letter_templates (
  template_name,
  subject_line,
  template_content,
  is_default
) VALUES (
  'Standaard Aanbiedingsbrief NL',
  'Arbeidsaanbieding - {{job_title}} bij {{company_name}}',
  '# Arbeidsaanbieding

**{{company_name}}**  
{{company_address}}  
KvK: {{kvk_number}}  
BTW: {{btw_number}}

---

**Datum:** {{offer_date}}

**Betreft:** Arbeidsaanbieding {{job_title}}

Beste {{employee_name}},

Wij bieden je graag een arbeidsovereenkomst aan voor de functie van **{{job_title}}** bij {{company_name}}.

## Functiegegevens

- **Functietitel:** {{job_title}}
- **Afdeling:** {{department_name}}
- **Startdatum:** {{start_date}}
- **Contract type:** {{contract_type}}
- **Dienstverband:** {{fte}} FTE ({{hours_per_week}} uur per week)

## Arbeidsvoorwaarden

### Salaris
- **Bruto jaarsalaris:** € {{base_salary_annual}}
- **Bruto maandsalaris:** € {{base_salary_monthly}} (op basis van 12 maanden)
- **Bruto uurloon:** € {{base_salary_hourly}}
- **Vakantiegeld:** {{holiday_allowance_percentage}}% (€ {{holiday_allowance_amount}} per jaar)

### Toeslagen
{{allowances_list}}

### Secundaire Arbeidsvoorwaarden
{{benefits_list}}

### Pensioen
- **Werkgeversbijdrage:** {{pension_employer_percentage}}%
- **Werknemersbijdrage:** {{pension_employee_percentage}}%

### Verlof
- **Vakantiedagen:** {{holiday_days}} dagen per jaar (bij fulltime dienstverband)

### CAO
{{cao_name}} ({{cao_code}})

## Overige voorwaarden

- **Proeftijd:** {{probation_period}} maanden
- **Opzegtermijn:** {{notice_period}} weken
- **Werklocatie:** {{company_city}}

## Aanvaarding

Wij verzoeken je deze arbeidsaanbieding voor {{acceptance_deadline}} te ondertekenen en te retourneren.

Bij vragen kun je contact opnemen met HR via {{contact_email}} of {{contact_phone}}.

Wij zien ernaar uit om met je samen te werken!

Met vriendelijke groet,

**{{company_name}}**  
HR Afdeling

---

**Handtekening werknemer:**

Naam: ____________________  
Datum: ____________________  
Handtekening: ____________________',
  true
);
```

---

## 6️⃣ SUPER ADMIN USER SETUP

**LET OP:** Eerst user aanmaken via Supabase Dashboard!

1. Ga naar **Authentication → Users → Add User**
2. Vul in:
   - Email: `admin@dirq.nl` (of jouw email)
   - Password: [kies sterk wachtwoord]
   - ✅ Email Confirmed: YES
3. Klik "Create User"
4. Voer dan deze SQL uit:

```sql
-- Vervang email met jouw admin email!
UPDATE profiles 
SET 
  role = 'super_admin',
  full_name = 'System Administrator',
  is_active = true,
  employee_number = 'ADMIN001'
WHERE email = 'admin@dirq.nl';
```

---

## 7️⃣ TEST USERS (OPTIONAL)

**Stap 1:** Maak eerst 3 users aan via Supabase Auth UI:
- `hr@dirq.nl` (password: test123, email confirmed: YES)
- `manager@dirq.nl` (password: test123, email confirmed: YES)
- `employee@dirq.nl` (password: test123, email confirmed: YES)

**Stap 2:** Voer deze SQL uit:

```sql
-- HR User
UPDATE profiles 
SET 
  role = 'hr',
  full_name = 'HR Manager',
  is_active = true,
  employee_number = 'HR001',
  department_id = (SELECT id FROM departments WHERE name = 'HR & Administratie' LIMIT 1)
WHERE email = 'hr@dirq.nl';

-- Manager User
UPDATE profiles 
SET 
  role = 'manager',
  full_name = 'Team Manager',
  is_active = true,
  employee_number = 'MGR001',
  department_id = (SELECT id FROM departments WHERE name = 'Management' LIMIT 1)
WHERE email = 'manager@dirq.nl';

-- Employee User (rapporteert aan Manager)
UPDATE profiles 
SET 
  role = 'employee',
  full_name = 'Test Employee',
  is_active = true,
  employee_number = 'EMP001',
  department_id = (SELECT id FROM departments WHERE name = 'Operationeel' LIMIT 1),
  manager_id = (SELECT id FROM profiles WHERE email = 'manager@dirq.nl' LIMIT 1)
WHERE email = 'employee@dirq.nl';
```

---

## ✅ VERIFICATIE QUERIES

Voer deze uit om te checken of alles goed is gegaan:

```sql
-- 1. Company settings (moet 1 row returnen)
SELECT company_name, kvk_number, employer_social_charges_percentage 
FROM company_settings;

-- 2. Afdelingen (moet 5+ rows returnen)
SELECT COUNT(*) as total_departments FROM departments;

-- 3. Users per rol
SELECT role, COUNT(*) as users, STRING_AGG(email, ', ') as emails
FROM profiles
WHERE is_active = true
GROUP BY role
ORDER BY role;

-- 4. Job levels (moet 6 rows returnen)
SELECT COUNT(*) as total_levels FROM job_levels WHERE is_active = true;

-- 5. Salary scales (moet 30 rows returnen = 6 levels × 5 departments)
SELECT COUNT(*) as total_scales FROM salary_scales;

-- 6. Allowances (moet 11 rows returnen - from migration)
SELECT COUNT(*) as total_allowances FROM allowance_types WHERE is_active = true;

-- 7. Benefits (moet 12 rows returnen - from migration)
SELECT COUNT(*) as total_benefits FROM benefits WHERE is_active = true;

-- 8. Labor rules (moet 7 rows returnen - from migration)
SELECT COUNT(*) as total_rules FROM labor_rules WHERE is_active = true;

-- 9. Offer letter templates (moet 1+ row returnen)
SELECT COUNT(*) as total_templates FROM offer_letter_templates;

-- 10. RLS enabled check (moet LEEG zijn!)
SELECT tablename 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN (
  'profiles', 'departments', 'employee_contracts', 
  'shifts', 'company_settings'
)
AND rowsecurity = false;
```

---

## 🎯 EXPECTED RESULTS

Na uitvoeren van alle scripts:

| Check | Expected Result |
|-------|----------------|
| Company Settings | 1 row |
| Departments | 5 rows |
| Job Levels | 6 rows |
| Salary Scales | 30 rows |
| Allowances | 11 rows |
| Benefits | 12 rows |
| Labor Rules | 7 rows |
| Offer Templates | 1 row |
| Super Admin | 1 user |
| Test Users | 3 users (optional) |
| RLS Check | 0 rows (all enabled) |

---

## 🚨 TROUBLESHOOTING

### Error: "duplicate key value violates unique constraint"
**Oplossing:** Data bestaat al. Skip deze insert of gebruik UPDATE.

### Error: "null value in column violates not-null constraint"
**Oplossing:** Vul alle required fields in (zie migration file voor constraints).

### Error: "permission denied for table"
**Oplossing:** RLS policies blokkeren insert. Gebruik service_role key in Supabase SQL Editor (niet anon key).

### Error: "relation does not exist"
**Oplossing:** Migrations zijn niet uitgevoerd. Run eerst `supabase db push`.

---

## 📞 HULP NODIG?

Check deze files:
- `DEPLOYMENT_GUIDE.md` - Volledige deployment instructies
- `DEPLOY_CHECKLIST.md` - Stap-voor-stap checklist
- Migraties: `supabase/migrations/20251218_*.sql`

SQL Editor: Supabase Dashboard → SQL Editor → New Query → Plak script → Run
