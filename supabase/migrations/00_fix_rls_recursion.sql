-- ============================================================
-- 🔧 FIX INFINITE RECURSION IN PROFILES RLS POLICIES
-- ============================================================

-- Drop all existing policies on profiles
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "HR can view all profiles" ON profiles;
DROP POLICY IF EXISTS "HR can insert profiles" ON profiles;
DROP POLICY IF EXISTS "HR can update all profiles" ON profiles;
DROP POLICY IF EXISTS "HR can delete profiles" ON profiles;
DROP POLICY IF EXISTS "Managers can view team profiles" ON profiles;
DROP POLICY IF EXISTS "Users see own events" ON calendar_events;
DROP POLICY IF EXISTS "Users create own events" ON calendar_events;
DROP POLICY IF EXISTS "Users update own events" ON calendar_events;
DROP POLICY IF EXISTS "Users delete own events" ON calendar_events;

-- Create a security definer function to check user role
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT AS $$
  SELECT COALESCE(
    (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()),
    'employee'
  )::text;
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Recreate policies WITHOUT self-referencing profiles table
CREATE POLICY "Users can view own profile" 
  ON profiles FOR SELECT 
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" 
  ON profiles FOR UPDATE 
  USING (auth.uid() = id);

CREATE POLICY "HR can view all profiles" 
  ON profiles FOR SELECT 
  USING (public.get_user_role() IN ('hr', 'super_admin'));

CREATE POLICY "HR can insert profiles" 
  ON profiles FOR INSERT 
  WITH CHECK (public.get_user_role() IN ('hr', 'super_admin'));

CREATE POLICY "HR can update all profiles" 
  ON profiles FOR UPDATE 
  USING (public.get_user_role() IN ('hr', 'super_admin'));

CREATE POLICY "HR can delete profiles" 
  ON profiles FOR DELETE 
  USING (public.get_user_role() IN ('super_admin'));

-- Recreate calendar policies
CREATE POLICY "Users see own events"
  ON calendar_events FOR SELECT
  USING (
    user_id = auth.uid() 
    OR is_private = FALSE
    OR auth.uid()::text = ANY(SELECT jsonb_array_elements_text(participants))
  );

CREATE POLICY "Users create own events"
  ON calendar_events FOR INSERT
  WITH CHECK (user_id = auth.uid() OR created_by = auth.uid());

CREATE POLICY "Users update own events"
  ON calendar_events FOR UPDATE
  USING (user_id = auth.uid() OR created_by = auth.uid());

CREATE POLICY "Users delete own events"
  ON calendar_events FOR DELETE
  USING (user_id = auth.uid() OR created_by = auth.uid());

COMMENT ON FUNCTION public.get_user_role() IS 'Returns the current user role from auth.users metadata - SECURITY DEFINER to avoid recursion';
