-- ==============================================================================
-- INTELLIGENT NOTIFICATION SYSTEM
-- Smart batching, routing, escalation, and priority scoring
-- ==============================================================================

-- -----------------------------------------------------------------------------
-- 1. NOTIFICATION TABLES
-- -----------------------------------------------------------------------------

-- Notification Types Enum
CREATE TYPE notification_channel AS ENUM ('in_app', 'email', 'sms', 'push');
CREATE TYPE notification_priority AS ENUM ('low', 'normal', 'high', 'urgent', 'critical');
CREATE TYPE notification_type AS ENUM (
  'deadline', 
  'approval', 
  'update', 
  'reminder', 
  'escalation',
  'digest'
);
CREATE TYPE notification_status AS ENUM ('pending', 'sent', 'delivered', 'read', 'acted', 'failed');
CREATE TYPE digest_frequency AS ENUM ('instant', 'hourly', 'daily', 'weekly');

-- Notifications Table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Recipient
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Content
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type notification_type NOT NULL,
  priority notification_priority DEFAULT 'normal',
  priority_score INTEGER DEFAULT 50, -- AI-generated 0-100
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  related_entity_type TEXT, -- 'case', 'task', 'employee', 'document'
  related_entity_id UUID,
  
  -- Actions
  actions JSONB DEFAULT '[]', -- [{ label, action, url }]
  deep_link TEXT, -- Direct navigation URL
  
  -- Delivery
  channels notification_channel[] DEFAULT ARRAY['in_app']::notification_channel[],
  status notification_status DEFAULT 'pending',
  
  -- Timing
  scheduled_for TIMESTAMP WITH TIME ZONE DEFAULT now(),
  sent_at TIMESTAMP WITH TIME ZONE,
  delivered_at TIMESTAMP WITH TIME ZONE,
  read_at TIMESTAMP WITH TIME ZONE,
  acted_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  
  -- Batching
  batch_id UUID,
  is_digest BOOLEAN DEFAULT false,
  digest_items JSONB DEFAULT '[]',
  
  -- Escalation
  is_escalated BOOLEAN DEFAULT false,
  escalated_from UUID REFERENCES notifications(id),
  escalation_level INTEGER DEFAULT 0,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Notification Preferences Table
CREATE TABLE IF NOT EXISTS notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
  
  -- Global settings
  digest_frequency digest_frequency DEFAULT 'instant',
  quiet_hours_start TIME DEFAULT '20:00',
  quiet_hours_end TIME DEFAULT '08:00',
  weekend_mode BOOLEAN DEFAULT false,
  vacation_mode BOOLEAN DEFAULT false,
  vacation_delegate UUID REFERENCES profiles(id),
  
  -- Channel preferences per type
  deadline_channels notification_channel[] DEFAULT ARRAY['in_app', 'email']::notification_channel[],
  approval_channels notification_channel[] DEFAULT ARRAY['in_app', 'email', 'push']::notification_channel[],
  update_channels notification_channel[] DEFAULT ARRAY['in_app']::notification_channel[],
  reminder_channels notification_channel[] DEFAULT ARRAY['in_app', 'email']::notification_channel[],
  escalation_channels notification_channel[] DEFAULT ARRAY['in_app', 'email', 'sms', 'push']::notification_channel[],
  
  -- Priority routing
  urgent_channels notification_channel[] DEFAULT ARRAY['in_app', 'email', 'sms', 'push']::notification_channel[],
  high_channels notification_channel[] DEFAULT ARRAY['in_app', 'email', 'push']::notification_channel[],
  normal_channels notification_channel[] DEFAULT ARRAY['in_app', 'email']::notification_channel[],
  low_channels notification_channel[] DEFAULT ARRAY['in_app']::notification_channel[],
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Notification Rules Table (for automatic escalations)
CREATE TABLE IF NOT EXISTS notification_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  name TEXT NOT NULL,
  description TEXT,
  active BOOLEAN DEFAULT true,
  
  -- Trigger conditions
  entity_type TEXT NOT NULL, -- 'task', 'approval', 'case', 'document'
  trigger_event TEXT NOT NULL, -- 'created', 'deadline_approaching', 'overdue', 'not_completed'
  
  -- Timing
  delay_hours INTEGER DEFAULT 0, -- Wait X hours before triggering
  
  -- Escalation chain
  escalation_chain JSONB NOT NULL, -- [{ role: 'manager', after_hours: 24 }, { role: 'hr_director', after_hours: 48 }]
  
  -- Conditions
  conditions JSONB DEFAULT '{}', -- Additional filters
  
  -- Priority calculation
  base_priority notification_priority DEFAULT 'normal',
  priority_modifiers JSONB DEFAULT '{}', -- Rules to increase priority
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Notification Queue Table
CREATE TABLE IF NOT EXISTS notification_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  notification_id UUID NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
  channel notification_channel NOT NULL,
  
  status TEXT DEFAULT 'queued' CHECK (status IN ('queued', 'processing', 'sent', 'failed')),
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  
  error_message TEXT,
  
  scheduled_for TIMESTAMP WITH TIME ZONE DEFAULT now(),
  processed_at TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Notification Templates Table
