# 🔍 Contacts Module Code Audit Report

**Datum:** 28 januari 2026  
**Module:** `src/features/contacts/`  
**Auditor:** GitHub Copilot  
**Criteria:** Identiek aan Companies Module Audit

---

## 📊 Executive Summary

| Criteria | Score | Status |
|----------|-------|--------|
| **1. Legacy Code & Cleanup** | 6/10 | ⚠️ Needs Work |
| **2. Security** | 7/10 | ⚠️ Acceptable |
| **3. TypeScript Types** | 7/10 | ⚠️ Acceptable |
| **4. Performance** | 5/10 | 🔴 Critical |
| **5. Testing** | 0/10 | 🔴 Critical |
| **6. Documentation** | 3/10 | 🔴 Critical |
| **OVERALL SCORE** | **4.7/10** | 🔴 Below Standard |

**Status vergelijking met Companies Module (6.5/10):**  
⚠️ **Contacts module scoort 1.8 punten LAGER** - significante verbetering nodig

---

## 1️⃣ Legacy Code & Cleanup (6/10)

### ✅ Positive Findings
- Geen ongebruikte imports gedetecteerd
- Consistente naming conventions
- Goede folder structuur (hooks, components gescheiden)
- Moderne React patterns (hooks, functional components)

### ❌ Critical Issues

