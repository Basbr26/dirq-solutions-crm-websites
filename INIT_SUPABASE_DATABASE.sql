-- ============================================================
-- DIRQ CRM - DATABASE INITIALIZATION SCRIPT
-- ============================================================
-- Run this script in Supabase SQL Editor to initialize the CRM database
-- Go to: https://supabase.com/dashboard/project/pdqdrdddgbiiktcwdslv/editor
-- Steps: SQL Editor → New Query → Paste this entire file → Run
-- ============================================================

-- IMPORTANT: This script is idempotent (safe to run multiple times)

-- ============================================================
-- Step 1: Helper Functions
-- ============================================================

-- Update timestamp function (used by all tables)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- Step 2: Profiles Table (Base User Entity)
-- ============================================================

-- Ensure profiles table exists (should be created by Supabase Auth)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(255) UNIQUE,
  full_name VARCHAR(255),
  role VARCHAR(50) DEFAULT 'employee' CHECK (role IN ('employee', 'manager', 'hr', 'super_admin')),
  employee_number VARCHAR(50) UNIQUE,
  department_id UUID,
  manager_id UUID REFERENCES profiles(id),
  birth_date DATE,
  hire_date DATE,
  phone VARCHAR(50),
  emergency_contact_name VARCHAR(255),
  emergency_contact_phone VARCHAR(50),
  address TEXT,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended', 'terminated')),
  is_active BOOLEAN DEFAULT TRUE,
  avatar_url TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add missing columns if table already exists
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'full_name') THEN
    ALTER TABLE profiles ADD COLUMN full_name VARCHAR(255);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'role') THEN
    ALTER TABLE profiles ADD COLUMN role VARCHAR(50) DEFAULT 'employee';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'metadata') THEN
    ALTER TABLE profiles ADD COLUMN metadata JSONB DEFAULT '{}'::jsonb;
  END IF;
END $$;

-- Helper function to check user role (SECURITY DEFINER to bypass RLS)
CREATE OR REPLACE FUNCTION public.user_role()
RETURNS TEXT AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Enable RLS on profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;
DROP POLICY IF EXISTS "Service role can insert profiles" ON profiles;

-- Create RLS policies (simple - no function calls to avoid recursion on profiles table)
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- INSERT policy for auto-creation
CREATE POLICY "Service role can insert profiles" ON profiles
  FOR INSERT WITH CHECK (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_status ON profiles(status);

-- Updated_at trigger
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    'employee'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- Step 3: CRM Core Tables
-- ============================================================

-- Drop existing tables (clean slate)
DROP TABLE IF EXISTS quote_line_items CASCADE;
DROP TABLE IF EXISTS quotes CASCADE;
DROP TABLE IF EXISTS projects CASCADE;
DROP TABLE IF EXISTS interactions CASCADE;
DROP TABLE IF EXISTS leads CASCADE;
DROP TABLE IF EXISTS contacts CASCADE;
DROP TABLE IF EXISTS companies CASCADE;
DROP TABLE IF EXISTS industries CASCADE;

-- INDUSTRIES TABLE (Master Data)
CREATE TABLE industries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  icon TEXT,
  color TEXT DEFAULT '#0088FE',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

DROP TRIGGER IF EXISTS update_industries_updated_at ON industries;
CREATE TRIGGER update_industries_updated_at
  BEFORE UPDATE ON industries
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- COMPANIES TABLE (Core CRM Entity)
CREATE TABLE companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  industry_id UUID REFERENCES industries(id) ON DELETE SET NULL,
  website TEXT,
  phone TEXT,
  email TEXT,
  address JSONB DEFAULT '{}'::jsonb,
  company_size TEXT CHECK (company_size IN ('1-10', '11-50', '51-200', '201-500', '501+')),
  annual_revenue DECIMAL(15,2),
  status TEXT NOT NULL DEFAULT 'prospect' CHECK (status IN ('prospect', 'active', 'inactive', 'churned')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  owner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  notes TEXT,
  tags TEXT[] DEFAULT '{}',
  custom_fields JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_contact_date TIMESTAMPTZ
);

CREATE INDEX idx_companies_owner_id ON companies(owner_id);
CREATE INDEX idx_companies_industry_id ON companies(industry_id);
CREATE INDEX idx_companies_status ON companies(status);

DROP TRIGGER IF EXISTS update_companies_updated_at ON companies;
CREATE TRIGGER update_companies_updated_at
  BEFORE UPDATE ON companies
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- CONTACTS TABLE
CREATE TABLE contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  mobile TEXT,
  position TEXT,
  department TEXT,
  linkedin_url TEXT,
  is_primary BOOLEAN DEFAULT false,
  is_decision_maker BOOLEAN DEFAULT false,
  owner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  notes TEXT,
  tags TEXT[] DEFAULT '{}',
  custom_fields JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_contact_date TIMESTAMPTZ
);

