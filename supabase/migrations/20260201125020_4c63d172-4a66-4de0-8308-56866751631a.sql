-- Tabela principal dos bolões Torcida Mestre
CREATE TABLE public.torcida_mestre_pools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  cover_image TEXT,
  club_id UUID REFERENCES public.clubs(id),
  club_name TEXT NOT NULL,
  club_image TEXT,
  entry_fee NUMERIC DEFAULT 0,
  admin_fee_percent NUMERIC DEFAULT 0,
  allow_draws BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Rodadas do Torcida Mestre
CREATE TABLE public.torcida_mestre_rounds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pool_id UUID REFERENCES public.torcida_mestre_pools(id) ON DELETE CASCADE NOT NULL,
  round_number INTEGER NOT NULL,
  name TEXT,
  opponent_name TEXT NOT NULL,
  opponent_club_id UUID REFERENCES public.clubs(id),
  opponent_image TEXT,
  match_date TIMESTAMPTZ NOT NULL,
  prediction_deadline TIMESTAMPTZ NOT NULL,
  is_home BOOLEAN DEFAULT TRUE,
  home_score INTEGER,
  away_score INTEGER,
  is_finished BOOLEAN DEFAULT FALSE,
  accumulated_prize NUMERIC DEFAULT 0,
  previous_accumulated NUMERIC DEFAULT 0,
  entry_fee_override NUMERIC,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Participantes por rodada
CREATE TABLE public.torcida_mestre_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pool_id UUID REFERENCES public.torcida_mestre_pools(id) ON DELETE CASCADE NOT NULL,
  round_id UUID REFERENCES public.torcida_mestre_rounds(id) ON DELETE CASCADE NOT NULL,
  user_id UUID NOT NULL,
  ticket_number INTEGER DEFAULT 1,
  status TEXT DEFAULT 'pending',
  paid_amount NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Palpites do Torcida Mestre
CREATE TABLE public.torcida_mestre_predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id UUID REFERENCES public.torcida_mestre_rounds(id) ON DELETE CASCADE NOT NULL,
  participant_id UUID REFERENCES public.torcida_mestre_participants(id) ON DELETE CASCADE NOT NULL,
  user_id UUID NOT NULL,
  home_score INTEGER NOT NULL,
  away_score INTEGER NOT NULL,
  is_winner BOOLEAN DEFAULT FALSE,
  prize_won NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.torcida_mestre_pools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.torcida_mestre_rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.torcida_mestre_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.torcida_mestre_predictions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for torcida_mestre_pools
CREATE POLICY "Anyone can view active torcida mestre pools"
ON public.torcida_mestre_pools FOR SELECT
USING (is_active = true OR created_by = auth.uid());

CREATE POLICY "Admins can create torcida mestre pools"
ON public.torcida_mestre_pools FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update torcida mestre pools"
ON public.torcida_mestre_pools FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete torcida mestre pools"
ON public.torcida_mestre_pools FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for torcida_mestre_rounds
CREATE POLICY "Anyone can view torcida mestre rounds"
ON public.torcida_mestre_rounds FOR SELECT
USING (true);

CREATE POLICY "Admins can create torcida mestre rounds"
ON public.torcida_mestre_rounds FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update torcida mestre rounds"
ON public.torcida_mestre_rounds FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete torcida mestre rounds"
ON public.torcida_mestre_rounds FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for torcida_mestre_participants
CREATE POLICY "Anyone can view torcida mestre participants"
ON public.torcida_mestre_participants FOR SELECT
USING (true);

CREATE POLICY "Users can request to participate"
ON public.torcida_mestre_participants FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can update participants"
ON public.torcida_mestre_participants FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete participants"
ON public.torcida_mestre_participants FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for torcida_mestre_predictions
CREATE POLICY "Anyone can view predictions after deadline"
ON public.torcida_mestre_predictions FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.torcida_mestre_rounds r
    WHERE r.id = torcida_mestre_predictions.round_id
    AND (r.prediction_deadline < now() OR torcida_mestre_predictions.user_id = auth.uid())
  )
);

CREATE POLICY "Approved participants can create predictions"
ON public.torcida_mestre_predictions FOR INSERT
WITH CHECK (
  auth.uid() = user_id AND
  EXISTS (
    SELECT 1 FROM public.torcida_mestre_participants p
    JOIN public.torcida_mestre_rounds r ON r.id = p.round_id
    WHERE p.id = torcida_mestre_predictions.participant_id
    AND p.user_id = auth.uid()
    AND p.status = 'active'
    AND r.prediction_deadline > now()
  )
);

CREATE POLICY "Users can update own predictions before deadline"
ON public.torcida_mestre_predictions FOR UPDATE
USING (
  auth.uid() = user_id AND
  EXISTS (
    SELECT 1 FROM public.torcida_mestre_rounds r
    WHERE r.id = torcida_mestre_predictions.round_id
    AND r.prediction_deadline > now()
  )
);

-- Trigger for updated_at
CREATE TRIGGER update_torcida_mestre_pools_updated_at
BEFORE UPDATE ON public.torcida_mestre_pools
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_torcida_mestre_rounds_updated_at
BEFORE UPDATE ON public.torcida_mestre_rounds
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_torcida_mestre_predictions_updated_at
BEFORE UPDATE ON public.torcida_mestre_predictions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();