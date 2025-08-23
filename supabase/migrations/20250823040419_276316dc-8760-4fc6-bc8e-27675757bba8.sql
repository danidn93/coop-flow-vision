-- Ensure trigger exists to create profiles and default roles on signup
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created'
  ) THEN
    CREATE TRIGGER on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW
      EXECUTE FUNCTION public.handle_new_user();
  END IF;
END $$;

-- Backfill profiles for existing users missing a profile
INSERT INTO public.profiles (
  user_id, first_name, middle_name, surname_1, surname_2, id_number, phone, address
)
SELECT 
  u.id,
  COALESCE(u.raw_user_meta_data ->> 'first_name', ''),
  u.raw_user_meta_data ->> 'middle_name',
  COALESCE(u.raw_user_meta_data ->> 'surname_1', ''),
  u.raw_user_meta_data ->> 'surname_2',
  COALESCE(u.raw_user_meta_data ->> 'id_number', ''),
  COALESCE(u.raw_user_meta_data ->> 'phone', ''),
  COALESCE(u.raw_user_meta_data ->> 'address', '')
FROM auth.users u
LEFT JOIN public.profiles p ON p.user_id = u.id
WHERE p.user_id IS NULL;

-- Promote the specified user to administrator if not already
INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'administrator'::app_role
FROM auth.users u
LEFT JOIN public.user_roles ur ON ur.user_id = u.id AND ur.role = 'administrator'
WHERE u.email = 'dario93jossi@hotmail.com' AND ur.user_id IS NULL;