CREATE INDEX idx_contacts_company_id ON contacts(company_id);
CREATE INDEX idx_contacts_owner_id ON contacts(owner_id);
CREATE INDEX idx_contacts_email ON contacts(email);

CREATE TRIGGER update_contacts_updated_at
  BEFORE UPDATE ON contacts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- LEADS TABLE
CREATE TABLE leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  value DECIMAL(15,2),
  currency TEXT DEFAULT 'EUR',
  stage TEXT NOT NULL DEFAULT 'new' CHECK (stage IN ('new', 'qualified', 'proposal', 'negotiation', 'closed_won', 'closed_lost')),
  probability INTEGER DEFAULT 0 CHECK (probability BETWEEN 0 AND 100),
  expected_close_date DATE,
  actual_close_date DATE,
  lost_reason TEXT,
  won_notes TEXT,
  owner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  source TEXT,
  tags TEXT[] DEFAULT '{}',
  custom_fields JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  stage_changed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_leads_company_id ON leads(company_id);
CREATE INDEX idx_leads_contact_id ON leads(contact_id);
CREATE INDEX idx_leads_owner_id ON leads(owner_id);
CREATE INDEX idx_leads_stage ON leads(stage);

CREATE TRIGGER update_leads_updated_at
  BEFORE UPDATE ON leads
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- INTERACTIONS TABLE
CREATE TABLE interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('call', 'email', 'meeting', 'note', 'task', 'demo')),
  direction TEXT CHECK (direction IN ('inbound', 'outbound')),
  subject TEXT NOT NULL,
  description TEXT,
  duration_minutes INTEGER,
  scheduled_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  is_task BOOLEAN DEFAULT false,
  task_status TEXT CHECK (task_status IN ('pending', 'completed', 'cancelled')),
  due_date DATE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  attachments TEXT[],
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_interactions_company_id ON interactions(company_id);
CREATE INDEX idx_interactions_user_id ON interactions(user_id);
CREATE INDEX idx_interactions_created_at ON interactions(created_at DESC);

CREATE TRIGGER update_interactions_updated_at
  BEFORE UPDATE ON interactions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- PROJECTS TABLE (Website Development Projects)
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  project_type TEXT CHECK (project_type IN ('landing_page', 'corporate_website', 'ecommerce', 'web_app', 'blog', 'portfolio', 'custom')),
  website_url TEXT,
  number_of_pages INTEGER,
  features TEXT[],
  hosting_included BOOLEAN DEFAULT false,
  maintenance_contract BOOLEAN DEFAULT false,
  launch_date DATE,
  stage TEXT NOT NULL DEFAULT 'lead' CHECK (stage IN ('lead', 'quote_requested', 'quote_sent', 'negotiation', 'quote_signed', 'in_development', 'review', 'live', 'maintenance', 'lost')),
  value DECIMAL(15,2) NOT NULL DEFAULT 0,
  probability INTEGER DEFAULT 0 CHECK (probability BETWEEN 0 AND 100),
  expected_close_date DATE,
  owner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  notes TEXT,
  tags TEXT[] DEFAULT '{}',
  custom_fields JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_projects_company_id ON projects(company_id);
