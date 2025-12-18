# ✅ Deployment Checklist - Dirq Verzuim App

**Project:** Dirq Solutions Verzuim Management  
**Deployment Date:** __________  
**Deployed By:** __________  
**Environment:** Production

---

## 📋 PRE-DEPLOYMENT

### Database
- [ ] Alle migraties lokaal getest
- [ ] `20251218_planning_tool.sql` uitgevoerd (15 tabellen)
- [ ] `20251218_company_cost_management.sql` uitgevoerd (12 tabellen)
- [ ] RLS policies enabled voor alle tabellen
- [ ] Database backup gemaakt
- [ ] Seed data gecontroleerd (company_settings, labor_rules, allowances, benefits)

### Code
- [ ] `npm run build` succesvol
- [ ] Geen TypeScript errors (`npm run type-check`)
- [ ] Geen ESLint errors
- [ ] Alle routes protected met ProtectedRoute
- [ ] Environment variabelen correct geconfigureerd

### Configuration
- [ ] `.env.example` up-to-date
- [ ] `netlify.toml` of `vercel.json` aanwezig
- [ ] Security headers geconfigureerd
- [ ] Redirects voor SPA routing ingesteld

---

## 🗄️ DATABASE DEPLOYMENT

### Supabase Setup
- [ ] Project aangemaakt op supabase.com
- [ ] Database password veilig opgeslagen
- [ ] API URL en anon key gekopieerd
- [ ] Email templates geconfigureerd (Auth → Email Templates)
- [ ] SMTP ingesteld (of gebruik Supabase email)

### Schema Deployment
```bash
# Via Supabase CLI
supabase link --project-ref your-project-ref
supabase db push

# Of handmatig via SQL Editor
```

- [ ] Migratie 1: Planning Tool (15 tabellen)
- [ ] Migratie 2: Cost Management (12 tabellen)

### Verification Queries
```sql
-- Should return 27
SELECT COUNT(*) FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
  'skills', 'employee_skills', 'shifts', 'schedule_templates',
  'template_shifts', 'demand_forecast', 'employee_schedules',
  'schedule_history', 'employee_availability', 'time_off_blocks',
  'shift_swap_requests', 'schedule_conflicts', 'labor_rules',
  'shift_costs', 'department_budgets',
  'company_settings', 'job_levels', 'salary_scales', 'allowance_types',
  'benefits', 'benefit_packages', 'benefit_package_items',
  'employee_contracts', 'employee_contract_allowances',
  'employee_benefits', 'employee_cost_summary', 'offer_letter_templates'
);

-- Should be empty (all tables should have RLS enabled)
SELECT tablename FROM pg_tables 
WHERE schemaname = 'public' AND rowsecurity = false;
```

- [ ] Query 1: 27 tabellen gevonden
- [ ] Query 2: Geen tabellen zonder RLS
- [ ] Alle functions aanwezig (check met `\df` in psql)
- [ ] Alle views aanwezig (`v_employee_total_compensation`, etc.)

---

## 🌐 FRONTEND DEPLOYMENT

### Vercel (Option A)
```bash
# Install CLI
npm i -g vercel

# Deploy
vercel login
vercel --prod
```

- [ ] Vercel project aangemaakt
- [ ] Git repository gekoppeld
- [ ] Auto-deploy ingesteld (main branch)
- [ ] Environment variables toegevoegd:
  - [ ] `VITE_SUPABASE_URL`
  - [ ] `VITE_SUPABASE_ANON_KEY`
- [ ] Custom domain gekoppeld (optional)
- [ ] SSL certificate actief

### Netlify (Option B)
```bash
# Install CLI
npm i -g netlify-cli

# Deploy
netlify login
netlify deploy --prod
```

- [ ] Netlify site aangemaakt
- [ ] Git repository gekoppeld
- [ ] Build settings geconfigureerd:
  - Build command: `npm run build`
  - Publish directory: `dist`
  - Node version: 20
