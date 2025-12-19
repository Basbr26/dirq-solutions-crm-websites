-- ============================================================
-- FIX FUNCTION SEARCH PATH SECURITY
-- ============================================================
-- Add explicit search_path to all functions to prevent injection attacks
-- 
-- Security Issue: Functions without explicit search_path can be exploited
-- by manipulating the search_path to inject malicious code.
-- 
-- Solution: Set search_path = '' or search_path = 'public, pg_temp' 
-- for all SECURITY DEFINER functions.
-- ============================================================

-- ============================================================
-- DROP EXISTING FUNCTIONS FIRST
-- ============================================================
-- Some functions need to be dropped before recreating with new signatures

DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
DROP FUNCTION IF EXISTS handle_updated_at() CASCADE;
DROP FUNCTION IF EXISTS update_hr_notes_updated_at() CASCADE;
DROP FUNCTION IF EXISTS log_schedule_change() CASCADE;
DROP FUNCTION IF EXISTS handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS get_user_role(uuid) CASCADE;
DROP FUNCTION IF EXISTS get_user_role() CASCADE;
DROP FUNCTION IF EXISTS create_employee_with_account(text, text, text, text) CASCADE;
DROP FUNCTION IF EXISTS sync_leave_to_calendar() CASCADE;
DROP FUNCTION IF EXISTS sync_leave_to_timeoff() CASCADE;
DROP FUNCTION IF EXISTS sync_birthdays_to_calendar() CASCADE;
DROP FUNCTION IF EXISTS sync_task_to_calendar() CASCADE;
DROP FUNCTION IF EXISTS trigger_workflow_on_sick_leave_created() CASCADE;
DROP FUNCTION IF EXISTS trigger_workflow_on_employee_created() CASCADE;
DROP FUNCTION IF EXISTS trigger_workflow_on_contract_expiring() CASCADE;
DROP FUNCTION IF EXISTS process_pending_workflows() CASCADE;
DROP FUNCTION IF EXISTS is_employee_available(uuid, timestamp with time zone, timestamp with time zone) CASCADE;
DROP FUNCTION IF EXISTS check_schedule_conflicts(uuid, uuid, timestamp with time zone, timestamp with time zone) CASCADE;
DROP FUNCTION IF EXISTS calculate_shift_cost(uuid) CASCADE;
DROP FUNCTION IF EXISTS auto_schedule_shift(uuid, date, integer) CASCADE;
DROP FUNCTION IF EXISTS get_schedule_stats(date, date) CASCADE;
DROP FUNCTION IF EXISTS get_employee_schedule_summary(uuid, integer, integer) CASCADE;
DROP FUNCTION IF EXISTS calculate_employee_monthly_cost(uuid, integer, integer) CASCADE;
DROP FUNCTION IF EXISTS generate_offer_letter(uuid, uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS search_documents_fulltext(text) CASCADE;
DROP FUNCTION IF EXISTS search_documents_semantic(vector, integer) CASCADE;
DROP FUNCTION IF EXISTS get_employee_note_stats(uuid) CASCADE;
DROP FUNCTION IF EXISTS update_session_last_message() CASCADE;

-- ============================================================
-- TRIGGER FUNCTIONS (minimal dependencies)
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION update_hr_notes_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION log_schedule_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public, pg_temp'
AS $$
BEGIN
  INSERT INTO schedule_change_log (
    schedule_id,
    employee_id,
    changed_by,
    change_type,
    old_values,
    new_values
  ) VALUES (
    COALESCE(NEW.id, OLD.id),
    COALESCE(NEW.employee_id, OLD.employee_id),
    auth.uid(),
    CASE
      WHEN TG_OP = 'INSERT' THEN 'created'
      WHEN TG_OP = 'UPDATE' THEN 'updated'
      WHEN TG_OP = 'DELETE' THEN 'deleted'
    END,
    CASE WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP != 'DELETE' THEN to_jsonb(NEW) ELSE NULL END
  );
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- ============================================================
-- USER & AUTHENTICATION FUNCTIONS
-- ============================================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public, pg_temp'
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'role', 'employee')
  );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION get_user_role(user_id UUID DEFAULT NULL)
RETURNS TEXT
LANGUAGE SQL
SECURITY DEFINER
STABLE
SET search_path = 'public, pg_temp'
AS $$
  SELECT COALESCE(
    (SELECT raw_user_meta_data->>'role' 
     FROM auth.users 
     WHERE id = COALESCE(user_id, auth.uid())),
    'employee'
  );
