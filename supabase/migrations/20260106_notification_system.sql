-- ============================================================================
-- NOTIFICATION SYSTEM - Automatic Triggers & AI Automation Support
-- ============================================================================

-- Helper function to create notification
CREATE OR REPLACE FUNCTION notify_users(
  p_user_ids UUID[],
  p_title TEXT,
  p_message TEXT,
  p_type TEXT DEFAULT 'update',
  p_priority TEXT DEFAULT 'normal',
  p_entity_type TEXT DEFAULT NULL,
  p_entity_id UUID DEFAULT NULL,
  p_deep_link TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS void AS $$
BEGIN
  INSERT INTO notifications (
    user_id,
    title,
    message,
    type,
    priority,
    related_entity_type,
    related_entity_id,
    deep_link,
    metadata,
    status
  )
  SELECT
    unnest(p_user_ids),
    p_title,
    p_message,
    p_type,
    p_priority,
    p_entity_type,
    p_entity_id,
    p_deep_link,
    p_metadata,
    'pending';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- LEAD NOTIFICATIONS
-- ============================================================================

-- Notify on lead stage change
CREATE OR REPLACE FUNCTION notify_lead_stage_change()
RETURNS TRIGGER AS $$
DECLARE
  company_name TEXT;
  actor_name TEXT;
  is_ai_action BOOLEAN;
BEGIN
  -- Only notify if stage actually changed
  IF OLD.stage IS NOT DISTINCT FROM NEW.stage THEN
    RETURN NEW;
  END IF;

  -- Get company name
  SELECT name INTO company_name FROM companies WHERE id = NEW.company_id;

  -- Check if this is an AI action (metadata contains ai_generated flag)
  is_ai_action := COALESCE((NEW.custom_fields->>'ai_generated')::boolean, false);

  -- Get actor name
  IF is_ai_action THEN
    actor_name := 'AI Automation';
  ELSE
    SELECT full_name INTO actor_name FROM profiles WHERE id = NEW.owner_id;
  END IF;

  -- Notify owner
  PERFORM notify_users(
    ARRAY[NEW.owner_id],
    'Lead status gewijzigd: ' || company_name,
    format('%s heeft de lead "%s" verplaatst van %s naar %s',
      actor_name,
      NEW.title,
      COALESCE(OLD.stage, 'new'),
      NEW.stage
    ),
    'update',
    CASE 
      WHEN NEW.stage = 'closed_won' THEN 'high'
      WHEN NEW.stage = 'closed_lost' THEN 'normal'
      ELSE 'normal'
    END,
    'lead',
    NEW.id,
    '/pipeline?lead=' || NEW.id::text,
    jsonb_build_object(
      'old_stage', OLD.stage,
      'new_stage', NEW.stage,
      'is_ai_action', is_ai_action
    )
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS lead_stage_change_notification ON leads;
CREATE TRIGGER lead_stage_change_notification
  AFTER UPDATE OF stage ON leads
  FOR EACH ROW
  EXECUTE FUNCTION notify_lead_stage_change();

-- ============================================================================
-- QUOTE NOTIFICATIONS
-- ============================================================================

-- Notify on quote status change
CREATE OR REPLACE FUNCTION notify_quote_status_change()
RETURNS TRIGGER AS $$
DECLARE
  company_name TEXT;
  contact_name TEXT;
BEGIN
  -- Only notify if status actually changed
  IF OLD.status IS NOT DISTINCT FROM NEW.status THEN
    RETURN NEW;
  END IF;

  -- Get company and contact names
  SELECT c.name, COALESCE(ct.first_name || ' ' || ct.last_name, 'Onbekend')
  INTO company_name, contact_name
  FROM companies c
  LEFT JOIN contacts ct ON ct.id = NEW.contact_id
  WHERE c.id = NEW.company_id;

  -- Notify owner based on status
  CASE NEW.status
    WHEN 'sent' THEN
      PERFORM notify_users(
        ARRAY[NEW.owner_id],
        'Offerte verzonden: ' || NEW.quote_number,
        format('Offerte "%s" voor %s is verzonden naar %s',
          NEW.title,
          company_name,
          contact_name
        ),
        'update',
        'normal',
        'quote',
        NEW.id,
        '/quotes/' || NEW.id::text
      );
    
    WHEN 'accepted' THEN
      PERFORM notify_users(
        ARRAY[NEW.owner_id],
        '🎉 Offerte geaccepteerd: ' || NEW.quote_number,
        format('Offerte "%s" voor %s (€%s) is geaccepteerd!',
          NEW.title,
          company_name,
          NEW.total_amount
        ),
        'approval',
        'high',
        'quote',
        NEW.id,
        '/quotes/' || NEW.id::text,
        jsonb_build_object('amount', NEW.total_amount, 'company', company_name)
      );
    
    WHEN 'declined' THEN
      PERFORM notify_users(
        ARRAY[NEW.owner_id],
        'Offerte afgewezen: ' || NEW.quote_number,
        format('Offerte "%s" voor %s is afgewezen',
          NEW.title,
          company_name
        ),
        'update',
        'normal',
        'quote',
        NEW.id,
        '/quotes/' || NEW.id::text
      );
    
    WHEN 'expired' THEN
      PERFORM notify_users(
        ARRAY[NEW.owner_id],
        '⏰ Offerte verlopen: ' || NEW.quote_number,
        format('Offerte "%s" voor %s is verlopen',
          NEW.title,
          company_name
        ),
        'deadline',
        'normal',
        'quote',
        NEW.id,
        '/quotes/' || NEW.id::text
      );
  END CASE;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS quote_status_change_notification ON quotes;
CREATE TRIGGER quote_status_change_notification
  AFTER UPDATE OF status ON quotes
  FOR EACH ROW
  EXECUTE FUNCTION notify_quote_status_change();

-- ============================================================================
-- PROJECT NOTIFICATIONS
-- ============================================================================

-- Notify on project stage change
CREATE OR REPLACE FUNCTION notify_project_stage_change()
RETURNS TRIGGER AS $$
DECLARE
  company_name TEXT;
  is_ai_action BOOLEAN;
BEGIN
  -- Only notify if stage actually changed
  IF OLD.stage IS NOT DISTINCT FROM NEW.stage THEN
    RETURN NEW;
  END IF;

  SELECT name INTO company_name FROM companies WHERE id = NEW.company_id;
  is_ai_action := COALESCE((NEW.custom_fields->>'ai_generated')::boolean, false);

  -- Notify owner on significant stage changes
  IF NEW.stage IN ('quote_signed', 'live', 'lost') THEN
    PERFORM notify_users(
      ARRAY[NEW.owner_id],
      CASE 
        WHEN NEW.stage = 'live' THEN '🚀 Project live: ' || NEW.title
        WHEN NEW.stage = 'quote_signed' THEN '✅ Quote getekend: ' || NEW.title
        WHEN NEW.stage = 'lost' THEN 'Project verloren: ' || NEW.title
      END,
      format('Project "%s" voor %s is %s',
        NEW.title,
        company_name,
        CASE NEW.stage
          WHEN 'live' THEN 'live gegaan!'
          WHEN 'quote_signed' THEN 'getekend en klaar voor ontwikkeling'
          WHEN 'lost' THEN 'verloren'
          ELSE 'gewijzigd'
        END
      ),
      'update',
      CASE 
        WHEN NEW.stage = 'live' THEN 'high'
        WHEN NEW.stage = 'quote_signed' THEN 'high'
        ELSE 'normal'
      END,
      'project',
      NEW.id,
      '/projects/' || NEW.id::text,
      jsonb_build_object(
        'old_stage', OLD.stage,
        'new_stage', NEW.stage,
        'is_ai_action', is_ai_action,
        'value', NEW.value
      )
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS project_stage_change_notification ON projects;
CREATE TRIGGER project_stage_change_notification
  AFTER UPDATE OF stage ON projects
  FOR EACH ROW
  EXECUTE FUNCTION notify_project_stage_change();

-- ============================================================================
-- TASK DEADLINE REMINDERS (Scheduled Job - Run Daily)
-- ============================================================================

CREATE OR REPLACE FUNCTION notify_overdue_tasks()
RETURNS void AS $$
DECLARE
  task RECORD;
  company_name TEXT;
BEGIN
  FOR task IN
    SELECT i.*, p.full_name as owner_name
    FROM interactions i
    JOIN profiles p ON p.id = i.user_id
    WHERE i.is_task = true
      AND i.task_status = 'pending'
      AND i.due_date < CURRENT_DATE
      AND i.due_date >= CURRENT_DATE - INTERVAL '7 days'
  LOOP
    -- Get company name if exists
    IF task.company_id IS NOT NULL THEN
      SELECT name INTO company_name FROM companies WHERE id = task.company_id;
    ELSE
      company_name := 'Geen bedrijf';
    END IF;

    PERFORM notify_users(
      ARRAY[task.user_id],
      '⚠️ Taak verlopen: ' || task.subject,
      format('Taak "%s" voor %s was gepland op %s',
        task.subject,
        company_name,
        to_char(task.due_date, 'DD-MM-YYYY')
      ),
      'deadline',
      'high',
      'task',
      task.id,
      '/interactions?task=' || task.id::text,
      jsonb_build_object(
        'due_date', task.due_date,
        'days_overdue', CURRENT_DATE - task.due_date
      )
    );
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- AI AUTOMATION NOTIFICATIONS
-- ============================================================================

-- Function for AI bulk operation digest
CREATE OR REPLACE FUNCTION notify_ai_bulk_operation(
  p_user_id UUID,
  p_operation_type TEXT, -- 'scraping', 'kvk_import', 'bulk_email', 'bulk_status_update'
  p_success_count INTEGER,
  p_failure_count INTEGER,
  p_details JSONB DEFAULT '{}'::jsonb
)
RETURNS void AS $$
DECLARE
  total_count INTEGER;
  success_rate NUMERIC;
  priority TEXT;
  title TEXT;
  message TEXT;
BEGIN
  total_count := p_success_count + p_failure_count;
  success_rate := CASE WHEN total_count > 0 
    THEN (p_success_count::NUMERIC / total_count * 100) 
    ELSE 0 
  END;

  -- Determine priority based on success rate
  priority := CASE
    WHEN success_rate >= 90 THEN 'normal'
    WHEN success_rate >= 50 THEN 'high'
    ELSE 'urgent'
  END;

  -- Build title and message
  title := CASE p_operation_type
    WHEN 'scraping' THEN format('🤖 Scraping compleet: %s bedrijven', total_count)
    WHEN 'kvk_import' THEN format('🏢 KVK import compleet: %s bedrijven', total_count)
    WHEN 'bulk_email' THEN format('📧 Bulk emails verstuurd: %s mails', total_count)
    WHEN 'bulk_status_update' THEN format('🔄 Status updates: %s records', total_count)
    ELSE format('AI operatie compleet: %s items', total_count)
  END;

  message := format(
    'Succes: %s | Mislukt: %s | Slagingspercentage: %s%%',
    p_success_count,
    p_failure_count,
    ROUND(success_rate, 1)
  );

  -- Add failure details if present
  IF p_failure_count > 0 AND p_details ? 'failures' THEN
    message := message || E'\n\nMislukking redenen: ' || 
      (SELECT string_agg(value::text, ', ') 
       FROM jsonb_array_elements_text(p_details->'failures') 
       LIMIT 5);
  END IF;

  INSERT INTO notifications (
    user_id,
    title,
    message,
    type,
    priority,
    metadata,
    is_digest,
    digest_items,
    deep_link,
    status
  ) VALUES (
    p_user_id,
    title,
    message,
    'digest',
    priority,
    jsonb_build_object(
      'operation_type', p_operation_type,
      'success_count', p_success_count,
      'failure_count', p_failure_count,
      'success_rate', success_rate
    ),
    true,
    p_details->'items',
    '/dashboard/super-admin?tab=ai-operations',
    'pending'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function for single AI automation failure (high priority)
CREATE OR REPLACE FUNCTION notify_ai_failure(
  p_user_id UUID,
  p_operation TEXT,
  p_entity_type TEXT,
  p_entity_id UUID,
  p_error_message TEXT
)
RETURNS void AS $$
BEGIN
  INSERT INTO notifications (
    user_id,
    title,
    message,
    type,
    priority,
    related_entity_type,
    related_entity_id,
    metadata,
    status
  ) VALUES (
    p_user_id,
    '❌ AI Automation fout: ' || p_operation,
    format('Fout tijdens %s voor %s: %s', 
      p_operation, 
      p_entity_type, 
      SUBSTRING(p_error_message, 1, 200)
    ),
    'escalation',
    'urgent',
    p_entity_type,
    p_entity_id,
    jsonb_build_object(
      'operation', p_operation,
      'error', p_error_message,
      'timestamp', NOW()
    ),
    'pending'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- NOTIFICATION PREFERENCES (Future Enhancement)
-- ============================================================================

CREATE TABLE IF NOT EXISTS notification_preferences (
  user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Channel preferences
  channels JSONB DEFAULT '{"in_app": true, "email": false, "sms": false}'::jsonb,
  
  -- Type preferences (which events to receive)
  enabled_types JSONB DEFAULT '["deadline", "approval", "update", "reminder", "escalation", "digest"]'::jsonb,
  
  -- Digest preferences
  digest_enabled BOOLEAN DEFAULT true,
  digest_frequency TEXT DEFAULT 'daily' CHECK (digest_frequency IN ('hourly', 'daily', 'weekly')),
  digest_time TIME DEFAULT '09:00:00',
  
  -- AI automation preferences
  ai_notifications_enabled BOOLEAN DEFAULT true,
  ai_digest_only BOOLEAN DEFAULT true, -- Only receive digest for AI bulk operations
  ai_failure_notify BOOLEAN DEFAULT true, -- Always notify on AI failures
  
  -- Do not disturb
  dnd_enabled BOOLEAN DEFAULT false,
  dnd_start TIME,
  dnd_end TIME,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER update_notification_preferences_updated_at
  BEFORE UPDATE ON notification_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create default preferences for existing users
INSERT INTO notification_preferences (user_id)
SELECT id FROM profiles
ON CONFLICT (user_id) DO NOTHING;

-- ============================================================================
-- RLS POLICIES FOR NOTIFICATIONS
-- ============================================================================

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;
DROP POLICY IF EXISTS "System can insert notifications" ON notifications;

CREATE POLICY "Users can view own notifications" ON notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications" ON notifications
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "System can insert notifications" ON notifications
  FOR INSERT WITH CHECK (true);

-- Notification preferences RLS
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own preferences" ON notification_preferences;
DROP POLICY IF EXISTS "Users can update own preferences" ON notification_preferences;

CREATE POLICY "Users can view own preferences" ON notification_preferences
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own preferences" ON notification_preferences
  FOR UPDATE USING (auth.uid() = user_id);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_notifications_user_status ON notifications(user_id, status);
CREATE INDEX IF NOT EXISTS idx_notifications_scheduled_for ON notifications(scheduled_for) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_notifications_entity ON notifications(related_entity_type, related_entity_id);
CREATE INDEX IF NOT EXISTS idx_notifications_digest ON notifications(user_id, is_digest) WHERE is_digest = true;
