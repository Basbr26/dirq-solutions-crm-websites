-- =============================================
-- CRM CORE SCHEMA MIGRATION
-- Created: January 3, 2026
-- Purpose: Transform HR app to CRM system
-- Tables: industries, companies, contacts, leads, interactions
-- =============================================

-- =============================================
-- DROP EXISTING TABLES (if re-running migration)
-- =============================================
DROP TABLE IF EXISTS interactions CASCADE;
DROP TABLE IF EXISTS leads CASCADE;
DROP TABLE IF EXISTS contacts CASCADE;
DROP TABLE IF EXISTS companies CASCADE;
DROP TABLE IF EXISTS industries CASCADE;

-- =============================================
-- 1. INDUSTRIES TABLE (Master Data)
-- =============================================
CREATE TABLE industries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  icon TEXT, -- lucide icon name
  color TEXT DEFAULT '#0088FE', -- hex color for UI
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Industry data trigger
DROP TRIGGER IF EXISTS update_industries_updated_at ON industries;
CREATE TRIGGER update_industries_updated_at
  BEFORE UPDATE ON industries
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- 2. COMPANIES TABLE (Core CRM Entity)
-- =============================================
CREATE TABLE companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  industry_id UUID REFERENCES industries(id) ON DELETE SET NULL,
  website TEXT,
  phone TEXT,
  email TEXT,
  
  -- Address as JSONB for flexibility
  address JSONB DEFAULT '{}'::jsonb, -- {street, city, postal_code, country}
  
  -- Company details
  company_size TEXT CHECK (company_size IN ('1-10', '11-50', '51-200', '201-500', '501+')),
  annual_revenue DECIMAL(15,2),
  
  -- Status & Classification
  status TEXT NOT NULL DEFAULT 'prospect' CHECK (status IN ('prospect', 'active', 'inactive', 'churned')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  
  -- Ownership & Assignment
  owner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  
  -- Metadata
  notes TEXT,
  tags TEXT[] DEFAULT '{}',
  custom_fields JSONB DEFAULT '{}'::jsonb,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_contact_date TIMESTAMPTZ
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_companies_owner_id ON companies(owner_id);
CREATE INDEX IF NOT EXISTS idx_companies_industry_id ON companies(industry_id);
CREATE INDEX IF NOT EXISTS idx_companies_status ON companies(status);
CREATE INDEX IF NOT EXISTS idx_companies_name ON companies USING gin(to_tsvector('dutch', name));

-- Update trigger
DROP TRIGGER IF EXISTS update_companies_updated_at ON companies;
CREATE TRIGGER update_companies_updated_at
  BEFORE UPDATE ON companies
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- 3. CONTACTS TABLE (People at Companies)
-- =============================================
CREATE TABLE contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  
  -- Personal Info
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  mobile TEXT,
  
  -- Professional Info
  position TEXT,
  department TEXT,
  linkedin_url TEXT,
  
  -- Flags
  is_primary BOOLEAN DEFAULT false,
  is_decision_maker BOOLEAN DEFAULT false,
  
  -- Ownership
  owner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  
  -- Metadata
  notes TEXT,
  tags TEXT[] DEFAULT '{}',
  custom_fields JSONB DEFAULT '{}'::jsonb,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_contact_date TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_contacts_company_id ON contacts(company_id);
CREATE INDEX idx_contacts_owner_id ON contacts(owner_id);
CREATE INDEX idx_contacts_email ON contacts(email);
CREATE INDEX idx_contacts_name ON contacts USING gin(to_tsvector('dutch', first_name || ' ' || last_name));

-- Update trigger
CREATE TRIGGER update_contacts_updated_at
  BEFORE UPDATE ON contacts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- 4. LEADS TABLE (Sales Opportunities)
-- =============================================
CREATE TABLE IF NOT EXISTS leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Relationships
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  
  -- Lead Details
  title TEXT NOT NULL,
  description TEXT,
  
  -- Financial
  value DECIMAL(15,2), -- Expected value in EUR
  currency TEXT DEFAULT 'EUR',
  
  -- Pipeline Stage
  stage TEXT NOT NULL DEFAULT 'new' CHECK (stage IN (
    'new',           -- Just created
    'qualified',     -- Initial qualification done
    'proposal',      -- Proposal sent
    'negotiation',   -- In negotiation
    'closed_won',    -- Deal won
    'closed_lost'    -- Deal lost
  )),
  
  -- Probability & Forecasting
  probability INTEGER DEFAULT 0 CHECK (probability BETWEEN 0 AND 100),
  expected_close_date DATE,
  actual_close_date DATE,
  
  -- Loss/Win tracking
  lost_reason TEXT,
  won_notes TEXT,
  
  -- Assignment
  owner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  
  -- Source tracking
  source TEXT, -- e.g., 'website', 'referral', 'cold_call', 'event'
  
  -- Metadata
  tags TEXT[] DEFAULT '{}',
  custom_fields JSONB DEFAULT '{}'::jsonb,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  stage_changed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_leads_company_id ON leads(company_id);
CREATE INDEX idx_leads_contact_id ON leads(contact_id);
CREATE INDEX idx_leads_owner_id ON leads(owner_id);
CREATE INDEX idx_leads_stage ON leads(stage);
CREATE INDEX idx_leads_expected_close_date ON leads(expected_close_date);

-- Update trigger
CREATE TRIGGER update_leads_updated_at
  BEFORE UPDATE ON leads
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Stage change tracking trigger
CREATE OR REPLACE FUNCTION track_lead_stage_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.stage IS DISTINCT FROM NEW.stage THEN
    NEW.stage_changed_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER track_lead_stage_change_trigger
  BEFORE UPDATE ON leads
  FOR EACH ROW
  EXECUTE FUNCTION track_lead_stage_change();

-- =============================================
-- 5. INTERACTIONS TABLE (Activity Log)
-- =============================================
CREATE TABLE IF NOT EXISTS interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Relationships (at least one required)
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  
  -- Interaction Details
  type TEXT NOT NULL CHECK (type IN ('call', 'email', 'meeting', 'note', 'task', 'demo')),
  direction TEXT CHECK (direction IN ('inbound', 'outbound')), -- For calls/emails
  
  subject TEXT NOT NULL,
  description TEXT,
  
  -- Timing
  duration_minutes INTEGER,
  scheduled_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  
  -- Task/Follow-up
  is_task BOOLEAN DEFAULT false,
  task_status TEXT CHECK (task_status IN ('pending', 'completed', 'cancelled')),
  due_date DATE,
  
  -- Owner
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  
  -- Metadata
  attachments TEXT[], -- Array of file URLs
  tags TEXT[] DEFAULT '{}',
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_interactions_company_id ON interactions(company_id);
CREATE INDEX idx_interactions_contact_id ON interactions(contact_id);
CREATE INDEX idx_interactions_lead_id ON interactions(lead_id);
CREATE INDEX idx_interactions_user_id ON interactions(user_id);
CREATE INDEX idx_interactions_type ON interactions(type);
CREATE INDEX idx_interactions_created_at ON interactions(created_at DESC);

-- Update trigger
CREATE TRIGGER update_interactions_updated_at
  BEFORE UPDATE ON interactions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Update last_contact_date on company when interaction created
CREATE OR REPLACE FUNCTION update_company_last_contact()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.company_id IS NOT NULL THEN
    UPDATE companies
    SET last_contact_date = NEW.created_at
    WHERE id = NEW.company_id;
  END IF;
  
  IF NEW.contact_id IS NOT NULL THEN
    UPDATE contacts
    SET last_contact_date = NEW.created_at
    WHERE id = NEW.contact_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_last_contact_trigger
  AFTER INSERT ON interactions
  FOR EACH ROW
  EXECUTE FUNCTION update_company_last_contact();

-- =============================================
-- 6. SEED INITIAL DATA - Industries
-- =============================================
INSERT INTO industries (name, description, icon, color) VALUES
  ('Technology', 'Software, IT Services, SaaS', 'Laptop', '#0088FE'),
  ('Finance', 'Banking, Insurance, Investment', 'DollarSign', '#00C49F'),
  ('Healthcare', 'Medical, Pharmaceutical, Healthcare Services', 'Heart', '#FF8042'),
  ('Retail', 'E-commerce, Physical Stores, Consumer Goods', 'ShoppingCart', '#FFBB28'),
  ('Manufacturing', 'Production, Industrial, Engineering', 'Factory', '#8884D8'),
  ('Real Estate', 'Property Management, Construction', 'Building2', '#82ca9d'),
  ('Education', 'Schools, Training, E-learning', 'GraduationCap', '#ffc658'),
  ('Consulting', 'Business Consulting, Advisory Services', 'Briefcase', '#8dd1e1'),
  ('Marketing', 'Advertising, Digital Marketing, PR', 'Megaphone', '#d084d8'),
  ('Legal', 'Law Firms, Legal Services', 'Scale', '#a4de6c')
ON CONFLICT (name) DO NOTHING;

-- =============================================
-- COMMENTS FOR DOCUMENTATION
-- =============================================
COMMENT ON TABLE companies IS 'Core CRM entity representing business organizations';
COMMENT ON TABLE contacts IS 'Individual people associated with companies';
COMMENT ON TABLE leads IS 'Sales opportunities tracking through pipeline stages';
COMMENT ON TABLE interactions IS 'Activity log for all customer interactions';
COMMENT ON TABLE industries IS 'Industry classification master data';

COMMENT ON COLUMN companies.owner_id IS 'Sales rep/user responsible for this company';
COMMENT ON COLUMN leads.probability IS 'Win probability percentage (0-100)';
COMMENT ON COLUMN interactions.is_task IS 'Whether this interaction is a future task/reminder';
