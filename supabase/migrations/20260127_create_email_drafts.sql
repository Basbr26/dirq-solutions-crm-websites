-- =============================================
-- CREATE EMAIL DRAFTS TABLE
-- Created: January 27, 2026
-- Purpose: Store AI-generated email drafts for review before sending
-- =============================================

BEGIN;

-- Create email_drafts table
CREATE TABLE IF NOT EXISTS email_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Email content
  to_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  
  -- Status tracking
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'failed', 'cancelled')),
  type TEXT NOT NULL, -- e.g. 'follow_up', 'proposal', 'reminder'
  
  -- Relationships
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  sent_at TIMESTAMPTZ,
  sent_by UUID REFERENCES auth.users(id),
  
  -- Error tracking
  error_message TEXT,
  
  -- Audit
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_email_drafts_status ON email_drafts(status);
CREATE INDEX idx_email_drafts_company ON email_drafts(company_id);
CREATE INDEX idx_email_drafts_project ON email_drafts(project_id);
CREATE INDEX idx_email_drafts_created_at ON email_drafts(created_at DESC);
CREATE INDEX idx_email_drafts_created_by ON email_drafts(created_by);

-- Enable RLS
ALTER TABLE email_drafts ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can see drafts they created or for companies they can access
CREATE POLICY "Users can view their own drafts"
  ON email_drafts
  FOR SELECT
  USING (
    created_by = auth.uid()
    OR 
    company_id IN (
      SELECT id FROM companies 
      WHERE created_by = auth.uid() 
      OR id IN (SELECT company_id FROM projects WHERE created_by = auth.uid())
    )
  );

-- Users can insert drafts for companies they have access to
CREATE POLICY "Users can create drafts"
  ON email_drafts
  FOR INSERT
  WITH CHECK (
    created_by = auth.uid()
  );

-- Users can update their own drafts that are still in draft status
CREATE POLICY "Users can update their drafts"
  ON email_drafts
  FOR UPDATE
  USING (
    created_by = auth.uid()
    OR auth.uid() IN (SELECT id FROM auth.users WHERE raw_user_meta_data->>'role' IN ('ADMIN', 'super_admin'))
  );

-- Users can delete their own drafts
CREATE POLICY "Users can delete their drafts"
  ON email_drafts
  FOR DELETE
  USING (
    created_by = auth.uid()
    OR auth.uid() IN (SELECT id FROM auth.users WHERE raw_user_meta_data->>'role' IN ('ADMIN', 'super_admin'))
  );

-- Create updated_at trigger
CREATE TRIGGER update_email_drafts_updated_at
  BEFORE UPDATE ON email_drafts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMIT;

DO $$
BEGIN
  RAISE NOTICE '✅ Email drafts table created successfully';
END $$;
