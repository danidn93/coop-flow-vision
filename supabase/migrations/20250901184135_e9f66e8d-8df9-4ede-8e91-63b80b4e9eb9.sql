-- Create employee schedules table
CREATE TABLE public.employee_schedules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6), -- 0=Sunday, 6=Saturday
  start_time TIME WITHOUT TIME ZONE NOT NULL,
  end_time TIME WITHOUT TIME ZONE NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(employee_id, role, day_of_week)
);

-- Enable RLS
ALTER TABLE public.employee_schedules ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Admins/managers/presidents can manage employee schedules"
ON public.employee_schedules
FOR ALL
USING (
  has_role(auth.uid(), 'administrator'::app_role) OR 
  has_role(auth.uid(), 'manager'::app_role) OR
  has_role(auth.uid(), 'president'::app_role)
);

CREATE POLICY "Employees can view their own schedules"
ON public.employee_schedules
FOR SELECT
USING (employee_id = auth.uid());

-- Add updated_at trigger
CREATE TRIGGER update_employee_schedules_updated_at
BEFORE UPDATE ON public.employee_schedules
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to validate employee schedule access
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
  
  -- Always allow administrators access
  IF has_role(p_user_id, 'administrator'::app_role) THEN
    RETURN true;
  END IF;
  
  -- For other roles, check schedule
  RETURN v_schedule_exists;
END;
$$;