-- Update user role to administrator for dario93jossi@hotmail.com
UPDATE public.user_roles 
SET role = 'administrator'::app_role 
WHERE user_id = (
    SELECT au.id 
    FROM auth.users au 
    WHERE au.email = 'dario93jossi@hotmail.com'
);