CREATE TABLE IF NOT EXISTS notification_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  type notification_type NOT NULL,
  
  -- Templates per channel
  in_app_template TEXT,
  email_subject TEXT,
  email_body_html TEXT,
  email_body_text TEXT,
  sms_template TEXT,
  push_title TEXT,
  push_body TEXT,
  
  -- Variables
  variables TEXT[], -- Available template variables
  
  -- Default settings
  default_priority notification_priority DEFAULT 'normal',
  default_channels notification_channel[] DEFAULT ARRAY['in_app', 'email']::notification_channel[],
  
  active BOOLEAN DEFAULT true,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Escalation History Table
CREATE TABLE IF NOT EXISTS escalation_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  notification_id UUID NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
  rule_id UUID REFERENCES notification_rules(id),
  
  from_user_id UUID REFERENCES profiles(id),
  to_user_id UUID NOT NULL REFERENCES profiles(id),
  
  escalation_level INTEGER NOT NULL,
  reason TEXT NOT NULL,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- 2. INDEXES
-- -----------------------------------------------------------------------------

CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_status ON notifications(status);
CREATE INDEX idx_notifications_priority ON notifications(priority);
CREATE INDEX idx_notifications_priority_score ON notifications(priority_score DESC);
CREATE INDEX idx_notifications_scheduled_for ON notifications(scheduled_for);
CREATE INDEX idx_notifications_type ON notifications(type);
CREATE INDEX idx_notifications_read ON notifications(user_id, read_at) WHERE read_at IS NULL;
CREATE INDEX idx_notifications_batch_id ON notifications(batch_id) WHERE batch_id IS NOT NULL;

CREATE INDEX idx_notification_preferences_user_id ON notification_preferences(user_id);

CREATE INDEX idx_notification_queue_status ON notification_queue(status);
CREATE INDEX idx_notification_queue_scheduled ON notification_queue(scheduled_for) WHERE status = 'queued';

CREATE INDEX idx_escalation_history_notification_id ON escalation_history(notification_id);
CREATE INDEX idx_escalation_history_to_user ON escalation_history(to_user_id);

-- -----------------------------------------------------------------------------
-- 3. RLS POLICIES
-- -----------------------------------------------------------------------------

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE escalation_history ENABLE ROW LEVEL SECURITY;

-- Users can view their own notifications
DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  USING (auth.uid() = user_id);

-- System can insert notifications
DROP POLICY IF EXISTS "System can insert notifications" ON notifications;
CREATE POLICY "System can insert notifications"
  ON notifications FOR INSERT
  WITH CHECK (true);

-- Users can update their own notifications (mark as read, acted)
DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;
CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can manage their preferences
DROP POLICY IF EXISTS "Users can manage own preferences" ON notification_preferences;
CREATE POLICY "Users can manage own preferences"
  ON notification_preferences FOR ALL
  USING (auth.uid() = user_id);

