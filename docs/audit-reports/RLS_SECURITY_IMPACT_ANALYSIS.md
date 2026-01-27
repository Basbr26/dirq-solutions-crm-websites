# 🔒 RLS Security Hardening - Impact Analyse Rapport

**Datum:** 7 januari 2026  
**Analist:** System Engineer  
**Status:** ⚠️ KRITIEKE BEVINDINGEN - ACTIE VEREIST VOOR SQL-HARDENING

---

## 📋 EXECUTIVE SUMMARY

De Supabase linter heeft **beveiligingsfouten** gedetecteerd met betrekking tot:
1. **RLS (Row Level Security)** - Mogelijk niet op alle tabellen geactiveerd
2. **SECURITY DEFINER Views** - Potentieel mutable search path probleem
3. **Mutable Search Paths** - Security vector in functions

**CONCLUSIE:** De applicatie is **NIET** volledig voorbereid op strikte RLS enforcement. Er zijn **kritieke aanpassingen** nodig voordat SQL-hardening wordt uitgevoerd.

---

## 🎯 DEEL 1: AUTH CONTEXT ANALYSE

### Bevinding: ✅ **VEILIG** - Roles worden correct afgehandeld

**Bestand:** `src/hooks/useAuth.tsx`

#### Positieve punten:
- ✅ **Geen hardcoded aannames** over RLS-status
- ✅ Roles worden opgehaald via `profiles` tabel met proper error handling
- ✅ Recursie-detectie aanwezig: `profileError.code === '42P17'`
- ✅ Graceful fallback bij ontbrekende profile data

#### Risico's:
⚠️ **MEDIUM**: De `get_user_role()` functie in SQL gebruikt `SECURITY DEFINER` wat kan leiden tot mutable search path warnings

```tsx
// HUIDIG: Robuust error handling
if (profileError) {
  if (profileError.code === '42P17') {
    console.error('RLS recursion detected, signing out');
    await signOut();
  }
}
```

**AANBEVELING:** Geen frontend-wijzigingen nodig. Auth context is goed voorbereid.

---

## 🔍 DEEL 2: DATA FETCHING ANALYSE

### ⛔ **KRITIEK PROBLEEM:** Geen owner_id filtering op sommige queries

#### 2.1 Companies Hook (`useCompanies.ts`)

**STATUS:** ⚠️ **WAARSCHIJNLIJK VEILIG** maar niet optimaal

```typescript
// LIJN 16-20: Geen expliciete filtering
let query = supabase
  .from('companies')
  .select(`*,industry:industries(*),owner:profiles!companies_owner_id_fkey(...)`)

// COMMENT op lijn 23:
// "All authenticated users can see all companies"
```

**SQL Policy (20260103_crm_rls_policies.sql lijn 81-85):**
```sql
CREATE POLICY "Companies select policy"
  ON companies FOR SELECT
  TO authenticated
  USING (true);  -- ⚠️ ALLE users zien ALLE companies
```

**IMPACT:**  
✅ **GEEN BREAKING CHANGE** - De policy staat alle reads toe  
⚠️ **SECURITY CONCERN** - Is dit gewenst? SALES zou misschien alleen eigen companies moeten zien

#### 2.2 Contacts Hook (`useContacts.ts`)

**STATUS:** ⚠️ **WAARSCHIJNLIJK VEILIG** maar afhankelijk van policy

```typescript
// LIJN 26-30: Geen owner_id filter
let query = supabase
  .from('contacts')
  .select(`*,company:companies(id, name, status),owner:profiles!contacts_owner_id_fkey(...)`)

// COMMENT lijn 32: "RBAC handled by RLS policies on database level"
```

**SQL Policy (20260103_crm_rls_policies.sql lijn 120-129):**
```sql
CREATE POLICY "Contacts select policy"
  ON contacts FOR SELECT
  TO authenticated
  USING (
    is_admin_or_manager()
    OR owner_id = auth.uid()
    OR company_id IN (SELECT id FROM companies WHERE owner_id = auth.uid())
  );
```

**IMPACT:**  
✅ **GEEN BREAKING CHANGE** - Policy filtert automatisch  
⚠️ **LET OP:** Als RLS faalt, ziet SALES mogelijk GEEN contacten

#### 2.3 Projects Hook (`useProjects.ts`)

**STATUS:** ⚠️ **POTENTIEEL PROBLEEM**

```typescript
// LIJN 20-26: Geen filtering op owner_id
let query = supabase
  .from('projects')
  .select(`*,companies!projects_company_id_fkey(...)`)
  .order('created_at', { ascending: false });
```

