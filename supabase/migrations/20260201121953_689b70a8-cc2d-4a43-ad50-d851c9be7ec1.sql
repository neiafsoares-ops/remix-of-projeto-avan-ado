-- Add initial_prize column to pools table
ALTER TABLE public.pools 
ADD COLUMN initial_prize numeric DEFAULT 0;

COMMENT ON COLUMN public.pools.initial_prize IS 'Valor de premiacao inicial garantido pelo criador, somado a arrecadacao das taxas de inscricao';