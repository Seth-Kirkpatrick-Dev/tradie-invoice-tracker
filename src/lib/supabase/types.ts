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
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      clients: {
        Row: {
          address: string | null
          created_at: string
          deleted_at: string | null
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          deleted_at?: string | null
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string | null
          created_at?: string
          deleted_at?: string | null
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "clients_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      email_templates: {
        Row: {
          body_template: string
          created_at: string
          id: string
          is_default: boolean
          name: string
          subject_template: string
          updated_at: string
          user_id: string
        }
        Insert: {
          body_template: string
          created_at?: string
          id?: string
          is_default?: boolean
          name: string
          subject_template: string
          updated_at?: string
          user_id: string
        }
        Update: {
          body_template?: string
          created_at?: string
          id?: string
          is_default?: boolean
          name?: string
          subject_template?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_templates_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          auto_reminders_enabled: boolean
          client_id: string | null
          created_at: string
          currency: string
          description: string | null
          due_date: string | null
          id: string
          invoice_number: string
          invoice_number_int: number
          issue_date: string | null
          line_items: Json
          notes: string | null
          paid_date: string | null
          payment_method: string | null
          sent_date: string | null
          status: string
          subtotal: number
          tax_amount: number
          tax_label: string
          tax_rate: number
          total: number
          updated_at: string
          user_id: string
        }
        Insert: {
          auto_reminders_enabled?: boolean
          client_id?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          due_date?: string | null
          id?: string
          invoice_number: string
          invoice_number_int: number
          issue_date?: string | null
          line_items?: Json
          notes?: string | null
          paid_date?: string | null
          payment_method?: string | null
          sent_date?: string | null
          status?: string
          subtotal?: number
          tax_amount?: number
          tax_label?: string
          tax_rate?: number
          total?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          auto_reminders_enabled?: boolean
          client_id?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          due_date?: string | null
          id?: string
          invoice_number?: string
          invoice_number_int?: number
          issue_date?: string | null
          line_items?: Json
          notes?: string | null
          paid_date?: string | null
          payment_method?: string | null
          sent_date?: string | null
          status?: string
          subtotal?: number
          tax_amount?: number
          tax_label?: string
          tax_rate?: number
          total?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string
          created_at: string
          id: string
          invoice_id: string | null
          read_at: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          invoice_id?: string | null
          read_at?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          invoice_id?: string | null
          read_at?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          bank_account_details: string | null
          business_name: string | null
          country: string
          created_at: string
          currency: string
          default_email_body: string
          default_email_subject: string
          first_name: string | null
          id: string
          invoice_number_prefix: string
          last_name: string | null
          logo_url: string | null
          next_invoice_number: number
          onboarding_completed: boolean
          phone: string | null
          reminder_schedule: Json
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          subscription_status: string
          subscription_tier: string
          tax_label: string
          tax_number: string | null
          tax_rate: number
          trial_ends_at: string | null
          updated_at: string
        }
        Insert: {
          bank_account_details?: string | null
          business_name?: string | null
          country?: string
          created_at?: string
          currency?: string
          default_email_body?: string
          default_email_subject?: string
          first_name?: string | null
          id: string
          invoice_number_prefix?: string
          last_name?: string | null
          logo_url?: string | null
          next_invoice_number?: number
          onboarding_completed?: boolean
          phone?: string | null
          reminder_schedule?: Json
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_status?: string
          subscription_tier?: string
          tax_label?: string
          tax_number?: string | null
          tax_rate?: number
          trial_ends_at?: string | null
          updated_at?: string
        }
        Update: {
          bank_account_details?: string | null
          business_name?: string | null
          country?: string
          created_at?: string
          currency?: string
          default_email_body?: string
          default_email_subject?: string
          first_name?: string | null
          id?: string
          invoice_number_prefix?: string
          last_name?: string | null
          logo_url?: string | null
          next_invoice_number?: number
          onboarding_completed?: boolean
          phone?: string | null
          reminder_schedule?: Json
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_status?: string
          subscription_tier?: string
          tax_label?: string
          tax_number?: string | null
          tax_rate?: number
          trial_ends_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      reminders_log: {
        Row: {
          channel: string
          content: string | null
          created_at: string
          days_overdue: number | null
          error_message: string | null
          id: string
          invoice_id: string
          recipient_email: string | null
          recipient_phone: string | null
          sent_at: string
          status: string
          subject: string | null
          user_id: string
        }
        Insert: {
          channel?: string
          content?: string | null
          created_at?: string
          days_overdue?: number | null
          error_message?: string | null
          id?: string
          invoice_id: string
          recipient_email?: string | null
          recipient_phone?: string | null
          sent_at?: string
          status?: string
          subject?: string | null
          user_id: string
        }
        Update: {
          channel?: string
          content?: string | null
          created_at?: string
          days_overdue?: number | null
          error_message?: string | null
          id?: string
          invoice_id?: string
          recipient_email?: string | null
          recipient_phone?: string | null
          sent_at?: string
          status?: string
          subject?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reminders_log_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reminders_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
