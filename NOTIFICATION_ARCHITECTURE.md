# Notification System Architecture

## High-Level System Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                        DIRQ APP (Frontend)                       │
│                                                                   │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                   React Components                         │ │
│  │  ┌─────────────────────────────────────────────────────┐  │ │
│  │  │  NotificationCenter    NotificationPreferences     │  │ │
│  │  │  - Tabs (All/Unread)   - Digest options           │  │ │
│  │  │  - Priority filter     - Quiet hours              │  │ │
│  │  │  - Real-time updates   - Vacation mode            │  │ │
│  │  │  - Mark as read        - Channel toggles           │  │ │
│  │  └─────────────────────────────────────────────────────┘  │ │
│  └────────────────────────────────────────────────────────────┘ │
│                            ↓                                      │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │              NotificationRouter.createNotification()       │ │
│  │  Creates and sends notifications to Supabase              │ │
│  └────────────────────────────────────────────────────────────┘ │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ↓
┌──────────────────────────────────────────────────────────────────┐
│                    SUPABASE DATABASE                             │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ notifications TABLE                                     │   │
│  │ - id, recipient_id, type, title, body                  │   │
│  │ - priority, channels[], actions JSONB                  │   │
│  │ - read/actioned status, scheduled_send, sent_at        │   │
│  └─────────────────────────────────────────────────────────┘   │
│         ↓              ↓              ↓              ↓          │
│    [Every 5m]    [Every 1h]    [3x daily]    [Real-time]      │
│         ↓              ↓              ↓              ↓          │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ notification_preferences TABLE                          │   │
│  │ - user_id, preferences JSONB                           │   │
│  │   - digest_preference, quiet_hours, channels           │   │
│  │   - vacation_mode, priority_thresholds                 │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ escalations TABLE                                       │   │
│  │ - task_id, escalated_from/to, reason, resolved         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ notification_logs TABLE (Audit Trail)                  │   │
│  │ - notification_id, channel, status, external_id        │   │
│  └─────────────────────────────────────────────────────────┘   │
└────────┬─────────────────┬──────────────────────────┬───────────┘
         │                 │                          │
         ↓                 ↓                          ↓
    [Process]         [Escalate]              [Send Digest]
         │                 │                          │
         ↓                 ↓                          ↓
┌─────────────────────────────────────────────────────────────────┐
│                   SUPABASE EDGE FUNCTIONS                        │
│                                                                   │
│ ┌──────────────────────┐  ┌──────────────────────┐ ┌──────────┐│
│ │process-notifications │  │check-escalations     │ │send-     ││
│ │(every 5 minutes)     │  │(every hour)          │ │digests   ││
│ │                      │  │                      │ │(3x daily)││
│ │- Load pending        │  │- Find overdue tasks  │ │          ││
│ │- Get preferences     │  │- Apply rules         │ │- Compile ││
│ │- Select channels     │  │- Create escalations  │ │  digests ││
│ │- Send via channels   │  │- Reassign tasks      │ │- Send    ││
│ │- Log delivery        │  │- Notify all parties  │ │  emails  ││
│ └──────────────────────┘  └──────────────────────┘ └──────────┘│
└────┬─────────────────────┬──────────────────┬──────────────┬────┘
     │                     │                  │              │
     ↓                     ↓                  ↓              ↓
   [In-App]         [Email Service]   [SMS Service]  [Push Service]
     │                   │                  │              │
     ↓                   ↓                  ↓              ↓
┌──────────────┐   ┌──────────────┐  ┌──────────────┐ ┌───────────┐
│ Database     │   │ Resend API   │  │ Twilio API   │ │Web Push   │
│ Notification │   │              │  │              │ │Protocol   │
│ (read in-app)│   │- HTML email  │  │- SMS         │ │           │
│              │   │- Text email  │  │- 160 chars   │ │- Service  │
│ Real-time    │   │- Templates   │  │- Templates   │ │  Worker   │
│ subscription │   │              │  │              │ │- VAPID    │
└──────────────┘   └──────────────┘  └──────────────┘ └───────────┘
     ↓                   ↓                  ↓              ↓
     └───────────────────┴──────────────────┴──────────────┘
                         ↓
