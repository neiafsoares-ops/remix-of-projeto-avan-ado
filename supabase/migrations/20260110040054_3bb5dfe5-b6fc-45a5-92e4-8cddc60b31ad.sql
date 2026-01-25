-- Drop the existing delete policy
DROP POLICY IF EXISTS "Only admin can delete pools" ON public.pools;

-- Create new delete policy that allows admins, moderators, and pool creators
CREATE POLICY "Admins moderators and pool creators can delete pools" 
ON public.pools 
FOR DELETE 
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'moderator'::app_role) OR 
  created_by = auth.uid()
);