-- Update terminal_operations table to better support frequency operations
ALTER TABLE public.terminal_operations 
ADD COLUMN IF NOT EXISTS frequency_id uuid REFERENCES public.route_frequencies(id) ON DELETE CASCADE;

-- Update the existing route_frequency_id column to be nullable since we're using frequency_id now
ALTER TABLE public.terminal_operations 
ALTER COLUMN route_frequency_id DROP NOT NULL;

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_terminal_operations_frequency_id ON public.terminal_operations(frequency_id);

-- Update RLS policies for terminal operations
DROP POLICY IF EXISTS "Officials/admins/managers can create terminal operations" ON public.terminal_operations;
DROP POLICY IF EXISTS "Officials/admins/managers can update terminal operations" ON public.terminal_operations;

CREATE POLICY "Officials/admins/managers/employees can create terminal operations" 
ON public.terminal_operations 
FOR INSERT 
WITH CHECK (
  has_role(auth.uid(), 'official'::app_role) OR 
  has_role(auth.uid(), 'administrator'::app_role) OR 
  has_role(auth.uid(), 'manager'::app_role) OR
  has_role(auth.uid(), 'employee'::app_role)
);

CREATE POLICY "Officials/admins/managers/employees can update terminal operations" 
ON public.terminal_operations 
FOR UPDATE 
USING (
  has_role(auth.uid(), 'official'::app_role) OR 
  has_role(auth.uid(), 'administrator'::app_role) OR 
  has_role(auth.uid(), 'manager'::app_role) OR
  has_role(auth.uid(), 'employee'::app_role)
);