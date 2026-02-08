export interface TorcidaMestrePool {
  id: string;
  name: string;
  description: string | null;
  cover_image: string | null;
  club_id: string | null;
  club_name: string;
  club_image: string | null;
  entry_fee: number;
  admin_fee_percent: number;
  allow_draws: boolean;
  allow_multiple_tickets: boolean;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface TorcidaMestreGame {
  id: string;
  pool_id: string;
  game_number: number;
  is_active: boolean;
  is_finished: boolean;
  total_accumulated: number;
  created_at: string;
  updated_at: string;
}

export interface TorcidaMestreRound {
  id: string;
  pool_id: string;
  game_id: string | null; // Optional for backwards compatibility
  round_number: number;
  name: string | null;
  opponent_name: string;
  opponent_club_id: string | null;
  opponent_image: string | null;
  match_date: string;
  prediction_deadline: string;
  is_home: boolean;
  home_score: number | null;
  away_score: number | null;
  is_finished: boolean;
  accumulated_prize: number;
  previous_accumulated: number;
  entry_fee_override: number | null;
  created_at: string;
  updated_at: string;
}

export interface TorcidaMestreParticipant {
  id: string;
  pool_id: string;
  round_id: string;
  user_id: string;
  ticket_number: number;
  status: 'pending' | 'active' | 'blocked';
  paid_amount: number;
  created_at: string;
  profiles?: {
    public_id: string;
    full_name: string | null;
    avatar_url: string | null;
  };
}

export interface TorcidaMestrePrediction {
  id: string;
  round_id: string;
  participant_id: string;
  user_id: string;
  home_score: number;
  away_score: number;
  is_winner: boolean;
  prize_won: number;
  created_at: string;
  updated_at: string;
  profiles?: {
    public_id: string;
    full_name: string | null;
    avatar_url: string | null;
  };
}

export interface TorcidaMestreGameWithRounds extends TorcidaMestreGame {
  rounds: TorcidaMestreRound[];
  current_round?: TorcidaMestreRound;
  participants_count?: number;
}

export interface TorcidaMestrePoolWithGames extends TorcidaMestrePool {
  games: TorcidaMestreGameWithRounds[];
  current_game?: TorcidaMestreGameWithRounds;
  total_accumulated?: number;
  participants_count?: number;
}

// Deprecated - kept for backwards compatibility during migration
export interface TorcidaMestrePoolWithRounds extends TorcidaMestrePool {
  rounds: TorcidaMestreRound[];
  current_round?: TorcidaMestreRound;
  total_accumulated?: number;
  participants_count?: number;
}
