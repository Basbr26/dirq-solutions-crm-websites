-- Add Intake Checklist systeem voor gestructureerde klantinformatie
-- Implementeert: Smart forms, document checklist, status tracking
-- Reported in: Agency Upgrade Requirements

-- Step 1: Create intake_checklist table
CREATE TABLE IF NOT EXISTS intake_checklist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Relations
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  -- Checklist Items (Boolean)
  logo_received BOOLEAN DEFAULT FALSE,
  logo_received_at TIMESTAMPTZ,
  
  brand_guidelines_received BOOLEAN DEFAULT FALSE,
  brand_guidelines_received_at TIMESTAMPTZ,
  
  texts_provided BOOLEAN DEFAULT FALSE,
  texts_provided_at TIMESTAMPTZ,
  
  texts_approved BOOLEAN DEFAULT FALSE,
  texts_approved_at TIMESTAMPTZ,
  
  images_provided BOOLEAN DEFAULT FALSE,
  images_provided_at TIMESTAMPTZ,
  
  nba_check_done BOOLEAN DEFAULT FALSE,
  nba_check_done_at TIMESTAMPTZ,
  
  domain_access_provided BOOLEAN DEFAULT FALSE,
  domain_access_provided_at TIMESTAMPTZ,
  
  hosting_access_provided BOOLEAN DEFAULT FALSE,
  hosting_access_provided_at TIMESTAMPTZ,
  
  google_analytics_access BOOLEAN DEFAULT FALSE,
  google_analytics_access_at TIMESTAMPTZ,
  
  social_media_credentials BOOLEAN DEFAULT FALSE,
  social_media_credentials_at TIMESTAMPTZ,
  
  -- Status
  overall_status TEXT GENERATED ALWAYS AS (
    CASE 
      WHEN logo_received AND texts_approved AND nba_check_done THEN 'complete'
      WHEN logo_received OR texts_provided OR nba_check_done THEN 'in_progress'
      ELSE 'pending'
    END
  ) STORED,
  
  completion_percentage INTEGER GENERATED ALWAYS AS (
    (
      (CASE WHEN logo_received THEN 1 ELSE 0 END) +
      (CASE WHEN brand_guidelines_received THEN 1 ELSE 0 END) +
      (CASE WHEN texts_provided THEN 1 ELSE 0 END) +
      (CASE WHEN texts_approved THEN 1 ELSE 0 END) +
      (CASE WHEN images_provided THEN 1 ELSE 0 END) +
      (CASE WHEN nba_check_done THEN 1 ELSE 0 END) +
      (CASE WHEN domain_access_provided THEN 1 ELSE 0 END) +
      (CASE WHEN hosting_access_provided THEN 1 ELSE 0 END) +
      (CASE WHEN google_analytics_access THEN 1 ELSE 0 END) +
      (CASE WHEN social_media_credentials THEN 1 ELSE 0 END)
    ) * 10
  ) STORED,
  
  -- Deadline tracking
  intake_deadline DATE,
  deadline_reminder_sent BOOLEAN DEFAULT FALSE,
  
  -- Notes
  notes TEXT,
  
  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Step 2: Add intake_checklist_id to projects table
ALTER TABLE projects
ADD COLUMN IF NOT EXISTS intake_checklist_id UUID REFERENCES intake_checklist(id) ON DELETE SET NULL;

-- Step 3: Create indexes
CREATE INDEX idx_intake_checklist_project_id ON intake_checklist(project_id);
CREATE INDEX idx_intake_checklist_company_id ON intake_checklist(company_id);
CREATE INDEX idx_intake_checklist_status ON intake_checklist(overall_status);
CREATE INDEX idx_intake_checklist_deadline ON intake_checklist(intake_deadline) 
  WHERE intake_deadline IS NOT NULL;

-- Step 4: Create view for incomplete intakes
CREATE OR REPLACE VIEW incomplete_intakes AS
SELECT 
  ic.id,
  ic.project_id,
  c.naam AS company_name,
  p.naam AS project_name,
  ic.overall_status,
  ic.completion_percentage,
  ic.intake_deadline,
  EXTRACT(DAY FROM (ic.intake_deadline - CURRENT_DATE))::INTEGER AS days_until_deadline,
  CASE 
    WHEN ic.intake_deadline < CURRENT_DATE THEN 'overdue'
    WHEN ic.intake_deadline <= CURRENT_DATE + INTERVAL '3 days' THEN 'urgent'
    WHEN ic.intake_deadline <= CURRENT_DATE + INTERVAL '7 days' THEN 'upcoming'
    ELSE 'ok'
  END AS deadline_status,
  -- Missing items
  ARRAY_REMOVE(ARRAY[
    CASE WHEN NOT ic.logo_received THEN 'Logo' END,
    CASE WHEN NOT ic.brand_guidelines_received THEN 'Huisstijl' END,
    CASE WHEN NOT ic.texts_provided THEN 'Teksten' END,
    CASE WHEN NOT ic.texts_approved THEN 'Teksten goedkeuring' END,
    CASE WHEN NOT ic.images_provided THEN 'Afbeeldingen' END,
    CASE WHEN NOT ic.nba_check_done THEN 'NBA Check' END,
    CASE WHEN NOT ic.domain_access_provided THEN 'Domein toegang' END,
    CASE WHEN NOT ic.hosting_access_provided THEN 'Hosting toegang' END,
    CASE WHEN NOT ic.google_analytics_access THEN 'Google Analytics' END,
    CASE WHEN NOT ic.social_media_credentials THEN 'Social Media' END
  ], NULL) AS missing_items
