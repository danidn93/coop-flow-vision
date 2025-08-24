-- Crear tabla de frecuencias de rutas
CREATE TABLE public.route_frequencies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  route_id UUID NOT NULL REFERENCES public.routes(id) ON DELETE CASCADE,
  departure_time TIME NOT NULL,
  arrival_time TIME NOT NULL,
  frequency_number INTEGER NOT NULL,
  is_first_turn BOOLEAN DEFAULT false,
  is_last_turn BOOLEAN DEFAULT false,
  assigned_bus_id UUID REFERENCES public.buses(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(route_id, frequency_number)
);

-- Crear tabla de configuración de cooperativa
CREATE TABLE public.cooperative_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL DEFAULT 'Cooperativa Mariscal Sucre',
  ruc TEXT,
  address TEXT,
  phone TEXT,
  email TEXT,
  logo_url TEXT,
  max_daily_tickets INTEGER NOT NULL DEFAULT 5,
  reward_points_per_ticket INTEGER NOT NULL DEFAULT 10,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Crear tabla de recompensas
CREATE TABLE public.rewards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  points_required INTEGER NOT NULL,
  image_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Crear tabla de boletos de usuario
CREATE TABLE public.user_tickets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  route_id UUID NOT NULL REFERENCES public.routes(id),
  ticket_image_url TEXT NOT NULL,
  points_earned INTEGER NOT NULL DEFAULT 10,
  validated BOOLEAN DEFAULT false,
  validated_by UUID,
  validated_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Crear tabla de puntos de usuario
CREATE TABLE public.user_points (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  total_points INTEGER NOT NULL DEFAULT 0,
  tickets_today INTEGER NOT NULL DEFAULT 0,
  last_ticket_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Crear tabla de canjes de recompensas
CREATE TABLE public.reward_redemptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  reward_id UUID NOT NULL REFERENCES public.rewards(id),
  points_used INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  redeemed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Agregar campos de imagen a tablas existentes
ALTER TABLE public.routes ADD COLUMN image_url TEXT;
ALTER TABLE public.buses ADD COLUMN image_url TEXT;
ALTER TABLE public.profiles ADD COLUMN avatar_url TEXT;

-- Insertar configuración inicial de cooperativa
INSERT INTO public.cooperative_config (name, ruc, address, phone, email)
VALUES ('Cooperativa Mariscal Sucre', '1234567890001', 'Dirección de la Cooperativa', '04-1234567', 'info@cooperativa.com');

-- Habilitar RLS en nuevas tablas
ALTER TABLE public.route_frequencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cooperative_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reward_redemptions ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para route_frequencies
CREATE POLICY "Anyone can view route frequencies" ON public.route_frequencies FOR SELECT USING (true);
CREATE POLICY "Admins/managers can manage route frequencies" ON public.route_frequencies FOR ALL USING (has_role(auth.uid(), 'administrator'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

-- Políticas RLS para cooperative_config
CREATE POLICY "Anyone can view cooperative config" ON public.cooperative_config FOR SELECT USING (true);
CREATE POLICY "Admins can manage cooperative config" ON public.cooperative_config FOR ALL USING (has_role(auth.uid(), 'administrator'::app_role));

-- Políticas RLS para rewards
CREATE POLICY "Anyone can view active rewards" ON public.rewards FOR SELECT USING (is_active = true);
CREATE POLICY "Admins can manage rewards" ON public.rewards FOR ALL USING (has_role(auth.uid(), 'administrator'::app_role));

-- Políticas RLS para user_tickets
CREATE POLICY "Users can view their own tickets" ON public.user_tickets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own tickets" ON public.user_tickets FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can view all tickets" ON public.user_tickets FOR SELECT USING (has_role(auth.uid(), 'administrator'::app_role) OR has_role(auth.uid(), 'manager'::app_role));
CREATE POLICY "Admins can validate tickets" ON public.user_tickets FOR UPDATE USING (has_role(auth.uid(), 'administrator'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

-- Políticas RLS para user_points
CREATE POLICY "Users can view their own points" ON public.user_points FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own points" ON public.user_points FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all points" ON public.user_points FOR SELECT USING (has_role(auth.uid(), 'administrator'::app_role));

-- Políticas RLS para reward_redemptions
CREATE POLICY "Users can view their own redemptions" ON public.reward_redemptions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own redemptions" ON public.reward_redemptions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can manage all redemptions" ON public.reward_redemptions FOR ALL USING (has_role(auth.uid(), 'administrator'::app_role));

-- Triggers para updated_at
CREATE TRIGGER update_route_frequencies_updated_at BEFORE UPDATE ON public.route_frequencies FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_cooperative_config_updated_at BEFORE UPDATE ON public.cooperative_config FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_rewards_updated_at BEFORE UPDATE ON public.rewards FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_user_points_updated_at BEFORE UPDATE ON public.user_points FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Función para generar frecuencias automáticamente
CREATE OR REPLACE FUNCTION public.generate_route_frequencies(
  p_route_id UUID,
  p_frequency_minutes INTEGER,
  p_start_time TIME DEFAULT '05:00',
  p_end_time TIME DEFAULT '22:00'
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
$$;