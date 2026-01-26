-- Quiz 10 Module - Database Structure

-- Table for quizzes (similar to pools)
CREATE TABLE public.quizzes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  cover_image TEXT,
  entry_fee NUMERIC DEFAULT 0,
  admin_fee_percent NUMERIC DEFAULT 0,
  accumulated_prize NUMERIC DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  is_public BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table for quiz rounds
CREATE TABLE public.quiz_rounds (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  quiz_id UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  round_number INTEGER NOT NULL,
  name TEXT NOT NULL,
  deadline TIMESTAMP WITH TIME ZONE NOT NULL,
  is_finished BOOLEAN DEFAULT false,
  has_winner BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table for quiz questions (10 per round)
CREATE TABLE public.quiz_questions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  quiz_id UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  round_id UUID NOT NULL REFERENCES public.quiz_rounds(id) ON DELETE CASCADE,
  question_number INTEGER NOT NULL,
  question_text TEXT NOT NULL,
  option_a TEXT NOT NULL,
  option_b TEXT NOT NULL,
  option_c TEXT,
  option_d TEXT,
  correct_answer CHAR(1),  -- a, b, c, or d (null until answered)
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table for quiz participants
CREATE TABLE public.quiz_participants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  quiz_id UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  total_points INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active',
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(quiz_id, user_id)
);

-- Table for quiz answers (user responses)
CREATE TABLE public.quiz_answers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  quiz_id UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  round_id UUID NOT NULL REFERENCES public.quiz_rounds(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.quiz_questions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  selected_answer CHAR(1) NOT NULL,  -- a, b, c, or d
  is_correct BOOLEAN,  -- null until question is answered
  points_earned INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(question_id, user_id)
);

-- Enable RLS on all tables
ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_answers ENABLE ROW LEVEL SECURITY;

-- Quizzes policies
CREATE POLICY "Anyone can view active quizzes" ON public.quizzes
  FOR SELECT USING (is_active = true OR created_by = auth.uid());

CREATE POLICY "Admins can create quizzes" ON public.quizzes
  FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update quizzes" ON public.quizzes
  FOR UPDATE USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete quizzes" ON public.quizzes
  FOR DELETE USING (has_role(auth.uid(), 'admin'));

-- Quiz rounds policies
CREATE POLICY "Anyone can view quiz rounds" ON public.quiz_rounds
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage quiz rounds" ON public.quiz_rounds
  FOR ALL USING (has_role(auth.uid(), 'admin'));

-- Quiz questions policies
CREATE POLICY "Anyone can view quiz questions" ON public.quiz_questions
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage quiz questions" ON public.quiz_questions
  FOR ALL USING (has_role(auth.uid(), 'admin'));

-- Quiz participants policies
CREATE POLICY "Anyone can view quiz participants" ON public.quiz_participants
  FOR SELECT USING (true);

CREATE POLICY "Users can join quizzes" ON public.quiz_participants
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage participants" ON public.quiz_participants
  FOR UPDATE USING (has_role(auth.uid(), 'admin'));

-- Quiz answers policies
CREATE POLICY "Users can view all answers after deadline" ON public.quiz_answers
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM quiz_rounds 
      WHERE id = quiz_answers.round_id 
      AND (deadline < now() OR user_id = auth.uid())
    )
  );

CREATE POLICY "Participants can submit answers before deadline" ON public.quiz_answers
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM quiz_rounds r
      WHERE r.id = round_id AND r.deadline > now()
    )
    AND EXISTS (
      SELECT 1 FROM quiz_participants p
      WHERE p.quiz_id = quiz_answers.quiz_id AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own answers before deadline" ON public.quiz_answers
  FOR UPDATE USING (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM quiz_rounds r
      WHERE r.id = round_id AND r.deadline > now()
    )
  );

-- Trigger for updated_at
CREATE TRIGGER update_quizzes_updated_at
  BEFORE UPDATE ON public.quizzes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();