-- =============================================
-- EMAIL LOGS TABLE
-- Created: January 14, 2026
-- Purpose: Track all sent emails for audit and debugging
-- =============================================

BEGIN;

-- Create email_logs table
CREATE TABLE IF NOT EXISTS email_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- Email details
  document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
  recipient TEXT NOT NULL,
  subject TEXT NOT NULL,
  sent_at TIMESTAMPTZ NOT NULL,
  
  -- Provider info
  provider TEXT NOT NULL DEFAULT 'resend',
  external_id TEXT, -- Resend message ID
  
  -- Status tracking
  status TEXT DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'bounced', 'failed')),
  error_message TEXT,
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_email_logs_document_id ON email_logs(document_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_recipient ON email_logs(recipient);
CREATE INDEX IF NOT EXISTS idx_email_logs_sent_at ON email_logs(sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_logs_status ON email_logs(status);

-- Add RLS policies
ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read email logs
CREATE POLICY "Users can view email logs"
  ON email_logs FOR SELECT
  TO authenticated
  USING (true);

-- Allow service role to insert email logs (from edge functions)
CREATE POLICY "Service role can insert email logs"
  ON email_logs FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Verification
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'email_logs'
  ) THEN
    RAISE NOTICE '✅ email_logs table created';
  ELSE
    RAISE WARNING '❌ email_logs table creation failed';
  END IF;
END $$;

COMMIT;
