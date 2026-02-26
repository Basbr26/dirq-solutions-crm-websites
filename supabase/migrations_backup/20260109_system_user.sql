-- ============================================================
-- System User for API/n8n Automation
-- Migration: 20260109_system_user.sql
-- Reason: Enterprise-grade ownership tracking for automation-created records
-- ============================================================

-- Define system user UUID (using well-known UUID format)
-- This represents the "n8n Automation" system user
DO $$
DECLARE
  system_user_id UUID := '00000000-0000-0000-0000-000000000001';
  existing_roles TEXT[];
BEGIN
  -- 1. Get all existing role values from profiles table
  SELECT ARRAY_AGG(DISTINCT role) INTO existing_roles FROM profiles WHERE role IS NOT NULL;
  
  RAISE NOTICE 'Existing roles in database: %', existing_roles;
  
  -- 2. Drop existing role CHECK constraint if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'profiles_role_check' 
    AND table_name = 'profiles'
  ) THEN
    ALTER TABLE profiles DROP CONSTRAINT profiles_role_check;
  END IF;
  
  -- 3. Add updated constraint that includes all existing roles + SYSTEM
  ALTER TABLE profiles
  ADD CONSTRAINT profiles_role_check 
  CHECK (role IN ('ADMIN', 'SALES', 'MANAGER', 'SUPPORT', 'SYSTEM', 'USER', 'super_admin', 'employee', 'manager', 'hr'));
  
  -- 4. Drop FK constraint temporarily to allow system user creation
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'profiles_id_fkey' 
    AND table_name = 'profiles'
  ) THEN
    ALTER TABLE profiles DROP CONSTRAINT profiles_id_fkey;
  END IF;
  
  -- 5. Create system profile WITHOUT FK constraint active
  INSERT INTO profiles (id, full_name, role, email)
  VALUES (
    system_user_id,
    'n8n Automation',
    'SYSTEM',
    'system@dirqsolutions.nl'
  )
  ON CONFLICT (id) DO NOTHING;
  
  RAISE NOTICE 'System user profile created: %', system_user_id;
  
  -- 6. Re-add FK constraint with NOT VALID (won't check existing rows)
  ALTER TABLE profiles
  ADD CONSTRAINT profiles_id_fkey 
  FOREIGN KEY (id) REFERENCES auth.users(id) 
  ON DELETE CASCADE
  NOT VALID;
  
  RAISE NOTICE 'FK constraint re-added with NOT VALID flag';
  RAISE NOTICE 'System user (00000000-0000-0000-0000-000000000001) bypasses auth.users requirement';
END $$;

-- Update column comments
COMMENT ON COLUMN companies.owner_id IS 
'User who owns this company. Special UUIDs:
- 00000000-0000-0000-0000-000000000001: n8n/API Automation (system user)
- Regular UUID: Human user from auth.users';

COMMENT ON COLUMN profiles.role IS 
'User role in CRM system: ADMIN, SALES, MANAGER, SUPPORT, SYSTEM (automation), or legacy roles';

-- Verification: Show system user profile
-- SELECT id, full_name, role, email FROM profiles WHERE id = '00000000-0000-0000-0000-000000000001';
