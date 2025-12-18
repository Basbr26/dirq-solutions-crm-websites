-- ============================================================
-- 🏢 ENTERPRISE PLANNING & SHIFT SCHEDULING SYSTEM
-- ============================================================
-- Features:
-- ✅ Skill-based scheduling with certifications
-- ✅ Advanced labor law compliance (arbeidstijdenwet)
-- ✅ Shift swap requests with approval workflow
-- ✅ Cost tracking and budget management
-- ✅ Auto-sync with leave requests
-- ✅ Real-time conflict detection
-- ✅ Full audit trail
-- ✅ Demand forecasting & optimization
-- ============================================================

-- ============================================================
-- 1. EMPLOYEE SKILLS & CERTIFICATIONS
-- ============================================================

-- Skill definitions
CREATE TABLE IF NOT EXISTS skills (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL UNIQUE,
  category VARCHAR(50) NOT NULL, -- technical, soft_skill, certification, language
  description TEXT,
  requires_certification BOOLEAN DEFAULT FALSE,
  certification_validity_months INTEGER, -- NULL = lifetime
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Employee skills
CREATE TABLE IF NOT EXISTS employee_skills (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  skill_id UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  proficiency_level VARCHAR(20) DEFAULT 'basic' CHECK (proficiency_level IN (
    'basic', 'intermediate', 'advanced', 'expert'
  )),
  certified BOOLEAN DEFAULT FALSE,
  certification_date DATE,
  certification_expiry DATE,
  certification_number VARCHAR(100),
  verified_by UUID REFERENCES profiles(id),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(employee_id, skill_id)
);

-- ============================================================
-- 2. SHIFTS & SHIFT TYPES
-- ============================================================

CREATE TABLE IF NOT EXISTS shifts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  short_code VARCHAR(10), -- 'O', 'M', 'A', 'N'
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  
  -- Break configuration
  break_minutes INTEGER DEFAULT 0,
  paid_break_minutes INTEGER DEFAULT 0,
  unpaid_break_minutes INTEGER DEFAULT 0,
  
  -- Appearance
  color VARCHAR(7) DEFAULT '#3B82F6',
  icon VARCHAR(50),
  
  -- Labor law compliance
  requires_night_permit BOOLEAN DEFAULT FALSE, -- For nachtvergunning
  min_age INTEGER DEFAULT 18,
  max_consecutive_days INTEGER DEFAULT 6, -- Arbeidstijdenwet
  
  -- Cost & capacity
  hourly_rate_multiplier DECIMAL(4,2) DEFAULT 1.00, -- 1.25 for evening, 1.50 for night
  min_employees INTEGER DEFAULT 1,
  max_employees INTEGER DEFAULT 10,
  
  -- Required skills
  required_skills UUID[], -- Array of skill IDs
  
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Standard shifts met compliance
INSERT INTO shifts (name, short_code, start_time, end_time, break_minutes, paid_break_minutes, unpaid_break_minutes, color, hourly_rate_multiplier, requires_night_permit) VALUES
('Ochtend', 'O', '08:00', '16:00', 45, 15, 30, '#10B981', 1.00, FALSE),
('Middag', 'M', '12:00', '20:00', 45, 15, 30, '#F59E0B', 1.10, FALSE),
('Avond', 'A', '16:00', '00:00', 45, 15, 30, '#6366F1', 1.25, FALSE),
('Nacht', 'N', '00:00', '08:00', 45, 15, 30, '#8B5CF6', 1.50, TRUE)
ON CONFLICT DO NOTHING;

-- ============================================================
-- 3. SCHEDULE TEMPLATES & DEMAND FORECASTING
-- ============================================================

CREATE TABLE IF NOT EXISTS schedule_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  department_id UUID REFERENCES departments(id),
  
  -- Template configuration
  template_type VARCHAR(20) DEFAULT 'weekly' CHECK (template_type IN (
    'weekly', 'biweekly', 'monthly', 'seasonal'
  )),
  valid_from DATE,
  valid_until DATE,
  
  -- Metadata
  is_default BOOLEAN DEFAULT FALSE,
  is_published BOOLEAN DEFAULT FALSE,
  published_at TIMESTAMP WITH TIME ZONE,
  
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Template shifts (which shifts on which days)
CREATE TABLE IF NOT EXISTS template_shifts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  template_id UUID NOT NULL REFERENCES schedule_templates(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0 = Sunday
  shift_id UUID REFERENCES shifts(id) ON DELETE CASCADE,
  
  -- Staffing requirements
  required_employees INTEGER DEFAULT 1,
  min_employees INTEGER DEFAULT 1,
  max_employees INTEGER DEFAULT 5,
  
  -- Skill requirements
  required_skills UUID[], -- Must have these skills
  preferred_skills UUID[], -- Nice to have
  min_skill_level VARCHAR(20) DEFAULT 'basic',
  
  -- Cost control
  budget_per_shift DECIMAL(10,2),
  
  notes TEXT,
  UNIQUE(template_id, day_of_week, shift_id)
);

-- Demand forecasting (voor automatische personeelsbehoefte)
CREATE TABLE IF NOT EXISTS demand_forecast (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  department_id UUID REFERENCES departments(id),
  date DATE NOT NULL,
  shift_id UUID REFERENCES shifts(id),
  
  -- Forecasted demand
  forecasted_workload DECIMAL(5,2), -- 0-100 scale
  forecasted_employees INTEGER,
  
  -- Actuals (filled after the fact)
  actual_workload DECIMAL(5,2),
  actual_employees INTEGER,
  
  -- Calculation method
  calculation_method VARCHAR(50) DEFAULT 'manual', -- manual, historical_avg, ml_model
  confidence_level DECIMAL(3,2), -- 0.00-1.00
  
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(department_id, date, shift_id)
);

-- ============================================================
-- 4. EMPLOYEE SCHEDULES (Core scheduling)
-- ============================================================

CREATE TABLE IF NOT EXISTS employee_schedules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  shift_id UUID REFERENCES shifts(id),
  date DATE NOT NULL,
  
  -- Time tracking
  scheduled_start TIMESTAMP WITH TIME ZONE NOT NULL,
  scheduled_end TIMESTAMP WITH TIME ZONE NOT NULL,
  actual_start TIMESTAMP WITH TIME ZONE,
  actual_end TIMESTAMP WITH TIME ZONE,
  break_minutes INTEGER,
  actual_break_minutes INTEGER,
  
  -- Status workflow
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN (
    'draft', 'scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show', 'late', 'early_leave'
  )),
  
  -- Assignment metadata
  assigned_by UUID REFERENCES profiles(id),
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  assignment_method VARCHAR(30) DEFAULT 'manual', -- manual, auto_scheduled, template_applied
  
  -- Employee confirmation
  confirmation_required BOOLEAN DEFAULT TRUE,
  confirmed_by_employee BOOLEAN DEFAULT FALSE,
  confirmed_at TIMESTAMP WITH TIME ZONE,
  
  -- Location & department
  location VARCHAR(100),
  department_id UUID REFERENCES departments(id),
  cost_center VARCHAR(50),
  
  -- Cost tracking
  base_hourly_rate DECIMAL(10,2),
  rate_multiplier DECIMAL(4,2) DEFAULT 1.00,
  calculated_cost DECIMAL(10,2),
  actual_cost DECIMAL(10,2),
  
  -- Performance tracking
  productivity_rating INTEGER CHECK (productivity_rating BETWEEN 1 AND 5),
  quality_rating INTEGER CHECK (quality_rating BETWEEN 1 AND 5),
  
  -- Flags
  is_overtime BOOLEAN DEFAULT FALSE,
  is_emergency BOOLEAN DEFAULT FALSE,
  requires_replacement BOOLEAN DEFAULT FALSE,
  
  notes TEXT,
  manager_notes TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(employee_id, date, scheduled_start)
);

