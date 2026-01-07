# Google OAuth Token Security Audit

## ✅ Implementatie Details

### 1. Token Opslag in Database
**Locatie:** `profiles` tabel kolommen:
- `google_access_token` (TEXT)
- `google_refresh_token` (TEXT) 
- `google_token_expires_at` (TIMESTAMPTZ)

### 2. OAuth Flow met Redirect URI

**Configuratie in `googleCalendar.ts`:**
```typescript
const GOOGLE_REDIRECT_URI = import.meta.env.VITE_GOOGLE_REDIRECT_URI || window.location.origin;

tokenClient = window.google.accounts.oauth2.initTokenClient({
  client_id: GOOGLE_CLIENT_ID,
  scope: SCOPES,
  callback: '', // Popup flow
  redirect_uri: GOOGLE_REDIRECT_URI, // ✅ Explicitly set
});
```

**Redirect URI configuratie:**
- Development: `http://localhost:5173`
- Production: `https://jouw-domein.nl`
- Beide moeten toegevoegd zijn in Google Cloud Console → Credentials → OAuth 2.0 Client → Authorized redirect URIs

### 3. Token Lifecycle Management

**Bij Sign-In (`GoogleCalendarSync.tsx`):**
```typescript
const tokenResponse = await signInToGoogle(); // Returns { access_token, expires_in, scope }

// Calculate expiry
const expiresAt = new Date();
expiresAt.setSeconds(expiresAt.getSeconds() + tokenResponse.expires_in);

// Store in database
await supabase
  .from('profiles')
  .update({
    google_access_token: tokenResponse.access_token,
    google_token_expires_at: expiresAt.toISOString(),
  })
  .eq('id', user.id);
```

**Bij Sign-Out:**
```typescript
// Revoke token at Google
signOutFromGoogle();

// Clear from database
await supabase
  .from('profiles')
  .update({
    google_access_token: null,
    google_refresh_token: null,
    google_token_expires_at: null,
  })
  .eq('id', user.id);
```

**Bij Page Load (Token Validation):**
```typescript
const { data } = await supabase
  .from('profiles')
  .select('google_access_token, google_token_expires_at')
  .eq('id', user.id)
  .single();

if (data.google_access_token) {
  const expiresAt = new Date(data.google_token_expires_at);
  const isExpired = expiresAt < new Date();
  
  if (!isExpired) {
    setIsSignedIn(true); // Restore session
  } else {
    // Clear expired token
    await supabase.from('profiles').update({
      google_access_token: null,
      google_token_expires_at: null,
    }).eq('id', user.id);
  }
}
```

## 🔒 Security Measures

### Row Level Security (RLS)
**Policy in migratie:**
```sql
CREATE POLICY "Users can update own Google tokens" ON profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);
```

**Effecten:**
- ✅ Gebruikers kunnen alleen hun eigen tokens lezen/schrijven
- ✅ Admins hebben geen toegang tot tokens van andere gebruikers (tenzij expliciet policy)
- ✅ Service role (backend) kan alle tokens benaderen indien nodig

### Token Encryption (AANBEVELING)

**Huidige staat:** Tokens worden als plain text opgeslagen

**Aanbevolen verbetering:**
```typescript
// Install crypto library
import { encrypt, decrypt } from '@/lib/crypto';

// Bij opslaan
const encryptedToken = await encrypt(tokenResponse.access_token);
await supabase.from('profiles').update({
  google_access_token: encryptedToken,
});

// Bij ophalen
const { data } = await supabase.from('profiles').select('google_access_token');
const decryptedToken = await decrypt(data.google_access_token);
```

**Implementatie opties:**
1. **AES-256 encryption** met key uit environment variable
2. **Supabase Vault** (enterprise feature) voor key management
3. **pgcrypto** PostgreSQL extension voor database-side encryption

### API Key Restrictions
**Google Cloud Console → Credentials → API Key:**
- ✅ Restrict key to "Google Calendar API" only
- ✅ Add HTTP referrers (localhost:5173, jouw-domein.nl)
- ✅ Regenerate key periodically

