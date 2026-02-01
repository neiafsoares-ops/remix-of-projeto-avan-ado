-- Allow admins to insert participants for any user (for invitations)
CREATE POLICY "Admins can insert participants"
ON public.torcida_mestre_participants
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role));