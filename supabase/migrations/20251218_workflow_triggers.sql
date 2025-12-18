-- =========================================================================
-- WORKFLOW AUTOMATION TRIGGERS
-- Auto-trigger workflows based on database events
-- =========================================================================

-- Function to trigger workflows on employee creation
CREATE OR REPLACE FUNCTION trigger_workflow_on_employee_created()
RETURNS TRIGGER AS $$
DECLARE
  v_workflow_id UUID;
  v_execution_id UUID;
BEGIN
  -- Find workflows that trigger on employee.created
  FOR v_workflow_id IN
    SELECT id FROM workflows
    WHERE active = TRUE
    AND nodes->>'0'->>'config'->>'event' = 'employee.created'
    OR nodes::text LIKE '%"event":"employee.created"%'
  LOOP
    -- Create workflow execution
    INSERT INTO workflow_executions (
      workflow_id,
      status,
      context,
      triggered_by
    )
    VALUES (
      v_workflow_id,
      'pending',
      jsonb_build_object(
        'workflow_id', v_workflow_id::text,
        'execution_id', gen_random_uuid()::text,
        'trigger_data', jsonb_build_object(
          'event', 'employee.created',
          'employee', row_to_json(NEW)
        ),
        'variables', '{}'::jsonb
      ),
      NULL
    )
    RETURNING id INTO v_execution_id;

    -- Log trigger
    RAISE NOTICE 'Triggered workflow % for new employee %', v_workflow_id, NEW.id;
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger on profiles table (new employee)
DROP TRIGGER IF EXISTS trigger_employee_created_workflow ON profiles;
CREATE TRIGGER trigger_employee_created_workflow
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION trigger_workflow_on_employee_created();

-- =========================================================================
-- Function to trigger workflows on contract expiring
CREATE OR REPLACE FUNCTION trigger_workflow_on_contract_expiring()
RETURNS void AS $$
DECLARE
  v_employee RECORD;
  v_workflow_id UUID;
  v_execution_id UUID;
BEGIN
  -- Find employees with contracts expiring in 30 days
  FOR v_employee IN
    SELECT * FROM profiles
    WHERE end_date IS NOT NULL
    AND end_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days'
    AND employment_status = 'actief'
  LOOP
    -- Find workflows that trigger on contract.expiring
    FOR v_workflow_id IN
      SELECT id FROM workflows
      WHERE active = TRUE
      AND nodes::text LIKE '%"event":"contract.expiring"%'
    LOOP
      -- Check if we already triggered this workflow for this employee recently
      IF NOT EXISTS (
        SELECT 1 FROM workflow_executions
        WHERE workflow_id = v_workflow_id
        AND context->>'trigger_data'->>'employee'->>'id' = v_employee.id::text
        AND created_at > CURRENT_DATE - INTERVAL '7 days'
      ) THEN
        -- Create workflow execution
        INSERT INTO workflow_executions (
          workflow_id,
          status,
          context
        )
        VALUES (
          v_workflow_id,
          'pending',
          jsonb_build_object(
            'workflow_id', v_workflow_id::text,
            'execution_id', gen_random_uuid()::text,
            'trigger_data', jsonb_build_object(
              'event', 'contract.expiring',
              'employee', row_to_json(v_employee),
              'days_until_expiry', (v_employee.end_date - CURRENT_DATE)
            ),
            'variables', '{}'::jsonb
          )
        )
        RETURNING id INTO v_execution_id;

        RAISE NOTICE 'Triggered workflow % for contract expiring: employee %', v_workflow_id, v_employee.id;
      END IF;
    END LOOP;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- =========================================================================
-- Function to trigger workflows on sick leave case created
CREATE OR REPLACE FUNCTION trigger_workflow_on_sick_leave_created()
RETURNS TRIGGER AS $$
DECLARE
  v_workflow_id UUID;
  v_execution_id UUID;
  v_employee RECORD;
BEGIN
  -- Get employee data
  SELECT * INTO v_employee
  FROM profiles
  WHERE id = NEW.employee_id;

  -- Find workflows that trigger on sick_leave.created
  FOR v_workflow_id IN
    SELECT id FROM workflows
    WHERE active = TRUE
    AND nodes::text LIKE '%"event":"sick_leave.created"%'
  LOOP
    -- Create workflow execution
    INSERT INTO workflow_executions (
      workflow_id,
      status,
      context
    )
    VALUES (
      v_workflow_id,
      'pending',
      jsonb_build_object(
        'workflow_id', v_workflow_id::text,
        'execution_id', gen_random_uuid()::text,
        'trigger_data', jsonb_build_object(
          'event', 'sick_leave.created',
          'sick_leave_case', row_to_json(NEW),
          'employee', row_to_json(v_employee)
        ),
        'variables', '{}'::jsonb
      )
    )
    RETURNING id INTO v_execution_id;

    RAISE NOTICE 'Triggered workflow % for sick leave case %', v_workflow_id, NEW.id;
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger on sick_leave_cases table
DROP TRIGGER IF EXISTS trigger_sick_leave_created_workflow ON sick_leave_cases;
CREATE TRIGGER trigger_sick_leave_created_workflow
  AFTER INSERT ON sick_leave_cases
  FOR EACH ROW
  EXECUTE FUNCTION trigger_workflow_on_sick_leave_created();

-- =========================================================================
-- Function to process pending workflow executions
-- This should be called by the edge function
CREATE OR REPLACE FUNCTION process_pending_workflows()
RETURNS TABLE (
  execution_id UUID,
  workflow_id UUID,
  status TEXT,
  message TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    id as execution_id,
    workflow_id,
    'pending'::TEXT as status,
    'Ready for execution'::TEXT as message
  FROM workflow_executions
  WHERE status = 'pending'
  ORDER BY created_at ASC
  LIMIT 10;
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION process_pending_workflows TO authenticated;
GRANT EXECUTE ON FUNCTION trigger_workflow_on_contract_expiring TO authenticated;

-- =========================================================================
-- COMMENTS
COMMENT ON FUNCTION trigger_workflow_on_employee_created IS 'Automatically trigger workflows when a new employee is created';
COMMENT ON FUNCTION trigger_workflow_on_contract_expiring IS 'Check for expiring contracts and trigger workflows (call daily)';
COMMENT ON FUNCTION trigger_workflow_on_sick_leave_created IS 'Automatically trigger workflows when a new sick leave case is created';
COMMENT ON FUNCTION process_pending_workflows IS 'Get pending workflow executions for processing by edge function';