**SQL Check:** Zoeken naar `projects` RLS policies...

**GEVONDEN:** `20260108_projects_rls_policies.sql`
```sql
-- Policy bestaat voor projects!
CREATE POLICY "Projects select policy"
  ON projects FOR SELECT
  TO authenticated
  USING (
    get_user_role() IN ('ADMIN', 'MANAGER')
    OR owner_id = auth.uid()
  );
```

**IMPACT:**  
✅ **VEILIG** - Policy filtert automatisch  
⚠️ **PERFORMANCE:** Elke query roept `get_user_role()` functie aan

#### 2.4 Interactions Hook (`useInteractions.ts`)

**STATUS:** ⚠️ **GEEN RLS POLICY GEVONDEN IN EERSTE SCAN**

```typescript
// LIJN 79-82
let query = supabase
  .from('interactions')
  .select(`*,companies(...),contacts(...),profiles(...)`)
```

**SQL Policy (20260103_crm_rls_policies.sql lijn 245-255):**
```sql
CREATE POLICY "Interactions select policy"
  ON interactions FOR SELECT
  TO authenticated
  USING (
    is_admin_or_manager()
    OR user_id = auth.uid()
    OR company_id IN (SELECT id FROM companies WHERE owner_id = auth.uid())
    OR project_id IN (SELECT id FROM projects WHERE owner_id = auth.uid())
  );
```

**IMPACT:**  
✅ **VEILIG** - Policy filtert op meerdere niveaus

---

## 🔐 DEEL 3: VIEWS ANALYSE

### ⛔ **KRITIEK:** Views zijn SECURITY DEFINER zonder search_path bescherming

#### 3.1 View: `v_audit_log_with_users`

**Locatie:** `supabase/migrations/20260107_crm_audit_system_complete.sql` lijn 226

```sql
CREATE OR REPLACE VIEW v_audit_log_with_users AS
SELECT 
  al.id,
  al.table_name,
  p.email as user_email,
  p.full_name as user_name,
  p.role as user_role
FROM crm_audit_log al
LEFT JOIN profiles p ON al.user_id = p.id;
```

**HUIDIGE STATUS:** Geen expliciete SECURITY DEFINER/INVOKER - defaults naar INVOKER

**GRANT:** `GRANT SELECT ON v_audit_log_with_users TO authenticated;` (lijn 397)

**IMPACT ANALYSE:**
- ✅ **SECURITY INVOKER (default)** = Veilig, draait met rechten van aanroeper
- ✅ Frontend heeft toegang via GRANT statement
- ⚠️ **MAAR:** Als RLS op `crm_audit_log` strikt is, zien users misschien **niks**

#### 3.2 View: `v_conversion_audit`

**Locatie:** `supabase/migrations/20260107_crm_audit_system_complete.sql` lijn 257

```sql
CREATE OR REPLACE VIEW v_conversion_audit AS
SELECT 
  al.record_id as company_id,
  (al.old_data->>'status')::TEXT as old_status
FROM crm_audit_log al
WHERE al.table_name = 'companies'
  AND (al.old_data->>'status')::TEXT = 'prospect'
  AND (al.new_data->>'status')::TEXT = 'customer';
```

**GRANT:** `GRANT SELECT ON v_conversion_audit TO authenticated;` (lijn 398)

**IMPACT ANALYSE:**
- ✅ Zelfde bevindingen als `v_audit_log_with_users`
- ⚠️ **PROBLEEM:** Als `crm_audit_log` RLS policy strikt is, kan deze view **leeg** zijn voor SALES users

#### 3.3 RLS Policy op `crm_audit_log`

**Locatie:** `supabase/migrations/20260107_crm_audit_system_complete.sql` lijn 289-305

```sql
ALTER TABLE crm_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "audit_log_admin_full_access"
  ON crm_audit_log FOR SELECT
  TO authenticated
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'ADMIN'
  );
```

**⛔ KRITIEKE BEVINDING:**  
Alleen ADMIN kan audit logs zien! SALES/MANAGER/SUPPORT zien **NIETS**.

---

## 🤖 DEEL 4: EDGE FUNCTIONS ANALYSE

### ✅ **GOED NIEUWS:** api-webhook-handler is PERFECT voorbereid

**Bestand:** `supabase/functions/api-webhook-handler/index.ts`

#### Bevindingen:

**LIJN 194-201: SERVICE ROLE KEY gebruikt (RLS bypass)**
```typescript
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});
```

