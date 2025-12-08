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
      bookings: {
        Row: {
          booking_at: string | null
          created_at: string | null
          id: string
          location_id: string
          payment_id: string | null
          price: number
          service_id: string
          slot_date: string
          slot_id: string
          status: string
          updated_at: string | null
          user_id: string
          vendor_id: string
        }
        Insert: {
          booking_at?: string | null
          created_at?: string | null
          id?: string
          location_id: string
          payment_id?: string | null
          price: number
          service_id: string
          slot_date: string
          slot_id: string
          status?: string
          updated_at?: string | null
          user_id: string
          vendor_id: string
        }
        Update: {
          booking_at?: string | null
          created_at?: string | null
          id?: string
          location_id?: string
          payment_id?: string | null
          price?: number
          service_id?: string
          slot_date?: string
          slot_id?: string
          status?: string
          updated_at?: string | null
          user_id?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_slot_id_fkey"
            columns: ["slot_id"]
            isOneToOne: false
            referencedRelation: "service_slots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
        ]
      }
      event_booking: {
        Row: {
          created_at: string
          currency: string
          event_id: string
          id: string
          payment_id: string | null
          qr_code: string
          quantity: number
          status: string
          ticket_type_id: string
          total_price: number
          unit_price: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          currency: string
          event_id: string
          id?: string
          payment_id?: string | null
          qr_code: string
          quantity: number
          status?: string
          ticket_type_id: string
          total_price: number
          unit_price: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          currency?: string
          event_id?: string
          id?: string
          payment_id?: string | null
          qr_code?: string
          quantity?: number
          status?: string
          ticket_type_id?: string
          total_price?: number
          unit_price?: number
          updated_at?: string
          user_id?: string
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
        ]
      }
      event_ticket_types: {
        Row: {
          capacity: number | null
          created_at: string
          currency: string
          description: string | null
          event_id: string
          id: string
          is_active: boolean
          name: string
          price: number
          updated_at: string
        }
        Insert: {
          capacity?: number | null
          created_at?: string
          currency?: string
          description?: string | null
          event_id: string
          id?: string
          is_active?: boolean
          name: string
          price: number
          updated_at?: string
        }
        Update: {
          capacity?: number | null
          created_at?: string
          currency?: string
          description?: string | null
          event_id?: string
          id?: string
          is_active?: boolean
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
          booking_deadline: string | null
          capacity: number | null
          category: Database["public"]["Enums"]["event_category"]
          created_at: string
          currency: string
          description: string | null
          end_at: string
          event_type: string
          id: string
          images: string[] | null
          is_active: boolean
          location_id: string
          start_at: string
          status: string
          ticket_type: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          booking_deadline?: string | null
          capacity?: number | null
          category: Database["public"]["Enums"]["event_category"]
          created_at?: string
          currency?: string
          description?: string | null
          end_at: string
          event_type: string
          id?: string
          images?: string[] | null
          is_active?: boolean
          location_id: string
          start_at: string
          status?: string
          ticket_type: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          booking_deadline?: string | null
          capacity?: number | null
          category?: Database["public"]["Enums"]["event_category"]
          created_at?: string
          currency?: string
          description?: string | null
          end_at?: string
          event_type?: string
          id?: string
          images?: string[] | null
          is_active?: boolean
          location_id?: string
          start_at?: string
          status?: string
          ticket_type?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
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
          payment_method: string
          status: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          currency?: string
          id?: string
          payment_method: string
          status?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          currency?: string
          id?: string
          payment_method?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      profile: {
        Row: {
          created_at: string | null
          id: string
          image: string | null
          name: string
          role: Database["public"]["Enums"]["role"]
          status: Database["public"]["Enums"]["user_status"]
          stripe: string | null
          timezone: string | null
          tokens: string[] | null
          updated_at: string | null
          user: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          image?: string | null
          name: string
          role?: Database["public"]["Enums"]["role"]
          status?: Database["public"]["Enums"]["user_status"]
          stripe?: string | null
          timezone?: string | null
          tokens?: string[] | null
          updated_at?: string | null
          user: string
        }
        Update: {
          created_at?: string | null
          id?: string
          image?: string | null
          name?: string
          role?: Database["public"]["Enums"]["role"]
          status?: Database["public"]["Enums"]["user_status"]
          stripe?: string | null
          timezone?: string | null
          tokens?: string[] | null
          updated_at?: string | null
          user?: string
        }
        Relationships: []
      }
      service_slots: {
        Row: {
          capacity: number
          created_at: string | null
          day_of_week: number
          end_time: string
          id: string
          is_active: boolean | null
          location_id: string
          price: number
          service_id: string
          start_time: string
          updated_at: string | null
        }
        Insert: {
          capacity: number
          created_at?: string | null
          day_of_week: number
          end_time: string
          id?: string
          is_active?: boolean | null
          location_id: string
          price: number
          service_id: string
          start_time: string
          updated_at?: string | null
        }
        Update: {
          capacity?: number
          created_at?: string | null
          day_of_week?: number
          end_time?: string
          id?: string
          is_active?: boolean | null
          location_id?: string
          price?: number
          service_id?: string
          start_time?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "service_slots_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_slots_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          images: string[] | null
          is_active: boolean | null
          title: string
          updated_at: string | null
          vendor_id: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          images?: string[] | null
          is_active?: boolean | null
          title: string
          updated_at?: string | null
          vendor_id: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          images?: string[] | null
          is_active?: boolean | null
          title?: string
          updated_at?: string | null
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "services_vendor_id_fkey"
            columns: ["vendor_id"]
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
          user: string
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
      event_category:
        | "music"
        | "tech"
        | "business"
        | "sports"
        | "education"
        | "art"
        | "expo"
        | "other"
      role: "USER" | "PROVIDER" | "ADMIN"
      user_status: "ACTIVE" | "PENDING" | "DELETE" | "REJECT"
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
      event_category: [
        "music",
        "tech",
        "business",
        "sports",
        "education",
        "art",
        "expo",
        "other",
      ],
      role: ["USER", "PROVIDER", "ADMIN"],
      user_status: ["ACTIVE", "PENDING", "DELETE", "REJECT"],
    },
  },
} as const
