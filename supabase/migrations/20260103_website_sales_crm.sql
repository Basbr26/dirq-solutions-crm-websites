-- =============================================
-- WEBSITE SALES CRM - ADDITIONAL SCHEMA
-- Created: January 3, 2026
-- Purpose: Extend CRM for website development/sales business
-- New tables: quotes, projects (replaces generic leads)
-- =============================================

-- =============================================
-- 0. DROP EXISTING OBJECTS (if re-running)
-- =============================================
DO $$ 
BEGIN
  -- Drop triggers only if tables exist
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'quote_items') THEN
    DROP TRIGGER IF EXISTS update_quote_items_updated_at ON quote_items;
    DROP TRIGGER IF EXISTS update_quote_totals_trigger ON quote_items;
  END IF;
  
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'quotes') THEN
    DROP TRIGGER IF EXISTS update_quotes_updated_at ON quotes;
    DROP TRIGGER IF EXISTS quotes_audit_trigger ON quotes;
  END IF;
END $$;

-- Drop tables (will cascade drop triggers)
DROP TABLE IF EXISTS quote_items CASCADE;
DROP TABLE IF EXISTS quotes CASCADE;

-- =============================================
-- 1. RENAME LEADS TO PROJECTS (if exists)
-- =============================================
DO $$ 
BEGIN
  -- Only rename if 'leads' exists AND 'projects' does not exist
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'leads') 
     AND NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'projects') THEN
    ALTER TABLE leads RENAME TO projects;
  END IF;
END $$;

-- Add website-specific columns to projects (if table exists)
DO $$ 
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'projects') THEN
    ALTER TABLE projects ADD COLUMN IF NOT EXISTS project_type TEXT;
    ALTER TABLE projects ADD COLUMN IF NOT EXISTS website_url TEXT;
    ALTER TABLE projects ADD COLUMN IF NOT EXISTS number_of_pages INTEGER;
    ALTER TABLE projects ADD COLUMN IF NOT EXISTS features TEXT[];
    ALTER TABLE projects ADD COLUMN IF NOT EXISTS hosting_included BOOLEAN DEFAULT false;
    ALTER TABLE projects ADD COLUMN IF NOT EXISTS maintenance_contract BOOLEAN DEFAULT false;
    ALTER TABLE projects ADD COLUMN IF NOT EXISTS launch_date DATE;
    
    -- Drop old constraints
    ALTER TABLE projects DROP CONSTRAINT IF EXISTS leads_stage_check;
    ALTER TABLE projects DROP CONSTRAINT IF EXISTS projects_stage_check;
    ALTER TABLE projects DROP CONSTRAINT IF EXISTS projects_project_type_check;
  END IF;
END $$;

-- Add constraints (only if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'projects') THEN
    -- Only add project_type constraint if column exists
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'projects' AND column_name = 'project_type') THEN
      ALTER TABLE projects ADD CONSTRAINT projects_project_type_check CHECK (project_type IN (
        'landing_page',
        'corporate_website', 
        'ecommerce',
        'web_app',
        'blog',
        'portfolio',
        'custom'
      ));
    END IF;
    
    -- Only add stage constraint if column exists
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'projects' AND column_name = 'stage') THEN
      ALTER TABLE projects ADD CONSTRAINT projects_stage_check CHECK (stage IN (
        'lead',              -- Initial interest
        'quote_requested',   -- Client asked for quote
        'quote_sent',        -- Quote/proposal sent
        'negotiation',       -- Discussing terms
        'quote_signed',      -- Contract signed, ready to start
        'in_development',    -- Website being built
        'review',            -- Client reviewing/testing
        'live',              -- Website is live
        'maintenance',       -- Ongoing maintenance
        'lost'               -- Deal lost
      ));
    END IF;
  END IF;
END $$;

-- Rename indexes
DROP INDEX IF EXISTS idx_leads_company_id;
DROP INDEX IF EXISTS idx_leads_contact_id;
DROP INDEX IF EXISTS idx_leads_owner_id;
DROP INDEX IF EXISTS idx_leads_stage;
DROP INDEX IF EXISTS idx_leads_expected_close_date;