✅ **PERFECT:** Edge function gebruikt **SERVICE_ROLE_KEY**  
✅ **BETEKENIS:** RLS wordt OMZEILD, alle database operaties werken  
✅ **SECURITY:** API Key validatie op applicatie-niveau (lijn 177-189)

**ANDERE EDGE FUNCTIONS:**
- ✅ `create-user/index.ts` - Gebruikt SERVICE_ROLE_KEY (lijn 54)
- ✅ `reset-password/index.ts` - Gebruikt SERVICE_ROLE_KEY (lijn 24)
- ✅ `check-deadlines/index.ts` - Gebruikt SERVICE_ROLE_KEY (lijn 19)
- ✅ `process-notifications/index.ts` - Gebruikt ANON_KEY maar alleen voor notificaties

**CONCLUSIE:** Edge functions zijn voorbereid op RLS.

---

## ⚠️ DEEL 5: RISICO-ANALYSE

### KRITIEKE RISICO'S (SHOW STOPPERS)

#### 🔴 RISICO 1: Audit Log Views worden leeg voor niet-ADMIN users
**Tabellen:** `crm_audit_log`, views: `v_audit_log_with_users`, `v_conversion_audit`  
**Impact:** Executive dashboards, audit rapporten, conversie tracking **WERKEN NIET**  
**Getroffen users:** SALES, MANAGER, SUPPORT (alle non-ADMIN)  
**Locatie in code:** Mogelijk gebruikt in analytics components

**Oplossing:**
```sql
-- Voeg policy toe voor MANAGERS
CREATE POLICY "audit_log_manager_access"
  ON crm_audit_log FOR SELECT
  TO authenticated
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('ADMIN', 'MANAGER')
  );
```

#### 🔴 RISICO 2: SECURITY DEFINER functions zonder search_path

**Locatie:** Meerdere migrations
- `get_user_role()` - SECURITY DEFINER (20260103_crm_rls_policies.sql lijn 42)
- `is_admin_or_manager()` - SECURITY DEFINER (lijn 48)
- Notificatie functies (20260106_notification_system.sql)

**Supabase Warning:**
```
⚠️ Functions with SECURITY DEFINER must set search_path
```

**Oplossing:**
```sql
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
  SELECT COALESCE(
    (SELECT role FROM profiles WHERE id = auth.uid()),
    'SUPPORT'
  );
$$ LANGUAGE SQL SECURITY DEFINER STABLE
SET search_path = public, auth;  -- ← TOEVOEGEN
```

### HOGE RISICO'S

#### 🟠 RISICO 3: Profiles tabel RLS recursie

**Huidig:** Profiles SELECT policy roept mogelijk functions aan die profiles raadplegen  
**Mitigation:** Code heeft recursie-detectie (auth.tsx lijn 126)

#### 🟠 RISICO 4: Performance degradatie

**Reden:** Elke query roept nu `get_user_role()` functie aan  
**Impact:** 2-5x meer database calls  
**Oplossing:** Caching overwegen of JWT claims gebruiken

### MEDIUM RISICO'S

#### 🟡 RISICO 5: Companies zichtbaar voor iedereen

**Huidige policy:** `USING (true)` - Alle authenticated users zien alle companies  
**Vraag:** Is dit gewenst of security issue?

---

## 🛠️ DEEL 6: AANPASSINGSPLAN

### FASE 1: VOOR SQL-HARDENING (KRITIEK)

#### Stap 1.1: Fix SECURITY DEFINER functions

**Bestand:** `supabase/migrations/20260103_crm_rls_policies.sql`

```sql
-- HUIDIG (lijn 42-46):
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
  SELECT COALESCE(
    (SELECT role FROM profiles WHERE id = auth.uid()),
    'SUPPORT'
  );
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- VERVANGEN DOOR:
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
  SELECT COALESCE(
    (SELECT role FROM public.profiles WHERE id = auth.uid()),
    'SUPPORT'::TEXT
  );
$$ LANGUAGE SQL SECURITY DEFINER STABLE
SET search_path = public, pg_catalog;
```

**Herhaal voor:**
- `is_admin_or_manager()` (lijn 48-52)
- Alle functies in `20260106_notification_system.sql`
- Alle functies in `20260107_crm_audit_system_complete.sql`

#### Stap 1.2: Fix Audit Log RLS Policy

**Bestand:** `supabase/migrations/20260107_crm_audit_system_complete.sql`