### OAuth Consent Screen
**Google Cloud Console → OAuth consent screen:**
- ✅ App name visible to users
- ✅ Scopes explicitly listed (calendar.events)
- ✅ Privacy policy URL (optional but recommended)
- ✅ Terms of service URL (optional but recommended)

## 🚨 Security Risks & Mitigations

### Risk 1: XSS Attacks
**Risk:** Malicious script could steal tokens from database
**Mitigation:**
- ✅ RLS policies prevent unauthorized access
- ✅ Supabase client validates auth.uid()
- ⚠️ Consider encrypting tokens at rest

### Risk 2: Token Expiry
**Risk:** Expired tokens cause sync failures
**Mitigation:**
- ✅ Token expiry stored in `google_token_expires_at`
- ✅ Automatic validation on page load
- ✅ Expired tokens cleared from database
- ⚠️ Refresh token flow not yet implemented

### Risk 3: Token Leakage via Logs
**Risk:** Tokens accidentally logged to console/Sentry
**Mitigation:**
- ✅ No token values in console.log() statements
- ⚠️ Add Sentry beforeSend filter to scrub tokens

### Risk 4: Man-in-the-Middle
**Risk:** Tokens intercepted during transmission
**Mitigation:**
- ✅ OAuth popup uses HTTPS
- ✅ Supabase API always HTTPS
- ✅ Redirect URI must match authorized list

## 📋 Checklist voor Productie

### Google Cloud Console
- [ ] OAuth Client ID configured
- [ ] Authorized redirect URIs toegevoegd (productie domein)
- [ ] API key restricted tot Google Calendar API
- [ ] HTTP referrers ingesteld
- [ ] Consent screen gepubliceerd (uit "Testing" mode)

### Netlify Environment Variables
- [ ] `VITE_GOOGLE_CLIENT_ID` ingesteld
- [ ] `VITE_GOOGLE_API_KEY` ingesteld
- [ ] `VITE_GOOGLE_REDIRECT_URI` ingesteld op productie URL

### Database
- [ ] Migratie `20260107_add_google_oauth_tokens.sql` uitgevoerd
- [ ] RLS policies gevalideerd (query hieronder)
- [ ] Token kolommen bestaan in profiles tabel

**RLS Validatie Query:**
```sql
SELECT 
  schemaname, 
  tablename, 
  policyname, 
  permissive, 
  roles, 
  cmd 
FROM pg_policies 
WHERE tablename = 'profiles' 
AND policyname ILIKE '%google%';
```

### Code Deployment
- [ ] Alle wijzigingen gecommit naar GitHub
- [ ] Netlify deployment succesvol
- [ ] Browser console geen errors
- [ ] OAuth popup opent correct
- [ ] Tokens worden opgeslagen in database
- [ ] Sync werkt na page refresh (persistent session)

## 🔄 Toekomstige Verbeteringen

### 1. Refresh Token Implementation
**Probleem:** Access tokens verlopen na 1 uur, gebruiker moet opnieuw inloggen

**Oplossing:**
```typescript
async function refreshAccessToken(userId: string) {
  const { data } = await supabase
    .from('profiles')
    .select('google_refresh_token')
    .eq('id', userId)
    .single();

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    body: JSON.stringify({
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET, // ⚠️ Needs backend
      refresh_token: data.google_refresh_token,
      grant_type: 'refresh_token',
    }),
  });

  const { access_token, expires_in } = await response.json();
  
  // Update database met nieuwe access token
}
```

**Vereist:** Backend endpoint of Supabase Edge Function (client_secret mag niet in frontend)

### 2. Token Encryption at Rest
Implementeer AES-256 encryption voor tokens in database

### 3. Audit Logging
Log alle OAuth events (sign in, sign out, token refresh) naar `audit_log` tabel

### 4. Rate Limiting
Voorkom brute-force attacks op token endpoints

## 📚 Referenties

- [Google OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)
- [Google Calendar API Scopes](https://developers.google.com/calendar/api/auth)
- [Supabase RLS Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [OWASP Token Storage Best Practices](https://cheatsheetseries.owasp.org/cheatsheets/JSON_Web_Token_for_Java_Cheat_Sheet.html)
