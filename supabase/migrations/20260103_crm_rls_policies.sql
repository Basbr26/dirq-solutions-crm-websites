-- =============================================
-- CRM ROW LEVEL SECURITY POLICIES
-- Created: January 3, 2026
-- Purpose: Implement role-based access control for CRM entities
-- Roles: ADMIN, SALES, MANAGER, SUPPORT
-- =============================================

-- Drop all existing policies first
DROP POLICY IF EXISTS "Industries viewable by all authenticated users" ON industries;
DROP POLICY IF EXISTS "Industries manageable by admins" ON industries;
DROP POLICY IF EXISTS "Companies select policy" ON companies;
DROP POLICY IF EXISTS "Companies insert policy" ON companies;
DROP POLICY IF EXISTS "Companies update policy" ON companies;
DROP POLICY IF EXISTS "Companies delete policy" ON companies;
DROP POLICY IF EXISTS "Contacts select policy" ON contacts;
DROP POLICY IF EXISTS "Contacts insert policy" ON contacts;
DROP POLICY IF EXISTS "Contacts update policy" ON contacts;
DROP POLICY IF EXISTS "Contacts delete policy" ON contacts;
DROP POLICY IF EXISTS "Leads select policy" ON leads;
DROP POLICY IF EXISTS "Leads insert policy" ON leads;
DROP POLICY IF EXISTS "Leads update policy" ON leads;
DROP POLICY IF EXISTS "Leads delete policy" ON leads;
DROP POLICY IF EXISTS "Interactions select policy" ON interactions;
DROP POLICY IF EXISTS "Interactions insert policy" ON interactions;
DROP POLICY IF EXISTS "Interactions update policy" ON interactions;
DROP POLICY IF EXISTS "Interactions delete policy" ON interactions;

-- Enable RLS on all CRM tables
ALTER TABLE industries ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE interactions ENABLE ROW LEVEL SECURITY;

-- =============================================
-- HELPER FUNCTIONS
-- =============================================

-- Get current user's role
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
  SELECT COALESCE(
    (SELECT role FROM profiles WHERE id = auth.uid()),
    'SUPPORT'
  );
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Check if user is admin or manager
CREATE OR REPLACE FUNCTION is_admin_or_manager()
RETURNS BOOLEAN AS $$
  SELECT get_user_role() IN ('ADMIN', 'MANAGER');
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- =============================================
-- INDUSTRIES POLICIES (Master Data)
-- =============================================
-- All authenticated users can view industries
CREATE POLICY "Industries viewable by all authenticated users"
  ON industries FOR SELECT
  TO authenticated
  USING (true);

-- Only admins can manage industries
CREATE POLICY "Industries manageable by admins"
  ON industries FOR ALL
  TO authenticated
  USING (get_user_role() = 'ADMIN')
  WITH CHECK (get_user_role() = 'ADMIN');

-- =============================================
-- COMPANIES POLICIES
-- =============================================

-- SELECT: 
-- - All authenticated users can see all companies
CREATE POLICY "Companies select policy"
  ON companies FOR SELECT
  TO authenticated
  USING (true);

-- INSERT:
-- - ADMIN, SALES, MANAGER can create companies
-- - Auto-assign to creator
CREATE POLICY "Companies insert policy"
  ON companies FOR INSERT
  TO authenticated
  WITH CHECK (
    get_user_role() IN ('ADMIN', 'SALES', 'MANAGER')
    AND owner_id = auth.uid()
  );

-- UPDATE:
-- - ADMIN & MANAGER: Can update all companies
-- - SALES: Can update their own companies
CREATE POLICY "Companies update policy"
  ON companies FOR UPDATE
  TO authenticated
  USING (
    is_admin_or_manager()
    OR owner_id = auth.uid()
  )
  WITH CHECK (
    is_admin_or_manager()
    OR owner_id = auth.uid()
  );

-- DELETE:
-- - ADMIN: Delete any company
-- - MANAGER: Delete any company
-- - SALES: Delete own companies (not allowed here, to match contacts logic exactly, only ADMIN, MANAGER, or owner)
CREATE POLICY "Companies delete policy"
  ON companies FOR DELETE
  TO authenticated
  USING (
    is_admin_or_manager()
    OR owner_id = auth.uid()
  );

-- =============================================
-- CONTACTS POLICIES
-- =============================================

-- SELECT:
-- - ADMIN & MANAGER: See all contacts
-- - SALES & SUPPORT: See contacts they own OR contacts of companies they own
CREATE POLICY "Contacts select policy"
  ON contacts FOR SELECT
  TO authenticated
  USING (
    is_admin_or_manager()
    OR owner_id = auth.uid()
    OR company_id IN (
      SELECT id FROM companies WHERE owner_id = auth.uid()
    )
  );

-- INSERT:
-- - ADMIN, SALES, MANAGER can create contacts
-- - Must own the related company (if company_id provided)
CREATE POLICY "Contacts insert policy"
  ON contacts FOR INSERT
  TO authenticated
  WITH CHECK (
    get_user_role() IN ('ADMIN', 'SALES', 'MANAGER')
    AND owner_id = auth.uid()
    AND (
      company_id IS NULL
      OR is_admin_or_manager()
      OR company_id IN (SELECT id FROM companies WHERE owner_id = auth.uid())
    )
  );

-- UPDATE:
-- - ADMIN & MANAGER: Update all contacts
-- - SALES: Update own contacts or contacts of companies they own
CREATE POLICY "Contacts update policy"
  ON contacts FOR UPDATE
  TO authenticated
  USING (
    is_admin_or_manager()
    OR owner_id = auth.uid()
    OR company_id IN (
      SELECT id FROM companies WHERE owner_id = auth.uid()
    )
  )
  WITH CHECK (
    is_admin_or_manager()
    OR owner_id = auth.uid()
    OR company_id IN (
      SELECT id FROM companies WHERE owner_id = auth.uid()
    )
  );