FROM intake_checklist ic
JOIN companies c ON c.id = ic.company_id
JOIN projects p ON p.id = ic.project_id
WHERE ic.overall_status != 'complete'
ORDER BY 
  CASE 
    WHEN ic.intake_deadline < CURRENT_DATE THEN 1
    WHEN ic.intake_deadline <= CURRENT_DATE + INTERVAL '3 days' THEN 2
    WHEN ic.intake_deadline <= CURRENT_DATE + INTERVAL '7 days' THEN 3
    ELSE 4
  END,
  ic.intake_deadline ASC NULLS LAST;

-- Step 5: Create function to auto-set completed_at
CREATE OR REPLACE FUNCTION check_intake_completion()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- If all critical items are complete, set completed_at
  IF NEW.logo_received AND NEW.texts_approved AND NEW.nba_check_done 
     AND OLD.completed_at IS NULL THEN
    NEW.completed_at = NOW();
  END IF;
  
  -- If items become incomplete, clear completed_at
  IF (NOT NEW.logo_received OR NOT NEW.texts_approved OR NOT NEW.nba_check_done)
     AND OLD.completed_at IS NOT NULL THEN
    NEW.completed_at = NULL;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_intake_completion
  BEFORE UPDATE ON intake_checklist
  FOR EACH ROW
  EXECUTE FUNCTION check_intake_completion();

-- Step 6: Create automatic timestamp updater
CREATE OR REPLACE FUNCTION update_intake_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_update_intake_timestamp
  BEFORE UPDATE ON intake_checklist
  FOR EACH ROW
  EXECUTE FUNCTION update_intake_updated_at();

-- Step 7: Create function to send deadline reminders
CREATE OR REPLACE FUNCTION get_intake_deadline_reminders()
RETURNS TABLE(
  checklist_id UUID,
  project_name TEXT,
  company_name TEXT,
  deadline DATE,
  days_remaining INTEGER,
  missing_items TEXT[]
)
LANGUAGE sql
STABLE
AS $$
  SELECT 
    ic.id,
    p.naam,
    c.naam,
    ic.intake_deadline,
    EXTRACT(DAY FROM (ic.intake_deadline - CURRENT_DATE))::INTEGER,
    ARRAY_REMOVE(ARRAY[
      CASE WHEN NOT ic.logo_received THEN 'Logo' END,
      CASE WHEN NOT ic.texts_approved THEN 'Teksten goedkeuring' END,
      CASE WHEN NOT ic.nba_check_done THEN 'NBA Check' END
    ], NULL)
  FROM intake_checklist ic
  JOIN projects p ON p.id = ic.project_id
  JOIN companies c ON c.id = ic.company_id
  WHERE ic.overall_status != 'complete'
    AND ic.intake_deadline IS NOT NULL
    AND ic.intake_deadline <= CURRENT_DATE + INTERVAL '7 days'
    AND NOT ic.deadline_reminder_sent
  ORDER BY ic.intake_deadline ASC;
$$;

-- Step 8: Enable RLS
ALTER TABLE intake_checklist ENABLE ROW LEVEL SECURITY;

-- Step 9: Create RLS policies
CREATE POLICY "Users can view intake checklists"
  ON intake_checklist FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = intake_checklist.project_id
        AND (projects.user_id = auth.uid() OR is_admin_or_manager())
    )
  );

CREATE POLICY "Users can manage intake checklists"
  ON intake_checklist FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = intake_checklist.project_id
        AND (projects.user_id = auth.uid() OR is_admin_or_manager())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = intake_checklist.project_id
        AND (projects.user_id = auth.uid() OR is_admin_or_manager())
    )
  );

-- Step 10: Add comments
COMMENT ON TABLE intake_checklist IS 
'Gestructureerde intake checklist voor klantinformatie verzameling per project';

COMMENT ON COLUMN intake_checklist.overall_status IS 
'Auto-calculated: complete wanneer logo, texts_approved en nba_check_done = true';

COMMENT ON COLUMN intake_checklist.completion_percentage IS 
'Auto-calculated: percentage van 10 checklist items die completed zijn';

COMMENT ON COLUMN intake_checklist.intake_deadline IS 
'Deadline voor klant om alle informatie aan te leveren (7-14 dagen na offerte acceptatie)';

COMMENT ON VIEW incomplete_intakes IS 
'Dashboard view met alle incomplete intakes, gesorteerd op urgency';

COMMENT ON FUNCTION get_intake_deadline_reminders() IS 
'Haalt intake checklists op die een deadline reminder nodig hebben (binnen 7 dagen)';
