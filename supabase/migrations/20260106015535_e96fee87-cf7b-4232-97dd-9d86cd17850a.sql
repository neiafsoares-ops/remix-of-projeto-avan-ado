-- Policy para admins e moderadores excluirem palpites
CREATE POLICY "Admins and pool managers can delete predictions"
ON public.predictions
FOR DELETE
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) OR
  (
    has_role(auth.uid(), 'moderator'::app_role) AND
    EXISTS (
      SELECT 1 FROM matches m
      JOIN pools p ON m.pool_id = p.id
      WHERE m.id = predictions.match_id
      AND p.created_by = auth.uid()
    )
  )
);

-- Função para recalcular pontos do participante após exclusão de palpite
CREATE OR REPLACE FUNCTION public.recalculate_participant_points_on_delete()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.pool_participants pp
  SET total_points = (
    SELECT COALESCE(SUM(p.points_earned), 0)
    FROM public.predictions p
    JOIN public.matches m ON p.match_id = m.id
    WHERE m.pool_id = pp.pool_id AND p.user_id = OLD.user_id
  ),
  updated_at = NOW()
  WHERE pp.pool_id = (SELECT pool_id FROM public.matches WHERE id = OLD.match_id)
    AND pp.user_id = OLD.user_id;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger para recalcular pontos após exclusão
CREATE TRIGGER on_prediction_delete
AFTER DELETE ON public.predictions
FOR EACH ROW
EXECUTE FUNCTION public.recalculate_participant_points_on_delete();

-- Habilitar Realtime para as tabelas
ALTER PUBLICATION supabase_realtime ADD TABLE public.matches;
ALTER PUBLICATION supabase_realtime ADD TABLE public.predictions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.pool_participants;