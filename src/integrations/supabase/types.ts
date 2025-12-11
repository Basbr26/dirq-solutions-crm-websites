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
      activity_logs: {
        Row: {
          action_type: string
          case_id: string | null
          created_at: string
          description: string
          entity_id: string | null
          entity_type: string
          id: string
          ip_address: string | null
          metadata: Json | null
          user_id: string | null
        }
        Insert: {
          action_type: string
          case_id?: string | null
          created_at?: string
          description: string
          entity_id?: string | null
          entity_type: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          user_id?: string | null
        }
        Update: {
          action_type?: string
          case_id?: string | null
          created_at?: string
          description?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_logs_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "sick_leave_cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_notes: {
        Row: {
          agreements: string | null
          case_id: string
          conversation_date: string
          conversation_type: string
          created_at: string
          created_by: string
          discussed_topics: string | null
          employee_mood: string | null
          follow_up_actions: string | null
          id: string
          summary: string
          updated_at: string
        }
        Insert: {
          agreements?: string | null
          case_id: string
          conversation_date?: string
          conversation_type?: string
          created_at?: string
          created_by: string
          discussed_topics?: string | null
          employee_mood?: string | null
          follow_up_actions?: string | null
          id?: string
          summary: string
          updated_at?: string
        }
        Update: {
          agreements?: string | null
          case_id?: string
          conversation_date?: string
          conversation_type?: string
          created_at?: string
          created_by?: string
          discussed_topics?: string | null
          employee_mood?: string | null
          follow_up_actions?: string | null
          id?: string
          summary?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_notes_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "sick_leave_cases"
            referencedColumns: ["id"]
          },
        ]
      }
      departments: {
        Row: {
          created_at: string
          description: string | null
          id: string
          manager_id: string | null
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          manager_id?: string | null
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          manager_id?: string | null
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "departments_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      document_invitations: {
        Row: {
          created_at: string | null
          document_id: string
          email: string
          expires_at: string | null
          id: string
          signature_data: string | null
          signed: boolean | null
          signed_at: string | null
          signed_document_path: string | null
          verification_code: string
        }
        Insert: {
          created_at?: string | null
          document_id: string
          email: string
          expires_at?: string | null
          id?: string
          signature_data?: string | null
          signed?: boolean | null
          signed_at?: string | null
          signed_document_path?: string | null
          verification_code: string
        }
        Update: {
          created_at?: string | null
          document_id?: string
          email?: string
          expires_at?: string | null
          id?: string
          signature_data?: string | null
          signed?: boolean | null
          signed_at?: string | null
          signed_document_path?: string | null
          verification_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_invitations_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          case_id: string
          created_at: string | null
          document_type: Database["public"]["Enums"]["document_type"]
          file_name: string
          file_url: string
          id: string
          owner_signature_data: string | null
          owner_signed: boolean | null
          owner_signed_at: string | null
          requires_signatures: string[] | null
          signed_file_path: string | null
          status: string | null
          uploaded_by: string
        }
        Insert: {
          case_id: string
          created_at?: string | null
          document_type: Database["public"]["Enums"]["document_type"]
          file_name: string
          file_url: string
          id?: string
          owner_signature_data?: string | null
          owner_signed?: boolean | null
          owner_signed_at?: string | null
          requires_signatures?: string[] | null
          signed_file_path?: string | null
          status?: string | null
          uploaded_by: string
        }
        Update: {
          case_id?: string
          created_at?: string | null
          document_type?: Database["public"]["Enums"]["document_type"]
          file_name?: string
          file_url?: string
          id?: string
          owner_signature_data?: string | null
          owner_signed?: boolean | null
          owner_signed_at?: string | null
          requires_signatures?: string[] | null
          signed_file_path?: string | null
          status?: string | null
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
      employee_notes: {
        Row: {
          content: string
          created_at: string | null
          created_by: string
          employee_id: string
          id: string
          is_private: boolean | null
          title: string
          updated_at: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          created_by: string
          employee_id: string
          id?: string
          is_private?: boolean | null
          title: string
          updated_at?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          created_by?: string
          employee_id?: string
          id?: string
          is_private?: boolean | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employee_notes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_notes_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_balances: {
        Row: {
          created_at: string | null
          employee_id: string
          id: string
          leave_type: Database["public"]["Enums"]["leave_type"]
          pending_days: number
          total_days: number
          updated_at: string | null
          used_days: number
          year: number
        }
        Insert: {
          created_at?: string | null
          employee_id: string
          id?: string
          leave_type: Database["public"]["Enums"]["leave_type"]
          pending_days?: number
          total_days?: number
          updated_at?: string | null
          used_days?: number
          year: number
        }
        Update: {
          created_at?: string | null
          employee_id?: string
          id?: string
          leave_type?: Database["public"]["Enums"]["leave_type"]
          pending_days?: number
          total_days?: number
          updated_at?: string | null
          used_days?: number
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "leave_balances_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_requests: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string | null
          days: number
          employee_id: string
          end_date: string
          hours: number | null
          id: string
          leave_type: Database["public"]["Enums"]["leave_type"]
          reason: string | null
          rejection_reason: string | null
          start_date: string
          status: Database["public"]["Enums"]["leave_status"]
          updated_at: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          days: number
          employee_id: string
          end_date: string
          hours?: number | null
          id?: string
          leave_type: Database["public"]["Enums"]["leave_type"]
          reason?: string | null
          rejection_reason?: string | null
          start_date: string
          status?: Database["public"]["Enums"]["leave_status"]
          updated_at?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          days?: number
          employee_id?: string
          end_date?: string
          hours?: number | null
          id?: string
          leave_type?: Database["public"]["Enums"]["leave_type"]
          reason?: string | null
          rejection_reason?: string | null
          start_date?: string
          status?: Database["public"]["Enums"]["leave_status"]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leave_requests_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_requests_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          case_id: string | null
          created_at: string
          email_sent: boolean
          id: string
          is_read: boolean
          message: string
          notification_type: string
          task_id: string | null
          title: string
          user_id: string
        }
        Insert: {
          case_id?: string | null
          created_at?: string
          email_sent?: boolean
          id?: string
          is_read?: boolean
          message: string
          notification_type: string
          task_id?: string | null
          title: string
          user_id: string
        }
        Update: {
          case_id?: string | null
          created_at?: string
          email_sent?: boolean
          id?: string
          is_read?: boolean
          message?: string
          notification_type?: string
          task_id?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "sick_leave_cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
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
          achternaam: string
          address: string | null
          bank_account: string | null
          bsn_encrypted: string | null
          city: string | null
          contract_type: string | null
          created_at: string | null
          date_of_birth: string | null
          department_id: string | null
          email: string
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          employee_number: string | null
          employment_status: string | null
          end_date: string | null
          foto_url: string | null
          functie: string | null
          hours_per_week: number | null
          id: string
          manager_id: string | null
          must_change_password: boolean | null
          notes: string | null
          postal_code: string | null
          start_date: string | null
          telefoon: string | null
          updated_at: string | null
          voornaam: string
        }
        Insert: {
          achternaam: string
          address?: string | null
          bank_account?: string | null
          bsn_encrypted?: string | null
          city?: string | null
          contract_type?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          department_id?: string | null
          email: string
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          employee_number?: string | null
          employment_status?: string | null
          end_date?: string | null
          foto_url?: string | null
          functie?: string | null
          hours_per_week?: number | null
          id: string
          manager_id?: string | null
          must_change_password?: boolean | null
          notes?: string | null
          postal_code?: string | null
          start_date?: string | null
          telefoon?: string | null
          updated_at?: string | null
          voornaam: string
        }
        Update: {
          achternaam?: string
          address?: string | null
          bank_account?: string | null
          bsn_encrypted?: string | null
          city?: string | null
          contract_type?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          department_id?: string | null
          email?: string
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          employee_number?: string | null
          employment_status?: string | null
          end_date?: string | null
          foto_url?: string | null
          functie?: string | null
          hours_per_week?: number | null
          id?: string
          manager_id?: string | null
          must_change_password?: boolean | null
          notes?: string | null
          postal_code?: string | null
          start_date?: string | null
          telefoon?: string | null
          updated_at?: string | null
          voornaam?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
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
          expected_recovery_date: string | null
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
          expected_recovery_date?: string | null
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
          expected_recovery_date?: string | null
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
          calendar_reminder_sent: boolean | null
          case_id: string
          completed_at: string | null
          completed_by: string | null
          created_at: string | null
          deadline: string
          description: string | null
          gespreksonderwerpen: string | null
          id: string
          juridische_context: string | null
          last_reminder_at: string | null
          notes: string | null
          task_status: Database["public"]["Enums"]["task_status"] | null
          title: string
          toegestane_vragen: string | null
          updated_at: string | null
          verboden_vragen: string | null
        }
        Insert: {
          assigned_to: string
          calendar_reminder_sent?: boolean | null
          case_id: string
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string | null
          deadline: string
          description?: string | null
          gespreksonderwerpen?: string | null
          id?: string
          juridische_context?: string | null
          last_reminder_at?: string | null
          notes?: string | null
          task_status?: Database["public"]["Enums"]["task_status"] | null
          title: string
          toegestane_vragen?: string | null
          updated_at?: string | null
          verboden_vragen?: string | null
        }
        Update: {
          assigned_to?: string
          calendar_reminder_sent?: boolean | null
          case_id?: string
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string | null
          deadline?: string
          description?: string | null
          gespreksonderwerpen?: string | null
          id?: string
          juridische_context?: string | null
          last_reminder_at?: string | null
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
      app_role: "hr" | "manager" | "medewerker" | "super_admin"
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
        | "gespreksverslag"
      event_type:
        | "ziekmelding"
        | "gesprek"
        | "document_toegevoegd"
        | "taak_afgerond"
        | "herstelmelding"
        | "evaluatie"
        | "statuswijziging"
      leave_status: "pending" | "approved" | "rejected" | "cancelled"
      leave_type:
        | "vakantie"
        | "adv"
        | "bijzonder"
        | "onbetaald"
        | "ouderschaps"
        | "zwangerschaps"
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
      app_role: ["hr", "manager", "medewerker", "super_admin"],
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
        "gespreksverslag",
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
      leave_status: ["pending", "approved", "rejected", "cancelled"],
      leave_type: [
        "vakantie",
        "adv",
        "bijzonder",
        "onbetaald",
        "ouderschaps",
        "zwangerschaps",
      ],
      task_status: ["open", "in_progress", "afgerond", "overdue"],
    },
  },
} as const