-- Schedule history (audit trail)
CREATE TABLE IF NOT EXISTS schedule_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  schedule_id UUID NOT NULL REFERENCES employee_schedules(id) ON DELETE CASCADE,
  changed_by UUID REFERENCES profiles(id),
  change_type VARCHAR(30) NOT NULL, -- created, modified, cancelled, swapped, confirmed
  old_values JSONB,
  new_values JSONB,
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- 5. EMPLOYEE AVAILABILITY & PREFERENCES
-- ============================================================

CREATE TABLE IF NOT EXISTS employee_availability (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Recurring availability
  day_of_week INTEGER CHECK (day_of_week BETWEEN 0 AND 6), -- NULL = specific date
  specific_date DATE, -- For one-off availability
  
  -- Time windows
  available_from TIME,
  available_until TIME,
  
  -- Availability type
  availability_type VARCHAR(30) DEFAULT 'available' CHECK (availability_type IN (
    'available', 'preferred', 'unavailable', 'conditional'
  )),
  
  -- Conditional availability
  condition_notes TEXT, -- "Only if X is also working", "No more than 2 evenings per week"
  
  -- Recurrence period
  effective_from DATE,
  effective_until DATE,
  
  -- Capacity
  max_hours_per_week DECIMAL(5,2),
  max_shifts_per_week INTEGER,
  max_consecutive_days INTEGER,
  
  -- Preferences
  preferred_shift_types UUID[], -- Array of shift IDs
  blackout_shift_types UUID[], -- Never schedule these
  
  notes TEXT,
  approved_by UUID REFERENCES profiles(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT check_date_or_dow CHECK (
    (day_of_week IS NOT NULL AND specific_date IS NULL) OR
    (day_of_week IS NULL AND specific_date IS NOT NULL)
  )
);

-- Time-off requests (integrates with leave_requests)
CREATE TABLE IF NOT EXISTS time_off_blocks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  
  -- Type
  block_type VARCHAR(30) DEFAULT 'leave' CHECK (block_type IN (
    'leave', 'sick', 'training', 'meeting', 'personal', 'other'
  )),
  
  -- Integration
  leave_request_id UUID REFERENCES leave_requests(id),
  
  -- Status
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN (
    'pending', 'approved', 'denied', 'cancelled'
  )),
  
  approved_by UUID REFERENCES profiles(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  
  reason TEXT,
  notes TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- 6. SHIFT SWAP REQUESTS
-- ============================================================

CREATE TABLE IF NOT EXISTS shift_swap_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Original shift
  original_schedule_id UUID NOT NULL REFERENCES employee_schedules(id),
  requesting_employee_id UUID NOT NULL REFERENCES profiles(id),
  
  -- Target employee (optional - can be open swap)
  target_employee_id UUID REFERENCES profiles(id),
  offered_schedule_id UUID REFERENCES employee_schedules(id), -- What they offer in return
  
  -- Swap details
  swap_type VARCHAR(20) DEFAULT 'trade' CHECK (swap_type IN (
    'trade', 'give_away', 'coverage'
  )),
  
  -- Status workflow
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN (
    'pending', 'accepted', 'declined', 'approved', 'rejected', 'cancelled', 'completed'
  )),
  
  -- Approvals
  target_accepted_at TIMESTAMP WITH TIME ZONE,
  manager_approved_by UUID REFERENCES profiles(id),
  manager_approved_at TIMESTAMP WITH TIME ZONE,
  
  -- Reason & notes
  reason TEXT NOT NULL,
  manager_notes TEXT,
  
  -- Expiry
  expires_at TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- 7. SCHEDULE CONFLICTS & VIOLATIONS
-- ============================================================

CREATE TABLE IF NOT EXISTS schedule_conflicts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  date DATE NOT NULL,
  shift_id UUID REFERENCES shifts(id),
  
  -- Conflict classification
  conflict_type VARCHAR(50) NOT NULL CHECK (conflict_type IN (
    'understaffed', 'overstaffed', 'unavailable', 'overlapping', 
    'on_leave', 'double_booked', 'skill_mismatch', 'overtime_exceeded',
    'rest_period_violation', 'max_hours_exceeded', 'certification_expired',
    'underage_night_shift', 'consecutive_days_exceeded'
  )),
  
  severity VARCHAR(20) DEFAULT 'warning' CHECK (severity IN (
    'info', 'warning', 'error', 'critical'
  )),
  
  -- Details
  description TEXT,
  affected_employees UUID[],
  affected_schedules UUID[],
  
  -- Violation details
  violation_rule VARCHAR(100), -- "Arbeidstijdenwet Article 5:4"
  violation_value DECIMAL(10,2), -- Actual value that violates
  allowed_value DECIMAL(10,2), -- Maximum allowed value
  
  -- Resolution
  resolution_status VARCHAR(30) DEFAULT 'open' CHECK (resolution_status IN (
    'open', 'acknowledged', 'in_progress', 'resolved', 'ignored', 'waived'
  )),
  resolution_notes TEXT,
  resolved_by UUID REFERENCES profiles(id),
  resolved_at TIMESTAMP WITH TIME ZONE,
  
  -- Auto-detection
  detected_by VARCHAR(30) DEFAULT 'system', -- system, manual, import
  detection_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- 8. LABOR COMPLIANCE & CONSTRAINTS
-- ============================================================

