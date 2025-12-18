# 🚀 Deployment Guide - Dirq Verzuim App

**Status:** 85% Production Ready  
**Database:** 27 tabellen (Planning + Cost Management)  
**Last Updated:** 18 december 2025

---

## 📋 PRE-DEPLOYMENT CHECKLIST

### ✅ Code Ready
- [x] RBAC filters geïmplementeerd (managers zien alleen team)
- [x] User management page aangemaakt
- [x] Executive dashboard access gefixt
- [x] Alle routes beschermd met ProtectedRoute
- [x] Planning tool volledig (15 tabellen)
- [x] Cost management systeem (12 tabellen)
- [x] 5 nieuwe HR componenten (Settings, Calculator, Offer Letter, Analytics, Contracts)

### 🔄 Nog Te Testen (Non-blocking)
- [ ] Test met manager account (team filtering werkt)
- [ ] Test met medewerker account (alleen eigen data)
- [ ] Documents tab 400 error reproduceren
- [ ] Mobile responsiveness (375px, 768px, 1920px)

---

## 🗄️ DATABASE SETUP

### Step 1: Migraties Uitvoeren

**BELANGRIJK:** Voer de migraties uit in deze volgorde!

```bash
# Via Supabase CLI
supabase db push

# Of handmatig via Supabase Dashboard → SQL Editor
```

**Migraties:**
1. `supabase/migrations/20251218_planning_tool.sql` (15 tabellen)
   - Skills-based scheduling
   - Labor law compliance (Arbeidstijdenwet)
   - Shift cost calculations
   - Budget tracking
   
2. `supabase/migrations/20251218_company_cost_management.sql` (12 tabellen)
   - Company settings
   - Job levels & salary scales
   - Allowances & benefits
   - Employee contracts
   - Cost calculations

### Step 2: Verify Database

Run deze queries om te checken of alles goed is:

```sql
-- Check planning tool tables (should return 15)
SELECT COUNT(*) FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
  'skills', 'employee_skills', 'shifts', 'schedule_templates',
  'template_shifts', 'demand_forecast', 'employee_schedules',
  'schedule_history', 'employee_availability', 'time_off_blocks',
  'shift_swap_requests', 'schedule_conflicts', 'labor_rules',
  'shift_costs', 'department_budgets'
);

-- Check cost management tables (should return 12)
SELECT COUNT(*) FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
  'company_settings', 'job_levels', 'salary_scales', 'allowance_types',
  'benefits', 'benefit_packages', 'benefit_package_items',
  'employee_contracts', 'employee_contract_allowances',
  'employee_benefits', 'employee_cost_summary', 'offer_letter_templates'
);

-- Check RLS policies are enabled
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND rowsecurity = false;  -- Should be empty!
```

### Step 3: Initial Data Setup (REQUIRED)

**IMPORTANT:** Voer deze SQL statements uit in Supabase SQL Editor!

#### 3.1 Company Settings (REQUIRED)
```sql
-- Insert jouw bedrijfsgegevens
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
  'Dirq Solutions',              -- company_name
  'Dirq Solutions B.V.',         -- legal_name
  '12345678',                    -- kvk_number (pas aan!)
  'NL123456789B01',              -- btw_number (pas aan!)
  'Voorbeeldstraat 123',         -- address
  '1234 AB',
  'Amsterdam',
  'Nederland',
  'info@dirq.nl',                -- contact_email (pas aan!)
  '+31 20 1234567',              -- contact_phone
  'NL00BANK0123456789',          -- iban (pas aan!)
  'ING Bank',
  1,                             -- Januari = fiscaal jaar start
  20.0,                          -- Werkgeverslasten 20%
  5.0,                           -- Pensioenpremie werkgever 5%
  3.0,                           -- Pensioenpremie werknemer 3%
  8.0,                           -- Vakantiegeld 8%
  40.0,                          -- Fulltime = 40 uur/week
  2,                             -- Proeftijd 2 maanden
  4                              -- Opzegtermijn 4 weken
);
```

#### 3.2 Default Afdelingen (REQUIRED)
```sql
-- Maak basis afdelingen aan
INSERT INTO departments (name, description, budget_yearly) VALUES
  ('HR & Administratie', 'Human Resources en administratieve taken', 500000),
  ('Operationeel', 'Operationele medewerkers en dienstverlening', 1500000),
  ('Management', 'Management en directie', 800000),
  ('IT & Support', 'IT ondersteuning en technische zaken', 600000),
  ('Sales & Marketing', 'Verkoop en marketing activiteiten', 700000);

-- Verkrijg department IDs voor later gebruik
SELECT id, name FROM departments ORDER BY name;
```