┌──────────────────────────────────────────────────────────────────┐
│                    USER DEVICES                                  │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Desktop/Web Browser                                     │   │
│  │ - In-app notification bubble                           │   │
│  │ - Browser email notifications                          │   │
│  │ - Push notifications (PWA)                             │   │
│  │ - Service Worker (offline-capable)                     │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Mobile Browser                                          │   │
│  │ - Mobile-optimized notification card                   │   │
│  │ - Mobile email client notification                     │   │
│  │ - Push notifications                                   │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Email Client                                            │   │
│  │ - Digest emails (HTML + text)                          │   │
│  │ - Action-specific emails                               │   │
│  │ - Deep links to app                                    │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ SMS App                                                 │   │
│  │ - Critical alerts only                                 │   │
│  │ - Escalation notices                                   │   │
│  │ - Approval requests                                    │   │
│  └─────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────┘
```

---

## Component Architecture

```
NotificationRouter (Service)
    ├── createNotification()
    │   └── Saves to notifications table
    │
    ├── getNotifications()
    │   └── Queries with filters
    │
    └── markAsRead/Acted()
        └── Updates status flags

    │
    ├─→ NotificationTemplates
    │   ├── poortwachter_week1
    │   ├── poortwachter_week6 (critical)
    │   ├── leave_approval_needed
    │   ├── task_overdue
    │   └── ... 10+ more types
    │
    ├─→ NotificationBatcher
    │   ├── batchNotifications()
    │   │   └── Groups by priority + deadline
    │   │
    │   ├── determineBatchType()
    │   │   └── instant/hourly/daily/weekly
    │   │
    │   └── formatDigestSections()
    │       └── Organize by priority
    │
    ├─→ NotificationChannelSelector
    │   ├── selectChannels()
    │   │   ├── User preferences
    │   │   ├── Quiet hours check
    │   │   ├── Vacation mode check
    │   │   └── Priority thresholds
    │   │
    │   ├── isInQuietHours()
    │   │   └── Respects timezone + wrap midnight
    │   │
    │   └── getRetryChannels()
    │       └── Fallback channels if failed
    │
    ├─→ ResendClient (Email)
    │   ├── sendDigestEmail()
    │   ├── sendActionEmail()
    │   └── generateEmailTemplate()
    │
    ├─→ TwilioClient (SMS)
    │   ├── sendCriticalAlertSms()
    │   ├── sendApprovalSms()
    │   └── generateSmsTemplate()
    │
    ├─→ PushNotificationClient
    │   ├── init()
    │   ├── subscribe()
    │   ├── unsubscribe()
    │   └── isSubscribed()
    │
    └─→ EscalationEngine
        ├── checkAndEscalateTasks()
        │   ├── Apply escalation rules
        │   └── Reassign + notify
        │
        └── Escalation Rules
            ├── Poortwachter Week 1 (24h)
            ├── Poortwachter Week 6 (12h)
            └── Leave Approval (48h)