-- HR can manage notification rules
DROP POLICY IF EXISTS "HR can manage rules" ON notification_rules;
CREATE POLICY "HR can manage rules"
  ON notification_rules FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('hr', 'super_admin')
    )
  );

-- Everyone can view templates
DROP POLICY IF EXISTS "Everyone can view templates" ON notification_templates;
CREATE POLICY "Everyone can view templates"
  ON notification_templates FOR SELECT
  USING (active = true);

-- Users can view escalations related to them
DROP POLICY IF EXISTS "Users can view own escalations" ON escalation_history;
CREATE POLICY "Users can view own escalations"
  ON escalation_history FOR SELECT
  USING (
    auth.uid() = from_user_id
    OR auth.uid() = to_user_id
  );

-- -----------------------------------------------------------------------------
-- 4. FUNCTIONS
-- -----------------------------------------------------------------------------

-- Function to calculate notification priority score
CREATE OR REPLACE FUNCTION calculate_priority_score(
  p_type notification_type,
  p_deadline TIMESTAMP WITH TIME ZONE,
  p_user_role TEXT,
  p_metadata JSONB
)
RETURNS INTEGER AS $$
DECLARE
  v_score INTEGER := 50;
  v_hours_until_deadline INTEGER;
BEGIN
  -- Base score by type
  CASE p_type
    WHEN 'escalation' THEN v_score := 90;
    WHEN 'approval' THEN v_score := 70;
    WHEN 'deadline' THEN v_score := 60;
    WHEN 'reminder' THEN v_score := 40;
    WHEN 'update' THEN v_score := 30;
    ELSE v_score := 50;
  END CASE;
  
  -- Deadline proximity modifier
  IF p_deadline IS NOT NULL THEN
    v_hours_until_deadline := EXTRACT(EPOCH FROM (p_deadline - now())) / 3600;
    
    IF v_hours_until_deadline < 0 THEN
      v_score := LEAST(v_score + 40, 100); -- Overdue
    ELSIF v_hours_until_deadline < 24 THEN
      v_score := LEAST(v_score + 30, 100); -- < 24h
    ELSIF v_hours_until_deadline < 72 THEN
      v_score := LEAST(v_score + 20, 100); -- < 3 days
    ELSIF v_hours_until_deadline < 168 THEN
      v_score := LEAST(v_score + 10, 100); -- < 1 week
    END IF;
  END IF;
  
  -- Role modifier
  IF p_user_role IN ('super_admin', 'hr') THEN
    v_score := LEAST(v_score + 5, 100);
  END IF;
  
  -- Critical flag in metadata
  IF (p_metadata->>'is_critical')::BOOLEAN = true THEN
    v_score := LEAST(v_score + 25, 100);
  END IF;
  
  -- Legal compliance flag
  IF (p_metadata->>'legal_compliance')::BOOLEAN = true THEN
    v_score := LEAST(v_score + 20, 100);
  END IF;
  
  RETURN GREATEST(0, LEAST(100, v_score));
END;
$$ LANGUAGE plpgsql;

-- Function to get notification channels based on priority and preferences
CREATE OR REPLACE FUNCTION get_notification_channels(
  p_user_id UUID,
  p_type notification_type,
  p_priority notification_priority
)
RETURNS notification_channel[] AS $$
DECLARE
  v_prefs RECORD;
  v_channels notification_channel[];
BEGIN
  -- Get user preferences
  SELECT * INTO v_prefs
  FROM notification_preferences
  WHERE user_id = p_user_id;
  
  -- If no preferences, use defaults
  IF v_prefs IS NULL THEN
    CASE p_priority
      WHEN 'critical', 'urgent' THEN
        RETURN ARRAY['in_app', 'email', 'sms', 'push']::notification_channel[];
      WHEN 'high' THEN
        RETURN ARRAY['in_app', 'email', 'push']::notification_channel[];
      WHEN 'normal' THEN
        RETURN ARRAY['in_app', 'email']::notification_channel[];
      ELSE
        RETURN ARRAY['in_app']::notification_channel[];
    END CASE;
  END IF;
  
  -- Check vacation mode
  IF v_prefs.vacation_mode AND v_prefs.vacation_delegate IS NOT NULL THEN
    -- Delegate to vacation delegate
    RETURN ARRAY['in_app']::notification_channel[]; -- Only in-app for delegated
  END IF;
  
  -- Priority-based routing takes precedence
  CASE p_priority
    WHEN 'critical', 'urgent' THEN
      RETURN v_prefs.urgent_channels;
    WHEN 'high' THEN
      RETURN v_prefs.high_channels;
    WHEN 'normal' THEN
      RETURN v_prefs.normal_channels;
    ELSE
      RETURN v_prefs.low_channels;
  END CASE;
