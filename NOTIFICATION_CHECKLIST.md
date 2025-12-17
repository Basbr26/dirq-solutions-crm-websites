# Implementation Checklist - Intelligent Notification System

Complete this checklist to get the notification system live in your application.

## Phase 1: Environment Setup ⚙️

- [ ] **1.1** Copy Resend API key
  - Source: [Resend Dashboard](https://resend.com)
  - Add to `.env.local`: `REACT_APP_RESEND_API_KEY=re_xxxxx`

- [ ] **1.2** Copy Twilio credentials
  - Source: [Twilio Console](https://www.twilio.com/console)
  - Add to `.env.local`:
    - `REACT_APP_TWILIO_ACCOUNT_SID=ACxxxxx`
    - `REACT_APP_TWILIO_AUTH_TOKEN=xxxxx`
    - `REACT_APP_TWILIO_PHONE_NUMBER=+1xxxxxxxxxx`

- [ ] **1.3** Generate VAPID keys
  - Run: `npx web-push generate-vapid-keys`
  - Add to `.env.local`:
    - `REACT_APP_VAPID_PUBLIC_KEY=xxxxx`
    - `REACT_APP_VAPID_PRIVATE_KEY=xxxxx`

- [ ] **1.4** Verify Supabase keys
  - Check `.env.local` has:
    - `SUPABASE_URL`
    - `SUPABASE_ANON_KEY`
    - `SUPABASE_SERVICE_ROLE_KEY`

## Phase 2: Database Migration 🗄️

- [ ] **2.1** Open Supabase SQL Editor
  - Go to [Supabase Dashboard](https://app.supabase.com)
  - Select your project
  - Click "SQL Editor"
  - Click "New Query"

- [ ] **2.2** Copy migration file
  - Open: `supabase/migrations/20251217_notifications_system.sql`
  - Copy entire contents

- [ ] **2.3** Run migration
  - Paste in SQL Editor
  - Click "Run"
  - Verify: "Success" message appears

- [ ] **2.4** Verify tables created
  - Go to Supabase "Table Editor"
  - Verify these tables exist:
    - [ ] `notifications`
    - [ ] `notification_preferences`
    - [ ] `escalations`
    - [ ] `notification_logs`

- [ ] **2.5** Verify RLS policies
  - Click each table → "Auth" tab
  - Verify policies are enabled
  - Note: Policies automatically created by migration

## Phase 3: Deploy Edge Functions 🚀

- [ ] **3.1** Deploy process-notifications
  ```bash
  supabase functions deploy process-notifications
  ```
  - Verify: "Created successfully" message

- [ ] **3.2** Deploy check-escalations
  ```bash
  supabase functions deploy check-escalations
  ```
  - Verify: "Created successfully" message

- [ ] **3.3** Deploy send-digests
  ```bash
  supabase functions deploy send-digests
  ```
  - Verify: "Created successfully" message

- [ ] **3.4** Configure schedules in Supabase dashboard
  - Go to Edge Functions
  - For each function, click "Deployments" → Settings
  - Add trigger (cron):
    - process-notifications: `*/5 * * * *` (every 5 min)
    - check-escalations: `0 * * * *` (every hour)
    - send-digests: `0 9,13,17 * * *` (9am, 1pm, 5pm)

- [ ] **3.5** Test function calls
  ```bash
  curl -X POST https://xxx.supabase.co/functions/v1/process-notifications \
    -H "Authorization: Bearer <ANON_KEY>" \
    -H "Content-Type: application/json"
  ```
  - Verify: Returns JSON with processed count

## Phase 4: Frontend Integration 🎨

- [ ] **4.1** Initialize push notifications in `src/main.tsx` or `src/App.tsx`
  ```typescript
  import { PushNotificationClient } from '@/lib/notifications/pushClient';
  
  useEffect(() => {
    PushNotificationClient.init();
  }, []);
  ```

- [ ] **4.2** Add NotificationCenter to layout
  - Find: Your main layout component (e.g., `src/components/layout/DashboardLayout.tsx`)
  - Import: `import { NotificationCenter } from '@/components/notifications/NotificationCenter';`
  - Add: `<NotificationCenter userId={user?.id} />`

- [ ] **4.3** Add NotificationPreferences to settings page
  - Find: Settings or preferences page
  - Import: `import { NotificationPreferences } from '@/components/notifications/NotificationPreferences';`
  - Add: `<NotificationPreferences userId={user?.id} />`

- [ ] **4.4** Register service worker
  - In your `public/index.html` or app initialization:
  ```typescript
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js');
  }
  ```

- [ ] **4.5** Add notification listeners
  ```typescript
  window.addEventListener('push-notifications', (event: any) => {
    console.log('New notifications:', event.detail.notifications);
    // Refresh notification center, trigger UI update, etc.
  });
  ```

## Phase 5: Testing 🧪

- [ ] **5.1** Test in-app notification
  ```typescript
  import { NotificationRouter } from '@/lib/notifications/router';
  
  await NotificationRouter.createNotification({
    user_id: 'your-user-id',
    title: 'Test Notification',
    message: 'This is a test',
    type: 'system_notification',
    priority: 'high'
  });
  ```

- [ ] **5.2** Check notification appears in NotificationCenter
  - Go to app
  - Look for notification bell icon
  - Click to open NotificationCenter
  - Verify notification appears in "All" tab

- [ ] **5.3** Test email notification
  - Set notification priority to "high"
  - Check email inbox
  - Verify email arrives from notifications@dirq.app

- [ ] **5.4** Test SMS notification (if configured)
  - Set notification priority to "critical"
  - Check phone for SMS
  - Verify SMS arrives from your Twilio number

- [ ] **5.5** Test push notification
  - In browser DevTools → Application → Service Workers
  - Verify service worker is registered
  - Create notification with priority "high"
  - Check browser for push notification

- [ ] **5.6** Test user preferences
  - Click "Preferences" in NotificationCenter
  - Change digest frequency to "daily"
  - Change quiet hours to "20:00 - 08:00"
  - Enable vacation mode
  - Click "Save"
  - Verify notification says "Preferences saved"

- [ ] **5.7** Test quiet hours
  - Set quiet hours to current time
  - Create notification
  - Verify it doesn't appear in app (waits for digest)
  - Change quiet hours to outside current time
  - Create notification
  - Verify it appears instantly

## Phase 6: Monitoring Setup 📊

- [ ] **6.1** Monitor notification delivery
  - Create Supabase query:
  ```sql
  SELECT * FROM notification_logs
  WHERE status = 'failed'
  ORDER BY created_at DESC
  LIMIT 20;
  ```
  - Save as saved query
  - Check regularly for failures

- [ ] **6.2** Monitor escalations
  - Create Supabase query:
  ```sql
  SELECT e.*, t.title, p1.name as from_user, p2.name as to_user
  FROM escalations e
  JOIN tasks t ON e.task_id = t.id
  JOIN profiles p1 ON e.escalated_from = p1.id
  JOIN profiles p2 ON e.escalated_to = p2.id
  ORDER BY e.created_at DESC;
  ```

- [ ] **6.3** Check Edge Function logs daily
  ```bash
  supabase functions logs process-notifications
  supabase functions logs check-escalations
  supabase functions logs send-digests
  ```

- [ ] **6.4** Set up alerts (optional)
  - Create Slack/Email webhook for high failure rates
  - Alert if > 10% notifications fail delivery
  - Alert if escalations exceed threshold

## Phase 7: Production Deployment 🌍

- [ ] **7.1** Test in staging environment
  - Deploy to staging first
  - Run all tests from Phase 5
  - Verify no console errors

- [ ] **7.2** Code review checklist
  - [ ] Environment variables don't contain secrets
  - [ ] All imports resolve correctly
  - [ ] No TypeScript errors: `npm run build`
  - [ ] ESLint passes: `npm run lint`

- [ ] **7.3** Deploy to production
  ```bash
  # Frontend
  npm run build
  # Deploy as usual
  
  # Supabase already deployed (it's serverless)
  ```

- [ ] **7.4** Verify production
  - [ ] Send test notification from production
  - [ ] Check notification_logs for delivery
  - [ ] Verify email arrives
  - [ ] Check Edge Function logs
  - [ ] Test user preferences

- [ ] **7.5** Communication
  - [ ] Email users about new notification system
  - [ ] Share documentation link
  - [ ] Explain notification types
  - [ ] Show how to manage preferences

## Phase 8: Ongoing Maintenance 🔧

- [ ] **Weekly**
  - [ ] Review notification_logs for errors
  - [ ] Check Edge Function logs
  - [ ] Verify all services healthy (Resend, Twilio)

- [ ] **Monthly**
  - [ ] Analyze notification effectiveness
  - [ ] Review escalation patterns
  - [ ] Optimize batching if needed
  - [ ] Clean old notifications (archive > 30 days)

- [ ] **Quarterly**
  - [ ] Review notification types for new needs
  - [ ] Collect user feedback
  - [ ] Plan enhancements
  - [ ] Update documentation

## Troubleshooting

### Emails not arriving?
- [ ] Verify `REACT_APP_RESEND_API_KEY` is set
- [ ] Check Resend dashboard for bounce/complaints
- [ ] Verify user email in profiles table
- [ ] Check notification_logs for errors

### SMS not sending?
- [ ] Verify Twilio credentials in .env.local
- [ ] Check phone format (E.164: +1234567890)
- [ ] Verify SMS priority threshold (critical/high only)
- [ ] Check Twilio dashboard usage

### Push notifications not working?
- [ ] Check browser DevTools → Application → Service Workers
- [ ] Verify service worker at `/sw.js` is registered
- [ ] Check for VAPID key configuration
- [ ] Ensure HTTPS (required for service workers)

### Notifications stuck pending?
- [ ] Check Edge Function logs
- [ ] Verify database migration completed
- [ ] Check notification_logs for errors
- [ ] Verify RLS policies allow access

### Database migration failed?
- [ ] Check Supabase SQL Editor error message
- [ ] Verify tables don't already exist
- [ ] Check database quota not exceeded
- [ ] Try running migration again

## Success Criteria ✅

Your notification system is ready for production when:

- [x] All environment variables set correctly
- [x] Database migration completed successfully
- [x] All Edge Functions deployed
- [x] NotificationCenter displays in-app notifications
- [x] NotificationPreferences component works
- [x] Emails arriving via Resend
- [x] SMS arriving via Twilio
- [x] Push notifications working
- [x] Quiet hours respected
- [x] Vacation mode working
- [x] Digest batching working
- [x] Escalations automatically created
- [x] All monitoring queries set up
- [x] Edge Function logs reviewed
- [x] Users trained on preferences

---

## Resources

- 📖 [NOTIFICATION_SYSTEM_GUIDE.md](./NOTIFICATION_SYSTEM_GUIDE.md) - Full documentation
- ⚡ [NOTIFICATION_QUICKSTART.md](./NOTIFICATION_QUICKSTART.md) - Quick start
- 🏗️ [NOTIFICATION_ARCHITECTURE.md](./NOTIFICATION_ARCHITECTURE.md) - Architecture details
- 📋 [NOTIFICATION_IMPLEMENTATION_SUMMARY.md](./NOTIFICATION_IMPLEMENTATION_SUMMARY.md) - Implementation details

---

**Estimated Time to Complete**: 30-45 minutes
**Difficulty Level**: Intermediate
**Support**: Contact dev team with questions

Good luck! 🚀
