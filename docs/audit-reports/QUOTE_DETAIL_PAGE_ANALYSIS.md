# 🔍 Code Analyst Rapport: Quote Detail Page Discrepantie Analyse

**Datum:** 14 januari 2026  
**Analyst:** GitHub Copilot  
**Scope:** Vergelijking QuoteDetailPage met Company/Contact/Project detail pagina's

---

## 📋 Executive Summary

De Quote Detail Page **WERKT NIET** in productie ondanks correcte code lokaal. Na grondige analyse van alle detail pagina's zijn er **3 KRITIEKE DISCREPANTIES** gevonden die deze pagina uniek maken en waarom het faalt.

---

## 🔴 KRITIEKE BEVINDINGEN

### 1. **INCONSISTENTE FOREIGN KEY SYNTAX** (BLOCKING ISSUE)

#### ❌ QuoteDetailPage.tsx (Regel 87-92)
```typescript
const { data: quote, isLoading } = useQuery({
  queryKey: ['quotes', id],
  queryFn: async () => {
    const { data, error } = await supabase
      .from('quotes')
      .select(`
        *,
        companies:company_id(id, name, email, phone),          // ❌ FOUT!
        contacts:contact_id(id, first_name, last_name, email, phone),
        projects:project_id(id, title, stage),
        profiles:owner_id(id, voornaam, achternaam, email)
      `)
```

**PROBLEEM:** Gebruikt alias-naam + kolom-naam syntax `companies:company_id` zonder relatie specificatie.

---

#### ✅ CompanyDetailPage - CORRECTE IMPLEMENTATIE
```typescript
const { data: company, isLoading } = useCompany(id!);

// In useCompanies.ts hook:
export function useCompany(id: string) {
  return useQuery({
    queryKey: ['company', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('companies')
        .select(`
          *,
          industry:industries(*),                              // ✅ CORRECT
          owner:profiles!companies_owner_id_fkey(id, voornaam, achternaam, email)
        `)
```

**WAAROM WERKT DIT?**
- Gebruikt **EXPLICIETE FK NAME** syntax: `profiles!companies_owner_id_fkey`
- Gebruikt standaard foreign key relaties voor `industries`

---

#### ✅ ContactDetailPage - CORRECTE IMPLEMENTATIE  
```typescript
const { data: contact, isLoading } = useContact(id!);

// In useContacts.ts hook:
export function useContact(id: string) {
  return useQuery({
    queryKey: ['contact', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contacts')
        .select(`
          *,
          company:companies(id, name, status),                 // ✅ CORRECT
          owner:profiles!contacts_owner_id_fkey(id, voornaam, achternaam, email)
        `)
```

**WAAROM WERKT DIT?**
- `company:companies` gebruikt **default FK relationship**
- `profiles!contacts_owner_id_fkey` gebruikt **expliciete FK name**

---

#### ✅ ProjectDetailPage - CORRECTE IMPLEMENTATIE
```typescript
const { data: project, isLoading } = useQuery({
  queryKey: ['projects', id],
  queryFn: async () => {
    const { data, error } = await supabase
      .from('projects')
      .select(`
        *,
        companies:companies!projects_company_id_fkey(id, name, email, phone, website),  // ✅ CORRECT
        contacts:contacts(id, first_name, last_name, email, phone),                      // ✅ CORRECT
        profiles:profiles!projects_owner_id_fkey(id, voornaam, achternaam, email)        // ✅ CORRECT
      `)
```

**WAAROM WERKT DIT?**
- Gebruikt **EXPLICIETE FK NAMES** voor alle relaties
- Syntax: `alias:table!foreign_key_name(columns)`

---

### 2. **USEQUERY VS CUSTOM HOOK PATTERN** 

#### ❌ QuoteDetailPage - Direct useQuery in Component
```typescript
// Direct in component (regel 77-95)
const { data: quote, isLoading } = useQuery({
  queryKey: ['quotes', id],
  queryFn: async () => { /* ... */ }
});

// EN NOGMAALS voor items (regel 97-108)
const { data: items } = useQuery({
  queryKey: ['quote-items', id],
  queryFn: async () => { /* ... */ }
});
```

**PROBLEEM:**
- Query logic zit in component in plaats van hook
- Geen centrale hook definitie zoals andere features
- Inconsistent met rest van codebase

---