CREATE INDEX idx_projects_company_id ON projects(company_id);
CREATE INDEX idx_projects_contact_id ON projects(contact_id);
CREATE INDEX idx_projects_owner_id ON projects(owner_id);
CREATE INDEX idx_projects_stage ON projects(stage);
CREATE INDEX idx_projects_expected_close_date ON projects(expected_close_date);
CREATE INDEX idx_projects_project_type ON projects(project_type);
CREATE INDEX idx_projects_launch_date ON projects(launch_date);

-- Update triggers
DROP TRIGGER IF EXISTS update_leads_updated_at ON projects;
CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS track_lead_stage_change_trigger ON projects;
CREATE TRIGGER track_project_stage_change_trigger
  BEFORE UPDATE ON projects
  FOR EACH ROW
  EXECUTE FUNCTION track_lead_stage_change();

-- Update audit trigger
DROP TRIGGER IF EXISTS leads_audit_trigger ON projects;
CREATE TRIGGER projects_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON projects
  FOR EACH ROW EXECUTE FUNCTION crm_audit_trigger();

-- =============================================
-- 2. QUOTES/OFFERTES TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Relationships
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  
  -- Quote Details
  quote_number TEXT UNIQUE NOT NULL, -- e.g., "Q-2026-001"
  title TEXT NOT NULL,
  description TEXT,
  
  -- Financial
  subtotal DECIMAL(15,2) NOT NULL DEFAULT 0,
  tax_rate DECIMAL(5,2) DEFAULT 21.00, -- BTW percentage
  tax_amount DECIMAL(15,2) DEFAULT 0,
  total_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
  currency TEXT DEFAULT 'EUR',
  
  -- Status
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN (
    'draft',        -- Being prepared
    'sent',         -- Sent to client
    'viewed',       -- Client opened quote
    'accepted',     -- Client accepted
    'rejected',     -- Client rejected
    'expired'       -- Quote expired
  )),
  
  -- Dates
  valid_until DATE,
  sent_at TIMESTAMPTZ,
  viewed_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ,
  
  -- Payment terms
  payment_terms TEXT, -- e.g., "50% upfront, 50% on delivery"
  delivery_time TEXT, -- e.g., "6-8 weeks"
  
  -- Owner
  created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  
  -- Notes
  notes TEXT,
  client_notes TEXT, -- Internal notes about client feedback
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_quotes_company_id ON quotes(company_id);
CREATE INDEX idx_quotes_project_id ON quotes(project_id);
CREATE INDEX idx_quotes_status ON quotes(status);
CREATE INDEX idx_quotes_created_by ON quotes(created_by);
CREATE INDEX idx_quotes_quote_number ON quotes(quote_number);

-- Update trigger
CREATE TRIGGER update_quotes_updated_at
  BEFORE UPDATE ON quotes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Audit trigger
CREATE TRIGGER quotes_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON quotes
  FOR EACH ROW EXECUTE FUNCTION crm_audit_trigger();

-- =============================================
-- 3. QUOTE LINE ITEMS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS quote_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
  
  -- Item details
  item_order INTEGER NOT NULL DEFAULT 0,
  title TEXT NOT NULL,
  description TEXT,
  
  -- Pricing
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price DECIMAL(15,2) NOT NULL,
  total_price DECIMAL(15,2) NOT NULL,
  
  -- Category (optional grouping)
  category TEXT, -- e.g., "Design", "Development", "Content", "Hosting"
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_quote_items_quote_id ON quote_items(quote_id);
CREATE INDEX idx_quote_items_order ON quote_items(quote_id, item_order);

-- =============================================
-- 4. UPDATE INTERACTIONS FOR WEBSITE CONTEXT
-- =============================================
-- Add project_id reference to interactions
ALTER TABLE interactions ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_interactions_project_id ON interactions(project_id);

-- Add website-specific interaction types
ALTER TABLE interactions DROP CONSTRAINT IF EXISTS interactions_type_check;
ALTER TABLE interactions ADD CONSTRAINT interactions_type_check CHECK (type IN (
  'call',
  'email', 
  'meeting',
  'note',
  'task',
  'demo',
  'requirement_discussion',  -- NEW: Discussing website requirements
  'quote_presentation',       -- NEW: Presenting quote to client
  'review_session',           -- NEW: Client reviewing website
  'training'                  -- NEW: Client training on CMS
));

