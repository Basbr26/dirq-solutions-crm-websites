# Google Calendar Integration - Supabase Edge Function Setup

## Overzicht
De Google Calendar token refresh gebeurt nu **server-side** via een Supabase Edge Function. Dit houdt de `GOOGLE_CLIENT_SECRET` veilig (niet in browser code).

## Architecture

```
Browser (GoogleCalendarSyncV2)
    ↓ refresh_token
Supabase Edge Function (google-calendar-refresh)
    ↓ client_id + client_secret + refresh_token
Google OAuth API
    ↓ nieuwe access_token
Edge Function
    ↓ access_token + expires_at
Browser (opslaan in database)
```

## Setup Stappen

### 1. Supabase Secrets Configureren

Ga naar **Supabase Dashboard** → Jouw project → **Settings** → **Edge Functions**:

```bash
# Stel secrets in (via Supabase CLI of Dashboard)
GOOGLE_CLIENT_ID=jouw-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-jouw-client-secret
```

**Let op:** Deze secrets zijn **server-side only** en NIET zichtbaar in de browser.

### 2. Edge Function Deployen

```bash
# Zorg dat Supabase CLI geïnstalleerd is
npm install -g supabase

# Login bij Supabase (eenmalig)
supabase login

# Link project (eenmalig)
supabase link --project-ref jouw-project-ref

# Deploy Edge Function
supabase functions deploy google-calendar-refresh
```

### 3. Environment Variables (.env)

```bash
# Frontend heeft GEEN CLIENT_SECRET meer nodig!
VITE_GOOGLE_CLIENT_ID=jouw-google-client-id.apps.googleusercontent.com
VITE_GOOGLE_API_KEY=jouw-api-key
VITE_SUPABASE_URL=https://jouw-project.supabase.co
VITE_SUPABASE_ANON_KEY=jouw-anon-key

# CLIENT_SECRET is NU ALLEEN in Supabase Edge Function secrets!
# NIET meer in .env (veiliger)
```

## Edge Function Details

### Endpoint
```
POST https://jouw-project.supabase.co/functions/v1/google-calendar-refresh
```

### Request Body
```json
{
  "refresh_token": "1//04... (Google refresh token)"
}
```

### Response (Success)
```json
{
  "access_token": "ya29.... (nieuwe Google access token)",
  "expires_at": "2026-01-08T15:30:00.000Z",
  "expires_in": 3600
}
```

### Response (Error)
```json
{
  "error": "Token refresh failed",
  "details": "invalid_grant: Token has been expired or revoked."
}
```

## Security Voordelen

✅ **CLIENT_SECRET blijft server-side** (niet in browser code)  
✅ **CORS protected** (alleen jouw domein kan Edge Function aanroepen)  
✅ **Rate limiting** via Supabase Edge Functions  
✅ **Logging** in Supabase Dashboard (Functions → Logs)  

## Flow in GoogleCalendarSyncV2

```typescript
// Auto-refresh 5 minuten voor expiry
async function refreshTokenSilently(refreshToken: string) {
  // googleCalendar.ts roept Edge Function aan
  const result = await refreshAccessToken(refreshToken);
  
  if (result) {
    // Update access_token in database
    await supabase.from('profiles').update({
      google_access_token: result.access_token,
      google_token_expires_at: new Date(Date.now() + result.expires_in * 1000).toISOString(),
    });
  }
}
```

## Testing

### Lokaal testen (met Supabase CLI)
```bash
# Start lokale Supabase (inclusief Edge Functions)
supabase start

# Edge Function draait op:
# http://localhost:54321/functions/v1/google-calendar-refresh

# Test met curl
curl -X POST http://localhost:54321/functions/v1/google-calendar-refresh \
  -H "Content-Type: application/json" \
  -H "apikey: jouw-anon-key" \
  -d '{"refresh_token": "1//04..."}'
```

### Productie testen
1. Deploy Edge Function naar Supabase
2. Stel secrets in via Dashboard
3. Herstart Edge Function (Dashboard → Functions → Restart)
4. Test via GoogleCalendarSyncV2 in app

## Troubleshooting

### Error: "Server configuration error"
- Check of `GOOGLE_CLIENT_ID` en `GOOGLE_CLIENT_SECRET` ingesteld zijn in Supabase Secrets

### Error: "Token refresh failed"
- Refresh token kan verlopen zijn (gebeurt als user access revoked)
- User moet opnieuw inloggen via "Verbind met Google Calendar"

### Edge Function logs bekijken
```bash
# Via Supabase CLI
supabase functions logs google-calendar-refresh

# Of via Dashboard:
# Supabase Dashboard → Functions → google-calendar-refresh → Logs
```

## Kosten

Supabase Edge Functions pricing:
- **Gratis tier:** 500,000 invocations/maand
- Token refresh gebeurt max. 1x per uur per gebruiker
- 100 actieve users = ~2,400 calls/maand (ruim binnen gratis tier)

## Volgende Stappen

1. ✅ Edge Function gemaakt (`supabase/functions/google-calendar-refresh/`)
2. ✅ `googleCalendar.ts` aangepast om Edge Function te gebruiken
3. ⏳ Secrets instellen in Supabase Dashboard
4. ⏳ Edge Function deployen: `supabase functions deploy google-calendar-refresh`
5. ⏳ Database migrations uitvoeren (zie `GOOGLE_CALENDAR_SETUP.md`)
6. ⏳ Testen: reconnect Google Calendar, enable auto-sync

## Resources

- [Supabase Edge Functions Docs](https://supabase.com/docs/guides/functions)
- [Google OAuth 2.0 Refresh Token](https://developers.google.com/identity/protocols/oauth2/web-server#offline)
- [Edge Function Secrets](https://supabase.com/docs/guides/functions/secrets)
