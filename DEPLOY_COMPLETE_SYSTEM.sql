-- =====================================================
-- COMPLETE DIRQ SYSTEM DEPLOYMENT
-- Run this ONCE in Supabase SQL Editor (Dashboard)
-- =====================================================
-- This includes:
-- 1. Notification System (with intelligent routing)
-- 2. AI Chat & Document Processing
-- 3. Workflow Automation Engine
-- =====================================================

-- ============================================
-- PART 1: AI FEATURES (Chat & Documents)
-- ============================================

-- Chat Messages Table
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  session_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Chat Sessions Table
CREATE TABLE IF NOT EXISTS chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT,
  last_message_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add foreign key for session_id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'chat_messages_session_id_fkey'
  ) THEN
    ALTER TABLE chat_messages 
    ADD CONSTRAINT chat_messages_session_id_fkey 
    FOREIGN KEY (session_id) REFERENCES chat_sessions(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Chat Feedback Table
CREATE TABLE IF NOT EXISTS chat_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES chat_messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  is_helpful BOOLEAN NOT NULL,
  feedback_text TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- AI Audit Log
CREATE TABLE IF NOT EXISTS ai_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  user_role TEXT NOT NULL,
  query TEXT NOT NULL,
  response TEXT NOT NULL,
  tokens_used INTEGER,
  response_time_ms INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Document Metadata Table (AI Processing)
CREATE TABLE IF NOT EXISTS document_metadata (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  
  detected_category TEXT CHECK (detected_category IN ('arbeidscontract', 'medisch', 'training', 'persoonlijk', 'factuur', 'overig')),
  confidence_score DECIMAL(3,2),
  extracted_text TEXT,
  extracted_data JSONB DEFAULT '{}',
  
  is_complete BOOLEAN DEFAULT false,
  is_valid BOOLEAN DEFAULT true,
  validation_notes JSONB DEFAULT '[]',
  missing_elements TEXT[],
  
  has_signature BOOLEAN,
  expiry_date DATE,
  key_dates JSONB DEFAULT '[]',
  mentioned_names TEXT[],
  mentioned_amounts DECIMAL(10,2)[],
  
  processing_status TEXT DEFAULT 'pending' CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed')),
  processing_error TEXT,
  
  processed_at TIMESTAMP WITH TIME ZONE,
  processed_by UUID REFERENCES profiles(id),
  ocr_language TEXT DEFAULT 'nld',
  page_count INTEGER,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- ============================================
-- PART 2: NOTIFICATION SYSTEM
-- ============================================

-- Create ENUMs if they don't exist
DO $$ BEGIN
  CREATE TYPE notification_channel AS ENUM ('in_app', 'email', 'sms', 'push');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE notification_priority AS ENUM ('low', 'normal', 'high', 'urgent', 'critical');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE notification_type AS ENUM ('deadline', 'approval', 'update', 'reminder', 'escalation', 'digest');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE notification_status AS ENUM ('pending', 'sent', 'delivered', 'read', 'acted', 'failed');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Notifications Table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type notification_type NOT NULL DEFAULT 'update',
  priority notification_priority DEFAULT 'normal',
  
  metadata JSONB DEFAULT '{}',
  related_entity_type TEXT,
  related_entity_id UUID,
  
  actions JSONB DEFAULT '[]',
  deep_link TEXT,
  
  channels notification_channel[] DEFAULT ARRAY['in_app']::notification_channel[],
  status notification_status DEFAULT 'pending',
  
  scheduled_for TIMESTAMP WITH TIME ZONE DEFAULT now(),
  sent_at TIMESTAMP WITH TIME ZONE,
  read_at TIMESTAMP WITH TIME ZONE,
  acted_at TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add missing columns if they don't exist (for existing tables)
DO $$
BEGIN
  -- Add type column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'notifications' 
    AND column_name = 'type'
  ) THEN
    ALTER TABLE notifications ADD COLUMN type notification_type NOT NULL DEFAULT 'update';
  END IF;
  
  -- Add priority column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'notifications' 
    AND column_name = 'priority'
  ) THEN
    ALTER TABLE notifications ADD COLUMN priority notification_priority DEFAULT 'normal';
  END IF;
  
  -- Add status column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'notifications' 
    AND column_name = 'status'
  ) THEN
    ALTER TABLE notifications ADD COLUMN status notification_status DEFAULT 'pending';
  END IF;
  
  -- Add channels column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'notifications' 
    AND column_name = 'channels'
  ) THEN
    ALTER TABLE notifications ADD COLUMN channels notification_channel[] DEFAULT ARRAY['in_app']::notification_channel[];
  END IF;
  
  -- Add sent_at column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'notifications' 
    AND column_name = 'sent_at'
  ) THEN
    ALTER TABLE notifications ADD COLUMN sent_at TIMESTAMP WITH TIME ZONE;
  END IF;
  
  -- Add scheduled_for column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'notifications' 
    AND column_name = 'scheduled_for'
  ) THEN
    ALTER TABLE notifications ADD COLUMN scheduled_for TIMESTAMP WITH TIME ZONE DEFAULT now();
  END IF;
  
  -- Add acted_at column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'notifications' 
    AND column_name = 'acted_at'
  ) THEN
    ALTER TABLE notifications ADD COLUMN acted_at TIMESTAMP WITH TIME ZONE;
  END IF;
