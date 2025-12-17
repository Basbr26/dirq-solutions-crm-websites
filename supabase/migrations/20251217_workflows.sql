-- ==============================================================================
-- WORKFLOW AUTOMATION ENGINE SCHEMA
-- ==============================================================================

-- Workflow Definitions Table
CREATE TABLE IF NOT EXISTS workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  
  -- Visual workflow definition (React Flow format)
  definition JSONB NOT NULL DEFAULT '{"nodes": [], "edges": []}',
  
  -- Workflow metadata
  created_by UUID NOT NULL REFERENCES profiles(id),
  category TEXT CHECK (category IN ('onboarding', 'offboarding', 'verzuim', 'contract', 'performance', 'other')),
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  is_template BOOLEAN DEFAULT false,
  
  -- Version control
  version INTEGER DEFAULT 1,
  parent_workflow_id UUID REFERENCES workflows(id),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Workflow Executions Table
CREATE TABLE IF NOT EXISTS workflow_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
  workflow_version INTEGER NOT NULL,
  
  -- Execution context
  triggered_by UUID REFERENCES profiles(id),
  trigger_type TEXT NOT NULL CHECK (trigger_type IN ('manual', 'event', 'schedule')),
  trigger_event TEXT, -- e.g., 'employee.created', 'sick_leave.day_42'
  
  -- Execution data
  input_data JSONB DEFAULT '{}',
  context JSONB DEFAULT '{}', -- Variables and state during execution
  
  -- Status tracking
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
  current_node_id TEXT, -- Which node is currently being executed
  
  -- Result
  result JSONB DEFAULT '{}',
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  
  -- Timestamps
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Workflow Execution Logs Table
CREATE TABLE IF NOT EXISTS workflow_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  execution_id UUID NOT NULL REFERENCES workflow_executions(id) ON DELETE CASCADE,
  
  -- Log details
  node_id TEXT NOT NULL,
  node_type TEXT NOT NULL,
  log_level TEXT NOT NULL CHECK (log_level IN ('info', 'warning', 'error', 'debug')),
  message TEXT NOT NULL,
  
  -- Additional data
  details JSONB DEFAULT '{}',
  duration_ms INTEGER,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Workflow Templates Table (predefined workflows)
CREATE TABLE IF NOT EXISTS workflow_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  
  -- Template definition
  definition JSONB NOT NULL,
  
  -- Template metadata
  icon TEXT,
  tags TEXT[],
  is_system BOOLEAN DEFAULT false, -- System templates can't be deleted
  usage_count INTEGER DEFAULT 0,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Workflow Schedules Table (for scheduled triggers)
CREATE TABLE IF NOT EXISTS workflow_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
  
  -- Schedule configuration
  cron_expression TEXT NOT NULL, -- e.g., '0 9 * * 1' for every Monday at 9 AM
  timezone TEXT DEFAULT 'Europe/Amsterdam',
  
  is_active BOOLEAN DEFAULT true,
  
  -- Tracking
  last_run_at TIMESTAMP WITH TIME ZONE,
  next_run_at TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_workflows_created_by ON workflows(created_by);
CREATE INDEX IF NOT EXISTS idx_workflows_category ON workflows(category);
CREATE INDEX IF NOT EXISTS idx_workflows_is_active ON workflows(is_active);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_workflow_id ON workflow_executions(workflow_id);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_status ON workflow_executions(status);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_triggered_by ON workflow_executions(triggered_by);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_created_at ON workflow_executions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_workflow_logs_execution_id ON workflow_logs(execution_id);
CREATE INDEX IF NOT EXISTS idx_workflow_logs_created_at ON workflow_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_workflow_schedules_workflow_id ON workflow_schedules(workflow_id);
CREATE INDEX IF NOT EXISTS idx_workflow_schedules_next_run ON workflow_schedules(next_run_at) WHERE is_active = true;

-- RLS Policies
ALTER TABLE workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_schedules ENABLE ROW LEVEL SECURITY;

-- Workflows: HR and managers can view/edit
DROP POLICY IF EXISTS "HR can view all workflows" ON workflows;
CREATE POLICY "HR can view all workflows"
  ON workflows FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('hr', 'super_admin', 'manager')
    )
  );

