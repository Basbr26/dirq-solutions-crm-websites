# 🚀 PROJECT VELOCITY PHASE 1 - MIGRATION GUIDE

**Version:** 1.2.0  
**Migration Date:** 9 Januari 2026  
**Impact:** Database schema changes (non-breaking)

---

## 📋 WHAT'S NEW

### Enterprise Database Architecture
- **External Data Integration** - KVK API, Apollo.io, Manus AI ready
- **MRR Tracking System** - Auto-aggregation van company revenue
- **Type-Safe Pricing** - €240K ARR foundation met validation
- **Intake Tracker** - JSONB onboarding checklist
- **Data Integrity** - Foreign Keys + CHECK constraints
- **Performance Indexes** - 5 nieuwe indexes voor n8n automation

---

## ⚡ MIGRATION STEPS

### 1. RUN UP MIGRATION (Required)

Open **Supabase Dashboard** → **SQL Editor**

**File:** `supabase/migrations/20260109_velocity_phase1_up.sql`

```sql
-- Copy entire file and execute in SQL Editor
-- Migration adds 13 columns, 5 indexes, 1 trigger, 1 function
-- Expected execution time: ~2 seconds
```

**Wat gebeurt er:**
- ✅ Adds columns to `companies` (linkedin_url, kvk_number, source, ai_audit_summary, tech_stack, video_audit_url, total_mrr)
- ✅ Adds columns to `projects` (package_id, selected_addons, calculated_total, monthly_recurring_revenue, intake_status, dns_status, hosting_provider)
- ✅ Creates MRR aggregation trigger (auto-updates company.total_mrr)
- ✅ Creates performance indexes for KVK/Apollo/Manus lookups
- ✅ Adds CHECK constraints for data validation

**Verification Query:**
```sql
-- Run after migration to verify
SELECT 
  c.name,
  c.kvk_number,
  c.source,
  c.total_mrr,
  COUNT(p.id) AS project_count,
  SUM(p.monthly_recurring_revenue) AS calculated_mrr
FROM companies c
LEFT JOIN projects p ON p.company_id = c.id
GROUP BY c.id, c.name, c.kvk_number, c.source, c.total_mrr
LIMIT 5;
```

---

### 2. UPDATE TYPES (Optional but recommended)

Als je Supabase CLI hebt geïnstalleerd:

```bash
npx supabase gen types typescript --project-id YOUR_PROJECT_ID > src/types/database.ts
```

Dit update TypeScript types voor de nieuwe kolommen.

---

### 3. TEST NEW FEATURES

#### A. MRR Aggregation Test
```sql
-- Insert test project with MRR
INSERT INTO projects (title, company_id, stage, monthly_recurring_revenue)
VALUES ('Test Website', 'YOUR_COMPANY_ID', 'lead', 50.00);

-- Check company.total_mrr (should auto-update to 50.00)
SELECT naam, total_mrr FROM companies WHERE id = 'YOUR_COMPANY_ID';
```

#### B. KVK Number Validation
```sql
-- Should succeed
UPDATE companies SET kvk_number = '12345678' WHERE id = 'YOUR_COMPANY_ID';

-- Should fail (duplicate)
UPDATE companies SET kvk_number = '12345678' WHERE id = 'ANOTHER_COMPANY_ID';
```

#### C. Package ID Validation
```sql
-- Should succeed
UPDATE projects SET package_id = 'finance_starter' WHERE id = 'YOUR_PROJECT_ID';

-- Should fail (invalid package)
UPDATE projects SET package_id = 'invalid_package' WHERE id = 'YOUR_PROJECT_ID';
```

---

### 4. USE NEW PRICING CONFIG

**In je code:**

```typescript
import { 
  FINANCE_PACKAGES, 
  calculateProjectTotal,
  type PackageId 
} from '@/config/pricing';

// Calculate quote
const quote = calculateProjectTotal('GROWTH', ['LOGO', 'RUSH'], 75);
// Returns: { oneTime: 1949.95, monthly: 75, packageId: 'finance_growth', addonIds: [...] }

// Insert into database
await supabase.from('projects').insert({
  title: 'Client Website',
  company_id: companyId,
  package_id: quote.packageId,           // Validates against CHECK constraint
  selected_addons: quote.addonIds,
  calculated_total: quote.oneTime,
  monthly_recurring_revenue: quote.monthly
});
```