END $$;

-- Notification Preferences
CREATE TABLE IF NOT EXISTS notification_preferences (
  user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
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

-- Escalations
CREATE TABLE IF NOT EXISTS escalations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  escalated_from UUID REFERENCES profiles(id),
  escalated_to UUID REFERENCES profiles(id),
  reason VARCHAR(50),
  resolved BOOLEAN DEFAULT FALSE,
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Notification Logs
CREATE TABLE IF NOT EXISTS notification_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id UUID REFERENCES notifications(id) ON DELETE CASCADE,
  channel VARCHAR(20),
  recipient VARCHAR(255),
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  external_id TEXT,
  status VARCHAR(20) DEFAULT 'pending',
  error_message TEXT
);

-- Push Subscriptions
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL UNIQUE,
  auth TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Escalation History
CREATE TABLE IF NOT EXISTS escalation_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id UUID REFERENCES notifications(id) ON DELETE CASCADE,
  rule_id UUID,
  from_user_id UUID REFERENCES profiles(id),
  to_user_id UUID REFERENCES profiles(id),
  level INTEGER NOT NULL,
  escalated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- PART 3: WORKFLOW AUTOMATION
-- ============================================

-- Workflows Table
CREATE TABLE IF NOT EXISTS workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  definition JSONB NOT NULL DEFAULT '{"nodes": [], "edges": []}',
  
  created_by UUID NOT NULL REFERENCES profiles(id),
  category TEXT CHECK (category IN ('onboarding', 'offboarding', 'verzuim', 'contract', 'performance', 'other')),
  
  is_active BOOLEAN DEFAULT true,
  is_template BOOLEAN DEFAULT false,
  
  version INTEGER DEFAULT 1,
  parent_workflow_id UUID REFERENCES workflows(id),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Workflow Executions
CREATE TABLE IF NOT EXISTS workflow_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
  workflow_version INTEGER NOT NULL,
  
  triggered_by UUID REFERENCES profiles(id),
  trigger_type TEXT NOT NULL CHECK (trigger_type IN ('manual', 'event', 'schedule')),
  trigger_event TEXT,
  
  input_data JSONB DEFAULT '{}',
  context JSONB DEFAULT '{}',
  
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
  current_node_id TEXT,
  
  result JSONB DEFAULT '{}',
  error_message TEXT,
  
  started_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Workflow Execution Steps
CREATE TABLE IF NOT EXISTS workflow_execution_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  execution_id UUID NOT NULL REFERENCES workflow_executions(id) ON DELETE CASCADE,
  node_id TEXT NOT NULL,
  node_type TEXT NOT NULL,
  
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'skipped')),
  
  input_data JSONB DEFAULT '{}',
  output_data JSONB DEFAULT '{}',
  error_message TEXT,
  
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- ============================================
-- PART 4: ENABLE RLS
-- ============================================

ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_metadata ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE escalations ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE escalation_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_execution_steps ENABLE ROW LEVEL SECURITY;

-- ============================================
-- PART 5: RLS POLICIES
-- ============================================

-- Drop existing policies (all tables)
DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
DROP POLICY IF EXISTS "HR can view all notifications" ON notifications;
DROP POLICY IF EXISTS "Super admin can manage notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update own notification status" ON notifications;
DROP POLICY IF EXISTS "Users can manage own preferences" ON notification_preferences;
DROP POLICY IF EXISTS "Super admin can view preferences" ON notification_preferences;
DROP POLICY IF EXISTS "Managers and HR can view escalations" ON escalations;
DROP POLICY IF EXISTS "Users can manage own push subscriptions" ON push_subscriptions;
DROP POLICY IF EXISTS "Users can manage own chat messages" ON chat_messages;
DROP POLICY IF EXISTS "Users can manage own chat sessions" ON chat_sessions;
DROP POLICY IF EXISTS "Users can view workflows" ON workflows;
DROP POLICY IF EXISTS "HR can manage workflows" ON workflows;

-- Notification Policies
CREATE POLICY "Users can view own notifications"
ON notifications FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "HR can view all notifications"
ON notifications FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid() AND role IN ('hr', 'super_admin')
  )
);

CREATE POLICY "Super admin can manage notifications"
ON notifications FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid() AND role = 'super_admin'
  )
);

CREATE POLICY "Users can update own notification status"
ON notifications FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Preferences Policies
CREATE POLICY "Users can manage own preferences"
ON notification_preferences FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Super admin can view preferences"
ON notification_preferences FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid() AND role = 'super_admin'
  )
);

