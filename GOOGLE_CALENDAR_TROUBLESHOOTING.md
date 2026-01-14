# Google Calendar Sync - Troubleshooting Guide

## 🔍 Problemen met Desynchronisatie

### Symptomen
- Google Calendar sync werkt niet meer na een tijd
- "Niet verbonden" status ondanks eerdere login
- Events worden niet meer gesynchroniseerd
- Token errors in de console

---

## 🚨 Bekende Oorzaken & Oplossingen

### 1. 🔴 Refresh Token Expiry/Revocation

#### Waarom gebeurt dit?
Refresh tokens kunnen verlopen of ingetrokken worden door Google wanneer:
- ✗ De gebruiker zijn wachtwoord wijzigt
- ✗ De gebruiker de app toegang intrekt via [Google Account Permissions](https://myaccount.google.com/permissions)
- ✗ De app langer dan 6 maanden niet gebruikt wordt
- ✗ Google security issues detecteert
- ✗ Je de implicit OAuth flow gebruikt (HUIDIGE SITUATIE ⚠️)

#### Hoe te checken:
```sql
-- Check in Supabase SQL Editor
SELECT 
  id,
  email,
  google_access_token IS NOT NULL as has_access_token,
  google_refresh_token IS NOT NULL as has_refresh_token,
  google_token_expires_at,
  CASE 
    WHEN google_token_expires_at < NOW() THEN 'EXPIRED'
    WHEN google_token_expires_at < NOW() + INTERVAL '10 minutes' THEN 'EXPIRING SOON'
    ELSE 'VALID'
  END as token_status
FROM profiles 
WHERE id = auth.uid();
```

#### Oplossing:
1. **Korte termijn**: Gebruiker moet opnieuw inloggen
2. **Lange termijn**: Implementeer Authorization Code Flow (zie sectie hieronder)

---

### 2. ⚠️ Edge Function Secrets Ontbreken

#### Wat is het probleem?
De token refresh gebeurt via Supabase Edge Function `google-calendar-refresh` die `GOOGLE_CLIENT_SECRET` nodig heeft.

#### Hoe te checken:
```bash
# In Supabase Dashboard:
# Settings → Edge Functions → Secrets

# Controleer of deze bestaan:
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=GOCSPX-...
```

#### Edge Function Logs bekijken:
```bash
supabase functions logs google-calendar-refresh
```

Zoek naar errors zoals:
```
❌ Missing Google OAuth credentials in Supabase secrets
❌ Server configuration error
```

#### Oplossing:
1. Ga naar [Google Cloud Console](https://console.cloud.google.com)
2. Navigeer naar: APIs & Services → Credentials
3. Kopieer Client ID en Client Secret
4. Voeg toe in Supabase Dashboard → Edge Functions → Secrets

---

### 3. 🐛 Database Token Update Faalt Stil

#### Wat is het probleem?
In de `loadSyncSettings()` functie werd een database error niet goed afgevangen, waardoor:
- Errors stilletjes faalden
- `isSignedIn` niet werd gezet
- Gebruiker geen feedback kreeg

#### ✅ OPGELOST in Debug Versie
De nieuwe versie heeft:
- Uitgebreide error logging
- Zichtbare debug panel
- Connection error alerts
- Toast notifications bij elk probleem

---

## 🔧 Snelle Checklist

### Stap 1: Browser Console Check
1. Open Developer Tools (F12)
2. Ga naar Console tab
3. Refresh de pagina
4. Zoek naar:
   - ❌ Rode errors
   - ⚠️ `No refresh_token available`
   - 🔴 `Token expired`

### Stap 2: UI Debug Panel
De verbeterde component toont nu een "Debug Log" panel onderaan. Check voor:
```
[14:30:15] ❌ No refresh token available - user needs to re-authenticate
[14:30:20] ⚠️ Token expired, clearing from database...
[14:30:25] ❌ Database error: permission denied
```

### Stap 3: Database Check
```sql
-- Run in Supabase SQL Editor
SELECT 
  email,
  google_access_token IS NOT NULL,
  google_refresh_token IS NOT NULL,
  google_token_expires_at,
  google_calendar_sync,
  last_calendar_sync
FROM profiles 
WHERE id = auth.uid();
```

### Stap 4: Google Cloud Console
1. Ga naar [Google Cloud Console](https://console.cloud.google.com)
2. APIs & Services → OAuth consent screen
3. Check:
   - ✅ Publishing status: "In production" of "Testing"
   - ✅ App domain ingevuld
   - ✅ Authorized domains bevat jouw domain

### Stap 5: Google Account Permissions
1. Ga naar [myaccount.google.com/permissions](https://myaccount.google.com/permissions)
2. Zoek naar jouw app naam
3. Check:
   - ✅ App heeft toegang tot "See, edit, share, and permanently delete all calendars"
   - Als niet → Re-authorize via CRM

---

## 🛠️ Permanente Oplossing: Authorization Code Flow

### Huidige Probleem
De app gebruikt momenteel **Implicit Flow** die:
- ❌ Geen refresh_token geeft
- ❌ Tokens verlopen na 1 uur
- ❌ Gebruiker moet elke keer opnieuw inloggen

### Aanbevolen: Authorization Code Flow
Deze flow geeft wel een refresh_token waardoor:
- ✅ Tokens automatisch vernieuwd kunnen worden
- ✅ Sessies maanden blijven werken
- ✅ Betere gebruikerservaring

### Implementatie Stappen

#### 1. Update Google OAuth Config
```typescript
// src/lib/googleCalendar.ts

// Verander van implicit naar code flow:
tokenClient = window.google.accounts.oauth2.initCodeClient({
  client_id: GOOGLE_CLIENT_ID,
  scope: SCOPES,
  ux_mode: 'redirect', // OF 'popup'
  redirect_uri: GOOGLE_REDIRECT_URI,
  callback: (response) => {
    // Exchange authorization code for tokens
    exchangeCodeForTokens(response.code);
  },
});
```

#### 2. Exchange Code for Tokens (Server-side)
```typescript
// Via Supabase Edge Function
const { data } = await supabase.functions.invoke('google-exchange-code', {
  body: { code: authorizationCode }
});

// Edge Function maakt server-side call naar Google:
POST https://oauth2.googleapis.com/token
{
  code: authorization_code,
  client_id: ...,
  client_secret: ..., // Server-side secret!
  redirect_uri: ...,
  grant_type: 'authorization_code'
}

// Response bevat BEIDE tokens:
{
  access_token: "...",
  refresh_token: "...", // 🎉 Deze krijg je nu wel!
  expires_in: 3600
}
```

#### 3. Store Both Tokens
```typescript
await supabase
  .from('profiles')
  .update({
    google_access_token: tokens.access_token,
    google_refresh_token: tokens.refresh_token, // Nu beschikbaar!
    google_token_expires_at: expiresAt.toISOString(),
  })
  .eq('id', user.id);
```

#### 4. Create Edge Function for Code Exchange
```typescript
// supabase/functions/google-exchange-code/index.ts

serve(async (req) => {
  const { code } = await req.json();
  
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: Deno.env.get('GOOGLE_CLIENT_ID'),
      client_secret: Deno.env.get('GOOGLE_CLIENT_SECRET'),
      redirect_uri: Deno.env.get('GOOGLE_REDIRECT_URI'),
      grant_type: 'authorization_code',
    }),
  });
  
  const tokens = await response.json();
  return new Response(JSON.stringify(tokens), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
```

---

## 📊 Debug Info Interpretatie

### Wat betekenen de emoji's in de debug log?

| Emoji | Betekenis | Actie |
|-------|-----------|-------|
| ✅ | Succes | Alles OK |
| ❌ | Error | Probleem moet opgelost worden |
| ⚠️ | Warning | Let op, mogelijk probleem |
| 🔐 | Auth | Authenticatie actie |
| 💾 | Database | Database operatie |
| 🔄 | Refresh | Token refresh actie |
| ⏱️ | Time | Timing/expiry informatie |
| 🔍 | Check | Status check |
| ℹ️ | Info | Informatief bericht |

### Veelvoorkomende Log Patronen

#### Gezonde Sessie:
```
[14:30:00] 🚀 Initializing Google Calendar API...
[14:30:01] ✅ Google Calendar API initialized
[14:30:02] 🔍 Loading sync settings from database...
[14:30:03] ✅ Settings loaded successfully
[14:30:03] 🔑 Found stored access token
[14:30:03] ⏱️ Token expires at: 15:30:00
[14:30:03] ⏱️ Minutes until expiry: 60
[14:30:03] ✅ Token is still valid, restoring session...
[14:30:04] ✅ Google Calendar sessie hersteld uit database
```

#### Verlopen Token:
```
[14:30:03] 🔑 Found stored access token
[14:30:03] ⏱️ Token expires at: 13:30:00
[14:30:03] ⏱️ Minutes until expiry: -60
[14:30:03] ⚠️ Token expired, clearing from database...
[14:30:04] ✅ Expired token cleared
```

#### Ontbrekende Refresh Token:
```
[14:35:00] 🔍 Checking if token needs refresh...
[14:35:01] ⚠️ No refresh token available - user needs to re-authenticate
```

#### Database Error:
```
[14:30:03] 🔍 Loading sync settings from database...
[14:30:04] ❌ Database error: permission denied for table profiles
```

---

## 🎯 Best Practices

### Voor Gebruikers:
1. **Check regelmatig de debug log** in de sync panel
2. **Let op connection errors** die in rood worden getoond
3. **Als "geen refresh token" warning**: verwacht dat je na 1 uur opnieuw moet inloggen
4. **Bij problemen**: screenshot debug log en deel met support

### Voor Developers:
1. **Implementeer Authorization Code Flow** zo snel mogelijk
2. **Monitor Edge Function logs** voor server-side errors
3. **Set up alerting** voor failed token refreshes
4. **Encrypt tokens** in database (zie `20260108_encrypt_oauth_tokens.sql`)
5. **Roteer secrets** regelmatig in Google Cloud Console

---

## 🔗 Nuttige Links

- [Google OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [Google Cloud Console](https://console.cloud.google.com)
- [Google Account Permissions](https://myaccount.google.com/permissions)
- [Google Calendar API Reference](https://developers.google.com/calendar/api/v3/reference)

---

## 📞 Support

Bij aanhoudende problemen:
1. Exporteer debug log via screenshot
2. Run database check query (zie Stap 3)
3. Check Supabase Edge Function logs
4. Neem contact op met support met alle bovenstaande info

---

**Laatst bijgewerkt**: 14 januari 2026
**Versie**: 1.0 - Met debug logging support
