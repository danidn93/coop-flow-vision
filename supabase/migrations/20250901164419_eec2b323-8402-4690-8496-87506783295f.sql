-- Create table for terminal operations (registering passengers and revenue per terminal)
CREATE TABLE public.terminal_operations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  route_frequency_id UUID NOT NULL,
  terminal_name TEXT NOT NULL,
  terminal_order INTEGER NOT NULL DEFAULT 1,
  passengers_count INTEGER NOT NULL DEFAULT 0,
  revenue NUMERIC NOT NULL DEFAULT 0,
  recorded_by UUID NOT NULL,
  recorded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.terminal_operations ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can view terminal operations" 
ON public.terminal_operations 
FOR SELECT 
USING (true);

CREATE POLICY "Officials/admins/managers can create terminal operations" 
ON public.terminal_operations 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'official'::app_role) OR has_role(auth.uid(), 'administrator'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "Officials/admins/managers can update terminal operations" 
ON public.terminal_operations 
FOR UPDATE 
USING (has_role(auth.uid(), 'official'::app_role) OR has_role(auth.uid(), 'administrator'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

-- Create trigger for updated_at
CREATE TRIGGER update_terminal_operations_updated_at
BEFORE UPDATE ON public.terminal_operations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();