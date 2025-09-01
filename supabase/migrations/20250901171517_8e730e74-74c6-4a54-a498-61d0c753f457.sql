-- Update RLS policies for employee role access
-- Update buses policies to allow employee management
DROP POLICY IF EXISTS "Admins/managers/partners can insert buses" ON public.buses;
DROP POLICY IF EXISTS "Owners/admins/managers can update their buses" ON public.buses;

CREATE POLICY "Admins/managers/employees/partners can insert buses" 
ON public.buses 
FOR INSERT 
WITH CHECK (
  has_role(auth.uid(), 'administrator'::app_role) OR 
  has_role(auth.uid(), 'manager'::app_role) OR 
  has_role(auth.uid(), 'employee'::app_role) OR 
  has_role(auth.uid(), 'partner'::app_role)
);

CREATE POLICY "Owners/admins/managers/employees can update their buses" 
ON public.buses 
FOR UPDATE 
USING (
  (owner_id = auth.uid()) OR 
  has_role(auth.uid(), 'administrator'::app_role) OR 
  has_role(auth.uid(), 'manager'::app_role) OR
  has_role(auth.uid(), 'employee'::app_role)
);

-- Update routes policies for employee access
DROP POLICY IF EXISTS "Admins/managers/partners can insert routes" ON public.routes;
DROP POLICY IF EXISTS "Admins/managers/partners can update routes" ON public.routes;

CREATE POLICY "Admins/managers/employees/partners can insert routes" 
ON public.routes 
FOR INSERT 
WITH CHECK (
  has_role(auth.uid(), 'administrator'::app_role) OR 
  has_role(auth.uid(), 'manager'::app_role) OR 
  has_role(auth.uid(), 'employee'::app_role) OR 
  has_role(auth.uid(), 'partner'::app_role)
);

CREATE POLICY "Admins/managers/employees/partners can update routes" 
ON public.routes 
FOR UPDATE 
USING (
  has_role(auth.uid(), 'administrator'::app_role) OR 
  has_role(auth.uid(), 'manager'::app_role) OR 
  has_role(auth.uid(), 'employee'::app_role) OR 
  has_role(auth.uid(), 'partner'::app_role)
);

-- Update profiles policies for employee access to view all profiles
CREATE POLICY "Employees can view all profiles" 
ON public.profiles 
FOR SELECT 
USING (has_role(auth.uid(), 'employee'::app_role));

-- Create function to reset bus assignments daily at midnight
CREATE OR REPLACE FUNCTION public.reset_daily_bus_assignments()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Reset driver and official assignments for all buses
  -- Set buses to 'disponible' status when they had assigned drivers/officials
  UPDATE public.buses 
  SET 
    driver_id = NULL,
    official_id = NULL,
    status = CASE 
      WHEN status = 'en_servicio' AND (driver_id IS NOT NULL OR official_id IS NOT NULL) THEN 'disponible'
      ELSE status 
    END
  WHERE driver_id IS NOT NULL OR official_id IS NOT NULL;
  
  -- Log the reset operation
  RAISE NOTICE 'Daily bus assignments reset completed at %', now();
END;
$$;

-- Schedule the function to run daily at midnight using pg_cron
-- Note: This requires pg_cron extension to be enabled
SELECT cron.schedule(
  'daily-bus-reset',
  '0 0 * * *', -- Every day at midnight
  $$SELECT public.reset_daily_bus_assignments();$$
);

-- Create trigger function to handle incident reporting restrictions
CREATE OR REPLACE FUNCTION public.check_incident_reporter()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Employees cannot create incidents
  IF has_role(NEW.reporter_id, 'employee'::app_role) THEN
    RAISE EXCEPTION 'Los empleados no pueden registrar incidentes directamente';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger on road_incidents for incident reporting restrictions
DROP TRIGGER IF EXISTS check_incident_reporter_trigger ON public.road_incidents;
CREATE TRIGGER check_incident_reporter_trigger
  BEFORE INSERT ON public.road_incidents
  FOR EACH ROW
  EXECUTE FUNCTION public.check_incident_reporter();

-- Update bus status enum values to include new states
-- Note: First we need to check if the enum values already exist
DO $$
BEGIN
  -- Add new enum values if they don't exist
  BEGIN
    ALTER TYPE bus_status ADD VALUE IF NOT EXISTS 'en_tour';
  EXCEPTION WHEN others THEN
    RAISE NOTICE 'en_tour enum value may already exist or enum does not exist';
  END;
END $$;