CREATE TABLE IF NOT EXISTS labor_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  rule_code VARCHAR(50) NOT NULL UNIQUE,
  rule_name VARCHAR(200) NOT NULL,
  category VARCHAR(50) NOT NULL, -- arbeidsuren, rusttijd, night_work, young_workers
  
  -- Rule parameters
  max_value DECIMAL(10,2),
  min_value DECIMAL(10,2),
  time_period VARCHAR(30), -- day, week, month, year
  
  -- Applicability
  applies_to_roles VARCHAR(50)[], -- NULL = everyone
  min_age INTEGER,
  max_age INTEGER,
  
  -- Rule details
  description TEXT,
  legal_reference VARCHAR(200), -- "Arbeidstijdenwet Artikel 5:7"
  violation_penalty VARCHAR(100),
  
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert standard Dutch labor law rules
INSERT INTO labor_rules (rule_code, rule_name, category, max_value, time_period, description, legal_reference) VALUES
('ATW_5_7', 'Maximum werkuren per dag', 'arbeidsuren', 12, 'day', 'Maximaal 12 uur per dienst', 'Arbeidstijdenwet Artikel 5:7'),
('ATW_5_8', 'Maximum werkuren per week', 'arbeidsuren', 60, 'week', 'Maximaal 60 uur per week gemiddeld over 4 weken', 'Arbeidstijdenwet Artikel 5:8'),
('ATW_5_4', 'Minimum rusttijd per dag', 'rusttijd', 11, 'day', 'Minimaal 11 uur rust tussen diensten', 'Arbeidstijdenwet Artikel 5:4'),
('ATW_5_2', 'Minimum rusttijd per week', 'rusttijd', 36, 'week', 'Minimaal 36 uur aaneengesloten rust per week', 'Arbeidstijdenwet Artikel 5:2'),
('ATW_5_6_1', 'Maximum opeenvolgende werkdagen', 'arbeidsuren', 12, 'period', 'Maximaal 12 opeenvolgende werkdagen', 'Arbeidstijdenwet Artikel 5:6 lid 1'),
('ATW_4_2', 'Nachtdienst vergunning vereist', 'night_work', NULL, NULL, 'Nachtwerk (00:00-06:00) vereist vergunning', 'Arbeidstijdenwet Artikel 4:2'),
('ATW_2_5', 'Jongeren max werkuren per dag', 'arbeidsuren', 8, 'day', 'Jongeren (16-17 jaar) maximaal 8 uur per dag', 'Arbeidstijdenwet Artikel 2:5')
ON CONFLICT (rule_code) DO NOTHING;

-- ============================================================
-- 9. COST & BUDGET TRACKING
-- ============================================================

CREATE TABLE IF NOT EXISTS shift_costs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  schedule_id UUID NOT NULL REFERENCES employee_schedules(id) ON DELETE CASCADE,
  
  -- Cost breakdown
  base_hours DECIMAL(5,2),
  overtime_hours DECIMAL(5,2) DEFAULT 0,
  base_rate DECIMAL(10,2),
  overtime_multiplier DECIMAL(4,2) DEFAULT 1.5,
  shift_multiplier DECIMAL(4,2) DEFAULT 1.0,
  
  -- Calculated costs
  base_cost DECIMAL(10,2),
  overtime_cost DECIMAL(10,2),
  total_labor_cost DECIMAL(10,2),
  
  -- Additional costs
  meal_allowance DECIMAL(10,2) DEFAULT 0,
  travel_allowance DECIMAL(10,2) DEFAULT 0,
  other_allowances DECIMAL(10,2) DEFAULT 0,
  
  total_cost DECIMAL(10,2),
  
  -- Budget tracking
  budget_code VARCHAR(50),
  cost_center VARCHAR(50),
  
  calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS department_budgets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  department_id UUID NOT NULL REFERENCES departments(id),
  
  -- Period
  year INTEGER NOT NULL,
  month INTEGER CHECK (month BETWEEN 1 AND 12),
  week INTEGER CHECK (week BETWEEN 1 AND 53),
  
  -- Budget
  allocated_budget DECIMAL(12,2) NOT NULL,
  spent_budget DECIMAL(12,2) DEFAULT 0,
  forecasted_spend DECIMAL(12,2),
  
  -- Alerts
  alert_threshold_pct DECIMAL(5,2) DEFAULT 80.00, -- Alert at 80%
  critical_threshold_pct DECIMAL(5,2) DEFAULT 95.00,
  
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(department_id, year, month, week)
);

-- ============================================================
-- 10. PERFORMANCE INDEXES
-- ============================================================

-- Skills
CREATE INDEX idx_employee_skills_employee ON employee_skills(employee_id);
CREATE INDEX idx_employee_skills_skill ON employee_skills(skill_id);
CREATE INDEX idx_employee_skills_certified ON employee_skills(certified);
CREATE INDEX idx_employee_skills_expiry ON employee_skills(certification_expiry);

-- Shifts
CREATE INDEX idx_shifts_active ON shifts(is_active);
CREATE INDEX idx_shifts_time ON shifts(start_time, end_time);

-- Employee schedules
CREATE INDEX idx_employee_schedules_date ON employee_schedules(date);
CREATE INDEX idx_employee_schedules_employee ON employee_schedules(employee_id);
CREATE INDEX idx_employee_schedules_shift ON employee_schedules(shift_id);
CREATE INDEX idx_employee_schedules_status ON employee_schedules(status);
CREATE INDEX idx_employee_schedules_department ON employee_schedules(department_id);
CREATE INDEX idx_employee_schedules_date_range ON employee_schedules(date, scheduled_start, scheduled_end);
CREATE INDEX idx_employee_schedules_confirmation ON employee_schedules(confirmed_by_employee) WHERE confirmation_required = TRUE;

-- Schedule history
CREATE INDEX idx_schedule_history_schedule ON schedule_history(schedule_id);
CREATE INDEX idx_schedule_history_user ON schedule_history(changed_by);
CREATE INDEX idx_schedule_history_date ON schedule_history(created_at);

-- Availability
CREATE INDEX idx_employee_availability_employee ON employee_availability(employee_id);
CREATE INDEX idx_employee_availability_day ON employee_availability(day_of_week);
CREATE INDEX idx_employee_availability_date ON employee_availability(specific_date);
CREATE INDEX idx_employee_availability_effective ON employee_availability(effective_from, effective_until);

-- Time off
CREATE INDEX idx_time_off_blocks_employee ON time_off_blocks(employee_id);
CREATE INDEX idx_time_off_blocks_dates ON time_off_blocks(start_date, end_date);
CREATE INDEX idx_time_off_blocks_status ON time_off_blocks(status);
CREATE INDEX idx_time_off_blocks_leave_request ON time_off_blocks(leave_request_id);

-- Shift swaps
CREATE INDEX idx_shift_swaps_requesting ON shift_swap_requests(requesting_employee_id);
CREATE INDEX idx_shift_swaps_target ON shift_swap_requests(target_employee_id);
CREATE INDEX idx_shift_swaps_status ON shift_swap_requests(status);
CREATE INDEX idx_shift_swaps_expiry ON shift_swap_requests(expires_at) WHERE status = 'pending';

-- Conflicts
CREATE INDEX idx_schedule_conflicts_date ON schedule_conflicts(date);
CREATE INDEX idx_schedule_conflicts_type ON schedule_conflicts(conflict_type);
CREATE INDEX idx_schedule_conflicts_severity ON schedule_conflicts(severity);
CREATE INDEX idx_schedule_conflicts_resolution ON schedule_conflicts(resolution_status);
CREATE INDEX idx_schedule_conflicts_affected ON schedule_conflicts USING GIN (affected_employees);

-- Demand forecast
CREATE INDEX idx_demand_forecast_date ON demand_forecast(date);
CREATE INDEX idx_demand_forecast_department ON demand_forecast(department_id);

-- Templates
CREATE INDEX idx_template_shifts_template ON template_shifts(template_id);
CREATE INDEX idx_schedule_templates_department ON schedule_templates(department_id);
CREATE INDEX idx_schedule_templates_published ON schedule_templates(is_published);

-- Costs
CREATE INDEX idx_shift_costs_schedule ON shift_costs(schedule_id);
CREATE INDEX idx_shift_costs_budget_code ON shift_costs(budget_code);
CREATE INDEX idx_department_budgets_department ON department_budgets(department_id);
CREATE INDEX idx_department_budgets_period ON department_budgets(year, month);