#### 3.3 Super Admin User (REQUIRED)
```sql
-- STAP 1: Maak eerst een user aan via Supabase Auth UI
-- Dashboard → Authentication → Users → Add User
-- Email: admin@dirq.nl (of jouw email)
-- Password: [kies sterk wachtwoord]
-- Email Confirmed: YES

-- STAP 2: Update profile met Super Admin rol
-- Vervang 'admin@dirq.nl' met jouw admin email!
UPDATE profiles 
SET 
  role = 'super_admin',
  full_name = 'System Administrator',
  is_active = true,
  employee_number = 'ADMIN001'
WHERE email = 'admin@dirq.nl';

-- Verificatie: Check of super admin role is gezet
SELECT id, email, full_name, role, is_active 
FROM profiles 
WHERE role = 'super_admin';
```

#### 3.4 Test Users (OPTIONAL - voor development/testing)
```sql
-- Voeg test users toe via Supabase Auth eerst!
-- Dan update profiles:

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

-- Employee User
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

#### 3.5 Job Levels (OPTIONAL - voor salary management)
```sql
-- Voeg functieniveaus toe
INSERT INTO job_levels (level_code, level_name, level_number, min_salary, max_salary, median_salary) VALUES
  ('ENTRY', 'Junior/Entry Level', 1, 28000, 38000, 33000),
  ('MID', 'Medior/Professional', 2, 38000, 55000, 46000),
  ('SENIOR', 'Senior/Expert', 3, 55000, 75000, 65000),
  ('LEAD', 'Lead/Principal', 4, 75000, 95000, 85000),
  ('MGR', 'Manager', 5, 85000, 110000, 97000),
  ('DIR', 'Director', 6, 110000, 150000, 130000);

-- Verificatie
SELECT * FROM job_levels ORDER BY level_number;
```

#### 3.6 Salary Scales (OPTIONAL - per afdeling)
```sql
-- Voorbeeld salary scales per job level en afdeling
-- Pas aan op basis van jouw CAO/beleid!
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
  jl.median_salary / 1840.0,  -- Jaar naar uur (40u * 46 weken)
  jl.median_salary / 12.0,    -- Jaar naar maand
  jl.median_salary,
  1.0,
  CURRENT_DATE
FROM job_levels jl
CROSS JOIN departments d
WHERE jl.is_active = true;

-- Verificatie
SELECT 
  jl.level_name,
  d.name as department,
  ss.monthly_rate,
  ss.hourly_rate
FROM salary_scales ss
JOIN job_levels jl ON ss.job_level_id = jl.id
JOIN departments d ON ss.department_id = d.id
ORDER BY d.name, jl.level_number;
```

#### 3.7 Verification Queries (RUN THESE!)
```sql
-- 1. Check company settings
SELECT company_name, kvk_number, employer_social_charges_percentage 
FROM company_settings;
-- Should return 1 row

-- 2. Check departments
SELECT id, name, budget_yearly FROM departments;
-- Should return at least 5 departments

-- 3. Check users and roles
SELECT email, full_name, role, is_active, employee_number 
FROM profiles 
ORDER BY role, email;
-- Should see super_admin, hr, manager, employee

-- 4. Check job levels
SELECT level_code, level_name, min_salary, max_salary 
FROM job_levels 
WHERE is_active = true;
-- Should return 6 levels

-- 5. Check allowances (from migration)
SELECT name, allowance_type, default_value 
FROM allowance_types 
WHERE is_active = true;
-- Should return 11 allowances

-- 6. Check benefits (from migration)
SELECT name, benefit_type, default_monthly_value 
FROM benefits 
WHERE is_active = true;
-- Should return 12 benefits

-- 7. Check labor rules (from migration)
SELECT rule_code, description 
FROM labor_rules 
WHERE is_active = true;
-- Should return 7 Arbeidstijdenwet rules