#### **Commented Out Code** (Priority: HIGH)
**[useContacts.ts](src/features/contacts/hooks/useContacts.ts#L41-L43)**
```typescript
// Remove duplicate companyId filter since it's handled above
// if (params.companyId) {
//   query = query.eq('company_id', params.companyId);
// }
```
🔧 **Fix:** Verwijder de commented code - deze is al verwerkt boven in de functie

#### **Console.log Debugging Statements** (Priority: HIGH)
**[ContactsPage.tsx](src/features/contacts/ContactsPage.tsx#L178)**
```typescript
console.error('Export error:', error);
```

**[ContactsPage.tsx](src/features/contacts/ContactsPage.tsx#L231)**
```typescript
console.error('Insert error for row:', row, error);
```

**[ContactsPage.tsx](src/features/contacts/ContactsPage.tsx#L237)**
```typescript
console.error('Row processing error:', error);
```
🔧 **Fix:** Replace met proper error logging service of structured logging

#### **Code Duplication** (Priority: MEDIUM)
**Edit Dialog duplicatie** - ContactCard.tsx heeft 2x dezelfde edit dialog code:
- Lines 285-308 (mobile swipe versie)
- Lines 341-365 (desktop versie)

**Delete Dialog duplicatie** - ContactCard.tsx heeft 2x dezelfde delete dialog:
- Lines 310-329 (mobile swipe versie)
- Lines 366-384 (desktop versie)

🔧 **Fix:** Extract shared dialog components

#### **Hardcoded Strings** (Priority: LOW)
**[ContactCard.tsx](src/features/contacts/components/ContactCard.tsx#L289)**
```typescript
<DialogTitle>Contact bewerken</DialogTitle>
<DialogDescription>
  Wijzig de gegevens van het contact
</DialogDescription>
```

**[ContactCard.tsx](src/features/contacts/components/ContactCard.tsx#L345)**
```typescript
<DialogTitle>Contact Bewerken</DialogTitle>
```
⚠️ **Issue:** Inconsistente capitalisatie + niet vertaald via i18n

**[ContactForm.tsx](src/features/contacts/components/ContactForm.tsx#L296-L297)**
```typescript
{defaultCompanyId 
  ? "Dit contact wordt automatisch gekoppeld aan dit bedrijf"
  : "Koppel dit contact aan een bedrijf"
}
```
🔧 **Fix:** Gebruik t() functies voor alle user-facing teksten

---

## 2️⃣ Security (7/10)

### ✅ Positive Findings
- **RLS Policies Active** - Contacts table heeft 4 policies (select, insert, update, delete)
- **Row-Level Security** - owner_id based filtering
- **Authentication Check** - Auth user verification in mutations
- **SQL Injection Protected** - Gebruikt Supabase client (prepared statements)

### ⚠️ Areas of Concern

#### **Missing Input Sanitization** (Priority: HIGH)
**[ContactsPage.tsx](src/features/contacts/ContactsPage.tsx#L202-L223)**
Import functie gebruikt direct user input zonder sanitization:
```typescript
const contactData: any = {
  first_name: row.first_name || row.Voornaam,  // ❌ No sanitization
  last_name: row.last_name || row.Achternaam,  // ❌ No sanitization
  email: row.email || row.Email || undefined,   // ❌ No email validation
  // ... meer fields
};
```

🔧 **Fix:** 
- Validate email format
- Sanitize text inputs (trim, max length)
- Validate phone numbers format
- Check for XSS vectors in all string fields

#### **Weak RLS Policies** (Priority: MEDIUM)
**Current policies:** Alleen owner_id check
```sql
USING (owner_id = (select auth.uid()));
```

⚠️ **Issue:** Geen role-based filtering zoals bij Companies
- SALES users kunnen alleen eigen contacts zien
- Geen team-based toegang
- Geen manager/admin override

**Comparison met Companies:** Companies heeft role-based policies voor MANAGER/ADMIN

🔧 **Fix:** Implement role-based policies zoals in Companies module

#### **Missing Authorization Checks** (Priority: MEDIUM)
**[ContactDetailPage.tsx](src/features/contacts/ContactDetailPage.tsx#L101-L103)**
```typescript
const canEdit = role === "ADMIN" || role === "SALES" || role === "MANAGER";
const canDelete = role === "ADMIN" || role === "SALES";
```

**[ContactCard.tsx](src/features/contacts/components/ContactCard.tsx#L54-L55)**
```typescript
const canEdit = role && ['ADMIN', 'SALES', 'MANAGER'].includes(role);
const canDelete = role === 'ADMIN';
```

⚠️ **Issue:** Inconsistente authorization logic:
- ContactDetailPage: SALES can delete
- ContactCard: Only ADMIN can delete

🔧 **Fix:** Centraliseer authorization logic in een shared hook

#### **Missing CSRF Protection** (Priority: LOW)
CSV Import/Export functies hebben geen CSRF tokens, maar gebruiken Supabase auth.

---

## 3️⃣ TypeScript Types (7/10)

### ✅ Positive Findings
- Gebruikt centrale `Contact` type uit `@/types/crm`
- Zod schema validation in ContactForm
- Goede interface definitions voor props

### ❌ Type Safety Issues

#### **'any' Type Usage** (5 instances)
**[ContactForm.tsx](src/features/contacts/components/ContactForm.tsx#L287)**
```typescript
{companiesData.map((company: any) => (  // ❌
```

**[ContactsPage.tsx](src/features/contacts/ContactsPage.tsx#L148)**
```typescript
const rows = contacts.map((c: any) => [  // ❌
```

**[ContactsPage.tsx](src/features/contacts/ContactsPage.tsx#L177)**
```typescript
} catch (error: any) {  // ❌
```

**[ContactsPage.tsx](src/features/contacts/ContactsPage.tsx#L183)**
```typescript
const handleImport = async (data: any[], fieldMapping: Record<string, string>) => {  // ❌
```

**[ContactsPage.tsx](src/features/contacts/ContactsPage.tsx#L202)**
```typescript
const contactData: any = {  // ❌
```

🔧 **Fix:** 
```typescript
// Define proper types
interface CSVRow {
  first_name?: string;
  last_name?: string;
  email?: string;
  // ...
}

interface ContactImportData {
  first_name: string;
  last_name: string;
  email?: string;
  // ...
}
```

#### **Missing Return Types** (Priority: MEDIUM)
Functions in hooks miss explicit return types:
- `useContacts()` - geen return type
- `useContact()` - geen return type
- `useContactStats()` - geen return type

🔧 **Fix:** Add explicit return types voor better type inference

---

## 4️⃣ Performance (5/10) 🔴 CRITICAL

### ❌ Critical Performance Issues

#### **No React.memo Usage** (Priority: HIGH)
ContactCard wordt gere-rendered bij elke parent update:
```typescript
export function ContactCard({ contact }: ContactCardProps) {  // ❌ No memo
```

**Impact:** Bij 50+ contacts wordt de hele lijst gere-rendered bij elke state change

🔧 **Fix:**
```typescript
export const ContactCard = React.memo<ContactCardProps>(({ contact }) => {
  // ...
});
```

#### **No useCallback Optimization** (Priority: HIGH)
**[ContactsPage.tsx](src/features/contacts/ContactsPage.tsx#L91-L94)**
```typescript
const handleSearchChange = (value: string) => {
  setSearch(value);
  pagination.resetPage();
};
```

**Impact:** Nieuwe functie referentie bij elke render → child components re-render

🔧 **Fix:**
```typescript
const handleSearchChange = useCallback((value: string) => {
  setSearch(value);
  pagination.resetPage();
}, [pagination]);
```

#### **Missing useMemo for Computed Values** (Priority: HIGH)
**[ContactsPage.tsx](src/features/contacts/ContactsPage.tsx#L246-L251)**
```typescript
const stats = {
  total: totalCount || 0,
  primary: contacts.filter((c) => c.is_primary).length || 0,  // ❌ Recomputed every render
  decisionMakers: contacts.filter((c) => c.is_decision_maker).length || 0,  // ❌
  withCompany: contacts.filter((c) => c.company_id).length || 0,  // ❌
};
```

**Impact:** Array filters run on every render, even als contacts niet verandert

🔧 **Fix:**
```typescript
const stats = useMemo(() => ({
  total: totalCount || 0,
  primary: contacts.filter((c) => c.is_primary).length || 0,
  decisionMakers: contacts.filter((c) => c.is_decision_maker).length || 0,
  withCompany: contacts.filter((c) => c.company_id).length || 0,
}), [contacts, totalCount]);
```

#### **N+1 Query Issue** (Priority: MEDIUM)
**[useContacts.ts](src/features/contacts/hooks/useContacts.ts#L20-L27)**
Query haalt alle contacts + relations op:
```typescript
.select(`
  *,
  company:companies(id, name, status),
  owner:profiles!contacts_owner_id_fkey(id, voornaam, achternaam, email)
`)
```

**Issue:** 
- Haalt ALLE company fields voor contact cards waar alleen naam nodig is
- Owner info wordt gefetched maar wordt niet altijd getoond in cards

🔧 **Fix:** 
- Maak separate queries voor list vs detail views
- Lazy load owner info

#### **Missing Database Indexes**
Needs verification, maar waarschijnlijk missing indexes op:
- `contacts.company_id` (voor filter queries)
- `contacts.is_primary` (voor filter queries)
- `contacts.is_decision_maker` (voor filter queries)
- `contacts.owner_id` (voor RLS policies)

🔧 **Fix:** Check EXPLAIN ANALYZE en voeg indexes toe

#### **CSV Export Performance** (Priority: LOW)
**[ContactsPage.tsx](src/features/contacts/ContactsPage.tsx#L130-L142)**
```typescript
let query = supabase
  .from('contacts')
  .select('first_name, last_name, email, ...');  // No limit
```

**Issue:** Haalt ALLE contacts in memory voor export zonder streaming

🔧 **Fix:** Implement pagination voor grote datasets (>1000 records)

---

## 5️⃣ Testing (0/10) 🔴 CRITICAL

### ❌ Zero Test Coverage

**No test files found voor:**
- ❌ `ContactsPage.test.tsx`
- ❌ `ContactDetailPage.test.tsx`
- ❌ `ContactCard.test.tsx`
- ❌ `ContactForm.test.tsx`
- ❌ `useContacts.test.ts`
- ❌ `useContactMutations.test.ts`

**Comparison:** Companies module heeft minimaal 1 test file (`useCompanies.test.tsx`)

### 📋 Minimum Required Tests

#### Unit Tests
```typescript
// useContacts.test.ts
describe('useContacts', () => {
  it('should fetch contacts with pagination');
  it('should apply search filter');
  it('should apply company filter');
  it('should handle errors gracefully');
});

// useContactMutations.test.ts
describe('useContactMutations', () => {
  it('should create contact with owner_id');
  it('should update contact');
  it('should delete contact');
  it('should handle validation errors');
});
```

#### Integration Tests
```typescript
// ContactsPage.test.tsx
describe('ContactsPage', () => {
  it('should render contacts list');
  it('should filter by company');
  it('should search contacts');
  it('should export CSV');
  it('should import CSV with validation');
});
```

#### Component Tests
```typescript
// ContactCard.test.tsx
describe('ContactCard', () => {
  it('should display contact info');
  it('should show/hide actions based on role');
  it('should handle swipe actions on mobile');
  it('should open edit dialog');
});

// ContactForm.test.tsx
describe('ContactForm', () => {
  it('should validate required fields');
  it('should validate email format');
  it('should validate LinkedIn URL');
  it('should submit form data');
});
```

**Estimated Coverage Needed:** Minimaal 70% voor productie-ready code

---

## 6️⃣ Documentation (3/10) 🔴 CRITICAL

### ❌ Missing Documentation

#### **No JSDoc Comments**
Geen enkele functie heeft JSDoc documentation:
```typescript
// ❌ No docs
export function useContacts(params: UseContactsParams = {}) {
  // ...
}

// ❌ No docs
export function ContactForm({ contact, defaultCompanyId, onSubmit, ... }) {
  // ...
}
```

🔧 **Fix:** Add JSDoc voor alle public functions:
```typescript
/**
 * Hook voor het ophalen en filteren van contacten met paginatie
 * 
 * @param params - Filter parameters (search, companyId, isPrimary, isDecisionMaker)
 * @returns Contacts array, pagination controls en loading state
 * 
 * @example
 * const { contacts, isLoading, pagination } = useContacts({
 *   search: 'john',
 *   companyId: '123-456'
 * });
 */
export function useContacts(params: UseContactsParams = {}) {
```

#### **No README.md**
**Missing:** `src/features/contacts/README.md`

**Should contain:**
- Module overzicht
- Component architectuur
- Hook usage examples
- RLS policy documentation
- Import/Export format specs

#### **Inline Comments** (Score: 5/10)
✅ Positief:
- Goede section comments in large components (`{/* Contact Info */}`)
- Comments bij commented code (al moet die code weg)

❌ Negatief:
- Geen business logic explanation
- Complex RBAC logic niet gedocumenteerd
- CSV import mapping niet gedocumenteerd

#### **Type Documentation** (Score: 4/10)
Contact type in `@/types/crm` is extern defined, maar:
- Geen comments bij fields
- Geen examples van valid data
- Geen validation rules gedocumenteerd

---

## 🎯 Top 5 Priority Fixes

### 1. **Add Performance Optimizations** (CRITICAL)
**Impact:** High - affects user experience bij grote contact lijsten
**Effort:** Medium - 4-6 hours

**Changes needed:**
- Wrap ContactCard in React.memo
- Add useCallback voor event handlers
- Add useMemo voor stats berekeningen
- Implement virtual scrolling voor 100+ contacts

**Files:**
- [ContactCard.tsx](src/features/contacts/components/ContactCard.tsx)
- [ContactsPage.tsx](src/features/contacts/ContactsPage.tsx)

**Expected improvement:** 50-70% render time reduction

---

### 2. **Implement Test Coverage** (CRITICAL)
**Impact:** High - geen safety net voor refactoring/changes
**Effort:** High - 12-16 hours voor 70% coverage

**Start with:**
1. useContacts.test.ts (hooks zijn makkelijkst te testen)
2. ContactForm.test.tsx (form validation critical)
3. ContactsPage integration tests

**Comparison:** Companies heeft basis test coverage, Contacts heeft 0%

---

### 3. **Fix Type Safety Issues** (HIGH)
**Impact:** Medium-High - voorkomt runtime errors
**Effort:** Low-Medium - 2-3 hours

**Changes:**
- Replace alle `any` types met proper interfaces
- Add return types voor hooks
- Create CSVRow en ContactImportData types
- Use strict TypeScript config

**Files:**
- [ContactsPage.tsx](src/features/contacts/ContactsPage.tsx) (5x any)
- [ContactForm.tsx](src/features/contacts/components/ContactForm.tsx) (1x any)

---

### 4. **Add Input Sanitization & Security** (HIGH)
**Impact:** High - security vulnerability
**Effort:** Medium - 3-4 hours

**Changes:**
- Validate all CSV import fields
- Sanitize text inputs (XSS prevention)
- Add email format validation
- Add phone number validation
- Implement rate limiting voor import

**Files:**
- [ContactsPage.tsx](src/features/contacts/ContactsPage.tsx#L183-L240)

---

### 5. **Cleanup & Remove Technical Debt** (MEDIUM)
**Impact:** Medium - code maintainability
**Effort:** Low - 1-2 hours

**Changes:**
- Remove commented code ([useContacts.ts](src/features/contacts/hooks/useContacts.ts#L41-L43))
- Replace console.error met proper logging
- Extract duplicated dialog components
- Fix hardcoded strings met i18n
- Fix authorization logic inconsistencies

---

## 📈 Comparison: Contacts vs Companies Module

| Aspect | Contacts | Companies | Delta |
|--------|----------|-----------|-------|
| **Overall Score** | 4.7/10 | 6.5/10 | -1.8 |
| **Legacy Code** | 6/10 | 8/10 | -2 |
| **Security** | 7/10 | 8/10 | -1 |
| **TypeScript** | 7/10 | 8/10 | -1 |
| **Performance** | 5/10 | 6/10 | -1 |
| **Testing** | 0/10 | 3/10 | -3 |
| **Documentation** | 3/10 | 4/10 | -1 |

### Key Differences

#### Contacts WORSE than Companies:
1. **Zero test coverage** vs minimale tests bij Companies
2. **Meer performance issues** (geen React.memo, geen useCallback)
3. **Meer console.logs** (3x vs 0x bij Companies)
4. **Meer 'any' types** (5x vs 2x bij Companies)
5. **Weaker RLS policies** (geen role-based filtering)

#### Contacts BETTER than Companies:
1. ✅ Betere mobile UX (swipeable cards)
2. ✅ CSV import/export functionaliteit
3. ✅ Interaction timeline integration
4. ✅ Document upload integration

---

## 🚀 Recommended Action Plan

### Phase 1: Critical Fixes (Week 1)
**Priority:** CRITICAL  
**Hours:** 20-25

1. ✅ Add React.memo + useCallback + useMemo
2. ✅ Implement basic test coverage (50%)
3. ✅ Fix input sanitization in CSV import
4. ✅ Remove console.logs
5. ✅ Fix type safety (replace 'any')

### Phase 2: Security & Quality (Week 2)
**Priority:** HIGH  
**Hours:** 15-20

1. ✅ Implement role-based RLS policies
2. ✅ Centralize authorization logic
3. ✅ Add JSDoc documentation
4. ✅ Extract duplicated components
5. ✅ Complete i18n coverage

### Phase 3: Performance & Polish (Week 3)
**Priority:** MEDIUM  
**Hours:** 10-15

1. ✅ Optimize database queries
2. ✅ Add database indexes
3. ✅ Implement virtual scrolling
4. ✅ Add comprehensive test coverage (70%+)
5. ✅ Create module README

**Total Estimated Effort:** 45-60 hours (1.5 - 2 sprints)

---

## 📝 Detailed Issue List

### High Priority Issues (Must Fix)
- [ ] No performance optimizations (React.memo, useCallback, useMemo)
- [ ] Zero test coverage
- [ ] 5x 'any' type usage
- [ ] Missing input sanitization in CSV import
- [ ] 3x console.error statements
- [ ] Weak RLS policies (geen role-based access)
- [ ] Inconsistent authorization logic
- [ ] No JSDoc documentation

### Medium Priority Issues (Should Fix)
- [ ] Duplicated dialog components (ContactCard)
- [ ] Missing return types voor hooks
- [ ] N+1 query potential
- [ ] Missing database indexes
- [ ] No module README
- [ ] Commented code not removed
- [ ] Hardcoded strings not i18n

### Low Priority Issues (Nice to Have)
- [ ] CSV export performance voor large datasets
- [ ] Virtual scrolling voor 100+ items
- [ ] Type documentation in CRM types
- [ ] More comprehensive inline comments

---

## 🎓 Best Practices from Companies Module to Adopt

1. **Testing:** Implement minimal test coverage like Companies heeft
2. **RLS Policies:** Adopt role-based policies (MANAGER/ADMIN overrides)
3. **Clean Code:** Zero console.logs zoals Companies
4. **Type Safety:** Minimize 'any' usage (Companies: 2x, Contacts: 5x)

---

## ✅ Summary

**Contacts module** is functioneel goed, maar heeft significante technical debt:
- ⚠️ **Performance issues** door missing optimizations
- 🔴 **Zero test coverage** is CRITICAL risk
- ⚠️ **Type safety** kan beter (5x 'any')
- ⚠️ **Security** kan verbeteren (input sanitization, RLS policies)

**Recommended:** Prioriteer Phase 1 fixes (performance + testing + security) voor productie deployment.

**Score: 4.7/10** - Below standard, needs improvement before production-ready.

---

**Generated:** January 28, 2026  
**Next Review:** After Phase 1 completion (estimated +2.5 points improvement)