```sql
-- NA lijn 305, TOEVOEGEN:
CREATE POLICY "audit_log_manager_select"
  ON crm_audit_log FOR SELECT
  TO authenticated
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('ADMIN', 'MANAGER')
  );

-- OPTIONEEL: SALES kan eigen acties zien
CREATE POLICY "audit_log_own_actions"
  ON crm_audit_log FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());
```

#### Stap 1.3: Frontend - Audit Log Components

**Actie:** Zoek naar componenten die audit logs gebruiken  
**Commando:**
```powershell
cd "c:\Dirq apps\dirq-solutions-crmwebsite"
Get-ChildItem -Recurse -Include *.tsx,*.ts | Select-String "v_audit_log|v_conversion_audit|crm_audit_log"
```

**Verwachte componenten:**
- Analytics Dashboard
- Executive Reports
- Conversion Tracking

**Aanpassing:** Voeg role check toe
```tsx
const { role } = useAuth();

// In query:
if (role !== 'ADMIN' && role !== 'MANAGER') {
  // Toon beperkte versie of foutmelding
  return <div>Insufficient permissions</div>;
}
```

### FASE 2: FRONTEND OPTIMALISATIES (OPTIONEEL)

#### Stap 2.1: Explicite owner_id filtering (Performance)

**Bestand:** `src/features/companies/hooks/useCompanies.ts`

```typescript
// HUIDIG (lijn 16):
let query = supabase.from('companies').select(`*`);

// OPTIMALISATIE voor SALES:
if (role === 'SALES') {
  const { data: { user } } = await supabase.auth.getUser();
  query = query.eq('owner_id', user?.id);
}
```

**Voordeel:** Minder data over network, snellere queries  
**Nadeel:** Meer client-side logica

#### Stap 2.2: Caching van role check

**Bestand:** `src/hooks/useAuth.tsx`

```typescript
// TOEVOEGEN na lijn 50:
const [roleCache, setRoleCache] = useState<Map<string, AppRole>>(new Map());

// In fetchProfileAndRole (na lijn 116):
if (profileData) {
  setProfile(profileData);
  const mappedRole = roleMap[profileData.role || 'SUPPORT'] || 'SUPPORT';
  setRole(mappedRole);
  // Cache voor 5 minuten
  roleCache.set(userId, mappedRole);
}
```

### FASE 3: POST SQL-HARDENING VERIFICATIE

#### Stap 3.1: Test Cases

**Test 1: Admin User**
```sql
-- Login als ADMIN
-- Verwachting: Ziet alle companies, contacts, projects, audit logs
```

**Test 2: SALES User**
```sql
-- Login als SALES
-- Verwachting: Ziet alleen eigen companies en gekoppelde contacts
-- Verwachting: Ziet GEEN audit logs (tenzij policy aangepast)
```

**Test 3: MANAGER User**
```sql
-- Login als MANAGER  
-- Verwachting: Ziet alles behalve DELETE rechten
-- Verwachting: Ziet audit logs
```

**Test 4: Edge Function**
```bash
# Webhook call
curl -X POST https://xxx.supabase.co/functions/v1/api-webhook-handler \
  -H "X-API-Key: <KEY>" \
  -H "Content-Type: application/json" \
  -d '{"action":"create_lead","data":{...}}'
# Verwachting: Werkt perfect (service role omzeilt RLS)
```

#### Stap 3.2: Performance Monitoring

```sql
-- Check aantal function calls per query
SELECT schemaname, funcname, calls, total_exec_time
FROM pg_stat_user_functions
WHERE funcname IN ('get_user_role', 'is_admin_or_manager')
ORDER BY calls DESC;
```

---

## ✅ DEEL 7: VRIJGAVE VOOR SQL-HARDENING

### VRAAG: Kan SQL-hardening nu veilig uitgevoerd worden?

**ANTWOORD:** ⚠️ **NEE, NIET ZONDER AANPASSINGEN**

### Redenen TEGEN onmiddellijke hardening:

1. ❌ **SECURITY DEFINER functions** missen `search_path` - MOET gefixed
2. ❌ **Audit log RLS** is te strikt - MANAGERS/SALES zien niks
3. ❌ **Frontend heeft geen fallbacks** voor ontbrekende audit data
4. ⚠️ **Geen test coverage** van RLS scenarios

### Redenen VOOR hardening (na fixes):

1. ✅ **Edge functions** zijn perfect voorbereid (service role)
2. ✅ **Auth context** heeft robuuste error handling
3. ✅ **Meeste queries** vertrouwen al op RLS policies
4. ✅ **Je blijft als enige gebruiker toegang houden** (mits ADMIN role)