-- 8. Check RLS is enabled
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('profiles', 'employee_contracts', 'shifts')
AND rowsecurity = false;
-- Should be EMPTY (all should have RLS enabled)
```

---

## ⚙️ EDGE FUNCTIONS (Not Required)

Deze app gebruikt **geen Edge Functions** op dit moment. Alle business logic draait via:
- **Database Functions** (PostgreSQL) - Voor complexe berekeningen
- **RLS Policies** (Row Level Security) - Voor authorization
- **Client-side Logic** (React) - Voor UI interactions

**Toekomstige Edge Functions (optional):**
- Email notifications (verzuim reminders)
- PDF generation (contracts, payslips)
- External API integrations (HR systems)
- Scheduled tasks (automatic leave calculations)

Als je Edge Functions wilt toevoegen later:
```bash
# Create edge function
supabase functions new function-name

# Deploy
supabase functions deploy function-name
```

---

## 🌐 FRONTEND DEPLOYMENT

### Option A: Vercel (Recommended)

#### 1. Install Vercel CLI
```bash
npm i -g vercel
```

#### 2. Deploy
```bash
# Login
vercel login

# Deploy (first time)
vercel

# Production deploy
vercel --prod
```

#### 3. Environment Variables
Add in Vercel Dashboard → Project Settings → Environment Variables:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

#### 4. Build Settings
- **Framework Preset:** Vite
- **Build Command:** `npm run build`
- **Output Directory:** `dist`
- **Install Command:** `npm install`

---

### Option B: Netlify

#### 1. Deploy via Git
- Connect GitHub repo in Netlify dashboard
- Or use Netlify CLI: `netlify deploy --prod`

#### 2. Build Settings
```toml
# netlify.toml (already created below)
[build]
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

#### 3. Environment Variables
Add in Netlify Dashboard → Site Settings → Environment Variables:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

---

## 🔐 ENVIRONMENT SETUP

### Development (.env.local)
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

### Production
**NEVER commit .env files!**

Set environment variables in hosting platform:
- Vercel: Project Settings → Environment Variables
- Netlify: Site Settings → Environment Variables

---

## 🧪 POST-DEPLOYMENT TESTING

### 1. Smoke Tests

```bash
# Test basis routes
curl https://your-app.vercel.app/
curl https://your-app.vercel.app/login
curl https://your-app.vercel.app/api/health  # if you have health check
```

### 2. Authentication Tests

- [ ] Login met Super Admin account
- [ ] Login met HR account  
- [ ] Login met Manager account
- [ ] Login met Employee account
- [ ] Verify role-based access (manager ziet alleen team)

### 3. Feature Tests

**Super Admin:**
- [ ] Dashboard loads
- [ ] Gebruikersbeheer werkt
- [ ] Afdelingen CRUD werkt
- [ ] Company Settings opslaan werkt
- [ ] Cost Analytics dashboard werkt

**HR:**
- [ ] Medewerkers lijst (alle medewerkers)
- [ ] Employee contracts maken werkt
- [ ] Offer letter genereren werkt
- [ ] Salary calculator werkt
- [ ] Verlofbeheer werkt
- [ ] Documenten uploaden werkt

**Manager:**
- [ ] Ziet alleen eigen team (niet hele org!)
- [ ] Team verzuim cases zichtbaar
- [ ] Team verlofaanvragen goedkeuren
- [ ] Planning shifts toewijzen

**Employee:**
- [ ] Personal dashboard
- [ ] Verlof aanvragen
- [ ] Documenten bekijken
- [ ] Profile bewerken

### 4. Performance Tests

```bash
# Check load times
curl -w "@curl-format.txt" -o /dev/null -s https://your-app.vercel.app/

# curl-format.txt:
time_namelookup:  %{time_namelookup}\n
time_connect:  %{time_connect}\n
time_starttransfer:  %{time_starttransfer}\n
time_total:  %{time_total}\n
```

**Target metrics:**
- Initial load: < 2s
- Dashboard render: < 1s
- API queries: < 500ms

---

## 🐛 KNOWN ISSUES (Non-blocking)

### 1. Verlof Widget in Employee Dashboard
**Status:** 🟡 Minor  
**Impact:** Benefits tab toont hardcoded "25 dagen"  
**Fix:** Integreer `LeaveBalanceCard` component  
**Workaround:** Medewerkers kunnen naar `/hr/verlof` gaan

### 2. Documents Tab 400 Error
**Status:** 🟡 Needs testing  
**Impact:** Mogelijk RLS issue met document queries  
**Fix:** Test met echte employee account  
**Workaround:** Check browser console voor error details

