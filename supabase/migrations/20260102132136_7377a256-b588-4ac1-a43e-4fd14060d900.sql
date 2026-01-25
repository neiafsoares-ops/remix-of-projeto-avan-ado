-- Fix search_path for calculate_prediction_points function
CREATE OR REPLACE FUNCTION public.calculate_prediction_points(
  pred_home INTEGER,
  pred_away INTEGER,
  actual_home INTEGER,
  actual_away INTEGER
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
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

-- Fix search_path for update_updated_at_column function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;