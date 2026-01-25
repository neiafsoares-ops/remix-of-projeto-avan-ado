-- Adicionar coluna matches_per_round na tabela pools
ALTER TABLE public.pools ADD COLUMN IF NOT EXISTS matches_per_round integer DEFAULT 10;

-- Adicionar colunas de finalização na tabela rounds
ALTER TABLE public.rounds ADD COLUMN IF NOT EXISTS is_finalized boolean DEFAULT false;
ALTER TABLE public.rounds ADD COLUMN IF NOT EXISTS finalized_at timestamp with time zone;