-- Create draft assignments table for next day route planning
CREATE TABLE public.draft_route_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bus_id UUID NOT NULL REFERENCES public.buses(id) ON DELETE CASCADE,
  route_id UUID NOT NULL REFERENCES public.routes(id) ON DELETE CASCADE,
  assignment_date DATE NOT NULL,
  first_frequency_time TIME WITHOUT TIME ZONE NOT NULL,
  assigned_by UUID NOT NULL REFERENCES auth.users(id),
  notes TEXT,
  is_confirmed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(bus_id, assignment_date),
  UNIQUE(route_id, assignment_date, first_frequency_time)
);

-- Enable RLS
ALTER TABLE public.draft_route_assignments ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Admins/managers/employees can view draft assignments"
ON public.draft_route_assignments
FOR SELECT
USING (
  has_role(auth.uid(), 'administrator'::app_role) OR 
  has_role(auth.uid(), 'manager'::app_role) OR
  has_role(auth.uid(), 'employee'::app_role)
);

CREATE POLICY "Admins/managers/employees can create draft assignments"
ON public.draft_route_assignments
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'administrator'::app_role) OR 
  has_role(auth.uid(), 'manager'::app_role) OR
  has_role(auth.uid(), 'employee'::app_role)
);

CREATE POLICY "Admins/managers can update draft assignments"
ON public.draft_route_assignments
FOR UPDATE
USING (
  has_role(auth.uid(), 'administrator'::app_role) OR 
  has_role(auth.uid(), 'manager'::app_role) OR
  (has_role(auth.uid(), 'employee'::app_role) AND assigned_by = auth.uid())
);

CREATE POLICY "Admins/managers can delete draft assignments"
ON public.draft_route_assignments
FOR DELETE
USING (
  has_role(auth.uid(), 'administrator'::app_role) OR 
  has_role(auth.uid(), 'manager'::app_role) OR
  (has_role(auth.uid(), 'employee'::app_role) AND assigned_by = auth.uid())
);

-- Add updated_at trigger
CREATE TRIGGER update_draft_route_assignments_updated_at
BEFORE UPDATE ON public.draft_route_assignments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Update the schedule validation function to only apply to employees
CREATE OR REPLACE FUNCTION public.validate_employee_schedule_access(
  p_user_id UUID,
  p_role app_role
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_day INTEGER;
  v_current_time TIME;
  v_schedule_exists BOOLEAN := false;
BEGIN
  -- Always allow administrators, managers, presidents, and other non-employee roles
  IF NOT (p_role = 'employee'::app_role) THEN
    RETURN true;
  END IF;
  
  -- Only validate schedule for employee role
  -- Get current day of week (0=Sunday, 6=Saturday)
  v_current_day := EXTRACT(DOW FROM CURRENT_DATE);
  -- Get current time
  v_current_time := CURRENT_TIME;
  
  -- Check if user has an active schedule for today and this role
  SELECT EXISTS (
    SELECT 1
    FROM employee_schedules
    WHERE employee_id = p_user_id
      AND role = p_role
      AND day_of_week = v_current_day
      AND is_active = true
      AND v_current_time >= start_time
      AND v_current_time <= end_time
  ) INTO v_schedule_exists;
  
  RETURN v_schedule_exists;
END;
$$;