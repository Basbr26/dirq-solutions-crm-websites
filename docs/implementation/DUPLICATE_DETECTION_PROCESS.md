# 🔍 Duplicate Detection Process - Bedrijf Aanmaken

> **Analyse van het proces bij aanmaken van een nieuw bedrijf**  
> **Focus:** Hoe duplicaten worden gedetecteerd en voorkomen  
> **Last Updated:** 27 Januari 2026

---

## 📋 Table of Contents

1. [Process Overview](#process-overview)
2. [Duplicate Checks](#duplicate-checks)
3. [Database Constraints](#database-constraints)
4. [Frontend Validation](#frontend-validation)
5. [Backend Validation](#backend-validation)
6. [User Experience](#user-experience)
7. [Edge Cases](#edge-cases)
8. [Aanbevelingen](#aanbevelingen)

---

## 🎯 Process Overview

### Complete Flow - Nieuw Bedrijf Aanmaken

```
User opent CompanyForm
        ↓
[Optioneel] Snel invullen via KVK
- KVK zoekpopup
- Data kopiëren & plakken
- Automatische parsing
        ↓
User vult formulier in
- Bedrijfsnaam (required)
- KVK nummer (optional)
- Andere velden
        ↓
User klikt "Aanmaken"
        ↓
═══════════════════════════════════
    DUPLICATE DETECTION START
═══════════════════════════════════
        ↓
[CHECK 1] Frontend - Bedrijfsnaam Check
        ↓
Query: SELECT id, name FROM companies 
       WHERE name = 'Bedrijfsnaam'
        ↓
Match found? → Error message + STOP
No match? → Continue
        ↓
[CHECK 2] Frontend - KVK Nummer Check
        ↓
Query: SELECT id, name FROM companies 
       WHERE kvk_number = '12345678'
        ↓
Match found? → Error message + STOP
No match? → Continue
        ↓
[CHECK 3] Backend Mutation - KVK Check
        ↓
useCreateCompany mutation
Query: SELECT id, name FROM companies 
       WHERE kvk_number = '12345678'
        ↓
Match found? → Throw error + STOP
No match? → Continue
        ↓
[CHECK 4] Database Insert
        ↓
INSERT INTO companies (...)
        ↓
Database constraint check (geen UNIQUE op name!)
        ↓
Success? → ✅ Company created
Error? → Error handling
```

---

## 🔍 Duplicate Checks

### Check 1: Bedrijfsnaam (Frontend)

**Locatie:** `src/features/companies/components/CompanyForm.tsx` - regel 237-247

```typescript
// Check if company name already exists
const { data: existingName } = await supabase
  .from('companies')
  .select('id, name')
  .eq('name', data.name)
  .maybeSingle();

if (existingName && existingName.id !== company?.id) {
  setKvkError(t('companies.companyExists', { name: data.name }));
  return;
}
```

**Type:** **Case-sensitive exact match**  
**Wanneer:** Bij submit van het formulier (voor mutation)  
**Actie bij match:**
- Toont rode Alert box met bericht
- Stopt submission
- Focus blijft op formulier

**❌ Probleem:**
- **Case-sensitive:** "Acme BV" ≠ "ACME BV" ≠ "acme bv"
- **Exact match only:** "Acme" ≠ "Acme BV"
- **Geen fuzzy matching:** "Dirq Solutions" ≠ "Dirq Solutions BV"

**User Experience:**
```
❌ Alert: Bedrijf bestaat al
"Een bedrijf met de naam "Acme BV" bestaat al"
```

---

### Check 2: KVK Nummer (Frontend)

**Locatie:** `src/features/companies/components/CompanyForm.tsx` - regel 250-260

```typescript
// Check KVK number if provided
if (data.kvk_number) {
  const { data: existingKVK } = await supabase
    .from('companies')
    .select('id, name')
    .eq('kvk_number', data.kvk_number)
    .maybeSingle();

  if (existingKVK && existingKVK.id !== company?.id) {
    setKvkError(t('companies.kvkInUse', { name: existingKVK.name }));
    return;
  }
}
```

**Type:** Exact match op KVK nummer  
**Wanneer:** Bij submit (alleen als KVK nummer ingevuld)  
**Actie bij match:**
- Toont rode Alert box met bedrijfsnaam
- Stopt submission
- Focus blijft op formulier

**✅ Goed:**
- KVK nummers zijn uniek in Nederland
- Toont welk bedrijf het KVK nummer al gebruikt
- Helpt gebruiker duplicaat te identificeren

**User Experience:**
```
❌ Alert: Bedrijf bestaat al
"Dit KVK nummer is al in gebruik bij bedrijf "Acme Corporation""
```

---

### Check 3: KVK Nummer (Backend Mutation)

**Locatie:** `src/features/companies/hooks/useCompanyMutations.ts` - regel 15-28

```typescript
// Check if KVK number already exists
if (data.kvk_number) {
  const { data: existing } = await supabase
    .from('companies')
    .select('id, name')
    .eq('kvk_number', data.kvk_number)
    .maybeSingle();

  if (existing) {
    throw new Error(`Dit KVK nummer is al in gebruik bij bedrijf "${existing.name}"`);
  }
}
```

**Type:** Safety net voor KVK duplicaten  
**Wanneer:** In useMutation, net voor INSERT  
**Actie bij match:**
- Throws Error
- React Query error handler vangt op
- Toast error (maar alleen als niet "KVK nummer is al in gebruik")

**Functie:**
- **Fallback** voor frontend check (race conditions)
- **Backup** als frontend check wordt omzeild
- **Consistency** check voor concurrent requests

---

### Check 4: Database Insert (Geen UNIQUE Constraint!)

**Locatie:** `supabase/migrations/20260103_crm_core_schema.sql` - regel 40-75

```sql
CREATE TABLE companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  -- ... andere velden ...
  kvk_number TEXT, -- Geen UNIQUE constraint!
  -- ...
);
```

**⚠️ KRITIEK PROBLEEM:**

**Database heeft GEEN UNIQUE constraints op:**
- `companies.name` - Bedrijfsnaam kan dupliceren!
- `companies.kvk_number` - KVK nummer kan dupliceren!

**Gevolg:**
```sql
-- Dit is mogelijk in de huidige database:
INSERT INTO companies (name, kvk_number) VALUES ('Acme BV', '12345678');
INSERT INTO companies (name, kvk_number) VALUES ('Acme BV', '12345678'); -- ✅ Succesvol!
```

**Risico's:**
1. **Frontend checks kunnen omzeild worden** (direct API call)
2. **Race conditions** bij concurrent aanmaken
3. **Data inconsistentie** - meerdere bedrijven met zelfde KVK
4. **API webhooks** kunnen duplicaten creëren

---

## 🗄️ Database Constraints

### Huidige Status

**Bestand:** `supabase/migrations/20260103_crm_core_schema.sql`

```sql
CREATE TABLE companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,                    -- ❌ Geen UNIQUE
  industry_id UUID REFERENCES industries(id),
  website TEXT,
  phone TEXT,
  email TEXT,
  
  -- ... address, company_size, etc ...
  
  -- GEEN CONSTRAINTS OP:
  kvk_number TEXT,                       -- ❌ Geen UNIQUE
  linkedin_url TEXT,
  
  owner_id UUID NOT NULL REFERENCES profiles(id),
  status TEXT NOT NULL DEFAULT 'prospect',
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes (voor performance, NIET voor uniqueness)
CREATE INDEX idx_companies_owner_id ON companies(owner_id);
CREATE INDEX idx_companies_industry_id ON companies(industry_id);
CREATE INDEX idx_companies_status ON companies(status);
CREATE INDEX idx_companies_name ON companies USING gin(to_tsvector('dutch', name));
```

**Wat ontbreekt:**
```sql
-- Deze constraints bestaan NIET:
ALTER TABLE companies ADD CONSTRAINT companies_kvk_number_key UNIQUE (kvk_number);
ALTER TABLE companies ADD CONSTRAINT companies_name_key UNIQUE (name);
```

---

## 🎨 Frontend Validation

### CompanyForm Schema (Zod)

**Locatie:** `src/features/companies/components/CompanyForm.tsx` - regel 42-60

```typescript
const companyFormSchema = z.object({
  name: z.string().min(2, 'Naam moet minimaal 2 karakters bevatten'),
  industry_id: z.string().optional(),
  website: z.string().url('Voer een geldige URL in').or(z.literal('')).optional(),
  phone: z.string().optional(),
  email: z.string().email('Voer een geldig e-mailadres in').or(z.literal('')).optional(),
  address: z.object({
    street: z.string().optional(),
    city: z.string().optional(),
    postal_code: z.string().optional(),
    country: z.string().optional(),
  }).optional(),
  company_size: z.enum(['1-10', '11-50', '51-200', '201-500', '501+']).optional(),
  annual_revenue: z.number().optional(),
  status: z.enum(['prospect', 'active', 'inactive', 'churned']),
  priority: z.enum(['low', 'medium', 'high']),
  notes: z.string().optional(),
  
  // KVK validatie - 8 cijfers
  kvk_number: z.string()
    .regex(/^\d{8}$/, 'KVK nummer moet 8 cijfers zijn')
    .optional()
    .or(z.literal('')),
    
  linkedin_url: z.string()
    .url('Voer een geldige LinkedIn URL in')
    .optional()
    .or(z.literal('')),
    
  source: z.enum(['Manual', 'Apollo', 'KVK', 'Website', 'Manus', 'Referral', 'n8n_automation']).optional(),
});
```

**Validaties:**
- ✅ Bedrijfsnaam: min 2 karakters
- ✅ KVK: exact 8 cijfers (regex)
- ✅ Email: geldig email formaat
- ✅ Website: geldig URL formaat
- ✅ LinkedIn: geldig URL formaat

**❌ Geen validatie voor:**
- Duplicate bedrijfsnaam (wordt pas bij submit gecheckt)
- Duplicate KVK nummer (wordt pas bij submit gecheckt)
- Naam similarity ("Acme" vs "Acme BV")

---

### UI Feedback bij Duplicaten

**Locatie:** `src/features/companies/components/CompanyForm.tsx` - regel 600-608

```tsx
{kvkError && (
  <Alert variant="destructive">
    <AlertCircle className="h-4 w-4" />
    <AlertTitle>Bedrijf bestaat al</AlertTitle>
    <AlertDescription>{kvkError}</AlertDescription>
  </Alert>
)}
```

**Visual Design:**
```
┌────────────────────────────────────────────┐
│ 🔴 Bedrijf bestaat al                     │
│                                            │
│ Dit KVK nummer is al in gebruik bij       │
│ bedrijf "Acme Corporation"                 │
└────────────────────────────────────────────┘
```

**State Management:**
```typescript
const [kvkError, setKvkError] = useState<string | null>(null);

// Clear error on KVK input change
onChange={(e) => {
  field.onChange(e);
  setKvkError(null);  // Reset error
}}
```

---

## 🔧 Backend Validation

### API Webhook Handler

**Locatie:** `supabase/functions/api-webhook-handler/index.ts` - regel 462-476

```typescript
async function handleCreateCompany(
  supabase: SupabaseClient<Database>,
  data: CompanyPayload,
  source: string
) {
  // Validate required fields
  if (!data.name) {
    throw new Error('Missing required field: name');
  }

  // Check if company already exists (case-insensitive!)
  const { data: existing } = await supabase
    .from('companies')
    .select('id')
    .ilike('name', data.name)  // Case-insensitive
    .single();

  if (existing) {
    throw new Error(`Company "${data.name}" already exists with ID: ${existing.id}`);
  }

  // Create company
  const ownerId = data.owner_id || await getDefaultSalesRep(supabase);
  
  const { data: company, error } = await supabase
    .from('companies')
    .insert([{ /* ... */ }])
    .select()
    .single();
  
  return { company_id: company.id, owner_id: ownerId, message: 'Company created' };
}
```

**✅ Goed:**
- `.ilike()` voor **case-insensitive** check
- Gooit error bij duplicate
- Gebruikt in webhook endpoints (n8n automation)

**⚠️ Probleem:**
- Alleen voor webhook handler
- Frontend gebruikt `.eq()` (case-sensitive)
- **Inconsistentie** tussen frontend en backend

---

### n8n Webhook Handler

**Locatie:** `supabase/functions/n8n-webhook-handler/index.ts` - regel 82-105

```typescript
// Check if company already exists (by KVK number or name)
let existingCompany = null;

// First try KVK number
if (payload.kvk_number) {
  const { data } = await supabase
    .from("companies")
    .select("id, name")
    .eq("custom_fields->kvk_number", payload.kvk_number)  // ⚠️ In custom_fields!
    .single();
  existingCompany = data;
}

// Fallback to name (case-insensitive)
if (!existingCompany) {
  const { data } = await supabase
    .from("companies")
    .select("id, name")
    .ilike("name", payload.company_name)  // Case-insensitive
    .single();
  existingCompany = data;
}

let companyId: string;

if (existingCompany) {
  // Use existing company
  companyId = existingCompany.id;
} else {
  // Create new company
  const { data: newCompany, error } = await supabase
    .from("companies")
    .insert([{ /* ... */ }])
    .select("id")
    .single();
  
  companyId = newCompany.id;
}
```

**⚠️ Interessant:**
- KVK nummer in `custom_fields` JSONB (oude locatie?)
- Bij duplicate: **Gebruikt bestaand bedrijf** (geen error!)
- Voor lead imports vanuit n8n

---

## 🎭 User Experience

### Scenario 1: Duplicate Bedrijfsnaam

**User Action:**
```
1. User opent "Nieuw Bedrijf" formulier
2. Vult in: Naam = "Acme BV"
3. Klikt "Aanmaken"
```

**System Response:**
```
┌────────────────────────────────────────────┐
│ 🔴 Bedrijf bestaat al                     │
│                                            │
│ Een bedrijf met de naam "Acme BV"          │
│ bestaat al                                 │
└────────────────────────────────────────────┘

Formulier blijft open
Focus blijft op formulier
User kan naam aanpassen
```

**⚠️ Issues:**
1. **Case-sensitive:** "ACME BV" zou wel werken (duplicate!)
2. **Geen suggesties:** Link naar bestaand bedrijf ontbreekt
3. **Geen "toch aanmaken":** User kan niet override (terecht?)

---

### Scenario 2: Duplicate KVK Nummer

**User Action:**
```
1. User opent "Nieuw Bedrijf" formulier
2. Vult in: 
   - Naam = "Acme Corporation"
   - KVK = "12345678" (bestaat al)
3. Klikt "Aanmaken"
```

**System Response:**
```
┌────────────────────────────────────────────┐
│ 🔴 Bedrijf bestaat al                     │
│                                            │
│ Dit KVK nummer is al in gebruik bij       │
│ bedrijf "Acme BV"                          │
└────────────────────────────────────────────┘

Formulier blijft open
KVK veld highlighted in rood
User ziet welk bedrijf het al heeft
```

**✅ Beter:**
- Toont welk bedrijf het KVK nummer gebruikt
- Helpt user het duplicaat te identificeren
- Duidelijke foutmelding

**💡 Verbeterpunt:**
- Klik op bedrijfsnaam → Open bestaand bedrijf?
- "Dit bedrijf bekijken" knop toevoegen?

---

### Scenario 3: Variant Spelling

**User Action:**
```
Bestaand in database: "Dirq Solutions"
User probeert: "Dirq Solutions BV"
```

**System Response:**
```
✅ Aanmaken succesvol!
(Geen duplicate detection - verschillende string)

Result: 2 bedrijven met bijna zelfde naam
- "Dirq Solutions"
- "Dirq Solutions BV"
```

**❌ Probleem:**
- **Geen fuzzy matching**
- **Geen similarity check**
- **Data quality degradation**

---

### Scenario 4: Case Difference

**User Action:**
```
Bestaand in database: "Acme BV"
User probeert: "ACME BV"
```

**System Response:**
```
✅ Aanmaken succesvol!
(Geen duplicate detection - case-sensitive match)

Result: 2 bedrijven met zelfde naam (andere case)
- "Acme BV"
- "ACME BV"
```

**❌ Probleem:**
- **Case-sensitive check** in frontend
- **Webhooks gebruiken .ilike()** (case-insensitive)
- **Inconsistentie** tussen entry points

---

## 🐛 Edge Cases

### Edge Case 1: Race Condition

**Scenario:**
```
User A en User B openen beide "Nieuw Bedrijf"
Beide willen "Acme BV" aanmaken
```

**Timeline:**
```
T=0ms   User A: Opens form
T=10ms  User B: Opens form
T=100ms User A: Vult "Acme BV" in
T=110ms User B: Vult "Acme BV" in
T=200ms User A: Klikt "Aanmaken" → Frontend check (geen match)
T=210ms User B: Klikt "Aanmaken" → Frontend check (nog geen match!)
T=220ms User A: INSERT INTO companies → ✅ Success
T=230ms User B: INSERT INTO companies → ✅ Success (geen UNIQUE constraint!)
```

**Result:**
- **2 bedrijven met naam "Acme BV"**
- **Geen error**
- **Data inconsistentie**

**Fix:**
```sql
ALTER TABLE companies ADD CONSTRAINT companies_name_unique UNIQUE (name);
-- Nu zou User B een database error krijgen
```

---

### Edge Case 2: Webhook Automation

**Scenario:**
```
n8n workflow krijgt lead van website formulier
Lead data: company_name = "Acme BV" (bestaat al)
```

**Gedrag:**
```typescript
// n8n-webhook-handler gebruikt .ilike()
const { data } = await supabase
  .from("companies")
  .select("id, name")
  .ilike("name", "Acme BV")  // Case-insensitive
  .single();

if (data) {
  // ✅ Gebruikt bestaand bedrijf
  companyId = data.id;
}
```

**Result:**
- **Gebruikt bestaand bedrijf** (good!)
- **Geen duplicate created**
- **Lead wordt gekoppeld aan bestaand bedrijf**

**✅ Goed design:**
- Webhooks zijn intelligent
- Voorkomt duplicaten bij automation
- Maar: Inconsistent met manual entry (die blokkeert duplicaten)

---

### Edge Case 3: KVK Nummer zonder Verificatie

**Scenario:**
```
User vult verkeerd KVK nummer in
KVK = "11111111" (8 cijfers, maar niet geldig)
```

**Gedrag:**
```typescript
// Zod validatie checkt alleen format
kvk_number: z.string()
  .regex(/^\d{8}$/, 'KVK nummer moet 8 cijfers zijn')
  .optional()
```

**Result:**
- ✅ Validatie passed
- ✅ Bedrijf created
- ❌ Maar: KVK nummer bestaat niet (geen API check)

**Missing:**
- **Geen KVK API validatie**
- **Geen real-time verificatie**
- User kan willekeurig nummer invullen

---

### Edge Case 4: Edit Existing Company

**Scenario:**
```
User edit bedrijf "Acme BV"
Wil naam wijzigen naar "Acme Corporation" (bestaat al)
```

**Code Check:**
```typescript
// CompanyForm.tsx - regel 243
if (existingName && existingName.id !== company?.id) {
  // ✅ Check excludes own company ID
  setKvkError(t('companies.companyExists', { name: data.name }));
  return;
}
```

**Result:**
- ✅ Duplicate detection werkt
- ✅ Eigen bedrijf ID wordt uitgesloten
- ✅ Kan niet wijzigen naar bestaande naam

---

## 💡 Aanbevelingen

### Prioriteit 1: Database Constraints (CRITICAL)

**Probleem:** Geen UNIQUE constraints op `kvk_number` en `name`

**Oplossing:**
```sql
-- Migration: add_unique_constraints.sql
-- 1. Clean up existing duplicates (if any)
WITH duplicates AS (
  SELECT id, name, kvk_number,
         ROW_NUMBER() OVER (PARTITION BY LOWER(name) ORDER BY created_at) as rn
  FROM companies
)
DELETE FROM companies
WHERE id IN (
  SELECT id FROM duplicates WHERE rn > 1
);

-- 2. Add UNIQUE constraint on KVK number
ALTER TABLE companies 
ADD CONSTRAINT companies_kvk_number_key 
UNIQUE (kvk_number);

-- 3. Add UNIQUE constraint on name (case-insensitive)
CREATE UNIQUE INDEX companies_name_unique_idx 
ON companies (LOWER(name));
```

**Impact:**
- ✅ Database-level duplicate prevention
- ✅ Race condition protection
- ✅ API/webhook safety
- ⚠️ Breaking change voor bestaande duplicaten

---

### Prioriteit 2: Case-Insensitive Frontend Check

**Probleem:** Frontend gebruikt `.eq()` (case-sensitive)

**Oplossing:**
```typescript
// CompanyForm.tsx - handleSubmit
// VOOR:
const { data: existingName } = await supabase
  .from('companies')
  .select('id, name')
  .eq('name', data.name)  // ❌ Case-sensitive
  .maybeSingle();

// NA:
const { data: existingName } = await supabase
  .from('companies')
  .select('id, name')
  .ilike('name', data.name)  // ✅ Case-insensitive
  .maybeSingle();
```

**Impact:**
- ✅ Consistent met webhook handlers
- ✅ Voorkomt "ACME BV" vs "Acme BV" duplicaten
- ✅ Betere UX

---

### Prioriteit 3: Fuzzy Matching / Similarity Check

**Probleem:** "Dirq Solutions" vs "Dirq Solutions BV" worden niet gedetecteerd

**Oplossing (optie 1 - Simple):**
```typescript
// Check for similar names (contains/startsWith)
const { data: similarCompanies } = await supabase
  .from('companies')
  .select('id, name')
  .or(`name.ilike.%${data.name}%,name.ilike.${data.name}%`)
  .limit(5);

if (similarCompanies && similarCompanies.length > 0) {
  // Toon suggestie dialog
  setSimilarCompanies(similarCompanies);
  setShowSimilarDialog(true);
}
```

**Oplossing (optie 2 - Advanced):**
```typescript
// PostgreSQL pg_trgm extension
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX companies_name_trgm_idx 
ON companies USING gin (name gin_trgm_ops);

-- Query met similarity threshold
SELECT id, name, 
       similarity(name, 'Dirq Solutions BV') as sim
FROM companies
WHERE similarity(name, 'Dirq Solutions BV') > 0.6
ORDER BY sim DESC
LIMIT 5;
```

**UI Mockup:**
```
┌────────────────────────────────────────────┐
│ ⚠️ Mogelijk duplicaat gevonden             │
│                                            │
│ De volgende bedrijven lijken op:          │
│ "Dirq Solutions BV"                        │
│                                            │
│ 🏢 Dirq Solutions (95% match)              │
│    KVK: 12345678                           │
│    [Bekijken] [Dit is hetzelfde]           │
│                                            │
│ 🏢 Dirq Solutions B.V. (90% match)         │
│    KVK: 87654321                           │
│    [Bekijken] [Dit is hetzelfde]           │
│                                            │
│ [Toch aanmaken] [Annuleren]                │
└────────────────────────────────────────────┘
```

**Impact:**
- ✅ Voorkomt veel duplicaten
- ✅ Helpt data quality
- ⚠️ Kan false positives geven
- ⚠️ Extra database load

---

### Prioriteit 4: Link naar Bestaand Bedrijf

**Probleem:** Bij duplicate error geen link naar bestaand bedrijf

**Oplossing:**
```tsx
{kvkError && existingCompanyId && (
  <Alert variant="destructive">
    <AlertCircle className="h-4 w-4" />
    <AlertTitle>Bedrijf bestaat al</AlertTitle>
    <AlertDescription>
      {kvkError}
      <Button
        variant="link"
        className="ml-2 h-auto p-0 text-destructive underline"
        onClick={() => {
          onOpenChange(false);
          navigate(`/companies/${existingCompanyId}`);
        }}
      >
        Bekijk bestaand bedrijf →
      </Button>
    </AlertDescription>
  </Alert>
)}
```

**Impact:**
- ✅ Betere UX
- ✅ Helpt user duplicaat te identificeren
- ✅ Direct naar bestaand bedrijf navigeren

---

### Prioriteit 5: KVK API Verificatie

**Probleem:** Geen verificatie of KVK nummer echt bestaat

**Oplossing:**
```typescript
// KVK API check (via n8n or direct)
const handleKVKVerification = async (kvkNumber: string) => {
  setIsVerifying(true);
  
  try {
    const response = await fetch(`/api/kvk/verify/${kvkNumber}`);
    const data = await response.json();
    
    if (!data.exists) {
      setKvkError('Dit KVK nummer bestaat niet');
      return false;
    }
    
    // Auto-fill bedrijfsnaam van KVK
    if (data.name && !form.watch('name')) {
      form.setValue('name', data.name);
    }
    
    return true;
  } catch (error) {
    console.error('KVK verificatie failed:', error);
    return true; // Allow submission on API error
  } finally {
    setIsVerifying(false);
  }
};
```

**Impact:**
- ✅ Data quality improvement
- ✅ Auto-fill van correcte bedrijfsnaam
- ⚠️ Extra API calls (rate limits)
- ⚠️ KVK API key nodig

---

## 📊 Samenvatting

### ✅ Wat werkt goed

1. **Frontend duplicate checks** op naam en KVK
2. **Backend safety net** in useCreateCompany mutation
3. **Webhook intelligence** - gebruikt bestaand bedrijf bij duplicaten
4. **UI feedback** - duidelijke error messages
5. **Edit protection** - eigen bedrijf ID wordt uitgesloten

### ❌ Wat moet beter

1. **CRITICAL:** Geen database UNIQUE constraints
2. **Case-sensitive** checks in frontend (inconsistent)
3. **Geen fuzzy matching** voor vergelijkbare namen
4. **Geen link** naar bestaand bedrijf bij duplicate error
5. **Geen KVK API verificatie** - willekeurige nummers toegestaan
6. **Race conditions** mogelijk door ontbrekende constraints

### 🎯 Quick Wins (implementeer eerst)

1. **Add database UNIQUE constraints** (kvk_number + name)
2. **Change `.eq()` to `.ilike()`** in frontend checks
3. **Add link to existing company** in error message
4. **Show company ID** in error voor debugging

### 🚀 Advanced Improvements (later)

1. **Fuzzy matching** met similarity threshold
2. **KVK API integration** voor real-time verificatie
3. **Duplicate suggestion dialog** met merge optie
4. **Audit trail** voor duplicate attempts
5. **Company merge functionaliteit**

---

**Last Updated:** 27 Januari 2026  
**Author:** GitHub Copilot (Senior Development Architect)  
**Status:** Analysis Complete - Implementation Pending
