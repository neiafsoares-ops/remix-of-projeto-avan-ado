-- Fix function search_path warnings
CREATE OR REPLACE FUNCTION public.calculate_prediction_points(
  pred_home INTEGER,
  pred_away INTEGER,
  actual_home INTEGER,
  actual_away INTEGER
)
RETURNS INTEGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF pred_home = actual_home AND pred_away = actual_away THEN
    RETURN 5;
  END IF;
  IF (pred_home > pred_away AND actual_home > actual_away) OR
     (pred_home < pred_away AND actual_home < actual_away) OR
     (pred_home = pred_away AND actual_home = actual_away) THEN
    RETURN 2;
  END IF;
  IF pred_home = actual_home OR pred_away = actual_away THEN
    RETURN 1;
  END IF;
  RETURN 0;
END;
$$;

CREATE OR REPLACE FUNCTION public.format_numeric_id(id INTEGER)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT LPAD(id::text, 5, '0')
$$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Fix permissive RLS policy for audit_logs INSERT
DROP POLICY IF EXISTS "System can insert audit logs" ON public.audit_logs;

CREATE POLICY "Authenticated users can insert audit logs"
ON public.audit_logs FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);