-- ============================================================
-- 11. ROW LEVEL SECURITY POLICIES
-- ============================================================

-- Skills
ALTER TABLE skills ENABLE ROW LEVEL SECURITY;
CREATE POLICY "All view skills" ON skills FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "HR manages skills" ON skills FOR ALL USING (
  auth.uid() IN (SELECT id FROM profiles WHERE role IN ('hr', 'super_admin'))
);

-- Employee skills
ALTER TABLE employee_skills ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Employees view own skills" ON employee_skills FOR SELECT USING (
  employee_id = auth.uid() OR
  auth.uid() IN (SELECT id FROM profiles WHERE role IN ('hr', 'manager', 'super_admin'))
);
CREATE POLICY "HR manages employee skills" ON employee_skills FOR ALL USING (
  auth.uid() IN (SELECT id FROM profiles WHERE role IN ('hr', 'super_admin'))
);

-- Shifts
ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "All users view shifts" ON shifts FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "HR manages shifts" ON shifts FOR ALL USING (
  auth.uid() IN (SELECT id FROM profiles WHERE role IN ('hr', 'super_admin'))
);

-- Schedule templates
ALTER TABLE schedule_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "All view templates" ON schedule_templates FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "HR manages templates" ON schedule_templates FOR ALL USING (
  auth.uid() IN (SELECT id FROM profiles WHERE role IN ('hr', 'manager', 'super_admin'))
);

-- Template shifts
ALTER TABLE template_shifts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "All view template shifts" ON template_shifts FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "HR manages template shifts" ON template_shifts FOR ALL USING (
  auth.uid() IN (SELECT id FROM profiles WHERE role IN ('hr', 'manager', 'super_admin'))
);

-- Demand forecast
ALTER TABLE demand_forecast ENABLE ROW LEVEL SECURITY;
CREATE POLICY "All view demand forecast" ON demand_forecast FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "HR manages demand forecast" ON demand_forecast FOR ALL USING (
  auth.uid() IN (SELECT id FROM profiles WHERE role IN ('hr', 'super_admin'))
);

-- Employee schedules
ALTER TABLE employee_schedules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Employees view own schedule" ON employee_schedules FOR SELECT USING (
  employee_id = auth.uid() OR
  auth.uid() IN (SELECT id FROM profiles WHERE role IN ('hr', 'manager', 'super_admin')) OR
  auth.uid() IN (SELECT manager_id FROM profiles WHERE id = employee_schedules.employee_id)
);
CREATE POLICY "Managers manage team schedules" ON employee_schedules FOR ALL USING (
  auth.uid() IN (SELECT id FROM profiles WHERE role IN ('hr', 'super_admin')) OR
  auth.uid() IN (SELECT manager_id FROM profiles WHERE id = employee_schedules.employee_id)
);

-- Schedule history
ALTER TABLE schedule_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Employees view own schedule history" ON schedule_history FOR SELECT USING (
  schedule_id IN (SELECT id FROM employee_schedules WHERE employee_id = auth.uid()) OR
  auth.uid() IN (SELECT id FROM profiles WHERE role IN ('hr', 'super_admin'))
);
CREATE POLICY "System creates history" ON schedule_history FOR INSERT WITH CHECK (true);

-- Availability
ALTER TABLE employee_availability ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Employees manage own availability" ON employee_availability FOR ALL USING (employee_id = auth.uid());
CREATE POLICY "Managers view team availability" ON employee_availability FOR SELECT USING (
  employee_id IN (SELECT id FROM profiles WHERE manager_id = auth.uid()) OR
  auth.uid() IN (SELECT id FROM profiles WHERE role IN ('hr', 'super_admin'))
);

-- Time-off blocks
ALTER TABLE time_off_blocks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Employees manage own time-off" ON time_off_blocks FOR ALL USING (employee_id = auth.uid());
CREATE POLICY "Managers view team time-off" ON time_off_blocks FOR SELECT USING (
  employee_id IN (SELECT id FROM profiles WHERE manager_id = auth.uid()) OR
  auth.uid() IN (SELECT id FROM profiles WHERE role IN ('hr', 'super_admin'))
);
CREATE POLICY "Managers approve time-off" ON time_off_blocks FOR UPDATE USING (
  auth.uid() IN (SELECT manager_id FROM profiles WHERE id = time_off_blocks.employee_id) OR
  auth.uid() IN (SELECT id FROM profiles WHERE role IN ('hr', 'super_admin'))
);

-- Shift swap requests
ALTER TABLE shift_swap_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Employees view own swaps" ON shift_swap_requests FOR SELECT USING (
  requesting_employee_id = auth.uid() OR target_employee_id = auth.uid() OR
  auth.uid() IN (SELECT id FROM profiles WHERE role IN ('hr', 'manager', 'super_admin'))
);
CREATE POLICY "Employees create swaps" ON shift_swap_requests FOR INSERT WITH CHECK (requesting_employee_id = auth.uid());
CREATE POLICY "Employees manage own swaps" ON shift_swap_requests FOR UPDATE USING (
  requesting_employee_id = auth.uid() OR target_employee_id = auth.uid() OR
  auth.uid() IN (SELECT id FROM profiles WHERE role IN ('hr', 'manager', 'super_admin'))
);

-- Conflicts
ALTER TABLE schedule_conflicts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "All view conflicts" ON schedule_conflicts FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "HR manages conflicts" ON schedule_conflicts FOR ALL USING (
  auth.uid() IN (SELECT id FROM profiles WHERE role IN ('hr', 'manager', 'super_admin'))
);

-- Labor rules
ALTER TABLE labor_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "All view labor rules" ON labor_rules FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "HR manages labor rules" ON labor_rules FOR ALL USING (
  auth.uid() IN (SELECT id FROM profiles WHERE role IN ('super_admin'))
);

-- Shift costs
ALTER TABLE shift_costs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "HR views costs" ON shift_costs FOR SELECT USING (
  auth.uid() IN (SELECT id FROM profiles WHERE role IN ('hr', 'super_admin'))
);
CREATE POLICY "System creates costs" ON shift_costs FOR INSERT WITH CHECK (true);

-- Department budgets
ALTER TABLE department_budgets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "HR views budgets" ON department_budgets FOR SELECT USING (
  auth.uid() IN (SELECT id FROM profiles WHERE role IN ('hr', 'super_admin'))
);
CREATE POLICY "HR manages budgets" ON department_budgets FOR ALL USING (
  auth.uid() IN (SELECT id FROM profiles WHERE role IN ('hr', 'super_admin'))
);

-- ============================================================
-- 12. TRIGGERS
-- ============================================================

