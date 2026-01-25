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
          entity_type: string
          id: string
          new_data: Json | null
          new_values: Json | null
          old_data: Json | null
          old_values: Json | null
          performed_at: string | null
          performed_by: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          new_data?: Json | null
          new_values?: Json | null
          old_data?: Json | null
          old_values?: Json | null
          performed_at?: string | null
          performed_by?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          new_data?: Json | null
          new_values?: Json | null
          old_data?: Json | null
          old_values?: Json | null
          performed_at?: string | null
          performed_by?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      clubs: {
        Row: {
          country: string | null
          created_at: string
          created_by: string | null
          id: string
          image_url: string | null
          logo_url: string | null
          name: string
        }
        Insert: {
          country?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          image_url?: string | null
          logo_url?: string | null
          name: string
        }
        Update: {
          country?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          image_url?: string | null
          logo_url?: string | null
          name?: string
        }
        Relationships: []
      }
      match_team_overrides: {
        Row: {
          club_id: string
          created_at: string
          created_by: string | null
          custom_logo_url: string
          id: string
          pool_id: string
        }
        Insert: {
          club_id: string
          created_at?: string
          created_by?: string | null
          custom_logo_url: string
          id?: string
          pool_id: string
        }
        Update: {
          club_id?: string
          created_at?: string
          created_by?: string | null
          custom_logo_url?: string
          id?: string
          pool_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "match_team_overrides_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_team_overrides_pool_id_fkey"
            columns: ["pool_id"]
            isOneToOne: false
            referencedRelation: "pools"
            referencedColumns: ["id"]
          },
        ]
      }
      matches: {
        Row: {
          away_score: number | null
          away_team: string
          away_team_image: string | null
          created_at: string
          created_by: string | null
          home_score: number | null
          home_team: string
          home_team_image: string | null
          id: string
          is_finished: boolean | null
          match_date: string
          pool_id: string
          prediction_deadline: string
          round_id: string | null
          updated_at: string
        }
        Insert: {
          away_score?: number | null
          away_team: string
          away_team_image?: string | null
          created_at?: string
          created_by?: string | null
          home_score?: number | null
          home_team: string
          home_team_image?: string | null
          id?: string
          is_finished?: boolean | null
          match_date: string
          pool_id: string
          prediction_deadline: string
          round_id?: string | null
          updated_at?: string
        }
        Update: {
          away_score?: number | null
          away_team?: string
          away_team_image?: string | null
          created_at?: string
          created_by?: string | null
          home_score?: number | null
          home_team?: string
          home_team_image?: string | null
          id?: string
          is_finished?: boolean | null
          match_date?: string
          pool_id?: string
          prediction_deadline?: string
          round_id?: string | null
          updated_at?: string
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
      mestre_pool_instances: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          pool_id: string
          suggested_pool_id: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          pool_id: string
          suggested_pool_id: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          pool_id?: string
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
      pool_participants: {
        Row: {
          id: string
          joined_at: string
          pool_id: string
          status: Database["public"]["Enums"]["participant_status"]
          total_points: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          id?: string
          joined_at?: string
          pool_id: string
          status?: Database["public"]["Enums"]["participant_status"]
          total_points?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          id?: string
          joined_at?: string
          pool_id?: string
          status?: Database["public"]["Enums"]["participant_status"]
          total_points?: number | null
          updated_at?: string
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
          cover_image: string | null
          created_at: string
          created_by: string | null
          description: string | null
          entry_fee: number | null
          id: string
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
          cover_image?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          entry_fee?: number | null
          id?: string
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
          cover_image?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          entry_fee?: number | null
          id?: string
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
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          numeric_id: number
          public_id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          numeric_id: number
          public_id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          numeric_id?: number
          public_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      round_limit_requests: {
        Row: {
          created_at: string | null
          id: string
          justification: string | null
          notes: string | null
          processed_at: string | null
          processed_by: string | null
          requested_at: string
          requested_by: string | null
          requested_extra_matches: number | null
          reviewed_at: string | null
          reviewed_by: string | null
          round_id: string
          status: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          justification?: string | null
          notes?: string | null
          processed_at?: string | null
          processed_by?: string | null
          requested_at?: string
          requested_by?: string | null
          requested_extra_matches?: number | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          round_id: string
          status?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          justification?: string | null
          notes?: string | null
          processed_at?: string | null
          processed_by?: string | null
          requested_at?: string
          requested_by?: string | null
          requested_extra_matches?: number | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          round_id?: string
          status?: string | null
          user_id?: string
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
          limit_approved_at: string | null
          limit_approved_by: string | null
          match_limit: number | null
          name: string | null
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
          limit_approved_at?: string | null
          limit_approved_by?: string | null
          match_limit?: number | null
          name?: string | null
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
          limit_approved_at?: string | null
          limit_approved_by?: string | null
          match_limit?: number | null
          name?: string | null
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
          away_score: number | null
          away_team: string
          away_team_image: string | null
          created_at: string | null
          home_score: number | null
          home_team: string
          home_team_image: string | null
          id: string
          is_finished: boolean | null
          match_date: string
          prediction_deadline: string
          round_id: string
          suggested_pool_id: string
          updated_at: string | null
        }
        Insert: {
          away_score?: number | null
          away_team: string
          away_team_image?: string | null
          created_at?: string | null
          home_score?: number | null
          home_team: string
          home_team_image?: string | null
          id?: string
          is_finished?: boolean | null
          match_date: string
          prediction_deadline: string
          round_id: string
          suggested_pool_id: string
          updated_at?: string | null
        }
        Update: {
          away_score?: number | null
          away_team?: string
          away_team_image?: string | null
          created_at?: string | null
          home_score?: number | null
          home_team?: string
          home_team_image?: string | null
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
          id: string
          suggested_pool_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          suggested_pool_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
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
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          matches_per_round?: number
          name: string
          total_rounds?: number
          updated_at?: string | null
        }
        Update: {
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
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
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
      calculate_prediction_points: {
        Args: {
          actual_away: number
          actual_home: number
          pred_away: number
          pred_home: number
        }
        Returns: number
      }
      can_edit_suggested_pool_matches: {
        Args: { _suggested_pool_id: string; _user_id: string }
        Returns: boolean
      }
      count_user_rounds: { Args: { _user_id: string }; Returns: number }
      format_numeric_id: { Args: { id: number }; Returns: string }
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
          p_entity_id?: string
          p_entity_type: string
          p_new_data?: Json
          p_old_data?: Json
          p_user_id: string
        }
        Returns: string
      }
      is_suggested_pool_moderator: {
        Args: { _suggested_pool_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "participant" | "mestre_bolao"
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
      app_role: ["admin", "moderator", "participant", "mestre_bolao"],
      participant_status: ["pending", "active", "blocked", "inactive"],
    },
  },
} as const
