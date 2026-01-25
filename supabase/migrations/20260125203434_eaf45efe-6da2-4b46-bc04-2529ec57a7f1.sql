-- ============================================
-- FIX: Adjust columns to match existing code
-- ============================================

-- Fix audit_logs to match expected columns
ALTER TABLE public.audit_logs 
ADD COLUMN IF NOT EXISTS entity_type TEXT,
ADD COLUMN IF NOT EXISTS entity_id TEXT,
ADD COLUMN IF NOT EXISTS old_values JSONB,
ADD COLUMN IF NOT EXISTS new_values JSONB,
ADD COLUMN IF NOT EXISTS performed_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS performed_at TIMESTAMPTZ DEFAULT now();

-- Fix round_limit_requests to match expected columns
ALTER TABLE public.round_limit_requests
ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Update existing column in round_limit_requests (can't rename with IF NOT EXISTS, so we need to check)
-- Just drop and recreate if needed
-- Actually the migration already has approved_by and approved_at, just add the aliases/extra columns

-- Add pool_id to matches for easier querying
ALTER TABLE public.matches
ADD COLUMN IF NOT EXISTS pool_id UUID REFERENCES public.pools(id);

-- Create function/trigger to auto-populate pool_id on matches
CREATE OR REPLACE FUNCTION public.set_match_pool_id()
RETURNS TRIGGER AS $$
BEGIN
  SELECT pool_id INTO NEW.pool_id
  FROM public.rounds
  WHERE id = NEW.round_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE TRIGGER set_match_pool_id_trigger
  BEFORE INSERT ON public.matches
  FOR EACH ROW EXECUTE FUNCTION public.set_match_pool_id();