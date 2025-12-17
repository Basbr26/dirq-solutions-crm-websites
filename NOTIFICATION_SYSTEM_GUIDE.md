# Intelligent Notification System

Complete notification management system for Dirq HR platform with smart batching, multi-channel delivery, escalations, and AI-driven priority scoring.

## Features

- 🎯 **Smart Batching**: Reduces notification fatigue with intelligent grouping (instant/hourly/daily/weekly)
- 📧 **Multi-Channel**: In-app, email (Resend), SMS (Twilio), and push notifications
- 🚨 **Automatic Escalation**: Escalates overdue tasks to managers with automatic notifications
- 🤖 **AI Priority Scoring**: Machine learning-based priority calculation with legal/compliance modifiers
- ⏰ **Smart Scheduling**: Quiet hours, vacation mode, and user preferences
- 📊 **Audit Trail**: Complete logging of all notification delivery attempts
- 🔔 **Push Notifications**: PWA support with service workers for offline capability
- 📱 **Responsive UI**: Mobile-optimized notification center and preferences panel

## Architecture

```
src/
├── lib/notifications/
│   ├── types.ts              # TypeScript interfaces
│   ├── templates.ts          # Notification templates
│   ├── batching.ts           # Smart batching engine
│   ├── channelSelector.ts    # Channel routing logic
│   ├── escalation.ts         # Escalation rules
│   ├── router.ts             # Notification router service
│   ├── pushClient.ts         # Web push implementation
│   └── priorityScorer.ts     # Priority calculation
├── email/
│   └── resendClient.ts       # Resend email service
├── sms/
│   └── twilioClient.ts       # Twilio SMS service
├── components/notifications/
│   ├── NotificationCenter.tsx      # Main notification hub
│   ├── NotificationCard.tsx        # Individual notification card
│   └── NotificationPreferences.tsx # User settings dialog
├── pages/
│   └── Notifications.tsx     # Notification page
supabase/
├── migrations/
│   └── 20251217_notifications_system.sql  # Database schema
└── functions/
    ├── process-notifications/      # Send queued notifications
    ├── check-escalations/          # Escalate overdue tasks
    └── send-digests/               # Compile and send digests
public/
└── sw.js                     # Service worker for push notifications
```

## Database Schema

### notifications
```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY,
  recipient_id UUID NOT NULL REFERENCES auth.users(id),
  type TEXT NOT NULL, -- poortwachter_week1, leave_approval, etc.
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  priority TEXT NOT NULL CHECK (priority IN ('critical', 'high', 'normal', 'low')),
  channels TEXT[] NOT NULL DEFAULT '{"in_app"}',
  actions JSONB, -- Button actions and CTAs
  deep_link TEXT, -- Internal app link
  related_entity_type TEXT, -- e.g., "sick_leave_case"
  related_entity_id UUID, -- Reference to entity
  read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMP,
  actioned BOOLEAN DEFAULT FALSE,
  actioned_at TIMESTAMP,
  scheduled_send TIMESTAMP DEFAULT NOW(),
  sent_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### notification_preferences
```sql
CREATE TABLE notification_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id),
  preferences JSONB DEFAULT '{
    "digest_preference": "daily",
    "quiet_hours": {"enabled": true, "start": "22:00", "end": "08:00"},
    "vacation_mode": {"enabled": false},
    "channels": {"in_app": true, "email": true, "sms": false, "push": true},
    "priority_thresholds": {"email": "normal", "sms": "critical", "push": "high"},
    "notification_types": {}
  }',
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### escalations
```sql
CREATE TABLE escalations (
  id UUID PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES tasks(id),
  escalated_from UUID NOT NULL REFERENCES auth.users(id),
  escalated_to UUID NOT NULL REFERENCES auth.users(id),
  reason TEXT,
  resolved BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### notification_logs
```sql
CREATE TABLE notification_logs (
  id UUID PRIMARY KEY,
  notification_id UUID NOT NULL REFERENCES notifications(id),
  channel TEXT NOT NULL, -- in_app, email, sms, push
  recipient_id UUID REFERENCES auth.users(id),
  external_id TEXT, -- Resend message_id, Twilio sid, etc.
  status TEXT NOT NULL CHECK (status IN ('pending', 'sent', 'failed', 'bounced', 'complained')),
  error_message TEXT,
  sent_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);
