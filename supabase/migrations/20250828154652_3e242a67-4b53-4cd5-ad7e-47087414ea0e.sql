-- 1) Add official_id to buses
ALTER TABLE public.buses
ADD COLUMN IF NOT EXISTS official_id uuid;

-- Allow officials to view their buses
DROP POLICY IF EXISTS "Officials can view their buses" ON public.buses;
CREATE POLICY "Officials can view their buses"
ON public.buses
FOR SELECT
USING (official_id = auth.uid());

-- 2) Add passengers and revenue to route_frequencies
ALTER TABLE public.route_frequencies
ADD COLUMN IF NOT EXISTS passengers_count integer NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS revenue numeric NOT NULL DEFAULT 0;

-- Allow officials to update route frequencies
DROP POLICY IF EXISTS "Officials can update route frequencies" ON public.route_frequencies;
CREATE POLICY "Officials can update route frequencies"
ON public.route_frequencies
FOR UPDATE
USING (has_role(auth.uid(), 'official'::app_role));

-- 3) Notifications infrastructure
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  type text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users can see their own notifications
DROP POLICY IF EXISTS "Users can view their notifications" ON public.notifications;
CREATE POLICY "Users can view their notifications"
ON public.notifications
FOR SELECT
USING (auth.uid() = user_id);

-- Admins/managers can create notifications
DROP POLICY IF EXISTS "Admins/managers can create notifications" ON public.notifications;
CREATE POLICY "Admins/managers can create notifications"
ON public.notifications
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'administrator'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

-- Function to insert notifications (SECURITY DEFINER to be used by triggers)
CREATE OR REPLACE FUNCTION public.create_notification(
  p_user_id uuid,
  p_title text,
  p_message text,
  p_type text,
  p_metadata jsonb DEFAULT '{}'::jsonb
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
BEGIN
  INSERT INTO public.notifications(user_id, title, message, type, metadata)
  VALUES (p_user_id, p_title, p_message, p_type, COALESCE(p_metadata, '{}'::jsonb));
END;
$$;

-- Trigger for notifying driver/official when assigned on buses
CREATE OR REPLACE FUNCTION public.notify_bus_role_assignment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_title text;
  v_msg text;
BEGIN
  -- Driver change
  IF NEW.driver_id IS DISTINCT FROM OLD.driver_id AND NEW.driver_id IS NOT NULL THEN
    v_title := 'Asignación de Bus';
    v_msg := 'Has sido asignado como Conductor del bus con placa ' || NEW.plate || '.';
    PERFORM public.create_notification(NEW.driver_id, v_title, v_msg, 'bus_assignment', jsonb_build_object('bus_id', NEW.id, 'plate', NEW.plate));
  END IF;
  -- Official change
  IF NEW.official_id IS DISTINCT FROM OLD.official_id AND NEW.official_id IS NOT NULL THEN
    v_title := 'Asignación de Bus';
    v_msg := 'Has sido asignado como Oficial del bus con placa ' || NEW.plate || '.';
    PERFORM public.create_notification(NEW.official_id, v_title, v_msg, 'bus_assignment', jsonb_build_object('bus_id', NEW.id, 'plate', NEW.plate));
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_bus_role_assignment ON public.buses;
CREATE TRIGGER trg_notify_bus_role_assignment
AFTER UPDATE ON public.buses
FOR EACH ROW
WHEN (OLD.driver_id IS DISTINCT FROM NEW.driver_id OR OLD.official_id IS DISTINCT FROM NEW.official_id)
EXECUTE FUNCTION public.notify_bus_role_assignment();

-- Trigger for notifying on route assignment to a bus
CREATE OR REPLACE FUNCTION public.notify_route_assignment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_bus record;
  v_title text := 'Asignación de Ruta';
  v_msg text;
BEGIN
  IF NEW.assigned_bus_id IS NOT NULL AND (OLD.assigned_bus_id IS DISTINCT FROM NEW.assigned_bus_id) THEN
    SELECT id, plate, owner_id, driver_id, official_id INTO v_bus
    FROM public.buses
    WHERE id = NEW.assigned_bus_id;

    IF v_bus IS NOT NULL THEN
      v_msg := 'El bus ' || v_bus.plate || ' fue asignado a una frecuencia de la ruta.';
      -- Notify driver
      IF v_bus.driver_id IS NOT NULL THEN
        PERFORM public.create_notification(v_bus.driver_id, v_title, v_msg, 'route_assignment', jsonb_build_object('route_id', NEW.route_id, 'frequency_id', NEW.id));
      END IF;
      -- Notify official
      IF v_bus.official_id IS NOT NULL THEN
        PERFORM public.create_notification(v_bus.official_id, v_title, v_msg, 'route_assignment', jsonb_build_object('route_id', NEW.route_id, 'frequency_id', NEW.id));
      END IF;
      -- Notify owner (partner)
      IF v_bus.owner_id IS NOT NULL THEN
        PERFORM public.create_notification(v_bus.owner_id, 'Tu bus fue asignado', v_msg, 'owner_route_assignment', jsonb_build_object('route_id', NEW.route_id, 'frequency_id', NEW.id));
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_route_assignment ON public.route_frequencies;
CREATE TRIGGER trg_notify_route_assignment
AFTER UPDATE ON public.route_frequencies
FOR EACH ROW
WHEN (OLD.assigned_bus_id IS DISTINCT FROM NEW.assigned_bus_id)
EXECUTE FUNCTION public.notify_route_assignment();

-- Trigger for notifying partner when their driver/officer reports an incident
CREATE OR REPLACE FUNCTION public.notify_incident_owner()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_bus record;
  v_title text := 'Incidente reportado';
  v_msg text;
BEGIN
  SELECT id, plate, owner_id INTO v_bus
  FROM public.buses
  WHERE driver_id = NEW.reporter_id OR official_id = NEW.reporter_id
  LIMIT 1;

  IF v_bus IS NOT NULL AND v_bus.owner_id IS NOT NULL THEN
    v_msg := 'Se reportó un incidente relacionado con el bus ' || v_bus.plate || '.';
    PERFORM public.create_notification(v_bus.owner_id, v_title, v_msg, 'incident_reported', jsonb_build_object('incident_id', NEW.id));
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_incident_owner ON public.road_incidents;
CREATE TRIGGER trg_notify_incident_owner
AFTER INSERT ON public.road_incidents
FOR EACH ROW
EXECUTE FUNCTION public.notify_incident_owner();