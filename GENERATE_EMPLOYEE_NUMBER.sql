-- Automatic Employee Number Generation
-- Generates unique employee numbers in format: EMP-0001, EMP-0002, etc.

-- Function to generate next employee number
-- This function is also exposed as RPC for manual generation
CREATE OR REPLACE FUNCTION generate_employee_number()
RETURNS TEXT AS $$
DECLARE
  next_number INTEGER;
  employee_number TEXT;
BEGIN
  -- Get the highest current employee number
  SELECT COALESCE(
    MAX(
      CASE 
        WHEN employee_number ~ '^EMP-[0-9]+$' 
        THEN CAST(SUBSTRING(employee_number FROM 5) AS INTEGER)
        ELSE 0
      END
    ), 0
  ) + 1
  INTO next_number
  FROM profiles
  WHERE employee_number IS NOT NULL;
  
  -- Format as EMP-0001, EMP-0002, etc.
  employee_number := 'EMP-' || LPAD(next_number::TEXT, 4, '0');
  
  RETURN employee_number;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users (HR can call this)
GRANT EXECUTE ON FUNCTION generate_employee_number() TO authenticated;

-- Trigger function to automatically set employee_number on insert
CREATE OR REPLACE FUNCTION set_employee_number()
RETURNS TRIGGER AS $$
BEGIN
  -- Only generate if employee_number is NULL and user has employee/hr/manager role
  IF NEW.employee_number IS NULL AND NEW.role IN ('medewerker', 'hr', 'manager') THEN
    NEW.employee_number := generate_employee_number();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_set_employee_number ON profiles;

-- Create trigger that fires before insert
CREATE TRIGGER trigger_set_employee_number
  BEFORE INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION set_employee_number();

-- Backfill existing employees without employee numbers
UPDATE profiles
SET employee_number = generate_employee_number()
WHERE employee_number IS NULL 
  AND role IN ('medewerker', 'hr', 'manager', 'super_admin')
  AND id IN (
    SELECT id FROM profiles 
    WHERE employee_number IS NULL 
    AND role IN ('medewerker', 'hr', 'manager', 'super_admin')
    ORDER BY created_at
  );

COMMENT ON FUNCTION generate_employee_number() IS 'Generates next available employee number in format EMP-0001';
COMMENT ON FUNCTION set_employee_number() IS 'Trigger function to automatically assign employee numbers to new employees';
