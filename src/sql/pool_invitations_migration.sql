-- Migration: Pool Invitations System
-- Description: Create table for managing pool invitations with support for direct user invite and shareable links

-- Create pool_invitations table
CREATE TABLE IF NOT EXISTS public.pool_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pool_id UUID NOT NULL REFERENCES public.pools(id) ON DELETE CASCADE,
  invited_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  invited_by UUID NOT NULL REFERENCES auth.users(id),
  invite_token VARCHAR(64) UNIQUE,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'expired', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ DEFAULT (now() + INTERVAL '7 days'),
  accepted_at TIMESTAMPTZ,
  
  -- Ensure unique pending invitation per user per pool
  CONSTRAINT unique_pending_invitation UNIQUE (pool_id, invited_user_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_pool_invitations_pool_id ON public.pool_invitations(pool_id);
CREATE INDEX IF NOT EXISTS idx_pool_invitations_invited_user_id ON public.pool_invitations(invited_user_id);
CREATE INDEX IF NOT EXISTS idx_pool_invitations_invite_token ON public.pool_invitations(invite_token);
CREATE INDEX IF NOT EXISTS idx_pool_invitations_status ON public.pool_invitations(status);

-- Enable RLS
ALTER TABLE public.pool_invitations ENABLE ROW LEVEL SECURITY;

-- Function to check if user can manage pool invitations (admin, moderator, or pool creator)
CREATE OR REPLACE FUNCTION public.can_manage_pool_invitations(_user_id uuid, _pool_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    -- User is admin or moderator
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role IN ('admin', 'moderator')
  ) OR EXISTS (
    -- User is the pool creator
    SELECT 1 FROM public.pools WHERE id = _pool_id AND created_by = _user_id
  ) OR EXISTS (
    -- User is a pool participant with admin or moderator role in the pool
    SELECT 1 FROM public.pool_participants 
    WHERE pool_id = _pool_id 
    AND user_id = _user_id 
    AND role IN ('admin', 'moderator')
    AND status = 'active'
  );
$$;

-- Policy: Pool managers can view all invitations for their pools
CREATE POLICY "Pool managers can view invitations"
ON public.pool_invitations
FOR SELECT
TO authenticated
USING (
  public.can_manage_pool_invitations(auth.uid(), pool_id)
  OR invited_user_id = auth.uid()
);

-- Policy: Pool managers can create invitations
CREATE POLICY "Pool managers can create invitations"
ON public.pool_invitations
FOR INSERT
TO authenticated
WITH CHECK (
  public.can_manage_pool_invitations(auth.uid(), pool_id)
  AND invited_by = auth.uid()
);

-- Policy: Pool managers can update invitations (cancel)
CREATE POLICY "Pool managers can update invitations"
ON public.pool_invitations
FOR UPDATE
TO authenticated
USING (
  public.can_manage_pool_invitations(auth.uid(), pool_id)
  OR invited_user_id = auth.uid()
);

-- Policy: Pool managers can delete invitations
CREATE POLICY "Pool managers can delete invitations"
ON public.pool_invitations
FOR DELETE
TO authenticated
USING (
  public.can_manage_pool_invitations(auth.uid(), pool_id)
);

-- Function to generate unique invite token
CREATE OR REPLACE FUNCTION public.generate_invite_token()
RETURNS VARCHAR(64)
LANGUAGE plpgsql
AS $$
DECLARE
  token VARCHAR(64);
BEGIN
  token := encode(gen_random_bytes(32), 'hex');
  RETURN token;
END;
$$;

-- Function to accept invitation and create participant
CREATE OR REPLACE FUNCTION public.accept_pool_invitation(_invitation_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  invitation_record RECORD;
  pool_record RECORD;
  result json;
BEGIN
  -- Get invitation details
  SELECT * INTO invitation_record
  FROM public.pool_invitations
  WHERE id = _invitation_id
  AND invited_user_id = auth.uid()
  AND status = 'pending';
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Convite não encontrado ou já processado');
  END IF;
  
  -- Check if invitation expired
  IF invitation_record.expires_at < now() THEN
    UPDATE public.pool_invitations
    SET status = 'expired'
    WHERE id = _invitation_id;
    RETURN json_build_object('success', false, 'error', 'Convite expirado');
  END IF;
  
  -- Get pool details
  SELECT * INTO pool_record
  FROM public.pools
  WHERE id = invitation_record.pool_id;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Bolão não encontrado');
  END IF;
  
  -- Check if user is already a participant
  IF EXISTS (
    SELECT 1 FROM public.pool_participants
    WHERE pool_id = invitation_record.pool_id
    AND user_id = auth.uid()
  ) THEN
    -- Update invitation status
    UPDATE public.pool_invitations
    SET status = 'accepted', accepted_at = now()
    WHERE id = _invitation_id;
    RETURN json_build_object('success', true, 'message', 'Você já é participante deste bolão', 'pool_id', invitation_record.pool_id);
  END IF;
  
  -- Create participant entry
  INSERT INTO public.pool_participants (pool_id, user_id, status, role)
  VALUES (invitation_record.pool_id, auth.uid(), 'active', 'participant');
  
  -- Update invitation status
  UPDATE public.pool_invitations
  SET status = 'accepted', accepted_at = now()
  WHERE id = _invitation_id;
  
  RETURN json_build_object('success', true, 'message', 'Convite aceito com sucesso!', 'pool_id', invitation_record.pool_id);
END;
$$;

-- Function to accept invitation via token (for shareable links)
CREATE OR REPLACE FUNCTION public.accept_pool_invitation_by_token(_token varchar)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  invitation_record RECORD;
  pool_record RECORD;
BEGIN
  -- Get invitation details by token
  SELECT * INTO invitation_record
  FROM public.pool_invitations
  WHERE invite_token = _token
  AND invited_user_id IS NULL -- Link invitations don't have a specific user
  AND status = 'pending';
  
  IF NOT FOUND THEN
    -- Check if it's an expired token
    IF EXISTS (SELECT 1 FROM public.pool_invitations WHERE invite_token = _token) THEN
      RETURN json_build_object('success', false, 'error', 'Link de convite expirado ou já utilizado');
    END IF;
    RETURN json_build_object('success', false, 'error', 'Link de convite inválido');
  END IF;
  
  -- Check if invitation expired
  IF invitation_record.expires_at < now() THEN
    UPDATE public.pool_invitations
    SET status = 'expired'
    WHERE id = invitation_record.id;
    RETURN json_build_object('success', false, 'error', 'Link de convite expirado');
  END IF;
  
  -- Get pool details
  SELECT * INTO pool_record
  FROM public.pools
  WHERE id = invitation_record.pool_id;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Bolão não encontrado');
  END IF;
  
  -- Check if user is already a participant
  IF EXISTS (
    SELECT 1 FROM public.pool_participants
    WHERE pool_id = invitation_record.pool_id
    AND user_id = auth.uid()
  ) THEN
    RETURN json_build_object('success', true, 'message', 'Você já é participante deste bolão', 'pool_id', invitation_record.pool_id);
  END IF;
  
  -- Create participant entry
  INSERT INTO public.pool_participants (pool_id, user_id, status, role)
  VALUES (invitation_record.pool_id, auth.uid(), 'active', 'participant');
  
  RETURN json_build_object('success', true, 'message', 'Você entrou no bolão com sucesso!', 'pool_id', invitation_record.pool_id);
END;
$$;
