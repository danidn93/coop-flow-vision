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
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      bus_chats: {
        Row: {
          bus_id: string
          created_at: string
          driver_id: string
          id: string
          last_activity_at: string | null
          owner_id: string
          status: string
          updated_at: string
        }
        Insert: {
          bus_id: string
          created_at?: string
          driver_id: string
          id?: string
          last_activity_at?: string | null
          owner_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          bus_id?: string
          created_at?: string
          driver_id?: string
          id?: string
          last_activity_at?: string | null
          owner_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      buses: {
        Row: {
          alias: string | null
          capacity: number | null
          created_at: string
          driver_id: string | null
          id: string
          image_url: string | null
          official_id: string | null
          owner_id: string
          plate: string
          route_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          alias?: string | null
          capacity?: number | null
          created_at?: string
          driver_id?: string | null
          id?: string
          image_url?: string | null
          official_id?: string | null
          owner_id: string
          plate: string
          route_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          alias?: string | null
          capacity?: number | null
          created_at?: string
          driver_id?: string | null
          id?: string
          image_url?: string | null
          official_id?: string | null
          owner_id?: string
          plate?: string
          route_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "buses_route_fk"
            columns: ["route_id"]
            isOneToOne: false
            referencedRelation: "routes"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          bus_chat_id: string | null
          content: string
          created_at: string
          id: string
          message_type: string
          metadata: Json | null
          read_at: string | null
          sender_id: string
          thread_id: string | null
        }
        Insert: {
          bus_chat_id?: string | null
          content: string
          created_at?: string
          id?: string
          message_type?: string
          metadata?: Json | null
          read_at?: string | null
          sender_id: string
          thread_id?: string | null
        }
        Update: {
          bus_chat_id?: string | null
          content?: string
          created_at?: string
          id?: string
          message_type?: string
          metadata?: Json | null
          read_at?: string | null
          sender_id?: string
          thread_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "chat_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_threads: {
        Row: {
          client_id: string
          created_at: string
          id: string
          last_message_at: string | null
          status: string
          subject: string | null
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          id?: string
          last_message_at?: string | null
          status?: string
          subject?: string | null
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          id?: string
          last_message_at?: string | null
          status?: string
          subject?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      cooperative_config: {
        Row: {
          address: string | null
          background_image_url: string | null
          created_at: string
          email: string | null
          id: string
          logo_url: string | null
          max_daily_tickets: number
          name: string
          phone: string | null
          primary_color: string | null
          reward_points_per_ticket: number
          ruc: string | null
          secondary_color: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          background_image_url?: string | null
          created_at?: string
          email?: string | null
          id?: string
          logo_url?: string | null
          max_daily_tickets?: number
          name?: string
          phone?: string | null
          primary_color?: string | null
          reward_points_per_ticket?: number
          ruc?: string | null
          secondary_color?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          background_image_url?: string | null
          created_at?: string
          email?: string | null
          id?: string
          logo_url?: string | null
          max_daily_tickets?: number
          name?: string
          phone?: string | null
          primary_color?: string | null
          reward_points_per_ticket?: number
          ruc?: string | null
          secondary_color?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      faq_intents: {
        Row: {
          created_at: string
          id: string
          intent_name: string
          keywords: string[]
          param_types: Json | null
          requires_params: boolean | null
          response_template: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          intent_name: string
          keywords?: string[]
          param_types?: Json | null
          requires_params?: boolean | null
          response_template: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          intent_name?: string
          keywords?: string[]
          param_types?: Json | null
          requires_params?: boolean | null
          response_template?: string
          updated_at?: string
        }
        Relationships: []
      }
      incident_audit_log: {
        Row: {
          action: string
          changes: Json | null
          created_at: string
          id: string
          incident_id: string
          notes: string | null
          user_id: string
        }
        Insert: {
          action: string
          changes?: Json | null
          created_at?: string
          id?: string
          incident_id: string
          notes?: string | null
          user_id: string
        }
        Update: {
          action?: string
          changes?: Json | null
          created_at?: string
          id?: string
          incident_id?: string
          notes?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "incident_audit_log_incident_id_fkey"
            columns: ["incident_id"]
            isOneToOne: false
            referencedRelation: "road_incidents"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          message: string
          metadata: Json
          read_at: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          metadata?: Json
          read_at?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          metadata?: Json
          read_at?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          address: string
          avatar_url: string | null
          created_at: string
          first_name: string
          id: string
          id_number: string
          middle_name: string | null
          phone: string
          surname_1: string
          surname_2: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          address: string
          avatar_url?: string | null
          created_at?: string
          first_name: string
          id?: string
          id_number: string
          middle_name?: string | null
          phone: string
          surname_1: string
          surname_2?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string
          avatar_url?: string | null
          created_at?: string
          first_name?: string
          id?: string
          id_number?: string
          middle_name?: string | null
          phone?: string
          surname_1?: string
          surname_2?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      reward_redemptions: {
        Row: {
          created_at: string
          id: string
          points_used: number
          redeemed_at: string | null
          reward_id: string
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          points_used: number
          redeemed_at?: string | null
          reward_id: string
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          points_used?: number
          redeemed_at?: string | null
          reward_id?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reward_redemptions_reward_id_fkey"
            columns: ["reward_id"]
            isOneToOne: false
            referencedRelation: "rewards"
            referencedColumns: ["id"]
          },
        ]
      }
      rewards: {
        Row: {
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          name: string
          points_required: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name: string
          points_required: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name?: string
          points_required?: number
          updated_at?: string
        }
        Relationships: []
      }
      road_incidents: {
        Row: {
          affected_routes: string[] | null
          coordinates: unknown | null
          created_at: string
          description: string
          id: string
          incident_type: string
          location_description: string
          moderated_at: string | null
          moderator_id: string | null
          photos: string[] | null
          reporter_id: string
          resolved_at: string | null
          severity: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          affected_routes?: string[] | null
          coordinates?: unknown | null
          created_at?: string
          description: string
          id?: string
          incident_type: string
          location_description: string
          moderated_at?: string | null
          moderator_id?: string | null
          photos?: string[] | null
          reporter_id: string
          resolved_at?: string | null
          severity?: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          affected_routes?: string[] | null
          coordinates?: unknown | null
          created_at?: string
          description?: string
          id?: string
          incident_type?: string
          location_description?: string
          moderated_at?: string | null
          moderator_id?: string | null
          photos?: string[] | null
          reporter_id?: string
          resolved_at?: string | null
          severity?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      role_requests: {
        Row: {
          approved_roles: Json
          created_at: string
          id: string
          justification: string
          notes: string | null
          rejected_roles: Json
          requested_roles: Json
          requester_id: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
        }
        Insert: {
          approved_roles?: Json
          created_at?: string
          id?: string
          justification: string
          notes?: string | null
          rejected_roles?: Json
          requested_roles?: Json
          requester_id: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
        }
        Update: {
          approved_roles?: Json
          created_at?: string
          id?: string
          justification?: string
          notes?: string | null
          rejected_roles?: Json
          requested_roles?: Json
          requester_id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
        }
        Relationships: []
      }
      route_frequencies: {
        Row: {
          arrival_time: string
          assigned_bus_id: string | null
          created_at: string
          departure_time: string
          frequency_number: number
          id: string
          is_first_turn: boolean | null
          is_last_turn: boolean | null
          passengers_count: number
          revenue: number
          route_id: string
          status: string
          updated_at: string
        }
        Insert: {
          arrival_time: string
          assigned_bus_id?: string | null
          created_at?: string
          departure_time: string
          frequency_number: number
          id?: string
          is_first_turn?: boolean | null
          is_last_turn?: boolean | null
          passengers_count?: number
          revenue?: number
          route_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          arrival_time?: string
          assigned_bus_id?: string | null
          created_at?: string
          departure_time?: string
          frequency_number?: number
          id?: string
          is_first_turn?: boolean | null
          is_last_turn?: boolean | null
          passengers_count?: number
          revenue?: number
          route_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "route_frequencies_assigned_bus_id_fkey"
            columns: ["assigned_bus_id"]
            isOneToOne: false
            referencedRelation: "buses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "route_frequencies_route_id_fkey"
            columns: ["route_id"]
            isOneToOne: false
            referencedRelation: "routes"
            referencedColumns: ["id"]
          },
        ]
      }
      routes: {
        Row: {
          base_fare: number | null
          created_at: string
          destination: string
          distance_km: number | null
          duration_minutes: number | null
          frequency_minutes: number | null
          id: string
          image_url: string | null
          name: string
          origin: string
          status: string
          updated_at: string
        }
        Insert: {
          base_fare?: number | null
          created_at?: string
          destination: string
          distance_km?: number | null
          duration_minutes?: number | null
          frequency_minutes?: number | null
          id?: string
          image_url?: string | null
          name: string
          origin: string
          status?: string
          updated_at?: string
        }
        Update: {
          base_fare?: number | null
          created_at?: string
          destination?: string
          distance_km?: number | null
          duration_minutes?: number | null
          frequency_minutes?: number | null
          id?: string
          image_url?: string | null
          name?: string
          origin?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      terminal_operations: {
        Row: {
          created_at: string
          id: string
          passengers_count: number
          recorded_at: string
          recorded_by: string
          revenue: number
          route_frequency_id: string
          terminal_name: string
          terminal_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          passengers_count?: number
          recorded_at?: string
          recorded_by: string
          revenue?: number
          route_frequency_id: string
          terminal_name: string
          terminal_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          passengers_count?: number
          recorded_at?: string
          recorded_by?: string
          revenue?: number
          route_frequency_id?: string
          terminal_name?: string
          terminal_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      user_points: {
        Row: {
          created_at: string
          id: string
          last_ticket_date: string | null
          tickets_today: number
          total_points: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_ticket_date?: string | null
          tickets_today?: number
          total_points?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          last_ticket_date?: string | null
          tickets_today?: number
          total_points?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_presence: {
        Row: {
          bus_chat_id: string | null
          last_seen_at: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          bus_chat_id?: string | null
          last_seen_at?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          bus_chat_id?: string | null
          last_seen_at?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_presence_bus_chat_id_fkey"
            columns: ["bus_chat_id"]
            isOneToOne: false
            referencedRelation: "bus_chats"
            referencedColumns: ["id"]
          },
        ]
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
      user_tickets: {
        Row: {
          created_at: string
          id: string
          points_earned: number
          route_id: string
          ticket_number: string
          user_id: string
          validated: boolean | null
          validated_at: string | null
          validated_by: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          points_earned?: number
          route_id: string
          ticket_number?: string
          user_id: string
          validated?: boolean | null
          validated_at?: string | null
          validated_by?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          points_earned?: number
          route_id?: string
          ticket_number?: string
          user_id?: string
          validated?: boolean | null
          validated_at?: string | null
          validated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_tickets_route_id_fkey"
            columns: ["route_id"]
            isOneToOne: false
            referencedRelation: "routes"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_notification: {
        Args: {
          p_message: string
          p_metadata?: Json
          p_title: string
          p_type: string
          p_user_id: string
        }
        Returns: undefined
      }
      generate_route_frequencies: {
        Args: {
          p_end_time?: string
          p_frequency_minutes: number
          p_route_id: string
          p_start_time?: string
        }
        Returns: undefined
      }
      get_current_user_role: {
        Args: Record<PropertyKey, never>
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      reset_daily_bus_assignments: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
    }
    Enums: {
      app_role:
        | "administrator"
        | "president"
        | "manager"
        | "employee"
        | "partner"
        | "driver"
        | "official"
        | "client"
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
        "administrator",
        "president",
        "manager",
        "employee",
        "partner",
        "driver",
        "official",
        "client",
      ],
    },
  },
} as const
