-- =====================================================
-- Security Fix: Remove hardcoded admin email trigger
-- This removes the backdoor that auto-assigns admin to a specific email
-- =====================================================

-- Drop the trigger first
DROP TRIGGER IF EXISTS on_profile_created_check_seed_admin ON profiles;

-- Drop the functions
DROP FUNCTION IF EXISTS handle_seed_admin_on_signup();
DROP FUNCTION IF EXISTS check_and_assign_seed_admin();

-- =====================================================
-- Security Fix: Add database validation constraints
-- These enforce data integrity at the database level
-- =====================================================

-- Pools table constraints
ALTER TABLE pools 
  ADD CONSTRAINT pool_name_length CHECK (length(name) >= 1 AND length(name) <= 200);

ALTER TABLE pools 
  ADD CONSTRAINT pool_description_length CHECK (description IS NULL OR length(description) <= 5000);

ALTER TABLE pools 
  ADD CONSTRAINT pool_rules_length CHECK (rules IS NULL OR length(rules) <= 10000);

ALTER TABLE pools 
  ADD CONSTRAINT valid_entry_fee CHECK (entry_fee IS NULL OR entry_fee >= 0);

ALTER TABLE pools 
  ADD CONSTRAINT valid_max_participants CHECK (max_participants IS NULL OR max_participants > 0);

-- Matches table constraints
ALTER TABLE matches
  ADD CONSTRAINT match_home_team_length CHECK (length(home_team) >= 1 AND length(home_team) <= 200);

ALTER TABLE matches
  ADD CONSTRAINT match_away_team_length CHECK (length(away_team) >= 1 AND length(away_team) <= 200);

-- Note: Using trigger validation for deadline < match_date since CHECK constraints must be immutable
CREATE OR REPLACE FUNCTION validate_match_deadline()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.prediction_deadline >= NEW.match_date THEN
    RAISE EXCEPTION 'Prediction deadline must be before match date';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER SET search_path = public;

CREATE TRIGGER check_match_deadline
  BEFORE INSERT OR UPDATE ON matches
  FOR EACH ROW
  EXECUTE FUNCTION validate_match_deadline();

-- Predictions table constraints (score validation)
ALTER TABLE predictions 
  ADD CONSTRAINT valid_home_score CHECK (home_score >= 0 AND home_score <= 99);

ALTER TABLE predictions 
  ADD CONSTRAINT valid_away_score CHECK (away_score >= 0 AND away_score <= 99);

-- Profiles table constraints
ALTER TABLE profiles
  ADD CONSTRAINT profile_full_name_length CHECK (full_name IS NULL OR length(full_name) <= 200);