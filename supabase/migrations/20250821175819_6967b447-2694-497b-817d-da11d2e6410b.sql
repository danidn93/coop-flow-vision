-- Create chat and incident related tables

-- Chat threads for client support
CREATE TABLE public.chat_threads (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    client_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'closed', 'archived')),
    subject TEXT,
    last_message_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Chat messages for client support and driver communication
CREATE TABLE public.chat_messages (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    thread_id UUID REFERENCES public.chat_threads(id) ON DELETE CASCADE,
    bus_chat_id UUID, -- For driver-owner chats
    sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    message_type TEXT NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'file', 'system', 'quick_action')),
    content TEXT NOT NULL,
    metadata JSONB DEFAULT '{}', -- For storing additional data like file URLs, quick actions, etc.
    read_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Bus chats for owner-driver 1:1 communication
CREATE TABLE public.bus_chats (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    bus_id TEXT NOT NULL, -- Reference to actual bus (placa/plate)
    owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    driver_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(bus_id, owner_id, driver_id)
);

-- Road incidents
CREATE TABLE public.road_incidents (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    reporter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    incident_type TEXT NOT NULL CHECK (incident_type IN ('accidente', 'cierre_via', 'manifestacion', 'construccion', 'multa', 'revision', 'otro')),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    location_description TEXT NOT NULL,
    severity TEXT NOT NULL DEFAULT 'media' CHECK (severity IN ('baja', 'media', 'alta', 'critica')),
    affected_routes TEXT[] DEFAULT '{}', -- Array of route names
    status TEXT NOT NULL DEFAULT 'activo' CHECK (status IN ('activo', 'resuelto', 'cerrado')),
    coordinates POINT, -- Optional GPS coordinates
    photos TEXT[] DEFAULT '{}', -- Array of photo URLs
    moderator_id UUID REFERENCES auth.users(id),
    moderated_at TIMESTAMP WITH TIME ZONE,
    resolved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Incident audit log
CREATE TABLE public.incident_audit_log (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    incident_id UUID NOT NULL REFERENCES public.road_incidents(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    action TEXT NOT NULL CHECK (action IN ('created', 'updated', 'moderated', 'resolved', 'closed')),
    changes JSONB DEFAULT '{}',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- User presence for real-time features
CREATE TABLE public.user_presence (
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    status TEXT NOT NULL DEFAULT 'offline' CHECK (status IN ('online', 'away', 'offline')),
    last_seen_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    bus_chat_id UUID REFERENCES public.bus_chats(id) ON DELETE SET NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- FAQ bot intents and responses
CREATE TABLE public.faq_intents (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    intent_name TEXT NOT NULL UNIQUE,
    keywords TEXT[] NOT NULL DEFAULT '{}',
    response_template TEXT NOT NULL,
    requires_params BOOLEAN DEFAULT false,
    param_types JSONB DEFAULT '{}', -- Define what parameters are needed
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Insert default FAQ intents
INSERT INTO public.faq_intents (intent_name, keywords, response_template, requires_params, param_types) VALUES
('next_bus', ARRAY['proximo bus', 'siguiente bus', 'cuando sale', 'horario', 'bus en'], 
 'El próximo bus desde {{origin}} sale aproximadamente a las {{time}}. Los horarios son estimados.',
 true, '{"origin": "string"}'),
('fare_inquiry', ARRAY['precio', 'tarifa', 'cuesta', 'valor', 'pasaje'],
 'La tarifa desde {{origin}} hasta {{destination}} es de ${{fare}}.',
 true, '{"origin": "string", "destination": "string"}'),
('eta_inquiry', ARRAY['cuanto falta', 'eta', 'tiempo llegada', 'cuando llega'],
 'El tiempo estimado de llegada desde {{origin}} hasta {{destination}} es de {{eta}} minutos.',
 true, '{"origin": "string", "destination": "string"}'),
('general_info', ARRAY['informacion', 'ayuda', 'contacto', 'servicios'],
 'Cooperativa de Transporte Mariscal Sucre ofrece servicios interprovinciales. Para más información contacta a nuestras oficinas.',
 false, '{}');

-- Enable Row Level Security
ALTER TABLE public.chat_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bus_chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.road_incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incident_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_presence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faq_intents ENABLE ROW LEVEL SECURITY;

-- RLS Policies for chat_threads
CREATE POLICY "Users can view their own chat threads" ON public.chat_threads
    FOR SELECT USING (auth.uid() = client_id OR has_role(auth.uid(), 'administrator'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "Users can create their own chat threads" ON public.chat_threads
    FOR INSERT WITH CHECK (auth.uid() = client_id);

CREATE POLICY "Users can update their own chat threads" ON public.chat_threads
    FOR UPDATE USING (auth.uid() = client_id OR has_role(auth.uid(), 'administrator'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

-- RLS Policies for chat_messages
CREATE POLICY "Users can view messages in their threads" ON public.chat_messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.chat_threads ct 
            WHERE ct.id = chat_messages.thread_id 
            AND (ct.client_id = auth.uid() OR has_role(auth.uid(), 'administrator'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
        )
        OR
        EXISTS (
            SELECT 1 FROM public.bus_chats bc
            WHERE bc.id = chat_messages.bus_chat_id
            AND (bc.owner_id = auth.uid() OR bc.driver_id = auth.uid())
        )
    );

CREATE POLICY "Users can create messages in their threads" ON public.chat_messages
    FOR INSERT WITH CHECK (
        auth.uid() = sender_id AND (
            EXISTS (
                SELECT 1 FROM public.chat_threads ct 
                WHERE ct.id = chat_messages.thread_id 
                AND (ct.client_id = auth.uid() OR has_role(auth.uid(), 'administrator'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
            )
            OR
            EXISTS (
                SELECT 1 FROM public.bus_chats bc
                WHERE bc.id = chat_messages.bus_chat_id
                AND (bc.owner_id = auth.uid() OR bc.driver_id = auth.uid())
            )
        )
    );

-- RLS Policies for bus_chats
CREATE POLICY "Owner and driver can view their bus chat" ON public.bus_chats
    FOR SELECT USING (owner_id = auth.uid() OR driver_id = auth.uid());

CREATE POLICY "Owner can create bus chats" ON public.bus_chats
    FOR INSERT WITH CHECK (has_role(auth.uid(), 'partner'::app_role) OR has_role(auth.uid(), 'administrator'::app_role));

CREATE POLICY "Owner and driver can update their bus chat" ON public.bus_chats
    FOR UPDATE USING (owner_id = auth.uid() OR driver_id = auth.uid());

-- RLS Policies for road_incidents
CREATE POLICY "Anyone can view active incidents" ON public.road_incidents
    FOR SELECT USING (status IN ('activo', 'resuelto'));

CREATE POLICY "Drivers and officials can create incidents" ON public.road_incidents
    FOR INSERT WITH CHECK (has_role(auth.uid(), 'driver'::app_role) OR has_role(auth.uid(), 'official'::app_role) OR has_role(auth.uid(), 'administrator'::app_role));

CREATE POLICY "Moderators can update incidents" ON public.road_incidents
    FOR UPDATE USING (has_role(auth.uid(), 'administrator'::app_role) OR has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'president'::app_role));

-- RLS Policies for incident_audit_log
CREATE POLICY "Moderators can view audit logs" ON public.incident_audit_log
    FOR SELECT USING (has_role(auth.uid(), 'administrator'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "System can create audit logs" ON public.incident_audit_log
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policies for user_presence
CREATE POLICY "Users can view presence in their chats" ON public.user_presence
    FOR SELECT USING (
        user_id = auth.uid() 
        OR EXISTS (
            SELECT 1 FROM public.bus_chats bc 
            WHERE bc.id = user_presence.bus_chat_id 
            AND (bc.owner_id = auth.uid() OR bc.driver_id = auth.uid())
        )
    );

CREATE POLICY "Users can update their own presence" ON public.user_presence
    FOR ALL USING (user_id = auth.uid());

-- RLS Policies for faq_intents (read-only for most users)
CREATE POLICY "Anyone can view FAQ intents" ON public.faq_intents
    FOR SELECT USING (true);

CREATE POLICY "Admins can manage FAQ intents" ON public.faq_intents
    FOR ALL USING (has_role(auth.uid(), 'administrator'::app_role));

-- Create indexes for performance
CREATE INDEX idx_chat_threads_client_id ON public.chat_threads(client_id);
CREATE INDEX idx_chat_threads_status ON public.chat_threads(status);
CREATE INDEX idx_chat_messages_thread_id ON public.chat_messages(thread_id);
CREATE INDEX idx_chat_messages_bus_chat_id ON public.chat_messages(bus_chat_id);
CREATE INDEX idx_chat_messages_created_at ON public.chat_messages(created_at DESC);
CREATE INDEX idx_bus_chats_bus_id ON public.bus_chats(bus_id);
CREATE INDEX idx_bus_chats_owner_id ON public.bus_chats(owner_id);
CREATE INDEX idx_bus_chats_driver_id ON public.bus_chats(driver_id);
CREATE INDEX idx_road_incidents_status ON public.road_incidents(status);
CREATE INDEX idx_road_incidents_created_at ON public.road_incidents(created_at DESC);
CREATE INDEX idx_road_incidents_affected_routes ON public.road_incidents USING GIN(affected_routes);
CREATE INDEX idx_incident_audit_log_incident_id ON public.incident_audit_log(incident_id);
CREATE INDEX idx_user_presence_status ON public.user_presence(status);
CREATE INDEX idx_faq_intents_keywords ON public.faq_intents USING GIN(keywords);

-- Create triggers for updated_at
CREATE TRIGGER update_chat_threads_updated_at
    BEFORE UPDATE ON public.chat_threads
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_bus_chats_updated_at
    BEFORE UPDATE ON public.bus_chats
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_road_incidents_updated_at
    BEFORE UPDATE ON public.road_incidents
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_presence_updated_at
    BEFORE UPDATE ON public.user_presence
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_faq_intents_updated_at
    BEFORE UPDATE ON public.faq_intents
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for all chat and incident tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_threads;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.bus_chats;
ALTER PUBLICATION supabase_realtime ADD TABLE public.road_incidents;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_presence;

-- Set replica identity for realtime updates
ALTER TABLE public.chat_threads REPLICA IDENTITY FULL;
ALTER TABLE public.chat_messages REPLICA IDENTITY FULL;
ALTER TABLE public.bus_chats REPLICA IDENTITY FULL;
ALTER TABLE public.road_incidents REPLICA IDENTITY FULL;
ALTER TABLE public.user_presence REPLICA IDENTITY FULL;