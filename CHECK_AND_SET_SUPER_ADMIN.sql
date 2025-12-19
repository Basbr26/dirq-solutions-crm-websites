-- Check current user and set as super_admin
-- Run this in Supabase SQL Editor when you're logged in

-- First, check your current role
SELECT 
  p.voornaam,
  p.achternaam,
  p.email,
  ur.role
FROM profiles p
LEFT JOIN user_roles ur ON ur.user_id = p.id
WHERE p.id = auth.uid();

-- If you need to set yourself as super_admin, run this:
-- (Replace 'your@email.com' with your actual email)
INSERT INTO user_roles (user_id, role)
SELECT id, 'super_admin'
FROM profiles
WHERE email = 'your@email.com'
ON CONFLICT (user_id) 
DO UPDATE SET role = 'super_admin';