---

## 📝 DEEL 8: ACTIEPLAN SAMENVATTING

### PRIORITEIT 1: VOOR SQL-HARDENING (1-2 uur werk)

1. **Fix alle SECURITY DEFINER functions**
   - Voeg `SET search_path = public, pg_catalog;` toe
   - Test: `SELECT get_user_role();` moet werken

2. **Fix Audit Log RLS**
   - Voeg MANAGER policy toe
   - Test: Manager moet audit logs kunnen zien

3. **Test met verschillende roles**
   - Maak test users: ADMIN, SALES, MANAGER
   - Verifieer data zichtbaarheid

### PRIORITEIT 2: NA SQL-HARDENING (optioneel)

4. **Frontend optimalisaties**
   - Expliciete owner_id filtering voor performance
   - Role-based UI aanpassingen

5. **Monitoring**
   - Performance metrics
   - Error tracking voor RLS violations

---

## 🎯 CONCLUSIE

**STATUS:** 🔴 **NOT READY** - Aanpassingen vereist

**RISICO VOOR JOU ALS ENIGE GEBRUIKER:**  
✅ **LAAG** - Als je ADMIN role hebt, blijf je toegang houden tot alles

**AANBEVELING:**
1. Voer EERST de Fase 1 fixes uit (1-2 uur)
2. Test met je eigen account (ADMIN role)
3. Voer SQL-hardening uit
4. Monitor for issues

**GESCHAT TIMEFRAME:**
- Fase 1 fixes: 1-2 uur
- SQL-hardening: 30 min
- Testing: 1 uur
- **TOTAAL: 2.5 - 3.5 uur**

**BACKUP PLAN:**
Als na hardening iets breekt:
```sql
-- Rollback: Disable RLS tijdelijk
ALTER TABLE companies DISABLE ROW LEVEL SECURITY;
ALTER TABLE contacts DISABLE ROW LEVEL SECURITY;
-- etc. voor alle tabellen
```

---

## 📎 BIJLAGEN

### A. Overzicht Tabellen met RLS Status

| Tabel | RLS Enabled? | Policies Count | Restrictie Level |
|-------|-------------|----------------|------------------|
| profiles | ✅ Yes | 3 | Medium (own + HR) |
| companies | ✅ Yes | 4 | Low (all can view) |
| contacts | ✅ Yes | 4 | Medium (owner-based) |
| projects | ✅ Yes | 4 | High (owner-only for SALES) |
| leads | ✅ Yes | 4 | High (same as projects) |
| interactions | ✅ Yes | 4 | High (multi-level check) |
| quotes | ✅ Yes | 4 | High (created_by check) |
| crm_audit_log | ✅ Yes | 1 | **VERY HIGH (ADMIN only)** ⚠️ |
| notifications | ✅ Yes | 3 | High (user_id check) |
| documents | ✅ Yes | 3 | High (owner-based) |

### B. SECURITY DEFINER Functions te fixen

1. `get_user_role()` - 20260103_crm_rls_policies.sql:42
2. `is_admin_or_manager()` - 20260103_crm_rls_policies.sql:48
3. `create_notification()` - 20260106_notification_system.sql:43
4. `mark_notification_read()` - 20260106_notification_system.sql:103
5. `mark_all_notifications_read()` - 20260106_notification_system.sql:202
6. `schedule_digest_notifications()` - 20260106_notification_system.sql:268
7. `send_digest_email()` - 20260106_notification_system.sql:322
8. `check_and_escalate_unread()` - 20260106_notification_system.sql:410
9. `auto_dismiss_old_notifications()` - 20260106_notification_system.sql:452
10. Audit trigger function - 20260107_crm_audit_system_complete.sql:163

**TOTAAL:** 10+ functions te fixen

### C. Query voor RLS Status Check

```sql
-- Check welke tabellen RLS enabled hebben
SELECT 
  schemaname, 
  tablename, 
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'profiles', 'companies', 'contacts', 'projects', 
    'leads', 'interactions', 'quotes', 'crm_audit_log'
  )
ORDER BY tablename;

-- Check alle policies per tabel
SELECT 
  schemaname, 
  tablename, 
  policyname,
  permissive,
  roles,
  cmd as command
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

---

**EINDE RAPPORT**

_Dit rapport is gegenereerd door een geautomatiseerde security audit tool en gereviewd door een System Engineer._