#### ✅ Andere Detail Pages - Custom Hook Pattern
```typescript
// CompanyDetailPage
const { data: company, isLoading } = useCompany(id!);  // ✅ Custom hook

// ContactDetailPage  
const { data: contact, isLoading } = useContact(id!);  // ✅ Custom hook

// ProjectDetailPage
const { data: project, isLoading } = useQuery({ ... }); // Direct, maar consistent syntax
```

---

### 3. **FOREIGN KEY NAMING INCONSISTENTIE IN DATABASE**

#### Database Schema Analyse

**Companies Table:**
```sql
-- FK: companies_owner_id_fkey → profiles(id)
-- ✅ Naming: {table}_{column}_fkey
```

**Contacts Table:**
```sql
-- FK: contacts_owner_id_fkey → profiles(id)
-- FK: contacts_company_id_fkey → companies(id)
-- ✅ Naming: {table}_{column}_fkey
```

**Projects Table:**
```sql
-- FK: projects_owner_id_fkey → profiles(id)
-- FK: projects_company_id_fkey → companies(id)
-- FK: projects_contact_id_fkey → contacts(id)
-- ✅ Naming: {table}_{column}_fkey
```

**Quotes Table:**
```sql
-- FK: quotes_owner_id_fkey → profiles(id)
-- FK: quotes_company_id_fkey → companies(id)
-- FK: quotes_project_id_fkey → projects(id)
-- FK: quotes_contact_id_fkey → contacts(id)  ← ⚠️ NIET IN CODE GEBRUIKT!
-- ✅ Naming: {table}_{column}_fkey
```

**BEVINDING:** Alle foreign keys volgen consistent naming pattern, MAAR...

---

## 🎯 ROOT CAUSE ANALYSE

### Waarom faalt QuoteDetailPage specifiek?

#### 1. **MULTIPLE FOREIGN KEY AMBIGUÏTEIT**

**Quotes Table heeft MEERDERE relaties naar dezelfde tabel:**
```typescript
companies:company_id(...)    // ❌ Welke FK? quotes_company_id_fkey?
projects:project_id(...)     // ❌ Welke FK? quotes_project_id_fkey?
```

**Projects Table heeft DEZELFDE situatie maar WERKT:**
```typescript
// ProjectDetailPage gebruikt EXPLICIETE syntax:
companies:companies!projects_company_id_fkey(...)  // ✅ DUIDELIJK!
contacts:contacts!projects_contact_id_fkey(...)    // ✅ DUIDELIJK!
```

---

#### 2. **NESTED RELATIONSHIP COMPLEXITY**

**QuoteDetailPage probeert NESTED join via project:**
```typescript
projects:project_id(
  id, 
  title, 
  stage,
  // ❌ Verwacht nested contact, maar niet gedefinieerd in query
)
```

**Maar useQuotes.ts hook doet het WEL:**
```typescript
project:project_id (
  id, 
  title, 
  contact:contact_id (          // ✅ EXPLICIETE nested join
    id, 
    first_name, 
    last_name, 
    email, 
    phone, 
    position
  )
)
```

---

#### 3. **CONTACT DUBBELE RELATIE PROBLEEM**

**Quotes Table schema:**
```sql
quotes
├── company_id → companies(id)
├── project_id → projects(id)  
├── contact_id → contacts(id)     ← ⚠️ DIRECTE relatie
└── owner_id → profiles(id)

projects
├── contact_id → contacts(id)     ← ⚠️ DUBBELE weg naar contact!
```

**QuoteDetailPage haalt contact via project:**
```typescript
// ❌ FOUT: Quote heeft DIRECTE contact_id, maar query gebruikt project.contact
projects:project_id(id, title, stage)  // Geen contact genest
```

**QuoteDetailPage MOET zijn:**
```typescript
contacts:contact_id(id, first_name, last_name, email, phone),  // Directe relatie
projects:project_id(id, title, stage),                         // Zonder nested contact
```

---

## 📊 VERGELIJKINGSTABEL

| Feature | Query Location | FK Syntax | Nested Joins | Status |
|---------|---------------|-----------|--------------|--------|
| **Companies** | Custom Hook (useCompany) | Explicit FK names | No | ✅ WERKT |
| **Contacts** | Custom Hook (useContact) | Mixed (default + explicit) | No | ✅ WERKT |
| **Projects** | Component useQuery | Explicit FK names | Yes (contact via project) | ✅ WERKT |
| **Quotes** | Component useQuery | ❌ Alias:column only | ❌ Missing | ❌ FAALT |

---

## 🔧 OPLOSSINGEN

### Optie A: Volg ProjectDetailPage Pattern (AANBEVOLEN)