-- Updated_at triggers
CREATE TRIGGER update_shifts_updated_at BEFORE UPDATE ON shifts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_employee_skills_updated_at BEFORE UPDATE ON employee_skills FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_schedule_templates_updated_at BEFORE UPDATE ON schedule_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_employee_schedules_updated_at BEFORE UPDATE ON employee_schedules FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_employee_availability_updated_at BEFORE UPDATE ON employee_availability FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_time_off_blocks_updated_at BEFORE UPDATE ON time_off_blocks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_shift_swap_requests_updated_at BEFORE UPDATE ON shift_swap_requests FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_schedule_conflicts_updated_at BEFORE UPDATE ON schedule_conflicts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_demand_forecast_updated_at BEFORE UPDATE ON demand_forecast FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_department_budgets_updated_at BEFORE UPDATE ON department_budgets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 13. BUSINESS LOGIC FUNCTIONS
-- ============================================================

-- Track schedule changes in history
CREATE OR REPLACE FUNCTION log_schedule_change()
RETURNS TRIGGER AS $$
DECLARE
  change_type VARCHAR(30);
  old_vals JSONB;
  new_vals JSONB;
BEGIN
  IF TG_OP = 'INSERT' THEN
    change_type := 'created';
    new_vals := to_jsonb(NEW);
    INSERT INTO schedule_history (schedule_id, changed_by, change_type, new_values)
    VALUES (NEW.id, NEW.assigned_by, change_type, new_vals);
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.status != NEW.status THEN
      change_type := 'status_changed';
    ELSIF OLD.scheduled_start != NEW.scheduled_start OR OLD.scheduled_end != NEW.scheduled_end THEN
      change_type := 'time_changed';
    ELSE
      change_type := 'modified';
    END IF;
    
    old_vals := to_jsonb(OLD);
    new_vals := to_jsonb(NEW);
    INSERT INTO schedule_history (schedule_id, changed_by, change_type, old_values, new_values)
    VALUES (NEW.id, auth.uid(), change_type, old_vals, new_vals);
  ELSIF TG_OP = 'DELETE' THEN
    change_type := 'deleted';
    old_vals := to_jsonb(OLD);
    INSERT INTO schedule_history (schedule_id, changed_by, change_type, old_values)
    VALUES (OLD.id, auth.uid(), change_type, old_vals);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER log_schedule_changes
  AFTER INSERT OR UPDATE OR DELETE ON employee_schedules
  FOR EACH ROW EXECUTE FUNCTION log_schedule_change();

-- Comprehensive conflict detection
CREATE OR REPLACE FUNCTION check_schedule_conflicts()
RETURNS TRIGGER AS $$
DECLARE
  v_hours_this_week DECIMAL(10,2);
  v_consecutive_days INTEGER;
  v_last_shift_end TIMESTAMP WITH TIME ZONE;
  v_hours_between DECIMAL(10,2);
  v_employee_age INTEGER;
  v_has_required_skills BOOLEAN;
  v_shift_record RECORD;
BEGIN
  -- Skip if cancelled
  IF NEW.status IN ('cancelled', 'no_show') THEN
    RETURN NEW;
  END IF;
  
  -- Get shift details
  SELECT * INTO v_shift_record FROM shifts WHERE id = NEW.shift_id;
  
  -- 1. Check approved leave
  IF EXISTS (
    SELECT 1 FROM leave_requests
    WHERE employee_id = NEW.employee_id
      AND status = 'approved'
      AND NEW.date BETWEEN start_date AND end_date
  ) THEN
    INSERT INTO schedule_conflicts (date, shift_id, conflict_type, severity, description, affected_employees, violation_rule)
    VALUES (NEW.date, NEW.shift_id, 'on_leave', 'critical', 'Medewerker heeft goedgekeurd verlof', ARRAY[NEW.employee_id], 'LEAVE_APPROVED')
    ON CONFLICT DO NOTHING;
  END IF;
  
  -- 2. Check double booking
  IF EXISTS (
    SELECT 1 FROM employee_schedules
    WHERE employee_id = NEW.employee_id AND date = NEW.date
      AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
      AND status NOT IN ('cancelled', 'no_show')
  ) THEN
    INSERT INTO schedule_conflicts (date, shift_id, conflict_type, severity, description, affected_employees, violation_rule)
    VALUES (NEW.date, NEW.shift_id, 'double_booked', 'critical', 'Medewerker al ingepland op deze dag', ARRAY[NEW.employee_id], 'DOUBLE_BOOKING')
    ON CONFLICT DO NOTHING;
  END IF;
  
  -- 3. Check overlapping times
  IF EXISTS (
    SELECT 1 FROM employee_schedules
    WHERE employee_id = NEW.employee_id AND date = NEW.date
      AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
      AND status NOT IN ('cancelled', 'no_show')
      AND (NEW.scheduled_start, NEW.scheduled_end) OVERLAPS (scheduled_start, scheduled_end)
  ) THEN
    INSERT INTO schedule_conflicts (date, shift_id, conflict_type, severity, description, affected_employees, violation_rule)
    VALUES (NEW.date, NEW.shift_id, 'overlapping', 'critical', 'Shift tijden overlappen', ARRAY[NEW.employee_id], 'TIME_OVERLAP')
    ON CONFLICT DO NOTHING;
  END IF;
  
  -- 4. Check weekly hours (ATW 5:8 - max 60 hours/week)
  SELECT COALESCE(SUM(EXTRACT(EPOCH FROM (scheduled_end - scheduled_start))/3600), 0) INTO v_hours_this_week
  FROM employee_schedules
  WHERE employee_id = NEW.employee_id
    AND date >= date_trunc('week', NEW.date)::DATE
    AND date < (date_trunc('week', NEW.date) + INTERVAL '7 days')::DATE
    AND status NOT IN ('cancelled', 'no_show');
  
  v_hours_this_week := v_hours_this_week + EXTRACT(EPOCH FROM (NEW.scheduled_end - NEW.scheduled_start))/3600;
  
  IF v_hours_this_week > 60 THEN
    INSERT INTO schedule_conflicts (date, shift_id, conflict_type, severity, description, affected_employees, violation_rule, violation_value, allowed_value)
    VALUES (NEW.date, NEW.shift_id, 'max_hours_exceeded', 'error', 'Meer dan 60 uur per week (Arbeidstijdenwet)', ARRAY[NEW.employee_id], 'ATW_5_8', v_hours_this_week, 60)
    ON CONFLICT DO NOTHING;
  END IF;
  
  -- 5. Check rest period (ATW 5:4 - min 11 hours between shifts)
  SELECT scheduled_end INTO v_last_shift_end
  FROM employee_schedules
  WHERE employee_id = NEW.employee_id
    AND date >= NEW.date - 1
    AND date <= NEW.date
    AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
    AND status NOT IN ('cancelled', 'no_show')
  ORDER BY scheduled_end DESC
  LIMIT 1;
  
  IF v_last_shift_end IS NOT NULL THEN
    v_hours_between := EXTRACT(EPOCH FROM (NEW.scheduled_start - v_last_shift_end))/3600;
    IF v_hours_between < 11 THEN
      INSERT INTO schedule_conflicts (date, shift_id, conflict_type, severity, description, affected_employees, violation_rule, violation_value, allowed_value)
      VALUES (NEW.date, NEW.shift_id, 'rest_period_violation', 'error', 'Minder dan 11 uur rust tussen diensten', ARRAY[NEW.employee_id], 'ATW_5_4', v_hours_between, 11)
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;
  
  -- 6. Check consecutive days (ATW 5:6 - max 12 days)
  SELECT COUNT(*) INTO v_consecutive_days
  FROM employee_schedules
  WHERE employee_id = NEW.employee_id
    AND date >= NEW.date - 12
    AND date <= NEW.date
    AND status NOT IN ('cancelled', 'no_show');
  
  IF v_consecutive_days >= 12 THEN
    INSERT INTO schedule_conflicts (date, shift_id, conflict_type, severity, description, affected_employees, violation_rule, violation_value, allowed_value)
    VALUES (NEW.date, NEW.shift_id, 'consecutive_days_exceeded', 'warning', 'Meer dan 12 opeenvolgende dagen', ARRAY[NEW.employee_id], 'ATW_5_6_1', v_consecutive_days, 12)
    ON CONFLICT DO NOTHING;
  END IF;
  
  -- 7. Check age for night shifts (ATW 4:2)
  IF v_shift_record.requires_night_permit THEN
    SELECT EXTRACT(YEAR FROM AGE(birth_date)) INTO v_employee_age
    FROM profiles WHERE id = NEW.employee_id;
    
    IF v_employee_age < 18 THEN
      INSERT INTO schedule_conflicts (date, shift_id, conflict_type, severity, description, affected_employees, violation_rule)
      VALUES (NEW.date, NEW.shift_id, 'underage_night_shift', 'critical', 'Minderjarige mag geen nachtdienst werken', ARRAY[NEW.employee_id], 'ATW_4_2')
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;
  
  -- 8. Check required skills
  IF v_shift_record.required_skills IS NOT NULL AND array_length(v_shift_record.required_skills, 1) > 0 THEN
    SELECT EXISTS (
      SELECT 1 FROM employee_skills
      WHERE employee_id = NEW.employee_id
        AND skill_id = ANY(v_shift_record.required_skills)
        AND (NOT requires_certification OR (certified AND (certification_expiry IS NULL OR certification_expiry >= CURRENT_DATE)))
    ) INTO v_has_required_skills;
    
    IF NOT v_has_required_skills THEN
      INSERT INTO schedule_conflicts (date, shift_id, conflict_type, severity, description, affected_employees, violation_rule)
      VALUES (NEW.date, NEW.shift_id, 'skill_mismatch', 'warning', 'Medewerker heeft niet de vereiste vaardigheden', ARRAY[NEW.employee_id], 'SKILL_REQUIREMENT')
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER check_schedule_conflicts_trigger
  AFTER INSERT OR UPDATE ON employee_schedules
  FOR EACH ROW EXECUTE FUNCTION check_schedule_conflicts();

