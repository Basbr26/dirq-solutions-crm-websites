-- Employee Status System & Auto Account Creation
-- Adds employment statuses and auto-creates auth accounts

-- 1. Add employment_status enum type
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'employment_status') THEN
        CREATE TYPE employment_status AS ENUM (
            'aanbieding_verstuurd',  -- Offer letter sent
            'aanbieding_geaccepteerd', -- Offer accepted
            'in_dienst',             -- Active employee
            'proeftijd',             -- Probation period
            'tijdelijk_contract',    -- Temporary contract
            'vast_contract',         -- Permanent contract
            'uitdienst_aangevraagd', -- Notice given
            'uitdienst'              -- Left company
        );
    END IF;
END $$;

-- 2. Modify profiles table to use enum
-- Simple approach: backup data, drop column, recreate with enum
DO $$
BEGIN
    -- Check if column exists
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' 
        AND column_name = 'employment_status'
    ) THEN
        -- Create temp backup column if it has data
        ALTER TABLE profiles ADD COLUMN IF NOT EXISTS employment_status_backup text;
        UPDATE profiles SET employment_status_backup = employment_status::text WHERE employment_status IS NOT NULL;
        
        -- Drop old column completely
        ALTER TABLE profiles DROP COLUMN employment_status;
    END IF;
    
    -- Add new column with enum type
    ALTER TABLE profiles ADD COLUMN employment_status employment_status DEFAULT 'in_dienst'::employment_status;
    
    -- Restore data from backup if exists
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' 
        AND column_name = 'employment_status_backup'
    ) THEN
        UPDATE profiles 
        SET employment_status = CASE employment_status_backup
            WHEN 'actief' THEN 'in_dienst'::employment_status
            WHEN 'inactief' THEN 'uitdienst'::employment_status
            ELSE 'in_dienst'::employment_status
        END
        WHERE employment_status_backup IS NOT NULL;
        
        -- Drop backup column
        ALTER TABLE profiles DROP COLUMN employment_status_backup;
    END IF;
END $$;

-- 3. Add invitation/onboarding tracking columns
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS invitation_sent_at TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS invitation_accepted_at TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS temporary_password TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN DEFAULT TRUE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS start_date DATE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS end_date DATE;

-- 4. Function to create employee with auto auth account
CREATE OR REPLACE FUNCTION create_employee_with_account(
  p_email TEXT,
  p_voornaam TEXT,
  p_achternaam TEXT,
  p_role TEXT DEFAULT 'medewerker',
  p_employment_status employment_status DEFAULT 'aanbieding_verstuurd',
  p_functie TEXT DEFAULT NULL,
  p_department_id UUID DEFAULT NULL,
  p_manager_id UUID DEFAULT NULL,
  p_date_of_birth DATE DEFAULT NULL,
  p_start_date DATE DEFAULT NULL,
  p_contract_type TEXT DEFAULT NULL,
  p_hours_per_week NUMERIC DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  v_user_id UUID;
  v_employee_number TEXT;
  v_temp_password TEXT;
  v_result JSON;
BEGIN
  -- Generate temporary password (16 char random)
  v_temp_password := SUBSTRING(MD5(RANDOM()::TEXT || CLOCK_TIMESTAMP()::TEXT) FROM 1 FOR 16);
  
  -- Generate employee number
  v_employee_number := generate_employee_number();
  
  -- Create auth user (this will trigger profile creation via trigger)
  -- Note: This requires Supabase service role key to execute
  -- In practice, this should be called from a server-side function or edge function
  
  -- For now, we'll create the profile entry directly and rely on manual auth user creation
  -- Or use Supabase Admin API from backend
  
  -- Insert profile (user_id will be set by trigger when auth account is created)
  INSERT INTO profiles (
    email,
    voornaam,
    achternaam,
    role,
    employment_status,
    employee_number,
    functie,
    department_id,
    manager_id,
    date_of_birth,
    start_date,
    contract_type,
    hours_per_week,
    temporary_password,
    must_change_password,
    invitation_sent_at
  ) VALUES (
    p_email,
    p_voornaam,
    p_achternaam,
    p_role,
    p_employment_status,
    v_employee_number,
    p_functie,
    p_department_id,
    p_manager_id,
    p_date_of_birth,
    p_start_date,
    p_contract_type,
    p_hours_per_week,
    v_temp_password,
    TRUE,
    NOW()
  ) RETURNING id INTO v_user_id;
  
  -- Return result with temp password
  v_result := json_build_object(
    'user_id', v_user_id,
    'employee_number', v_employee_number,
    'email', p_email,
    'temporary_password', v_temp_password,
    'message', 'Employee profile created. Auth account must be created via Supabase Admin API.'
  );
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute to authenticated users (HR role should have access)
GRANT EXECUTE ON FUNCTION create_employee_with_account TO authenticated;

-- 5. Add comments
COMMENT ON TYPE employment_status IS 'Employee lifecycle statuses from offer to termination';
COMMENT ON COLUMN profiles.invitation_sent_at IS 'When invitation email was sent to employee';
COMMENT ON COLUMN profiles.invitation_accepted_at IS 'When employee first logged in and accepted invitation';
COMMENT ON COLUMN profiles.temporary_password IS 'Temporary password for first login (encrypted in production)';
COMMENT ON COLUMN profiles.must_change_password IS 'Force password change on next login';
COMMENT ON COLUMN profiles.start_date IS 'Official employment start date';
COMMENT ON COLUMN profiles.end_date IS 'Employment end date (for contracts/termination)';

-- 6. Create index for status queries
CREATE INDEX IF NOT EXISTS idx_profiles_employment_status ON profiles(employment_status);

-- 7. Update existing employees to 'in_dienst' if currently NULL
UPDATE profiles 
SET employment_status = 'in_dienst'
WHERE employment_status IS NULL;
