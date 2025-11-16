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
      documents: {
        Row: {
          case_id: string
          created_at: string | null
          document_type: Database["public"]["Enums"]["document_type"]
          file_name: string
          file_url: string
          id: string
          uploaded_by: string
        }
        Insert: {
          case_id: string
          created_at?: string | null
          document_type: Database["public"]["Enums"]["document_type"]
          file_name: string
          file_url: string
          id?: string
          uploaded_by: string
        }
        Update: {
          case_id?: string
          created_at?: string | null
          document_type?: Database["public"]["Enums"]["document_type"]
          file_name?: string
          file_url?: string
          id?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "documents_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "sick_leave_cases"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          achternaam: string
          created_at: string | null
          email: string
          foto_url: string | null
          functie: string | null
          id: string
          manager_id: string | null
          telefoon: string | null
          updated_at: string | null
          voornaam: string
        }
        Insert: {
          achternaam: string
          created_at?: string | null
          email: string
          foto_url?: string | null
          functie?: string | null
          id: string
          manager_id?: string | null
          telefoon?: string | null
          updated_at?: string | null
          voornaam: string
        }
        Update: {
          achternaam?: string
          created_at?: string | null
          email?: string
          foto_url?: string | null
          functie?: string | null
          id?: string
          manager_id?: string | null
          telefoon?: string | null
          updated_at?: string | null
          voornaam?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      sick_leave_cases: {
        Row: {
          availability_notes: string | null
          can_work_partial: boolean | null
          case_status: Database["public"]["Enums"]["case_status"] | null
          created_at: string | null
          created_by: string
          employee_id: string
          end_date: string | null
          expected_duration: string | null
          functional_limitations: string | null
          id: string
          partial_work_description: string | null
          start_date: string
          updated_at: string | null
        }
        Insert: {
          availability_notes?: string | null
          can_work_partial?: boolean | null
          case_status?: Database["public"]["Enums"]["case_status"] | null
          created_at?: string | null
          created_by: string
          employee_id: string
          end_date?: string | null
          expected_duration?: string | null
          functional_limitations?: string | null
          id?: string
          partial_work_description?: string | null
          start_date: string
          updated_at?: string | null
        }
        Update: {
          availability_notes?: string | null
          can_work_partial?: boolean | null
          case_status?: Database["public"]["Enums"]["case_status"] | null
          created_at?: string | null
          created_by?: string
          employee_id?: string
          end_date?: string | null
          expected_duration?: string | null
          functional_limitations?: string | null
          id?: string
          partial_work_description?: string | null
          start_date?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sick_leave_cases_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          assigned_to: string
          case_id: string
          completed_at: string | null
          completed_by: string | null
          created_at: string | null
          deadline: string
          description: string | null
          gespreksonderwerpen: string | null
          id: string
          juridische_context: string | null
          notes: string | null
          task_status: Database["public"]["Enums"]["task_status"] | null
          title: string
          toegestane_vragen: string | null
          updated_at: string | null
          verboden_vragen: string | null
        }
        Insert: {
          assigned_to: string
          case_id: string
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string | null
          deadline: string
          description?: string | null
          gespreksonderwerpen?: string | null
          id?: string
          juridische_context?: string | null
          notes?: string | null
          task_status?: Database["public"]["Enums"]["task_status"] | null
          title: string
          toegestane_vragen?: string | null
          updated_at?: string | null
          verboden_vragen?: string | null
        }
        Update: {
          assigned_to?: string
          case_id?: string
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string | null
          deadline?: string
          description?: string | null
          gespreksonderwerpen?: string | null
          id?: string
          juridische_context?: string | null
          notes?: string | null
          task_status?: Database["public"]["Enums"]["task_status"] | null
          title?: string
          toegestane_vragen?: string | null
          updated_at?: string | null
          verboden_vragen?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tasks_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "sick_leave_cases"
            referencedColumns: ["id"]
          },
        ]
      }
      timeline_events: {
        Row: {
          case_id: string
          created_at: string | null
          created_by: string | null
          date: string | null
          description: string
          event_type: Database["public"]["Enums"]["event_type"]
          id: string
          metadata: Json | null
        }
        Insert: {
          case_id: string
          created_at?: string | null
          created_by?: string | null
          date?: string | null
          description: string
          event_type: Database["public"]["Enums"]["event_type"]
          id?: string
          metadata?: Json | null
        }
        Update: {
          case_id?: string
          created_at?: string | null
          created_by?: string | null
          date?: string | null
          description?: string
          event_type?: Database["public"]["Enums"]["event_type"]
          id?: string
          metadata?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "timeline_events_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "sick_leave_cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timeline_events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      verzuim_patterns: {
        Row: {
          actie_ondernomen: boolean | null
          created_at: string | null
          description: string | null
          detected_at: string | null
          employee_id: string
          id: string
          pattern_type: string
          requires_action: boolean | null
        }
        Insert: {
          actie_ondernomen?: boolean | null
          created_at?: string | null
          description?: string | null
          detected_at?: string | null
          employee_id: string
          id?: string
          pattern_type: string
          requires_action?: boolean | null
        }
        Update: {
          actie_ondernomen?: boolean | null
          created_at?: string | null
          description?: string | null
          detected_at?: string | null
          employee_id?: string
          id?: string
          pattern_type?: string
          requires_action?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "verzuim_patterns_employee_id_fkey"
            columns: ["employee_id"]
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
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_manager_of: {
        Args: { _employee_id: string; _manager_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "hr" | "manager" | "medewerker"
      case_status: "actief" | "herstel_gemeld" | "gesloten" | "archief"
      document_type:
        | "probleemanalyse"
        | "plan_van_aanpak"
        | "evaluatie_3_maanden"
        | "evaluatie_6_maanden"
        | "evaluatie_1_jaar"
        | "herstelmelding"
        | "uwv_melding"
        | "overig"
      event_type:
        | "ziekmelding"
        | "gesprek"
        | "document_toegevoegd"
        | "taak_afgerond"
        | "herstelmelding"
        | "evaluatie"
        | "statuswijziging"
      task_status: "open" | "in_progress" | "afgerond" | "overdue"
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
      app_role: ["hr", "manager", "medewerker"],
      case_status: ["actief", "herstel_gemeld", "gesloten", "archief"],
      document_type: [
        "probleemanalyse",
        "plan_van_aanpak",
        "evaluatie_3_maanden",
        "evaluatie_6_maanden",
        "evaluatie_1_jaar",
        "herstelmelding",
        "uwv_melding",
        "overig",
      ],
      event_type: [
        "ziekmelding",
        "gesprek",
        "document_toegevoegd",
        "taak_afgerond",
        "herstelmelding",
        "evaluatie",
        "statuswijziging",
      ],
      task_status: ["open", "in_progress", "afgerond", "overdue"],
    },
  },
} as const