-- Auto-create time-off blocks from approved leave
CREATE OR REPLACE FUNCTION sync_leave_to_timeoff()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'approved' AND (OLD IS NULL OR OLD.status != 'approved') THEN
    INSERT INTO time_off_blocks (employee_id, start_date, end_date, block_type, leave_request_id, status, approved_by, approved_at)
    VALUES (NEW.employee_id, NEW.start_date, NEW.end_date, 'leave', NEW.id, 'approved', NEW.approved_by, NEW.approved_at)
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER sync_leave_to_timeoff_trigger
  AFTER INSERT OR UPDATE ON leave_requests
  FOR EACH ROW EXECUTE FUNCTION sync_leave_to_timeoff();

-- Calculate shift costs automatically (integrates with company cost management)
CREATE OR REPLACE FUNCTION calculate_shift_cost()
RETURNS TRIGGER AS $$
DECLARE
  v_contract RECORD;
  v_company RECORD;
  v_shift RECORD;
  v_employee_hourly_rate DECIMAL(10,2);
  v_shift_multiplier DECIMAL(4,2);
  v_total_hours DECIMAL(5,2);
  v_base_hours DECIMAL(5,2);
  v_overtime_hours DECIMAL(5,2);
  v_base_cost DECIMAL(10,2);
  v_overtime_cost DECIMAL(10,2);
  v_allowances_cost DECIMAL(10,2) := 0;
  v_total_labor_cost DECIMAL(10,2);
  v_total_cost_incl_charges DECIMAL(10,2);
  v_employer_charges_pct DECIMAL(5,2);
BEGIN
  -- Only calculate for completed or in-progress shifts
  IF NEW.status NOT IN ('completed', 'in_progress') THEN
    RETURN NEW;
  END IF;
  
  -- Get company settings
  SELECT * INTO v_company FROM company_settings LIMIT 1;
  v_employer_charges_pct := COALESCE(v_company.employer_social_charges_pct, 20.00) + 
                            COALESCE(v_company.pension_employer_contribution_pct, 5.00);
  
  -- Get employee contract to find hourly rate
  SELECT * INTO v_contract
  FROM employee_contracts
  WHERE employee_id = NEW.employee_id
    AND status = 'active'
    AND start_date <= NEW.date
    AND (end_date IS NULL OR end_date >= NEW.date)
  LIMIT 1;
  
  -- Calculate hourly rate from contract
  IF v_contract.base_salary_hourly IS NOT NULL THEN
    v_employee_hourly_rate := v_contract.base_salary_hourly;
  ELSIF v_contract.base_salary_monthly IS NOT NULL THEN
    v_employee_hourly_rate := v_contract.base_salary_monthly / (COALESCE(v_contract.hours_per_week, 40) * 4.33);
  ELSE
    v_employee_hourly_rate := 25.00; -- Fallback
  END IF;
  
  -- Get shift details
  SELECT * INTO v_shift FROM shifts WHERE id = NEW.shift_id;
  v_shift_multiplier := COALESCE(v_shift.hourly_rate_multiplier, 1.00);
  
  -- Calculate hours
  IF NEW.actual_end IS NOT NULL THEN
    v_total_hours := EXTRACT(EPOCH FROM (NEW.actual_end - NEW.actual_start))/3600;
    v_total_hours := v_total_hours - (COALESCE(NEW.actual_break_minutes, NEW.break_minutes, 0) / 60.0);
  ELSE
    v_total_hours := EXTRACT(EPOCH FROM (NEW.scheduled_end - NEW.scheduled_start))/3600;
    v_total_hours := v_total_hours - (COALESCE(NEW.break_minutes, 0) / 60.0);
  END IF;
  
  -- Determine overtime
  IF v_total_hours > 8 THEN
    v_base_hours := 8;
    v_overtime_hours := v_total_hours - 8;
  ELSE
    v_base_hours := v_total_hours;
    v_overtime_hours := 0;
  END IF;
  
  -- Calculate base costs
  v_base_cost := v_base_hours * v_employee_hourly_rate * v_shift_multiplier;
  v_overtime_cost := v_overtime_hours * v_employee_hourly_rate * 1.5 * v_shift_multiplier;
  
  -- Calculate applicable allowances
  IF v_contract.id IS NOT NULL THEN
    SELECT COALESCE(SUM(
      CASE 
        WHEN at.calculation_type = 'percentage' AND at.applies_to_base_salary THEN
          (v_base_cost + v_overtime_cost) * (COALESCE(eca.custom_percentage, at.percentage_value) / 100)
        WHEN at.calculation_type = 'fixed_amount' AND at.payment_frequency = 'per_shift' THEN
          COALESCE(eca.custom_fixed_amount, at.fixed_amount)
        WHEN at.calculation_type = 'per_hour' THEN
          COALESCE(eca.custom_fixed_amount, at.fixed_amount) * v_total_hours
        ELSE 0
      END
    ), 0) INTO v_allowances_cost
    FROM employee_contract_allowances eca
    JOIN allowance_types at ON at.id = eca.allowance_type_id
    WHERE eca.contract_id = v_contract.id
      AND eca.is_active = TRUE
      AND (eca.effective_from IS NULL OR eca.effective_from <= NEW.date)
      AND (eca.effective_until IS NULL OR eca.effective_until >= NEW.date);
  END IF;
  
  v_total_labor_cost := v_base_cost + v_overtime_cost + v_allowances_cost;
  
  -- Add employer charges (werkgeverslasten + pensioen)
  v_total_cost_incl_charges := v_total_labor_cost * (1 + (v_employer_charges_pct / 100));
  
  -- Update calculated cost in schedule
  NEW.calculated_cost := v_total_cost_incl_charges;
  
  -- Insert/update cost record
  INSERT INTO shift_costs (
    schedule_id, base_hours, overtime_hours, base_rate, 
    overtime_multiplier, shift_multiplier, base_cost, overtime_cost, 
    total_labor_cost, other_allowances, total_cost, cost_center, calculated_at
  ) VALUES (
    NEW.id, v_base_hours, v_overtime_hours, v_employee_hourly_rate,
    1.5, v_shift_multiplier, v_base_cost, v_overtime_cost,
    v_total_labor_cost, v_allowances_cost, v_total_cost_incl_charges, NEW.cost_center, NOW()
  )
  ON CONFLICT (schedule_id) DO UPDATE SET
    base_hours = EXCLUDED.base_hours,
    overtime_hours = EXCLUDED.overtime_hours,
    base_rate = EXCLUDED.base_rate,
    base_cost = EXCLUDED.base_cost,
    overtime_cost = EXCLUDED.overtime_cost,
    total_labor_cost = EXCLUDED.total_labor_cost,
    other_allowances = EXCLUDED.other_allowances,
    total_cost = EXCLUDED.total_cost,
    calculated_at = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER calculate_shift_cost_trigger
  AFTER INSERT OR UPDATE ON employee_schedules
  FOR EACH ROW EXECUTE FUNCTION calculate_shift_cost();

