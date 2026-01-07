-- Check current user role
SELECT 
  id,
  email,
  role,
  full_name,
  created_at
FROM profiles
WHERE id = auth.uid();
