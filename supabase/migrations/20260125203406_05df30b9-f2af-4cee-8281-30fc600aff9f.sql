-- ============================================
-- ADDITIONAL SCHEMA ELEMENTS (to match existing code)
-- ============================================

-- Add missing column to predictions
ALTER TABLE public.predictions 
ADD COLUMN IF NOT EXISTS points_earned INTEGER DEFAULT 0;

-- Add missing columns to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS numeric_id SERIAL;

-- Add missing columns to rounds
ALTER TABLE public.rounds 
ADD COLUMN IF NOT EXISTS is_limit_approved BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS extra_matches_allowed INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_finalized BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS finalized_at TIMESTAMPTZ;

-- Create round_limit_requests table
CREATE TABLE public.round_limit_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id UUID REFERENCES public.rounds(id) ON DELETE CASCADE NOT NULL,
  requested_by UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  requested_extra_matches INTEGER NOT NULL,
  justification TEXT,
  status TEXT DEFAULT 'pending',
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.round_limit_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view limit requests for their pools"
  ON public.round_limit_requests FOR SELECT
  USING (true);

CREATE POLICY "Pool managers can manage limit requests"
  ON public.round_limit_requests FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.rounds r
      JOIN public.pools p ON r.pool_id = p.id
      WHERE r.id = round_id 
      AND (p.created_by = auth.uid() OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'))
    )
    OR requested_by = auth.uid()
  );

-- Create audit_logs table
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action TEXT NOT NULL,
  table_name TEXT,
  record_id UUID,
  user_id UUID REFERENCES auth.users(id),
  old_data JSONB,
  new_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view audit logs"
  ON public.audit_logs FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "System can insert audit logs"
  ON public.audit_logs FOR INSERT
  WITH CHECK (true);

-- Create suggested_pools table
CREATE TABLE public.suggested_pools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  competition_type TEXT,
  status TEXT DEFAULT 'pending',
  suggested_by UUID REFERENCES auth.users(id),
  approved_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.suggested_pools ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view approved suggested pools"
  ON public.suggested_pools FOR SELECT
  USING (status = 'approved' OR suggested_by = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated users can suggest pools"
  ON public.suggested_pools FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage suggested pools"
  ON public.suggested_pools FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

-- Create suggested_pool_matches table
CREATE TABLE public.suggested_pool_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  suggested_pool_id UUID REFERENCES public.suggested_pools(id) ON DELETE CASCADE NOT NULL,
  home_team TEXT NOT NULL,
  away_team TEXT NOT NULL,
  match_date TIMESTAMPTZ,
  round_number INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.suggested_pool_matches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view suggested pool matches"
  ON public.suggested_pool_matches FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage suggested pool matches"
  ON public.suggested_pool_matches FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- Create function to count user rounds
CREATE OR REPLACE FUNCTION public.count_user_rounds(user_uuid UUID)
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(COUNT(*)::INTEGER, 0)
  FROM public.rounds r
  JOIN public.pools p ON r.pool_id = p.id
  WHERE p.created_by = user_uuid
$$;

-- Create function to insert audit log
CREATE OR REPLACE FUNCTION public.insert_audit_log(
  p_action TEXT,
  p_table_name TEXT,
  p_record_id UUID,
  p_old_data JSONB DEFAULT NULL,
  p_new_data JSONB DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_id UUID;
BEGIN
  INSERT INTO public.audit_logs (action, table_name, record_id, user_id, old_data, new_data)
  VALUES (p_action, p_table_name, p_record_id, auth.uid(), p_old_data, p_new_data)
  RETURNING id INTO new_id;
  RETURN new_id;
END;
$$;