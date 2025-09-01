-- Create role_requests table to track role requests
CREATE TABLE public.role_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  requester_id uuid NOT NULL,
  requested_role app_role NOT NULL,
  justification text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  reviewed_at timestamp with time zone,
  reviewed_by uuid,
  notes text
);

-- Enable RLS
ALTER TABLE public.role_requests ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Admins can view all role requests" 
ON public.role_requests 
FOR SELECT 
USING (has_role(auth.uid(), 'administrator'::app_role));

CREATE POLICY "Admins can update role requests" 
ON public.role_requests 
FOR UPDATE 
USING (has_role(auth.uid(), 'administrator'::app_role));

CREATE POLICY "Users can create their own requests" 
ON public.role_requests 
FOR INSERT 
WITH CHECK (auth.uid() = requester_id);

CREATE POLICY "Users can view their own requests" 
ON public.role_requests 
FOR SELECT 
USING (auth.uid() = requester_id);