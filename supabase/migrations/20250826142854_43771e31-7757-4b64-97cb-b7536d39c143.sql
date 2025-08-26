-- Fix remaining functions to have proper search_path
CREATE OR REPLACE FUNCTION public.generate_route_frequencies(p_route_id uuid, p_frequency_minutes integer, p_start_time time without time zone DEFAULT '05:00:00'::time without time zone, p_end_time time without time zone DEFAULT '22:00:00'::time without time zone)
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
  -- Convertir minutos a intervalo
  v_interval := (p_frequency_minutes || ' minutes')::INTERVAL;
  
  -- Eliminar frecuencias existentes para esta ruta
  DELETE FROM public.route_frequencies WHERE route_id = p_route_id;
  
  -- Generar frecuencias
  v_current_time := p_start_time;
  
  WHILE v_current_time <= p_end_time LOOP
    INSERT INTO public.route_frequencies (
      route_id,
      departure_time,
      arrival_time,
      frequency_number,
      is_first_turn,
      is_last_turn
    ) VALUES (
      p_route_id,
      v_current_time,
      v_current_time + (SELECT duration_minutes || ' minutes' FROM public.routes WHERE id = p_route_id)::INTERVAL,
      v_frequency_number,
      v_frequency_number = 1,
      false -- Se actualizará después
    );
    
    v_current_time := v_current_time + v_interval;
    v_frequency_number := v_frequency_number + 1;
  END LOOP;
  
  -- Marcar el último turno
  UPDATE public.route_frequencies 
  SET is_last_turn = true 
  WHERE route_id = p_route_id 
    AND frequency_number = (
      SELECT MAX(frequency_number) 
      FROM public.route_frequencies 
      WHERE route_id = p_route_id
    );
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$function$;