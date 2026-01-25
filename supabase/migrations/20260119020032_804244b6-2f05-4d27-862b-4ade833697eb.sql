-- =====================================================
-- SUGGESTED POOLS SYSTEM - Complete Migration
-- =====================================================

-- 1. Create suggested_pools table (main templates)
CREATE TABLE IF NOT EXISTS public.suggested_pools (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    total_rounds INTEGER NOT NULL DEFAULT 10,
    matches_per_round INTEGER NOT NULL DEFAULT 10,
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 2. Create suggested_pool_moderators table
CREATE TABLE IF NOT EXISTS public.suggested_pool_moderators (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    suggested_pool_id UUID NOT NULL REFERENCES public.suggested_pools(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(suggested_pool_id, user_id)
);

-- 3. Create suggested_pool_rounds table
CREATE TABLE IF NOT EXISTS public.suggested_pool_rounds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    suggested_pool_id UUID NOT NULL REFERENCES public.suggested_pools(id) ON DELETE CASCADE,
    round_number INTEGER NOT NULL,
    name TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(suggested_pool_id, round_number)
);

-- 4. Create suggested_pool_matches table
CREATE TABLE IF NOT EXISTS public.suggested_pool_matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    suggested_pool_id UUID NOT NULL REFERENCES public.suggested_pools(id) ON DELETE CASCADE,
    round_id UUID NOT NULL REFERENCES public.suggested_pool_rounds(id) ON DELETE CASCADE,
    home_team TEXT NOT NULL,
    away_team TEXT NOT NULL,
    home_team_image TEXT,
    away_team_image TEXT,
    match_date TIMESTAMP WITH TIME ZONE NOT NULL,
    prediction_deadline TIMESTAMP WITH TIME ZONE NOT NULL,
    home_score INTEGER,
    away_score INTEGER,
    is_finished BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 5. Create mestre_pool_instances table (links templates to adopted pools)
CREATE TABLE IF NOT EXISTS public.mestre_pool_instances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    suggested_pool_id UUID NOT NULL REFERENCES public.suggested_pools(id) ON DELETE CASCADE,
    pool_id UUID NOT NULL REFERENCES public.pools(id) ON DELETE CASCADE,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(suggested_pool_id, pool_id)
);

-- =====================================================
-- SECURITY FUNCTIONS
-- =====================================================

-- Function to check if user is a moderator for a suggested pool
CREATE OR REPLACE FUNCTION public.is_suggested_pool_moderator(_user_id UUID, _suggested_pool_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.suggested_pool_moderators
        WHERE user_id = _user_id AND suggested_pool_id = _suggested_pool_id
    )
$$;

-- Function to check if user can edit suggested pool matches
CREATE OR REPLACE FUNCTION public.can_edit_suggested_pool_matches(_user_id UUID, _suggested_pool_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT (
        public.has_role(_user_id, 'admin') OR
        public.is_suggested_pool_moderator(_user_id, _suggested_pool_id)
    )
$$;

-- =====================================================
-- ENABLE RLS
-- =====================================================

ALTER TABLE public.suggested_pools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suggested_pool_moderators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suggested_pool_rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suggested_pool_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mestre_pool_instances ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- RLS POLICIES - suggested_pools
-- =====================================================

CREATE POLICY "Anyone can view active suggested pools"
ON public.suggested_pools FOR SELECT
USING (is_active = true OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert suggested pools"
ON public.suggested_pools FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update suggested pools"
ON public.suggested_pools FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete suggested pools"
ON public.suggested_pools FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));

-- =====================================================
-- RLS POLICIES - suggested_pool_moderators
-- =====================================================

CREATE POLICY "Admins can view all moderators"
ON public.suggested_pool_moderators FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Moderators can view their own assignments"
ON public.suggested_pool_moderators FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Admins can manage moderators"
ON public.suggested_pool_moderators FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- =====================================================
-- RLS POLICIES - suggested_pool_rounds
-- =====================================================

CREATE POLICY "Anyone can view suggested pool rounds"
ON public.suggested_pool_rounds FOR SELECT
USING (true);

CREATE POLICY "Admins and moderators can insert rounds"
ON public.suggested_pool_rounds FOR INSERT
WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR
    public.is_suggested_pool_moderator(auth.uid(), suggested_pool_id)
);

CREATE POLICY "Admins and moderators can update rounds"
ON public.suggested_pool_rounds FOR UPDATE
USING (
    public.has_role(auth.uid(), 'admin') OR
    public.is_suggested_pool_moderator(auth.uid(), suggested_pool_id)
);

CREATE POLICY "Admins can delete rounds"
ON public.suggested_pool_rounds FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));

-- =====================================================
-- RLS POLICIES - suggested_pool_matches
-- =====================================================

CREATE POLICY "Anyone can view suggested pool matches"
ON public.suggested_pool_matches FOR SELECT
USING (true);

CREATE POLICY "Admins and moderators can insert matches"
ON public.suggested_pool_matches FOR INSERT
WITH CHECK (
    public.can_edit_suggested_pool_matches(auth.uid(), suggested_pool_id)
);

CREATE POLICY "Admins and moderators can update matches"
ON public.suggested_pool_matches FOR UPDATE
USING (
    public.can_edit_suggested_pool_matches(auth.uid(), suggested_pool_id)
);

CREATE POLICY "Admins can delete matches"
ON public.suggested_pool_matches FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));

-- =====================================================
-- RLS POLICIES - mestre_pool_instances
-- =====================================================

CREATE POLICY "Anyone can view mestre pool instances"
ON public.mestre_pool_instances FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can create instances"
ON public.mestre_pool_instances FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Only admins can delete instances"
ON public.mestre_pool_instances FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));

-- =====================================================
-- TRIGGERS for updated_at
-- =====================================================

CREATE TRIGGER update_suggested_pools_updated_at
    BEFORE UPDATE ON public.suggested_pools
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_suggested_pool_rounds_updated_at
    BEFORE UPDATE ON public.suggested_pool_rounds
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_suggested_pool_matches_updated_at
    BEFORE UPDATE ON public.suggested_pool_matches
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- INDEXES for performance
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_suggested_pool_moderators_pool ON public.suggested_pool_moderators(suggested_pool_id);
CREATE INDEX IF NOT EXISTS idx_suggested_pool_moderators_user ON public.suggested_pool_moderators(user_id);
CREATE INDEX IF NOT EXISTS idx_suggested_pool_rounds_pool ON public.suggested_pool_rounds(suggested_pool_id);
CREATE INDEX IF NOT EXISTS idx_suggested_pool_matches_pool ON public.suggested_pool_matches(suggested_pool_id);
CREATE INDEX IF NOT EXISTS idx_suggested_pool_matches_round ON public.suggested_pool_matches(round_id);
CREATE INDEX IF NOT EXISTS idx_mestre_pool_instances_suggested ON public.mestre_pool_instances(suggested_pool_id);
CREATE INDEX IF NOT EXISTS idx_mestre_pool_instances_pool ON public.mestre_pool_instances(pool_id);