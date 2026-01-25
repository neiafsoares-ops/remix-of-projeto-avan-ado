-- 2. Atualizar limite padrão de jogos por rodada de 10 para 15
ALTER TABLE public.rounds ALTER COLUMN match_limit SET DEFAULT 15;

-- 3. Criar função para contar rodadas totais do usuário (global, todos os bolões)
CREATE OR REPLACE FUNCTION public.count_user_rounds(_user_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(COUNT(*)::integer, 0)
  FROM public.rounds r
  INNER JOIN public.pools p ON r.pool_id = p.id
  WHERE p.created_by = _user_id;
$$;

-- 4. Atualizar RLS policy da tabela pools para permitir mestre_bolao criar pools
DROP POLICY IF EXISTS "Admins and moderators can create pools" ON public.pools;

CREATE POLICY "Users with pool creation permission can create pools"
ON public.pools
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'moderator'::app_role) OR
  has_role(auth.uid(), 'mestre_bolao'::app_role)
);