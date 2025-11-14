-- =====================================================
-- DIRQ POORTWACHTER - CREATE TEST USER
-- =====================================================
-- Dit script maakt een test gebruiker aan met HR rechten
-- Email: bas@dirqsolutions.nl
-- Wachtwoord: Secret123
-- =====================================================

-- BELANGRIJK: Dit script moet uitgevoerd worden NADAT je supabase-setup.sql hebt gedraaid

-- 1. Maak de gebruiker aan in auth.users
-- LET OP: Vervang 'your-raw-jwt-secret' met je ACTUAL JWT secret uit Supabase settings
-- Je vindt deze in: Settings > API > JWT Settings > JWT Secret

DO $$
DECLARE
  new_user_id UUID;
  encrypted_password TEXT;
BEGIN
  -- Generate user ID
  new_user_id := gen_random_uuid();
  
  -- Hash het wachtwoord (Supabase gebruikt bcrypt)
  -- In productie zou Supabase dit automatisch doen via de API
  -- Voor development/testing maken we direct aan
  encrypted_password := crypt('Secret123', gen_salt('bf'));
  
  -- Insert user in auth.users
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
    'bas@dirqsolutions.nl',
    encrypted_password,
    NOW(),
    NOW(),
    NOW(),
    '{"provider":"email","providers":["email"]}',
    '{"voornaam":"Bas","achternaam":"van Dirq"}',
    false,
    'authenticated',
    'authenticated'
  );
  
  -- Create profile (should be automatic via trigger, but just in case)
  INSERT INTO public.profiles (
    id,
    voornaam,
    achternaam,
    email
  ) VALUES (
    new_user_id,
    'Bas',
    'van Dirq',
    'bas@dirqsolutions.nl'
  )
  ON CONFLICT (id) DO NOTHING;
  
  -- Assign HR role
  INSERT INTO public.user_roles (
    user_id,
    role
  ) VALUES (
    new_user_id,
    'hr'
  );
  
  RAISE NOTICE 'Test user created successfully!';
  RAISE NOTICE 'Email: bas@dirqsolutions.nl';
  RAISE NOTICE 'Password: Secret123';
  RAISE NOTICE 'Role: HR';
  RAISE NOTICE 'User ID: %', new_user_id;
END $$;

-- Verificatie query - run dit om te checken of het gelukt is
SELECT 
  u.id,
  u.email,
  p.voornaam,
  p.achternaam,
  ur.role
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
LEFT JOIN public.user_roles ur ON ur.user_id = u.id
WHERE u.email = 'bas@dirqsolutions.nl';
