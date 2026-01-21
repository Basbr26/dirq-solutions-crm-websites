# Bugs & Integraties Fixes - Implementatie Gids

## ✅ Opgeloste Issues

### 1. MRR (Monthly Recurring Revenue) Berekeningen
**Probleem:** Total MRR werd niet consistent geüpdatet bij projectwijzigingen

**Oplossing geïmplementeerd:**
- Verbeterde trigger die **BEIDE** companies update bij project reassignment
- Automatische data reconciliatie voor bestaande discrepanties
- Betere edge case handling voor NULL waarden

### 2. Google Calendar Synchronisatie
**Probleem:** Desynchronisatie en incorrecte connection status

**Oplossing geïmplementeerd:**
- Real-time connection status via Supabase subscriptions
- Geconsolideerde token refresh implementatie
- Verbeterde webhook renewal met UI feedback
- Debug logging voor betere troubleshooting

---

## 📋 Implementatie Stappen

### Stap 1: Database Migration (MRR Fix)

**Bestand:** `fix_mrr_trigger.sql`

#### Uitvoeren in Supabase SQL Editor:

1. Open Supabase Dashboard → SQL Editor
2. Kopieer de inhoud van `fix_mrr_trigger.sql`
3. Run de volledige SQL
4. Verifieer dat de output `0` is (geen discrepanties meer)

#### Wat de migration doet:

```sql
-- 1. Dropped oude trigger en functie
-- 2. Created verbeterde update_company_mrr() functie
-- 3. Handles project reassignment (company_id changes)
-- 4. Recalculates all existing company total_mrr values
-- 5. Verifieert correctheid
```

#### Verificatie Query:

```sql
SELECT 
  c.name,
  c.total_mrr AS current_total_mrr,
  COALESCE(SUM(p.monthly_recurring_revenue), 0) AS calculated_mrr,
  c.total_mrr - COALESCE(SUM(p.monthly_recurring_revenue), 0) AS difference
FROM companies c
LEFT JOIN projects p ON p.company_id = c.id
GROUP BY c.id, c.name, c.total_mrr
HAVING c.total_mrr != COALESCE(SUM(p.monthly_recurring_revenue), 0);
```

**Expected Result:** Geen rijen (alles klopt)

---

### Stap 2: Frontend Updates (Automatisch)

De volgende componenten zijn automatisch geüpdatet via de push:

#### `src/lib/googleCalendar.ts`
- ❌ Verwijderd: `refreshGoogleAccessToken()` duplicate functie
- ✅ Behouden: `refreshAccessToken()` als single source of truth

#### `src/components/calendar/GoogleCalendarSync.tsx`
- ✅ Real-time Supabase subscription voor connection status
- ✅ Verbeterde token auto-refresh met UI updates
- ✅ Betere webhook renewal met error handling
- ✅ Toast notifications bij status changes

---

## 🧪 Testing Guide

### Test 1: MRR Berekening

#### Scenario A: Project MRR Update
```javascript
// 1. Open een project
// 2. Wijzig monthly_recurring_revenue van €99 naar €149
// 3. Sla op
// 4. Check company detail page
// ✅ Expected: Total MRR is direct geüpdatet (+€50)
```

#### Scenario B: Project Reassignment
```javascript
// 1. Open een project met MRR (bijv. €99/maand)
// 2. Wijzig company_id naar een andere company
// 3. Sla op
// 4. Check BEIDE company detail pages
// ✅ Expected: Oude company: -€99, Nieuwe company: +€99
```

#### Scenario C: Project Deletion
```javascript
// 1. Delete een project met MRR
// 2. Check company total_mrr
// ✅ Expected: Total MRR is verminderd met deleted project MRR
```

---

### Test 2: Google Calendar Sync

#### Test A: Connection Status Updates
```javascript
// 1. Ga naar Settings → Integraties
// 2. Klik "Verbinden met Google"
// 3. Voltooi OAuth flow
// ✅ Expected: Badge toont "Verbonden" + groene indicator
// ✅ Expected: Toast: "Verbonden met Google Calendar..."
```

#### Test B: Token Auto-Refresh
```javascript
// 1. Wacht tot token bijna verloopt (~55 minuten na login)
// 2. Check debug logs in console
// ✅ Expected: "🔄 Auto-refreshing access token..."
// ✅ Expected: "✅ Token automatically refreshed and stored"
// ✅ Expected: Toast: "Google Calendar verbinding automatisch vernieuwd"
// ✅ Expected: Badge blijft "Verbonden"
```

#### Test C: Real-time Status Updates
```javascript
// 1. Open Settings → Integraties in TAB 1
// 2. Open Supabase SQL Editor in TAB 2
// 3. Run: UPDATE profiles SET google_access_token = NULL WHERE id = '[jouw_id]';
// ✅ Expected: TAB 1 toont "Niet verbonden" binnen 1 seconde
// ✅ Expected: Geen pagina refresh nodig
```

