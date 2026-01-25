-- Drop existing policy
DROP POLICY IF EXISTS "Admins and moderators can update participant status" ON pool_participants;

-- Create new policy that includes pool creators
CREATE POLICY "Admins moderators and pool owners can update participant status" 
ON pool_participants
FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) 
  OR has_role(auth.uid(), 'moderator'::app_role)
  OR EXISTS (
    SELECT 1 FROM pools 
    WHERE pools.id = pool_participants.pool_id 
    AND pools.created_by = auth.uid()
  )
);