-- =====================================================
-- EMPLOYEE SELF-SERVICE PORTAL TABLES
-- =====================================================

-- Employee Achievements & Badges
CREATE TABLE IF NOT EXISTS employee_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  achievement_type VARCHAR(50) NOT NULL CHECK (achievement_type IN ('tenure', 'performance', 'social', 'learning')),
  achievement_name VARCHAR(100) NOT NULL,
  badge_icon VARCHAR(10) NOT NULL, -- Emoji
  badge_color VARCHAR(20) DEFAULT 'blue',
  points INTEGER DEFAULT 0,
  earned_date TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(employee_id, achievement_name)
);

-- Employee Goals & Objectives
CREATE TABLE IF NOT EXISTS employee_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  category VARCHAR(50) NOT NULL CHECK (category IN ('learning', 'performance', 'leadership', 'technical', 'personal')),
  progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  deadline DATE NOT NULL,
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled', 'on_track', 'needs_attention')),
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Training Enrollments & Certifications
CREATE TABLE IF NOT EXISTS training_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  course_name VARCHAR(200) NOT NULL,
  provider VARCHAR(100) NOT NULL,
  course_url TEXT,
  cost DECIMAL(10, 2) DEFAULT 0,
  budget_category VARCHAR(50), -- For approval workflow
  status VARCHAR(50) DEFAULT 'requested' CHECK (status IN ('requested', 'approved', 'rejected', 'in_progress', 'completed', 'cancelled')),
  approved_by UUID REFERENCES profiles(id),
  start_date DATE,
  completion_date DATE,
  duration_hours INTEGER,
  certificate_url TEXT,
  certificate_expiry DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Employee Referral Program
CREATE TABLE IF NOT EXISTS employee_referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  candidate_name VARCHAR(100) NOT NULL,
  candidate_email VARCHAR(100) NOT NULL,
  candidate_phone VARCHAR(20),
  position_title VARCHAR(100) NOT NULL,
  department VARCHAR(100),
  referred_date DATE DEFAULT CURRENT_DATE,
  status VARCHAR(50) DEFAULT 'referred' CHECK (status IN ('referred', 'applied', 'screening', 'interview', 'offered', 'hired', 'rejected', 'withdrawn')),
  hired_date DATE,
  bonus_amount DECIMAL(10, 2) DEFAULT 500,
  bonus_paid BOOLEAN DEFAULT FALSE,
  bonus_paid_date DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Employee Feedback & 360 Reviews
CREATE TABLE IF NOT EXISTS employee_feedback_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  feedback_topic TEXT,
  requested_date DATE DEFAULT CURRENT_DATE,
  deadline DATE NOT NULL,
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
  anonymous BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS employee_feedback_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES employee_feedback_requests(id) ON DELETE CASCADE,
  respondent_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  category VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Employee Self-Service Feed Events
CREATE TABLE IF NOT EXISTS employee_feed_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  event_type VARCHAR(50) NOT NULL CHECK (event_type IN ('leave_approved', 'document_ready', 'training_available', 'birthday', 'anniversary', 'certification_expiring', 'goal_achieved', 'feedback_received', 'team_news')),
  title TEXT NOT NULL,
  subtitle TEXT,
  icon VARCHAR(10), -- Emoji
  action_url TEXT,
  priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('high', 'normal', 'low')),
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Career Path & Development History
CREATE TABLE IF NOT EXISTS career_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title VARCHAR(100) NOT NULL,
  department VARCHAR(100),
  start_date DATE NOT NULL,
  end_date DATE,
  achievements TEXT[], -- Array of achievement descriptions
  skills_developed TEXT[], -- Array of skills gained
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Employee Performance Metrics
CREATE TABLE IF NOT EXISTS performance_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  metric_type VARCHAR(50) NOT NULL, -- 'attendance', 'punctuality', 'performance_score', 'peer_rating'
  value DECIMAL(10, 2),
  period_month INTEGER,
  period_year INTEGER,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(employee_id, metric_type, period_month, period_year)
);