-- Escalation Policies
CREATE POLICY "Managers and HR can view escalations"
ON escalations FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid() AND role IN ('manager', 'hr', 'super_admin')
  )
);

-- Push Subscription Policies
CREATE POLICY "Users can manage own push subscriptions"
ON push_subscriptions FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Chat Policies
CREATE POLICY "Users can manage own chat messages"
ON chat_messages FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage own chat sessions"
ON chat_sessions FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Workflow Policies
CREATE POLICY "Users can view workflows"
ON workflows FOR SELECT
USING (true);

CREATE POLICY "HR can manage workflows"
ON workflows FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid() AND role IN ('hr', 'super_admin')
  )
);

-- ============================================
-- PART 6: INDEXES
-- ============================================

-- Notification Indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread 
  ON notifications(user_id, status) WHERE status != 'read'::notification_status;
CREATE INDEX IF NOT EXISTS idx_notifications_scheduled 
  ON notifications(scheduled_for) WHERE sent_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC);

-- Escalation Indexes
CREATE INDEX IF NOT EXISTS idx_escalations_task ON escalations(task_id);
CREATE INDEX IF NOT EXISTS idx_escalations_created ON escalations(created_at DESC);

-- Notification Log Indexes
CREATE INDEX IF NOT EXISTS idx_notification_logs_notification ON notification_logs(notification_id);
CREATE INDEX IF NOT EXISTS idx_notification_logs_status ON notification_logs(status);

-- Push Subscription Indexes
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user ON push_subscriptions(user_id);

-- Chat Indexes
CREATE INDEX IF NOT EXISTS idx_chat_messages_user_id ON chat_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_session_id ON chat_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_id ON chat_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_last_message ON chat_sessions(last_message_at DESC);

-- Workflow Indexes
CREATE INDEX IF NOT EXISTS idx_workflows_category ON workflows(category);
CREATE INDEX IF NOT EXISTS idx_workflows_is_active ON workflows(is_active);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_workflow ON workflow_executions(workflow_id);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_status ON workflow_executions(status);
CREATE INDEX IF NOT EXISTS idx_workflow_execution_steps_execution ON workflow_execution_steps(execution_id);

-- Document Metadata Indexes
CREATE INDEX IF NOT EXISTS idx_document_metadata_document_id ON document_metadata(document_id);
CREATE INDEX IF NOT EXISTS idx_document_metadata_category ON document_metadata(detected_category);
CREATE INDEX IF NOT EXISTS idx_document_metadata_status ON document_metadata(processing_status);

-- ============================================
-- PART 7: TRIGGERS
-- ============================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'handle_updated_at') THEN
    -- Notifications
    DROP TRIGGER IF EXISTS update_notifications_updated_at ON notifications;
    CREATE TRIGGER update_notifications_updated_at
    BEFORE UPDATE ON notifications
    FOR EACH ROW
    EXECUTE FUNCTION handle_updated_at();

    -- Notification Preferences
    DROP TRIGGER IF EXISTS update_notification_preferences_updated_at ON notification_preferences;
    CREATE TRIGGER update_notification_preferences_updated_at
    BEFORE UPDATE ON notification_preferences
    FOR EACH ROW
    EXECUTE FUNCTION handle_updated_at();

    -- Chat Messages
    DROP TRIGGER IF EXISTS update_chat_messages_updated_at ON chat_messages;
    CREATE TRIGGER update_chat_messages_updated_at
    BEFORE UPDATE ON chat_messages
    FOR EACH ROW
    EXECUTE FUNCTION handle_updated_at();

    -- Chat Sessions
    DROP TRIGGER IF EXISTS update_chat_sessions_updated_at ON chat_sessions;
    CREATE TRIGGER update_chat_sessions_updated_at
    BEFORE UPDATE ON chat_sessions
    FOR EACH ROW
    EXECUTE FUNCTION handle_updated_at();

    -- Workflows
    DROP TRIGGER IF EXISTS update_workflows_updated_at ON workflows;
    CREATE TRIGGER update_workflows_updated_at
    BEFORE UPDATE ON workflows
    FOR EACH ROW
    EXECUTE FUNCTION handle_updated_at();

    -- Document Metadata
    DROP TRIGGER IF EXISTS update_document_metadata_updated_at ON document_metadata;
    CREATE TRIGGER update_document_metadata_updated_at
    BEFORE UPDATE ON document_metadata
    FOR EACH ROW
    EXECUTE FUNCTION handle_updated_at();
  END IF;
END $$;

-- ============================================
-- DONE!
-- ============================================

SELECT 
  'Complete Dirq System deployed successfully!' as status,
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN (
    'notifications', 'notification_preferences', 'escalations', 'notification_logs',
    'push_subscriptions', 'escalation_history', 'chat_messages', 'chat_sessions',
    'chat_feedback', 'ai_audit_log', 'document_metadata', 'workflows',
    'workflow_executions', 'workflow_execution_steps'
  )) as tables_created;
