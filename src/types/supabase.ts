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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      categories: {
        Row: {
          created_at: string
          icon: string | null
          id: number
          name: string
          status: boolean
        }
        Insert: {
          created_at?: string
          icon?: string | null
          id?: number
          name: string
          status?: boolean
        }
        Update: {
          created_at?: string
          icon?: string | null
          id?: number
          name?: string
          status?: boolean
        }
        Relationships: []
      }
      event_booking: {
        Row: {
          created_at: string
          event_id: string
          id: string
          payment_id: string | null
          quantity: number
          ticket_type_id: string
          total_price: number
          unit_price: number
          updated_at: string
          user: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          payment_id?: string | null
          quantity: number
          ticket_type_id: string
          total_price: number
          unit_price: number
          updated_at?: string
          user?: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          payment_id?: string | null
          quantity?: number
          ticket_type_id?: string
          total_price?: number
          unit_price?: number
          updated_at?: string
          user?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_booking_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_booking_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_booking_ticket_type_id_fkey"
            columns: ["ticket_type_id"]
            isOneToOne: false
            referencedRelation: "event_ticket_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_booking_user_fkey"
            columns: ["user"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
        ]
      }
      event_ticket_types: {
        Row: {
          capacity: number | null
          created_at: string
          event_id: string
          id: string
          name: string
          price: number
          updated_at: string
        }
        Insert: {
          capacity?: number | null
          created_at?: string
          event_id: string
          id?: string
          name: string
          price: number
          updated_at?: string
        }
        Update: {
          capacity?: number | null
          created_at?: string
          event_id?: string
          id?: string
          name?: string
          price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_ticket_types_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          book_till: string | null
          category: number
          created_at: string
          description: string | null
          end_at: string
          id: string
          images: string[] | null
          provider: string
          start_at: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          book_till?: string | null
          category: number
          created_at?: string
          description?: string | null
          end_at: string
          id?: string
          images?: string[] | null
          provider: string
          start_at: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          book_till?: string | null
          category?: number
          created_at?: string
          description?: string | null
          end_at?: string
          id?: string
          images?: string[] | null
          provider?: string
          start_at?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_category_fkey"
            columns: ["category"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      locations: {
        Row: {
          address: string
          created_at: string | null
          id: string
          latitude: number
          longitude: number
          service_id: string
          updated_at: string | null
        }
        Insert: {
          address: string
          created_at?: string | null
          id?: string
          latitude: number
          longitude: number
          service_id: string
          updated_at?: string | null
        }
        Update: {
          address?: string
          created_at?: string | null
          id?: string
          latitude?: number
          longitude?: number
          service_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "locations_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          created_at: string | null
          currency: string
          id: string
          status: string
          user: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          currency?: string
          id?: string
          status?: string
          user?: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          currency?: string
          id?: string
          status?: string
          user?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_user_fkey"
            columns: ["user"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
        ]
      }
      profile: {
        Row: {
          country: string | null
          created_at: string | null
          id: string
          image: string | null
          name: string
          phone: string | null
          role: Database["public"]["Enums"]["role"]
          status: Database["public"]["Enums"]["user_status"]
          tokens: string[] | null
          updated_at: string | null
        }
        Insert: {
          country?: string | null
          created_at?: string | null
          id?: string
          image?: string | null
          name: string
          phone?: string | null
          role?: Database["public"]["Enums"]["role"]
          status?: Database["public"]["Enums"]["user_status"]
          tokens?: string[] | null
          updated_at?: string | null
        }
        Update: {
          country?: string | null
          created_at?: string | null
          id?: string
          image?: string | null
          name?: string
          phone?: string | null
          role?: Database["public"]["Enums"]["role"]
          status?: Database["public"]["Enums"]["user_status"]
          tokens?: string[] | null
          updated_at?: string | null
        }
        Relationships: []
      }
      provider: {
        Row: {
          created_at: string
          document: string | null
          id: string
          stripe: string
          US: boolean | null
        }
        Insert: {
          created_at?: string
          document?: string | null
          id?: string
          stripe: string
          US?: boolean | null
        }
        Update: {
          created_at?: string
          document?: string | null
          id?: string
          stripe?: string
          US?: boolean | null
        }
        Relationships: []
      }
      services: {
        Row: {
          active: boolean
          capacity: number | null
          category: number
          created_at: string | null
          description: string | null
          end_at: string
          id: string
          images: string[] | null
          price: number | null
          provider: string
          start_at: string
          title: string
          updated_at: string | null
          week_day: Database["public"]["Enums"]["week_day"][]
        }
        Insert: {
          active?: boolean
          capacity?: number | null
          category: number
          created_at?: string | null
          description?: string | null
          end_at: string
          id?: string
          images?: string[] | null
          price?: number | null
          provider?: string
          start_at: string
          title: string
          updated_at?: string | null
          week_day: Database["public"]["Enums"]["week_day"][]
        }
        Update: {
          active?: boolean
          capacity?: number | null
          category?: number
          created_at?: string | null
          description?: string | null
          end_at?: string
          id?: string
          images?: string[] | null
          price?: number | null
          provider?: string
          start_at?: string
          title?: string
          updated_at?: string | null
          week_day?: Database["public"]["Enums"]["week_day"][]
        }
        Relationships: [
          {
            foreignKeyName: "services_category_fkey"
            columns: ["category"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      services_booking: {
        Row: {
          appointed: string
          created_at: string | null
          id: string
          payment_id: string | null
          price: number
          service: string
          status: Database["public"]["Enums"]["booking_status"]
          updated_at: string | null
          user: string
        }
        Insert: {
          appointed: string
          created_at?: string | null
          id?: string
          payment_id?: string | null
          price: number
          service: string
          status?: Database["public"]["Enums"]["booking_status"]
          updated_at?: string | null
          user?: string
        }
        Update: {
          appointed?: string
          created_at?: string | null
          id?: string
          payment_id?: string | null
          price?: number
          service?: string
          status?: Database["public"]["Enums"]["booking_status"]
          updated_at?: string | null
          user?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_service_fkey"
            columns: ["service"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "services_booking_user_fkey"
            columns: ["user"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
        ]
      }
      tickets: {
        Row: {
          created_at: string
          id: number
          message: string | null
          user: string
        }
        Insert: {
          created_at?: string
          id?: number
          message?: string | null
          user?: string
        }
        Update: {
          created_at?: string
          id?: number
          message?: string | null
          user?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      booking_status: "booked" | "cancel" | "pending"
      role: "user" | "provider" | "admin"
      user_status: "active" | "pending" | "delete" | "reject"
      week_day: "sun" | "mon" | "tue" | "wed" | "thu" | "fri" | "sat"
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
      booking_status: ["booked", "cancel", "pending"],
      role: ["user", "provider", "admin"],
      user_status: ["active", "pending", "delete", "reject"],
      week_day: ["sun", "mon", "tue", "wed", "thu", "fri", "sat"],
    },
  },
} as const
