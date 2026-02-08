-- Add allow_multiple_tickets column to torcida_mestre_pools
ALTER TABLE public.torcida_mestre_pools
ADD COLUMN IF NOT EXISTS allow_multiple_tickets boolean DEFAULT false;