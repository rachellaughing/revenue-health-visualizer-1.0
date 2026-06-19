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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      alignment_scores: {
        Row: {
          alignment_gap: number | null
          alignment_status: string | null
          assessment_id: string
          calculated_at: string | null
          child_system_id: string
          cluster_scores: Json | null
          founder_score: number | null
          gap_direction: string | null
          id: string
          owner_id: string
          team_avg_score: number | null
        }
        Insert: {
          alignment_gap?: number | null
          alignment_status?: string | null
          assessment_id: string
          calculated_at?: string | null
          child_system_id: string
          cluster_scores?: Json | null
          founder_score?: number | null
          gap_direction?: string | null
          id?: string
          owner_id: string
          team_avg_score?: number | null
        }
        Update: {
          alignment_gap?: number | null
          alignment_status?: string | null
          assessment_id?: string
          calculated_at?: string | null
          child_system_id?: string
          cluster_scores?: Json | null
          founder_score?: number | null
          gap_direction?: string | null
          id?: string
          owner_id?: string
          team_avg_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "alignment_scores_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
        ]
      }
      assessment_responses: {
        Row: {
          answered_at: string | null
          assessment_id: string
          health_response: number | null
          id: string
          question_id: string
          tracking_response: number | null
          user_id: string
        }
        Insert: {
          answered_at?: string | null
          assessment_id: string
          health_response?: number | null
          id?: string
          question_id: string
          tracking_response?: number | null
          user_id: string
        }
        Update: {
          answered_at?: string | null
          assessment_id?: string
          health_response?: number | null
          id?: string
          question_id?: string
          tracking_response?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "assessment_responses_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
        ]
      }
      assessment_scores: {
        Row: {
          assessment_id: string
          calculated_at: string | null
          child_system_id: string
          health_score: number | null
          id: string
          is_hard_shadow: boolean | null
          is_soft_shadow: boolean | null
          severity: string | null
          tracking_score: number | null
          user_id: string
          visibility_gap: number | null
        }
        Insert: {
          assessment_id: string
          calculated_at?: string | null
          child_system_id: string
          health_score?: number | null
          id?: string
          is_hard_shadow?: boolean | null
          is_soft_shadow?: boolean | null
          severity?: string | null
          tracking_score?: number | null
          user_id: string
          visibility_gap?: number | null
        }
        Update: {
          assessment_id?: string
          calculated_at?: string | null
          child_system_id?: string
          health_score?: number | null
          id?: string
          is_hard_shadow?: boolean | null
          is_soft_shadow?: boolean | null
          severity?: string | null
          tracking_score?: number | null
          user_id?: string
          visibility_gap?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "assessment_scores_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
        ]
      }
      assessments: {
        Row: {
          assessment_type: string
          assessment_version: number
          calculated_at: string | null
          completed_at: string | null
          completion_pct: number
          created_at: string | null
          id: string
          overall_health_score: number | null
          overall_tracking_score: number | null
          parent_assessment_id: string | null
          profile_id: string | null
          selected_child_ids: string[]
          started_at: string | null
          status: string
          submitted_at: string | null
          tier_at_start: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          assessment_type?: string
          assessment_version?: number
          calculated_at?: string | null
          completed_at?: string | null
          completion_pct?: number
          created_at?: string | null
          id?: string
          overall_health_score?: number | null
          overall_tracking_score?: number | null
          parent_assessment_id?: string | null
          profile_id?: string | null
          selected_child_ids?: string[]
          started_at?: string | null
          status?: string
          submitted_at?: string | null
          tier_at_start?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          assessment_type?: string
          assessment_version?: number
          calculated_at?: string | null
          completed_at?: string | null
          completion_pct?: number
          created_at?: string | null
          id?: string
          overall_health_score?: number | null
          overall_tracking_score?: number | null
          parent_assessment_id?: string | null
          profile_id?: string | null
          selected_child_ids?: string[]
          started_at?: string | null
          status?: string
          submitted_at?: string | null
          tier_at_start?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "assessments_parent_assessment_id_fkey"
            columns: ["parent_assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessments_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      company_profiles: {
        Row: {
          acv: number | null
          annual_churn: string | null
          annual_revenue: string | null
          avg_close_rate: string | null
          avg_sales_cycle: string | null
          business_model: string | null
          cac: number | null
          company_name: string | null
          created_at: string | null
          estimated_ltv: number | null
          founded_year: number | null
          funding_stage: string | null
          has_defined_icp: string | null
          headquarters: string | null
          id: string
          industry: string | null
          open_friction_text: string | null
          pain_points: string[]
          primary_growth_constraint: string | null
          primary_sales_motion: string | null
          profile_version: number
          revenue_model: string | null
          revenue_org_size: number | null
          total_headcount: string | null
          updated_at: string | null
          user_id: string
          website: string | null
        }
        Insert: {
          acv?: number | null
          annual_churn?: string | null
          annual_revenue?: string | null
          avg_close_rate?: string | null
          avg_sales_cycle?: string | null
          business_model?: string | null
          cac?: number | null
          company_name?: string | null
          created_at?: string | null
          estimated_ltv?: number | null
          founded_year?: number | null
          funding_stage?: string | null
          has_defined_icp?: string | null
          headquarters?: string | null
          id?: string
          industry?: string | null
          open_friction_text?: string | null
          pain_points?: string[]
          primary_growth_constraint?: string | null
          primary_sales_motion?: string | null
          profile_version?: number
          revenue_model?: string | null
          revenue_org_size?: number | null
          total_headcount?: string | null
          updated_at?: string | null
          user_id: string
          website?: string | null
        }
        Update: {
          acv?: number | null
          annual_churn?: string | null
          annual_revenue?: string | null
          avg_close_rate?: string | null
          avg_sales_cycle?: string | null
          business_model?: string | null
          cac?: number | null
          company_name?: string | null
          created_at?: string | null
          estimated_ltv?: number | null
          founded_year?: number | null
          funding_stage?: string | null
          has_defined_icp?: string | null
          headquarters?: string | null
          id?: string
          industry?: string | null
          open_friction_text?: string | null
          pain_points?: string[]
          primary_growth_constraint?: string | null
          primary_sales_motion?: string | null
          profile_version?: number
          revenue_model?: string | null
          revenue_org_size?: number | null
          total_headcount?: string | null
          updated_at?: string | null
          user_id?: string
          website?: string | null
        }
        Relationships: []
      }
      consultant_observations: {
        Row: {
          assessment_id: string
          attendees_count: number | null
          child_system_id: string | null
          consultant_id: string
          created_at: string | null
          generated_narrative: string | null
          id: string
          narrative_generated_at: string | null
          owner_id: string
          parent_system_id: string | null
          raw_notes: string | null
          session_date: string | null
          session_type: string
          severity_flag: string | null
          updated_at: string | null
        }
        Insert: {
          assessment_id: string
          attendees_count?: number | null
          child_system_id?: string | null
          consultant_id: string
          created_at?: string | null
          generated_narrative?: string | null
          id?: string
          narrative_generated_at?: string | null
          owner_id: string
          parent_system_id?: string | null
          raw_notes?: string | null
          session_date?: string | null
          session_type?: string
          severity_flag?: string | null
          updated_at?: string | null
        }
        Update: {
          assessment_id?: string
          attendees_count?: number | null
          child_system_id?: string | null
          consultant_id?: string
          created_at?: string | null
          generated_narrative?: string | null
          id?: string
          narrative_generated_at?: string | null
          owner_id?: string
          parent_system_id?: string | null
          raw_notes?: string | null
          session_date?: string | null
          session_type?: string
          severity_flag?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "consultant_observations_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
        ]
      }
      coupons: {
        Row: {
          active: boolean
          coupon_code: string
          created_at: string
          discount_type: string
          discount_value: number | null
          id: string
          max_uses: number | null
          use_count: number
          valid_from: string | null
          valid_until: string | null
        }
        Insert: {
          active?: boolean
          coupon_code: string
          created_at?: string
          discount_type: string
          discount_value?: number | null
          id?: string
          max_uses?: number | null
          use_count?: number
          valid_from?: string | null
          valid_until?: string | null
        }
        Update: {
          active?: boolean
          coupon_code?: string
          created_at?: string
          discount_type?: string
          discount_value?: number | null
          id?: string
          max_uses?: number | null
          use_count?: number
          valid_from?: string | null
          valid_until?: string | null
        }
        Relationships: []
      }
      diagnostic_recommendations: {
        Row: {
          assessment_id: string
          child_system_id: string | null
          consultant_id: string
          created_at: string | null
          effort_level: string | null
          id: string
          owner_id: string
          rank: number
          rationale: string | null
          recommendation_text: string
          timeframe: string | null
        }
        Insert: {
          assessment_id: string
          child_system_id?: string | null
          consultant_id: string
          created_at?: string | null
          effort_level?: string | null
          id?: string
          owner_id: string
          rank: number
          rationale?: string | null
          recommendation_text: string
          timeframe?: string | null
        }
        Update: {
          assessment_id?: string
          child_system_id?: string | null
          consultant_id?: string
          created_at?: string | null
          effort_level?: string | null
          id?: string
          owner_id?: string
          rank?: number
          rationale?: string | null
          recommendation_text?: string
          timeframe?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "diagnostic_recommendations_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
        ]
      }
      founder_dependency_processes: {
        Row: {
          assessment_id: string
          blast_radius_window: string | null
          created_at: string | null
          delegation_difficulty: string | null
          dependency_type: string
          id: string
          is_shadow_system: boolean
          owner_id: string
          parent_system_id: string
          process_name: string
          recommended_first_step: string | null
          risk_level: number | null
          sort_order: number | null
          why_founder_dependent: string | null
        }
        Insert: {
          assessment_id: string
          blast_radius_window?: string | null
          created_at?: string | null
          delegation_difficulty?: string | null
          dependency_type?: string
          id?: string
          is_shadow_system?: boolean
          owner_id: string
          parent_system_id: string
          process_name: string
          recommended_first_step?: string | null
          risk_level?: number | null
          sort_order?: number | null
          why_founder_dependent?: string | null
        }
        Update: {
          assessment_id?: string
          blast_radius_window?: string | null
          created_at?: string | null
          delegation_difficulty?: string | null
          dependency_type?: string
          id?: string
          is_shadow_system?: boolean
          owner_id?: string
          parent_system_id?: string
          process_name?: string
          recommended_first_step?: string | null
          risk_level?: number | null
          sort_order?: number | null
          why_founder_dependent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "founder_dependency_processes_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
        ]
      }
      founder_dependency_scores: {
        Row: {
          assessment_id: string
          blast_radius_narrative: string | null
          consultant_id: string | null
          created_at: string | null
          dependency_label: string | null
          executive_summary: string | null
          id: string
          overall_dependency_index: number | null
          owner_id: string
          summary_generated_at: string | null
          updated_at: string | null
        }
        Insert: {
          assessment_id: string
          blast_radius_narrative?: string | null
          consultant_id?: string | null
          created_at?: string | null
          dependency_label?: string | null
          executive_summary?: string | null
          id?: string
          overall_dependency_index?: number | null
          owner_id: string
          summary_generated_at?: string | null
          updated_at?: string | null
        }
        Update: {
          assessment_id?: string
          blast_radius_narrative?: string | null
          consultant_id?: string | null
          created_at?: string | null
          dependency_label?: string | null
          executive_summary?: string | null
          id?: string
          overall_dependency_index?: number | null
          owner_id?: string
          summary_generated_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "founder_dependency_scores_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: true
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
        ]
      }
      founder_dependency_systems: {
        Row: {
          assessment_id: string
          created_at: string | null
          dependency_level: number | null
          dependency_type: string
          handoff_readiness: string | null
          id: string
          narrative: string | null
          owner_id: string
          parent_system_id: string
        }
        Insert: {
          assessment_id: string
          created_at?: string | null
          dependency_level?: number | null
          dependency_type: string
          handoff_readiness?: string | null
          id?: string
          narrative?: string | null
          owner_id: string
          parent_system_id: string
        }
        Update: {
          assessment_id?: string
          created_at?: string | null
          dependency_level?: number | null
          dependency_type?: string
          handoff_readiness?: string | null
          id?: string
          narrative?: string | null
          owner_id?: string
          parent_system_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "founder_dependency_systems_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
        ]
      }
      ghl_sync_log: {
        Row: {
          error_message: string | null
          ghl_contact_id: string | null
          id: string
          payload: Json | null
          status: string
          synced_at: string
          trigger_event: string
          user_id: string | null
        }
        Insert: {
          error_message?: string | null
          ghl_contact_id?: string | null
          id?: string
          payload?: Json | null
          status: string
          synced_at?: string
          trigger_event: string
          user_id?: string | null
        }
        Update: {
          error_message?: string | null
          ghl_contact_id?: string | null
          id?: string
          payload?: Json | null
          status?: string
          synced_at?: string
          trigger_event?: string
          user_id?: string | null
        }
        Relationships: []
      }
      knowledge_chunks: {
        Row: {
          content: string
          created_at: string | null
          embedding: string | null
          id: string
          metadata: Json | null
          source: string
          source_id: string | null
          updated_at: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          embedding?: string | null
          id?: string
          metadata?: Json | null
          source: string
          source_id?: string | null
          updated_at?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          embedding?: string | null
          id?: string
          metadata?: Json | null
          source?: string
          source_id?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          assessment_completion_pct: number
          assessment_status: string
          business_name: string | null
          company_name: string | null
          company_profile_complete: boolean
          coupon_code_used: string | null
          created_at: string | null
          diagnostic_purchased_at: string | null
          email: string | null
          first_name: string | null
          full_name: string | null
          ghl_contact_id: string | null
          growth_stage: Database["public"]["Enums"]["growth_stage"] | null
          id: string
          invite_accepted_at: string | null
          invite_token: string | null
          job_function: string | null
          last_active_at: string | null
          last_name: string | null
          pain_point_categories: Json | null
          pain_point_open_text: string | null
          pain_point_ranking: Json | null
          primary_background: string | null
          profile_complete: boolean
          profile_photo_url: string | null
          role: string
          role_title: string | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          stripe_subscription_status: string | null
          subscription_current_period_end: string | null
          team_owner_id: string | null
          tier: Database["public"]["Enums"]["user_tier"]
          updated_at: string | null
          user_id: string
          years_in_role: string | null
        }
        Insert: {
          assessment_completion_pct?: number
          assessment_status?: string
          business_name?: string | null
          company_name?: string | null
          company_profile_complete?: boolean
          coupon_code_used?: string | null
          created_at?: string | null
          diagnostic_purchased_at?: string | null
          email?: string | null
          first_name?: string | null
          full_name?: string | null
          ghl_contact_id?: string | null
          growth_stage?: Database["public"]["Enums"]["growth_stage"] | null
          id?: string
          invite_accepted_at?: string | null
          invite_token?: string | null
          job_function?: string | null
          last_active_at?: string | null
          last_name?: string | null
          pain_point_categories?: Json | null
          pain_point_open_text?: string | null
          pain_point_ranking?: Json | null
          primary_background?: string | null
          profile_complete?: boolean
          profile_photo_url?: string | null
          role?: string
          role_title?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          stripe_subscription_status?: string | null
          subscription_current_period_end?: string | null
          team_owner_id?: string | null
          tier?: Database["public"]["Enums"]["user_tier"]
          updated_at?: string | null
          user_id: string
          years_in_role?: string | null
        }
        Update: {
          assessment_completion_pct?: number
          assessment_status?: string
          business_name?: string | null
          company_name?: string | null
          company_profile_complete?: boolean
          coupon_code_used?: string | null
          created_at?: string | null
          diagnostic_purchased_at?: string | null
          email?: string | null
          first_name?: string | null
          full_name?: string | null
          ghl_contact_id?: string | null
          growth_stage?: Database["public"]["Enums"]["growth_stage"] | null
          id?: string
          invite_accepted_at?: string | null
          invite_token?: string | null
          job_function?: string | null
          last_active_at?: string | null
          last_name?: string | null
          pain_point_categories?: Json | null
          pain_point_open_text?: string | null
          pain_point_ranking?: Json | null
          primary_background?: string | null
          profile_complete?: boolean
          profile_photo_url?: string | null
          role?: string
          role_title?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          stripe_subscription_status?: string | null
          subscription_current_period_end?: string | null
          team_owner_id?: string | null
          tier?: Database["public"]["Enums"]["user_tier"]
          updated_at?: string | null
          user_id?: string
          years_in_role?: string | null
        }
        Relationships: []
      }
      report_narratives: {
        Row: {
          assessment_id: string
          created_at: string | null
          exec_body: string | null
          exec_headline: string | null
          generated_at: string | null
          id: string
          model_used: string | null
          narrative_auth: string | null
          narrative_conv: string | null
          narrative_lfc: string | null
          narrative_pos: string | null
          narrative_vis: string | null
          operating_conditions: Json | null
          top_risks: Json | null
          user_id: string
        }
        Insert: {
          assessment_id: string
          created_at?: string | null
          exec_body?: string | null
          exec_headline?: string | null
          generated_at?: string | null
          id?: string
          model_used?: string | null
          narrative_auth?: string | null
          narrative_conv?: string | null
          narrative_lfc?: string | null
          narrative_pos?: string | null
          narrative_vis?: string | null
          operating_conditions?: Json | null
          top_risks?: Json | null
          user_id: string
        }
        Update: {
          assessment_id?: string
          created_at?: string | null
          exec_body?: string | null
          exec_headline?: string | null
          generated_at?: string | null
          id?: string
          model_used?: string | null
          narrative_auth?: string | null
          narrative_conv?: string | null
          narrative_lfc?: string | null
          narrative_pos?: string | null
          narrative_vis?: string | null
          operating_conditions?: Json | null
          top_risks?: Json | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "report_narratives_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: true
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
        ]
      }
      roadmap_selections: {
        Row: {
          assessment_id: string
          child_system_id: string
          horizon: string
          id: string
          selected_at: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          assessment_id: string
          child_system_id: string
          horizon: string
          id?: string
          selected_at?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          assessment_id?: string
          child_system_id?: string
          horizon?: string
          id?: string
          selected_at?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "roadmap_selections_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
        ]
      }
      team_members: {
        Row: {
          cluster_label: string | null
          created_at: string
          display_name: string | null
          email: string
          id: string
          invite_accepted_at: string | null
          invite_sent_at: string
          invite_token: string
          status: string
          team_id: string
          user_id: string | null
        }
        Insert: {
          cluster_label?: string | null
          created_at?: string
          display_name?: string | null
          email: string
          id?: string
          invite_accepted_at?: string | null
          invite_sent_at?: string
          invite_token: string
          status?: string
          team_id: string
          user_id?: string | null
        }
        Update: {
          cluster_label?: string | null
          created_at?: string
          display_name?: string | null
          email?: string
          id?: string
          invite_accepted_at?: string | null
          invite_sent_at?: string
          invite_token?: string
          status?: string
          team_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "team_members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          created_at: string
          id: string
          owner_id: string
          team_name: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          owner_id: string
          team_name?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          owner_id?: string
          team_name?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
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
      has_role: {
        Args: { _role: Database["public"]["Enums"]["app_role"] }
        Returns: boolean
      }
      match_knowledge_chunks: {
        Args: {
          match_count?: number
          match_threshold?: number
          query_embedding: string
        }
        Returns: {
          content: string
          id: string
          metadata: Json
          similarity: number
          source: string
          source_id: string
        }[]
      }
      refresh_profile_completion: {
        Args: { _user_id: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role:
        | "admin"
        | "consultant"
        | "client"
        | "starter"
        | "member"
        | "pro"
        | "team_owner"
      growth_stage: "seed" | "early" | "growth" | "scale"
      user_tier: "starter" | "pro" | "diagnostic"
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
      app_role: [
        "admin",
        "consultant",
        "client",
        "starter",
        "member",
        "pro",
        "team_owner",
      ],
      growth_stage: ["seed", "early", "growth", "scale"],
      user_tier: ["starter", "pro", "diagnostic"],
    },
  },
} as const
