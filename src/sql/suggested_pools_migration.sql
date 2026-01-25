-- =====================================================
-- MIGRAÇÃO: Sistema de Bolões Sugeridos (Sugestão Zapions)
-- Execute este SQL no Supabase Dashboard > SQL Editor
-- =====================================================

-- 1. TABELAS
-- =====================================================

-- Tabela de bolões sugeridos (templates criados pelo admin)
CREATE TABLE public.suggested_pools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL DEFAULT 'Sugestão Zapions',
  description TEXT,
  cover_image TEXT,
  total_rounds INTEGER NOT NULL DEFAULT 1,
  matches_per_round INTEGER NOT NULL DEFAULT 15,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Moderadores nomeados pelo admin para cada sugestão
CREATE TABLE public.suggested_pool_moderators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  suggested_pool_id UUID REFERENCES public.suggested_pools(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE(suggested_pool_id, user_id)
);

-- Rodadas do template
CREATE TABLE public.suggested_pool_rounds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  suggested_pool_id UUID REFERENCES public.suggested_pools(id) ON DELETE CASCADE NOT NULL,
  round_number INTEGER NOT NULL,
  name TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Jogos do template (gerenciados centralmente)
CREATE TABLE public.suggested_pool_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  suggested_pool_id UUID REFERENCES public.suggested_pools(id) ON DELETE CASCADE NOT NULL,
  round_id UUID REFERENCES public.suggested_pool_rounds(id) ON DELETE CASCADE NOT NULL,
  home_team TEXT NOT NULL,
  away_team TEXT NOT NULL,
  home_club_id UUID REFERENCES public.clubs(id),
  away_club_id UUID REFERENCES public.clubs(id),
  match_date TIMESTAMPTZ NOT NULL,
  prediction_deadline TIMESTAMPTZ NOT NULL,
  home_score INTEGER,
  away_score INTEGER,
  is_finished BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Instâncias criadas pelos Mestres a partir dos templates
CREATE TABLE public.mestre_pool_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  suggested_pool_id UUID REFERENCES public.suggested_pools(id) NOT NULL,
  pool_id UUID REFERENCES public.pools(id) ON DELETE CASCADE NOT NULL,
  mestre_user_id UUID REFERENCES auth.users(id) NOT NULL,
  rounds_consumed INTEGER NOT NULL,
  matches_per_round INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(suggested_pool_id, mestre_user_id)
);

-- 2. FUNÇÕES DE SEGURANÇA
-- =====================================================

-- Verifica se usuário é moderador de um suggested_pool
CREATE OR REPLACE FUNCTION public.is_suggested_pool_moderator(_pool_id UUID, _user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.suggested_pool_moderators
    WHERE suggested_pool_id = _pool_id
      AND user_id = _user_id
  )
$$;

