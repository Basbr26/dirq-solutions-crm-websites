-- Update basbrouwer26@gmail.com to super_admin role
UPDATE public.user_roles 
SET role = 'super_admin'::app_role 
WHERE user_id = '6dbfd918-5065-4bfc-ba98-14f00f483485';