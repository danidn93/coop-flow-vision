-- Create terminals table
CREATE TABLE public.terminals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  location TEXT NOT NULL,
  terminal_type TEXT NOT NULL DEFAULT 'terminal', -- 'terminal' or 'office'
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create terminal_assignments table to assign employees to terminals
CREATE TABLE public.terminal_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  terminal_id UUID NOT NULL REFERENCES public.terminals(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL,
  assigned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  assigned_by UUID NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create audit_log table for tracking user actions
CREATE TABLE public.audit_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  action TEXT NOT NULL,
  table_name TEXT NOT NULL,
  record_id UUID,
  old_values JSONB,
  new_values JSONB,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Update terminal_operations to include terminal_id
ALTER TABLE public.terminal_operations 
ADD COLUMN terminal_id UUID REFERENCES public.terminals(id);

-- Enable RLS
ALTER TABLE public.terminals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.terminal_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- RLS policies for terminals
CREATE POLICY "Anyone can view active terminals" 
ON public.terminals 
FOR SELECT 
USING (is_active = true);

CREATE POLICY "Admins/managers can manage terminals" 
ON public.terminals 
FOR ALL 
USING (has_role(auth.uid(), 'administrator'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

-- RLS policies for terminal_assignments
CREATE POLICY "Users can view their terminal assignments" 
ON public.terminal_assignments 
FOR SELECT 
USING (employee_id = auth.uid() OR has_role(auth.uid(), 'administrator'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "Admins/managers can manage terminal assignments" 
ON public.terminal_assignments 
FOR ALL 
USING (has_role(auth.uid(), 'administrator'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

-- RLS policies for audit_log
CREATE POLICY "Users can view their own audit logs" 
ON public.audit_log 
FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "Admins/managers can view all audit logs" 
ON public.audit_log 
FOR SELECT 
USING (has_role(auth.uid(), 'administrator'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "Anyone can create audit logs" 
ON public.audit_log 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Update terminal_operations RLS to check terminal assignments
DROP POLICY IF EXISTS "Officials/admins/managers/employees can create terminal operati" ON public.terminal_operations;
DROP POLICY IF EXISTS "Officials/admins/managers/employees can update terminal operati" ON public.terminal_operations;

CREATE POLICY "Assigned employees can create terminal operations" 
ON public.terminal_operations 
FOR INSERT 
WITH CHECK (
  has_role(auth.uid(), 'administrator'::app_role) OR 
  has_role(auth.uid(), 'manager'::app_role) OR 
  (terminal_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.terminal_assignments ta 
    WHERE ta.terminal_id = terminal_operations.terminal_id 
    AND ta.employee_id = auth.uid() 
    AND ta.is_active = true
  ))
);

CREATE POLICY "Assigned employees can update terminal operations" 
ON public.terminal_operations 
FOR UPDATE 
USING (
  has_role(auth.uid(), 'administrator'::app_role) OR 
  has_role(auth.uid(), 'manager'::app_role) OR 
  (terminal_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.terminal_assignments ta 
    WHERE ta.terminal_id = terminal_operations.terminal_id 
    AND ta.employee_id = auth.uid() 
    AND ta.is_active = true
  ))
);

-- Allow DELETE for admins/managers
CREATE POLICY "Admins/managers can delete terminal operations" 
ON public.terminal_operations 
FOR DELETE 
USING (has_role(auth.uid(), 'administrator'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

-- Create function to log audit trail
CREATE OR REPLACE FUNCTION public.create_audit_log(
  p_action TEXT,
  p_table_name TEXT,
  p_record_id UUID DEFAULT NULL,
  p_old_values JSONB DEFAULT NULL,
  p_new_values JSONB DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.audit_log (
    user_id, action, table_name, record_id, old_values, new_values, metadata
  ) VALUES (
    auth.uid(), p_action, p_table_name, p_record_id, p_old_values, p_new_values, p_metadata
  );
END;
$$;

-- Add triggers for updated_at
CREATE TRIGGER update_terminals_updated_at
  BEFORE UPDATE ON public.terminals
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_terminal_assignments_updated_at
  BEFORE UPDATE ON public.terminal_assignments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();