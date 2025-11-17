-- Add must_change_password column to profiles table
ALTER TABLE public.profiles
ADD COLUMN must_change_password boolean DEFAULT false;

-- Update the handle_new_user function to set must_change_password to true for new users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (id, voornaam, achternaam, email, must_change_password)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'voornaam', ''),
    COALESCE(NEW.raw_user_meta_data->>'achternaam', ''),
    NEW.email,
    COALESCE((NEW.raw_user_meta_data->>'must_change_password')::boolean, false)
  );
  RETURN NEW;
END;
$$;