DROP POLICY IF EXISTS "HR can manage workflows" ON workflows;
CREATE POLICY "HR can manage workflows"
  ON workflows FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('hr', 'super_admin')
    )
  );

-- Workflow Executions: Users can view their own triggered executions
DROP POLICY IF EXISTS "Users can view own executions" ON workflow_executions;
CREATE POLICY "Users can view own executions"
  ON workflow_executions FOR SELECT
  USING (
    triggered_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('hr', 'super_admin', 'manager')
    )
  );

DROP POLICY IF EXISTS "System can manage executions" ON workflow_executions;
CREATE POLICY "System can manage executions"
  ON workflow_executions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('hr', 'super_admin')
    )
  );

-- Workflow Logs: HR can view all logs
DROP POLICY IF EXISTS "HR can view logs" ON workflow_logs;
CREATE POLICY "HR can view logs"
  ON workflow_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('hr', 'super_admin')
    )
  );

DROP POLICY IF EXISTS "System can insert logs" ON workflow_logs;
CREATE POLICY "System can insert logs"
  ON workflow_logs FOR INSERT
  WITH CHECK (true); -- Any authenticated user can log (system operations)

-- Templates: Everyone can view, HR can manage
DROP POLICY IF EXISTS "Everyone can view templates" ON workflow_templates;
CREATE POLICY "Everyone can view templates"
  ON workflow_templates FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "HR can manage templates" ON workflow_templates;
CREATE POLICY "HR can manage templates"
  ON workflow_templates FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('hr', 'super_admin')
    )
  );

-- Schedules: HR can manage
DROP POLICY IF EXISTS "HR can manage schedules" ON workflow_schedules;
CREATE POLICY "HR can manage schedules"
  ON workflow_schedules FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('hr', 'super_admin')
    )
  );

-- Triggers
CREATE TRIGGER update_workflows_updated_at
  BEFORE UPDATE ON workflows
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_workflow_templates_updated_at
  BEFORE UPDATE ON workflow_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_workflow_schedules_updated_at
  BEFORE UPDATE ON workflow_schedules
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ==============================================================================
-- PREDEFINED WORKFLOW TEMPLATES
-- ==============================================================================

-- Template 1: Onboarding Nieuwe Medewerker
INSERT INTO workflow_templates (name, description, category, definition, icon, tags, is_system) VALUES
('Onboarding Nieuwe Medewerker', 'Automatische onboarding workflow voor nieuwe medewerkers', 'onboarding', '{
  "nodes": [
    {
      "id": "trigger-1",
      "type": "trigger",
      "position": {"x": 100, "y": 100},
      "data": {
        "label": "Nieuwe Medewerker",
        "triggerType": "event",
        "event": "employee.status_hired"
      }
    },
    {
      "id": "action-1",
      "type": "action",
      "position": {"x": 100, "y": 200},
      "data": {
        "label": "Create Account",
        "actionType": "create_user_account",
        "config": {
          "sendWelcomeEmail": true
        }
      }
    },
    {
      "id": "action-2",
      "type": "action",
      "position": {"x": 100, "y": 300},
      "data": {
        "label": "Send Welcome Email",
        "actionType": "send_email",
        "config": {
          "template": "welcome_employee",
          "to": "{{employee.email}}"
        }
      }
    },
    {
      "id": "action-3",
      "type": "action",
      "position": {"x": 100, "y": 400},
      "data": {
        "label": "Create Onboarding Tasks",
        "actionType": "create_tasks",
        "config": {
          "tasks": [
            "Complete persoonlijke informatie",
            "Upload legitimatiebewijs",
            "Onderteken arbeidscontract"
          ]
        }
      }
    },
    {
      "id": "action-4",
      "type": "action",
      "position": {"x": 100, "y": 500},
      "data": {
        "label": "Notify Manager",
        "actionType": "send_notification",
        "config": {
          "to": "{{employee.manager_id}}",
          "message": "Nieuwe medewerker {{employee.name}} start op {{employee.start_date}}"
        }
      }
    }
  ],
  "edges": [
    {"id": "e1", "source": "trigger-1", "target": "action-1"},
    {"id": "e2", "source": "action-1", "target": "action-2"},
    {"id": "e3", "source": "action-2", "target": "action-3"},
    {"id": "e4", "source": "action-3", "target": "action-4"}
  ]
}', '👋', ARRAY['onboarding', 'automation'], true);

