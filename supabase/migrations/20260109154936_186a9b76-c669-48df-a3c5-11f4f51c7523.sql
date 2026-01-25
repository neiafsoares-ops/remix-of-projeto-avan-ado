-- Enable pg_trgm extension for fuzzy search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Create clubs table (Global Base)
CREATE TABLE public.clubs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  logo_url TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create index for fast fuzzy search
CREATE INDEX clubs_name_gin_idx ON public.clubs USING gin(name gin_trgm_ops);
CREATE INDEX clubs_name_idx ON public.clubs(name);

-- Enable RLS on clubs
ALTER TABLE public.clubs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for clubs
-- Anyone can view clubs
CREATE POLICY "Anyone can view clubs"
ON public.clubs
FOR SELECT
USING (true);

-- Only admins and moderators can create clubs
CREATE POLICY "Admins and moderators can create clubs"
ON public.clubs
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'moderator'::app_role)
);

-- Only admins can update clubs globally
CREATE POLICY "Admins can update clubs"
ON public.clubs
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Only admins can delete clubs
CREATE POLICY "Admins can delete clubs"
ON public.clubs
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for updated_at
CREATE TRIGGER update_clubs_updated_at
  BEFORE UPDATE ON public.clubs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create match_team_overrides table (Pool-specific customizations)
CREATE TABLE public.match_team_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pool_id UUID NOT NULL REFERENCES public.pools(id) ON DELETE CASCADE,
  club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  custom_logo_url TEXT NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  UNIQUE(pool_id, club_id)
);

-- Enable RLS on match_team_overrides
ALTER TABLE public.match_team_overrides ENABLE ROW LEVEL SECURITY;

-- RLS Policies for match_team_overrides
-- Anyone can view overrides (needed to display custom logos)
CREATE POLICY "Anyone can view match team overrides"
ON public.match_team_overrides
FOR SELECT
USING (true);

-- Pool owners, admins, and moderators can manage overrides
CREATE POLICY "Pool managers can create overrides"
ON public.match_team_overrides
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'moderator'::app_role) OR
  EXISTS (
    SELECT 1 FROM public.pools 
    WHERE pools.id = match_team_overrides.pool_id 
    AND pools.created_by = auth.uid()
  )
);

CREATE POLICY "Pool managers can update overrides"
ON public.match_team_overrides
FOR UPDATE
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'moderator'::app_role) OR
  EXISTS (
    SELECT 1 FROM public.pools 
    WHERE pools.id = match_team_overrides.pool_id 
    AND pools.created_by = auth.uid()
  )
);

CREATE POLICY "Pool managers can delete overrides"
ON public.match_team_overrides
FOR DELETE
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'moderator'::app_role) OR
  EXISTS (
    SELECT 1 FROM public.pools 
    WHERE pools.id = match_team_overrides.pool_id 
    AND pools.created_by = auth.uid()
  )
);

-- Add club reference columns to matches table
ALTER TABLE public.matches 
  ADD COLUMN home_club_id UUID REFERENCES public.clubs(id),
  ADD COLUMN away_club_id UUID REFERENCES public.clubs(id);

-- Create indexes for club references
CREATE INDEX matches_home_club_id_idx ON public.matches(home_club_id);
CREATE INDEX matches_away_club_id_idx ON public.matches(away_club_id);