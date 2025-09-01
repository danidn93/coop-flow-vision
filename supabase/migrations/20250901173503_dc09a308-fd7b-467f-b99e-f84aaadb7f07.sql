-- Modify route_frequencies to support daily operations
ALTER TABLE public.route_frequencies 
ADD COLUMN frequency_date DATE NOT NULL DEFAULT CURRENT_DATE;

-- Add index for better performance on date queries
CREATE INDEX idx_route_frequencies_date ON public.route_frequencies(frequency_date);
CREATE INDEX idx_route_frequencies_route_date ON public.route_frequencies(route_id, frequency_date);

-- Update generate_route_frequencies function to support date parameter
CREATE OR REPLACE FUNCTION public.generate_route_frequencies(
  p_route_id uuid, 
  p_frequency_minutes integer, 
  p_start_time time without time zone DEFAULT '05:00:00'::time without time zone, 
  p_end_time time without time zone DEFAULT '22:00:00'::time without time zone,
  p_date date DEFAULT CURRENT_DATE
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_current_time TIME;
  v_frequency_number INTEGER := 1;
  v_interval INTERVAL;
BEGIN
  -- Convert minutes to interval
  v_interval := (p_frequency_minutes || ' minutes')::INTERVAL;
  
  -- Delete existing frequencies for this route and date
  DELETE FROM public.route_frequencies 
  WHERE route_id = p_route_id AND frequency_date = p_date;
  
  -- Generate frequencies
  v_current_time := p_start_time;
  
  WHILE v_current_time <= p_end_time LOOP
    INSERT INTO public.route_frequencies (
      route_id,
      frequency_date,
      departure_time,
      arrival_time,
      frequency_number,
      is_first_turn,
      is_last_turn,
      status,
      passengers_count,
      revenue
    ) VALUES (
      p_route_id,
      p_date,
      v_current_time,
      v_current_time + (SELECT duration_minutes || ' minutes' FROM public.routes WHERE id = p_route_id)::INTERVAL,
      v_frequency_number,
      v_frequency_number = 1,
      false, -- Will be updated after
      'active',
      0,
      0
    );
    
    v_current_time := v_current_time + v_interval;
    v_frequency_number := v_frequency_number + 1;
  END LOOP;
  
  -- Mark the last turn
  UPDATE public.route_frequencies 
  SET is_last_turn = true 
  WHERE route_id = p_route_id 
    AND frequency_date = p_date
    AND frequency_number = (
      SELECT MAX(frequency_number) 
      FROM public.route_frequencies 
      WHERE route_id = p_route_id AND frequency_date = p_date
    );
END;
$function$;