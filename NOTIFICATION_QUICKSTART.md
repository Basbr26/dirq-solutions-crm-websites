# Notification System - Quick Start Integration

Get the intelligent notification system running in your app in 5 minutes.

## Step 1: Add Environment Variables (1 min)

Create `.env.local`:

```env
# Resend Email API
REACT_APP_RESEND_API_KEY=re_xxxxx

# Twilio SMS
REACT_APP_TWILIO_ACCOUNT_SID=ACxxxxx
REACT_APP_TWILIO_AUTH_TOKEN=xxxxx
REACT_APP_TWILIO_PHONE_NUMBER=+1xxxxxxxxxx

# Web Push VAPID (generate: npx web-push generate-vapid-keys)
REACT_APP_VAPID_PUBLIC_KEY=xxxxx
REACT_APP_VAPID_PRIVATE_KEY=xxxxx
```

## Step 2: Initialize Push Notifications (1 min)

In your main `App.tsx`:

```typescript
import { useEffect } from 'react';
import { PushNotificationClient } from '@/lib/notifications/pushClient';

function App() {
  useEffect(() => {
    // Initialize push notifications on app load
    PushNotificationClient.init().catch(err => {
      console.log('Push notifications unavailable:', err);
    });

    // Listen for new push notifications
    window.addEventListener('push-notifications', (event: any) => {
      console.log('New notifications:', event.detail.notifications);
    });
  }, []);

  return (
    // ... your app
  );
}
```

## Step 3: Add Notification Center to Layout (2 min)

In your main layout (e.g., `DashboardLayout.tsx`):

```typescript
import { NotificationCenter } from '@/components/notifications/NotificationCenter';
import { NotificationPreferences } from '@/components/notifications/NotificationPreferences';
import { useAuth } from '@/hooks/useAuth';

export function DashboardLayout({ children }) {
  const { user } = useAuth();

  return (
    <div className="flex">
      {/* Sidebar */}
      <aside>
        <NotificationCenter userId={user?.id} />
        <NotificationPreferences userId={user?.id} />
      </aside>

      {/* Main content */}
      <main>
        {children}
      </main>
    </div>
  );
}
```

## Step 4: Send Your First Notification (1 min)

Anywhere in your app:

```typescript
import { NotificationRouter } from '@/lib/notifications/router';
import { useAuth } from '@/hooks/useAuth';

function ApprovalPage() {
  const { user } = useAuth();

  async function approveLeave(leaveId: string) {
    // Approve the leave...
    
    // Send notification to employee
    await NotificationRouter.createNotification({
      user_id: employeeId,
      title: 'Your leave has been approved',
      message: `Your leave request for ${startDate} - ${endDate} has been approved`,
      type: 'leave_approved',
      priority: 'high',
      deep_link: `/leave/${leaveId}`,
      actions: [
        {
          label: 'View Leave',
          type: 'navigate',
          target: `/leave/${leaveId}`,
          variant: 'primary'
        }
      ]
    });
  }

  return (
    <button onClick={() => approveLeave(leaveId)}>
      Approve Leave
    </button>
  );
}
```

## Step 5: Run the Database Migration (1 min)

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Go to SQL Editor
4. Create new query
5. Copy contents of `supabase/migrations/20251217_notifications_system.sql`
6. Click "Run"

## Step 6: Deploy Edge Functions (1 min)

```bash
# From project root
supabase functions deploy process-notifications
supabase functions deploy check-escalations
supabase functions deploy send-digests
```

---

## You're Done! 🎉

Your notification system is now live with:
- ✅ In-app notifications (instant)
- ✅ Email notifications (via Resend)
- ✅ SMS notifications (via Twilio)
- ✅ Push notifications (PWA)
- ✅ Smart batching (hourly/daily/weekly)
- ✅ Automatic escalations (Poortwachter, Leave, Tasks)
- ✅ User preferences (quiet hours, vacation, digest frequency)

---

## Common Usage Examples

### Create a Poortwachter Week 6 Notification (Critical)

```typescript
await NotificationRouter.createNotification({
  user_id: managerId,
  title: 'URGENT: Week 6 Poortwachter Milestone',
  message: `Employee ${employeeName} has reached 6 weeks of continuous sick leave. Immediate action required.`,
  type: 'poortwachter_week6',
  priority: 'critical',
  deep_link: `/cases/${caseId}`,
  actions: [
    { label: 'Review Case', type: 'navigate', target: `/cases/${caseId}`, variant: 'primary' },
    { label: 'Send Report', type: 'action', target: 'send_report', variant: 'default' }
  ]
});
```

