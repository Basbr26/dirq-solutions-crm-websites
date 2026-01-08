# Google Calendar Token Refresh Edge Function

## Purpose
This Edge Function refreshes Google Calendar OAuth access tokens using refresh tokens. This is necessary because access tokens expire after 1 hour, and the CLIENT_SECRET must be kept server-side for security.

## Environment Variables Required

Set these in Supabase Dashboard → Edge Functions → Secrets:

```bash
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
```

## Deployment

```bash
# Deploy from project root
supabase functions deploy google-calendar-refresh

# Or deploy with environment variables
supabase functions deploy google-calendar-refresh \
  --env-file ./supabase/.env.local
```

## Usage

Called from frontend code:

```typescript
import { refreshAccessToken } from '@/lib/googleCalendar';

const newToken = await refreshAccessToken(refreshToken);
```

## API

**Endpoint:** `POST /functions/v1/google-calendar-refresh`

**Request:**
```json
{
  "refresh_token": "1//abc123..."
}
```

**Response:**
```json
{
  "access_token": "ya29.a0...",
  "expires_in": 3600
}
```

**Errors:**
- `400` - Missing refresh_token
- `500` - Server configuration error or token refresh failed
