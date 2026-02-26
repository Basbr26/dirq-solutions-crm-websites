-- ============================================================
-- PROJECT VELOCITY - COMPLETE ROLLBACK
-- Migration: 20260109_velocity_phase1_down.sql
-- Purpose: Safe rollback of all Phase 1 + Fase 2 prep changes
-- ============================================================

-- Omgekeerde volgorde: Triggers → Functions → Indexes → Constraints → Columns

-- ============================================================
-- 1. DROP TRIGGERS & FUNCTIONS
-- ============================================================
DROP TRIGGER IF EXISTS trigger_update_company_mrr ON projects;
DROP FUNCTION IF EXISTS update_company_mrr();

-- ============================================================
-- 2. DROP INDEXES
-- ============================================================
DROP INDEX IF EXISTS idx_projects_intake_logo;
DROP INDEX IF EXISTS idx_projects_package;
DROP INDEX IF EXISTS idx_companies_source;
DROP INDEX IF EXISTS idx_companies_linkedin;
DROP INDEX IF EXISTS idx_companies_kvk;

-- ============================================================
-- 3. DROP CONSTRAINTS
-- ============================================================
ALTER TABLE projects DROP CONSTRAINT IF EXISTS fk_project_company;
ALTER TABLE projects DROP CONSTRAINT IF EXISTS chk_dns_status;
ALTER TABLE companies DROP CONSTRAINT IF EXISTS chk_company_source;

-- ============================================================
-- 4. DROP COLUMNS (Projects first, then Companies)
-- ============================================================
ALTER TABLE projects 
DROP COLUMN IF EXISTS intake_status,
DROP COLUMN IF EXISTS dns_status,
DROP COLUMN IF EXISTS hosting_provider,
DROP COLUMN IF EXISTS monthly_recurring_revenue,
DROP COLUMN IF EXISTS calculated_total,
DROP COLUMN IF EXISTS selected_addons,
DROP COLUMN IF EXISTS package_id;

ALTER TABLE companies 
DROP COLUMN IF EXISTS total_mrr,
DROP COLUMN IF EXISTS video_audit_url,
DROP COLUMN IF EXISTS tech_stack,
DROP COLUMN IF EXISTS ai_audit_summary,
DROP COLUMN IF EXISTS source,
DROP COLUMN IF EXISTS kvk_number,
DROP COLUMN IF EXISTS linkedin_url;

-- ============================================================
-- VERIFICATION QUERY (Run after rollback)
-- ============================================================
-- SELECT column_name, data_type 
-- FROM information_schema.columns 
-- WHERE table_name = 'companies' 
-- AND column_name IN ('kvk_number', 'linkedin_url', 'source', 'total_mrr');
-- Should return 0 rows if rollback successful
