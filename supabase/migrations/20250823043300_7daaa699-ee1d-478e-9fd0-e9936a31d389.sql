-- Promote specific email to administrator and remove other roles for that user
DO $$
DECLARE
  v_user_id uuid;
BEGIN
  SELECT id INTO v_user_id FROM auth.users WHERE email = 'dario93jossi@hotmail.com' LIMIT 1;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'No existe un usuario con el correo %', 'dario93jossi@hotmail.com';
  END IF;

  -- Remove any existing roles for this user to avoid duplicates
  DELETE FROM public.user_roles WHERE user_id = v_user_id;

  -- Assign administrator role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (v_user_id, 'administrator'::app_role);
END $$;