-- ============================================================
-- 14. HELPER FUNCTIONS & VIEWS
-- ============================================================

-- Get schedule statistics
CREATE OR REPLACE FUNCTION get_schedule_stats(
  p_start_date DATE,
  p_end_date DATE,
  p_dept_id UUID DEFAULT NULL
)
RETURNS TABLE (
  total_shifts BIGINT,
  scheduled_shifts BIGINT,
  confirmed_shifts BIGINT,
  completed_shifts BIGINT,
  open_conflicts BIGINT,
  critical_conflicts BIGINT,
  total_hours DECIMAL(10,2),
  total_cost DECIMAL(12,2),
  avg_utilization DECIMAL(5,2)
) AS $$
BEGIN
  RETURN QUERY
  WITH shift_stats AS (
    SELECT
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE es.status = 'scheduled') as scheduled,
      COUNT(*) FILTER (WHERE es.confirmed_by_employee = TRUE) as confirmed,
      COUNT(*) FILTER (WHERE es.status = 'completed') as completed,
      COALESCE(SUM(EXTRACT(EPOCH FROM (es.scheduled_end - es.scheduled_start))/3600), 0) as hours
    FROM employee_schedules es
    WHERE es.date BETWEEN p_start_date AND p_end_date
      AND (p_dept_id IS NULL OR es.department_id = p_dept_id)
  ),
  conflict_stats AS (
    SELECT
      COUNT(*) FILTER (WHERE resolution_status = 'open') as open_count,
      COUNT(*) FILTER (WHERE severity = 'critical' AND resolution_status = 'open') as critical_count
    FROM schedule_conflicts
    WHERE date BETWEEN p_start_date AND p_end_date
  ),
  cost_stats AS (
    SELECT COALESCE(SUM(sc.total_cost), 0) as total
    FROM shift_costs sc
    JOIN employee_schedules es ON es.id = sc.schedule_id
    WHERE es.date BETWEEN p_start_date AND p_end_date
      AND (p_dept_id IS NULL OR es.department_id = p_dept_id)
  )
  SELECT
    ss.total,
    ss.scheduled,
    ss.confirmed,
    ss.completed,
    cs.open_count,
    cs.critical_count,
    ss.hours,
    cost.total,
    CASE WHEN ss.total > 0 THEN (ss.confirmed::DECIMAL / ss.total::DECIMAL * 100) ELSE 0 END
  FROM shift_stats ss, conflict_stats cs, cost_stats cost;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get employee schedule summary
