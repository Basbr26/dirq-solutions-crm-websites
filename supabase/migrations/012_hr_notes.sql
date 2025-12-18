-- HR Notes System
-- Private notes for HR and Managers about employees

-- 1. Create hr_notes table
CREATE TABLE IF NOT EXISTS hr_notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES profiles(id),
  
  -- Content
  title VARCHAR(200) NOT NULL,
  content TEXT NOT NULL,
  category VARCHAR(50) NOT NULL CHECK (category IN (
    '1-on-1', 'performance', 'feedback', 'general', 'concern', 'achievement'
  )),
  
  -- Privacy
  visibility VARCHAR(20) DEFAULT 'private' CHECK (visibility IN (
    'private', 'hr_only', 'manager_shared'
  )),
  
  -- Follow-up
  follow_up_required BOOLEAN DEFAULT FALSE,
  follow_up_date DATE,
  follow_up_completed BOOLEAN DEFAULT FALSE,
  
  -- Metadata
  tags TEXT[], -- Array of tags for filtering
  is_pinned BOOLEAN DEFAULT FALSE,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create indexes for performance
CREATE INDEX idx_hr_notes_employee ON hr_notes(employee_id);
CREATE INDEX idx_hr_notes_created_by ON hr_notes(created_by);
CREATE INDEX idx_hr_notes_category ON hr_notes(category);
CREATE INDEX idx_hr_notes_follow_up ON hr_notes(follow_up_date) WHERE follow_up_required = TRUE AND follow_up_completed = FALSE;
CREATE INDEX idx_hr_notes_pinned ON hr_notes(is_pinned) WHERE is_pinned = TRUE;
CREATE INDEX idx_hr_notes_created_at ON hr_notes(created_at DESC);

-- 3. Enable RLS
ALTER TABLE hr_notes ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies

-- Policy: Employees cannot see hr_notes (strict privacy)
-- This ensures medewerkers can NEVER see notes about themselves
CREATE POLICY "Employees cannot access hr_notes"
  ON hr_notes
  FOR ALL
  USING (FALSE)
  WITH CHECK (FALSE);

-- Policy: HR and Super Admin can see all notes
CREATE POLICY "HR can see all notes"
  ON hr_notes
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_roles.user_id = auth.uid() 
      AND user_roles.role = 'hr'
    )
  );

-- Policy: Managers can see notes for their team members
CREATE POLICY "Managers can see team notes"
  ON hr_notes
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_roles.user_id = auth.uid() 
      AND user_roles.role = 'manager'
    )
    AND (
      -- Notes they created
      created_by = auth.uid()
      OR 
      -- Notes about their team members
      employee_id IN (
        SELECT id FROM profiles 
        WHERE manager_id = auth.uid()
      )
      OR
      -- Notes shared with managers
      visibility = 'manager_shared'
    )
  );

-- Policy: HR and Managers can create notes
CREATE POLICY "HR and Managers can create notes"
  ON hr_notes
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_roles.user_id = auth.uid() 
      AND user_roles.role IN ('hr', 'manager')
    )
    AND created_by = auth.uid()
  );

-- Policy: Creator can update their own notes
CREATE POLICY "Creator can update own notes"
  ON hr_notes
  FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

-- Policy: Creator can delete their own notes
CREATE POLICY "Creator can delete own notes"
  ON hr_notes
  FOR DELETE
  TO authenticated
  USING (created_by = auth.uid());

-- 5. Updated_at trigger
CREATE OR REPLACE FUNCTION update_hr_notes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_hr_notes_updated_at
  BEFORE UPDATE ON hr_notes
  FOR EACH ROW
  EXECUTE FUNCTION update_hr_notes_updated_at();

-- 6. Function to get note statistics for an employee
CREATE OR REPLACE FUNCTION get_employee_note_stats(p_employee_id UUID)
RETURNS JSON AS $$
DECLARE
  v_stats JSON;
BEGIN
  SELECT json_build_object(
    'total_notes', COUNT(*),
    'pending_follow_ups', COUNT(*) FILTER (WHERE follow_up_required = TRUE AND follow_up_completed = FALSE),
    'last_30_days', COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days'),
    'by_category', json_object_agg(
      category, 
      COUNT(*)
    )
  )
  INTO v_stats
  FROM hr_notes
  WHERE employee_id = p_employee_id
  GROUP BY employee_id;
  
  RETURN COALESCE(v_stats, json_build_object(
    'total_notes', 0,
    'pending_follow_ups', 0,
    'last_30_days', 0,
    'by_category', '{}'::json
  ));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_employee_note_stats TO authenticated;

-- 7. Comments for documentation
COMMENT ON TABLE hr_notes IS 'Private notes about employees for HR and management. Not visible to employees.';
COMMENT ON COLUMN hr_notes.employee_id IS 'The employee this note is about';
COMMENT ON COLUMN hr_notes.created_by IS 'The HR/Manager who created this note';
COMMENT ON COLUMN hr_notes.category IS 'Type of note: 1-on-1, performance, feedback, general, concern, achievement';
COMMENT ON COLUMN hr_notes.visibility IS 'Who can see this note: private (creator only), hr_only, manager_shared';
COMMENT ON COLUMN hr_notes.follow_up_required IS 'Whether this note requires follow-up action';
COMMENT ON COLUMN hr_notes.follow_up_date IS 'Deadline for follow-up action';
COMMENT ON COLUMN hr_notes.follow_up_completed IS 'Whether the follow-up has been completed';
COMMENT ON COLUMN hr_notes.tags IS 'Array of tags for categorization and searching';
COMMENT ON COLUMN hr_notes.is_pinned IS 'Whether this note is pinned to the top';
