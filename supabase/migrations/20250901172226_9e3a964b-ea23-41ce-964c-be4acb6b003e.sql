-- Add policy for employees to view all user roles
CREATE POLICY "Employees can view all user roles" 
ON public.user_roles 
FOR SELECT 
USING (has_role(auth.uid(), 'employee'::app_role));