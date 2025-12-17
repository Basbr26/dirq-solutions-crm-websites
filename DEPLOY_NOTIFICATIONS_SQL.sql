-- =====================================================
-- NOTIFICATION SYSTEM - MANUAL DEPLOYMENT SCRIPT
-- Run this in Supabase SQL Editor (Dashboard)
-- =====================================================

-- Step 1: Create notifications main table
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type VARCHAR(100) NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('critical', 'high', 'normal', 'low')),
  
  -- Entity reference
  related_entity_type VARCHAR(50),
  related_entity_id UUID,
  deep_link TEXT,
  
  -- Status
  read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMP WITH TIME ZONE,
  actioned BOOLEAN DEFAULT FALSE,
  actioned_at TIMESTAMP WITH TIME ZONE,
  
  -- Delivery
  scheduled_send TIMESTAMP WITH TIME ZONE,
  sent_at TIMESTAMP WITH TIME ZONE,
  channels TEXT[] DEFAULT ARRAY[]::TEXT[],
  
  -- Actions (JSON array)
  actions JSONB,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 2: Create escalations table
CREATE TABLE IF NOT EXISTS public.escalations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE,
  escalated_from UUID REFERENCES public.profiles(id),
  escalated_to UUID REFERENCES public.profiles(id),
  reason VARCHAR(50),
  resolved BOOLEAN DEFAULT FALSE,
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 3: Create notification_preferences table (IMPORTANT!)
CREATE TABLE IF NOT EXISTS public.notification_preferences (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  preferences JSONB NOT NULL DEFAULT '{
    "digest_preference": "daily",
    "quiet_hours": {
      "enabled": false,
      "start": "22:00",
      "end": "08:00"
    },
    "vacation_mode": {
      "enabled": false,
      "delegate_to": null,
      "auto_reply": ""
    },
    "channels": {
      "in_app": {
        "enabled": true,
        "types": []
      },
      "email": {
        "enabled": true,
        "types": [],
        "digest": true
      },
      "sms": {
        "enabled": false,
        "types": []
      },
      "push": {
        "enabled": false,
        "types": []
      }
    },
    "priority_thresholds": {
      "in_app": "low",
      "email": "normal",
      "sms": "high",
      "push": "critical"
    }
  }'::JSONB,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 4: Create notification_logs table
CREATE TABLE IF NOT EXISTS public.notification_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id UUID REFERENCES public.notifications(id) ON DELETE CASCADE,
  channel VARCHAR(20),
  recipient VARCHAR(255),
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  external_id TEXT,
  status VARCHAR(20) DEFAULT 'pending',
  error_message TEXT
);

-- Step 5: Create push_subscriptions table
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL UNIQUE,
  auth TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 6: Create escalation_history table
CREATE TABLE IF NOT EXISTS public.escalation_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id UUID REFERENCES public.notifications(id) ON DELETE CASCADE,
  rule_id UUID,
  from_user_id UUID REFERENCES public.profiles(id),
  to_user_id UUID REFERENCES public.profiles(id),
  level INTEGER NOT NULL,
  escalated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 7: Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.escalations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.escalation_history ENABLE ROW LEVEL SECURITY;

-- Step 8: Drop existing policies if any (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
DROP POLICY IF EXISTS "HR can view all notifications" ON public.notifications;
DROP POLICY IF EXISTS "Super admin can manage notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update own notification status" ON public.notifications;
DROP POLICY IF EXISTS "Users can manage own preferences" ON public.notification_preferences;
DROP POLICY IF EXISTS "Super admin can view preferences" ON public.notification_preferences;
DROP POLICY IF EXISTS "Managers and HR can view escalations" ON public.escalations;

-- Step 9: Create RLS Policies for notifications
CREATE POLICY "Users can view own notifications"
ON public.notifications
FOR SELECT
USING (auth.uid() = recipient_id);

CREATE POLICY "HR can view all notifications"
ON public.notifications
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role IN ('hr', 'super_admin')
  )
);

CREATE POLICY "Super admin can manage notifications"
ON public.notifications
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'super_admin'
  )
);

CREATE POLICY "Users can update own notification status"
ON public.notifications
FOR UPDATE
USING (auth.uid() = recipient_id)
WITH CHECK (auth.uid() = recipient_id);

-- Step 10: Create RLS Policies for preferences
CREATE POLICY "Users can manage own preferences"
ON public.notification_preferences
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Super admin can view preferences"
ON public.notification_preferences
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'super_admin'
  )
);

-- Step 11: Create RLS Policies for escalations
CREATE POLICY "Managers and HR can view escalations"
ON public.escalations
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role IN ('manager', 'hr', 'super_admin')
  )
);

-- Step 12: Create RLS Policies for push_subscriptions
CREATE POLICY "Users can manage own push subscriptions"
ON public.push_subscriptions
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Step 13: Create Indexes for performance
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_unread 
  ON public.notifications(recipient_id, read) 
  WHERE read = FALSE;

CREATE INDEX IF NOT EXISTS idx_notifications_scheduled 
  ON public.notifications(scheduled_send) 
  WHERE sent_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_notifications_type 
  ON public.notifications(type);

CREATE INDEX IF NOT EXISTS idx_notifications_created 
  ON public.notifications(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_escalations_task 
  ON public.escalations(task_id);

CREATE INDEX IF NOT EXISTS idx_escalations_created 
  ON public.escalations(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notification_logs_notification 
  ON public.notification_logs(notification_id);

CREATE INDEX IF NOT EXISTS idx_notification_logs_status 
  ON public.notification_logs(status);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user 
  ON public.push_subscriptions(user_id);

-- Step 14: Create triggers (if handle_updated_at function exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'handle_updated_at') THEN
    DROP TRIGGER IF EXISTS update_notifications_updated_at ON public.notifications;
    CREATE TRIGGER update_notifications_updated_at
    BEFORE UPDATE ON public.notifications
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

    DROP TRIGGER IF EXISTS update_notification_preferences_updated_at ON public.notification_preferences;
    CREATE TRIGGER update_notification_preferences_updated_at
    BEFORE UPDATE ON public.notification_preferences
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();
  END IF;
END $$;

-- Done! Notification system tables created successfully.
SELECT 'Notification system deployed successfully!' as status;