```

---

## Data Flow: Creating a Notification

```
1. User Action (e.g., Leave Approved)
   │
   ├─→ NotificationRouter.createNotification({
   │     user_id: "employee-123",
   │     type: "leave_approved",
   │     priority: "high",
   │     ...
   │   })
   │
   ├─→ 2. Get User Preferences
   │   const prefs = await fetch notification_preferences
   │   │
   │   └─→ Check: digest_preference, quiet_hours, channels
   │
   ├─→ 3. Save to Database
   │   INSERT INTO notifications (...)
   │   VALUES (...)
   │   │
   │   └─→ Returns notification_id
   │
   ├─→ 4. Wait for Edge Function (Every 5 min)
   │   process-notifications executes
   │   │
   │   └─→ SELECT * FROM notifications WHERE sent_at IS NULL
   │
   ├─→ 5. Determine Batching Strategy
   │   • Critical → Instant
   │   • High + <24h deadline → Instant
   │   • Other → Apply user's digest_preference
   │
   ├─→ 6. Select Delivery Channels
   │   channelSelector.selectChannels()
   │   │
   │   ├─→ Check quiet_hours
   │   ├─→ Check vacation_mode
   │   ├─→ Check channel enabled (user_prefs)
   │   ├─→ Check priority_threshold
   │   │
   │   └─→ Returns: ["in_app", "email", "push"]
   │
   ├─→ 7. Send Through Channels
   │   ├─→ in_app: Already in DB, mark sent_at
   │   │
   │   ├─→ email: 
   │   │   ├─ Get user email
   │   │   ├─ Render HTML template
   │   │   ├─ Call Resend API
   │   │   └─ Log in notification_logs
   │   │
   │   ├─→ sms:
   │   │   ├─ Check priority >= high
   │   │   ├─ Get user phone
   │   │   ├─ Call Twilio API
   │   │   └─ Log in notification_logs
   │   │
   │   └─→ push:
   │       ├─ Get push subscriptions
   │       ├─ Send via Web Push Protocol
   │       └─ Log in notification_logs
   │
   ├─→ 8. Mark as Sent
   │   UPDATE notifications SET sent_at = NOW() WHERE id = ...
   │
   └─→ 9. User Receives Notification
       ├─ In-app: Real-time update in NotificationCenter
       ├─ Email: Appears in inbox (or digest)
       ├─ SMS: Alert on phone
       └─ Push: Browser/mobile notification
```

---

## Data Flow: Escalation

```
1. Edge Function: check-escalations (Every 1 hour)
   │
   ├─→ SELECT * FROM tasks WHERE status='pending'
   │   AND created_at < NOW() - 24h
   │
   ├─→ 2. For Each Overdue Task:
   │
   ├─→ 3. Check Escalation Rules
   │   • Type: poortwachter_week1
   │   • Threshold: 24 hours
   │   • Max escalations: 2
   │
   ├─→ 4. Count Existing Escalations
   │   SELECT COUNT(*) FROM escalations WHERE task_id = ...
   │
   ├─→ 5. If Not At Max:
   │   ├─→ Create Escalation Record
   │   │   INSERT INTO escalations (
   │   │     task_id,
   │   │     escalated_from (original assignee),
   │   │     escalated_to (manager),
   │   │     reason: "Auto-escalated: overdue 24h"
   │   │   )
   │   │
   │   ├─→ Reassign Task
   │   │   UPDATE tasks SET assigned_to = manager_id ...
   │   │
   │   ├─→ Send to New Assignee (Manager)
   │   │   NotificationRouter.createNotification({
   │   │     user_id: manager_id,
   │   │     type: "escalation_received",
   │   │     priority: "high",
   │   │     title: "Task Escalated: Poor task title",
   │   │     body: "Employee has escalated this task to you"
   │   │   })
   │   │
   │   ├─→ Notify Original Assignee
   │   │   NotificationRouter.createNotification({
   │   │     user_id: original_assignee,
   │   │     type: "escalation_sent",
   │   │     priority: "normal"
   │   │   })
   │   │
   │   └─→ Notify Admin (if configured)
   │       NotificationRouter.createNotification({...})
   │
   └─→ 6. If Max Escalations Reached:
       NotificationRouter.createNotification({
         user_id: "admin",
         type: "escalation_max_reached",
         priority: "critical",
         title: "Maximum Escalations Reached"
       })