-- Verifica se usuário pode editar jogos de um suggested_pool (admin ou moderador)
CREATE OR REPLACE FUNCTION public.can_edit_suggested_pool_matches(_pool_id UUID, _user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT (
    public.has_role(_user_id, 'admin')
    OR public.is_suggested_pool_moderator(_pool_id, _user_id)
  )
$$;

-- 3. HABILITAR RLS
-- =====================================================

ALTER TABLE public.suggested_pools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suggested_pool_moderators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suggested_pool_rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suggested_pool_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mestre_pool_instances ENABLE ROW LEVEL SECURITY;

-- 4. POLÍTICAS RLS - suggested_pools
-- =====================================================

-- Todos podem ver sugestões ativas
CREATE POLICY "Anyone can view active suggested pools"
  ON public.suggested_pools
  FOR SELECT
  USING (is_active = true);

-- Admins podem ver todas (incluindo inativas)
CREATE POLICY "Admins can view all suggested pools"
  ON public.suggested_pools
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Apenas admins podem criar
CREATE POLICY "Admins can create suggested pools"
  ON public.suggested_pools
  FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Apenas admins podem atualizar
CREATE POLICY "Admins can update suggested pools"
  ON public.suggested_pools
  FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Apenas admins podem deletar
CREATE POLICY "Admins can delete suggested pools"
  ON public.suggested_pools
  FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 5. POLÍTICAS RLS - suggested_pool_moderators
-- =====================================================

-- Admins podem ver todos os moderadores
CREATE POLICY "Admins can view all moderators"
  ON public.suggested_pool_moderators
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Moderadores podem ver que são moderadores
CREATE POLICY "Moderators can view own entries"
  ON public.suggested_pool_moderators
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Apenas admins podem adicionar moderadores
CREATE POLICY "Admins can add moderators"
  ON public.suggested_pool_moderators
  FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Apenas admins podem remover moderadores
CREATE POLICY "Admins can remove moderators"
  ON public.suggested_pool_moderators
  FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 6. POLÍTICAS RLS - suggested_pool_rounds
-- =====================================================

-- Todos podem ver rodadas
CREATE POLICY "Anyone can view suggested pool rounds"
  ON public.suggested_pool_rounds
  FOR SELECT
  USING (true);

-- Apenas admins podem criar rodadas
CREATE POLICY "Admins can create suggested pool rounds"
  ON public.suggested_pool_rounds
  FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Apenas admins podem atualizar rodadas
CREATE POLICY "Admins can update suggested pool rounds"
  ON public.suggested_pool_rounds
  FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Apenas admins podem deletar rodadas
CREATE POLICY "Admins can delete suggested pool rounds"
  ON public.suggested_pool_rounds
  FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 7. POLÍTICAS RLS - suggested_pool_matches
-- =====================================================

-- Todos podem ver jogos
CREATE POLICY "Anyone can view suggested pool matches"
  ON public.suggested_pool_matches
  FOR SELECT
  USING (true);

-- Admins e moderadores podem criar jogos
CREATE POLICY "Admins and moderators can create matches"
  ON public.suggested_pool_matches
  FOR INSERT
  TO authenticated
  WITH CHECK (public.can_edit_suggested_pool_matches(suggested_pool_id, auth.uid()));

-- Admins e moderadores podem atualizar jogos
CREATE POLICY "Admins and moderators can update matches"
  ON public.suggested_pool_matches
  FOR UPDATE
  TO authenticated
  USING (public.can_edit_suggested_pool_matches(suggested_pool_id, auth.uid()))
  WITH CHECK (public.can_edit_suggested_pool_matches(suggested_pool_id, auth.uid()));

-- Admins e moderadores podem deletar jogos
CREATE POLICY "Admins and moderators can delete matches"
  ON public.suggested_pool_matches
  FOR DELETE
  TO authenticated
  USING (public.can_edit_suggested_pool_matches(suggested_pool_id, auth.uid()));

-- 8. POLÍTICAS RLS - mestre_pool_instances
-- =====================================================

-- Admins podem ver todas as instâncias
CREATE POLICY "Admins can view all instances"
  ON public.mestre_pool_instances
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Mestres podem ver suas próprias instâncias
CREATE POLICY "Mestres can view own instances"
  ON public.mestre_pool_instances
  FOR SELECT
  TO authenticated
  USING (mestre_user_id = auth.uid());

-- Usuários autenticados podem criar suas próprias instâncias
CREATE POLICY "Users can create own instances"
  ON public.mestre_pool_instances
  FOR INSERT
  TO authenticated
  WITH CHECK (mestre_user_id = auth.uid());

-- Apenas o mestre pode deletar sua própria instância
CREATE POLICY "Mestres can delete own instances"
  ON public.mestre_pool_instances
  FOR DELETE
  TO authenticated
  USING (mestre_user_id = auth.uid());

-- 9. TRIGGERS PARA updated_at
-- =====================================================

-- Função genérica para atualizar updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para suggested_pools
CREATE TRIGGER update_suggested_pools_updated_at
  BEFORE UPDATE ON public.suggested_pools
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger para suggested_pool_rounds
CREATE TRIGGER update_suggested_pool_rounds_updated_at
  BEFORE UPDATE ON public.suggested_pool_rounds
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger para suggested_pool_matches
CREATE TRIGGER update_suggested_pool_matches_updated_at
  BEFORE UPDATE ON public.suggested_pool_matches
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 10. ÍNDICES DE PERFORMANCE
-- =====================================================

CREATE INDEX idx_suggested_pool_moderators_pool_id ON public.suggested_pool_moderators(suggested_pool_id);
CREATE INDEX idx_suggested_pool_moderators_user_id ON public.suggested_pool_moderators(user_id);
CREATE INDEX idx_suggested_pool_rounds_pool_id ON public.suggested_pool_rounds(suggested_pool_id);
CREATE INDEX idx_suggested_pool_matches_pool_id ON public.suggested_pool_matches(suggested_pool_id);
CREATE INDEX idx_suggested_pool_matches_round_id ON public.suggested_pool_matches(round_id);
CREATE INDEX idx_mestre_pool_instances_suggested_pool_id ON public.mestre_pool_instances(suggested_pool_id);
CREATE INDEX idx_mestre_pool_instances_mestre_user_id ON public.mestre_pool_instances(mestre_user_id);
CREATE INDEX idx_mestre_pool_instances_pool_id ON public.mestre_pool_instances(pool_id);

-- =====================================================
-- FIM DA MIGRAÇÃO
-- =====================================================
