-- Create routes and buses tables with RLS and triggers
-- 1) Routes table
CREATE TABLE IF NOT EXISTS public.routes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  origin TEXT NOT NULL,
  destination TEXT NOT NULL,
  distance_km NUMERIC,
  duration_minutes INTEGER,
  base_fare NUMERIC,
  frequency_minutes INTEGER,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.routes ENABLE ROW LEVEL SECURITY;

-- Policies for routes
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='routes' AND policyname='Anyone can view routes'
  ) THEN
    CREATE POLICY "Anyone can view routes"
    ON public.routes
    FOR SELECT
    USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='routes' AND policyname='Admins/managers/partners can insert routes'
  ) THEN
    CREATE POLICY "Admins/managers/partners can insert routes"
    ON public.routes
    FOR INSERT
    WITH CHECK (
      has_role(auth.uid(), 'administrator') OR has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'partner')
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='routes' AND policyname='Admins/managers/partners can update routes'
  ) THEN
    CREATE POLICY "Admins/managers/partners can update routes"
    ON public.routes
    FOR UPDATE
    USING (
      has_role(auth.uid(), 'administrator') OR has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'partner')
    );
  END IF;
END $$;

-- updated_at trigger for routes
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_routes_updated_at'
  ) THEN
    CREATE TRIGGER update_routes_updated_at
    BEFORE UPDATE ON public.routes
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_routes_status ON public.routes(status);
CREATE INDEX IF NOT EXISTS idx_routes_origin_destination ON public.routes(origin, destination);

-- 2) Buses table
CREATE TABLE IF NOT EXISTS public.buses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plate TEXT NOT NULL UNIQUE,
  alias TEXT,
  capacity INTEGER,
  status TEXT NOT NULL DEFAULT 'en_servicio',
  owner_id UUID NOT NULL,
  driver_id UUID,
  route_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Optional reference to routes (no ON DELETE to avoid accidental cascades)
ALTER TABLE public.buses
  ADD CONSTRAINT buses_route_fk FOREIGN KEY (route_id)
  REFERENCES public.routes(id) ON UPDATE CASCADE;

ALTER TABLE public.buses ENABLE ROW LEVEL SECURITY;

-- Policies for buses
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='buses' AND policyname='Allowed users can view buses'
  ) THEN
    CREATE POLICY "Allowed users can view buses"
    ON public.buses
    FOR SELECT
    USING (
      has_role(auth.uid(), 'administrator') OR has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'partner') OR owner_id = auth.uid() OR driver_id = auth.uid()
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='buses' AND policyname='Admins/managers/partners can insert buses'
  ) THEN
    CREATE POLICY "Admins/managers/partners can insert buses"
    ON public.buses
    FOR INSERT
    WITH CHECK (
      has_role(auth.uid(), 'administrator') OR has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'partner')
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='buses' AND policyname='Owners/admins/managers can update their buses'
  ) THEN
    CREATE POLICY "Owners/admins/managers can update their buses"
    ON public.buses
    FOR UPDATE
    USING (
      owner_id = auth.uid() OR has_role(auth.uid(), 'administrator') OR has_role(auth.uid(), 'manager')
    );
  END IF;
END $$;

-- updated_at trigger for buses
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_buses_updated_at'
  ) THEN
    CREATE TRIGGER update_buses_updated_at
    BEFORE UPDATE ON public.buses
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_buses_status ON public.buses(status);
CREATE INDEX IF NOT EXISTS idx_buses_owner ON public.buses(owner_id);
CREATE INDEX IF NOT EXISTS idx_buses_driver ON public.buses(driver_id);
CREATE INDEX IF NOT EXISTS idx_buses_route ON public.buses(route_id);