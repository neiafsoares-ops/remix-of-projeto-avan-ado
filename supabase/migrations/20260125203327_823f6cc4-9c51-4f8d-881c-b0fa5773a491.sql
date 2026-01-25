-- ============================================
-- COMPLETE DATABASE SCHEMA FOR BOLÃO APP
-- ============================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. PROFILES TABLE (user profiles)
-- ============================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  public_id TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public profiles are viewable by everyone"
  ON public.profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, public_id, full_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data->>'public_id',
      'user_' || substr(NEW.id::text, 1, 8)
    ),
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- 2. APP ROLES (for admin/moderator permissions)
-- ============================================
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'mestre_bolao');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all roles"
  ON public.user_roles FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- ============================================
-- 3. POOLS TABLE (betting pools)
-- ============================================
CREATE TABLE public.pools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  rules TEXT,
  entry_fee DECIMAL(10,2) DEFAULT 0,
  admin_fee_percent DECIMAL(5,2) DEFAULT 0 CHECK (admin_fee_percent >= 0 AND admin_fee_percent <= 50),
  max_participants INTEGER,
  is_active BOOLEAN DEFAULT true,
  is_public BOOLEAN DEFAULT true,
  total_rounds INTEGER,
  matches_per_round INTEGER,
  cover_image TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.pools ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active pools"
  ON public.pools FOR SELECT
  USING (is_active = true OR created_by = auth.uid());

CREATE POLICY "Authenticated users can create pools"
  ON public.pools FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND created_by = auth.uid());

CREATE POLICY "Pool creators can update their pools"
  ON public.pools FOR UPDATE
  USING (created_by = auth.uid() OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'));

CREATE POLICY "Pool creators can delete their pools"
  ON public.pools FOR DELETE
  USING (created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- ============================================
-- 4. POOL PARTICIPANTS TABLE
-- ============================================
CREATE TYPE public.participant_status AS ENUM ('pending', 'active', 'blocked', 'inactive');

CREATE TABLE public.pool_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pool_id UUID REFERENCES public.pools(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  status participant_status DEFAULT 'pending',
  total_points INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (pool_id, user_id)
);

ALTER TABLE public.pool_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view pool participants"
  ON public.pool_participants FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can join pools"
  ON public.pool_participants FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Pool managers can update participants"
  ON public.pool_participants FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.pools 
      WHERE id = pool_id 
      AND (created_by = auth.uid() OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'))
    )
    OR user_id = auth.uid()
  );

-- ============================================
-- 5. ROUNDS TABLE
-- ============================================
CREATE TABLE public.rounds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pool_id UUID REFERENCES public.pools(id) ON DELETE CASCADE NOT NULL,
  round_number INTEGER NOT NULL,
  name TEXT NOT NULL,
  match_limit INTEGER,
  is_locked BOOLEAN DEFAULT false,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (pool_id, round_number)
);

ALTER TABLE public.rounds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view rounds"
  ON public.rounds FOR SELECT
  USING (true);

CREATE POLICY "Pool managers can create rounds"
  ON public.rounds FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.pools 
      WHERE id = pool_id 
      AND (created_by = auth.uid() OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'))
    )
  );

CREATE POLICY "Pool managers can update rounds"
  ON public.rounds FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.pools 
      WHERE id = pool_id 
      AND (created_by = auth.uid() OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'))
    )
  );

CREATE POLICY "Pool managers can delete rounds"
  ON public.rounds FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.pools 
      WHERE id = pool_id 
      AND (created_by = auth.uid() OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'))
    )
  );

-- ============================================
-- 6. MATCHES TABLE
-- ============================================
CREATE TABLE public.matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id UUID REFERENCES public.rounds(id) ON DELETE CASCADE NOT NULL,
  home_team TEXT NOT NULL,
  away_team TEXT NOT NULL,
  home_team_image TEXT,
  away_team_image TEXT,
  home_score INTEGER,
  away_score INTEGER,
  match_date TIMESTAMPTZ,
  prediction_deadline TIMESTAMPTZ,
  is_finished BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view matches"
  ON public.matches FOR SELECT
  USING (true);

