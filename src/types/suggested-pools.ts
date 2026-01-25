// Tipos TypeScript para o sistema de Bolões Sugeridos (Sugestão Zapions)

export interface SuggestedPool {
  id: string;
  name: string;
  description: string | null;
  cover_image: string | null;
  total_rounds: number;
  matches_per_round: number;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface SuggestedPoolInsert {
  id?: string;
  name?: string;
  description?: string | null;
  cover_image?: string | null;
  total_rounds?: number;
  matches_per_round?: number;
  is_active?: boolean;
  created_by?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface SuggestedPoolUpdate {
  id?: string;
  name?: string;
  description?: string | null;
  cover_image?: string | null;
  total_rounds?: number;
  matches_per_round?: number;
  is_active?: boolean;
  created_by?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface SuggestedPoolModerator {
  id: string;
  suggested_pool_id: string;
  user_id: string;
  created_at: string;
  created_by: string | null;
}

export interface SuggestedPoolModeratorInsert {
  id?: string;
  suggested_pool_id: string;
  user_id: string;
  created_at?: string;
  created_by?: string | null;
}

export interface SuggestedPoolRound {
  id: string;
  suggested_pool_id: string;
  round_number: number;
  name: string | null;
  created_at: string;
  updated_at: string;
}

export interface SuggestedPoolRoundInsert {
  id?: string;
  suggested_pool_id: string;
  round_number: number;
  name?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface SuggestedPoolRoundUpdate {
  id?: string;
  suggested_pool_id?: string;
  round_number?: number;
  name?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface SuggestedPoolMatch {
  id: string;
  suggested_pool_id: string;
  round_id: string;
  home_team: string;
  away_team: string;
  home_club_id: string | null;
  away_club_id: string | null;
  match_date: string;
  prediction_deadline: string;
  home_score: number | null;
  away_score: number | null;
  is_finished: boolean;
  created_at: string;
  updated_at: string;
}

export interface SuggestedPoolMatchInsert {
  id?: string;
  suggested_pool_id: string;
  round_id: string;
  home_team: string;
  away_team: string;
  home_club_id?: string | null;
  away_club_id?: string | null;
  match_date: string;
  prediction_deadline: string;
  home_score?: number | null;
  away_score?: number | null;
  is_finished?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface SuggestedPoolMatchUpdate {
  id?: string;
  suggested_pool_id?: string;
  round_id?: string;
  home_team?: string;
  away_team?: string;
  home_club_id?: string | null;
  away_club_id?: string | null;
  match_date?: string;
  prediction_deadline?: string;
  home_score?: number | null;
  away_score?: number | null;
  is_finished?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface MestrePoolInstance {
  id: string;
  suggested_pool_id: string;
  pool_id: string;
  mestre_user_id: string;
  rounds_consumed: number;
  matches_per_round: number;
  created_at: string;
}

export interface MestrePoolInstanceInsert {
  id?: string;
  suggested_pool_id: string;
  pool_id: string;
  mestre_user_id: string;
  rounds_consumed: number;
  matches_per_round: number;
  created_at?: string;
}

// Tipos com relacionamentos para uso nas queries
export interface SuggestedPoolWithModerators extends SuggestedPool {
  moderators?: SuggestedPoolModerator[];
}

export interface SuggestedPoolWithRounds extends SuggestedPool {
  rounds?: SuggestedPoolRound[];
}

export interface SuggestedPoolRoundWithMatches extends SuggestedPoolRound {
  matches?: SuggestedPoolMatch[];
}

export interface SuggestedPoolComplete extends SuggestedPool {
  moderators?: SuggestedPoolModerator[];
  rounds?: (SuggestedPoolRound & { matches?: SuggestedPoolMatch[] })[];
}