CREATE OR REPLACE FUNCTION get_employee_schedule_summary(
  p_employee_id UUID,
  p_start_date DATE,
  p_end_date DATE
)
RETURNS TABLE (
  total_shifts INTEGER,
  total_hours DECIMAL(10,2),
  confirmed_shifts INTEGER,
  pending_swaps INTEGER,
  conflicts INTEGER,
  overtime_hours DECIMAL(10,2)
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::INTEGER as total_shifts,
    COALESCE(SUM(EXTRACT(EPOCH FROM (scheduled_end - scheduled_start))/3600), 0) as total_hours,
    COUNT(*) FILTER (WHERE confirmed_by_employee = TRUE)::INTEGER as confirmed_shifts,
    (SELECT COUNT(*)::INTEGER FROM shift_swap_requests WHERE requesting_employee_id = p_employee_id AND status = 'pending') as pending_swaps,
    (SELECT COUNT(*)::INTEGER FROM schedule_conflicts WHERE p_employee_id = ANY(affected_employees) AND resolution_status = 'open') as conflicts,
    COALESCE(SUM(CASE WHEN is_overtime THEN EXTRACT(EPOCH FROM (scheduled_end - scheduled_start))/3600 ELSE 0 END), 0) as overtime_hours
  FROM employee_schedules
  WHERE employee_id = p_employee_id
    AND date BETWEEN p_start_date AND p_end_date;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if employee is available for shift
CREATE OR REPLACE FUNCTION is_employee_available(
  p_employee_id UUID,
  p_date DATE,
  p_start_time TIME,
  p_end_time TIME
)
RETURNS BOOLEAN AS $$
DECLARE
  v_available BOOLEAN := TRUE;
  v_day_of_week INTEGER;
BEGIN
  v_day_of_week := EXTRACT(DOW FROM p_date);
  
  -- Check time-off blocks
  IF EXISTS (
    SELECT 1 FROM time_off_blocks
    WHERE employee_id = p_employee_id
      AND status = 'approved'
      AND p_date BETWEEN start_date AND end_date
  ) THEN
    RETURN FALSE;
  END IF;
  
  -- Check availability preferences
  IF EXISTS (
    SELECT 1 FROM employee_availability
    WHERE employee_id = p_employee_id
      AND (day_of_week = v_day_of_week OR specific_date = p_date)
      AND availability_type = 'unavailable'
      AND (effective_from IS NULL OR effective_from <= p_date)
      AND (effective_until IS NULL OR effective_until >= p_date)
  ) THEN
    RETURN FALSE;
  END IF;
  
  -- Check existing schedules
  IF EXISTS (
    SELECT 1 FROM employee_schedules
    WHERE employee_id = p_employee_id
      AND date = p_date
      AND status NOT IN ('cancelled', 'no_show')
      AND (p_start_time, p_end_time) OVERLAPS (scheduled_start::TIME, scheduled_end::TIME)
  ) THEN
    RETURN FALSE;
  END IF;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Auto-schedule shifts based on availability and preferences
CREATE OR REPLACE FUNCTION auto_schedule_shift(
  p_shift_id UUID,
  p_date DATE,
  p_required_employees INTEGER DEFAULT 1,
  p_department_id UUID DEFAULT NULL
)
RETURNS TABLE (
  scheduled_employee_id UUID,
  schedule_id UUID,
  priority_score DECIMAL(5,2)
) AS $$
BEGIN
  RETURN QUERY
  WITH eligible_employees AS (
    SELECT
      p.id as employee_id,
      -- Priority scoring
      CASE WHEN ea.availability_type = 'preferred' THEN 10 ELSE 5 END +
      CASE WHEN es.employee_id IS NULL THEN 5 ELSE 0 END + -- Fewer shifts this week
      CASE WHEN s.required_skills IS NULL THEN 0
           WHEN es2.employee_id IS NOT NULL THEN 10 ELSE 0 END as score
    FROM profiles p
    LEFT JOIN employee_availability ea ON ea.employee_id = p.id
      AND (ea.day_of_week = EXTRACT(DOW FROM p_date) OR ea.specific_date = p_date)
      AND (ea.effective_from IS NULL OR ea.effective_from <= p_date)
      AND (ea.effective_until IS NULL OR ea.effective_until >= p_date)
    LEFT JOIN employee_schedules es ON es.employee_id = p.id
      AND es.date >= date_trunc('week', p_date)::DATE
      AND es.date < (date_trunc('week', p_date) + INTERVAL '7 days')::DATE
    LEFT JOIN shifts s ON s.id = p_shift_id
    LEFT JOIN employee_skills es2 ON es2.employee_id = p.id
      AND (s.required_skills IS NULL OR es2.skill_id = ANY(s.required_skills))
    WHERE p.status = 'active'
      AND (p_department_id IS NULL OR p.department_id = p_department_id)
      AND is_employee_available(p.id, p_date, s.start_time, s.end_time)
    GROUP BY p.id, ea.availability_type, es.employee_id, es2.employee_id, s.required_skills
    ORDER BY score DESC
    LIMIT p_required_employees
  )
  SELECT
    ee.employee_id,
    NULL::UUID as schedule_id,
    ee.score
  FROM eligible_employees ee;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- View: Schedule overview with employee names
CREATE OR REPLACE VIEW v_schedule_overview AS
SELECT
  es.id,
  es.date,
  es.employee_id,
  p.full_name as employee_name,
  p.employee_number,
  d.name as department_name,
  s.name as shift_name,
  s.short_code as shift_code,
  s.color as shift_color,
  es.scheduled_start,
  es.scheduled_end,
  es.actual_start,
  es.actual_end,
  es.status,
  es.confirmed_by_employee,
  es.is_overtime,
  EXTRACT(EPOCH FROM (es.scheduled_end - es.scheduled_start))/3600 as scheduled_hours,
  CASE WHEN es.actual_end IS NOT NULL 
    THEN EXTRACT(EPOCH FROM (es.actual_end - es.actual_start))/3600 
    ELSE NULL END as actual_hours,
  sc.total_cost,
  es.notes
FROM employee_schedules es
JOIN profiles p ON p.id = es.employee_id
LEFT JOIN departments d ON d.id = es.department_id
LEFT JOIN shifts s ON s.id = es.shift_id
LEFT JOIN shift_costs sc ON sc.schedule_id = es.id;

-- View: Active conflicts with details
CREATE OR REPLACE VIEW v_active_conflicts AS
SELECT
  sc.*,
  ARRAY_AGG(DISTINCT p.full_name) as affected_employee_names,
  COUNT(DISTINCT sc.affected_employees) as employee_count
FROM schedule_conflicts sc
LEFT JOIN LATERAL unnest(sc.affected_employees) WITH ORDINALITY AS emp(id) ON TRUE
LEFT JOIN profiles p ON p.id = emp.id
WHERE sc.resolution_status = 'open'
GROUP BY sc.id;

-- ============================================================
-- 15. DOCUMENTATION
-- ============================================================

COMMENT ON TABLE skills IS 'Available skills and certifications';
COMMENT ON TABLE employee_skills IS 'Employee skill proficiencies and certifications';
COMMENT ON TABLE shifts IS 'Work shift definitions with labor law compliance';
COMMENT ON TABLE schedule_templates IS 'Reusable schedule templates for departments';
COMMENT ON TABLE template_shifts IS 'Shift assignments within templates';
COMMENT ON TABLE demand_forecast IS 'Workload forecasting for capacity planning';
COMMENT ON TABLE employee_schedules IS 'Actual employee shift assignments with time tracking';
COMMENT ON TABLE schedule_history IS 'Complete audit trail of schedule changes';
COMMENT ON TABLE employee_availability IS 'Employee availability preferences and constraints';
COMMENT ON TABLE time_off_blocks IS 'Time-off periods (leave, sick, training, etc.)';
COMMENT ON TABLE shift_swap_requests IS 'Employee shift swap and trade requests';
COMMENT ON TABLE schedule_conflicts IS 'Detected scheduling conflicts and violations';
COMMENT ON TABLE labor_rules IS 'Labor law compliance rules (Arbeidstijdenwet)';
COMMENT ON TABLE shift_costs IS 'Labor cost tracking per shift';
COMMENT ON TABLE department_budgets IS 'Department budget tracking and alerts';

COMMENT ON FUNCTION check_schedule_conflicts() IS 'Validates schedules against 8+ compliance rules';
COMMENT ON FUNCTION log_schedule_change() IS 'Maintains complete audit trail of all changes';
COMMENT ON FUNCTION sync_leave_to_timeoff() IS 'Auto-creates time-off blocks from approved leave';
COMMENT ON FUNCTION calculate_shift_cost() IS 'Automatically calculates labor costs including overtime';
COMMENT ON FUNCTION get_schedule_stats(date, date, uuid) IS 'Returns comprehensive schedule statistics';
COMMENT ON FUNCTION get_employee_schedule_summary(uuid, date, date) IS 'Employee schedule summary with hours and conflicts';
COMMENT ON FUNCTION is_employee_available(uuid, date, time, time) IS 'Checks if employee can work a shift';
COMMENT ON FUNCTION auto_schedule_shift(uuid, date, integer, uuid) IS 'AI-powered shift scheduling based on availability and skills';

COMMENT ON VIEW v_schedule_overview IS 'Complete schedule view with employee and cost details';
COMMENT ON VIEW v_active_conflicts IS 'All open conflicts with employee names';
