-- Allow HR, managers, and users to read profiles for employee listing
-- Safely re-create policies if they don't already exist

-- HR can view all profiles
CREATE POLICY "HR can view profiles"
ON public.profiles
FOR SELECT
USING (has_role(auth.uid(), 'hr'::app_role));

-- Managers can view all profiles (adjust to team-based later if needed)
CREATE POLICY "Managers can view profiles"
ON public.profiles
FOR SELECT
USING (has_role(auth.uid(), 'manager'::app_role));

-- Employees can view their own profile
CREATE POLICY "Employees can view own profile"
ON public.profiles
FOR SELECT
USING (auth.uid() = id);