---

## 🔄 ROLLBACK (If needed)

Als je de migratie ongedaan wilt maken:

**File:** `supabase/migrations/20260109_velocity_phase1_down.sql`

```sql
-- Copy entire file and execute in SQL Editor
-- Removes all Phase 1 changes in reverse order
```

**Let op:** Rollback verwijdert alle data in de nieuwe kolommen!

---

## 📊 NIEUWE DATABASE SCHEMA

### Companies Table (7 nieuwe kolommen)
| Column | Type | Description |
|--------|------|-------------|
| `linkedin_url` | TEXT | LinkedIn company URL voor Apollo enrichment |
| `kvk_number` | TEXT (UNIQUE) | KVK nummer voor API lookups |
| `source` | TEXT | Data source (Manual, Apollo, KVK, Website, Manus, n8n_automation) |
| `ai_audit_summary` | TEXT | AI-generated business audit van Manus/Gemini |
| `tech_stack` | TEXT[] | Detected technology stack (array) |
| `video_audit_url` | TEXT | URL naar Manus AI video audit |
| `total_mrr` | DECIMAL(10,2) | **Auto-calculated** totale MRR van alle projects |

### Projects Table (7 nieuwe kolommen)
| Column | Type | Description |
|--------|------|-------------|
| `package_id` | TEXT | Package type: `finance_starter` of `finance_growth` |
| `selected_addons` | TEXT[] | Array of addon IDs: `addon_logo`, `addon_rush`, `addon_page` |
| `calculated_total` | DECIMAL(10,2) | Totale one-time projectkosten |
| `monthly_recurring_revenue` | DECIMAL(10,2) | Maandelijkse terugkerende fee |
| `intake_status` | JSONB | Onboarding checklist (logo, colors, texts, nba_check) |
| `dns_status` | TEXT | DNS status: pending, active, failed, propagated |
| `hosting_provider` | TEXT | Hosting provider naam |

### Nieuwe Constraints
- ✅ `chk_company_source` - Validates source values
- ✅ `chk_dns_status` - Validates DNS status values
- ✅ `fk_project_company` - Foreign Key naar companies (CASCADE DELETE)
- ✅ UNIQUE constraint op `companies.kvk_number`
- ✅ CHECK constraint op `projects.package_id`

### Nieuwe Indexes
- ✅ `idx_companies_kvk` - Fast KVK lookups
- ✅ `idx_companies_linkedin` - Apollo enrichment queries
- ✅ `idx_companies_source` - Source filtering
- ✅ `idx_projects_package` - Package analytics
- ✅ `idx_projects_intake_logo` - Onboarding status queries

### Nieuwe Trigger
```sql
CREATE TRIGGER trigger_update_company_mrr
AFTER INSERT OR UPDATE OF monthly_recurring_revenue OR DELETE ON projects
FOR EACH ROW
EXECUTE FUNCTION update_company_mrr();
```

**Gedrag:**
- Bij project INSERT → Update company.total_mrr
- Bij project UPDATE (MRR change) → Update company.total_mrr
- Bij project DELETE → Update company.total_mrr
- **Automatisch** - Geen handmatige aggregatie nodig!

---

## 🎯 USE CASES

### 1. KVK API Integration (n8n)
```typescript
// n8n workflow: KVK lookup → Update CRM
await supabase.from('companies').update({
  kvk_number: '12345678',
  source: 'KVK',
  linkedin_url: kvkData.linkedin,
  tech_stack: ['WordPress', 'WooCommerce']
}).eq('id', companyId);
```

### 2. Apollo.io Enrichment
```typescript
// Apollo data → CRM
await supabase.from('companies').update({
  linkedin_url: apolloData.linkedin_url,
  source: 'Apollo',
  tech_stack: apolloData.technologies
}).eq('linkedin_url', linkedinUrl);
```

### 3. Manus AI Audit
```typescript
// Store AI audit results
await supabase.from('companies').update({
  ai_audit_summary: manusOutput.summary,
  video_audit_url: manusOutput.video_url,
  source: 'Manus'
}).eq('id', companyId);
```

