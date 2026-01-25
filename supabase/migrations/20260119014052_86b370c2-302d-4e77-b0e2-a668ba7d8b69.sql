-- 1. Add missing columns to clubs table
ALTER TABLE public.clubs ADD COLUMN IF NOT EXISTS logo_url TEXT;
UPDATE public.clubs SET logo_url = image_url WHERE logo_url IS NULL;

-- 2. Add missing columns to pools table
ALTER TABLE public.pools ADD COLUMN IF NOT EXISTS total_rounds INTEGER DEFAULT 10;
ALTER TABLE public.pools ADD COLUMN IF NOT EXISTS matches_per_round INTEGER DEFAULT 10;

-- 3. Add missing columns to rounds table
ALTER TABLE public.rounds ADD COLUMN IF NOT EXISTS match_limit INTEGER DEFAULT 15;
ALTER TABLE public.rounds ADD COLUMN IF NOT EXISTS is_limit_approved BOOLEAN DEFAULT false;
ALTER TABLE public.rounds ADD COLUMN IF NOT EXISTS extra_matches_allowed INTEGER DEFAULT 0;
ALTER TABLE public.rounds ADD COLUMN IF NOT EXISTS is_finalized BOOLEAN DEFAULT false;
ALTER TABLE public.rounds ADD COLUMN IF NOT EXISTS finalized_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.rounds ADD COLUMN IF NOT EXISTS limit_approved_by UUID REFERENCES auth.users(id);
ALTER TABLE public.rounds ADD COLUMN IF NOT EXISTS limit_approved_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.rounds ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);

-- 4. Add missing columns to round_limit_requests table
ALTER TABLE public.round_limit_requests ADD COLUMN IF NOT EXISTS requested_by UUID REFERENCES auth.users(id);
ALTER TABLE public.round_limit_requests ADD COLUMN IF NOT EXISTS requested_extra_matches INTEGER DEFAULT 0;
ALTER TABLE public.round_limit_requests ADD COLUMN IF NOT EXISTS justification TEXT;
ALTER TABLE public.round_limit_requests ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES auth.users(id);
ALTER TABLE public.round_limit_requests ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.round_limit_requests ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE public.round_limit_requests ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Copy user_id to requested_by if needed
UPDATE public.round_limit_requests SET requested_by = user_id WHERE requested_by IS NULL;

-- 5. Add missing columns to audit_logs table
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS old_values JSONB;
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS new_values JSONB;
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS performed_by UUID REFERENCES auth.users(id);
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS performed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Copy existing data to new columns
UPDATE public.audit_logs SET old_values = old_data WHERE old_values IS NULL;
UPDATE public.audit_logs SET new_values = new_data WHERE new_values IS NULL;
UPDATE public.audit_logs SET performed_by = user_id WHERE performed_by IS NULL;
UPDATE public.audit_logs SET performed_at = created_at WHERE performed_at IS NULL;

-- 6. Create match_team_overrides table
CREATE TABLE IF NOT EXISTS public.match_team_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pool_id UUID REFERENCES public.pools(id) ON DELETE CASCADE NOT NULL,
  club_id UUID REFERENCES public.clubs(id) ON DELETE CASCADE NOT NULL,
  custom_logo_url TEXT NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  UNIQUE(pool_id, club_id)
);

ALTER TABLE public.match_team_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view overrides"
ON public.match_team_overrides FOR SELECT
USING (true);

CREATE POLICY "Admins and moderators can manage overrides"
ON public.match_team_overrides FOR ALL
USING (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'moderator')
);

-- 7. Create count_user_rounds function
CREATE OR REPLACE FUNCTION public.count_user_rounds(_user_id UUID)
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::INTEGER
  FROM public.rounds r
  JOIN public.pools p ON r.pool_id = p.id
  WHERE p.created_by = _user_id
$$;