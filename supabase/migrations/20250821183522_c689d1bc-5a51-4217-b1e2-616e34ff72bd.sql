-- Create storage buckets for chat attachments and incident photos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) VALUES 
('chat-attachments', 'chat-attachments', false, 10485760, ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf', 'text/plain', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']),
('incident-photos', 'incident-photos', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']);

-- Storage policies for chat attachments (private)
CREATE POLICY "Users can upload to their own chat threads" ON storage.objects
FOR INSERT WITH CHECK (
    bucket_id = 'chat-attachments' 
    AND auth.uid()::text = (storage.foldername(name))[1]
    AND (
        EXISTS (
            SELECT 1 FROM public.chat_threads ct 
            WHERE ct.client_id = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM public.bus_chats bc
            WHERE bc.owner_id = auth.uid() OR bc.driver_id = auth.uid()
        )
        OR has_role(auth.uid(), 'administrator'::app_role)
        OR has_role(auth.uid(), 'manager'::app_role)
    )
);

CREATE POLICY "Users can view their own chat attachments" ON storage.objects
FOR SELECT USING (
    bucket_id = 'chat-attachments' 
    AND (
        auth.uid()::text = (storage.foldername(name))[1]
        OR EXISTS (
            SELECT 1 FROM public.chat_threads ct 
            WHERE ct.client_id = auth.uid()
            AND ct.id::text = (storage.foldername(name))[2]
        )
        OR EXISTS (
            SELECT 1 FROM public.bus_chats bc
            WHERE (bc.owner_id = auth.uid() OR bc.driver_id = auth.uid())
            AND bc.id::text = (storage.foldername(name))[2]
        )
        OR has_role(auth.uid(), 'administrator'::app_role)
        OR has_role(auth.uid(), 'manager'::app_role)
    )
);

-- Storage policies for incident photos (public)
CREATE POLICY "Anyone can view incident photos" ON storage.objects
FOR SELECT USING (bucket_id = 'incident-photos');

CREATE POLICY "Authorized users can upload incident photos" ON storage.objects
FOR INSERT WITH CHECK (
    bucket_id = 'incident-photos' 
    AND (
        has_role(auth.uid(), 'driver'::app_role)
        OR has_role(auth.uid(), 'official'::app_role) 
        OR has_role(auth.uid(), 'administrator'::app_role)
        OR has_role(auth.uid(), 'manager'::app_role)
    )
);