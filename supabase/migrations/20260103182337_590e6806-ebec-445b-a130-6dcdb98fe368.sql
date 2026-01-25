-- Tabela de logs de auditoria
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  old_values JSONB,
  new_values JSONB,
  performed_by UUID,
  performed_at TIMESTAMPTZ DEFAULT NOW(),
  ip_address TEXT,
  user_agent TEXT
);

-- Índices para performance
CREATE INDEX idx_audit_logs_performed_at ON public.audit_logs(performed_at DESC);
CREATE INDEX idx_audit_logs_entity ON public.audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_performed_by ON public.audit_logs(performed_by);

-- Habilitar RLS
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Política: apenas admins podem ver logs
CREATE POLICY "Apenas admins podem ver logs de auditoria"
ON public.audit_logs
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Função SECURITY DEFINER para inserir logs (permite inserção via triggers)
CREATE OR REPLACE FUNCTION public.insert_audit_log(
  p_action TEXT,
  p_entity_type TEXT,
  p_entity_id TEXT DEFAULT NULL,
  p_old_values JSONB DEFAULT NULL,
  p_new_values JSONB DEFAULT NULL,
  p_performed_by UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO public.audit_logs (
    action, entity_type, entity_id, old_values, new_values, performed_by
  ) VALUES (
    p_action, p_entity_type, p_entity_id, p_old_values, p_new_values, COALESCE(p_performed_by, auth.uid())
  )
  RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$;

-- Trigger para registrar alterações de roles
CREATE OR REPLACE FUNCTION public.log_role_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.insert_audit_log(
      'ROLE_ASSIGNED',
      'user_roles',
      NEW.id::TEXT,
      NULL,
      jsonb_build_object('user_id', NEW.user_id, 'role', NEW.role),
      auth.uid()
    );
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM public.insert_audit_log(
      'ROLE_REMOVED',
      'user_roles',
      OLD.id::TEXT,
      jsonb_build_object('user_id', OLD.user_id, 'role', OLD.role),
      NULL,
      auth.uid()
    );
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER on_role_change
  AFTER INSERT OR DELETE ON public.user_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.log_role_changes();

-- Função para verificar e atribuir admin ao email seed
CREATE OR REPLACE FUNCTION public.check_and_assign_seed_admin()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verifica se é o email do admin seed (case insensitive)
  IF LOWER(NEW.email) = 'lucasmdp93@gmail.com' THEN
    -- Adiciona role de admin se ainda não existir
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger que roda após a criação do perfil (após handle_new_user)
CREATE OR REPLACE FUNCTION public.handle_seed_admin_on_signup()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Busca o email do usuário na tabela auth.users
  IF EXISTS (
    SELECT 1 FROM auth.users 
    WHERE id = NEW.id 
    AND LOWER(email) = 'lucasmdp93@gmail.com'
  ) THEN
    -- Adiciona role de admin
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_profile_created_check_seed_admin
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_seed_admin_on_signup();