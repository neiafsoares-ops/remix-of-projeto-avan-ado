CREATE OR REPLACE FUNCTION public.calculate_prediction_points(
  pred_home integer, 
  pred_away integer, 
  actual_home integer, 
  actual_away integer
)
RETURNS integer
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  pred_diff integer;
  actual_diff integer;
  pred_winner text;
  actual_winner text;
BEGIN
  -- Calcular diferenças de gols
  pred_diff := pred_home - pred_away;
  actual_diff := actual_home - actual_away;
  
  -- Determinar vencedores
  IF pred_home > pred_away THEN pred_winner := 'home';
  ELSIF pred_home < pred_away THEN pred_winner := 'away';
  ELSE pred_winner := 'draw';
  END IF;
  
  IF actual_home > actual_away THEN actual_winner := 'home';
  ELSIF actual_home < actual_away THEN actual_winner := 'away';
  ELSE actual_winner := 'draw';
  END IF;

  -- 1. Placar exato: 7 pontos
  IF pred_home = actual_home AND pred_away = actual_away THEN
    RETURN 7;
  END IF;
  
  -- 2. Vencedor correto + diferença de gols correta: 5 pontos
  IF pred_winner = actual_winner AND pred_diff = actual_diff THEN
    RETURN 5;
  END IF;
  
  -- 3. Apenas vencedor correto: 3 pontos
  IF pred_winner = actual_winner THEN
    RETURN 3;
  END IF;
  
  -- 4. Nenhum acerto: 0 pontos
  RETURN 0;
END;
$$;