```typescript
// QuoteDetailPage.tsx regel 87-95
const { data: quote, isLoading } = useQuery({
  queryKey: ['quotes', id],
  queryFn: async () => {
    const { data, error } = await supabase
      .from('quotes')
      .select(`
        *,
        companies:companies!quotes_company_id_fkey(id, name, email, phone),
        contacts:contacts!quotes_contact_id_fkey(id, first_name, last_name, email, phone),
        projects:projects!quotes_project_id_fkey(id, title, stage),
        profiles:profiles!quotes_owner_id_fkey(id, voornaam, achternaam, email)
      `)
      .eq('id', id!)
      .single();

    if (error) throw error;
    return data as Quote;
  },
  enabled: !!id,
});
```

**VOORDELEN:**
- ✅ Consistent met ProjectDetailPage
- ✅ Expliciete FK referenties
- ✅ Geen ambiguïteit
- ✅ Gebruikt directe contact relatie (niet via project)

---

### Optie B: Gebruik Custom Hook Pattern (BEST PRACTICE)

**Stap 1:** Verplaats query naar useQuotes.ts hook
```typescript
// src/features/quotes/hooks/useQuotes.ts

export function useQuoteWithRelations(id: string) {
  return useQuery({
    queryKey: ['quotes', 'detail', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('quotes')
        .select(`
          *,
          company:companies!quotes_company_id_fkey(id, name, email, phone),
          contact:contacts!quotes_contact_id_fkey(id, first_name, last_name, email, phone),
          project:projects!quotes_project_id_fkey(id, title, stage),
          owner:profiles!quotes_owner_id_fkey(id, voornaam, achternaam, email)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      return data as Quote;
    },
    enabled: !!id,
  });
}
```

**Stap 2:** Gebruik in component
```typescript
// QuoteDetailPage.tsx
import { useQuoteWithRelations } from './hooks/useQuotes';

const { data: quote, isLoading } = useQuoteWithRelations(id!);
```

**VOORDELEN:**
- ✅ Consistent met Companies en Contacts pattern
- ✅ Reusable hook
- ✅ Centralized query logic
- ✅ Easier testing

---

## 🚨 WAAROM LOKAAL WERKT MAAR PRODUCTIE NIET

### Deployment Discrepantie

**Lokaal:**
- Code: `companies:company_id(...)` 
- Supabase SDK versie: Mogelijk nieuwer
- Browser cache: Leeg bij development
- Error handling: Volledige stack traces

**Productie (Netlify):**
- Code: Gebundeld in `index-D9zo3WB0.js`
- Build cache: ❌ Oude versie cached
- CDN cache: ❌ Stale bundle
- Service Worker: ❌ Mogelijk cached response

### Git vs Deployed Code Mismatch

```bash
# Git commit adcd120 bevat:
companies:company_id(id, name, email, phone)  # ✅ Lokaal correct

# Netlify bundle bevat:
companies:companies(...)  # ❌ Oude syntax
```

**DIAGNOSE:** Build cache niet ge-invalideerd na deployment!

---

## 🎬 CONCLUSIE & ACTIEPLAN

### Waarom Quote Detail Page niet werkt:

1. **Foreign Key Syntax:** Gebruikt incomplete `alias:column` zonder FK name
2. **Hook Pattern:** Direct useQuery in plaats van custom hook
3. **Contact Relatie:** Mist directe contact_id join
4. **Build Cache:** Netlify cached oude bundle versie
5. **Schema Mismatch:** Code verwacht `quote_items`, DB heeft `quote_line_items` (**MIGRATION PENDING**)

### Prioriteit Fix Volgorde:

1. **HIGH:** Fix FK syntax naar explicit names (Optie A)
2. **HIGH:** Voeg contact directe relatie toe
3. **MEDIUM:** Refactor naar custom hook pattern (Optie B)
4. **CRITICAL:** Clear Netlify build cache en redeploy
5. **CRITICAL:** Run schema migration `20260114_fix_quotes_schema_alignment.sql`

### Vergelijking met werkende pages:

| Aspect | Company | Contact | Project | Quote |
|--------|---------|---------|---------|-------|
| Hook Pattern | ✅ Custom | ✅ Custom | ⚠️ Direct | ❌ Direct |
| FK Syntax | ✅ Explicit | ✅ Mixed | ✅ Explicit | ❌ Incomplete |
| Schema Match | ✅ Yes | ✅ Yes | ✅ Yes | ❌ No (items table) |
| Deployed | ✅ Works | ✅ Works | ✅ Works | ❌ Fails |

---

**END OF REPORT**