```

## Notification Types

### Poortwachter (Wet Poortwachter - Work-Related Health Issues)
- **poortwachter_week1**: First absence notification (24 hours)
- **poortwachter_week6**: 6-week milestone notification (critical)
- **poortwachter_week42**: 42-day milestone notification
- **poortwachter_deadline**: Deadline approaching for response

### Leave Management
- **leave_approval_needed**: Manager approval required
- **leave_approved**: Leave approved notification
- **leave_rejected**: Leave rejection notice
- **leave_expiring**: PTO balance expiring

### Tasks & Approvals
- **task_assigned**: New task assignment
- **task_overdue**: Task deadline passed
- **task_urgent**: Task becoming urgent
- **document_signature_needed**: Signature required
- **contract_expiring**: Contract renewal needed

### Team & System
- **team_update**: Team announcement
- **social_notification**: Colleague message
- **system_maintenance**: System notifications
- **compliance_reminder**: Legal/compliance deadline

## Setup

### 1. Environment Variables

```env
# Resend Email
REACT_APP_RESEND_API_KEY=re_xxx

# Twilio SMS
REACT_APP_TWILIO_ACCOUNT_SID=AC_xxx
REACT_APP_TWILIO_AUTH_TOKEN=xxx
REACT_APP_TWILIO_PHONE_NUMBER=+1xxx

# Web Push (VAPID keys - generate with web-push)
REACT_APP_VAPID_PUBLIC_KEY=xxx
REACT_APP_VAPID_PRIVATE_KEY=xxx

# Supabase
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_ROLE_KEY=xxx
```

### 2. Generate VAPID Keys

```bash
npm install -g web-push
web-push generate-vapid-keys
# Copy the keys to your .env file
```

### 3. Apply Supabase Migration

Run the migration in [Supabase SQL Editor](https://app.supabase.com):

```sql
-- Copy contents of supabase/migrations/20251217_notifications_system.sql
```

### 4. Deploy Edge Functions

```bash
supabase functions deploy process-notifications
supabase functions deploy check-escalations
supabase functions deploy send-digests
```

### 5. Set Up Scheduled Jobs

Configure in Supabase dashboard:

- **process-notifications**: Every 5 minutes
- **check-escalations**: Every hour
- **send-digests**: 9:00 AM, 1:00 PM, 5:00 PM (daily)

## Usage

### Create a Notification

```typescript
import { NotificationRouter } from '@/lib/notifications/router';

const notificationId = await NotificationRouter.createNotification({
  user_id: 'user-uuid',
  title: 'Week 6 Poortwachter Notification',
  message: 'Employee absence has reached 6 weeks',
  type: 'poortwachter_week6',
  priority: 'critical',
  metadata: {
    case_id: 'case-uuid',
    employee_name: 'John Doe'
  },
  deadline: new Date(Date.now() + 24 * 3600000),
  actions: [
    { label: 'Review Case', type: 'navigate', target: '/cases/case-uuid' },
    { label: 'Send Report', type: 'action', target: 'send_report' }
  ]
});
```

### Batch Create Notifications

```typescript
const userIds = ['user1', 'user2', 'user3'];
await NotificationRouter.batchCreateNotifications(
  userIds.map(id => ({
    user_id: id,
    title: 'Weekly Digest',
    message: 'Your weekly summary is ready',
    type: 'system_notification',
    priority: 'normal'
  })),
  { strategy: 'hourly' }
);
```

### Handle Preferences

```typescript
import { NotificationPreferences } from '@/components/notifications/NotificationPreferences';

// In your settings page
<NotificationPreferences userId={userId} />
```

### Initialize Push Notifications

```typescript
import { PushNotificationClient } from '@/lib/notifications/pushClient';

useEffect(() => {
  PushNotificationClient.init();
}, []);

