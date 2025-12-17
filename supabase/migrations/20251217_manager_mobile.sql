-- =====================================================
-- MANAGER MOBILE DASHBOARD TABLES
-- =====================================================

-- Manager Team Assignments
CREATE TABLE IF NOT EXISTS manager_team_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  manager_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  team_member_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  assigned_date DATE DEFAULT CURRENT_DATE,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(manager_id, team_member_id)
);

-- Approval Actions (for undo feature)
CREATE TABLE IF NOT EXISTS approval_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  manager_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  request_id UUID NOT NULL,
  request_type VARCHAR(50) NOT NULL CHECK (request_type IN ('leave', 'overtime', 'expense', 'timesheet')),
  action VARCHAR(20) NOT NULL CHECK (action IN ('approve', 'deny')),
  reason TEXT,
  actioned_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  undo_before TIMESTAMP WITH TIME ZONE DEFAULT (now() + INTERVAL '5 minutes'),
  undone BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Team Chat Messages
CREATE TABLE IF NOT EXISTS team_chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  message_type VARCHAR(20) DEFAULT 'text' CHECK (message_type IN ('text', 'poll', 'announcement', 'meeting')),
  metadata JSONB DEFAULT '{}',
  edited_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Quick Polls
CREATE TABLE IF NOT EXISTS quick_polls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  options JSONB NOT NULL, -- Array of option strings
  deadline TIMESTAMP WITH TIME ZONE NOT NULL,
  anonymous BOOLEAN DEFAULT FALSE,
  archived BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Poll Responses
CREATE TABLE IF NOT EXISTS poll_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id UUID NOT NULL REFERENCES quick_polls(id) ON DELETE CASCADE,
  responder_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  option_index INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(poll_id, responder_id)
);

-- Manager Voice Commands Log (for analytics)
CREATE TABLE IF NOT EXISTS voice_command_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  manager_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  transcript TEXT,
  command_type VARCHAR(50),
  action_taken VARCHAR(100),
  success BOOLEAN DEFAULT TRUE,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_team_assignments_manager ON manager_team_assignments(manager_id);
CREATE INDEX IF NOT EXISTS idx_team_assignments_member ON manager_team_assignments(team_member_id);
CREATE INDEX IF NOT EXISTS idx_team_assignments_active ON manager_team_assignments(active) WHERE active = TRUE;
CREATE INDEX IF NOT EXISTS idx_approval_actions_manager ON approval_actions(manager_id);
CREATE INDEX IF NOT EXISTS idx_approval_actions_undo ON approval_actions(undo_before) WHERE undone = FALSE;
CREATE INDEX IF NOT EXISTS idx_chat_messages_team ON team_chat_messages(team_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created ON team_chat_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_polls_team ON quick_polls(team_id);
CREATE INDEX IF NOT EXISTS idx_polls_deadline ON quick_polls(deadline);
CREATE INDEX IF NOT EXISTS idx_poll_responses_poll ON poll_responses(poll_id);
CREATE INDEX IF NOT EXISTS idx_voice_command_log_manager ON voice_command_log(manager_id);

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

ALTER TABLE manager_team_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE quick_polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE poll_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE voice_command_log ENABLE ROW LEVEL SECURITY;

-- Managers can view/manage their team assignments
CREATE POLICY "Managers view own team"
  ON manager_team_assignments FOR SELECT
  USING (auth.uid() = manager_id);

CREATE POLICY "Only HR can create assignments"
  ON manager_team_assignments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role IN ('hr', 'super_admin')
    )
  );

-- Approval actions visible to manager only
CREATE POLICY "Managers view own approvals"
  ON approval_actions FOR SELECT
  USING (auth.uid() = manager_id);

CREATE POLICY "Managers create approvals"
  ON approval_actions FOR INSERT
  WITH CHECK (auth.uid() = manager_id);

-- Chat messages for team members
CREATE POLICY "Team members can view chat"
  ON team_chat_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM manager_team_assignments mta
      JOIN profiles p ON mta.team_member_id = p.id
      WHERE mta.team_id = (
        SELECT id FROM departments WHERE id = team_chat_messages.team_id
      )
      AND (mta.manager_id = auth.uid() OR p.id = auth.uid())
    )
  );

CREATE POLICY "Authenticated users can send chat"
  ON team_chat_messages FOR INSERT
  WITH CHECK (auth.uid() = sender_id);

-- Polls visible to team
CREATE POLICY "Team members view polls"
  ON quick_polls FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM manager_team_assignments
      WHERE manager_team_assignments.team_id = quick_polls.team_id
    )
  );

CREATE POLICY "Managers create polls"
  ON quick_polls FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role IN ('manager', 'hr', 'super_admin')
    )
  );

-- Poll responses
CREATE POLICY "Authenticated users respond to polls"
  ON poll_responses FOR INSERT
  WITH CHECK (auth.uid() = responder_id);

CREATE POLICY "Users view responses"
  ON poll_responses FOR SELECT
  USING (true);

-- Voice commands log
CREATE POLICY "Managers view own logs"
  ON voice_command_log FOR SELECT
  USING (auth.uid() = manager_id);

CREATE POLICY "Log commands"
  ON voice_command_log FOR INSERT
  WITH CHECK (auth.uid() = manager_id);

-- =====================================================
-- VIEWS FOR MANAGER DASHBOARD
-- =====================================================

-- Team status for heatmap
CREATE OR REPLACE VIEW team_daily_status AS
SELECT
  DATE(current_date) as date,
  mta.manager_id,
  mta.team_id,
  COUNT(DISTINCT mta.team_member_id) as total_team_size,
  COUNT(DISTINCT CASE WHEN slc.case_status = 'on_leave' THEN mta.team_member_id END) as on_leave,
  COUNT(DISTINCT CASE WHEN slc.case_status = 'sick' THEN mta.team_member_id END) as sick,
  ROUND(
    (COUNT(DISTINCT mta.team_member_id) - 
     COUNT(DISTINCT CASE WHEN slc.case_status IN ('on_leave', 'sick') THEN mta.team_member_id END)) * 100.0 / 
    NULLIF(COUNT(DISTINCT mta.team_member_id), 0)
  ) as capacity_percentage
FROM manager_team_assignments mta
LEFT JOIN sick_leave_cases slc ON mta.team_member_id = slc.employee_id
  AND slc.start_date <= CURRENT_DATE
  AND slc.end_date >= CURRENT_DATE
WHERE mta.active = TRUE
GROUP BY mta.manager_id, mta.team_id;

-- Pending approvals for manager
CREATE OR REPLACE VIEW manager_pending_approvals AS
SELECT
  lr.id,
  'leave' as request_type,
  lr.employee_id,
  p.voornaam,
  p.achternaam,
  p.avatar_url,
  lr.request_type as leave_type,
  lr.start_date,
  lr.end_date,
  (lr.end_date - lr.start_date)::integer as days_requested,
  lr.reason as details,
  lr.created_at as submitted_at,
  lr.case_id
FROM leave_requests lr
JOIN profiles p ON lr.employee_id = p.id
WHERE lr.status = 'pending'
ORDER BY lr.created_at ASC;

-- =====================================================
-- VERIFICATION
-- =====================================================

SELECT 
  'Manager Mobile tables deployed!' as status,
  (SELECT COUNT(*) FROM information_schema.tables 
   WHERE table_schema = 'public' 
   AND table_name IN (
     'manager_team_assignments', 'approval_actions', 'team_chat_messages',
     'quick_polls', 'poll_responses', 'voice_command_log'
   )) as tables_created;
