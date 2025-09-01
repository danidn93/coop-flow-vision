-- Modify user_tickets table to use ticket number instead of image
ALTER TABLE public.user_tickets 
DROP COLUMN ticket_image_url,
ADD COLUMN ticket_number text NOT NULL DEFAULT '',
ADD CONSTRAINT unique_ticket_number UNIQUE (ticket_number);

-- Create index for better performance on ticket number searches
CREATE INDEX idx_user_tickets_ticket_number ON public.user_tickets(ticket_number);

-- Create function to send notifications to specific roles for incidents
CREATE OR REPLACE FUNCTION public.notify_incident_to_management()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_admin_users uuid[];
  v_manager_users uuid[];
  v_president_users uuid[];
  v_all_users uuid[];
  v_user_id uuid;
  v_title text := 'Nuevo incidente reportado';
  v_msg text;
BEGIN
  -- Get reporter name for better notification
  v_msg := 'Se ha reportado un nuevo incidente: ' || NEW.title;

  -- Get users with administrator role
  SELECT array_agg(user_id) INTO v_admin_users
  FROM public.user_roles
  WHERE role = 'administrator';

  -- Get users with manager role
  SELECT array_agg(user_id) INTO v_manager_users
  FROM public.user_roles
  WHERE role = 'manager';

  -- Get users with president role
  SELECT array_agg(user_id) INTO v_president_users
  FROM public.user_roles
  WHERE role = 'president';

  -- Combine all target users
  v_all_users := COALESCE(v_admin_users, ARRAY[]::uuid[]) || 
                 COALESCE(v_manager_users, ARRAY[]::uuid[]) || 
                 COALESCE(v_president_users, ARRAY[]::uuid[]);

  -- Send notification to each target user
  FOREACH v_user_id IN ARRAY v_all_users
  LOOP
    IF v_user_id IS NOT NULL THEN
      PERFORM public.create_notification(
        v_user_id, 
        v_title, 
        v_msg, 
        'incident_reported', 
        jsonb_build_object('incident_id', NEW.id, 'severity', NEW.severity, 'location', NEW.location_description)
      );
    END IF;
  END LOOP;

  RETURN NEW;
END;
$function$;

-- Create trigger for incident notifications
DROP TRIGGER IF EXISTS notify_incident_management ON public.road_incidents;
CREATE TRIGGER notify_incident_management
  AFTER INSERT ON public.road_incidents
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_incident_to_management();