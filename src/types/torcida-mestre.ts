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
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface TorcidaMestreRound {
  id: string;
  pool_id: string;
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

export interface TorcidaMestrePoolWithRounds extends TorcidaMestrePool {
  rounds: TorcidaMestreRound[];
  current_round?: TorcidaMestreRound;
  total_accumulated?: number;
}
