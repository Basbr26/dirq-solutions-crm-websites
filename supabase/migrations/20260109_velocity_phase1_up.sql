-- ============================================================
-- PROJECT VELOCITY - COMPLETE IMPLEMENTATION
-- Migration: 20260109_velocity_phase1_up.sql
-- Goal: €240K ARR Infrastructure + API Gateway Foundation
-- ============================================================

-- ============================================================
-- 1. EXTERNAL DATA FIELDS (KVK, Apollo, Manus AI)
-- ============================================================
ALTER TABLE companies 
ADD COLUMN IF NOT EXISTS linkedin_url TEXT,
ADD COLUMN IF NOT EXISTS website_url TEXT,        -- For Fase 2 API
ADD COLUMN IF NOT EXISTS phone TEXT,              -- For Fase 2 API
ADD COLUMN IF NOT EXISTS kvk_number TEXT UNIQUE, -- Uniek voor KVK lookups
ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'Manual',
ADD COLUMN IF NOT EXISTS ai_audit_summary TEXT,
ADD COLUMN IF NOT EXISTS tech_stack TEXT[],
ADD COLUMN IF NOT EXISTS video_audit_url TEXT,
ADD COLUMN IF NOT EXISTS total_mrr DECIMAL(10,2) DEFAULT 0.00;

-- Data integrity constraints
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'chk_company_source' 
    AND table_name = 'companies'
  ) THEN
    ALTER TABLE companies
    ADD CONSTRAINT chk_company_source 
    CHECK (source IN ('Manual', 'Apollo', 'KVK', 'Website', 'Manus', 'n8n_automation'));
  END IF;
END $$;

-- ============================================================
-- 2. PROJECT FINANCE & TRACKING
-- ============================================================
ALTER TABLE projects
ADD COLUMN IF NOT EXISTS package_id TEXT CHECK (package_id IN ('finance_starter', 'finance_growth')),
ADD COLUMN IF NOT EXISTS selected_addons TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS calculated_total DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS monthly_recurring_revenue DECIMAL(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS hosting_provider TEXT,
ADD COLUMN IF NOT EXISTS dns_status TEXT DEFAULT 'pending';

-- DNS status constraint
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'chk_dns_status' 
    AND table_name = 'projects'
  ) THEN
    ALTER TABLE projects
    ADD CONSTRAINT chk_dns_status 
    CHECK (dns_status IN ('pending', 'active', 'failed', 'propagated'));
  END IF;
END $$;

-- ============================================================
-- 3. INTAKE/ONBOARDING STATUS (Safe JSONB)
-- ============================================================
ALTER TABLE projects ADD COLUMN IF NOT EXISTS intake_status JSONB;

UPDATE projects 
SET intake_status = '{
  "logo_received": false,
  "colors_approved": false,
  "texts_received": false,
  "nba_check_complete": false
}'::jsonb
WHERE intake_status IS NULL;

-- ============================================================
-- 4. FOREIGN KEYS (Prevent data corruption)
-- ============================================================
-- Check if FK already exists before adding
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'fk_project_company' 
    AND table_name = 'projects'
  ) THEN
    ALTER TABLE projects
    ADD CONSTRAINT fk_project_company   
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;
  END IF;
END $$;

-- ============================================================
-- 5. PERFORMANCE INDEXES (Critical voor n8n automation)
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_companies_kvk ON companies(kvk_number);
CREATE INDEX IF NOT EXISTS idx_companies_linkedin ON companies(linkedin_url);
CREATE INDEX IF NOT EXISTS idx_companies_source ON companies(source);
CREATE INDEX IF NOT EXISTS idx_projects_package ON projects(package_id);
CREATE INDEX IF NOT EXISTS idx_projects_intake_logo ON projects((intake_status->>'logo_received'));

-- ============================================================
-- 6. MRR AGGREGATIE TRIGGER (Auto-update company total_mrr)
-- ============================================================
CREATE OR REPLACE FUNCTION update_company_mrr()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE companies
  SET total_mrr = (
    SELECT COALESCE(SUM(monthly_recurring_revenue), 0)
    FROM projects
    WHERE company_id = COALESCE(NEW.company_id, OLD.company_id)
  )
  WHERE id = COALESCE(NEW.company_id, OLD.company_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_company_mrr ON projects;
CREATE TRIGGER trigger_update_company_mrr
AFTER INSERT OR UPDATE OF monthly_recurring_revenue OR DELETE ON projects
FOR EACH ROW
EXECUTE FUNCTION update_company_mrr();

-- ============================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================
COMMENT ON COLUMN companies.kvk_number IS 'Dutch Chamber of Commerce number for KVK API integration';
COMMENT ON COLUMN companies.source IS 'Data source: Manual, Apollo, KVK, Website, Manus, n8n_automation';
COMMENT ON COLUMN companies.ai_audit_summary IS 'AI-generated business audit summary from Manus/Gemini';
COMMENT ON COLUMN companies.tech_stack IS 'Detected technology stack from website analysis';
COMMENT ON COLUMN companies.video_audit_url IS 'URL to Manus AI-generated video audit';
COMMENT ON COLUMN companies.total_mrr IS 'Aggregated Monthly Recurring Revenue from all projects (auto-calculated)';

COMMENT ON COLUMN projects.package_id IS 'Selected package: finance_starter or finance_growth';
COMMENT ON COLUMN projects.selected_addons IS 'Array of addon IDs (addon_logo, addon_rush, addon_page)';
COMMENT ON COLUMN projects.calculated_total IS 'Total one-time project cost (package + addons)';
COMMENT ON COLUMN projects.monthly_recurring_revenue IS 'Monthly recurring fee for this project';
COMMENT ON COLUMN projects.intake_status IS 'Onboarding checklist: logo, colors, texts, NBA check';
COMMENT ON COLUMN projects.dns_status IS 'DNS propagation status: pending, active, failed, propagated';

COMMENT ON TRIGGER trigger_update_company_mrr ON projects IS 
'Automatically recalculates company.total_mrr when project MRR changes';

-- ============================================================
-- VERIFICATION QUERY (Run after migration)
-- ============================================================
-- SELECT 
--   c.name,
--   c.kvk_number,
--   c.source,
--   c.total_mrr,
--   COUNT(p.id) AS project_count,
--   SUM(p.monthly_recurring_revenue) AS calculated_mrr
-- FROM companies c
-- LEFT JOIN projects p ON p.company_id = c.id
-- GROUP BY c.id, c.name, c.kvk_number, c.source, c.total_mrr;