```

---

## Data Flow: Digest Email

```
1. Edge Function: send-digests (9am, 1pm, 5pm)
   │
   ├─→ 2. Get Users With Daily Digest Preference
   │   SELECT * FROM notification_preferences
   │   WHERE preferences->digest_preference = 'daily'
   │
   ├─→ 3. For Each User:
   │
   ├─→ 4. Get Unread Notifications
   │   SELECT * FROM notifications
   │   WHERE recipient_id = user_id
   │   AND read = false
   │   ORDER BY priority DESC, created_at DESC
   │
   ├─→ 5. Group by Priority
   │   • Critical (🚨) → 5 notifications
   │   • High (⚠️) → 12 notifications
   │   • Normal (ℹ️) → 8 notifications
   │   • Low → 2 notifications
   │
   ├─→ 6. Generate Digest HTML
   │   • Header with summary counts
   │   • Sections by priority
   │   • Each notification with title + deep link
   │   • CTA button to view all
   │   • Preference management link
   │
   ├─→ 7. Send via Resend API
   │   POST https://api.resend.com/emails
   │   {
   │     from: "notifications@dirq.app",
   │     to: user.email,
   │     subject: "Your Daily Notifications",
   │     html: digestHtml
   │   }
   │
   ├─→ 8. Mark Notifications as digest_sent
   │   UPDATE notifications SET digest_sent = true
   │   WHERE id IN (notification_ids)
   │
   └─→ 9. Log Delivery
       INSERT INTO notification_logs (...)
       VALUES ("email", "sent", ...)
```

---

## Database Relationships

```
┌─────────────────┐
│   auth.users    │
│   id (UUID)     │
└────────┬────────┘
         │
         │ 1:many
         ↓
┌─────────────────────────────────────┐
│      notifications                  │
│  id, recipient_id → auth.users.id   │
│  type, priority, channels[]         │
│  title, body, actions JSONB         │
│  read, actioned, sent_at            │
└────────┬────────┬─────────┬─────────┘
         │        │         │
      1:1 │      1:1 │       │ 1:many
         ↓        ↓         ↓
    ┌─────────────────────────────────────┐
    │  notification_preferences           │
    │  user_id → auth.users.id (PRIMARY) │
    │  preferences JSONB                 │
    └─────────────────────────────────────┘
    
    ┌─────────────────────────────────────┐
    │  notification_logs (Audit Trail)    │
    │  notification_id → notifications.id │
    │  status, external_id (Resend/SMS)   │
    └─────────────────────────────────────┘
    
    ┌─────────────────────────────────────┐
    │  escalations                        │
    │  task_id → tasks.id                │
    │  escalated_from/to → auth.users.id │
    └─────────────────────────────────────┘

┌─────────────────┐
│     tasks       │
│  id, status     │
│  assigned_to    │
│  due_date       │
└─────────────────┘
```

---

## Performance Characteristics

```
Operation                          | Time    | Notes
----------------------------------|---------|------------------------------------------
Create notification               | <100ms  | DB insert + Supabase
Select channels                   | <50ms   | Query preferences + logic
Batch 100 notifications          | <1s     | Process + send to 3 channels each
Send email (Resend)              | <5s     | API call + HTML rendering
Send SMS (Twilio)                | <10s    | API call + mobile delivery
Send push notification           | <2s     | Web Push Protocol
Check escalations (1000 tasks)   | <2s     | Query + rule matching
Generate digest email            | <1s     | HTML template rendering
Service worker fetch             | <50ms   | Cache-first strategy
DB query (indexed)               | <10ms   | recipient_id + read index

Scalability Limits:
- Edge Function: 50 concurrent invocations
- Database: 10,000+ read/write ops per minute
- Email throughput: 100+ emails per minute (Resend)
- SMS throughput: 50+ SMS per minute (Twilio)
- Push subscriptions: 1M+ per Edge Function
```

---

## Security & RLS

```
notification_preferences:
  SELECT: Users see own, HR sees all, super_admin sees all
  INSERT: Only system or user creating own
  UPDATE: User can update own, HR can update any
  DELETE: super_admin only

notifications:
  SELECT: Users see own, HR sees assigned, super_admin sees all
  INSERT: Only system (Edge Function)
  UPDATE: Only system (mark read/sent/acted)
  DELETE: super_admin only

escalations:
  SELECT: All authenticated users can see (for visibility)
  INSERT: Only system (Edge Function)
  UPDATE: Only system (mark resolved)
  DELETE: super_admin only

notification_logs:
  SELECT: HR and super_admin only (audit)
  INSERT: Only system (Edge Function)
  DELETE: super_admin only (retention policy)
```

---

**Last Updated**: December 17, 2024
**Version**: 1.0
**Status**: Production Ready ✅