#### Test D: Webhook Renewal
```javascript
// 1. Check webhook_expiration in database (moet ~7 dagen in toekomst zijn)
// 2. Forceer renewal: UPDATE profiles SET webhook_expiration = NOW() + INTERVAL '23 hours';
// 3. Wacht ~1 uur (of herstart app)
// ✅ Expected: Console log: "🔔 Webhook expiring soon, renewing..."
// ✅ Expected: Toast: "Google Calendar real-time sync verlengd"
// ✅ Expected: webhook_expiration updated naar +7 dagen
```

---

## 🐛 Debugging

### MRR Issues

#### Check trigger is active:
```sql
SELECT 
  trigger_name, 
  event_manipulation, 
  action_statement
FROM information_schema.triggers
WHERE trigger_name = 'trigger_update_company_mrr';
```

#### Manual recalculation:
```sql
UPDATE companies
SET total_mrr = (
  SELECT COALESCE(SUM(monthly_recurring_revenue), 0)
  FROM projects
  WHERE company_id = companies.id
);
```

---

### Google Calendar Issues

#### Check stored tokens:
```sql
SELECT 
  id,
  google_access_token IS NOT NULL AS has_token,
  google_refresh_token IS NOT NULL AS has_refresh,
  google_token_expires_at,
  webhook_expiration
FROM profiles
WHERE id = '[jouw_user_id]';
```

#### Debug logs in console:
```javascript
// Open browser console in Settings → Integraties
// Filter op: "[GoogleCalendarSync]"
// Je ziet nu:
// - 🚀 Initialization
// - 🔑 Token checks
// - ⏱️ Expiry info
// - 🔄 Refresh attempts
// - 📡 Real-time subscription events
```

#### Force token refresh:
```sql
-- Set expiry to 4 minutes from now (triggers auto-refresh)
UPDATE profiles
SET google_token_expires_at = NOW() + INTERVAL '4 minutes'
WHERE id = '[jouw_user_id]';
```

---

## 📊 Monitoring Queries

### MRR Health Check
```sql
-- Companies met MRR discrepanties
SELECT 
  c.name,
  c.total_mrr,
  COALESCE(SUM(p.monthly_recurring_revenue), 0) AS calculated,
  COUNT(p.id) AS project_count
FROM companies c
LEFT JOIN projects p ON p.company_id = c.id
GROUP BY c.id, c.name, c.total_mrr
HAVING c.total_mrr != COALESCE(SUM(p.monthly_recurring_revenue), 0);
```

### Google Calendar Health Check
```sql
-- Users met actieve Google Calendar connectie
SELECT 
  p.id,
  p.voornaam || ' ' || p.achternaam AS user_name,
  p.google_access_token IS NOT NULL AS connected,
  p.google_token_expires_at,
  CASE 
    WHEN p.google_token_expires_at > NOW() THEN 'Valid'
    ELSE 'Expired'
  END AS token_status,
  p.google_calendar_sync AS auto_sync_enabled,
  p.webhook_expiration
FROM profiles p
WHERE p.google_access_token IS NOT NULL;
```

---

## 🎯 Expected Behavior

### MRR Calculation
✅ **Trigger fires on:**
- `INSERT` nieuwe project → update company
- `UPDATE monthly_recurring_revenue` → update company
- `UPDATE company_id` → update BEIDE companies
- `DELETE` project → update company

✅ **Always consistent:**
- `companies.total_mrr` = SUM van alle `projects.monthly_recurring_revenue` voor die company
- NULL MRR treated als 0
- Real-time updates (geen delay)

### Google Calendar Sync
✅ **Connection Status:**
- "Verbonden" = groene badge + valid token
- "Niet verbonden" = rode badge + no token
- Updates real-time via Supabase subscription

✅ **Token Management:**
- Auto-refresh 5 minuten voor expiry
- Persistent via refresh_token
- UI updates automatisch bij refresh

✅ **Webhook:**
- 7 dagen geldig
- Auto-renews 24 uur voor expiry
- Toast notification bij renewal

---

## 📝 Changelog

### Commit: `14ee133`

**MRR Fixes:**
- Fixed trigger to handle company_id changes
- Added data reconciliation
- Improved NULL handling

**Google Calendar Fixes:**
- Removed duplicate refresh function
- Added real-time subscriptions
- Improved webhook management
- Better error handling & feedback

---

## ⚠️ Bekende Limitaties

### MRR
- Trigger werkt alleen voor `projects.monthly_recurring_revenue`
- Andere MRR sources (bijv. directe company MRR) worden NIET automatisch gesommeerd
- Handmatige `total_mrr` updates worden overschreven door trigger

### Google Calendar
- Refresh token alleen ontvangen als user OAuth consent geeft (eerste keer)
- Webhook max 7 dagen geldig (Google Calendar API limiet)
- Token refresh vereist actieve Supabase Edge Function: `google-calendar-refresh`

---

## 🚀 Volgende Stappen

1. ✅ Run `fix_mrr_trigger.sql` in Supabase
2. ✅ Verifieer geen MRR discrepanties
3. ✅ Test project MRR updates
4. ✅ Test Google Calendar connectie
5. ✅ Monitor debug logs
6. ✅ Verify real-time status updates werken

Bij vragen of problemen: check debug logs en run verification queries!
