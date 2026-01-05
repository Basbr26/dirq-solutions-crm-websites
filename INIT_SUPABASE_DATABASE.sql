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

-- Enable RLS on profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "HR can view all profiles" ON profiles;
DROP POLICY IF EXISTS "HR can update all profiles" ON profiles;
DROP POLICY IF EXISTS "Managers can view team profiles" ON profiles;

-- Create RLS policies
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "HR can view all profiles" ON profiles
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('hr', 'super_admin'))
  );

CREATE POLICY "HR can update all profiles" ON profiles
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('hr', 'super_admin'))
  );

CREATE POLICY "Managers can view team profiles" ON profiles
  FOR SELECT USING (
    manager_id = auth.uid() OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('hr', 'manager', 'super_admin'))
  );

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
-- SUCCESS! Database initialized.
-- Next steps:
-- 1. Create your first user via Supabase Auth
-- 2. Set their role to 'super_admin' in profiles table
-- 3. Start using the CRM!
-- ============================================================