CREATE INDEX idx_projects_owner_id ON projects(owner_id);
CREATE INDEX idx_projects_stage ON projects(stage);

CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- QUOTES TABLE (Project Quotes/Proposals)
CREATE TABLE IF NOT EXISTS quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_number TEXT UNIQUE NOT NULL,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'accepted', 'declined', 'expired')),
  valid_until DATE,
  subtotal DECIMAL(15,2) NOT NULL DEFAULT 0,
  tax_rate DECIMAL(5,2) DEFAULT 21.00,
  tax_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
  total_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
  owner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  notes TEXT,
  terms_and_conditions TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  sent_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ
);

CREATE INDEX idx_quotes_company_id ON quotes(company_id);
CREATE INDEX idx_quotes_owner_id ON quotes(owner_id);
CREATE INDEX idx_quotes_status ON quotes(status);
CREATE INDEX idx_quotes_quote_number ON quotes(quote_number);

CREATE TRIGGER update_quotes_updated_at
  BEFORE UPDATE ON quotes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- QUOTE LINE ITEMS TABLE
CREATE TABLE IF NOT EXISTS quote_line_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price DECIMAL(15,2) NOT NULL,
  total_price DECIMAL(15,2) NOT NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_quote_line_items_quote_id ON quote_line_items(quote_id);

-- ============================================================
-- Step 4: Seed Initial Data
-- ============================================================

INSERT INTO industries (name, description, icon, color) VALUES
  ('Technology', 'Software, IT Services, SaaS', 'Laptop', '#0088FE'),
  ('Finance', 'Banking, Insurance, Investment', 'DollarSign', '#00C49F'),
  ('Healthcare', 'Medical, Pharmaceutical', 'Heart', '#FF8042'),
  ('Retail', 'E-commerce, Physical Stores', 'ShoppingCart', '#FFBB28'),
  ('Manufacturing', 'Production, Industrial', 'Factory', '#8884D8'),
  ('Real Estate', 'Property Management', 'Building2', '#82ca9d'),
  ('Education', 'Schools, Training, E-learning', 'GraduationCap', '#ffc658'),
  ('Consulting', 'Business Consulting', 'Briefcase', '#8dd1e1'),
  ('Marketing', 'Advertising, Digital Marketing', 'Megaphone', '#d084d8'),
  ('Legal', 'Law Firms, Legal Services', 'Scale', '#a4de6c')
ON CONFLICT (name) DO NOTHING;

-- ============================================================
-- Step 5: RLS Policies for New Tables
-- ============================================================

-- PROJECTS RLS
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view projects" ON projects
  FOR SELECT USING (
    owner_id = auth.uid() OR
    public.user_role() IN ('super_admin', 'ADMIN', 'MANAGER')
  );

CREATE POLICY "Users can create projects" ON projects
  FOR INSERT WITH CHECK (
    public.user_role() IN ('super_admin', 'ADMIN', 'SALES', 'MANAGER')
  );

CREATE POLICY "Users can update own projects" ON projects
  FOR UPDATE USING (
    owner_id = auth.uid() OR
    public.user_role() IN ('super_admin', 'ADMIN', 'MANAGER')
  );

-- QUOTES RLS
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view quotes" ON quotes
  FOR SELECT USING (
    owner_id = auth.uid() OR
    public.user_role() IN ('super_admin', 'ADMIN', 'MANAGER')
  );

CREATE POLICY "Users can create quotes" ON quotes
  FOR INSERT WITH CHECK (
    public.user_role() IN ('super_admin', 'ADMIN', 'SALES', 'MANAGER')
  );

CREATE POLICY "Users can update own quotes" ON quotes
  FOR UPDATE USING (
    owner_id = auth.uid() OR
    public.user_role() IN ('super_admin', 'ADMIN', 'MANAGER')
  );