-- =============================================
-- 5. WEBSITE PROJECT TEMPLATES (Optional)
-- =============================================
CREATE TABLE IF NOT EXISTS project_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  project_type TEXT NOT NULL,
  description TEXT,
  
  -- Default pricing
  base_price DECIMAL(15,2),
  estimated_hours INTEGER,
  
  -- Default features
  default_features TEXT[],
  
  -- Template quote items (JSONB for flexibility)
  template_items JSONB DEFAULT '[]'::jsonb,
  
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_project_templates_type ON project_templates(project_type);
CREATE INDEX idx_project_templates_active ON project_templates(is_active);

-- Seed some templates
INSERT INTO project_templates (name, project_type, description, base_price, estimated_hours, default_features, template_items) VALUES
(
  'Basic Landing Page',
  'landing_page',
  'Single page website for marketing campaigns',
  2500.00,
  40,
  ARRAY['responsive_design', 'contact_form', 'seo_optimization'],
  '[
    {"title": "Design & Mockup", "quantity": 1, "unit_price": 800, "category": "Design"},
    {"title": "Development", "quantity": 1, "unit_price": 1200, "category": "Development"},
    {"title": "Content Integration", "quantity": 1, "unit_price": 300, "category": "Content"},
    {"title": "SEO Setup", "quantity": 1, "unit_price": 200, "category": "Marketing"}
  ]'::jsonb
),
(
  'Corporate Website (5-10 pages)',
  'corporate_website',
  'Professional corporate website with CMS',
  7500.00,
  120,
  ARRAY['responsive_design', 'cms', 'contact_form', 'blog', 'seo_optimization', 'analytics'],
  '[
    {"title": "Design & Branding", "quantity": 1, "unit_price": 2000, "category": "Design"},
    {"title": "Development (5-10 pages)", "quantity": 1, "unit_price": 3500, "category": "Development"},
    {"title": "CMS Integration", "quantity": 1, "unit_price": 1200, "category": "Development"},
    {"title": "Content Writing", "quantity": 8, "unit_price": 150, "category": "Content"},
    {"title": "SEO & Analytics Setup", "quantity": 1, "unit_price": 500, "category": "Marketing"},
    {"title": "Training & Documentation", "quantity": 1, "unit_price": 300, "category": "Support"}
  ]'::jsonb
),
(
  'E-commerce Website',
  'ecommerce',
  'Full-featured online store',
  15000.00,
  250,
  ARRAY['responsive_design', 'cms', 'payment_gateway', 'product_catalog', 'shopping_cart', 'seo_optimization', 'analytics'],
  '[
    {"title": "Design & UX", "quantity": 1, "unit_price": 3000, "category": "Design"},
    {"title": "E-commerce Development", "quantity": 1, "unit_price": 8000, "category": "Development"},
    {"title": "Payment Integration", "quantity": 1, "unit_price": 1500, "category": "Development"},
    {"title": "Product Setup (up to 50 products)", "quantity": 1, "unit_price": 1200, "category": "Content"},
    {"title": "SEO & Marketing Setup", "quantity": 1, "unit_price": 800, "category": "Marketing"},
    {"title": "Training & Documentation", "quantity": 1, "unit_price": 500, "category": "Support"}
  ]'::jsonb
)
ON CONFLICT DO NOTHING;

-- =============================================
-- 6. RLS POLICIES FOR NEW TABLES
-- =============================================

-- Enable RLS
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_templates ENABLE ROW LEVEL SECURITY;

-- Quotes policies (similar to projects)
CREATE POLICY "Quotes select policy"
  ON quotes FOR SELECT
  TO authenticated
  USING (
    is_admin_or_manager()
    OR created_by = auth.uid()
  );

CREATE POLICY "Quotes insert policy"
  ON quotes FOR INSERT
  TO authenticated
  WITH CHECK (
    get_user_role() IN ('ADMIN', 'SALES', 'MANAGER')
    AND created_by = auth.uid()
  );

CREATE POLICY "Quotes update policy"
  ON quotes FOR UPDATE
  TO authenticated
  USING (
    is_admin_or_manager()
    OR created_by = auth.uid()
  );

