-- Atualizar a função de cálculo de pontos para usar a nova pontuação
CREATE OR REPLACE FUNCTION public.calculate_prediction_points(
  pred_home integer,
  pred_away integer,
  actual_home integer,
  actual_away integer
)
RETURNS integer
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  pred_winner text;
  actual_winner text;
  pred_diff integer;
  actual_diff integer;
BEGIN
  -- Determinar vencedores
  pred_winner := CASE 
    WHEN pred_home > pred_away THEN 'home'
    WHEN pred_home < pred_away THEN 'away'
    ELSE 'draw'
  END;
  
  actual_winner := CASE 
    WHEN actual_home > actual_away THEN 'home'
    WHEN actual_home < actual_away THEN 'away'
    ELSE 'draw'
  END;
  
  -- Calcular diferença de gols
  pred_diff := pred_home - pred_away;
  actual_diff := actual_home - actual_away;
  
  -- 1. Placar exato: 5 pontos
  IF pred_home = actual_home AND pred_away = actual_away THEN
    RETURN 5;
  END IF;
  
  -- 2. Vencedor correto + diferença de gols correta: 3 pontos
  IF pred_winner = actual_winner AND pred_diff = actual_diff THEN
    RETURN 3;
  END IF;
  
  -- 3. Apenas vencedor correto: 1 ponto
  IF pred_winner = actual_winner THEN
    RETURN 1;
  END IF;
  
  -- 4. Nenhum acerto: 0 pontos
  RETURN 0;
END;
$$;