CREATE POLICY "Pool managers can create matches"
  ON public.matches FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.rounds r
      JOIN public.pools p ON r.pool_id = p.id
      WHERE r.id = round_id 
      AND (p.created_by = auth.uid() OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'))
    )
  );

CREATE POLICY "Pool managers can update matches"
  ON public.matches FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.rounds r
      JOIN public.pools p ON r.pool_id = p.id
      WHERE r.id = round_id 
      AND (p.created_by = auth.uid() OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'))
    )
  );

CREATE POLICY "Pool managers can delete matches"
  ON public.matches FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.rounds r
      JOIN public.pools p ON r.pool_id = p.id
      WHERE r.id = round_id 
      AND (p.created_by = auth.uid() OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'))
    )
  );

-- ============================================
-- 7. PREDICTIONS TABLE
-- ============================================
CREATE TABLE public.predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID REFERENCES public.matches(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  home_score INTEGER NOT NULL,
  away_score INTEGER NOT NULL,
  points INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (match_id, user_id)
);

ALTER TABLE public.predictions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view predictions in their pools"
  ON public.predictions FOR SELECT
  USING (true);

CREATE POLICY "Active participants can create predictions"
  ON public.predictions FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM public.matches m
      JOIN public.rounds r ON m.round_id = r.id
      JOIN public.pool_participants pp ON pp.pool_id = r.pool_id
      WHERE m.id = match_id 
      AND pp.user_id = auth.uid() 
      AND pp.status = 'active'
    )
  );

CREATE POLICY "Users can update their own predictions"
  ON public.predictions FOR UPDATE
  USING (auth.uid() = user_id);

-- ============================================
-- 8. POOL INVITATIONS TABLE
-- ============================================
CREATE TABLE public.pool_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pool_id UUID REFERENCES public.pools(id) ON DELETE CASCADE NOT NULL,
  inviter_id UUID REFERENCES auth.users(id) NOT NULL,
  invitee_email TEXT,
  invitee_username TEXT,
  token TEXT UNIQUE,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ DEFAULT (now() + interval '7 days')
);

ALTER TABLE public.pool_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view invitations for their pools"
  ON public.pool_invitations FOR SELECT
  USING (
    inviter_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.pools WHERE id = pool_id AND created_by = auth.uid()
    )
  );

CREATE POLICY "Pool managers can create invitations"
  ON public.pool_invitations FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.pools 
      WHERE id = pool_id 
      AND (created_by = auth.uid() OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'))
    )
  );

CREATE POLICY "Pool managers can update invitations"
  ON public.pool_invitations FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.pools 
      WHERE id = pool_id 
      AND (created_by = auth.uid() OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'))
    )
  );

-- ============================================
-- 9. CLUBS TABLE (for autocomplete)
-- ============================================
CREATE TABLE public.clubs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  image_url TEXT,
  country TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.clubs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view clubs"
  ON public.clubs FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage clubs"
  ON public.clubs FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- ============================================
-- 10. MESTRE PLANS TABLE (subscription plans)
-- ============================================
CREATE TABLE public.mestre_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  plan_type TEXT DEFAULT 'free',
  max_pools INTEGER DEFAULT 1,
  max_participants_per_pool INTEGER DEFAULT 50,
  is_active BOOLEAN DEFAULT true,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);

ALTER TABLE public.mestre_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own plans"
  ON public.mestre_plans FOR SELECT
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage plans"
  ON public.mestre_plans FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- ============================================
-- TIMESTAMP UPDATE FUNCTION
-- ============================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_pools_updated_at
  BEFORE UPDATE ON public.pools
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_predictions_updated_at
  BEFORE UPDATE ON public.predictions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- ENABLE REALTIME
-- ============================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.pool_participants;
ALTER PUBLICATION supabase_realtime ADD TABLE public.predictions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.matches;