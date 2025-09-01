-- Create route_terminals relationship table
CREATE TABLE public.route_terminals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  route_id UUID NOT NULL REFERENCES public.routes(id) ON DELETE CASCADE,
  terminal_id UUID NOT NULL REFERENCES public.terminals(id) ON DELETE CASCADE,
  terminal_order INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(route_id, terminal_id),
  UNIQUE(route_id, terminal_order)
);

-- Enable RLS
ALTER TABLE public.route_terminals ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can view route terminals"
ON public.route_terminals
FOR SELECT
USING (true);

CREATE POLICY "Admins/managers can manage route terminals"
ON public.route_terminals
FOR ALL
USING (
  has_role(auth.uid(), 'administrator'::app_role) OR 
  has_role(auth.uid(), 'manager'::app_role)
);

-- Add updated_at trigger
CREATE TRIGGER update_route_terminals_updated_at
BEFORE UPDATE ON public.route_terminals
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();