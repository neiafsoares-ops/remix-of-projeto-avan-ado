export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: string
          created_at: string
          entity_id: string | null
          entity_type: string | null
          id: string
          new_data: Json | null
          new_values: Json | null
          old_data: Json | null
          old_values: Json | null
          performed_at: string | null
          performed_by: string | null
          record_id: string | null
          table_name: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          new_data?: Json | null
          new_values?: Json | null
          old_data?: Json | null
          old_values?: Json | null
          performed_at?: string | null
          performed_by?: string | null
          record_id?: string | null
          table_name?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          new_data?: Json | null
          new_values?: Json | null
          old_data?: Json | null
          old_values?: Json | null
          performed_at?: string | null
          performed_by?: string | null
          record_id?: string | null
          table_name?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      clubs: {
        Row: {
          country: string | null
          created_at: string
          id: string
          image_url: string | null
          name: string
        }
        Insert: {
          country?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          name: string
        }
        Update: {
          country?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          name?: string
        }
        Relationships: []
      }
      matches: {
        Row: {
          away_score: number | null
          away_team: string
          away_team_image: string | null
          created_at: string
          home_score: number | null
          home_team: string
          home_team_image: string | null
          id: string
          is_finished: boolean | null
          match_date: string | null
          pool_id: string | null
          prediction_deadline: string | null
          round_id: string
        }
        Insert: {
          away_score?: number | null
          away_team: string
          away_team_image?: string | null
          created_at?: string
          home_score?: number | null
          home_team: string
          home_team_image?: string | null
          id?: string
          is_finished?: boolean | null
          match_date?: string | null
          pool_id?: string | null
          prediction_deadline?: string | null
          round_id: string
        }
        Update: {
          away_score?: number | null
          away_team?: string
          away_team_image?: string | null
          created_at?: string
          home_score?: number | null
          home_team?: string
          home_team_image?: string | null
          id?: string
          is_finished?: boolean | null
          match_date?: string | null
          pool_id?: string | null
          prediction_deadline?: string | null
          round_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "matches_pool_id_fkey"
            columns: ["pool_id"]
            isOneToOne: false
            referencedRelation: "pools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "rounds"
            referencedColumns: ["id"]
          },
        ]
      }
      mestre_plans: {
        Row: {
          created_at: string
          expires_at: string | null
          id: string
          is_active: boolean | null
          max_participants_per_pool: number | null
          max_pools: number | null
          plan_type: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          max_participants_per_pool?: number | null
          max_pools?: number | null
          plan_type?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          max_participants_per_pool?: number | null
          max_pools?: number | null
          plan_type?: string | null
          user_id?: string
        }
        Relationships: []
      }
      mestre_pool_instances: {
        Row: {
          created_at: string | null
          id: string
          matches_per_round: number
          mestre_user_id: string
          pool_id: string
          rounds_consumed: number
          suggested_pool_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          matches_per_round: number
          mestre_user_id: string
          pool_id: string
          rounds_consumed: number
          suggested_pool_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          matches_per_round?: number
          mestre_user_id?: string
          pool_id?: string
          rounds_consumed?: number
          suggested_pool_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mestre_pool_instances_pool_id_fkey"
            columns: ["pool_id"]
            isOneToOne: false
            referencedRelation: "pools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mestre_pool_instances_suggested_pool_id_fkey"
            columns: ["suggested_pool_id"]
            isOneToOne: false
            referencedRelation: "suggested_pools"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string | null
          data: Json | null
          id: string
          is_read: boolean | null
          message: string | null
          read_at: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          data?: Json | null
          id?: string
          is_read?: boolean | null
          message?: string | null
          read_at?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          data?: Json | null
          id?: string
          is_read?: boolean | null
          message?: string | null
          read_at?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      pool_invitations: {
        Row: {
          created_at: string
          expires_at: string | null
          id: string
          invitee_email: string | null
          invitee_username: string | null
          inviter_id: string
          pool_id: string
          status: string | null
          token: string | null
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          id?: string
          invitee_email?: string | null
          invitee_username?: string | null
          inviter_id: string
          pool_id: string
          status?: string | null
          token?: string | null
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          id?: string
          invitee_email?: string | null
          invitee_username?: string | null
          inviter_id?: string
          pool_id?: string
          status?: string | null
          token?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pool_invitations_pool_id_fkey"
            columns: ["pool_id"]
            isOneToOne: false
            referencedRelation: "pools"
            referencedColumns: ["id"]
          },
        ]
      }
      pool_participants: {
        Row: {
          created_at: string
          id: string
          pool_id: string
          status: Database["public"]["Enums"]["participant_status"] | null
          ticket_number: number
          total_points: number | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          pool_id: string
          status?: Database["public"]["Enums"]["participant_status"] | null
          ticket_number?: number
          total_points?: number | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          pool_id?: string
          status?: Database["public"]["Enums"]["participant_status"] | null
          ticket_number?: number
          total_points?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pool_participants_pool_id_fkey"
            columns: ["pool_id"]
            isOneToOne: false
            referencedRelation: "pools"
            referencedColumns: ["id"]
          },
        ]
      }
      pools: {
        Row: {
          admin_fee_percent: number | null
          allow_multiple_tickets: boolean | null
          cover_image: string | null
          created_at: string
          created_by: string | null
          description: string | null
          entry_fee: number | null
          id: string
          initial_prize: number | null
          is_active: boolean | null
          is_public: boolean | null
          matches_per_round: number | null
          max_participants: number | null
          name: string
          rules: string | null
          total_rounds: number | null
          updated_at: string
        }
        Insert: {
          admin_fee_percent?: number | null
          allow_multiple_tickets?: boolean | null
          cover_image?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          entry_fee?: number | null
          id?: string
          initial_prize?: number | null
          is_active?: boolean | null
          is_public?: boolean | null
          matches_per_round?: number | null
          max_participants?: number | null
          name: string
          rules?: string | null
          total_rounds?: number | null
          updated_at?: string
        }
        Update: {
          admin_fee_percent?: number | null
          allow_multiple_tickets?: boolean | null
          cover_image?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          entry_fee?: number | null
          id?: string
          initial_prize?: number | null
          is_active?: boolean | null
          is_public?: boolean | null
          matches_per_round?: number | null
          max_participants?: number | null
          name?: string
          rules?: string | null
          total_rounds?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      predictions: {
        Row: {
          away_score: number
          created_at: string
          home_score: number
          id: string
          match_id: string
          participant_id: string | null
          points: number | null
          points_earned: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          away_score: number
          created_at?: string
          home_score: number
          id?: string
          match_id: string
          participant_id?: string | null
          points?: number | null
          points_earned?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          away_score?: number
          created_at?: string
          home_score?: number
          id?: string
          match_id?: string
          participant_id?: string | null
          points?: number | null
          points_earned?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "predictions_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "predictions_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: false
            referencedRelation: "pool_participants"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          full_name: string | null
          id: string
          numeric_id: number
          public_id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          numeric_id?: number
          public_id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          numeric_id?: number
          public_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      quem_somos_gallery: {
        Row: {
          created_at: string
          description: string | null
          id: string
          image_url: string
          position: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          image_url: string
          position: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string
          position?: number
          updated_at?: string
        }
        Relationships: []
      }
      quiz_answers: {
        Row: {
          created_at: string
          id: string
          is_correct: boolean | null
          participant_id: string | null
          points_earned: number | null
          question_id: string
          quiz_id: string
          round_id: string
          selected_answer: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_correct?: boolean | null
          participant_id?: string | null
          points_earned?: number | null
          question_id: string
          quiz_id: string
          round_id: string
          selected_answer: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_correct?: boolean | null
          participant_id?: string | null
          points_earned?: number | null
          question_id?: string
          quiz_id?: string
          round_id?: string
          selected_answer?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_answers_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: false
            referencedRelation: "quiz_participants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "quiz_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_answers_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_answers_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "quiz_rounds"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_participants: {
        Row: {
          id: string
          joined_at: string
          quiz_id: string
          status: string | null
          ticket_number: number
          total_points: number | null
          user_id: string
        }
        Insert: {
          id?: string
          joined_at?: string
          quiz_id: string
          status?: string | null
          ticket_number?: number
          total_points?: number | null
          user_id: string
        }
        Update: {
          id?: string
          joined_at?: string
          quiz_id?: string
          status?: string | null
          ticket_number?: number
          total_points?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_participants_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_questions: {
        Row: {
          correct_answer: string | null
          created_at: string
          id: string
          is_hidden: boolean | null
          option_a: string
          option_b: string
          option_c: string | null
          option_d: string | null
          option_e: string | null
          question_number: number
          question_text: string
          quiz_id: string
          round_id: string
        }
        Insert: {
          correct_answer?: string | null
          created_at?: string
          id?: string
          is_hidden?: boolean | null
          option_a: string
          option_b: string
          option_c?: string | null
          option_d?: string | null
          option_e?: string | null
          question_number: number
          question_text: string
          quiz_id: string
          round_id: string
        }
        Update: {
          correct_answer?: string | null
          created_at?: string
          id?: string
          is_hidden?: boolean | null
          option_a?: string
          option_b?: string
          option_c?: string | null
          option_d?: string | null
          option_e?: string | null
          question_number?: number
          question_text?: string
          quiz_id?: string
          round_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_questions_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_questions_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "quiz_rounds"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_rounds: {
        Row: {
          created_at: string
          deadline: string
          has_winner: boolean | null
          id: string
          is_finished: boolean | null
          name: string
          quiz_id: string
          round_number: number
        }
        Insert: {
          created_at?: string
          deadline: string
          has_winner?: boolean | null
          id?: string
          is_finished?: boolean | null
          name: string
          quiz_id: string
          round_number: number
        }
        Update: {
          created_at?: string
          deadline?: string
          has_winner?: boolean | null
          id?: string
          is_finished?: boolean | null
          name?: string
          quiz_id?: string
          round_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "quiz_rounds_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      quizzes: {
        Row: {
          accumulated_prize: number | null
          admin_fee_percent: number | null
          allow_multiple_tickets: boolean | null
          cover_image: string | null
          created_at: string
          created_by: string | null
          description: string | null
          entry_fee: number | null
          id: string
          is_active: boolean | null
          is_public: boolean | null
          name: string
          updated_at: string
        }
        Insert: {
          accumulated_prize?: number | null
          admin_fee_percent?: number | null
          allow_multiple_tickets?: boolean | null
          cover_image?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          entry_fee?: number | null
          id?: string
          is_active?: boolean | null
          is_public?: boolean | null
          name: string
          updated_at?: string
        }
        Update: {
          accumulated_prize?: number | null
          admin_fee_percent?: number | null
          allow_multiple_tickets?: boolean | null
          cover_image?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          entry_fee?: number | null
          id?: string
          is_active?: boolean | null
          is_public?: boolean | null
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      round_limit_requests: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string
          id: string
          justification: string | null
          notes: string | null
          requested_by: string
          requested_extra_matches: number
          reviewed_at: string | null
          reviewed_by: string | null
          round_id: string
          status: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          id?: string
          justification?: string | null
          notes?: string | null
          requested_by: string
          requested_extra_matches: number
          reviewed_at?: string | null
          reviewed_by?: string | null
          round_id: string
          status?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          id?: string
          justification?: string | null
          notes?: string | null
          requested_by?: string
          requested_extra_matches?: number
          reviewed_at?: string | null
          reviewed_by?: string | null
          round_id?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "round_limit_requests_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "rounds"
            referencedColumns: ["id"]
          },
        ]
      }
      rounds: {
        Row: {
          created_at: string
          created_by: string | null
          extra_matches_allowed: number | null
          finalized_at: string | null
          id: string
          is_finalized: boolean | null
          is_limit_approved: boolean | null
          is_locked: boolean | null
          match_limit: number | null
          name: string
          pool_id: string
          round_number: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          extra_matches_allowed?: number | null
          finalized_at?: string | null
          id?: string
          is_finalized?: boolean | null
          is_limit_approved?: boolean | null
          is_locked?: boolean | null
          match_limit?: number | null
          name: string
          pool_id: string
          round_number: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          extra_matches_allowed?: number | null
          finalized_at?: string | null
          id?: string
          is_finalized?: boolean | null
          is_limit_approved?: boolean | null
          is_locked?: boolean | null
          match_limit?: number | null
          name?: string
          pool_id?: string
          round_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "rounds_pool_id_fkey"
            columns: ["pool_id"]
            isOneToOne: false
            referencedRelation: "pools"
            referencedColumns: ["id"]
          },
        ]
      }
      suggested_pool_matches: {
        Row: {
          away_club_id: string | null
          away_score: number | null
          away_team: string
          created_at: string | null
          home_club_id: string | null
          home_score: number | null
          home_team: string
          id: string
          is_finished: boolean | null
          match_date: string
          prediction_deadline: string
          round_id: string
          suggested_pool_id: string
          updated_at: string | null
        }
        Insert: {
          away_club_id?: string | null
          away_score?: number | null
          away_team: string
          created_at?: string | null
          home_club_id?: string | null
          home_score?: number | null
          home_team: string
          id?: string
          is_finished?: boolean | null
          match_date: string
          prediction_deadline: string
          round_id: string
          suggested_pool_id: string
          updated_at?: string | null
        }
        Update: {
          away_club_id?: string | null
          away_score?: number | null
          away_team?: string
          created_at?: string | null
          home_club_id?: string | null
          home_score?: number | null
          home_team?: string
          id?: string
          is_finished?: boolean | null
          match_date?: string
          prediction_deadline?: string
          round_id?: string
          suggested_pool_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "suggested_pool_matches_away_club_id_fkey"
            columns: ["away_club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "suggested_pool_matches_home_club_id_fkey"
            columns: ["home_club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "suggested_pool_matches_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "suggested_pool_rounds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "suggested_pool_matches_suggested_pool_id_fkey"
            columns: ["suggested_pool_id"]
            isOneToOne: false
            referencedRelation: "suggested_pools"
            referencedColumns: ["id"]
          },
        ]
      }
      suggested_pool_moderators: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          suggested_pool_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          suggested_pool_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          suggested_pool_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "suggested_pool_moderators_suggested_pool_id_fkey"
            columns: ["suggested_pool_id"]
            isOneToOne: false
            referencedRelation: "suggested_pools"
            referencedColumns: ["id"]
          },
        ]
      }
      suggested_pool_rounds: {
        Row: {
          created_at: string | null
          id: string
          name: string | null
          round_number: number
          suggested_pool_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          name?: string | null
          round_number: number
          suggested_pool_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string | null
          round_number?: number
          suggested_pool_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "suggested_pool_rounds_suggested_pool_id_fkey"
            columns: ["suggested_pool_id"]
            isOneToOne: false
            referencedRelation: "suggested_pools"
            referencedColumns: ["id"]
          },
        ]
      }
      suggested_pools: {
        Row: {
          cover_image: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean | null
          matches_per_round: number
          name: string
          total_rounds: number
          updated_at: string | null
        }
        Insert: {
          cover_image?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          matches_per_round?: number
          name?: string
          total_rounds?: number
          updated_at?: string | null
        }
        Update: {
          cover_image?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          matches_per_round?: number
          name?: string
          total_rounds?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      torcida_mestre_participants: {
        Row: {
          created_at: string | null
          id: string
          paid_amount: number | null
          pool_id: string
          round_id: string
          status: string | null
          ticket_number: number | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          paid_amount?: number | null
          pool_id: string
          round_id: string
          status?: string | null
          ticket_number?: number | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          paid_amount?: number | null
          pool_id?: string
          round_id?: string
          status?: string | null
          ticket_number?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "torcida_mestre_participants_pool_id_fkey"
            columns: ["pool_id"]
            isOneToOne: false
            referencedRelation: "torcida_mestre_pools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "torcida_mestre_participants_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "torcida_mestre_rounds"
            referencedColumns: ["id"]
          },
        ]
      }
      torcida_mestre_pools: {
        Row: {
          admin_fee_percent: number | null
          allow_draws: boolean | null
          allow_multiple_tickets: boolean | null
          club_id: string | null
          club_image: string | null
          club_name: string
          cover_image: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          entry_fee: number | null
          id: string
          is_active: boolean | null
          name: string
          updated_at: string | null
        }
        Insert: {
          admin_fee_percent?: number | null
          allow_draws?: boolean | null
          allow_multiple_tickets?: boolean | null
          club_id?: string | null
          club_image?: string | null
          club_name: string
          cover_image?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          entry_fee?: number | null
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string | null
        }
        Update: {
          admin_fee_percent?: number | null
          allow_draws?: boolean | null
          allow_multiple_tickets?: boolean | null
          club_id?: string | null
          club_image?: string | null
          club_name?: string
          cover_image?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          entry_fee?: number | null
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "torcida_mestre_pools_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      torcida_mestre_predictions: {
        Row: {
          away_score: number
          created_at: string | null
          home_score: number
          id: string
          is_winner: boolean | null
          participant_id: string
          prize_won: number | null
          round_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          away_score: number
          created_at?: string | null
          home_score: number
          id?: string
          is_winner?: boolean | null
          participant_id: string
          prize_won?: number | null
          round_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          away_score?: number
          created_at?: string | null
          home_score?: number
          id?: string
          is_winner?: boolean | null
          participant_id?: string
          prize_won?: number | null
          round_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "torcida_mestre_predictions_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: false
            referencedRelation: "torcida_mestre_participants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "torcida_mestre_predictions_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "torcida_mestre_rounds"
            referencedColumns: ["id"]
          },
        ]
      }
      torcida_mestre_rounds: {
        Row: {
          accumulated_prize: number | null
          away_score: number | null
          created_at: string | null
          entry_fee_override: number | null
          home_score: number | null
          id: string
          is_finished: boolean | null
          is_home: boolean | null
          match_date: string
          name: string | null
          opponent_club_id: string | null
          opponent_image: string | null
          opponent_name: string
          pool_id: string
          prediction_deadline: string
          previous_accumulated: number | null
          round_number: number
          updated_at: string | null
        }
        Insert: {
          accumulated_prize?: number | null
          away_score?: number | null
          created_at?: string | null
          entry_fee_override?: number | null
          home_score?: number | null
          id?: string
          is_finished?: boolean | null
          is_home?: boolean | null
          match_date: string
          name?: string | null
          opponent_club_id?: string | null
          opponent_image?: string | null
          opponent_name: string
          pool_id: string
          prediction_deadline: string
          previous_accumulated?: number | null
          round_number: number
          updated_at?: string | null
        }
        Update: {
          accumulated_prize?: number | null
          away_score?: number | null
          created_at?: string | null
          entry_fee_override?: number | null
          home_score?: number | null
          id?: string
          is_finished?: boolean | null
          is_home?: boolean | null
          match_date?: string
          name?: string | null
          opponent_club_id?: string | null
          opponent_image?: string | null
          opponent_name?: string
          pool_id?: string
          prediction_deadline?: string
          previous_accumulated?: number | null
          round_number?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "torcida_mestre_rounds_opponent_club_id_fkey"
            columns: ["opponent_club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "torcida_mestre_rounds_pool_id_fkey"
            columns: ["pool_id"]
            isOneToOne: false
            referencedRelation: "torcida_mestre_pools"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_edit_suggested_pool_matches: {
        Args: { _pool_id: string; _user_id: string }
        Returns: boolean
      }
      check_mestre_plan_expirations: { Args: never; Returns: undefined }
      count_user_rounds: { Args: { user_uuid: string }; Returns: number }
      create_notification: {
        Args: {
          p_data?: Json
          p_message?: string
          p_title: string
          p_type: string
          p_user_id: string
        }
        Returns: string
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      insert_audit_log: {
        Args: {
          p_action: string
          p_new_data?: Json
          p_old_data?: Json
          p_record_id: string
          p_table_name: string
        }
        Returns: string
      }
      is_suggested_pool_moderator: {
        Args: { _pool_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "mestre_bolao"
      participant_status: "pending" | "active" | "blocked" | "inactive"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "moderator", "mestre_bolao"],
      participant_status: ["pending", "active", "blocked", "inactive"],
    },
  },
} as const
