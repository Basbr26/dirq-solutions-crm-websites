# Google OAuth Setup - Authorization Code Flow met Refresh Tokens

## 🔧 Probleem Opgelost
**Voor:** Implicit flow zonder refresh token → sessie verloopt na 1 uur  
**Na:** Authorization code flow met refresh tokens → persistente authenticatie

---

## 📋 Stap 1: Google Cloud Console Configuratie

### 1.1 OAuth Client Type Wijzigen (indien nodig)
1. Ga naar [Google Cloud Console](https://console.cloud.google.com)
2. Selecteer je project
3. Navigeer naar **APIs & Services** → **Credentials**
4. Klik op je OAuth 2.0 Client ID

**Zorg ervoor dat het type is: "Web application"** (niet "Single-page application")

### 1.2 Authorized Redirect URIs
Voeg BEIDE toe:
```
http://localhost:5173
https://your-production-domain.com
```

### 1.3 OAuth Consent Screen
Zorg dat deze scopes zijn toegevoegd:
- `https://www.googleapis.com/auth/calendar.events`
- `https://www.googleapis.com/auth/userinfo.email`

---

## 🔐 Stap 2: Google Client Secret Ophalen

1. In **Credentials** → klik op je OAuth 2.0 Client ID
2. Kopieer de **Client Secret** (naast Client ID)
3. **BELANGRIJK:** Deze secret moet je NOOIT in frontend code zetten!

---

## ⚙️ Stap 3: Supabase Edge Function Secrets Instellen

### Via Supabase Dashboard
1. Ga naar [Supabase Dashboard](https://supabase.com/dashboard)
2. Selecteer je project
3. **Project Settings** → **Edge Functions** → **Secrets**
4. Voeg toe:

```bash
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxxxxxxxxxxxxxxxx
GOOGLE_REDIRECT_URI=https://your-domain.com
```

### Via Supabase CLI (optioneel)
```bash
# Login first
supabase login

# Link to project
supabase link --project-ref your-project-ref

# Set secrets
supabase secrets set GOOGLE_CLIENT_ID=your-client-id
supabase secrets set GOOGLE_CLIENT_SECRET=your-secret
supabase secrets set GOOGLE_REDIRECT_URI=https://your-domain.com
```

---

## 🚀 Stap 4: Deploy Edge Functions

### Deploy nieuwe oauth-exchange functie
```bash
cd "c:\Dirq apps\dirq-solutions-crmwebsite"

# Deploy google-oauth-exchange functie
supabase functions deploy google-oauth-exchange

# Verify deployment
supabase functions list
```

### Test Edge Function
```bash
# Test met curl (vervang YOUR_ANON_KEY en YOUR_PROJECT_URL)
curl -X POST https://YOUR_PROJECT_URL.supabase.co/functions/v1/google-oauth-exchange \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"code":"test-code-from-oauth"}'
```

**Verwachte output:**
```json
{
  "error": "Token exchange failed",
  "details": "invalid_grant"
}
```
Dit is normaal voor een test code - in productie komt de echte code van Google OAuth.

---

## 🔄 Stap 5: Frontend Environment Variables

### Development (.env.local)
```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
VITE_GOOGLE_API_KEY=your-api-key
VITE_GOOGLE_REDIRECT_URI=http://localhost:5173
```

### Production (Netlify Environment Variables)
1. Ga naar Netlify Dashboard → Site Settings → Environment Variables
2. Voeg toe:
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_GOOGLE_CLIENT_ID=your-client-id
VITE_GOOGLE_API_KEY=your-api-key
VITE_GOOGLE_REDIRECT_URI=https://your-domain.com
```

---

## ✅ Stap 6: Testen

### 6.1 Development Testen
```bash
npm run dev
```

1. Navigeer naar Calendar Settings
2. Klik op "Verbinden met Google Calendar"
3. Voltooi OAuth flow
4. **Check debug log voor:**
   ```
   ✅ Refresh token ontvangen - persistente authenticatie actief
   🔄 Setting up auto-refresh in X minutes
   ```

### 6.2 Verificatie in Database
```sql
-- Check of refresh token is opgeslagen
SELECT 
  id,
  email,
  google_access_token IS NOT NULL as has_access_token,
  google_refresh_token IS NOT NULL as has_refresh_token,
  google_token_expires_at
FROM profiles
WHERE google_access_token IS NOT NULL;
```

**Verwacht:** `has_refresh_token` = `true`

### 6.3 Auto-Refresh Testen
1. Wacht tot de refresh tijd (5 minuten voor expiry)
2. Check debug log:
   ```
   🔄 Auto-refreshing access token...
   ✅ Token auto-refreshed successfully
   ```

---

## 🔒 Security Checklist

- [ ] ✅ `GOOGLE_CLIENT_SECRET` staat ALLEEN in Supabase Edge Function secrets
- [ ] ✅ `GOOGLE_CLIENT_SECRET` staat NIET in .env files
- [ ] ✅ `GOOGLE_CLIENT_SECRET` staat NIET in frontend code
- [ ] ✅ Redirect URIs in Google Console matchen exacte URLs
- [ ] ✅ Refresh tokens worden veilig opgeslagen in database (RLS policies)
- [ ] ✅ Auto-refresh is geconfigureerd (5 min voor expiry)

---

## 🐛 Troubleshooting

### Error: "redirect_uri_mismatch"
**Oplossing:** Check dat redirect URI in Google Console EXACT matcht met `VITE_GOOGLE_REDIRECT_URI`

### Error: "No refresh_token received"
**Oorzaken:**
1. OAuth client type is "Single-page application" → wijzig naar "Web application"
2. User heeft eerder consent gegeven → forceer hernieuwde consent:
   ```typescript
   // In googleCalendar.ts
   tokenClient.requestCode({ prompt: 'consent' });
   ```

### Error: "Token exchange failed: invalid_grant"
**Oorzaken:**
1. Authorization code is al gebruikt (codes zijn single-use)
2. Authorization code is verlopen (10 minuten geldig)
3. `GOOGLE_CLIENT_SECRET` in Edge Function is verkeerd

### Tokens verdwijnen na 1 uur
**Controle:**
```sql
-- Check of refresh token aanwezig is
SELECT google_refresh_token IS NOT NULL as has_refresh FROM profiles WHERE id = 'user-id';
```
Als `false`: Herverbind met Google Calendar (oude tokens verwijderen eerst)

---

## 📊 Flow Diagram

```
┌─────────────┐
│   Browser   │
└──────┬──────┘
       │ 1. Click "Connect"
       ▼
┌─────────────────────┐
│ Google OAuth Popup  │ 2. User authorizes
└──────┬──────────────┘
       │ 3. Returns authorization code
       ▼
┌────────────────────────────┐
│ Frontend (googleCalendar)  │
└──────┬─────────────────────┘
       │ 4. POST /functions/v1/google-oauth-exchange
       │    { code: "..." }
       ▼
┌─────────────────────────────┐
│ Edge Function (server-side) │
│ - Has CLIENT_SECRET         │ 5. Exchange code for tokens
│ - POST to Google OAuth API  │
└──────┬──────────────────────┘
       │ 6. Returns: { access_token, refresh_token, expires_in }
       ▼
┌────────────────────────────┐
│ Frontend stores in DB      │ 7. Store tokens in profiles table
│ - google_access_token      │
│ - google_refresh_token     │
│ - google_token_expires_at  │
└────────────────────────────┘
       │
       │ 8. Setup auto-refresh (5 min before expiry)
       ▼
┌──────────────────────────────┐
│ Auto-refresh cycle           │
│ - Calls /google-calendar-    │
│   refresh                    │
│ - Updates access_token       │
│ - Re-schedules next refresh  │
└──────────────────────────────┘
```

---

## 📝 Deployment Checklist

### Development
- [x] Code changes gemaakt
- [ ] Edge Function gedeployed: `supabase functions deploy google-oauth-exchange`
- [ ] .env.local variables geconfigureerd
- [ ] Lokaal getest

### Production
- [ ] Google Cloud Console redirect URIs updated
- [ ] Supabase Edge Function secrets ingesteld
- [ ] Netlify environment variables ingesteld
- [ ] Edge Function deployed naar productie
- [ ] Productie getest
- [ ] Monitoring ingesteld (Supabase logs)

---

## 🎯 Volgende Stappen

1. **Deploy Edge Function:**
   ```bash
   supabase functions deploy google-oauth-exchange
   ```

2. **Test lokaal:**
   - Start dev server
   - Verbind met Google Calendar
   - Check debug logs

3. **Deploy naar productie:**
   - Push naar GitHub
   - Netlify auto-deploy
   - Test in productie

4. **Monitor:**
   - Check Supabase Edge Function logs
   - Check database voor refresh tokens
   - Check auto-refresh werkt

---

## 📚 Related Files

- `/src/lib/googleCalendar.ts` - OAuth client code
- `/src/components/calendar/GoogleCalendarSync.tsx` - UI component
- `/supabase/functions/google-oauth-exchange/index.ts` - Token exchange
- `/supabase/functions/google-calendar-refresh/index.ts` - Token refresh
- `GOOGLE_OAUTH_SECURITY_AUDIT.md` - Security documentation
