# Google Calendar OAuth Fix - Refresh Token Implementatie

## 🔍 Probleem
Bij inloggen op Google Calendar kregen gebruikers de warning:
```
⚠️ No refresh_token received (using implicit flow)
Let op: geen refresh token - sessie verloopt na 1 uur
```

Dit werd veroorzaakt doordat de **implicit OAuth flow** werd gebruikt, die geen refresh tokens geeft.

---

## ✅ Oplossing
Overschakelen naar **authorization code flow** met server-side token exchange voor veilige refresh tokens.

---

## 📝 Wijzigingen

### 1. Frontend (`src/lib/googleCalendar.ts`)
**Voor:**
```typescript
tokenClient = window.google.accounts.oauth2.initTokenClient({
  // Implicit flow - geen refresh token
});
```

**Na:**
```typescript
tokenClient = window.google.accounts.oauth2.initCodeClient({
  // Authorization code flow - met refresh tokens
  ux_mode: 'popup',
});
```

### 2. Token Exchange via Server
**Nieuw:** `supabase/functions/google-oauth-exchange/index.ts`
- Ontvangt authorization code van frontend
- Wisselt code uit voor tokens **server-side** (veilig met CLIENT_SECRET)
- Retourneert access_token + refresh_token

### 3. Auto-Refresh Mechanisme
**Nieuw in:** `src/components/calendar/GoogleCalendarSync.tsx`
```typescript
setupTokenRefresh(refreshToken, expiresAt) {
  // Refresh token 5 minuten voor expiry
  // Werkt automatisch op de achtergrond
  // Gebruiker hoeft niet opnieuw in te loggen
}
```

### 4. Database Updates
Refresh token wordt nu opgeslagen:
```typescript
google_access_token: tokenResponse.access_token,
google_refresh_token: tokenResponse.refresh_token, // ✅ Nieuw!
google_token_expires_at: expiresAt.toISOString(),
```

---

## 🚀 Deployment

### Stap 1: Deploy Edge Function
```bash
supabase functions deploy google-oauth-exchange
```

### Stap 2: Stel Secrets in (Supabase Dashboard)
```
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxxxxxxx
GOOGLE_REDIRECT_URI=https://your-domain.com
```

### Stap 3: Update Google Cloud Console
- Zorg dat OAuth Client Type = "Web application"
- Voeg redirect URIs toe voor dev + prod

### Stap 4: Test
1. Ga naar Calendar Settings
2. Klik "Verbinden met Google Calendar"
3. Check debug log voor: `✅ Refresh token ontvangen`

---

## 🎯 Resultaat

**Voor:**
- ❌ Sessie verloopt na 1 uur
- ❌ Gebruiker moet opnieuw inloggen
- ⚠️ Warning message bij elke login

**Na:**
- ✅ Persistente authenticatie (tokens blijven werken)
- ✅ Auto-refresh 5 minuten voor expiry
- ✅ Gebruiker hoeft nooit opnieuw in te loggen
- ✅ Veilige token opslag (CLIENT_SECRET blijft server-side)

---

## 📚 Documentatie

- **Setup Guide:** `GOOGLE_OAUTH_CODE_FLOW_SETUP.md`
- **Security Audit:** `GOOGLE_OAUTH_SECURITY_AUDIT.md`
- **Deployment Script:** `DEPLOY_GOOGLE_OAUTH.ps1`

---

## 🔐 Security Voordelen

1. **CLIENT_SECRET blijft server-side** - Nooit geëxposeerd aan browser
2. **Authorization code flow** - Industry best practice voor confidential clients
3. **Refresh tokens encrypted at rest** - RLS policies beschermen tokens
4. **Auto-refresh mechanisme** - Vermindert attack window (tokens blijven minder lang geldig)

---

## 🐛 Troubleshooting

| Symptom | Oplossing |
|---------|-----------|
| Nog steeds "no refresh token" | Check OAuth client type in Google Console (moet "Web application" zijn) |
| "redirect_uri_mismatch" | Verify redirect URIs in Google Console exact matchen |
| "invalid_grant" error | Authorization code al gebruikt of verlopen - probeer opnieuw |
| Edge Function errors | Check Supabase secrets zijn ingesteld |

---

## ✨ Bonus Features

- **Debug logging** - Zie exact wat er gebeurt in de OAuth flow
- **Connection status** - Live indicator of Google Calendar connected is
- **Webhook auto-renewal** - Intelligente webhook expiry detection
- **Graceful error handling** - User-friendly error messages

---

## 🎉 Status

- [x] Code changes
- [x] Edge Function created
- [x] Auto-refresh implemented
- [x] Documentation complete
- [ ] Secrets configured (manual step)
- [ ] Edge Function deployed (manual step)
- [ ] Tested in production (manual step)
