-- ============================================================
-- 🔧 PRE-REQUISITE: PROFILES TABLE SETUP
-- ============================================================
-- Run this FIRST before any other migrations!
-- This ensures the profiles table has all required columns
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

-- Add full_name if missing
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'full_name') THEN
    ALTER TABLE profiles ADD COLUMN full_name VARCHAR(255);
  END IF;
END $$;

-- Add missing columns if table already exists
DO $$ 
BEGIN
  -- Add role column if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'role') THEN
    ALTER TABLE profiles ADD COLUMN role VARCHAR(50) DEFAULT 'employee' CHECK (role IN ('employee', 'manager', 'hr', 'super_admin'));
  END IF;
  
  -- Add employee_number if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'employee_number') THEN
    ALTER TABLE profiles ADD COLUMN employee_number VARCHAR(50) UNIQUE;
  END IF;
  
  -- Add department_id if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'department_id') THEN
    ALTER TABLE profiles ADD COLUMN department_id UUID;
  END IF;
  
  -- Add manager_id if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'manager_id') THEN
    ALTER TABLE profiles ADD COLUMN manager_id UUID REFERENCES profiles(id);
  END IF;
  
  -- Add birth_date if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'birth_date') THEN
    ALTER TABLE profiles ADD COLUMN birth_date DATE;
  END IF;
  
  -- Add hire_date if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'hire_date') THEN
    ALTER TABLE profiles ADD COLUMN hire_date DATE;
  END IF;
  
  -- Add phone if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'phone') THEN
    ALTER TABLE profiles ADD COLUMN phone VARCHAR(50);
  END IF;
  
  -- Add status if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'status') THEN
    ALTER TABLE profiles ADD COLUMN status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended', 'terminated'));
  END IF;
  
  -- Add is_active if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'is_active') THEN
    ALTER TABLE profiles ADD COLUMN is_active BOOLEAN DEFAULT TRUE;
  END IF;
  
  -- Add avatar_url if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'avatar_url') THEN
    ALTER TABLE profiles ADD COLUMN avatar_url TEXT;
  END IF;
  
  -- Add metadata if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'metadata') THEN
    ALTER TABLE profiles ADD COLUMN metadata JSONB DEFAULT '{}'::jsonb;
  END IF;
  
  -- Add emergency contact fields if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'emergency_contact_name') THEN
    ALTER TABLE profiles ADD COLUMN emergency_contact_name VARCHAR(255);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'emergency_contact_phone') THEN
    ALTER TABLE profiles ADD COLUMN emergency_contact_phone VARCHAR(50);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'address') THEN
    ALTER TABLE profiles ADD COLUMN address TEXT;
  END IF;
END $$;

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
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
CREATE INDEX IF NOT EXISTS idx_profiles_department ON profiles(department_id);
CREATE INDEX IF NOT EXISTS idx_profiles_manager ON profiles(manager_id);
CREATE INDEX IF NOT EXISTS idx_profiles_employee_number ON profiles(employee_number);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_status ON profiles(status);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

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

COMMENT ON TABLE profiles IS 'User profiles with role-based access control';