-- QUOTE LINE ITEMS RLS
ALTER TABLE quote_line_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view line items" ON quote_line_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM quotes
      WHERE quotes.id = quote_line_items.quote_id
      AND (quotes.owner_id = auth.uid() OR 
           public.user_role() IN ('super_admin', 'ADMIN', 'MANAGER'))
    )
  );

CREATE POLICY "Users can manage line items" ON quote_line_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM quotes
      WHERE quotes.id = quote_line_items.quote_id
      AND (quotes.owner_id = auth.uid() OR 
           public.user_role() IN ('super_admin', 'ADMIN', 'MANAGER'))
    )
  );

-- INTERACTIONS RLS
ALTER TABLE interactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view interactions" ON interactions
  FOR SELECT USING (
    user_id = auth.uid() OR
    public.user_role() IN ('super_admin', 'ADMIN', 'MANAGER')
  );

CREATE POLICY "Users can create interactions" ON interactions
  FOR INSERT WITH CHECK (
    public.user_role() IN ('super_admin', 'ADMIN', 'SALES', 'MANAGER', 'SUPPORT')
  );

CREATE POLICY "Users can update own interactions" ON interactions
  FOR UPDATE USING (
    user_id = auth.uid() OR
    public.user_role() IN ('super_admin', 'ADMIN', 'MANAGER')
  );

-- COMPANIES RLS
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view companies" ON companies
  FOR SELECT USING (
    owner_id = auth.uid() OR
    public.user_role() IN ('super_admin', 'ADMIN', 'MANAGER', 'SUPPORT')
  );

CREATE POLICY "Users can create companies" ON companies
  FOR INSERT WITH CHECK (
    public.user_role() IN ('super_admin', 'ADMIN', 'SALES', 'MANAGER')
  );

CREATE POLICY "Users can update companies" ON companies
  FOR UPDATE USING (
    owner_id = auth.uid() OR
    public.user_role() IN ('super_admin', 'ADMIN', 'MANAGER')
  );

-- CONTACTS RLS
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view contacts" ON contacts
  FOR SELECT USING (
    owner_id = auth.uid() OR
    public.user_role() IN ('super_admin', 'ADMIN', 'MANAGER', 'SUPPORT')
  );

CREATE POLICY "Users can create contacts" ON contacts
  FOR INSERT WITH CHECK (
    public.user_role() IN ('super_admin', 'ADMIN', 'SALES', 'MANAGER')
  );

CREATE POLICY "Users can update contacts" ON contacts
  FOR UPDATE USING (
    owner_id = auth.uid() OR
    public.user_role() IN ('super_admin', 'ADMIN', 'MANAGER')
  );

-- LEADS RLS
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view leads" ON leads
  FOR SELECT USING (
    owner_id = auth.uid() OR
    public.user_role() IN ('super_admin', 'ADMIN', 'MANAGER')
  );

CREATE POLICY "Users can create leads" ON leads
  FOR INSERT WITH CHECK (
    public.user_role() IN ('super_admin', 'ADMIN', 'SALES', 'MANAGER')
  );

CREATE POLICY "Users can update own leads" ON leads
  FOR UPDATE USING (
    owner_id = auth.uid() OR
    public.user_role() IN ('super_admin', 'ADMIN', 'MANAGER')
  );

-- INDUSTRIES (public read)
ALTER TABLE industries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view industries" ON industries
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage industries" ON industries
  FOR ALL USING (
    public.user_role() IN ('super_admin', 'ADMIN')
  );

-- ============================================================
-- SUCCESS! Database initialized.
-- Next steps:
-- 1. Run this ENTIRE script in Supabase SQL Editor
-- 2. Create your first user via Supabase Authentication
-- 3. Update user role: UPDATE profiles SET role = 'super_admin' WHERE email = 'your@email.com';
-- 4. Refresh your CRM application
-- ============================================================

