-- Create table for Quem Somos gallery images
CREATE TABLE public.quem_somos_gallery (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  position INTEGER NOT NULL CHECK (position >= 1 AND position <= 12),
  image_url TEXT NOT NULL,
  description VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(position)
);

-- Enable RLS
ALTER TABLE public.quem_somos_gallery ENABLE ROW LEVEL SECURITY;

-- Anyone can view gallery images
CREATE POLICY "Gallery images are viewable by everyone" 
ON public.quem_somos_gallery 
FOR SELECT 
USING (true);

-- Only admins can insert/update/delete
CREATE POLICY "Only admins can insert gallery images" 
ON public.quem_somos_gallery 
FOR INSERT 
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can update gallery images" 
ON public.quem_somos_gallery 
FOR UPDATE 
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can delete gallery images" 
ON public.quem_somos_gallery 
FOR DELETE 
USING (public.has_role(auth.uid(), 'admin'));

-- Create storage bucket for gallery images
INSERT INTO storage.buckets (id, name, public) 
VALUES ('quem-somos-gallery', 'quem-somos-gallery', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for gallery bucket
CREATE POLICY "Gallery images are publicly accessible" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'quem-somos-gallery');

CREATE POLICY "Admins can upload gallery images" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'quem-somos-gallery' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update gallery images" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'quem-somos-gallery' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete gallery images" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'quem-somos-gallery' AND public.has_role(auth.uid(), 'admin'));

-- Trigger for updated_at
CREATE TRIGGER update_quem_somos_gallery_updated_at
BEFORE UPDATE ON public.quem_somos_gallery
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();