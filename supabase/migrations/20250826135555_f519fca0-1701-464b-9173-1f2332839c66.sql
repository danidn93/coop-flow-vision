-- Fix the handle_new_user function to have proper search_path
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
    -- Create profile from signup metadata
    INSERT INTO public.profiles (
        user_id,
        first_name,
        middle_name,
        surname_1,
        surname_2,
        id_number,
        phone,
        address
    ) VALUES (
        NEW.id,
        NEW.raw_user_meta_data ->> 'first_name',
        NEW.raw_user_meta_data ->> 'middle_name',
        NEW.raw_user_meta_data ->> 'surname_1',
        NEW.raw_user_meta_data ->> 'surname_2',
        NEW.raw_user_meta_data ->> 'id_number',
        NEW.raw_user_meta_data ->> 'phone',
        NEW.raw_user_meta_data ->> 'address'
    );
    
    -- Assign default role (client) unless it's the first user (who becomes admin)
    INSERT INTO public.user_roles (user_id, role)
    SELECT 
        NEW.id,
        CASE 
            WHEN (SELECT COUNT(*) FROM public.user_roles WHERE role = 'administrator') = 0 
            THEN 'administrator'::app_role
            ELSE 'client'::app_role
        END;
    
    RETURN NEW;
END;
$function$;

-- Ensure the trigger exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();