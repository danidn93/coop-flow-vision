-- Add visual configuration fields to cooperative_config table
ALTER TABLE public.cooperative_config 
ADD COLUMN background_image_url TEXT,
ADD COLUMN primary_color TEXT DEFAULT '215 85% 20%',
ADD COLUMN secondary_color TEXT DEFAULT '215 40% 90%';