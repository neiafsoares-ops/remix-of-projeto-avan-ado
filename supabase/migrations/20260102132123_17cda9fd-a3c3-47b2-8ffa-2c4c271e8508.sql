-- Enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'participant');

-- Enum for participant status in pools
CREATE TYPE public.participant_status AS ENUM ('pending', 'active', 'blocked', 'inactive');

-- Profiles table for user public data
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  public_id TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- User roles table (separate from profiles for security)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'participant',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  UNIQUE(user_id, role)
);

-- Pools (Bolões) table
CREATE TABLE public.pools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  rules TEXT,
  entry_fee DECIMAL(10,2) DEFAULT 0,
  max_participants INTEGER,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Pool participants
CREATE TABLE public.pool_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pool_id UUID REFERENCES public.pools(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  status participant_status DEFAULT 'pending' NOT NULL,
  total_points INTEGER DEFAULT 0,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  UNIQUE(pool_id, user_id)
);

-- Matches table
CREATE TABLE public.matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pool_id UUID REFERENCES public.pools(id) ON DELETE CASCADE NOT NULL,
  home_team TEXT NOT NULL,
  away_team TEXT NOT NULL,
  home_score INTEGER,
  away_score INTEGER,
  match_date TIMESTAMP WITH TIME ZONE NOT NULL,
  prediction_deadline TIMESTAMP WITH TIME ZONE NOT NULL,
  is_finished BOOLEAN DEFAULT false,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Predictions table
CREATE TABLE public.predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID REFERENCES public.matches(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  home_score INTEGER NOT NULL,
  away_score INTEGER NOT NULL,
  points_earned INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  UNIQUE(match_id, user_id)
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pool_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.predictions ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Function to calculate prediction points
CREATE OR REPLACE FUNCTION public.calculate_prediction_points(
  pred_home INTEGER,
  pred_away INTEGER,
  actual_home INTEGER,
  actual_away INTEGER
)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Exact score: 5 points
  IF pred_home = actual_home AND pred_away = actual_away THEN
    RETURN 5;
  END IF;
  
  -- Correct winner/draw: 2 points
  IF (pred_home > pred_away AND actual_home > actual_away) OR
     (pred_home < pred_away AND actual_home < actual_away) OR
     (pred_home = pred_away AND actual_home = actual_away) THEN
    RETURN 2;
  END IF;
  
  -- One team score correct: 1 point
  IF pred_home = actual_home OR pred_away = actual_away THEN
    RETURN 1;
  END IF;
  
  RETURN 0;
END;
$$;

-- Trigger to update predictions when match result is entered
CREATE OR REPLACE FUNCTION public.update_predictions_on_match_result()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.is_finished = true AND NEW.home_score IS NOT NULL AND NEW.away_score IS NOT NULL THEN
    -- Update points for all predictions of this match
    UPDATE public.predictions
    SET points_earned = public.calculate_prediction_points(
      home_score, away_score, NEW.home_score, NEW.away_score
    ),
    updated_at = NOW()
    WHERE match_id = NEW.id;
    
    -- Update total points for all participants in the pool
    UPDATE public.pool_participants pp
    SET total_points = (
      SELECT COALESCE(SUM(p.points_earned), 0)
      FROM public.predictions p
      JOIN public.matches m ON p.match_id = m.id
      WHERE m.pool_id = NEW.pool_id AND p.user_id = pp.user_id
    ),
    updated_at = NOW()
    WHERE pp.pool_id = NEW.pool_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_match_result_update
AFTER UPDATE ON public.matches
FOR EACH ROW
EXECUTE FUNCTION public.update_predictions_on_match_result();

-- Trigger to create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, public_id, full_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'public_id', 'user_' || LEFT(NEW.id::text, 8)),
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', '')
  );
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'participant');
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();

-- Profiles policies
CREATE POLICY "Profiles are viewable by everyone"
ON public.profiles FOR SELECT
USING (true);

CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE
USING (auth.uid() = id);

-- User roles policies
CREATE POLICY "Users can view own roles"
ON public.user_roles FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all roles"
ON public.user_roles FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Pools policies
CREATE POLICY "Anyone can view active pools"
ON public.pools FOR SELECT
USING (is_active = true);

CREATE POLICY "Admins and moderators can create pools"
ON public.pools FOR INSERT
WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'moderator')
);

CREATE POLICY "Pool creator or admin can update"
ON public.pools FOR UPDATE
USING (
  created_by = auth.uid() OR 
  public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Only admin can delete pools"
ON public.pools FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));

-- Pool participants policies
CREATE POLICY "Participants viewable by pool members"
ON public.pool_participants FOR SELECT
USING (true);

CREATE POLICY "Users can join pools"
ON public.pool_participants FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins and moderators can update participant status"
ON public.pool_participants FOR UPDATE
USING (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'moderator')
);

-- Matches policies
CREATE POLICY "Anyone can view matches"
ON public.matches FOR SELECT
USING (true);

CREATE POLICY "Admins and moderators can manage matches"
ON public.matches FOR ALL
USING (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'moderator')
);

-- Predictions policies
CREATE POLICY "Users can view own predictions"
ON public.predictions FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Active participants can create predictions before deadline"
ON public.predictions FOR INSERT
WITH CHECK (
  auth.uid() = user_id AND
  EXISTS (
    SELECT 1 FROM public.matches m
    JOIN public.pool_participants pp ON pp.pool_id = m.pool_id
    WHERE m.id = match_id 
    AND pp.user_id = auth.uid() 
    AND pp.status = 'active'
    AND m.prediction_deadline > NOW()
  )
);

CREATE POLICY "Users can update own predictions before deadline"
ON public.predictions FOR UPDATE
USING (
  auth.uid() = user_id AND
  EXISTS (
    SELECT 1 FROM public.matches m
    WHERE m.id = match_id AND m.prediction_deadline > NOW()
  )
);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at triggers
CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_pools_updated_at
BEFORE UPDATE ON public.pools
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_pool_participants_updated_at
BEFORE UPDATE ON public.pool_participants
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_matches_updated_at
BEFORE UPDATE ON public.matches
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();