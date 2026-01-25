
-- Add columns to pools table for round limits
ALTER TABLE public.pools 
ADD COLUMN IF NOT EXISTS total_rounds INTEGER DEFAULT 10,
ADD COLUMN IF NOT EXISTS max_rounds INTEGER DEFAULT 20;

-- Create rounds table
CREATE TABLE public.rounds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pool_id UUID NOT NULL REFERENCES pools(id) ON DELETE CASCADE,
  round_number INTEGER NOT NULL,
  name TEXT,
  match_limit INTEGER NOT NULL DEFAULT 10,
  is_limit_approved BOOLEAN DEFAULT false,
  limit_approved_by UUID,
  limit_approved_at TIMESTAMP WITH TIME ZONE,
  extra_matches_allowed INTEGER DEFAULT 0,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(pool_id, round_number)
);

-- Create round_limit_requests table for exception requests
CREATE TABLE public.round_limit_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id UUID NOT NULL REFERENCES rounds(id) ON DELETE CASCADE,
  requested_by UUID NOT NULL,
  requested_extra_matches INTEGER NOT NULL,
  justification TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  reviewed_by UUID,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add round_id to matches table
ALTER TABLE public.matches 
ADD COLUMN IF NOT EXISTS round_id UUID REFERENCES rounds(id) ON DELETE SET NULL;

-- Enable RLS on new tables
ALTER TABLE public.rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.round_limit_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies for rounds
CREATE POLICY "Anyone can view rounds"
ON public.rounds FOR SELECT
USING (true);

CREATE POLICY "Admins moderators and pool owners can manage rounds"
ON public.rounds FOR ALL
USING (
  has_role(auth.uid(), 'admin'::app_role) 
  OR has_role(auth.uid(), 'moderator'::app_role)
  OR EXISTS (
    SELECT 1 FROM pools 
    WHERE pools.id = rounds.pool_id 
    AND pools.created_by = auth.uid()
  )
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) 
  OR has_role(auth.uid(), 'moderator'::app_role)
  OR EXISTS (
    SELECT 1 FROM pools 
    WHERE pools.id = rounds.pool_id 
    AND pools.created_by = auth.uid()
  )
);

-- RLS Policies for round_limit_requests
CREATE POLICY "Users can view own requests and admins can view all"
ON public.round_limit_requests FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role) 
  OR has_role(auth.uid(), 'moderator'::app_role)
  OR requested_by = auth.uid()
);

CREATE POLICY "Users can create limit requests"
ON public.round_limit_requests FOR INSERT
WITH CHECK (auth.uid() = requested_by);

CREATE POLICY "Admins and moderators can update requests"
ON public.round_limit_requests FOR UPDATE
USING (
  has_role(auth.uid(), 'admin'::app_role) 
  OR has_role(auth.uid(), 'moderator'::app_role)
);

-- Function to validate round limit (max 20 per pool)
CREATE OR REPLACE FUNCTION public.validate_round_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (SELECT COUNT(*) FROM rounds WHERE pool_id = NEW.pool_id) >= 20 THEN
    RAISE EXCEPTION 'Limite máximo de 20 rodadas por bolão atingido';
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger for round limit validation
CREATE TRIGGER check_round_limit
BEFORE INSERT ON public.rounds
FOR EACH ROW EXECUTE FUNCTION public.validate_round_limit();

-- Function to validate match limit per round
CREATE OR REPLACE FUNCTION public.validate_match_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_count INTEGER;
  max_allowed INTEGER;
BEGIN
  IF NEW.round_id IS NOT NULL THEN
    SELECT COUNT(*) INTO current_count 
    FROM matches WHERE round_id = NEW.round_id AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid);
    
    SELECT match_limit + COALESCE(extra_matches_allowed, 0) INTO max_allowed 
    FROM rounds WHERE id = NEW.round_id;
    
    IF current_count >= max_allowed THEN
      RAISE EXCEPTION 'Limite de jogos por rodada atingido (%). Solicite aprovação para adicionar mais.', max_allowed;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger for match limit validation
CREATE TRIGGER check_match_limit
BEFORE INSERT ON public.matches
FOR EACH ROW EXECUTE FUNCTION public.validate_match_limit();

-- Add updated_at trigger for rounds
CREATE TRIGGER update_rounds_updated_at
BEFORE UPDATE ON public.rounds
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for rounds and round_limit_requests
ALTER PUBLICATION supabase_realtime ADD TABLE public.rounds;
ALTER PUBLICATION supabase_realtime ADD TABLE public.round_limit_requests;