### 4. Create Project with Pricing
```typescript
import { calculateProjectTotal } from '@/config/pricing';

const quote = calculateProjectTotal('GROWTH', ['LOGO'], 75);

await supabase.from('projects').insert({
  title: 'Finance Website + Logo',
  company_id: companyId,
  stage: 'quote',
  package_id: quote.packageId,          // 'finance_growth'
  selected_addons: quote.addonIds,      // ['addon_logo']
  calculated_total: quote.oneTime,      // 1649.95
  monthly_recurring_revenue: quote.monthly, // 75.00
  intake_status: {
    logo_received: false,
    colors_approved: false,
    texts_received: false,
    nba_check_complete: false
  }
});

// company.total_mrr automatically updates to 75.00!
```

### 5. Query Companies by Source
```typescript
// Find all companies from specific source
const { data } = await supabase
  .from('companies')
  .select('name, kvk_number, source, total_mrr')
  .eq('source', 'Apollo');
```

### 6. Track Onboarding Progress
```typescript
// Update intake checklist
await supabase.from('projects')
  .update({
    intake_status: {
      logo_received: true,
      colors_approved: true,
      texts_received: false,
      nba_check_complete: false
    }
  })
  .eq('id', projectId);

// Query projects missing logo
const { data } = await supabase
  .from('projects')
  .select('*')
  .eq('intake_status->logo_received', false);
```

---

## 📈 BUSINESS METRICS

### Total MRR Dashboard Query
```sql
SELECT 
  SUM(total_mrr) AS total_company_mrr,
  COUNT(CASE WHEN total_mrr > 0 THEN 1 END) AS paying_customers,
  AVG(total_mrr) AS avg_mrr_per_customer
FROM companies
WHERE status = 'customer';
```

### ARR Calculation
```sql
SELECT 
  SUM(total_mrr * 12) AS annual_recurring_revenue,
  (SUM(total_mrr * 12) / 240000.0 * 100)::NUMERIC(5,2) AS progress_to_240k_goal
FROM companies
WHERE status = 'customer';
```

### Package Distribution
```sql
SELECT 
  package_id,
  COUNT(*) AS project_count,
  SUM(calculated_total) AS total_revenue,
  AVG(monthly_recurring_revenue) AS avg_mrr
FROM projects
WHERE package_id IS NOT NULL
GROUP BY package_id;
```

---

## ✅ POST-MIGRATION CHECKLIST

- [ ] Run UP migration in Supabase SQL Editor
- [ ] Verify with test queries (companies, projects)
- [ ] Update TypeScript types (optional)
- [ ] Test MRR trigger (create/update/delete project)
- [ ] Test package_id validation (try invalid package)
- [ ] Test KVK unique constraint (duplicate kvk_number)
- [ ] Import pricing.ts in relevant components
- [ ] Update Quote/Project creation forms to use new fields
- [ ] Update dashboards to show MRR metrics
- [ ] Test n8n webhook integration (if applicable)

---

## 🚨 TROUBLESHOOTING

### Error: "duplicate key value violates unique constraint"
**Cause:** Trying to set duplicate `kvk_number`  
**Fix:** KVK numbers must be unique. Check existing values:
```sql
SELECT name, kvk_number FROM companies WHERE kvk_number IS NOT NULL;
```

### Error: "new row violates check constraint"
**Cause:** Invalid value for `source`, `dns_status`, or `package_id`  
**Fix:** Use only allowed values:
- `source`: Manual, Apollo, KVK, Website, Manus, n8n_automation
- `dns_status`: pending, active, failed, propagated
- `package_id`: finance_starter, finance_growth

### MRR not updating automatically
**Check:** Trigger exists:
```sql
SELECT * FROM pg_trigger WHERE tgname = 'trigger_update_company_mrr';
```
**Fix:** Re-run trigger creation from UP migration

---

## 📞 SUPPORT

**Issues?** Open GitHub issue met:
- Migration error message
- Database version (PostgreSQL 15.x)
- Steps to reproduce

**Success?** Update [STATUS.md](STATUS.md) met ✅ checkmarks!

---

**🎉 Ready for €240K ARR!**
