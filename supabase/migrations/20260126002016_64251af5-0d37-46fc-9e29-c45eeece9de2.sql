-- Create notifications table
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT,
  data JSONB DEFAULT '{}'::jsonb,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  read_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes for performance
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_is_read ON public.notifications(user_id, is_read);
CREATE INDEX idx_notifications_created_at ON public.notifications(user_id, created_at DESC);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own notifications"
ON public.notifications FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
ON public.notifications FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notifications"
ON public.notifications FOR DELETE
USING (auth.uid() = user_id);

-- Allow system to insert notifications (using service role or triggers)
CREATE POLICY "System can insert notifications"
ON public.notifications FOR INSERT
WITH CHECK (true);

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Helper function to create notifications
CREATE OR REPLACE FUNCTION public.create_notification(
  p_user_id UUID,
  p_type TEXT,
  p_title TEXT,
  p_message TEXT DEFAULT NULL,
  p_data JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_id UUID;
BEGIN
  INSERT INTO public.notifications (user_id, type, title, message, data)
  VALUES (p_user_id, p_type, p_title, p_message, p_data)
  RETURNING id INTO new_id;
  RETURN new_id;
END;
$$;

-- Trigger function for new pool invitations
CREATE OR REPLACE FUNCTION public.notify_on_invitation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  invitee_user_id UUID;
  pool_name TEXT;
  inviter_name TEXT;
BEGIN
  -- Get pool name
  SELECT name INTO pool_name FROM public.pools WHERE id = NEW.pool_id;
  
  -- Get inviter name
  SELECT public_id INTO inviter_name FROM public.profiles WHERE id = NEW.inviter_id;
  
  -- Get invitee user_id from username
  SELECT id INTO invitee_user_id FROM public.profiles WHERE public_id = NEW.invitee_username;
  
  IF invitee_user_id IS NOT NULL THEN
    PERFORM public.create_notification(
      invitee_user_id,
      'invitation_received',
      'Convite para bolão',
      inviter_name || ' convidou você para ' || pool_name,
      jsonb_build_object('pool_id', NEW.pool_id, 'inviter_name', inviter_name, 'invitation_id', NEW.id)
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for invitations
CREATE TRIGGER on_invitation_created
AFTER INSERT ON public.pool_invitations
FOR EACH ROW
EXECUTE FUNCTION public.notify_on_invitation();

-- Trigger function for new participants
CREATE OR REPLACE FUNCTION public.notify_on_new_participant()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  pool_creator_id UUID;
  pool_name TEXT;
  participant_name TEXT;
BEGIN
  -- Get pool info
  SELECT created_by, name INTO pool_creator_id, pool_name 
  FROM public.pools WHERE id = NEW.pool_id;
  
  -- Get participant name
  SELECT public_id INTO participant_name FROM public.profiles WHERE id = NEW.user_id;
  
  -- Only notify if it's not the creator joining their own pool
  IF pool_creator_id IS NOT NULL AND pool_creator_id != NEW.user_id THEN
    PERFORM public.create_notification(
      pool_creator_id,
      'new_participant',
      'Novo participante',
      participant_name || ' entrou no seu bolão ' || pool_name,
      jsonb_build_object('pool_id', NEW.pool_id, 'participant_name', participant_name, 'participant_id', NEW.user_id)
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for new participants
CREATE TRIGGER on_participant_joined
AFTER INSERT ON public.pool_participants
FOR EACH ROW
EXECUTE FUNCTION public.notify_on_new_participant();