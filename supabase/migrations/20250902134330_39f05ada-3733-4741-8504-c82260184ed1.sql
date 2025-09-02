-- Create a function to get user roles by email (for role selection during login)
CREATE OR REPLACE FUNCTION public.get_user_roles_by_email(user_email text)
RETURNS TABLE (role app_role) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  target_user_id uuid;
BEGIN
  -- Get user_id from profiles table using email
  SELECT user_id INTO target_user_id
  FROM auth.users 
  WHERE email = user_email
  LIMIT 1;
  
  IF target_user_id IS NULL THEN
    RETURN;
  END IF;
  
  -- Return roles for this user
  RETURN QUERY
  SELECT ur.role
  FROM public.user_roles ur
  WHERE ur.user_id = target_user_id;
END;
$$;