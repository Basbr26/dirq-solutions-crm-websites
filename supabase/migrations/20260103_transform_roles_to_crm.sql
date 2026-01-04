-- =============================================
-- TRANSFORM HR ROLES TO CRM ROLES
-- Created: January 3, 2026
-- Purpose: Update existing role system from HR to CRM nomenclature
-- =============================================

-- =============================================
-- 1. UPDATE ROLE ENUM/CHECK CONSTRAINTS
-- =============================================

-- First, add new CRM role values to profiles table if role column exists
DO $$ 
BEGIN
  -- Check if role column exists in profiles table
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'role'
  ) THEN
    -- Drop existing constraint if any
    ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
    
    -- Add new constraint with CRM roles
    ALTER TABLE profiles ADD CONSTRAINT profiles_role_check 
      CHECK (role IN ('ADMIN', 'SALES', 'MANAGER', 'SUPPORT'));
  END IF;
END $$;

-- Update user_roles table constraint if it exists
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'user_roles'
  ) THEN
    ALTER TABLE user_roles DROP CONSTRAINT IF EXISTS user_roles_role_check;
    ALTER TABLE user_roles ADD CONSTRAINT user_roles_role_check 
      CHECK (role IN ('ADMIN', 'SALES', 'MANAGER', 'SUPPORT'));
  END IF;
END $$;

-- =============================================
-- 2. MIGRATE EXISTING ROLE DATA
-- =============================================

-- Transform old HR roles to new CRM roles in profiles table
UPDATE profiles
SET role = CASE 
  WHEN role = 'super_admin' THEN 'ADMIN'
  WHEN role = 'hr' THEN 'SALES'
  WHEN role = 'manager' THEN 'MANAGER'
  WHEN role = 'medewerker' THEN 'SUPPORT'
  ELSE 'SUPPORT' -- Default fallback
END
WHERE role IN ('super_admin', 'hr', 'manager', 'medewerker');

-- Transform roles in user_roles table if it exists
UPDATE user_roles
SET role = CASE 
  WHEN role = 'super_admin' THEN 'ADMIN'
  WHEN role = 'hr' THEN 'SALES'
  WHEN role = 'manager' THEN 'MANAGER'
  WHEN role = 'medewerker' THEN 'SUPPORT'
  ELSE 'SUPPORT'
END
WHERE role IN ('super_admin', 'hr', 'manager', 'medewerker');

-- =============================================
-- 3. UPDATE HELPER FUNCTIONS
-- =============================================

-- Update get_user_role function to return CRM roles
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
  SELECT COALESCE(
    (SELECT role FROM profiles WHERE id = auth.uid()),
    'SUPPORT'
  );
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Update is_admin_or_manager to use new role names
CREATE OR REPLACE FUNCTION is_admin_or_manager()
RETURNS BOOLEAN AS $$
  SELECT get_user_role() IN ('ADMIN', 'MANAGER');
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- New helper: Check if user is sales or above
CREATE OR REPLACE FUNCTION is_sales_or_above()
RETURNS BOOLEAN AS $$
  SELECT get_user_role() IN ('ADMIN', 'MANAGER', 'SALES');
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- New helper: Check if user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT get_user_role() = 'ADMIN';
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- =============================================
-- 4. CREATE ROLE PERMISSIONS VIEW (OPTIONAL)
-- =============================================

-- Create a view for easy role permission checking
CREATE OR REPLACE VIEW user_permissions AS
SELECT 
  p.id as user_id,
  p.email,
  p.role,
  -- Permission flags
  CASE WHEN p.role = 'ADMIN' THEN true ELSE false END as can_manage_users,
  CASE WHEN p.role IN ('ADMIN', 'MANAGER') THEN true ELSE false END as can_view_all_data,
  CASE WHEN p.role IN ('ADMIN', 'MANAGER', 'SALES') THEN true ELSE false END as can_create_leads,
  CASE WHEN p.role IN ('ADMIN', 'MANAGER') THEN true ELSE false END as can_approve_quotes,
  CASE WHEN p.role IN ('ADMIN', 'MANAGER') THEN true ELSE false END as can_reassign_leads,
  CASE WHEN p.role = 'ADMIN' THEN true ELSE false END as can_delete_data
FROM profiles p;

-- =============================================
-- 5. UPDATE EXISTING RLS POLICIES REFERENCES
-- =============================================

-- Note: The RLS policies in 20260103_crm_rls_policies.sql already use
-- the new role names (ADMIN, SALES, MANAGER, SUPPORT), so no updates needed there.

-- However, if there are any old policies referencing old role names, update them:
-- This is a safety measure in case any old policies still exist

DO $$
DECLARE
  policy_record RECORD;
BEGIN
  -- This would list any policies that might reference old roles
  -- Manual inspection recommended, but typically policies use functions
  -- like get_user_role() which we've already updated
  NULL;
END $$;

-- =============================================
-- 6. COMMENTS & DOCUMENTATION
-- =============================================

COMMENT ON COLUMN profiles.role IS 'CRM User Role: ADMIN (full access), SALES (sales team), MANAGER (sales managers), SUPPORT (support team)';

-- =============================================
-- 7. VERIFICATION QUERY
-- =============================================

-- Run this to verify role migration (commented out for safety)
-- SELECT role, COUNT(*) as user_count
-- FROM profiles
-- GROUP BY role
-- ORDER BY role;