END;
$$ LANGUAGE plpgsql;

-- Function to create notification with smart routing
CREATE OR REPLACE FUNCTION create_notification(
  p_user_id UUID,
  p_title TEXT,
  p_message TEXT,
  p_type notification_type,
  p_metadata JSONB DEFAULT '{}',
  p_deadline TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  p_actions JSONB DEFAULT '[]',
  p_deep_link TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_notification_id UUID;
  v_priority notification_priority;
  v_priority_score INTEGER;
  v_channels notification_channel[];
  v_user_role TEXT;
BEGIN
  -- Get user role
  SELECT role INTO v_user_role
  FROM profiles
  WHERE id = p_user_id;
  
  -- Calculate priority score
  v_priority_score := calculate_priority_score(p_type, p_deadline, v_user_role, p_metadata);
  
  -- Determine priority enum from score
  CASE
    WHEN v_priority_score >= 90 THEN v_priority := 'critical';
    WHEN v_priority_score >= 75 THEN v_priority := 'urgent';
    WHEN v_priority_score >= 60 THEN v_priority := 'high';
    WHEN v_priority_score >= 40 THEN v_priority := 'normal';
    ELSE v_priority := 'low';
  END CASE;
  
  -- Get notification channels
  v_channels := get_notification_channels(p_user_id, p_type, v_priority);
  
  -- Insert notification
  INSERT INTO notifications (
    user_id,
    title,
    message,
    type,
    priority,
    priority_score,
    channels,
    metadata,
    actions,
    deep_link,
    expires_at
  ) VALUES (
    p_user_id,
    p_title,
    p_message,
    p_type,
    v_priority,
    v_priority_score,
    v_channels,
    p_metadata,
    p_actions,
    p_deep_link,
    CASE WHEN p_deadline IS NOT NULL THEN p_deadline + INTERVAL '7 days' ELSE now() + INTERVAL '30 days' END
  )
  RETURNING id INTO v_notification_id;
  
  -- Queue for delivery on each channel
  INSERT INTO notification_queue (notification_id, channel)
  SELECT v_notification_id, unnest(v_channels);
  
  RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql;

-- Function to mark notification as read
CREATE OR REPLACE FUNCTION mark_notification_read(p_notification_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE notifications
  SET 
    read_at = now(),
    status = 'read',
    updated_at = now()
  WHERE id = p_notification_id
    AND read_at IS NULL;
END;
$$ LANGUAGE plpgsql;

-- Function to mark notification as acted
CREATE OR REPLACE FUNCTION mark_notification_acted(p_notification_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE notifications
  SET 
    acted_at = now(),
    status = 'acted',
    updated_at = now()
  WHERE id = p_notification_id
    AND acted_at IS NULL;
END;
$$ LANGUAGE plpgsql;

-- -----------------------------------------------------------------------------
-- 5. TRIGGERS
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION update_notification_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_notification_updated_at ON notifications;
CREATE TRIGGER trigger_update_notification_updated_at
  BEFORE UPDATE ON notifications
  FOR EACH ROW
  EXECUTE FUNCTION update_notification_updated_at();

DROP TRIGGER IF EXISTS trigger_update_notification_preferences_updated_at ON notification_preferences;
CREATE TRIGGER trigger_update_notification_preferences_updated_at
  BEFORE UPDATE ON notification_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_notification_updated_at();

-- -----------------------------------------------------------------------------
-- 6. DEFAULT DATA
-- -----------------------------------------------------------------------------

-- Insert default notification rules
INSERT INTO notification_rules (name, description, entity_type, trigger_event, escalation_chain, active) VALUES
  (
    'Task Overdue Escalation',
    'Escalate overdue tasks to manager after 24h, then HR director after 48h',
    'task',
    'overdue',
    '[
      {"role": "manager", "after_hours": 24},
      {"role": "hr", "after_hours": 48},
      {"role": "super_admin", "after_hours": 72}
    ]'::jsonb,
    true
  ),
  (
    'Approval Pending Escalation',
    'Escalate pending approvals after 48h',
    'approval',
    'pending',
    '[
      {"role": "manager", "after_hours": 48},
      {"role": "hr", "after_hours": 96}
    ]'::jsonb,
    true
  ),
  (
    'Wet Poortwachter Deadline',
    'Critical escalation for legal compliance deadlines',
    'case',
    'deadline_approaching',
    '[
      {"role": "hr", "after_hours": 12},
      {"role": "super_admin", "after_hours": 24}
    ]'::jsonb,
    true
  ),
  (
    'Contract Expiry Warning',
    'Notify HR 90, 60, 30 days before contract expiry',
    'employee',
    'contract_expiring',
    '[
      {"role": "hr", "after_hours": 0}
    ]'::jsonb,
    true
  )
