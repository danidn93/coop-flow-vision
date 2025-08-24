-- Crear buckets de storage para imágenes
INSERT INTO storage.buckets (id, name, public) VALUES 
('routes', 'routes', true),
('buses', 'buses', true),
('rewards', 'rewards', true),
('user-tickets', 'user-tickets', false),
('cooperative-logos', 'cooperative-logos', true);

-- Políticas para rutas
CREATE POLICY "Anyone can view route images" ON storage.objects FOR SELECT USING (bucket_id = 'routes');
CREATE POLICY "Admins can manage route images" ON storage.objects FOR ALL USING (bucket_id = 'routes' AND (has_role(auth.uid(), 'administrator'::app_role) OR has_role(auth.uid(), 'manager'::app_role)));

-- Políticas para buses
CREATE POLICY "Anyone can view bus images" ON storage.objects FOR SELECT USING (bucket_id = 'buses');
CREATE POLICY "Admins can manage bus images" ON storage.objects FOR ALL USING (bucket_id = 'buses' AND (has_role(auth.uid(), 'administrator'::app_role) OR has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'partner'::app_role)));

-- Políticas para recompensas
CREATE POLICY "Anyone can view reward images" ON storage.objects FOR SELECT USING (bucket_id = 'rewards');
CREATE POLICY "Admins can manage reward images" ON storage.objects FOR ALL USING (bucket_id = 'rewards' AND has_role(auth.uid(), 'administrator'::app_role));

-- Políticas para tickets de usuarios
CREATE POLICY "Users can view their own tickets" ON storage.objects FOR SELECT USING (bucket_id = 'user-tickets' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can upload their own tickets" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'user-tickets' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Admins can view all tickets" ON storage.objects FOR SELECT USING (bucket_id = 'user-tickets' AND has_role(auth.uid(), 'administrator'::app_role));

-- Políticas para logos de cooperativa
CREATE POLICY "Anyone can view cooperative logos" ON storage.objects FOR SELECT USING (bucket_id = 'cooperative-logos');
CREATE POLICY "Admins can manage cooperative logos" ON storage.objects FOR ALL USING (bucket_id = 'cooperative-logos' AND has_role(auth.uid(), 'administrator'::app_role));