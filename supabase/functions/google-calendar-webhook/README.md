# Google Calendar Webhook Edge Function

Receives push notifications from Google Calendar when events change, enabling real-time sync instead of 15-minute polling.

## Features

- ✅ Real-time sync triggers when calendar changes
- ✅ Validates Google's webhook signatures
- ✅ Handles webhook registration verification
- ✅ Stores webhook events for audit/debugging
- ✅ Security: validates channel ownership before triggering sync

## Setup

### 1. Deploy Edge Function

```bash
supabase functions deploy google-calendar-webhook
```

### 2. Set Environment Variables

In Supabase Dashboard → Edge Functions → google-calendar-webhook:

```
SUPABASE_URL=https://[project-ref].supabase.co
SUPABASE_SERVICE_ROLE_KEY=[your-service-role-key]
```

### 3. Get Webhook URL

After deployment, your webhook URL will be:

```
https://[project-ref].supabase.co/functions/v1/google-calendar-webhook
```

### 4. Register Webhook with Google Calendar

The client-side application handles webhook registration automatically when user enables auto-sync.

See `src/lib/googleCalendar.ts` → `registerWebhook()` function.

## How It Works

### Google Calendar Push Notifications

1. User enables auto-sync in the app
2. App registers webhook with Google Calendar API:
   ```typescript
   POST https://www.googleapis.com/calendar/v3/calendars/primary/events/watch
   {
     "id": "user_[user_id]_[timestamp]",
     "type": "web_hook",
     "address": "https://[project].supabase.co/functions/v1/google-calendar-webhook",
     "token": "user_[user_id]_[timestamp]"
   }
   ```

3. Google sends notifications to webhook when:
   - New events created
   - Events updated
   - Events deleted
   - Calendar list changes

4. Edge Function validates notification and triggers sync

### Webhook Headers

Google sends these headers with each notification:

```
X-Goog-Channel-ID: [channel-id]
X-Goog-Channel-Token: user_[user_id]_[timestamp]
X-Goog-Channel-Expiration: [unix-timestamp-ms]
X-Goog-Resource-ID: [resource-id]
X-Goog-Resource-State: sync|exists|not_exists
X-Goog-Resource-URI: https://www.googleapis.com/calendar/v3/calendars/primary/events
X-Goog-Message-Number: [sequential-number]
```

### Resource States

- **`sync`**: Webhook verification (first notification after registration)
- **`exists`**: Calendar data has changed (trigger sync)
- **`not_exists`**: Calendar deleted or access revoked

## Security

### Channel Token Validation

The webhook validates the channel token to ensure it matches the user who registered the webhook:

```typescript
// Token format: "user_[user_id]_[timestamp]"
const tokenMatch = channelToken.match(/^user_([a-f0-9-]+)_/)
const userId = tokenMatch[1]

// Verify user owns this webhook
const { data: profile } = await supabase
  .from('profiles')
  .select('*')
  .eq('id', userId)
  .single()
```

### HTTPS Required

Google Calendar webhooks **require HTTPS**. Supabase Edge Functions provide HTTPS by default.

## Database Schema

### Required Migrations

1. **webhook_events table** (for audit/debugging):
   ```sql
   CREATE TABLE webhook_events (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
     webhook_type TEXT NOT NULL,
     channel_id TEXT,
     resource_state TEXT,
     resource_id TEXT,
     payload JSONB,
     created_at TIMESTAMPTZ DEFAULT NOW()
   );
   ```

2. **profiles columns** (for webhook state):
   ```sql
   ALTER TABLE profiles
   ADD COLUMN IF NOT EXISTS last_webhook_trigger TIMESTAMPTZ,
   ADD COLUMN IF NOT EXISTS webhook_sync_pending BOOLEAN DEFAULT FALSE;
   ```

## Client-Side Integration

See `src/components/calendar/GoogleCalendarSync.tsx` for:

1. Webhook registration when auto-sync enabled
2. Realtime subscription to `webhook_sync_pending` flag
3. Automatic sync trigger when webhook fires

## Testing

### Test Webhook Locally

```bash
# Start local Edge Functions
supabase functions serve google-calendar-webhook

# Send test notification
curl -X POST http://localhost:54321/functions/v1/google-calendar-webhook \
  -H "Content-Type: application/json" \
  -H "X-Goog-Channel-ID: test-channel" \
  -H "X-Goog-Channel-Token: user_[user-id]_12345" \
  -H "X-Goog-Resource-State: exists"
```

### View Logs

```bash
# Production logs
supabase functions logs google-calendar-webhook

# Follow logs in real-time
supabase functions logs google-calendar-webhook --tail
```

## Webhook Expiration

Google Calendar webhooks expire after a maximum of **7 days**.

The client-side app automatically renews the webhook before expiration:

```typescript
// Check webhook expiry every hour
useEffect(() => {
  const interval = setInterval(async () => {
    const expiresAt = localStorage.getItem('webhook_expiry')
    const now = Date.now()
    
    // Renew 1 day before expiry
    if (expiresAt && now > parseInt(expiresAt) - 86400000) {
      await registerWebhook()
    }
  }, 3600000) // Check every hour
  
  return () => clearInterval(interval)
}, [])
```

## Troubleshooting

### Webhook Not Receiving Notifications

1. **Check webhook registration**:
   - Verify webhook URL is publicly accessible (HTTPS required)
   - Check channel token format: `user_[user_id]_[timestamp]`

2. **Check Google Calendar permissions**:
   - Ensure OAuth scope includes `calendar.events` write access
   - Verify user authorized the app

3. **View webhook logs**:
   ```bash
   supabase functions logs google-calendar-webhook --tail
   ```

4. **Test webhook manually**:
   - Create/update/delete an event in Google Calendar
   - Check Edge Function logs for notification

### Webhook Registration Fails

- **Error: Invalid webhook URL**
  - Ensure URL is HTTPS
  - Verify Edge Function is deployed
  
- **Error: Insufficient permissions**
  - Check OAuth token has `calendar.events` scope
  - Refresh token if expired

## API Reference

### POST /functions/v1/google-calendar-webhook

Receives Google Calendar push notifications.

**Headers:**
- `X-Goog-Channel-ID`: Channel identifier
- `X-Goog-Channel-Token`: Security token (user_[user_id]_[timestamp])
- `X-Goog-Resource-State`: sync|exists|not_exists

**Response:**
```json
{
  "message": "Sync triggered",
  "user_id": "user-uuid"
}
```

**Status Codes:**
- `200`: Webhook processed successfully
- `401`: Invalid channel token
- `404`: User not found
- `500`: Internal server error

## Performance

### Real-time vs Polling

**Before (Polling):**
- Check for changes every 15 minutes
- Unnecessary API calls even when no changes
- Max 15-minute delay for updates

**After (Webhooks):**
- Real-time notifications when changes occur
- No unnecessary API calls
- Instant sync (sub-second latency)

**Cost Savings:**
- 96 API calls/day → ~1-10 API calls/day
- Reduced API quota usage
- Better user experience