- [ ] Environment variables toegevoegd:
  - [ ] `VITE_SUPABASE_URL`
  - [ ] `VITE_SUPABASE_ANON_KEY`
- [ ] Custom domain gekoppeld (optional)
- [ ] SSL certificate actief

---

## 👥 USER SETUP

### Super Admin Account
- [ ] Super admin user aangemaakt in Supabase Auth
- [ ] Email verified
- [ ] Profile record aangemaakt met `role = 'super_admin'`
- [ ] Test login werkt

### Test Accounts (Optional)
- [ ] HR account aangemaakt (`role = 'hr'`)
- [ ] Manager account aangemaakt (`role = 'manager'`)
- [ ] Employee account aangemaakt (`role = 'employee'`)
- [ ] Manager heeft manager_id relatie met employee

---

## 🧪 POST-DEPLOYMENT TESTING

### Smoke Tests
- [ ] Homepage loads (/)
- [ ] Login page loads (/login)
- [ ] Can login as super admin
- [ ] Dashboard loads after login
- [ ] No console errors on any page

### Role-Based Access Tests

**Super Admin:**
- [ ] Dashboard toegankelijk
- [ ] Gebruikersbeheer werkt (/settings/gebruikers)
- [ ] Kan rollen toewijzen
- [ ] Company settings opslaan werkt (/settings/company)
- [ ] Cost analytics dashboard (/analytics/costs)
- [ ] Afdelingen CRUD (/admin/afdelingen)

**HR:**
- [ ] HR dashboard toegankelijk
- [ ] Ziet alle medewerkers (/hr/medewerkers)
- [ ] Employee contracts maken werkt (/hr/contracts)
- [ ] Salary calculator werkt
- [ ] Offer letter genereren werkt
- [ ] Documenten uploaden werkt
- [ ] Verlofbeheer toegankelijk

**Manager:**
- [ ] Manager dashboard toegankelijk
- [ ] Ziet ALLEEN eigen team (niet hele org!)
- [ ] Team verzuim cases zichtbaar
- [ ] Verlofaanvragen goedkeuren werkt
- [ ] Kan geen HR functies zien

**Employee:**
- [ ] Employee dashboard toegankelijk
- [ ] Ziet ALLEEN eigen data
- [ ] Kan verlof aanvragen
- [ ] Kan documenten bekijken
- [ ] Kan profile bewerken
- [ ] Kan geen andere employees zien

### Feature Tests
- [ ] Medewerker aanmaken (HR)
- [ ] Contract aanmaken met salaris
- [ ] Offer letter genereren en downloaden
- [ ] Verzuim case aanmaken
- [ ] Verlof aanvragen en goedkeuren
- [ ] Document uploaden
- [ ] Planning shift aanmaken
- [ ] Shift cost berekening werkt (gebruikt contract rate)
- [ ] Company settings wijzigen
- [ ] Cost analytics tonen data

### Data Integrity
- [ ] Manager filters werken (alleen team data)
- [ ] Employee filters werken (alleen eigen data)
- [ ] RLS policies blokkeren unauthorized access
- [ ] Cascade deletes werken correct
- [ ] Timestamps worden correct gezet

---

## 📊 MONITORING SETUP

### Supabase Dashboard
- [ ] API metrics dashboard bekeken
- [ ] Database performance tabs gecheckt
- [ ] Alerts ingesteld voor:
  - [ ] Hoge CPU usage (> 80%)
  - [ ] Slow queries (> 2s)
  - [ ] Failed auth attempts (> 10/min)
  - [ ] Database connections (> 80% pool)

### Application Monitoring (Optional)
- [ ] Sentry ingesteld voor error tracking
- [ ] Google Analytics toegevoegd (optional)
- [ ] Uptime monitoring ingesteld (e.g., UptimeRobot)
- [ ] Log aggregation tool geconfigureerd

---

## 🔐 SECURITY CHECKS

### Authentication
- [ ] Password requirements enforced (min 8 chars)
- [ ] Email verification required
- [ ] Session timeout configured
- [ ] MFA available (optional but recommended)

