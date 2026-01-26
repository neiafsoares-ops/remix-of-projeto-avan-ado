-- Trigger function para notificar quando convite muda de status
CREATE OR REPLACE FUNCTION public.notify_on_invitation_response()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  pool_name TEXT;
  invitee_name TEXT;
BEGIN
  -- Só processa se status mudou para accepted ou rejected
  IF OLD.status = 'pending' AND NEW.status IN ('accepted', 'rejected') THEN
    
    -- Get pool name
    SELECT name INTO pool_name FROM public.pools WHERE id = NEW.pool_id;
    
    -- Get invitee name from username
    SELECT public_id INTO invitee_name FROM public.profiles 
    WHERE public_id = NEW.invitee_username;
    
    IF NEW.status = 'accepted' THEN
      PERFORM public.create_notification(
        NEW.inviter_id,
        'invitation_accepted',
        'Convite aceito!',
        invitee_name || ' aceitou seu convite para ' || pool_name,
        jsonb_build_object(
          'pool_id', NEW.pool_id, 
          'invitee_name', invitee_name,
          'invitation_id', NEW.id
        )
      );
    ELSIF NEW.status = 'rejected' THEN
      PERFORM public.create_notification(
        NEW.inviter_id,
        'invitation_rejected',
        'Convite recusado',
        invitee_name || ' recusou seu convite para ' || pool_name,
        jsonb_build_object(
          'pool_id', NEW.pool_id, 
          'invitee_name', invitee_name,
          'invitation_id', NEW.id
        )
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for invitation response
CREATE TRIGGER on_invitation_response
AFTER UPDATE ON public.pool_invitations
FOR EACH ROW
EXECUTE FUNCTION public.notify_on_invitation_response();

-- Trigger para notificar quando usuário se torna Mestre (INSERT em mestre_plans)
CREATE OR REPLACE FUNCTION public.notify_on_became_mestre()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_name TEXT;
  plan_display_name TEXT;
BEGIN
  -- Get user name
  SELECT public_id INTO user_name FROM public.profiles WHERE id = NEW.user_id;
  
  -- Get display name for plan type
  plan_display_name := CASE NEW.plan_type
    WHEN 'intermediario' THEN 'Intermediário'
    WHEN 'supremo' THEN 'Supremo'
    ELSE COALESCE(NEW.plan_type, 'Mestre')
  END;
  
  PERFORM public.create_notification(
    NEW.user_id,
    'became_mestre',
    'Parabéns! Você é Mestre do Bolão!',
    'Seu plano ' || plan_display_name || ' está ativo. Aproveite todos os benefícios!',
    jsonb_build_object(
      'plan_type', NEW.plan_type,
      'expires_at', NEW.expires_at,
      'plan_id', NEW.id
    )
  );
  
  RETURN NEW;
END;
$$;

-- Create trigger for new mestre
CREATE TRIGGER on_mestre_plan_created
AFTER INSERT ON public.mestre_plans
FOR EACH ROW
EXECUTE FUNCTION public.notify_on_became_mestre();

-- Função para verificar e notificar sobre planos expirando
CREATE OR REPLACE FUNCTION public.check_mestre_plan_expirations()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  plan RECORD;
  days_remaining INTEGER;
  notification_type TEXT;
  notification_title TEXT;
  notification_message TEXT;
  already_notified BOOLEAN;
  plan_display_name TEXT;
BEGIN
  -- Buscar todos os planos ativos
  FOR plan IN 
    SELECT 
      id as plan_id,
      user_id,
      expires_at,
      plan_type
    FROM public.mestre_plans
    WHERE is_active = true
    AND expires_at IS NOT NULL
    AND expires_at > now()
  LOOP
    days_remaining := EXTRACT(DAY FROM (plan.expires_at - now()));
    
    -- Get display name for plan type
    plan_display_name := CASE plan.plan_type
      WHEN 'intermediario' THEN 'Intermediário'
      WHEN 'supremo' THEN 'Supremo'
      ELSE COALESCE(plan.plan_type, 'Mestre')
    END;
    
    -- Determinar tipo de notificação baseado nos dias
    IF days_remaining = 30 THEN
      notification_type := 'plan_expiring_30';
      notification_title := 'Seu plano expira em 30 dias';
      notification_message := 'Renove seu plano ' || plan_display_name || ' para continuar aproveitando os benefícios!';
    ELSIF days_remaining = 15 THEN
      notification_type := 'plan_expiring_15';
      notification_title := 'Seu plano expira em 15 dias';
      notification_message := 'Não esqueça de renovar seu plano ' || plan_display_name || '!';
    ELSIF days_remaining = 7 THEN
      notification_type := 'plan_expiring_7';
      notification_title := 'Seu plano expira em 7 dias!';
      notification_message := 'Seu plano ' || plan_display_name || ' expira em breve. Renove agora!';
    ELSIF days_remaining = 1 THEN
      notification_type := 'plan_expiring_1';
      notification_title := 'Seu plano expira AMANHÃ!';
      notification_message := 'Último dia para renovar seu plano ' || plan_display_name || '!';
    ELSE
      CONTINUE;
    END IF;
    
    -- Verificar se já notificou para este tipo
    SELECT EXISTS (
      SELECT 1 FROM public.notifications 
      WHERE user_id = plan.user_id 
      AND type = notification_type
      AND data->>'plan_id' = plan.plan_id::text
    ) INTO already_notified;
    
    IF NOT already_notified THEN
      PERFORM public.create_notification(
        plan.user_id,
        notification_type,
        notification_title,
        notification_message,
        jsonb_build_object(
          'plan_id', plan.plan_id,
          'plan_type', plan.plan_type,
          'days_remaining', days_remaining,
          'expires_at', plan.expires_at
        )
      );
    END IF;
  END LOOP;
  
  -- Verificar planos que expiraram hoje
  FOR plan IN 
    SELECT 
      id as plan_id,
      user_id,
      expires_at,
      plan_type
    FROM public.mestre_plans
    WHERE expires_at <= now()
    AND expires_at > now() - INTERVAL '1 day'
  LOOP
    -- Get display name for plan type
    plan_display_name := CASE plan.plan_type
      WHEN 'intermediario' THEN 'Intermediário'
      WHEN 'supremo' THEN 'Supremo'
      ELSE COALESCE(plan.plan_type, 'Mestre')
    END;
    
    -- Verificar se já notificou
    SELECT EXISTS (
      SELECT 1 FROM public.notifications 
      WHERE user_id = plan.user_id 
      AND type = 'plan_expired'
      AND data->>'plan_id' = plan.plan_id::text
    ) INTO already_notified;
    
    IF NOT already_notified THEN
      PERFORM public.create_notification(
        plan.user_id,
        'plan_expired',
        'Seu plano expirou',
        'Seu plano ' || plan_display_name || ' expirou. Renove para continuar criando bolões!',
        jsonb_build_object(
          'plan_id', plan.plan_id,
          'expired_at', plan.expires_at
        )
      );
    END IF;
  END LOOP;
END;
$$;