### Send Notification to Multiple Users

```typescript
const managerIds = ['manager1', 'manager2', 'manager3'];

for (const managerId of managerIds) {
  await NotificationRouter.createNotification({
    user_id: managerId,
    title: 'Team Update: Sick Leave Status',
    message: 'New sick leave cases require your attention',
    type: 'team_update',
    priority: 'normal',
    deep_link: '/dashboard/cases'
  });
}
```

### Create an Approval Request

```typescript
await NotificationRouter.createNotification({
  user_id: approverId,
  title: 'Leave Request Needs Approval',
  message: `${requesterName} has requested leave from ${startDate} to ${endDate}`,
  type: 'leave_approval_needed',
  priority: 'high',
  deep_link: `/leave-requests/${requestId}`,
  actions: [
    { label: 'Approve', type: 'action', target: 'approve_leave', variant: 'primary' },
    { label: 'Reject', type: 'action', target: 'reject_leave', variant: 'default' }
  ]
});
```

---

## Customizing Notification Types

Add new notification types in `src/lib/notifications/templates.ts`:

```typescript
export const notificationTemplates: Record<NotificationType, NotificationTemplate> = {
  // ... existing types
  my_custom_type: {
    title: (metadata: any) => `Custom: ${metadata.subject}`,
    body: (metadata: any) => metadata.message,
    priority: 'high',
    default_channels: ['in_app', 'email'],
    escalate_after_hours: 24,
    actions: (metadata: any) => [
      { label: 'View', type: 'navigate', target: `/custom/${metadata.id}` }
    ]
  }
};
```

Then use it:

```typescript
await NotificationRouter.createNotification({
  user_id: userId,
  title: 'Custom Notification',
  message: 'This is a custom type',
  type: 'my_custom_type',
  priority: 'high'
});
```

---

## User Preferences UI

Your users can manage their preferences via the NotificationPreferences component:

```typescript
<NotificationPreferences userId={user.id} />
```

This gives them control over:
- 📧 Digest frequency (instant/hourly/daily/weekly)
- 🔇 Quiet hours (e.g., 22:00 - 08:00)
- 🏖️ Vacation mode
- 📱 Channel preferences
- 🎯 Priority thresholds per channel
- 🔔 Notification type toggles

---

## Monitoring & Debugging

### Check Notification Delivery Status

```sql
-- View failed notifications
SELECT * FROM notification_logs
WHERE status = 'failed'
ORDER BY created_at DESC
LIMIT 20;

-- View all notifications for a user
SELECT * FROM notifications
WHERE recipient_id = 'user-uuid'
ORDER BY created_at DESC
LIMIT 50;

-- Check escalation history
SELECT * FROM escalations
ORDER BY created_at DESC
LIMIT 20;
```

### View Edge Function Logs

```bash
supabase functions logs process-notifications
supabase functions logs check-escalations
supabase functions logs send-digests
```

---

## Troubleshooting

### Notifications not showing in app
1. Check browser console for errors
2. Verify user ID is correct
3. Check notification_logs table for delivery status

### Email not arriving
1. Verify REACT_APP_RESEND_API_KEY is set correctly
2. Check Resend dashboard for bounces
3. Verify user email in profiles table

### SMS not sending
1. Verify Twilio credentials (SID, token, phone number)
2. Check phone number format (E.164: +1234567890)
3. Verify SMS priority threshold in preferences (critical/high only)

### Push notifications not working
1. Check browser console for service worker errors
2. Verify VAPID keys are set
3. Grant notification permission when prompted
4. Check push_subscriptions table in Supabase

---

## Next Steps

1. **Customize notification types** for your business logic
2. **Add notification icons/images** to your notification templates
3. **Configure Edge Function schedules** in Supabase dashboard
4. **Set up monitoring** for notification_logs table
5. **Train users** on quiet hours and preferences
6. **Collect analytics** on notification effectiveness

---

## Need Help?

- Full documentation: [NOTIFICATION_SYSTEM_GUIDE.md](./NOTIFICATION_SYSTEM_GUIDE.md)
- Implementation details: [NOTIFICATION_IMPLEMENTATION_SUMMARY.md](./NOTIFICATION_IMPLEMENTATION_SUMMARY.md)
- View database schema: `supabase/migrations/20251217_notifications_system.sql`

---

**Status**: Ready for production ✅
**Last Updated**: December 17, 2024
**Version**: 1.0