-- Template 2: Contract Verlenging
INSERT INTO workflow_templates (name, description, category, definition, icon, tags, is_system) VALUES
('Contract Verlenging', 'Workflow voor tijdige contract verlengings-acties', 'contract', '{
  "nodes": [
    {
      "id": "trigger-1",
      "type": "trigger",
      "position": {"x": 100, "y": 100},
      "data": {
        "label": "60 dagen voor einddatum",
        "triggerType": "schedule",
        "schedule": "contract_expiry_check"
      }
    },
    {
      "id": "action-1",
      "type": "action",
      "position": {"x": 100, "y": 200},
      "data": {
        "label": "Notify HR",
        "actionType": "send_notification",
        "config": {
          "to": "role:hr",
          "message": "Contract van {{employee.name}} verloopt op {{contract.end_date}}"
        }
      }
    },
    {
      "id": "action-2",
      "type": "action",
      "position": {"x": 100, "y": 300},
      "data": {
        "label": "Create Task",
        "actionType": "create_task",
        "config": {
          "title": "Bespreek contract verlenging",
          "assignTo": "role:hr",
          "dueDate": "{{contract.end_date - 45 days}}"
        }
      }
    },
    {
      "id": "wait-1",
      "type": "wait",
      "position": {"x": 100, "y": 400},
      "data": {
        "label": "Wait for Decision",
        "waitType": "approval",
        "config": {
          "approver": "role:hr",
          "timeout": 30
        }
      }
    },
    {
      "id": "condition-1",
      "type": "condition",
      "position": {"x": 100, "y": 500},
      "data": {
        "label": "Verlengd?",
        "condition": "{{decision}} === ''extend''"
      }
    },
    {
      "id": "action-3",
      "type": "action",
      "position": {"x": 50, "y": 600},
      "data": {
        "label": "Generate Nieuw Contract",
        "actionType": "generate_document",
        "config": {
          "template": "employment_contract"
        }
      }
    },
    {
      "id": "action-4",
      "type": "action",
      "position": {"x": 250, "y": 600},
      "data": {
        "label": "Start Offboarding",
        "actionType": "trigger_workflow",
        "config": {
          "workflowName": "offboarding"
        }
      }
    }
  ],
  "edges": [
    {"id": "e1", "source": "trigger-1", "target": "action-1"},
    {"id": "e2", "source": "action-1", "target": "action-2"},
    {"id": "e3", "source": "action-2", "target": "wait-1"},
    {"id": "e4", "source": "wait-1", "target": "condition-1"},
    {"id": "e5", "source": "condition-1", "target": "action-3", "label": "Ja"},
    {"id": "e6", "source": "condition-1", "target": "action-4", "label": "Nee"}
  ]
}', '📄', ARRAY['contract', 'automation'], true);

