-- Fix missing profile rows:
--   1. Add INSERT RLS policy so authenticated users can create their own profile row (fallback/upsert)
--   2. Create auth trigger so new sign-ups automatically get a profile row
--   3. Backfill profile rows for any existing auth users who don't have one

-- 1. INSERT policy so upsert({onConflict:'id'}) works even if no row exists yet
CREATE POLICY "insert_own_profile" ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = id);

-- 2. Attach handle_new_user to auth.users so future sign-ups get a row
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE handle_new_user();

-- 3. Backfill missing profile rows for existing users
INSERT INTO public.profiles (id, email, role)
SELECT u.id, u.email, 'SUPPORT'
FROM auth.users u
WHERE u.id NOT IN (SELECT id FROM public.profiles)
ON CONFLICT (id) DO NOTHING;