-- DELETE:
-- - ADMIN: Delete any contact
-- - MANAGER: Delete any contact
-- - SALES: Delete own contacts
CREATE POLICY "Contacts delete policy"
  ON contacts FOR DELETE
  TO authenticated
  USING (
    is_admin_or_manager()
    OR owner_id = auth.uid()
  );

-- =============================================
-- LEADS POLICIES
-- =============================================

-- SELECT:
-- - ADMIN & MANAGER: See all leads
-- - SALES: See only their own leads
CREATE POLICY "Leads select policy"
  ON leads FOR SELECT
  TO authenticated
  USING (
    is_admin_or_manager()
    OR owner_id = auth.uid()
  );

-- INSERT:
-- - ADMIN, SALES, MANAGER can create leads
-- - Must be assigned to creator
CREATE POLICY "Leads insert policy"
  ON leads FOR INSERT
  TO authenticated
  WITH CHECK (
    get_user_role() IN ('ADMIN', 'SALES', 'MANAGER')
    AND owner_id = auth.uid()
  );

-- UPDATE:
-- - ADMIN & MANAGER: Update all leads (can reassign)
-- - SALES: Update only their own leads
CREATE POLICY "Leads update policy"
  ON leads FOR UPDATE
  TO authenticated
  USING (
    is_admin_or_manager()
    OR owner_id = auth.uid()
  )
  WITH CHECK (
    is_admin_or_manager()
    OR owner_id = auth.uid()
  );

-- DELETE:
-- - ADMIN & MANAGER: Delete any lead
-- - SALES: Cannot delete leads (only archive by changing status)
CREATE POLICY "Leads delete policy"
  ON leads FOR DELETE
  TO authenticated
  USING (is_admin_or_manager());

-- =============================================
-- INTERACTIONS POLICIES
-- =============================================

-- SELECT:
-- - ADMIN & MANAGER: See all interactions
-- - SALES & SUPPORT: See interactions they created OR on companies they own
CREATE POLICY "Interactions select policy"
  ON interactions FOR SELECT
  TO authenticated
  USING (
    is_admin_or_manager()
    OR user_id = auth.uid()
    OR company_id IN (
      SELECT id FROM companies WHERE owner_id = auth.uid()
    )
    OR lead_id IN (
      SELECT id FROM leads WHERE owner_id = auth.uid()
    )
  );

-- INSERT:
-- - All authenticated users can create interactions
-- - Must be assigned to creator
-- - Must have access to related company/lead
CREATE POLICY "Interactions insert policy"
  ON interactions FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND (
      company_id IS NULL
      OR is_admin_or_manager()
      OR company_id IN (SELECT id FROM companies WHERE owner_id = auth.uid())
    )
    AND (
      lead_id IS NULL
      OR is_admin_or_manager()
      OR lead_id IN (SELECT id FROM leads WHERE owner_id = auth.uid())
    )
  );

-- UPDATE:
-- - Users can update their own interactions
-- - ADMIN & MANAGER can update all
CREATE POLICY "Interactions update policy"
  ON interactions FOR UPDATE
  TO authenticated
  USING (
    is_admin_or_manager()
    OR user_id = auth.uid()
  )
  WITH CHECK (
    is_admin_or_manager()
    OR user_id = auth.uid()
  );

-- DELETE:
-- - Users can delete their own interactions
-- - ADMIN & MANAGER can delete all
CREATE POLICY "Interactions delete policy"
  ON interactions FOR DELETE
  TO authenticated
  USING (
    is_admin_or_manager()
    OR user_id = auth.uid()
  );

-- =============================================
-- PERFORMANCE INDEXES FOR RLS
-- =============================================
-- These indexes help RLS policies perform efficiently

-- Index for owner_id lookups (used in most policies)
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(id);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);

-- =============================================
-- AUDIT LOGGING (Optional but Recommended)
-- =============================================

-- Create audit log table
CREATE TABLE IF NOT EXISTS crm_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
  old_data JSONB,
  new_data JSONB,
  user_id UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Audit trigger function
CREATE OR REPLACE FUNCTION crm_audit_trigger()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO crm_audit_log (
    table_name,
    record_id,
    action,
    old_data,
    new_data,
    user_id
  ) VALUES (
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    TG_OP,
    CASE WHEN TG_OP = 'DELETE' THEN row_to_json(OLD) ELSE NULL END,
    CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN row_to_json(NEW) ELSE NULL END,
    auth.uid()
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Drop existing trigger if it exists to avoid duplicate errors
DROP TRIGGER IF EXISTS companies_audit_trigger ON companies;
CREATE TRIGGER companies_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON companies
  FOR EACH ROW EXECUTE FUNCTION crm_audit_trigger();

CREATE TRIGGER leads_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON leads
  FOR EACH ROW EXECUTE FUNCTION crm_audit_trigger();

-- Enable RLS on audit log (admins only)
ALTER TABLE crm_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Audit log viewable by admins"
  ON crm_audit_log FOR SELECT
  TO authenticated
  USING (get_user_role() = 'ADMIN');

-- =============================================
-- GRANT PERMISSIONS
-- =============================================
-- Grant necessary permissions to authenticated role

GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON industries TO authenticated;
GRANT ALL ON companies TO authenticated;
GRANT ALL ON contacts TO authenticated;
GRANT ALL ON leads TO authenticated;
GRANT ALL ON interactions TO authenticated;
GRANT SELECT ON crm_audit_log TO authenticated;
