-- =============================================
-- Finance Outreach Strategy Migration
-- Created: January 7, 2026
-- Purpose: Add new interaction types, project fields, and quote add-ons
-- =============================================

-- =============================================
-- 1. ADD NEW INTERACTION TYPES
-- =============================================
-- Drop existing CHECK constraint
ALTER TABLE interactions 
DROP CONSTRAINT IF EXISTS interactions_type_check;

-- Add new CHECK constraint with additional types
ALTER TABLE interactions
ADD CONSTRAINT interactions_type_check 
CHECK (type IN (
  'call', 
  'email', 
  'meeting', 
  'note', 
  'task', 
  'demo',
  'requirement_discussion',
  'quote_presentation',
  'review_session',
  'training',
  'physical_mail',           -- NEW: Fysiek kaartje/brochure verstuurd
  'linkedin_video_audit'     -- NEW: LinkedIn video audit verstuurd
));

COMMENT ON COLUMN interactions.type IS 'Interaction type including physical_mail and linkedin_video_audit for outreach tracking';

-- =============================================
-- 2. ADD PROJECT FIELDS FOR WEBSITE BUILDERS
-- =============================================
-- Add website_builder column to projects table (previously leads)
ALTER TABLE leads 
ADD COLUMN IF NOT EXISTS website_builder TEXT 
CHECK (website_builder IN ('10web.io', 'Landingpage.ai'));

-- Add delivery_deadline column
ALTER TABLE leads 
ADD COLUMN IF NOT EXISTS delivery_deadline TIMESTAMPTZ;

COMMENT ON COLUMN leads.website_builder IS 'AI website builder platform used for project (10web.io or Landingpage.ai)';
COMMENT ON COLUMN leads.delivery_deadline IS 'Hard deadline for project delivery';

-- =============================================
-- 3. ADD IS_ADDON FLAG TO QUOTE ITEMS
-- =============================================
-- Check if quote_items table exists (it might be in website_sales_crm migration)
DO $$ 
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'quote_items') THEN
    -- Add is_addon column if not exists
    IF NOT EXISTS (SELECT FROM information_schema.columns 
                   WHERE table_name = 'quote_items' AND column_name = 'is_addon') THEN
      ALTER TABLE quote_items 
      ADD COLUMN is_addon BOOLEAN DEFAULT false;
      
      COMMENT ON COLUMN quote_items.is_addon IS 'Whether this item is an add-on (Logo design, Extra pages, Rush delivery)';
    END IF;
  END IF;
END $$;

-- =============================================
-- 4. CREATE INDEX FOR OUTREACH TRACKING
-- =============================================
-- Index for fast filtering of outreach-specific interactions
CREATE INDEX IF NOT EXISTS idx_interactions_outreach_types 
ON interactions(type, created_at DESC) 
WHERE type IN ('physical_mail', 'linkedin_video_audit', 'call');

-- =============================================
-- 5. CREATE VIEW FOR WEEKLY OUTREACH STATS
-- =============================================
CREATE OR REPLACE VIEW v_weekly_outreach_stats AS
SELECT 
  date_trunc('week', created_at) as week_start,
  type,
  COUNT(*) as count,
  user_id
FROM interactions
WHERE type IN ('physical_mail', 'linkedin_video_audit', 'call')
  AND created_at >= date_trunc('week', CURRENT_DATE) - INTERVAL '12 weeks'
GROUP BY date_trunc('week', created_at), type, user_id
ORDER BY week_start DESC, type;

COMMENT ON VIEW v_weekly_outreach_stats IS 'Weekly outreach statistics for tracking finance professional targeting goals';

-- =============================================
-- 6. CREATE FUNCTION FOR AUTOMATIC FOLLOW-UP TASKS
-- =============================================
CREATE OR REPLACE FUNCTION create_physical_mail_followup()
RETURNS TRIGGER AS $$
BEGIN
  -- Only trigger for physical_mail interactions
  IF NEW.type = 'physical_mail' THEN
    -- Create a follow-up task 4 days later
    INSERT INTO interactions (
      company_id,
      contact_id,
      user_id,
      type,
      subject,
      description,
      is_task,
      task_status,
      due_date,
      tags
    ) VALUES (
      NEW.company_id,
      NEW.contact_id,
      NEW.user_id,
      'task',
      'LinkedIn Follow-up: ' || (SELECT name FROM companies WHERE id = NEW.company_id),
      'Follow-up LinkedIn bericht sturen na fysiek kaartje.' || E'\n\n' || 'Originele interactie: ' || NEW.subject,
      true,
      'pending',
      CURRENT_DATE + INTERVAL '4 days',
      ARRAY['auto-generated', 'follow-up', 'physical-mail']
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic follow-up creation
DROP TRIGGER IF EXISTS trigger_physical_mail_followup ON interactions;
CREATE TRIGGER trigger_physical_mail_followup
  AFTER INSERT ON interactions
  FOR EACH ROW
  WHEN (NEW.type = 'physical_mail')
  EXECUTE FUNCTION create_physical_mail_followup();

COMMENT ON FUNCTION create_physical_mail_followup() IS 'Automatically creates a LinkedIn follow-up task 4 days after sending physical mail';

-- =============================================
-- 7. GRANT PERMISSIONS
-- =============================================
-- Ensure authenticated users can read the weekly stats view
GRANT SELECT ON v_weekly_outreach_stats TO authenticated;

-- =============================================
-- VERIFICATION QUERIES (for testing)
-- =============================================
-- Uncomment to verify after running migration:

-- Check interaction types constraint:
-- SELECT constraint_name, check_clause 
-- FROM information_schema.check_constraints 
-- WHERE constraint_name = 'interactions_type_check';

-- Check new columns exist:
-- SELECT column_name, data_type, column_default 
-- FROM information_schema.columns 
-- WHERE table_name = 'leads' 
-- AND column_name IN ('website_builder', 'delivery_deadline');

-- Test weekly stats view:
-- SELECT * FROM v_weekly_outreach_stats LIMIT 10;
