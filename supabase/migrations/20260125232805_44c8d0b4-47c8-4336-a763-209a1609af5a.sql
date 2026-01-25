-- Create storage bucket for team images
INSERT INTO storage.buckets (id, name, public)
VALUES ('team-images', 'team-images', true);

-- Allow authenticated users to upload images
CREATE POLICY "Authenticated users can upload team images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'team-images');

-- Allow anyone to view team images (public bucket)
CREATE POLICY "Anyone can view team images"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'team-images');

-- Allow authenticated users to update their uploads
CREATE POLICY "Authenticated users can update team images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'team-images');

-- Allow authenticated users to delete team images
CREATE POLICY "Authenticated users can delete team images"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'team-images');