# Google OAuth Code Exchange Edge Function

## Purpose
Exchanges Google OAuth authorization code for access and refresh tokens server-side.

## Why Server-Side?
- Keeps `GOOGLE_CLIENT_SECRET` secure (never exposed to browser)
- Follows OAuth 2.0 best practices for confidential clients
- Enables refresh token flow for persistent authentication

## Setup

### 1. Set Supabase Secrets
```bash
# Via Supabase Dashboard → Project Settings → Edge Functions → Secrets
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-secret-key
GOOGLE_REDIRECT_URI=https://your-domain.com
```

### 2. Deploy Function
```bash
supabase functions deploy google-oauth-exchange
```

### 3. Test Function
```bash
curl -X POST https://your-project.supabase.co/functions/v1/google-oauth-exchange \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"code":"4/0AY0e-g7..."}'
```

## Request Format
```typescript
POST /functions/v1/google-oauth-exchange
Headers:
  Content-Type: application/json
  Authorization: Bearer <anon_key>

Body:
{
  "code": "4/0AY0e-g7XYZ...",
  "redirect_uri": "https://your-domain.com" // optional
}
```

## Response Format
```typescript
{
  "access_token": "ya29.a0AfH6...",
  "refresh_token": "1//0gXYZ...", // Only on first auth or with prompt=consent
  "expires_at": "2026-01-15T23:51:08.000Z",
  "expires_in": 3600,
  "scope": "https://www.googleapis.com/auth/calendar.events"
}
```

## Error Handling
- 400: Missing `code` parameter
- 500: Missing Google OAuth credentials in secrets
- 500: Token exchange failed (invalid code, expired, etc.)

## Security Notes
1. `GOOGLE_CLIENT_SECRET` never leaves server
2. CORS headers configured via `_shared/cors.ts`
3. Authorization code can only be used once
4. Refresh token is only returned on:
   - First authorization
   - When using `prompt=consent` (re-authorization)

## Related Files
- `/src/lib/googleCalendar.ts` - Client-side OAuth flow
- `/supabase/functions/google-calendar-refresh/index.ts` - Token refresh
- `/src/components/calendar/GoogleCalendarSync.tsx` - UI component