ON CONFLICT DO NOTHING;

-- Insert default notification templates
INSERT INTO notification_templates (
  code, name, type, in_app_template, email_subject, email_body_html, 
  sms_template, push_title, push_body, variables, default_priority, default_channels
) VALUES
  (
    'task_assigned',
    'Task Assigned',
    'reminder',
    'Je hebt een nieuwe taak: {{task_title}}',
    'Nieuwe taak toegewezen: {{task_title}}',
    '<h2>Nieuwe taak</h2><p>{{task_description}}</p><p>Deadline: {{deadline}}</p>',
    'Nieuwe taak: {{task_title}}',
    'Nieuwe taak',
    '{{task_title}}',
    ARRAY['task_title', 'task_description', 'deadline'],
    'normal',
    ARRAY['in_app', 'email']::notification_channel[]
  ),
  (
    'approval_required',
    'Approval Required',
    'approval',
    '{{requester_name}} vraagt goedkeuring voor {{item_type}}',
    'Goedkeuring vereist: {{item_type}}',
    '<h2>Goedkeuringsverzoek</h2><p>Van: {{requester_name}}</p><p>{{item_description}}</p>',
    'Goedkeuring vereist van {{requester_name}}',
    'Goedkeuring vereist',
    '{{item_type}} van {{requester_name}}',
    ARRAY['requester_name', 'item_type', 'item_description'],
    'high',
    ARRAY['in_app', 'email', 'push']::notification_channel[]
  ),
  (
    'deadline_approaching',
    'Deadline Approaching',
    'deadline',
    'Deadline nadert: {{item_name}} over {{hours_remaining}} uur',
    'Deadline: {{item_name}}',
    '<h2>Deadline nadert</h2><p>{{item_name}}</p><p>Nog {{hours_remaining}} uur</p>',
    'Deadline {{item_name}} over {{hours_remaining}}h',
    'Deadline nadert',
    '{{item_name}}',
    ARRAY['item_name', 'hours_remaining'],
    'high',
    ARRAY['in_app', 'email', 'push']::notification_channel[]
  ),
  (
    'case_update',
    'Case Update',
    'update',
    'Verzuimzaak {{case_id}}: {{update_message}}',
    'Update: Verzuimzaak {{case_id}}',
    '<h2>Verzuimzaak update</h2><p>{{update_message}}</p>',
    NULL,
    'Verzuimzaak update',
    '{{update_message}}',
    ARRAY['case_id', 'update_message'],
    'normal',
    ARRAY['in_app', 'email']::notification_channel[]
  )
ON CONFLICT (code) DO NOTHING;

-- ==============================================================================
-- DEPLOYMENT COMPLETE
-- ==============================================================================
