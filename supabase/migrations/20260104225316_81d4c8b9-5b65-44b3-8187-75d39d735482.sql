-- Add image columns to matches table
ALTER TABLE public.matches
ADD COLUMN home_team_image TEXT,
ADD COLUMN away_team_image TEXT;

-- Create storage bucket for team images
INSERT INTO storage.buckets (id, name, public)
VALUES ('team-images', 'team-images', true);

-- Policy: Anyone can view team images (public bucket)
CREATE POLICY "Anyone can view team images"
ON storage.objects
FOR SELECT
USING (bucket_id = 'team-images');

-- Policy: Admins and moderators can upload team images
CREATE POLICY "Admins and moderators can upload team images"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'team-images' AND
  (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'moderator'))
);

-- Policy: Admins and moderators can update team images
CREATE POLICY "Admins and moderators can update team images"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'team-images' AND
  (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'moderator'))
);

-- Policy: Admins and moderators can delete team images
CREATE POLICY "Admins and moderators can delete team images"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'team-images' AND
  (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'moderator'))
);

-- Drop existing matches policies and recreate with proper permissions
DROP POLICY IF EXISTS "Admins and moderators can manage matches" ON public.matches;

-- Recreate: Admins, moderators, and pool creators can manage matches
CREATE POLICY "Admins moderators and pool creators can manage matches"
ON public.matches
FOR ALL
USING (
  has_role(auth.uid(), 'admin') OR 
  has_role(auth.uid(), 'moderator') OR
  EXISTS (
    SELECT 1 FROM public.pools 
    WHERE pools.id = matches.pool_id 
    AND pools.created_by = auth.uid()
  )
)
WITH CHECK (
  has_role(auth.uid(), 'admin') OR 
  has_role(auth.uid(), 'moderator') OR
  EXISTS (
    SELECT 1 FROM public.pools 
    WHERE pools.id = matches.pool_id 
    AND pools.created_by = auth.uid()
  )
);