CREATE POLICY "Quotes delete policy"
  ON quotes FOR DELETE
  TO authenticated
  USING (is_admin_or_manager());

-- Quote items inherit quote permissions
CREATE POLICY "Quote items select policy"
  ON quote_items FOR SELECT
  TO authenticated
  USING (
    quote_id IN (
      SELECT id FROM quotes WHERE 
        is_admin_or_manager() OR created_by = auth.uid()
    )
  );

CREATE POLICY "Quote items modify policy"
  ON quote_items FOR ALL
  TO authenticated
  USING (
    quote_id IN (
      SELECT id FROM quotes WHERE 
        is_admin_or_manager() OR created_by = auth.uid()
    )
  );

-- Project templates are read-only for most users
CREATE POLICY "Project templates viewable by all authenticated"
  ON project_templates FOR SELECT
  TO authenticated
  USING (is_active = true OR is_admin_or_manager());

CREATE POLICY "Project templates manageable by admins"
  ON project_templates FOR ALL
  TO authenticated
  USING (get_user_role() = 'ADMIN')
  WITH CHECK (get_user_role() = 'ADMIN');

-- =============================================
-- 7. USEFUL FUNCTIONS
-- =============================================

-- Generate next quote number
CREATE OR REPLACE FUNCTION generate_quote_number()
RETURNS TEXT AS $$
DECLARE
  year TEXT;
  next_num INTEGER;
  quote_num TEXT;
BEGIN
  year := TO_CHAR(CURRENT_DATE, 'YYYY');
  
  SELECT COALESCE(MAX(
    CAST(SUBSTRING(quote_number FROM '\d+$') AS INTEGER)
  ), 0) + 1
  INTO next_num
  FROM quotes
  WHERE quote_number LIKE 'Q-' || year || '-%';
  
  quote_num := 'Q-' || year || '-' || LPAD(next_num::TEXT, 3, '0');
  
  RETURN quote_num;
END;
$$ LANGUAGE plpgsql;

-- Update quote totals when items change
CREATE OR REPLACE FUNCTION update_quote_totals()
RETURNS TRIGGER AS $$
DECLARE
  quote_subtotal DECIMAL(15,2);
  quote_tax_rate DECIMAL(5,2);
  quote_tax DECIMAL(15,2);
  quote_total DECIMAL(15,2);
BEGIN
  -- Get current tax rate
  SELECT tax_rate INTO quote_tax_rate
  FROM quotes
  WHERE id = COALESCE(NEW.quote_id, OLD.quote_id);
  
  -- Calculate new subtotal
  SELECT COALESCE(SUM(total_price), 0)
  INTO quote_subtotal
  FROM quote_items
  WHERE quote_id = COALESCE(NEW.quote_id, OLD.quote_id);
  
  -- Calculate tax and total
  quote_tax := quote_subtotal * (quote_tax_rate / 100);
  quote_total := quote_subtotal + quote_tax;
  
  -- Update quote
  UPDATE quotes
  SET 
    subtotal = quote_subtotal,
    tax_amount = quote_tax,
    total_amount = quote_total,
    updated_at = NOW()
  WHERE id = COALESCE(NEW.quote_id, OLD.quote_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_quote_totals_trigger
  AFTER INSERT OR UPDATE OR DELETE ON quote_items
  FOR EACH ROW
  EXECUTE FUNCTION update_quote_totals();

-- =============================================
-- COMMENTS
-- =============================================
COMMENT ON TABLE projects IS 'Website projects/leads in the sales pipeline';
COMMENT ON TABLE quotes IS 'Price quotes/proposals for website projects';
COMMENT ON TABLE quote_items IS 'Line items within quotes (services, features, etc.)';
COMMENT ON TABLE project_templates IS 'Reusable templates for common website projects';

COMMENT ON COLUMN projects.project_type IS 'Type of website project';
COMMENT ON COLUMN projects.stage IS 'Current stage in website sales funnel';
COMMENT ON COLUMN quotes.quote_number IS 'Unique quote identifier (e.g., Q-2026-001)';
COMMENT ON COLUMN quotes.status IS 'Current status of the quote';
