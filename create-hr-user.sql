-- =====================================================
-- CREATE HR USER: basbrouwer26@gmail.com
-- =====================================================
-- Run this in Supabase SQL Editor

DO $$
DECLARE
  new_user_id UUID;
BEGIN
  new_user_id := gen_random_uuid();
  
  INSERT INTO auth.users (
    id,
    instance_id,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    raw_app_meta_data,
    raw_user_meta_data,
    is_super_admin,
    role,
    aud
  ) VALUES (
    new_user_id,
    '00000000-0000-0000-0000-000000000000',
    'basbrouwer26@gmail.com',
    crypt('Secret123', gen_salt('bf')),
    NOW(),
    NOW(),
    NOW(),
    '{"provider":"email","providers":["email"]}',
    '{"voornaam":"Bas","achternaam":"Brouwer"}',
    false,
    'authenticated',
    'authenticated'
  );
  
  INSERT INTO public.profiles (id, voornaam, achternaam, email)
  VALUES (new_user_id, 'Bas', 'Brouwer', 'basbrouwer26@gmail.com')
  ON CONFLICT (id) DO NOTHING;
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (new_user_id, 'hr');
  
  RAISE NOTICE 'HR user created: basbrouwer26@gmail.com / Secret123';
END $$;