// Listen for push notifications
window.addEventListener('push-notifications', (event: any) => {
  console.log('New notifications:', event.detail.notifications);
});
```

## Smart Batching Logic

Notifications are automatically batched based on:

| Priority | Deadline | Action |
|----------|----------|--------|
| Critical | Any | Send instantly |
| High | < 24h | Send instantly |
| High | ≥ 24h | Hourly digest |
| Normal | < 72h | Hourly digest |
| Normal | ≥ 72h | Daily digest |
| Low | Any | Weekly digest |

## Channel Routing

Channels are selected based on:

1. **User Preferences**: Enabled channels
2. **Quiet Hours**: No notifications during quiet hours (except critical)
3. **Vacation Mode**: No email/SMS during vacation
4. **Priority Thresholds**: 
   - SMS: Only critical/high
   - Push: Only high/critical
   - Email: Normal and above
   - In-app: Always

## Escalation Rules

### Poortwachter Week 1
- Escalate after: 24 hours
- Escalate to: Manager
- Notify: Manager + Admin

### Poortwachter Week 6
- Escalate after: 12 hours (critical)
- Escalate to: HR
- Notify: Manager + Admin + Department Lead

### Leave Approval
- Escalate after: 48 hours
- Escalate to: HR
- Notify: Manager

## Priority Scoring

AI-based scoring system (0-100) with factors:

```typescript
interface PriorityScoreFactors {
  baseScore: number;           // 0-50
  urgencyModifier: number;     // ±10 (hours until deadline)
  complianceModifier: number;  // ±15 (legal/regulatory)
  impactModifier: number;      // ±10 (number of people affected)
  roleModifier: number;        // ±5 (user role importance)
}
```

Example scores:
- Poortwachter Week 6 missed: 95 (critical)
- Leave approval overdue: 78 (high)
- Task due tomorrow: 65 (high)
- Team update: 25 (low)

## Email Templates

### Digest Email
Groups notifications by priority with color coding and action links.

### Action Email
Single-action email with CTA button for approvals/reviews.

### Escalation Email
Highlights task escalation with previous assignee context.

## Testing

```bash
# Test push notification
curl -X POST http://localhost:3001/api/push/test \
  -H "Content-Type: application/json" \
  -d '{"userId": "user-uuid"}'

# Test email
curl -X POST http://localhost:3001/api/email/test \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "subject": "Test",
    "html": "<p>Test</p>"
  }'

# Test SMS
curl -X POST http://localhost:3001/api/sms/test \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+1234567890",
    "body": "Test message"
  }'
```

## Monitoring & Debugging

### Supabase Logs

```sql
-- Check notification delivery status
SELECT * FROM notification_logs
WHERE status = 'failed'
ORDER BY created_at DESC
LIMIT 20;

-- Check escalation history
SELECT e.*, t.title, p1.name as from_user, p2.name as to_user
FROM escalations e
JOIN tasks t ON e.task_id = t.id
JOIN profiles p1 ON e.escalated_from = p1.id
JOIN profiles p2 ON e.escalated_to = p2.id
WHERE e.created_at > now() - interval '7 days'
ORDER BY e.created_at DESC;

-- User preferences
SELECT user_id, preferences
FROM notification_preferences
WHERE user_id = 'user-uuid';
```

### Edge Function Logs

```bash
supabase functions logs process-notifications
supabase functions logs check-escalations
supabase functions logs send-digests
```

## Performance Optimization

- **Batch Processing**: 100 notifications per function run
- **Database Indexes**: recipient_id + read, scheduled_send, type
- **Cache**: Preferences cached in localStorage (15 min TTL)
- **Deduplication**: Prevents duplicate notifications within 5 minutes

## Troubleshooting

### Notifications not arriving via email

1. Check Resend API key in environment variables
2. Verify user email in profiles table
3. Check notification_logs for error_message
4. Test with Resend dashboard

### SMS not sending

1. Verify Twilio credentials
2. Check phone number format (E.164)
3. Confirm SMS priority threshold in preferences
4. Check Twilio logs

### Push notifications not working

1. Check service worker registration
2. Verify VAPID keys
3. Confirm browser support (not IE)
4. Check push_subscriptions table

## Best Practices

1. **Don't overuse critical**: Reserve for true emergencies
2. **Batch similar notifications**: Use digests for non-urgent items
3. **Respect quiet hours**: Users set them for a reason
4. **Test before deploying**: Use test notification endpoints
5. **Monitor delivery rates**: Check notification_logs regularly
6. **Clean up old notifications**: Archive after 30 days
7. **Personalize when possible**: Use user names and context

## Future Enhancements

- [ ] AI-powered snooze suggestions
- [ ] ML-based optimal send time
- [ ] Notification sentiment analysis
- [ ] Delivery success rate ML model
- [ ] Multi-language support
- [ ] Rich media notifications
- [ ] Notification A/B testing
- [ ] Analytics dashboard

## Support

For issues or questions:

1. Check notification_logs table for errors
2. Review Edge Function logs
3. Verify environment variables
4. Test with curl/Postman

## License

Proprietary - Dirq Solutions
