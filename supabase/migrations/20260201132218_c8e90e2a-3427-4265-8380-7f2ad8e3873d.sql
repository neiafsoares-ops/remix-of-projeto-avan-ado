-- Trigger: Notificar admins quando novo participante solicita entrada
CREATE OR REPLACE FUNCTION public.notify_torcida_mestre_participant_request()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  pool_name TEXT;
  participant_name TEXT;
  admin_users UUID[];
BEGIN
  -- Get pool info
  SELECT name INTO pool_name 
  FROM public.torcida_mestre_pools WHERE id = NEW.pool_id;
  
  -- Get participant name
  SELECT public_id INTO participant_name FROM public.profiles WHERE id = NEW.user_id;
  
  -- Get all admin user IDs
  SELECT ARRAY_AGG(user_id) INTO admin_users
  FROM public.user_roles WHERE role = 'admin';
  
  -- Notify all admins
  IF admin_users IS NOT NULL THEN
    FOR i IN 1..array_length(admin_users, 1) LOOP
      IF admin_users[i] != NEW.user_id THEN
        PERFORM public.create_notification(
          admin_users[i],
          'torcida_mestre_participant_request',
          'Nova solicitação - Torcida Mestre',
          participant_name || ' solicitou participação no ' || pool_name,
          jsonb_build_object(
            'pool_id', NEW.pool_id, 
            'round_id', NEW.round_id,
            'participant_name', participant_name,
            'participant_id', NEW.id
          )
        );
      END IF;
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_torcida_mestre_participant_request
AFTER INSERT ON public.torcida_mestre_participants
FOR EACH ROW
EXECUTE FUNCTION public.notify_torcida_mestre_participant_request();

-- Trigger: Notificar usuario quando aprovado
CREATE OR REPLACE FUNCTION public.notify_torcida_mestre_participant_approved()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  pool_name TEXT;
  round_name TEXT;
BEGIN
  -- Only notify when status changes from pending to active
  IF OLD.status = 'pending' AND NEW.status = 'active' THEN
    -- Get pool name
    SELECT name INTO pool_name 
    FROM public.torcida_mestre_pools WHERE id = NEW.pool_id;
    
    -- Get round name
    SELECT COALESCE(name, 'Rodada ' || round_number) INTO round_name
    FROM public.torcida_mestre_rounds WHERE id = NEW.round_id;
    
    PERFORM public.create_notification(
      NEW.user_id,
      'torcida_mestre_approved',
      'Participação aprovada!',
      'Você foi aprovado para participar do ' || pool_name || ' - ' || round_name || '. Faça seu palpite!',
      jsonb_build_object(
        'pool_id', NEW.pool_id,
        'round_id', NEW.round_id,
        'participant_id', NEW.id
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_torcida_mestre_participant_approved
AFTER UPDATE ON public.torcida_mestre_participants
FOR EACH ROW
EXECUTE FUNCTION public.notify_torcida_mestre_participant_approved();