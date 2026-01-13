-- =============================================
-- PROJECT MANAGEMENT ENHANCEMENTS
-- Created: 2026-01-13
-- Purpose: Add upsell tracking and AI automation project type
-- =============================================

-- =============================================
-- 1. ADD UPSELL OPPORTUNITIES TRACKING
-- =============================================
-- Track potential upsells like: SEO pakket, Logo design, Extra pagina's, 
-- Onderhoud contract, Hosting upgrade, AI chatbot, etc.
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS upsell_opportunities TEXT[];

COMMENT ON COLUMN projects.upsell_opportunities IS 
'Array van potentiële upsell kansen zoals "SEO pakket", "Logo design", "Extra pagina''s", "AI chatbot"';

-- =============================================
-- 2. ADD AI AUTOMATION PROJECT TYPE
-- =============================================
-- Drop existing constraint
ALTER TABLE projects DROP CONSTRAINT IF EXISTS projects_project_type_check;

-- Add new constraint including 'ai_automation'
ALTER TABLE projects 
ADD CONSTRAINT projects_project_type_check 
CHECK (project_type IN (
  'landing_page',
  'corporate_website', 
  'ecommerce',
  'web_app',
  'blog',
  'portfolio',
  'custom',
  'ai_automation'  -- NEW: n8n workflows, Zapier, AI assistenten, ChatGPT integraties
));

COMMENT ON CONSTRAINT projects_project_type_check ON projects IS 
'Valid project types including AI automation services (n8n, Zapier, AI bots)';

-- =============================================
-- 3. EXAMPLE DATA FOR TESTING
-- =============================================
-- Uncomment below to insert test data:
/*
-- Example AI Automation project
INSERT INTO projects (
  title, 
  description, 
  project_type, 
  value, 
  stage, 
  probability,
  company_id,
  owner_id,
  upsell_opportunities
) VALUES (
  'n8n Workflow Automatisering',
  'Automatische lead verwerking met KVK enrichment en Apollo.io integratie',
  'ai_automation',
  2500,
  'quote_requested',
  40,
  (SELECT id FROM companies LIMIT 1),
  (SELECT id FROM profiles LIMIT 1),
  ARRAY['Extra workflows', 'API integraties', 'Dashboard ontwikkeling']
);

-- Example website project with upsells
UPDATE projects 
SET upsell_opportunities = ARRAY['SEO pakket €500', 'Logo design €350', 'Extra pagina €150']
WHERE project_type = 'corporate_website'
LIMIT 1;
*/
