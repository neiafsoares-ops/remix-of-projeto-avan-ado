
-- Drop the old unique constraint that only allows one prediction per user per match
ALTER TABLE public.predictions DROP CONSTRAINT IF EXISTS predictions_match_id_user_id_key;

-- Add new unique constraint that allows one prediction per user per match per ticket
ALTER TABLE public.predictions ADD CONSTRAINT predictions_match_user_participant_key UNIQUE (match_id, user_id, participant_id);