### Authorization
- [ ] All RLS policies tested
- [ ] No public tables (except maybe help docs)
- [ ] API keys niet in client code
- [ ] Environment variables secure

### Headers & CORS
- [ ] Security headers toegevoegd (zie netlify.toml/vercel.json)
- [ ] CORS correct geconfigureerd in Supabase
- [ ] CSP headers overwogen

---

## 📱 RESPONSIVE TESTING

### Desktop
- [ ] 1920x1080 (full HD)
- [ ] 1366x768 (laptop)
- [ ] Chrome
- [ ] Firefox
- [ ] Safari

### Tablet
- [ ] 768px (iPad portrait)
- [ ] 1024px (iPad landscape)
- [ ] iOS Safari
- [ ] Chrome Android

### Mobile
- [ ] 375px (iPhone)
- [ ] 360px (Android)
- [ ] 414px (iPhone Plus)
- [ ] Test pull-to-refresh
- [ ] Test mobile nav

### Critical Mobile Pages
- [ ] Login
- [ ] Employee dashboard
- [ ] Manager mobile view
- [ ] Verlof aanvragen
- [ ] Documents bekijken

---

## 📝 DOCUMENTATION

### User Documentation
- [ ] Login instructies
- [ ] Rol overzicht (wat kan wie)
- [ ] Feature guides (verlof, verzuim, planning)
- [ ] FAQ document
- [ ] Contact info voor support

### Technical Documentation
- [ ] DEPLOYMENT_GUIDE.md up-to-date
- [ ] README.md up-to-date
- [ ] API endpoints gedocumenteerd
- [ ] Database schema diagram (optional)
- [ ] Troubleshooting guide

---

## 🚨 ROLLBACK PLAN

### Vercel
```bash
vercel ls
vercel rollback [previous-deployment-url]
```

### Netlify
- Deploys → Published deploy → Select previous → Publish

### Database
- [ ] Backup gemaakt voor deployment
- [ ] Rollback script getest
- [ ] Know how to restore from backup

---

## ✅ GO-LIVE CHECKLIST

### Final Checks
- [ ] All tests passed
- [ ] No critical bugs
- [ ] Performance acceptable (< 2s page load)
- [ ] All team members trained
- [ ] Support procedures documented
- [ ] Rollback plan ready
- [ ] Stakeholders notified

### Communication
- [ ] Users informed about go-live
- [ ] Training sessions scheduled (if needed)
- [ ] Support channel established (email/Slack)
- [ ] Known issues communicated

### Post-Launch Monitoring
- [ ] Monitor errors first 24 hours
- [ ] Check performance metrics
- [ ] Gather user feedback
- [ ] Fix critical issues immediately
- [ ] Plan hotfix deployment if needed

---

## 📞 SUPPORT CONTACTS

**Technical Issues:**
- Developer: __________
- Database: __________
- Hosting: Vercel/Netlify support

**Business Issues:**
- Product Owner: __________
- Super Admin: __________

**Emergency:**
- On-call developer: __________
- Escalation contact: __________

---

## 🎯 SUCCESS METRICS

Track these KPIs first week:

- [ ] Daily active users
- [ ] Login success rate (target: > 95%)
- [ ] Page load time (target: < 2s)
- [ ] Error rate (target: < 0.1%)
- [ ] User satisfaction (survey)

---

## 📅 POST-LAUNCH SCHEDULE

**Day 1-7:**
- Daily error monitoring
- User feedback collection
- Hotfix deployment if needed

**Week 2:**
- Performance optimization
- Mobile responsiveness fixes
- Minor bug fixes

**Month 1:**
- Feature enhancements based on feedback
- Dashboard improvements
- Additional features (predictive analytics, etc.)

---

**Deployment completed by:** __________  
**Date & Time:** __________  
**Deployment URL:** __________  
**Status:** ✅ Success / ❌ Rollback Required

**Notes:**
_______________________________
_______________________________
_______________________________