$$;

CREATE OR REPLACE FUNCTION create_employee_with_account(
  p_email TEXT,
  p_password TEXT,
  p_full_name TEXT,
  p_role TEXT DEFAULT 'employee'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public, pg_temp'
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Create auth user
  INSERT INTO auth.users (
    email,
    encrypted_password,
    email_confirmed_at,
    raw_user_meta_data
  ) VALUES (
    p_email,
    crypt(p_password, gen_salt('bf')),
    NOW(),
    jsonb_build_object('full_name', p_full_name, 'role', p_role)
  ) RETURNING id INTO v_user_id;
  
  -- Profile is auto-created by trigger
  RETURN v_user_id;
END;
$$;

-- ============================================================
-- CALENDAR SYNC FUNCTIONS
-- ============================================================

CREATE OR REPLACE FUNCTION sync_leave_to_calendar()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public, pg_temp'
AS $$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    INSERT INTO personal_calendar_events (
      user_id,
      title,
      description,
      event_date,
      start_time,
      end_time,
      event_type,
      is_all_day,
      source_type,
      source_id
    ) VALUES (
      NEW.employee_id,
      'Verlof',
      NEW.reason,
      NEW.start_date,
      '00:00:00',
      '23:59:59',
      'leave',
      TRUE,
      'leave_request',
      NEW.id
    )
    ON CONFLICT (user_id, source_type, source_id)
    DO UPDATE SET
      event_date = EXCLUDED.event_date,
      description = EXCLUDED.description,
      updated_at = NOW();
  ELSIF TG_OP = 'DELETE' THEN
    DELETE FROM personal_calendar_events
    WHERE source_type = 'leave_request' AND source_id = OLD.id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE OR REPLACE FUNCTION sync_leave_to_timeoff()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public, pg_temp'
AS $$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    INSERT INTO time_off_calendar (
      user_id,
      start_date,
      end_date,
      type,
      status,
      source_id
    ) VALUES (
      NEW.employee_id,
      NEW.start_date,
      NEW.end_date,
      'leave',
      NEW.status,
      NEW.id
    )
    ON CONFLICT (source_id)
    DO UPDATE SET
      start_date = EXCLUDED.start_date,
      end_date = EXCLUDED.end_date,
      status = EXCLUDED.status;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION sync_birthdays_to_calendar()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public, pg_temp'
AS $$
BEGIN
  INSERT INTO personal_calendar_events (
    user_id,
    title,
    event_date,
    event_type,
    is_all_day,
    source_type,
    source_id
  )
  SELECT
    id,
    'Verjaardag: ' || full_name,
    date_of_birth + (EXTRACT(YEAR FROM AGE(NOW(), date_of_birth)) || ' years')::INTERVAL,
    'birthday',
    TRUE,
    'profile',
    id
  FROM profiles
  WHERE date_of_birth IS NOT NULL
  ON CONFLICT (user_id, source_type, source_id)
  DO UPDATE SET
    event_date = EXCLUDED.event_date,
    title = EXCLUDED.title;
END;
$$;

CREATE OR REPLACE FUNCTION sync_task_to_calendar()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public, pg_temp'
AS $$
BEGIN
  IF NEW.due_date IS NOT NULL THEN
    INSERT INTO personal_calendar_events (
      user_id,
      title,
      description,
      event_date,
      event_type,
      source_type,
      source_id
    ) VALUES (
      NEW.assigned_to,
      'Taak: ' || NEW.title,
      NEW.description,
      NEW.due_date,
      'task',
      'workflow_task',
      NEW.id
    )
    ON CONFLICT (user_id, source_type, source_id)
    DO UPDATE SET
      title = EXCLUDED.title,
      description = EXCLUDED.description,
      event_date = EXCLUDED.event_date;
  END IF;
  RETURN NEW;
END;
$$;

-- ============================================================
-- WORKFLOW TRIGGER FUNCTIONS
-- ============================================================

CREATE OR REPLACE FUNCTION trigger_workflow_on_sick_leave_created()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public, pg_temp'
AS $$
BEGIN
  INSERT INTO workflow_executions (workflow_id, trigger_type, trigger_data, status)
  SELECT id, 'sick_leave_created', to_jsonb(NEW), 'pending'
  FROM workflows
  WHERE trigger_type = 'sick_leave_created' AND is_active = TRUE;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION trigger_workflow_on_employee_created()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public, pg_temp'
AS $$
BEGIN
  INSERT INTO workflow_executions (workflow_id, trigger_type, trigger_data, status)
  SELECT id, 'employee_created', to_jsonb(NEW), 'pending'
  FROM workflows
  WHERE trigger_type = 'employee_created' AND is_active = TRUE;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION trigger_workflow_on_contract_expiring()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public, pg_temp'
AS $$
BEGIN
  INSERT INTO workflow_executions (workflow_id, trigger_type, trigger_data, status)
  SELECT 
    w.id,
    'contract_expiring',
    jsonb_build_object('contract_id', ec.id, 'employee_id', ec.employee_id, 'end_date', ec.end_date),
    'pending'
  FROM workflows w
  CROSS JOIN employee_contracts ec
  WHERE w.trigger_type = 'contract_expiring'
    AND w.is_active = TRUE
    AND ec.end_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days';
END;
$$;

CREATE OR REPLACE FUNCTION process_pending_workflows()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public, pg_temp'
AS $$
DECLARE
  v_execution RECORD;
BEGIN
  FOR v_execution IN
    SELECT * FROM workflow_executions
    WHERE status = 'pending'
    ORDER BY created_at
    LIMIT 10
  LOOP
    UPDATE workflow_executions
    SET status = 'running', started_at = NOW()
    WHERE id = v_execution.id;
    
    -- Process steps would go here
    
    UPDATE workflow_executions
    SET status = 'completed', completed_at = NOW()
    WHERE id = v_execution.id;
  END LOOP;
END;
$$;

-- ============================================================
-- SCHEDULE FUNCTIONS
-- ============================================================

CREATE OR REPLACE FUNCTION is_employee_available(
  p_employee_id UUID,
  p_start_time TIMESTAMP WITH TIME ZONE,
  p_end_time TIMESTAMP WITH TIME ZONE
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public, pg_temp'
AS $$
DECLARE
  v_conflict_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_conflict_count
  FROM employee_schedules
  WHERE employee_id = p_employee_id
    AND status != 'cancelled'
    AND (
      (scheduled_start, scheduled_end) OVERLAPS (p_start_time, p_end_time)
    );
  
  RETURN v_conflict_count = 0;
END;
$$;

CREATE OR REPLACE FUNCTION check_schedule_conflicts(
  p_schedule_id UUID,
  p_employee_id UUID,
  p_start_time TIMESTAMP WITH TIME ZONE,
  p_end_time TIMESTAMP WITH TIME ZONE
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public, pg_temp'
AS $$
DECLARE
  v_conflicts UUID[];
BEGIN
  SELECT ARRAY_AGG(id) INTO v_conflicts
  FROM employee_schedules
  WHERE employee_id = p_employee_id
    AND id != p_schedule_id
    AND status != 'cancelled'
    AND (scheduled_start, scheduled_end) OVERLAPS (p_start_time, p_end_time);
    
  IF array_length(v_conflicts, 1) > 0 THEN
    INSERT INTO schedule_conflicts (
      schedule_id,
      conflict_type,
      severity,
      affected_employees,
      resolution_status
    ) VALUES (
      p_schedule_id,
      'overlap',
      'high',
      ARRAY[p_employee_id],
      'open'
    );
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION calculate_shift_cost(p_schedule_id UUID)
RETURNS DECIMAL(10,2)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public, pg_temp'
AS $$
DECLARE
  v_cost DECIMAL(10,2) := 0;
  v_schedule RECORD;
BEGIN
  SELECT * INTO v_schedule FROM employee_schedules WHERE id = p_schedule_id;
  
  -- Simplified cost calculation
  v_cost := EXTRACT(EPOCH FROM (v_schedule.scheduled_end - v_schedule.scheduled_start)) / 3600 * 25;
  
  INSERT INTO shift_costs (schedule_id, base_cost, total_cost)
  VALUES (p_schedule_id, v_cost, v_cost)
  ON CONFLICT (schedule_id) DO UPDATE SET total_cost = v_cost;
  
  RETURN v_cost;
END;
$$;

CREATE OR REPLACE FUNCTION auto_schedule_shift(
  p_shift_id UUID,
  p_date DATE,
  p_required_count INTEGER
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public, pg_temp'
AS $$
DECLARE
  v_scheduled INTEGER := 0;
  v_employee RECORD;
BEGIN
  FOR v_employee IN
    SELECT * FROM profiles
    WHERE role = 'employee'
    ORDER BY RANDOM()
    LIMIT p_required_count
  LOOP
    INSERT INTO employee_schedules (employee_id, shift_id, date, status)
    VALUES (v_employee.id, p_shift_id, p_date, 'draft');
    v_scheduled := v_scheduled + 1;
  END LOOP;
  
  RETURN v_scheduled;
END;
$$;

CREATE OR REPLACE FUNCTION get_schedule_stats(p_start_date DATE, p_end_date DATE)
RETURNS TABLE (
  total_shifts BIGINT,
  confirmed_shifts BIGINT,
  pending_shifts BIGINT,
  total_hours NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public, pg_temp'
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT,
    COUNT(*) FILTER (WHERE status = 'confirmed')::BIGINT,
    COUNT(*) FILTER (WHERE status = 'pending')::BIGINT,
    SUM(EXTRACT(EPOCH FROM (scheduled_end - scheduled_start)) / 3600)
  FROM employee_schedules
  WHERE date BETWEEN p_start_date AND p_end_date;
END;
$$;

CREATE OR REPLACE FUNCTION get_employee_schedule_summary(p_employee_id UUID, p_month INTEGER, p_year INTEGER)
RETURNS TABLE (
  total_hours NUMERIC,
  scheduled_shifts BIGINT,
  confirmed_shifts BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public, pg_temp'
AS $$
BEGIN
  RETURN QUERY
  SELECT
    SUM(EXTRACT(EPOCH FROM (scheduled_end - scheduled_start)) / 3600),
    COUNT(*)::BIGINT,
    COUNT(*) FILTER (WHERE status = 'confirmed')::BIGINT
  FROM employee_schedules
  WHERE employee_id = p_employee_id
    AND EXTRACT(MONTH FROM date) = p_month
    AND EXTRACT(YEAR FROM date) = p_year;
END;
$$;

-- ============================================================
-- COST MANAGEMENT FUNCTIONS
-- ============================================================

CREATE OR REPLACE FUNCTION calculate_employee_monthly_cost(
  p_employee_id UUID,
  p_year INTEGER,
  p_month INTEGER
)
RETURNS DECIMAL(12,2)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public, pg_temp'
AS $$
DECLARE
  v_contract RECORD;
  v_company RECORD;
  v_base_salary DECIMAL(12,2);
  v_allowances DECIMAL(12,2) := 0;
  v_benefits DECIMAL(12,2) := 0;
  v_social_charges DECIMAL(12,2);
  v_pension DECIMAL(12,2);
  v_total DECIMAL(12,2);
BEGIN
  SELECT * INTO v_contract
  FROM employee_contracts
  WHERE employee_id = p_employee_id
    AND status = 'active'
    AND start_date <= make_date(p_year, p_month, 1)
    AND (end_date IS NULL OR end_date >= make_date(p_year, p_month, 1))
  LIMIT 1;
  
  IF v_contract IS NULL THEN
    RETURN 0;
  END IF;
  
  SELECT * INTO v_company FROM company_settings LIMIT 1;
  
  v_base_salary := COALESCE(v_contract.base_salary_monthly, 0);
  
  SELECT COALESCE(SUM(
    CASE 
      WHEN at.calculation_type = 'percentage' THEN v_base_salary * (at.percentage_value / 100)
      WHEN at.calculation_type = 'fixed_amount' THEN at.fixed_amount
      ELSE 0
    END
  ), 0) INTO v_allowances
  FROM employee_contract_allowances eca
  JOIN allowance_types at ON at.id = eca.allowance_type_id
  WHERE eca.contract_id = v_contract.id
    AND eca.is_active = TRUE
    AND at.payment_frequency = 'monthly';
  
  SELECT COALESCE(SUM(COALESCE(custom_employer_cost_monthly, b.employer_cost_monthly)), 0) INTO v_benefits
  FROM employee_benefits eb
  JOIN benefits b ON b.id = eb.benefit_id
  WHERE eb.employee_id = p_employee_id
    AND eb.status = 'active'
    AND eb.start_date <= make_date(p_year, p_month, 1)
    AND (eb.end_date IS NULL OR eb.end_date >= make_date(p_year, p_month, 1));
  
  v_social_charges := (v_base_salary + v_allowances) * (COALESCE(v_company.employer_social_charges_pct, 20) / 100);
  v_pension := (v_base_salary + v_allowances) * (COALESCE(v_company.pension_employer_contribution_pct, 5) / 100);
  
  v_total := v_base_salary + v_allowances + v_benefits + v_social_charges + v_pension;
  
  RETURN v_total;
END;
$$;

CREATE OR REPLACE FUNCTION generate_offer_letter(
  p_employee_id UUID,
  p_contract_id UUID,
  p_template_id UUID DEFAULT NULL
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public, pg_temp'
AS $$
DECLARE
  v_template RECORD;
  v_contract RECORD;
  v_employee RECORD;
  v_company RECORD;
  v_content TEXT;
BEGIN
  IF p_template_id IS NULL THEN
    SELECT * INTO v_template FROM offer_letter_templates WHERE is_default = TRUE LIMIT 1;
  ELSE
    SELECT * INTO v_template FROM offer_letter_templates WHERE id = p_template_id;
  END IF;
  
  SELECT * INTO v_contract FROM employee_contracts WHERE id = p_contract_id;
  SELECT * INTO v_employee FROM profiles WHERE id = p_employee_id;
  SELECT * INTO v_company FROM company_settings LIMIT 1;
  
  v_content := v_template.content_markdown;
  v_content := replace(v_content, '{{company_name}}', COALESCE(v_company.company_name, ''));
  v_content := replace(v_content, '{{employee_name}}', COALESCE(v_employee.full_name, ''));
  v_content := replace(v_content, '{{job_title}}', COALESCE(v_contract.job_title, ''));
  
  RETURN v_content;
END;
$$;

-- ============================================================
-- DOCUMENT SEARCH FUNCTIONS
-- ============================================================

CREATE OR REPLACE FUNCTION search_documents_fulltext(p_query TEXT)
RETURNS TABLE (
  id UUID,
  title TEXT,
  rank REAL
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public, pg_temp'
AS $$
BEGIN
  RETURN QUERY
  SELECT
    d.id,
    d.title,
    ts_rank(to_tsvector('dutch', d.title || ' ' || COALESCE(d.description, '')), plainto_tsquery('dutch', p_query)) as rank
  FROM hr_documents d
  WHERE to_tsvector('dutch', d.title || ' ' || COALESCE(d.description, '')) @@ plainto_tsquery('dutch', p_query)
  ORDER BY rank DESC
  LIMIT 20;
END;
$$;

CREATE OR REPLACE FUNCTION search_documents_semantic(p_query_embedding vector(1536), p_limit INTEGER DEFAULT 10)
RETURNS TABLE (
  id UUID,
  title TEXT,
  similarity FLOAT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public, pg_temp'
AS $$
BEGIN
  RETURN QUERY
  SELECT
    d.id,
    d.title,
    1 - (d.embedding <=> p_query_embedding) as similarity
  FROM hr_documents d
  WHERE d.embedding IS NOT NULL
  ORDER BY d.embedding <=> p_query_embedding
  LIMIT p_limit;
END;
$$;

-- ============================================================
-- HR NOTES FUNCTION
-- ============================================================

CREATE OR REPLACE FUNCTION get_employee_note_stats(p_employee_id UUID)
RETURNS TABLE (
  total_notes BIGINT,
  recent_notes BIGINT,
  last_note_date TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public, pg_temp'
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT,
    COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '30 days')::BIGINT,
    MAX(created_at)
  FROM hr_notes
  WHERE employee_id = p_employee_id;
END;
$$;

-- ============================================================
-- SESSION UPDATE FUNCTION
-- ============================================================

CREATE OR REPLACE FUNCTION update_session_last_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public, pg_temp'
AS $$
BEGIN
  UPDATE chat_sessions
  SET last_message_at = NOW()
  WHERE id = NEW.session_id;
  RETURN NEW;
END;
$$;

-- ============================================================
-- VERIFICATION
-- ============================================================

DO $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.prosecdef = true  -- SECURITY DEFINER
    AND p.proconfig IS NULL;  -- No search_path set
    
  IF v_count > 0 THEN
    RAISE WARNING '% SECURITY DEFINER functions still without search_path!', v_count;
  ELSE
    RAISE NOTICE 'All SECURITY DEFINER functions now have explicit search_path';
  END IF;
END $$;
