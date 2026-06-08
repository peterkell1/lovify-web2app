// @ts-nocheck -- ported from the (non-strict) Lovify app repo; web2app funnel code
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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      admin_audit_log: {
        Row: {
          action: string
          admin_user_id: string
          created_at: string
          details: Json | null
          id: string
          target_id: string | null
          target_type: string | null
        }
        Insert: {
          action: string
          admin_user_id: string
          created_at?: string
          details?: Json | null
          id?: string
          target_id?: string | null
          target_type?: string | null
        }
        Update: {
          action?: string
          admin_user_id?: string
          created_at?: string
          details?: Json | null
          id?: string
          target_id?: string | null
          target_type?: string | null
        }
        Relationships: []
      }
      admin_excluded_users: {
        Row: {
          excluded_at: string
          excluded_by: string
          reason: string | null
          user_id: string
        }
        Insert: {
          excluded_at?: string
          excluded_by: string
          reason?: string | null
          user_id: string
        }
        Update: {
          excluded_at?: string
          excluded_by?: string
          reason?: string | null
          user_id?: string
        }
        Relationships: []
      }
      album_songs: {
        Row: {
          added_at: string
          album_id: string
          id: string
          position: number
          song_id: string
        }
        Insert: {
          added_at?: string
          album_id: string
          id?: string
          position?: number
          song_id: string
        }
        Update: {
          added_at?: string
          album_id?: string
          id?: string
          position?: number
          song_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "album_songs_album_id_fkey"
            columns: ["album_id"]
            isOneToOne: false
            referencedRelation: "albums"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "album_songs_song_id_fkey"
            columns: ["song_id"]
            isOneToOne: false
            referencedRelation: "generated_songs"
            referencedColumns: ["id"]
          },
        ]
      }
      albums: {
        Row: {
          cover_url: string | null
          created_at: string
          description: string | null
          id: string
          is_public: boolean
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          cover_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_public?: boolean
          name?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          cover_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_public?: boolean
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      api_costs: {
        Row: {
          cost_type: string
          cost_usd: number
          created_at: string
          dream_id: string | null
          id: string
          metadata: Json | null
          model_name: string
          user_id: string
        }
        Insert: {
          cost_type: string
          cost_usd: number
          created_at?: string
          dream_id?: string | null
          id?: string
          metadata?: Json | null
          model_name: string
          user_id: string
        }
        Update: {
          cost_type?: string
          cost_usd?: number
          created_at?: string
          dream_id?: string | null
          id?: string
          metadata?: Json | null
          model_name?: string
          user_id?: string
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          key: string
          updated_at: string
          updated_by: string | null
          value: string
        }
        Insert: {
          key: string
          updated_at?: string
          updated_by?: string | null
          value: string
        }
        Update: {
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: string
        }
        Relationships: []
      }
      attribution_events: {
        Row: {
          created_at: string
          event_id: string
          event_name: string
          id: string
          payload: Json
          platform: string
          response: Json | null
          sent_at: string | null
          session_id: string | null
          status: string
        }
        Insert: {
          created_at?: string
          event_id: string
          event_name: string
          id?: string
          payload?: Json
          platform?: string
          response?: Json | null
          sent_at?: string | null
          session_id?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          event_id?: string
          event_name?: string
          id?: string
          payload?: Json
          platform?: string
          response?: Json | null
          sent_at?: string | null
          session_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "attribution_events_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "funnel_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      bug_reports: {
        Row: {
          account_type: string | null
          app_version: string | null
          can_contact: boolean
          category: string
          created_at: string
          current_route: string | null
          description: string
          device_info: Json | null
          email: string
          id: string
          internal_notes: string | null
          recent_actions: Json | null
          recent_errors: Json | null
          resolved_at: string | null
          screenshot_url: string | null
          status: string
          user_id: string | null
        }
        Insert: {
          account_type?: string | null
          app_version?: string | null
          can_contact?: boolean
          category: string
          created_at?: string
          current_route?: string | null
          description: string
          device_info?: Json | null
          email: string
          id?: string
          internal_notes?: string | null
          recent_actions?: Json | null
          recent_errors?: Json | null
          resolved_at?: string | null
          screenshot_url?: string | null
          status?: string
          user_id?: string | null
        }
        Update: {
          account_type?: string | null
          app_version?: string | null
          can_contact?: boolean
          category?: string
          created_at?: string
          current_route?: string | null
          description?: string
          device_info?: Json | null
          email?: string
          id?: string
          internal_notes?: string | null
          recent_actions?: Json | null
          recent_errors?: Json | null
          resolved_at?: string | null
          screenshot_url?: string | null
          status?: string
          user_id?: string | null
        }
        Relationships: []
      }
      characters: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_default: boolean
          name: string
          photo_url: string | null
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_default?: boolean
          name: string
          photo_url?: string | null
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_default?: boolean
          name?: string
          photo_url?: string | null
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      chat_sessions: {
        Row: {
          ended_at: string | null
          extracted_insights: Json | null
          id: string
          message_count: number
          song_generated: boolean
          started_at: string
          summary: string | null
          user_id: string
        }
        Insert: {
          ended_at?: string | null
          extracted_insights?: Json | null
          id?: string
          message_count?: number
          song_generated?: boolean
          started_at?: string
          summary?: string | null
          user_id: string
        }
        Update: {
          ended_at?: string | null
          extracted_insights?: Json | null
          id?: string
          message_count?: number
          song_generated?: boolean
          started_at?: string
          summary?: string | null
          user_id?: string
        }
        Relationships: []
      }
      community_wins: {
        Row: {
          created_at: string | null
          description: string
          goal_id: string
          id: string
          like_count: number | null
          song_ids: string[] | null
          total_listens_at_achievement: number | null
          user_id: string
          vision_ids: string[] | null
        }
        Insert: {
          created_at?: string | null
          description: string
          goal_id: string
          id?: string
          like_count?: number | null
          song_ids?: string[] | null
          total_listens_at_achievement?: number | null
          user_id: string
          vision_ids?: string[] | null
        }
        Update: {
          created_at?: string | null
          description?: string
          goal_id?: string
          id?: string
          like_count?: number | null
          song_ids?: string[] | null
          total_listens_at_achievement?: number | null
          user_id?: string
          vision_ids?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "community_wins_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "user_goals"
            referencedColumns: ["id"]
          },
        ]
      }
      content_moderation_log: {
        Row: {
          category: string | null
          created_at: string
          id: string
          layer: string
          prompt: string
          reason: string | null
          surface: string
          user_id: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string
          id?: string
          layer: string
          prompt: string
          reason?: string | null
          surface: string
          user_id?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string
          id?: string
          layer?: string
          prompt?: string
          reason?: string | null
          surface?: string
          user_id?: string | null
        }
        Relationships: []
      }
      content_reports: {
        Row: {
          action_taken: string | null
          actioned_at: string | null
          actioned_by: string | null
          category: string
          created_at: string
          description: string | null
          id: string
          reporter_user_id: string
          status: string
          target_id: string
          target_type: string
          target_user_id: string | null
        }
        Insert: {
          action_taken?: string | null
          actioned_at?: string | null
          actioned_by?: string | null
          category: string
          created_at?: string
          description?: string | null
          id?: string
          reporter_user_id: string
          status?: string
          target_id: string
          target_type: string
          target_user_id?: string | null
        }
        Update: {
          action_taken?: string | null
          actioned_at?: string | null
          actioned_by?: string | null
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          reporter_user_id?: string
          status?: string
          target_id?: string
          target_type?: string
          target_user_id?: string | null
        }
        Relationships: []
      }
      credit_transactions: {
        Row: {
          amount: number
          created_at: string
          description: string | null
          id: string
          reference_id: string | null
          transaction_type: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          description?: string | null
          id?: string
          reference_id?: string | null
          transaction_type: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string | null
          id?: string
          reference_id?: string | null
          transaction_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "credit_transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_sounds: {
        Row: {
          conversation_history: Json | null
          created_at: string
          description: string | null
          id: string
          is_favorite: boolean | null
          name: string
          sample_url: string | null
          status: string
          style_prompt: string
          task_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          conversation_history?: Json | null
          created_at?: string
          description?: string | null
          id?: string
          is_favorite?: boolean | null
          name: string
          sample_url?: string | null
          status?: string
          style_prompt: string
          task_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          conversation_history?: Json | null
          created_at?: string
          description?: string | null
          id?: string
          is_favorite?: boolean | null
          name?: string
          sample_url?: string | null
          status?: string
          style_prompt?: string
          task_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      custom_voices: {
        Row: {
          created_at: string
          description: string | null
          error_message: string | null
          id: string
          is_favorite: boolean | null
          name: string
          persona_id: string | null
          sample_url: string | null
          source_audio_id: string | null
          source_task_id: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          error_message?: string | null
          id?: string
          is_favorite?: boolean | null
          name: string
          persona_id?: string | null
          sample_url?: string | null
          source_audio_id?: string | null
          source_task_id?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          error_message?: string | null
          id?: string
          is_favorite?: boolean | null
          name?: string
          persona_id?: string | null
          sample_url?: string | null
          source_audio_id?: string | null
          source_task_id?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      daily_gift_funnel_stats: {
        Row: {
          avg_time_to_next_step_seconds: number | null
          count: number
          created_at: string
          date: string
          event_name: string
          id: string
          unique_users: number
          updated_at: string
        }
        Insert: {
          avg_time_to_next_step_seconds?: number | null
          count?: number
          created_at?: string
          date: string
          event_name: string
          id?: string
          unique_users?: number
          updated_at?: string
        }
        Update: {
          avg_time_to_next_step_seconds?: number | null
          count?: number
          created_at?: string
          date?: string
          event_name?: string
          id?: string
          unique_users?: number
          updated_at?: string
        }
        Relationships: []
      }
      daily_pnl_stats: {
        Row: {
          created_at: string
          credit_pack_revenue_usd: number
          date: string
          gift_revenue_usd: number
          id: string
          image_costs_usd: number
          image_count: number
          music_costs_usd: number
          other_revenue_usd: number
          song_count: number
          subscription_revenue_usd: number
          text_costs_usd: number
          token_count: number
          total_costs_usd: number
          total_revenue_usd: number
          updated_at: string
          video_costs_usd: number
          video_count: number
        }
        Insert: {
          created_at?: string
          credit_pack_revenue_usd?: number
          date: string
          gift_revenue_usd?: number
          id?: string
          image_costs_usd?: number
          image_count?: number
          music_costs_usd?: number
          other_revenue_usd?: number
          song_count?: number
          subscription_revenue_usd?: number
          text_costs_usd?: number
          token_count?: number
          total_costs_usd?: number
          total_revenue_usd?: number
          updated_at?: string
          video_costs_usd?: number
          video_count?: number
        }
        Update: {
          created_at?: string
          credit_pack_revenue_usd?: number
          date?: string
          gift_revenue_usd?: number
          id?: string
          image_costs_usd?: number
          image_count?: number
          music_costs_usd?: number
          other_revenue_usd?: number
          song_count?: number
          subscription_revenue_usd?: number
          text_costs_usd?: number
          token_count?: number
          total_costs_usd?: number
          total_revenue_usd?: number
          updated_at?: string
          video_costs_usd?: number
          video_count?: number
        }
        Relationships: []
      }
      design_prototype_votes: {
        Row: {
          choice: string
          id: string
          session_id: string
          voted_at: string
        }
        Insert: {
          choice: string
          id?: string
          session_id: string
          voted_at?: string
        }
        Update: {
          choice?: string
          id?: string
          session_id?: string
          voted_at?: string
        }
        Relationships: []
      }
      dream_quality_events: {
        Row: {
          created_at: string
          dream_id: string
          event_type: string
          id: string
          metadata: Json | null
          user_id: string
        }
        Insert: {
          created_at?: string
          dream_id: string
          event_type: string
          id?: string
          metadata?: Json | null
          user_id: string
        }
        Update: {
          created_at?: string
          dream_id?: string
          event_type?: string
          id?: string
          metadata?: Json | null
          user_id?: string
        }
        Relationships: []
      }
      email_verification_tokens: {
        Row: {
          created_at: string
          expires_at: string
          token: string
          used_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string
          token?: string
          used_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          token?: string
          used_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      feature_access: {
        Row: {
          feature_name: string
          granted_at: string | null
          granted_by: string | null
          id: string
          user_id: string
        }
        Insert: {
          feature_name: string
          granted_at?: string | null
          granted_by?: string | null
          id?: string
          user_id: string
        }
        Update: {
          feature_name?: string
          granted_at?: string | null
          granted_by?: string | null
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      feature_flags: {
        Row: {
          description: string | null
          id: string
          is_enabled: boolean | null
          name: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          description?: string | null
          id?: string
          is_enabled?: boolean | null
          name: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          description?: string | null
          id?: string
          is_enabled?: boolean | null
          name?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      follows: {
        Row: {
          created_at: string
          follower_id: string
          following_id: string
          id: string
        }
        Insert: {
          created_at?: string
          follower_id: string
          following_id: string
          id?: string
        }
        Update: {
          created_at?: string
          follower_id?: string
          following_id?: string
          id?: string
        }
        Relationships: []
      }
      funnel_answers: {
        Row: {
          answer: Json
          answered_at: string
          id: string
          session_id: string
          step_id: string
          step_key: string
        }
        Insert: {
          answer: Json
          answered_at?: string
          id?: string
          session_id: string
          step_id: string
          step_key: string
        }
        Update: {
          answer?: Json
          answered_at?: string
          id?: string
          session_id?: string
          step_id?: string
          step_key?: string
        }
        Relationships: [
          {
            foreignKeyName: "funnel_answers_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "funnel_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "funnel_answers_step_id_fkey"
            columns: ["step_id"]
            isOneToOne: false
            referencedRelation: "funnel_steps"
            referencedColumns: ["id"]
          },
        ]
      }
      funnel_sessions: {
        Row: {
          attribution: Json
          converted_at: string | null
          created_at: string
          current_step_key: string | null
          email: string | null
          funnel_id: string
          id: string
          ip_hash: string | null
          landing_event_id: string
          plan_key: string | null
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          updated_at: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          attribution?: Json
          converted_at?: string | null
          created_at?: string
          current_step_key?: string | null
          email?: string | null
          funnel_id: string
          id?: string
          ip_hash?: string | null
          landing_event_id?: string
          plan_key?: string | null
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          attribution?: Json
          converted_at?: string | null
          created_at?: string
          current_step_key?: string | null
          email?: string | null
          funnel_id?: string
          id?: string
          ip_hash?: string | null
          landing_event_id?: string
          plan_key?: string | null
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "funnel_sessions_funnel_id_fkey"
            columns: ["funnel_id"]
            isOneToOne: false
            referencedRelation: "funnels"
            referencedColumns: ["id"]
          },
        ]
      }
      funnel_steps: {
        Row: {
          config: Json
          created_at: string
          funnel_id: string
          id: string
          position: number
          step_key: string
          step_type: string
          updated_at: string
        }
        Insert: {
          config?: Json
          created_at?: string
          funnel_id: string
          id?: string
          position: number
          step_key: string
          step_type: string
          updated_at?: string
        }
        Update: {
          config?: Json
          created_at?: string
          funnel_id?: string
          id?: string
          position?: number
          step_key?: string
          step_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "funnel_steps_funnel_id_fkey"
            columns: ["funnel_id"]
            isOneToOne: false
            referencedRelation: "funnels"
            referencedColumns: ["id"]
          },
        ]
      }
      funnel_submissions: {
        Row: {
          answers: Json
          converted_at: string | null
          created_at: string
          email: string | null
          id: string
          partner_name: string | null
          plan_id: string | null
          stripe_customer_id: string | null
          stripe_session_id: string | null
          user_agent: string | null
          utm: Json
          vibe: string | null
        }
        Insert: {
          answers?: Json
          converted_at?: string | null
          created_at?: string
          email?: string | null
          id?: string
          partner_name?: string | null
          plan_id?: string | null
          stripe_customer_id?: string | null
          stripe_session_id?: string | null
          user_agent?: string | null
          utm?: Json
          vibe?: string | null
        }
        Update: {
          answers?: Json
          converted_at?: string | null
          created_at?: string
          email?: string | null
          id?: string
          partner_name?: string | null
          plan_id?: string | null
          stripe_customer_id?: string | null
          stripe_session_id?: string | null
          user_agent?: string | null
          utm?: Json
          vibe?: string | null
        }
        Relationships: []
      }
      funnels: {
        Row: {
          created_at: string
          created_by: string | null
          default_interval: string | null
          default_plan_key: string | null
          description: string | null
          id: string
          meta_pixel_id: string | null
          most_popular_plan_key: string | null
          name: string
          plan_options: Json
          published_at: string | null
          slug: string
          status: string
          template: string | null
          theme: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          default_interval?: string | null
          default_plan_key?: string | null
          description?: string | null
          id?: string
          meta_pixel_id?: string | null
          most_popular_plan_key?: string | null
          name: string
          plan_options?: Json
          published_at?: string | null
          slug: string
          status?: string
          template?: string | null
          theme?: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          default_interval?: string | null
          default_plan_key?: string | null
          description?: string | null
          id?: string
          meta_pixel_id?: string | null
          most_popular_plan_key?: string | null
          name?: string
          plan_options?: Json
          published_at?: string | null
          slug?: string
          status?: string
          template?: string | null
          theme?: Json
          updated_at?: string
        }
        Relationships: []
      }
      generated_songs: {
        Row: {
          audio_url: string | null
          benefit_summary: string | null
          benefit_tags: string[] | null
          chat_session_id: string | null
          cover_vision_id: string | null
          created_at: string
          duration: number | null
          genre: string
          gift_recipient_name: string | null
          gifted_by_name: string | null
          id: string
          image_url: string | null
          is_gift: boolean | null
          is_public: boolean
          is_tuned_432: boolean | null
          kie_audio_id: string | null
          kie_model_version: string | null
          lyrics: string | null
          mureka_song_id: string | null
          play_count: number
          saved_to_library: boolean
          song_type: string
          style: string | null
          task_id: string | null
          timestamped_lyrics: Json | null
          title: string | null
          user_id: string
        }
        Insert: {
          audio_url?: string | null
          benefit_summary?: string | null
          benefit_tags?: string[] | null
          chat_session_id?: string | null
          cover_vision_id?: string | null
          created_at?: string
          duration?: number | null
          genre: string
          gift_recipient_name?: string | null
          gifted_by_name?: string | null
          id?: string
          image_url?: string | null
          is_gift?: boolean | null
          is_public?: boolean
          is_tuned_432?: boolean | null
          kie_audio_id?: string | null
          kie_model_version?: string | null
          lyrics?: string | null
          mureka_song_id?: string | null
          play_count?: number
          saved_to_library?: boolean
          song_type: string
          style?: string | null
          task_id?: string | null
          timestamped_lyrics?: Json | null
          title?: string | null
          user_id: string
        }
        Update: {
          audio_url?: string | null
          benefit_summary?: string | null
          benefit_tags?: string[] | null
          chat_session_id?: string | null
          cover_vision_id?: string | null
          created_at?: string
          duration?: number | null
          genre?: string
          gift_recipient_name?: string | null
          gifted_by_name?: string | null
          id?: string
          image_url?: string | null
          is_gift?: boolean | null
          is_public?: boolean
          is_tuned_432?: boolean | null
          kie_audio_id?: string | null
          kie_model_version?: string | null
          lyrics?: string | null
          mureka_song_id?: string | null
          play_count?: number
          saved_to_library?: boolean
          song_type?: string
          style?: string | null
          task_id?: string | null
          timestamped_lyrics?: Json | null
          title?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "generated_songs_chat_session_id_fkey"
            columns: ["chat_session_id"]
            isOneToOne: false
            referencedRelation: "lyrics_chat_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generated_songs_cover_vision_id_fkey"
            columns: ["cover_vision_id"]
            isOneToOne: false
            referencedRelation: "generated_visions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generated_songs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      generated_videos: {
        Row: {
          aspect_ratio: string | null
          audio_start_seconds: number | null
          created_at: string
          duration_seconds: number | null
          error_message: string | null
          fal_model_id: string | null
          id: string
          is_favorite: boolean
          is_public: boolean
          kling_task_id: string | null
          life_category: string | null
          motion_prompt: string | null
          raw_video_url: string | null
          song_id: string | null
          source_image_url: string | null
          status: string
          thumbnail_url: string | null
          updated_at: string
          user_id: string
          video_url: string | null
          vision_id: string | null
        }
        Insert: {
          aspect_ratio?: string | null
          audio_start_seconds?: number | null
          created_at?: string
          duration_seconds?: number | null
          error_message?: string | null
          fal_model_id?: string | null
          id?: string
          is_favorite?: boolean
          is_public?: boolean
          kling_task_id?: string | null
          life_category?: string | null
          motion_prompt?: string | null
          raw_video_url?: string | null
          song_id?: string | null
          source_image_url?: string | null
          status?: string
          thumbnail_url?: string | null
          updated_at?: string
          user_id: string
          video_url?: string | null
          vision_id?: string | null
        }
        Update: {
          aspect_ratio?: string | null
          audio_start_seconds?: number | null
          created_at?: string
          duration_seconds?: number | null
          error_message?: string | null
          fal_model_id?: string | null
          id?: string
          is_favorite?: boolean
          is_public?: boolean
          kling_task_id?: string | null
          life_category?: string | null
          motion_prompt?: string | null
          raw_video_url?: string | null
          song_id?: string | null
          source_image_url?: string | null
          status?: string
          thumbnail_url?: string | null
          updated_at?: string
          user_id?: string
          video_url?: string | null
          vision_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "generated_videos_song_id_fkey"
            columns: ["song_id"]
            isOneToOne: false
            referencedRelation: "generated_songs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generated_videos_vision_id_fkey"
            columns: ["vision_id"]
            isOneToOne: false
            referencedRelation: "generated_visions"
            referencedColumns: ["id"]
          },
        ]
      }
      generated_visions: {
        Row: {
          affirmation_text: string | null
          aspect_ratio: string | null
          character_id: string | null
          character_ids: string[]
          clothing_context: string | null
          created_at: string
          display_order: number | null
          enhanced_prompt: string | null
          goal_context: string | null
          id: string
          image_url: string
          image_url_watermarked: string | null
          is_public: boolean
          life_area: string | null
          life_category: string | null
          mood_sound_id: string | null
          prompt: string | null
          request_id: string | null
          user_id: string
          video_id: string | null
          view_count: number
        }
        Insert: {
          affirmation_text?: string | null
          aspect_ratio?: string | null
          character_id?: string | null
          character_ids?: string[]
          clothing_context?: string | null
          created_at?: string
          display_order?: number | null
          enhanced_prompt?: string | null
          goal_context?: string | null
          id?: string
          image_url: string
          image_url_watermarked?: string | null
          is_public?: boolean
          life_area?: string | null
          life_category?: string | null
          mood_sound_id?: string | null
          prompt?: string | null
          request_id?: string | null
          user_id: string
          video_id?: string | null
          view_count?: number
        }
        Update: {
          affirmation_text?: string | null
          aspect_ratio?: string | null
          character_id?: string | null
          character_ids?: string[]
          clothing_context?: string | null
          created_at?: string
          display_order?: number | null
          enhanced_prompt?: string | null
          goal_context?: string | null
          id?: string
          image_url?: string
          image_url_watermarked?: string | null
          is_public?: boolean
          life_area?: string | null
          life_category?: string | null
          mood_sound_id?: string | null
          prompt?: string | null
          request_id?: string | null
          user_id?: string
          video_id?: string | null
          view_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "generated_visions_character_id_fkey"
            columns: ["character_id"]
            isOneToOne: false
            referencedRelation: "characters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generated_visions_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "generated_videos"
            referencedColumns: ["id"]
          },
        ]
      }
      generation_events: {
        Row: {
          completed_at: string | null
          created_at: string
          duration_ms: number | null
          error_message: string | null
          generation_type: string
          id: string
          metadata: Json | null
          status: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          duration_ms?: number | null
          error_message?: string | null
          generation_type: string
          id?: string
          metadata?: Json | null
          status?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          duration_ms?: number | null
          error_message?: string | null
          generation_type?: string
          id?: string
          metadata?: Json | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      genre_favorites: {
        Row: {
          created_at: string | null
          genre_id: string
          genre_label: string
          genre_level: string
          id: string
          parent_genre_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          genre_id: string
          genre_label: string
          genre_level: string
          id?: string
          parent_genre_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          genre_id?: string
          genre_label?: string
          genre_level?: string
          id?: string
          parent_genre_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      genre_samples: {
        Row: {
          cover_url: string | null
          created_at: string
          error_message: string | null
          genre_id: string
          genre_label: string
          genre_level: string
          id: string
          parent_genre_id: string | null
          sample_url: string | null
          status: string
          task_id: string | null
          updated_at: string
        }
        Insert: {
          cover_url?: string | null
          created_at?: string
          error_message?: string | null
          genre_id: string
          genre_label: string
          genre_level: string
          id?: string
          parent_genre_id?: string | null
          sample_url?: string | null
          status?: string
          task_id?: string | null
          updated_at?: string
        }
        Update: {
          cover_url?: string | null
          created_at?: string
          error_message?: string | null
          genre_id?: string
          genre_label?: string
          genre_level?: string
          id?: string
          parent_genre_id?: string | null
          sample_url?: string | null
          status?: string
          task_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      gift_funnel_events: {
        Row: {
          created_at: string
          event_name: string
          gift_id: string | null
          id: string
          metadata: Json | null
          session_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          event_name: string
          gift_id?: string | null
          id?: string
          metadata?: Json | null
          session_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          event_name?: string
          gift_id?: string | null
          id?: string
          metadata?: Json | null
          session_id?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      help_article_views: {
        Row: {
          article_id: string
          created_at: string
          id: string
          search_query: string | null
          user_id: string | null
        }
        Insert: {
          article_id: string
          created_at?: string
          id?: string
          search_query?: string | null
          user_id?: string | null
        }
        Update: {
          article_id?: string
          created_at?: string
          id?: string
          search_query?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      help_searches: {
        Row: {
          created_at: string
          id: string
          query: string
          results_count: number
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          query: string
          results_count?: number
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          query?: string
          results_count?: number
          user_id?: string | null
        }
        Relationships: []
      }
      iap_transactions: {
        Row: {
          created_at: string
          credits_granted: number
          id: string
          kind: string
          metadata: Json | null
          plan_id: string | null
          product_identifier: string
          revenuecat_app_user_id: string | null
          transaction_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          credits_granted?: number
          id?: string
          kind: string
          metadata?: Json | null
          plan_id?: string | null
          product_identifier: string
          revenuecat_app_user_id?: string | null
          transaction_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          credits_granted?: number
          id?: string
          kind?: string
          metadata?: Json | null
          plan_id?: string | null
          product_identifier?: string
          revenuecat_app_user_id?: string | null
          transaction_id?: string
          user_id?: string
        }
        Relationships: []
      }
      lyrics_chat_sessions: {
        Row: {
          active_song_session_id: string | null
          created_at: string
          id: string
          messages: Json
          status: string | null
          title: string
          updated_at: string
          user_id: string
          workspace_context: Json | null
        }
        Insert: {
          active_song_session_id?: string | null
          created_at?: string
          id?: string
          messages?: Json
          status?: string | null
          title?: string
          updated_at?: string
          user_id: string
          workspace_context?: Json | null
        }
        Update: {
          active_song_session_id?: string | null
          created_at?: string
          id?: string
          messages?: Json
          status?: string | null
          title?: string
          updated_at?: string
          user_id?: string
          workspace_context?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "lyrics_chat_sessions_active_song_session_id_fkey"
            columns: ["active_song_session_id"]
            isOneToOne: false
            referencedRelation: "song_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      meditation_sessions: {
        Row: {
          completed_at: string | null
          created_at: string
          duration_minutes: number
          id: string
          script_text: string | null
          user_id: string
          vision_id: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          duration_minutes: number
          id?: string
          script_text?: string | null
          user_id: string
          vision_id?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          duration_minutes?: number
          id?: string
          script_text?: string | null
          user_id?: string
          vision_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "meditation_sessions_vision_id_fkey"
            columns: ["vision_id"]
            isOneToOne: false
            referencedRelation: "generated_visions"
            referencedColumns: ["id"]
          },
        ]
      }
      music_taste_profiles: {
        Row: {
          created_at: string | null
          energy_level: string | null
          favorite_artists: string | null
          favorite_genres: string[] | null
          favorite_subgenres: string[] | null
          id: string
          mood_preference: string | null
          music_description: string | null
          tempo_preference: string | null
          updated_at: string | null
          user_id: string
          vocal_preference: string | null
        }
        Insert: {
          created_at?: string | null
          energy_level?: string | null
          favorite_artists?: string | null
          favorite_genres?: string[] | null
          favorite_subgenres?: string[] | null
          id?: string
          mood_preference?: string | null
          music_description?: string | null
          tempo_preference?: string | null
          updated_at?: string | null
          user_id: string
          vocal_preference?: string | null
        }
        Update: {
          created_at?: string | null
          energy_level?: string | null
          favorite_artists?: string | null
          favorite_genres?: string[] | null
          favorite_subgenres?: string[] | null
          id?: string
          mood_preference?: string | null
          music_description?: string | null
          tempo_preference?: string | null
          updated_at?: string | null
          user_id?: string
          vocal_preference?: string | null
        }
        Relationships: []
      }
      music_video_clips: {
        Row: {
          created_at: string
          custom_order: number | null
          duration_seconds: number | null
          error_message: string | null
          fal_request_id: string | null
          id: string
          is_excluded: boolean | null
          job_id: string
          lyrics_section: string | null
          prompt: string
          retry_count: number | null
          sequence_index: number
          sequence_name: string
          start_image_error: string | null
          start_image_generated_at: string | null
          start_image_url: string | null
          status: string
          video_url: string | null
        }
        Insert: {
          created_at?: string
          custom_order?: number | null
          duration_seconds?: number | null
          error_message?: string | null
          fal_request_id?: string | null
          id?: string
          is_excluded?: boolean | null
          job_id: string
          lyrics_section?: string | null
          prompt: string
          retry_count?: number | null
          sequence_index: number
          sequence_name: string
          start_image_error?: string | null
          start_image_generated_at?: string | null
          start_image_url?: string | null
          status?: string
          video_url?: string | null
        }
        Update: {
          created_at?: string
          custom_order?: number | null
          duration_seconds?: number | null
          error_message?: string | null
          fal_request_id?: string | null
          id?: string
          is_excluded?: boolean | null
          job_id?: string
          lyrics_section?: string | null
          prompt?: string
          retry_count?: number | null
          sequence_index?: number
          sequence_name?: string
          start_image_error?: string | null
          start_image_generated_at?: string | null
          start_image_url?: string | null
          status?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "music_video_clips_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "music_video_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      music_video_jobs: {
        Row: {
          completed_clips: number | null
          cover_image_url: string
          created_at: string
          error_message: string | null
          final_video_url: string | null
          id: string
          quality_tier: string
          scenes_json: Json | null
          song_id: string
          status: string
          total_clips: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_clips?: number | null
          cover_image_url: string
          created_at?: string
          error_message?: string | null
          final_video_url?: string | null
          id?: string
          quality_tier?: string
          scenes_json?: Json | null
          song_id: string
          status?: string
          total_clips?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_clips?: number | null
          cover_image_url?: string
          created_at?: string
          error_message?: string | null
          final_video_url?: string | null
          id?: string
          quality_tier?: string
          scenes_json?: Json | null
          song_id?: string
          status?: string
          total_clips?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "music_video_jobs_song_id_fkey"
            columns: ["song_id"]
            isOneToOne: false
            referencedRelation: "generated_songs"
            referencedColumns: ["id"]
          },
        ]
      }
      onboarding_events: {
        Row: {
          completed_at: string | null
          id: string
          step_name: string
          step_number: number
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          id?: string
          step_name: string
          step_number: number
          user_id: string
        }
        Update: {
          completed_at?: string | null
          id?: string
          step_name?: string
          step_number?: number
          user_id?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount_cents: number
          created_at: string
          currency: string
          id: string
          status: string
          stripe_payment_id: string | null
          user_id: string
        }
        Insert: {
          amount_cents: number
          created_at?: string
          currency?: string
          id?: string
          status?: string
          stripe_payment_id?: string | null
          user_id: string
        }
        Update: {
          amount_cents?: number
          created_at?: string
          currency?: string
          id?: string
          status?: string
          stripe_payment_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      playlist_reactions: {
        Row: {
          created_at: string
          id: string
          playlist_id: string
          reaction: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          playlist_id: string
          reaction?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          playlist_id?: string
          reaction?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "playlist_reactions_playlist_id_fkey"
            columns: ["playlist_id"]
            isOneToOne: false
            referencedRelation: "playlists"
            referencedColumns: ["id"]
          },
        ]
      }
      playlist_songs: {
        Row: {
          added_at: string
          id: string
          playlist_id: string
          position: number
          song_id: string
        }
        Insert: {
          added_at?: string
          id?: string
          playlist_id: string
          position?: number
          song_id: string
        }
        Update: {
          added_at?: string
          id?: string
          playlist_id?: string
          position?: number
          song_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "playlist_songs_playlist_id_fkey"
            columns: ["playlist_id"]
            isOneToOne: false
            referencedRelation: "playlists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "playlist_songs_song_id_fkey"
            columns: ["song_id"]
            isOneToOne: false
            referencedRelation: "generated_songs"
            referencedColumns: ["id"]
          },
        ]
      }
      playlists: {
        Row: {
          cover_url: string | null
          created_at: string
          description: string | null
          id: string
          is_public: boolean
          like_count: number
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          cover_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_public?: boolean
          like_count?: number
          name?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          cover_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_public?: boolean
          like_count?: number
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          ai_consent_accepted_at: string | null
          ai_consent_version: string | null
          attribution_data: Json | null
          avatar_url: string | null
          bio: string | null
          cover_url: string | null
          created_at: string
          display_name: string | null
          email: string | null
          follower_count: number
          following_count: number
          has_completed_post_signup: boolean
          id: string
          is_banned: boolean
          is_public: boolean
          monthly_goal: number | null
          notification_time: string | null
          post_signup_last_activity_at: string | null
          post_signup_step: string | null
          quiz_age_range: string | null
          quiz_completed_at: string | null
          quiz_gender: string | null
          quiz_goals: string[] | null
          quiz_mindset_key: string | null
          quiz_mood_boosters: string[] | null
          subscription_status: string
          terms_accepted_at: string | null
          updated_at: string
          welcome_bonus_acknowledged: boolean
        }
        Insert: {
          ai_consent_accepted_at?: string | null
          ai_consent_version?: string | null
          attribution_data?: Json | null
          avatar_url?: string | null
          bio?: string | null
          cover_url?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          follower_count?: number
          following_count?: number
          has_completed_post_signup?: boolean
          id: string
          is_banned?: boolean
          is_public?: boolean
          monthly_goal?: number | null
          notification_time?: string | null
          post_signup_last_activity_at?: string | null
          post_signup_step?: string | null
          quiz_age_range?: string | null
          quiz_completed_at?: string | null
          quiz_gender?: string | null
          quiz_goals?: string[] | null
          quiz_mindset_key?: string | null
          quiz_mood_boosters?: string[] | null
          subscription_status?: string
          terms_accepted_at?: string | null
          updated_at?: string
          welcome_bonus_acknowledged?: boolean
        }
        Update: {
          ai_consent_accepted_at?: string | null
          ai_consent_version?: string | null
          attribution_data?: Json | null
          avatar_url?: string | null
          bio?: string | null
          cover_url?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          follower_count?: number
          following_count?: number
          has_completed_post_signup?: boolean
          id?: string
          is_banned?: boolean
          is_public?: boolean
          monthly_goal?: number | null
          notification_time?: string | null
          post_signup_last_activity_at?: string | null
          post_signup_step?: string | null
          quiz_age_range?: string | null
          quiz_completed_at?: string | null
          quiz_gender?: string | null
          quiz_goals?: string[] | null
          quiz_mindset_key?: string | null
          quiz_mood_boosters?: string[] | null
          subscription_status?: string
          terms_accepted_at?: string | null
          updated_at?: string
          welcome_bonus_acknowledged?: boolean
        }
        Relationships: []
      }
      prompt_overrides: {
        Row: {
          content: string
          id: string
          is_active: boolean
          prompt_key: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          content?: string
          id?: string
          is_active?: boolean
          prompt_key: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          content?: string
          id?: string
          is_active?: boolean
          prompt_key?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      reference_songs: {
        Row: {
          bridge_function: string | null
          contrast_elements: Json | null
          core_hook_concept: string | null
          created_at: string | null
          emotional_arc: string | null
          emotional_blueprint: string[] | null
          flow_style: string | null
          genre: string
          genre_conventions: string[] | null
          hook_placement: string | null
          hook_technique: string | null
          id: string
          key_patterns: string[] | null
          lyrics_content: string | null
          memorability_factors: string[] | null
          metaphor_themes: string[] | null
          musical_style_prompt: string | null
          narrative_framework: string | null
          opening_technique: string | null
          pov_perspective: string | null
          reference_artist: string
          reference_title: string
          repetition_strategy: string | null
          rhyme_scheme: string | null
          rhyme_types: string[] | null
          section_story_chunks: Json | null
          section_word_counts: Json | null
          singability_score: number | null
          song_sections: Json | null
          song_type: string
          storytelling_angle: string | null
          structure_notes: string | null
          syllable_patterns: Json | null
          tense: string | null
          verse_progression: string | null
        }
        Insert: {
          bridge_function?: string | null
          contrast_elements?: Json | null
          core_hook_concept?: string | null
          created_at?: string | null
          emotional_arc?: string | null
          emotional_blueprint?: string[] | null
          flow_style?: string | null
          genre: string
          genre_conventions?: string[] | null
          hook_placement?: string | null
          hook_technique?: string | null
          id?: string
          key_patterns?: string[] | null
          lyrics_content?: string | null
          memorability_factors?: string[] | null
          metaphor_themes?: string[] | null
          musical_style_prompt?: string | null
          narrative_framework?: string | null
          opening_technique?: string | null
          pov_perspective?: string | null
          reference_artist: string
          reference_title: string
          repetition_strategy?: string | null
          rhyme_scheme?: string | null
          rhyme_types?: string[] | null
          section_story_chunks?: Json | null
          section_word_counts?: Json | null
          singability_score?: number | null
          song_sections?: Json | null
          song_type: string
          storytelling_angle?: string | null
          structure_notes?: string | null
          syllable_patterns?: Json | null
          tense?: string | null
          verse_progression?: string | null
        }
        Update: {
          bridge_function?: string | null
          contrast_elements?: Json | null
          core_hook_concept?: string | null
          created_at?: string | null
          emotional_arc?: string | null
          emotional_blueprint?: string[] | null
          flow_style?: string | null
          genre?: string
          genre_conventions?: string[] | null
          hook_placement?: string | null
          hook_technique?: string | null
          id?: string
          key_patterns?: string[] | null
          lyrics_content?: string | null
          memorability_factors?: string[] | null
          metaphor_themes?: string[] | null
          musical_style_prompt?: string | null
          narrative_framework?: string | null
          opening_technique?: string | null
          pov_perspective?: string | null
          reference_artist?: string
          reference_title?: string
          repetition_strategy?: string | null
          rhyme_scheme?: string | null
          rhyme_types?: string[] | null
          section_story_chunks?: Json | null
          section_word_counts?: Json | null
          singability_score?: number | null
          song_sections?: Json | null
          song_type?: string
          storytelling_angle?: string | null
          structure_notes?: string | null
          syllable_patterns?: Json | null
          tense?: string | null
          verse_progression?: string | null
        }
        Relationships: []
      }
      revenue_events: {
        Row: {
          amount_usd: number
          created_at: string
          id: string
          metadata: Json | null
          payment_provider: string | null
          product_name: string | null
          revenue_type: string
          user_id: string
        }
        Insert: {
          amount_usd: number
          created_at?: string
          id?: string
          metadata?: Json | null
          payment_provider?: string | null
          product_name?: string | null
          revenue_type: string
          user_id: string
        }
        Update: {
          amount_usd?: number
          created_at?: string
          id?: string
          metadata?: Json | null
          payment_provider?: string | null
          product_name?: string | null
          revenue_type?: string
          user_id?: string
        }
        Relationships: []
      }
      saved_lyrics: {
        Row: {
          chat_session_id: string | null
          content: string
          created_at: string
          genre: string | null
          id: string
          is_favorite: boolean
          preview: string | null
          song_type: string | null
          title: string | null
          user_id: string
        }
        Insert: {
          chat_session_id?: string | null
          content: string
          created_at?: string
          genre?: string | null
          id?: string
          is_favorite?: boolean
          preview?: string | null
          song_type?: string | null
          title?: string | null
          user_id: string
        }
        Update: {
          chat_session_id?: string | null
          content?: string
          created_at?: string
          genre?: string | null
          id?: string
          is_favorite?: boolean
          preview?: string | null
          song_type?: string | null
          title?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_lyrics_chat_session_id_fkey"
            columns: ["chat_session_id"]
            isOneToOne: false
            referencedRelation: "lyrics_chat_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      song_feedback: {
        Row: {
          created_at: string
          feedback_type: string
          id: string
          issue_category: string | null
          message: string | null
          metadata: Json | null
          song_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          feedback_type: string
          id?: string
          issue_category?: string | null
          message?: string | null
          metadata?: Json | null
          song_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          feedback_type?: string
          id?: string
          issue_category?: string | null
          message?: string | null
          metadata?: Json | null
          song_id?: string
          user_id?: string
        }
        Relationships: []
      }
      song_generation_tasks: {
        Row: {
          chat_session_id: string | null
          created_at: string
          error_message: string | null
          id: string
          lyrics: string | null
          songs: Json
          status: string
          style: string | null
          task_id: string
          title: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          chat_session_id?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          lyrics?: string | null
          songs?: Json
          status?: string
          style?: string | null
          task_id: string
          title?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          chat_session_id?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          lyrics?: string | null
          songs?: Json
          status?: string
          style?: string | null
          task_id?: string
          title?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      song_play_history: {
        Row: {
          id: string
          played_at: string
          song_id: string
          user_id: string
        }
        Insert: {
          id?: string
          played_at?: string
          song_id: string
          user_id: string
        }
        Update: {
          id?: string
          played_at?: string
          song_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "song_play_history_song_id_fkey"
            columns: ["song_id"]
            isOneToOne: false
            referencedRelation: "generated_songs"
            referencedColumns: ["id"]
          },
        ]
      }
      song_reactions: {
        Row: {
          created_at: string
          id: string
          reaction: string
          song_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          reaction: string
          song_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          reaction?: string
          song_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "song_reactions_song_id_fkey"
            columns: ["song_id"]
            isOneToOne: false
            referencedRelation: "generated_songs"
            referencedColumns: ["id"]
          },
        ]
      }
      song_sessions: {
        Row: {
          continued_past_10: boolean
          credits_deducted_on_messages: number
          id: string
          message_count: number
          song_generated: boolean
          song_id: string | null
          started_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          continued_past_10?: boolean
          credits_deducted_on_messages?: number
          id?: string
          message_count?: number
          song_generated?: boolean
          song_id?: string | null
          started_at?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          continued_past_10?: boolean
          credits_deducted_on_messages?: number
          id?: string
          message_count?: number
          song_generated?: boolean
          song_id?: string | null
          started_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "song_sessions_song_id_fkey"
            columns: ["song_id"]
            isOneToOne: false
            referencedRelation: "generated_songs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "song_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      subgenre_references: {
        Row: {
          created_at: string
          lyrical_formula: string
          reference_artist: string
          reference_title: string
          style_description: string
          subgenre_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          lyrical_formula: string
          reference_artist: string
          reference_title: string
          style_description: string
          subgenre_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          lyrical_formula?: string
          reference_artist?: string
          reference_title?: string
          style_description?: string
          subgenre_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          cancel_at: string | null
          cancel_at_period_end: boolean
          created_at: string
          credits_per_month: number
          current_period_end: string | null
          current_period_start: string | null
          grace_period_ends_at: string | null
          id: string
          plan_id: string
          price_cents: number
          source: string
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          cancel_at?: string | null
          cancel_at_period_end?: boolean
          created_at?: string
          credits_per_month?: number
          current_period_end?: string | null
          current_period_start?: string | null
          grace_period_ends_at?: string | null
          id?: string
          plan_id: string
          price_cents?: number
          source?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          cancel_at?: string | null
          cancel_at_period_end?: boolean
          created_at?: string
          credits_per_month?: number
          current_period_end?: string | null
          current_period_start?: string | null
          grace_period_ends_at?: string | null
          id?: string
          plan_id?: string
          price_cents?: number
          source?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_blocks: {
        Row: {
          blocked_user_id: string
          blocker_user_id: string
          created_at: string
        }
        Insert: {
          blocked_user_id: string
          blocker_user_id: string
          created_at?: string
        }
        Update: {
          blocked_user_id?: string
          blocker_user_id?: string
          created_at?: string
        }
        Relationships: []
      }
      user_credits: {
        Row: {
          created_at: string
          credit_balance: number | null
          free_credits: number
          free_song_last_date: string | null
          free_song_streak_start: string | null
          has_used_trial: boolean
          id: string
          last_daily_bonus_at: string | null
          subscription_credits: number
          subscription_credits_monthly: number
          subscription_tier: string
          topup_credits: number
          updated_at: string
          user_id: string
          verification_credits_claimed: boolean
        }
        Insert: {
          created_at?: string
          credit_balance?: number | null
          free_credits?: number
          free_song_last_date?: string | null
          free_song_streak_start?: string | null
          has_used_trial?: boolean
          id?: string
          last_daily_bonus_at?: string | null
          subscription_credits?: number
          subscription_credits_monthly?: number
          subscription_tier?: string
          topup_credits?: number
          updated_at?: string
          user_id: string
          verification_credits_claimed?: boolean
        }
        Update: {
          created_at?: string
          credit_balance?: number | null
          free_credits?: number
          free_song_last_date?: string | null
          free_song_streak_start?: string | null
          has_used_trial?: boolean
          id?: string
          last_daily_bonus_at?: string | null
          subscription_credits?: number
          subscription_credits_monthly?: number
          subscription_tier?: string
          topup_credits?: number
          updated_at?: string
          user_id?: string
          verification_credits_claimed?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "user_credits_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_feedback: {
        Row: {
          created_at: string
          feedback_type: string
          id: string
          message: string | null
          metadata: Json | null
          needs_review: boolean
          reviewed_at: string | null
          trigger: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          feedback_type: string
          id?: string
          message?: string | null
          metadata?: Json | null
          needs_review?: boolean
          reviewed_at?: string | null
          trigger?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          feedback_type?: string
          id?: string
          message?: string | null
          metadata?: Json | null
          needs_review?: boolean
          reviewed_at?: string | null
          trigger?: string
          user_id?: string | null
        }
        Relationships: []
      }
      user_goals: {
        Row: {
          achieved_at: string | null
          affirmations: string[] | null
          created_at: string | null
          description: string
          id: string
          is_achieved: boolean | null
          is_shared: boolean | null
          life_category: string
          song_ids: string[] | null
          sort_order: number | null
          updated_at: string | null
          user_id: string
          vision_ids: string[] | null
        }
        Insert: {
          achieved_at?: string | null
          affirmations?: string[] | null
          created_at?: string | null
          description: string
          id?: string
          is_achieved?: boolean | null
          is_shared?: boolean | null
          life_category: string
          song_ids?: string[] | null
          sort_order?: number | null
          updated_at?: string | null
          user_id: string
          vision_ids?: string[] | null
        }
        Update: {
          achieved_at?: string | null
          affirmations?: string[] | null
          created_at?: string | null
          description?: string
          id?: string
          is_achieved?: boolean | null
          is_shared?: boolean | null
          life_category?: string
          song_ids?: string[] | null
          sort_order?: number | null
          updated_at?: string | null
          user_id?: string
          vision_ids?: string[] | null
        }
        Relationships: []
      }
      user_identity: {
        Row: {
          created_at: string
          custom_attributes: Json | null
          id: string
          lifestyle_context: string | null
          occupation_context: string | null
          personality_traits: string[] | null
          physical_current: string | null
          physical_goal: string | null
          style_aesthetic: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          custom_attributes?: Json | null
          id?: string
          lifestyle_context?: string | null
          occupation_context?: string | null
          personality_traits?: string[] | null
          physical_current?: string | null
          physical_goal?: string | null
          style_aesthetic?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          custom_attributes?: Json | null
          id?: string
          lifestyle_context?: string | null
          occupation_context?: string | null
          personality_traits?: string[] | null
          physical_current?: string | null
          physical_goal?: string | null
          style_aesthetic?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_insights: {
        Row: {
          category: string
          content: string
          created_at: string
          id: string
          last_referenced: string | null
          metadata: Json | null
          source: string
          user_id: string
        }
        Insert: {
          category: string
          content: string
          created_at?: string
          id?: string
          last_referenced?: string | null
          metadata?: Json | null
          source?: string
          user_id: string
        }
        Update: {
          category?: string
          content?: string
          created_at?: string
          id?: string
          last_referenced?: string | null
          metadata?: Json | null
          source?: string
          user_id?: string
        }
        Relationships: []
      }
      user_life_themes: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          label: string
          song_ids: string[] | null
          sort_order: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          label: string
          song_ids?: string[] | null
          sort_order?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          label?: string
          song_ids?: string[] | null
          sort_order?: number | null
          updated_at?: string | null
          user_id?: string
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
          role: Database["public"]["Enums"]["app_role"]
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
      user_sessions: {
        Row: {
          date: string
          ended_at: string | null
          id: string
          started_at: string
          user_id: string
        }
        Insert: {
          date?: string
          ended_at?: string | null
          id?: string
          started_at?: string
          user_id: string
        }
        Update: {
          date?: string
          ended_at?: string | null
          id?: string
          started_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_streaks: {
        Row: {
          active_date: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          active_date: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          active_date?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      user_uploaded_videos: {
        Row: {
          created_at: string
          file_size_bytes: number | null
          id: string
          is_public: boolean
          thumbnail_url: string | null
          title: string | null
          user_id: string
          video_url: string
        }
        Insert: {
          created_at?: string
          file_size_bytes?: number | null
          id?: string
          is_public?: boolean
          thumbnail_url?: string | null
          title?: string | null
          user_id: string
          video_url: string
        }
        Update: {
          created_at?: string
          file_size_bytes?: number | null
          id?: string
          is_public?: boolean
          thumbnail_url?: string | null
          title?: string | null
          user_id?: string
          video_url?: string
        }
        Relationships: []
      }
      video_comments: {
        Row: {
          content: string
          created_at: string
          id: string
          user_id: string
          video_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          user_id: string
          video_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          user_id?: string
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "video_comments_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "generated_videos"
            referencedColumns: ["id"]
          },
        ]
      }
      video_favorites: {
        Row: {
          created_at: string
          id: string
          user_id: string
          video_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          user_id: string
          video_id: string
        }
        Update: {
          created_at?: string
          id?: string
          user_id?: string
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "video_favorites_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "generated_videos"
            referencedColumns: ["id"]
          },
        ]
      }
      vision_board_items: {
        Row: {
          board_id: string
          created_at: string
          id: string
          position: number
          title: string | null
          vision_id: string
        }
        Insert: {
          board_id: string
          created_at?: string
          id?: string
          position?: number
          title?: string | null
          vision_id: string
        }
        Update: {
          board_id?: string
          created_at?: string
          id?: string
          position?: number
          title?: string | null
          vision_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vision_board_items_board_id_fkey"
            columns: ["board_id"]
            isOneToOne: false
            referencedRelation: "vision_boards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vision_board_items_vision_id_fkey"
            columns: ["vision_id"]
            isOneToOne: false
            referencedRelation: "generated_visions"
            referencedColumns: ["id"]
          },
        ]
      }
      vision_boards: {
        Row: {
          cover_url: string | null
          created_at: string
          description: string | null
          id: string
          is_public: boolean
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          cover_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_public?: boolean
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          cover_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_public?: boolean
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      vision_comments: {
        Row: {
          content: string
          created_at: string
          id: string
          user_id: string
          vision_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          user_id: string
          vision_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          user_id?: string
          vision_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vision_comments_vision_id_fkey"
            columns: ["vision_id"]
            isOneToOne: false
            referencedRelation: "generated_visions"
            referencedColumns: ["id"]
          },
        ]
      }
      vision_favorites: {
        Row: {
          created_at: string
          id: string
          user_id: string
          vision_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          user_id: string
          vision_id: string
        }
        Update: {
          created_at?: string
          id?: string
          user_id?: string
          vision_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vision_favorites_vision_id_fkey"
            columns: ["vision_id"]
            isOneToOne: false
            referencedRelation: "generated_visions"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      aggregate_daily_pnl_stats: {
        Args: { target_date?: string }
        Returns: undefined
      }
      aggregate_gift_funnel_stats: {
        Args: { target_date?: string }
        Returns: undefined
      }
      can_access_feature: {
        Args: { _feature_name: string; _user_id: string }
        Returns: boolean
      }
      charge_session_message: {
        Args: { p_continue?: boolean; p_session_id: string; p_user_id: string }
        Returns: Json
      }
      charge_session_song: {
        Args: { p_session_id: string; p_song_id?: string; p_user_id: string }
        Returns: Json
      }
      check_and_use_daily_free_song: {
        Args: { p_user_id: string }
        Returns: Json
      }
      claim_daily_bonus: { Args: { p_user_id: string }; Returns: Json }
      claim_verification_credits: { Args: never; Returns: Json }
      create_verification_token: {
        Args: never
        Returns: {
          expires_at: string
          token: string
        }[]
      }
      decrement_playlist_like_count: {
        Args: { target_playlist_id: string }
        Returns: undefined
      }
      deduct_credits: {
        Args: {
          p_amount: number
          p_description?: string
          p_reference_id?: string
          p_type: string
          p_user_id: string
        }
        Returns: Json
      }
      expire_subscription_credits: {
        Args: { p_reason?: string; p_user_id: string }
        Returns: Json
      }
      get_credit_summary: { Args: { p_user_id: string }; Returns: Json }
      get_public_profile: {
        Args: { profile_id: string }
        Returns: {
          avatar_url: string
          bio: string
          cover_url: string
          created_at: string
          display_name: string
          follower_count: number
          following_count: number
          id: string
          is_public: boolean
        }[]
      }
      get_setting_int: {
        Args: { p_default: number; p_key: string }
        Returns: number
      }
      get_user_streak: {
        Args: { p_today: string; p_user_id: string }
        Returns: Json
      }
      grant_credits: {
        Args: {
          p_amount: number
          p_description?: string
          p_reference_id?: string
          p_type: string
          p_user_id: string
        }
        Returns: Json
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_completed_clips: {
        Args: { p_job_id: string }
        Returns: undefined
      }
      increment_play_count: { Args: { song_id: string }; Returns: undefined }
      increment_playlist_like_count: {
        Args: { target_playlist_id: string }
        Returns: undefined
      }
      mark_ai_consent_accepted: { Args: { p_version: string }; Returns: Json }
      mark_post_signup_completed: { Args: Record<string, never>; Returns: boolean }
      mark_terms_accepted: { Args: Record<string, never>; Returns: string }
      refund_session_song: {
        Args: { p_session_id: string; p_user_id: string }
        Returns: Json
      }
      reorder_funnel_steps: {
        Args: { p_funnel_id: string; p_step_ids: string[] }
        Returns: undefined
      }
      rollover_subscription_credits: {
        Args: { p_user_id: string }
        Returns: Json
      }
      set_profile_appsflyer_id: { Args: { p_appsflyer_id: string }; Returns: string }
      set_profile_attribution: { Args: { p_attribution: Json }; Returns: Json }
      start_song_session: { Args: { p_user_id: string }; Returns: Json }
      update_avatar_url: { Args: { p_avatar_url: string }; Returns: undefined }
      update_bio: { Args: { p_bio: string | null }; Returns: string | null }
      update_cover_url: { Args: { p_cover_url: string }; Returns: undefined }
      update_display_name: { Args: { p_display_name: string }; Returns: string }
      verify_email_with_token: { Args: { p_token: string }; Returns: Json }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
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
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const