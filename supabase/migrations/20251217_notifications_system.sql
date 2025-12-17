-- Create notifications tables for intelligent notification system

-- Notifications main table
CREATE TABLE public.notifications (
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

-- Escalations table
CREATE TABLE public.escalations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE,
  escalated_from UUID REFERENCES public.profiles(id),
  escalated_to UUID REFERENCES public.profiles(id),
  reason VARCHAR(50),
  resolved BOOLEAN DEFAULT FALSE,
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Notification preferences per user
CREATE TABLE public.notification_preferences (
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
    }
  }'::JSONB,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Notification logs for audit trail
CREATE TABLE public.notification_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id UUID REFERENCES public.notifications(id) ON DELETE CASCADE,
  channel VARCHAR(20),
  recipient VARCHAR(255),
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  external_id TEXT,
  status VARCHAR(20) DEFAULT 'pending',
  error_message TEXT
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.escalations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for notifications

-- Users can view their own notifications
CREATE POLICY "Users can view own notifications"
ON public.notifications
FOR SELECT
USING (auth.uid() = recipient_id);

-- HR can view all notifications
CREATE POLICY "HR can view all notifications"
ON public.notifications
FOR SELECT
USING (has_role(auth.uid(), 'hr'::app_role));

-- Super admin can manage all notifications
CREATE POLICY "Super admin can manage notifications"
ON public.notifications
FOR ALL
USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Users can mark their own as read
CREATE POLICY "Users can update own notification status"
ON public.notifications
FOR UPDATE
USING (auth.uid() = recipient_id)
WITH CHECK (auth.uid() = recipient_id);

-- RLS Policies for preferences

-- Users can manage own preferences
CREATE POLICY "Users can manage own preferences"
ON public.notification_preferences
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Super admin can view all preferences
CREATE POLICY "Super admin can view preferences"
ON public.notification_preferences
FOR SELECT
USING (has_role(auth.uid(), 'super_admin'::app_role));

-- RLS Policies for escalations

-- Managers and HR can view escalations
CREATE POLICY "Managers and HR can view escalations"
ON public.escalations
FOR SELECT
USING (
  has_role(auth.uid(), 'manager'::app_role) OR 
  has_role(auth.uid(), 'hr'::app_role) OR
  has_role(auth.uid(), 'super_admin'::app_role)
);

-- Only system can create escalations (from Edge Function)
-- This is enforced at application level

-- Indexes for performance
CREATE INDEX idx_notifications_recipient_unread 
  ON public.notifications(recipient_id, read) 
  WHERE read = FALSE;

CREATE INDEX idx_notifications_scheduled 
  ON public.notifications(scheduled_send) 
  WHERE sent_at IS NULL;

CREATE INDEX idx_notifications_type 
  ON public.notifications(type);

CREATE INDEX idx_escalations_task 
  ON public.escalations(task_id);

CREATE INDEX idx_escalations_created 
  ON public.escalations(created_at DESC);

CREATE INDEX idx_notification_logs_notification 
  ON public.notification_logs(notification_id);

CREATE INDEX idx_notification_logs_status 
  ON public.notification_logs(status);

-- Trigger to update updated_at
CREATE TRIGGER update_notifications_updated_at
BEFORE UPDATE ON public.notifications
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_notification_preferences_updated_at
BEFORE UPDATE ON public.notification_preferences
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();