-- Employee Points & Gamification
CREATE TABLE IF NOT EXISTS employee_points_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  action_type VARCHAR(50) NOT NULL, -- 'training_completed', 'referral_hired', 'perfect_attendance', 'feedback_given'
  points_earned INTEGER NOT NULL,
  description TEXT,
  redeemed BOOLEAN DEFAULT FALSE,
  redeemed_for VARCHAR(100), -- What the points were spent on
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_employee_achievements_employee ON employee_achievements(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_achievements_type ON employee_achievements(achievement_type);
CREATE INDEX IF NOT EXISTS idx_employee_goals_employee ON employee_goals(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_goals_status ON employee_goals(status);
CREATE INDEX IF NOT EXISTS idx_training_enrollments_employee ON training_enrollments(employee_id);
CREATE INDEX IF NOT EXISTS idx_training_enrollments_status ON training_enrollments(status);
CREATE INDEX IF NOT EXISTS idx_employee_referrals_referrer ON employee_referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_employee_referrals_status ON employee_referrals(status);
CREATE INDEX IF NOT EXISTS idx_employee_feedback_requests_employee ON employee_feedback_requests(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_feed_events_employee ON employee_feed_events(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_feed_events_created ON employee_feed_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_career_history_employee ON career_history(employee_id);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_employee ON performance_metrics(employee_id);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_period ON performance_metrics(period_year, period_month);
CREATE INDEX IF NOT EXISTS idx_employee_points_employee ON employee_points_history(employee_id);

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE employee_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_feedback_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_feedback_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_feed_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE career_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_points_history ENABLE ROW LEVEL SECURITY;

-- Employee Achievements - Own data + HR access
CREATE POLICY "Employees can view own achievements"
  ON employee_achievements FOR SELECT
  USING (auth.uid() = employee_id);

CREATE POLICY "HR can view all achievements"
  ON employee_achievements FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role IN ('hr', 'super_admin')
    )
  );

CREATE POLICY "HR can manage achievements"
  ON employee_achievements FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role IN ('hr', 'super_admin')
    )
  );

-- Employee Goals
CREATE POLICY "Employees can manage own goals"
  ON employee_goals FOR ALL
  USING (auth.uid() = employee_id);

CREATE POLICY "HR can view and manage goals"
  ON employee_goals FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role IN ('hr', 'super_admin')
    )
  );

CREATE POLICY "Managers can view team goals"
  ON employee_goals FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.manager_id = employee_goals.employee_id
    )
  );

-- Training Enrollments
CREATE POLICY "Employees can manage own training"
  ON training_enrollments FOR ALL
  USING (auth.uid() = employee_id);

CREATE POLICY "HR can manage all training"
  ON training_enrollments FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role IN ('hr', 'super_admin')
    )
  );

-- Employee Referrals
CREATE POLICY "Employees can manage own referrals"
  ON employee_referrals FOR ALL
  USING (auth.uid() = referrer_id);

CREATE POLICY "HR can view all referrals"
  ON employee_referrals FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role IN ('hr', 'super_admin')
    )
  );

-- Feedback Requests
CREATE POLICY "Employees can manage own feedback requests"
  ON employee_feedback_requests FOR ALL
  USING (auth.uid() = employee_id);

CREATE POLICY "Employees can respond to feedback requests"
  ON employee_feedback_responses FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Feed Events
CREATE POLICY "Employees can view own feed"
  ON employee_feed_events FOR SELECT
  USING (auth.uid() = employee_id);

CREATE POLICY "HR can create feed events"
  ON employee_feed_events FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role IN ('hr', 'super_admin')
    )
  );

-- Career History
CREATE POLICY "Employees can view own career history"
  ON career_history FOR SELECT
  USING (auth.uid() = employee_id);

CREATE POLICY "HR can manage career history"
  ON career_history FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role IN ('hr', 'super_admin')
    )
  );

-- Performance Metrics
CREATE POLICY "Employees can view own metrics"
  ON performance_metrics FOR SELECT
  USING (auth.uid() = employee_id);

CREATE POLICY "Managers can view team metrics"
  ON performance_metrics FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles manager
      JOIN profiles team_member ON manager.id = team_member.manager_id
      WHERE manager.id = auth.uid()
      AND team_member.id = performance_metrics.employee_id
    )
  );

CREATE POLICY "HR can manage all metrics"
  ON performance_metrics FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role IN ('hr', 'super_admin')
    )
  );

-- Employee Points
CREATE POLICY "Employees can view own points"
  ON employee_points_history FOR SELECT
  USING (auth.uid() = employee_id);

CREATE POLICY "HR can manage points"
  ON employee_points_history FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role IN ('hr', 'super_admin')
    )
  );

-- =====================================================
-- VERIFICATION
-- =====================================================

SELECT 
  'Employee Portal tables deployed!' as status,
  (SELECT COUNT(*) FROM information_schema.tables 
   WHERE table_schema = 'public' 
   AND table_name LIKE 'employee_%') as employee_tables,
  (SELECT COUNT(*) FROM information_schema.tables 
   WHERE table_schema = 'public' 
   AND table_name IN ('career_history', 'performance_metrics')) as additional_tables;