-- Template 3: Verzuim Week 6 Probleemanalyse
INSERT INTO workflow_templates (name, description, category, definition, icon, tags, is_system) VALUES
('Verzuim Week 6 Probleemanalyse', 'Automatische probleemanalyse bij 42 dagen verzuim (Wet Poortwachter)', 'verzuim', '{
  "nodes": [
    {
      "id": "trigger-1",
      "type": "trigger",
      "position": {"x": 100, "y": 100},
      "data": {
        "label": "Verzuim >= 42 dagen",
        "triggerType": "event",
        "event": "sick_leave.day_42_reached"
      }
    },
    {
      "id": "action-1",
      "type": "action",
      "position": {"x": 100, "y": 200},
      "data": {
        "label": "Create Probleemanalyse Task",
        "actionType": "create_task",
        "config": {
          "title": "Probleemanalyse uitvoeren (Week 6)",
          "assignTo": "{{case.case_manager_id}}",
          "priority": "high",
          "dueDate": "{{sick_leave.start_date + 42 days}}"
        }
      }
    },
    {
      "id": "action-2",
      "type": "action",
      "position": {"x": 100, "y": 300},
      "data": {
        "label": "Notify Manager & Employee",
        "actionType": "send_notification",
        "config": {
          "to": ["{{employee.manager_id}}", "{{employee.id}}"],
          "template": "week_6_reminder"
        }
      }
    },
    {
      "id": "action-3",
      "type": "action",
      "position": {"x": 100, "y": 400},
      "data": {
        "label": "Generate Document Template",
        "actionType": "generate_document",
        "config": {
          "template": "probleemanalyse_week_6"
        }
      }
    },
    {
      "id": "action-4",
      "type": "action",
      "position": {"x": 100, "y": 500},
      "data": {
        "label": "Update Case Status",
        "actionType": "update_database",
        "config": {
          "table": "sick_leave_cases",
          "field": "poortwachter_status",
          "value": "week_6_pending"
        }
      }
    }
  ],
  "edges": [
    {"id": "e1", "source": "trigger-1", "target": "action-1"},
    {"id": "e2", "source": "action-1", "target": "action-2"},
    {"id": "e3", "source": "action-2", "target": "action-3"},
    {"id": "e4", "source": "action-3", "target": "action-4"}
  ]
}', '⚕️', ARRAY['verzuim', 'poortwachter', 'compliance'], true);

-- Template 4: Jaarlijkse Performance Review
INSERT INTO workflow_templates (name, description, category, definition, icon, tags, is_system) VALUES
('Jaarlijkse Performance Review', 'Automatisch performance review proces voor alle medewerkers', 'performance', '{
  "nodes": [
    {
      "id": "trigger-1",
      "type": "trigger",
      "position": {"x": 100, "y": 100},
      "data": {
        "label": "1 Januari & 1 Juli",
        "triggerType": "schedule",
        "cron": "0 9 1 1,7 *"
      }
    },
    {
      "id": "action-1",
      "type": "action",
      "position": {"x": 100, "y": 200},
      "data": {
        "label": "Voor Elke Medewerker",
        "actionType": "iterate",
        "config": {
          "collection": "active_employees"
        }
      }
    },
    {
      "id": "action-2",
      "type": "action",
      "position": {"x": 100, "y": 300},
      "data": {
        "label": "Create Performance Review",
        "actionType": "create_review",
        "config": {
          "type": "annual_review",
          "employee": "{{employee.id}}"
        }
      }
    },
    {
      "id": "action-3",
      "type": "action",
      "position": {"x": 100, "y": 400},
      "data": {
        "label": "Notify Manager",
        "actionType": "send_email",
        "config": {
          "to": "{{employee.manager_id}}",
          "template": "review_reminder"
        }
      }
    },
    {
      "id": "wait-1",
      "type": "wait",
      "position": {"x": 100, "y": 500},
      "data": {
        "label": "Wait 30 Days",
        "waitType": "duration",
        "config": {
          "duration": 30,
          "unit": "days"
        }
      }
    },
    {
      "id": "condition-1",
      "type": "condition",
      "position": {"x": 100, "y": 600},
      "data": {
        "label": "Review Completed?",
        "condition": "{{review.status}} === ''completed''"
      }
    },
    {
      "id": "action-4",
      "type": "action",
      "position": {"x": 50, "y": 700},
      "data": {
        "label": "Send Reminder",
        "actionType": "send_notification",
        "config": {
          "to": "{{employee.manager_id}}",
          "message": "Review voor {{employee.name}} is nog niet voltooid"
        }
      }
    }
  ],
  "edges": [
    {"id": "e1", "source": "trigger-1", "target": "action-1"},
    {"id": "e2", "source": "action-1", "target": "action-2"},
    {"id": "e3", "source": "action-2", "target": "action-3"},
    {"id": "e4", "source": "action-3", "target": "wait-1"},
    {"id": "e5", "source": "wait-1", "target": "condition-1"},
    {"id": "e6", "source": "condition-1", "target": "action-4", "label": "Nee"}
  ]
}', '🎯', ARRAY['performance', 'review', 'automation'], true);

-- ==============================================================================
-- DEPLOYMENT COMPLETE
-- ==============================================================================