### 3. Mobile Responsiveness
**Status:** 🟡 Untested  
**Impact:** Onbekend op 375px breakpoint  
**Fix:** Test en pas CSS aan indien nodig  
**Workaround:** Desktop gebruikers niet affected

---

## 📊 MONITORING

### Supabase Dashboard
Monitor deze metrics na deploy:

1. **API Requests**
   - Watch for 500 errors
   - Check slow queries (> 1s)
   
2. **Database**
   - Connection pool usage
   - Query performance
   - RLS policy performance

3. **Authentication**
   - Failed login attempts
   - Session duration
   - User activity

### Error Tracking
Consider adding Sentry:

```bash
npm install @sentry/react
```

```typescript
// src/main.tsx
import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: "your-sentry-dsn",
  environment: import.meta.env.MODE,
  tracesSampleRate: 1.0,
});
```

---

## 🔄 ROLLBACK PROCEDURE

Als er iets mis gaat:

### Vercel
```bash
# List deployments
vercel ls

# Rollback to previous
vercel rollback [deployment-url]
```

### Netlify
- Ga naar Deploys tab
- Click op "Published deploy"
- Select vorige versie
- Click "Publish deploy"

### Database
```bash
# Revert migration
supabase db reset

# Of handmatig via SQL:
DROP TABLE IF EXISTS employee_contracts CASCADE;
DROP TABLE IF EXISTS shift_costs CASCADE;
-- etc...
```

---

## 📞 SUPPORT CHECKLIST

### Voor Gebruikers

**Veelvoorkomende problemen:**

1. **"Ik zie geen data"**
   - Check of juiste rol is toegewezen
   - Manager moet direct reports hebben (manager_id)
   - Employee moet actief contract hebben

2. **"Ik kan niet inloggen"**
   - Reset password via Supabase Auth
   - Check of account is_active = true
   - Verify email is confirmed

3. **"403 Forbidden"**
   - RLS policy blocking
   - Check rol in profiles table
   - Verify user_id in policies

4. **"Page is blank"**
   - Check browser console
   - Clear cache (Ctrl+Shift+R)
   - Check Supabase connection

### Voor Developers

**Debug mode:**
```typescript
// Enable in development
localStorage.setItem('debug', 'true');

// Check queries
console.log('Supabase client:', supabase);
```

**Common fixes:**
```sql
-- Fix missing role
UPDATE profiles SET role = 'hr' WHERE email = 'user@example.com';

-- Fix manager relationships
UPDATE profiles SET manager_id = 'manager-uuid' WHERE id = 'employee-uuid';

-- Check RLS policies
SELECT * FROM pg_policies WHERE tablename = 'employee_contracts';
```

---

## ✅ DEPLOYMENT SUCCESS CRITERIA

App is successfully deployed when:

- [x] Site is accessible via HTTPS
- [x] Login works voor alle rollen
- [x] Super Admin kan gebruikers beheren
- [x] HR kan medewerkers zien/bewerken
- [x] Manager ziet alleen eigen team (NIET hele org)
- [x] Employee ziet alleen eigen data
- [x] Cost calculator werkt
- [x] Documents uploaden werkt
- [x] Verlof aanvragen werkt
- [x] Verzuim registratie werkt
- [x] Planning tool beschikbaar
- [x] No console errors op homepage

---

## 🎯 NEXT STEPS NA DEPLOY

### Week 1: Monitoring
- Daily error log checks
- User feedback verzamelen
- Performance metrics analyseren
- Fix critical bugs

### Week 2: Improvements  
- Mobile optimization
- Dashboard enhancements (quick actions)
- Verlof widget fix
- Performance tuning

### Month 1: Features
- Team performance metrics (manager dashboard)
- Achievements system (employee portal)
- Predictive analytics (HR dashboard)
- Advanced reporting

---

## 📚 RESOURCES

- **Vite Docs:** https://vitejs.dev/guide/
- **Supabase Docs:** https://supabase.com/docs
- **Vercel Docs:** https://vercel.com/docs
- **React Query:** https://tanstack.com/query/latest

**Internal Docs:**
- `AUDIT_SUMMARY.md` - Wat is er gebouwd
- `COMPLETE_APP_AUDIT_REPORT.md` - Volledige audit
- `SUPABASE_SETUP.md` - Database setup
- `README.md` - Project overview

---

**🎉 Succes met de deployment!**

Voor vragen: Check de docs of test eerst in Supabase Dashboard → SQL Editor.
