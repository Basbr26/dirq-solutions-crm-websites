import { Database, Json } from '@/integrations/supabase/types';
import { ReactNode } from 'react';

export type CaseStatus = Database['public']['Enums']['case_status'];
export type TaskStatus = Database['public']['Enums']['task_status'];
export type AppRole = Database['public']['Enums']['app_role'];
export type DocumentType = Database['public']['Enums']['document_type'];
export type EventType =
  Database['public']['Enums']['event_type'] |
  'document_upload' |
  'afgerond' |
  'status_change';

// Sluit aan op de Supabase-tabel sick_leave_cases
export interface SickLeaveCase {
  reason: ReactNode;
  id: string;
  employee_id: string;
  start_date: string;
  end_date: string | null;
  case_status: CaseStatus;
  functional_limitations: string | null;
  created_by: string;
  created_at: string | null;
  updated_at: string | null;

  // Via select(..., employee:profiles!employee_id(...))
  employee?: {
    voornaam: string;
    achternaam: string;
    email?: string;
  };
}

// Sluit aan op de Supabase-tabel tasks
export interface Task {
  id: string;
  title: string;
  description: string | null;
  deadline: string | null;
  task_status: 'open' | 'in_progress' | 'afgerond' | 'overdue';
  case_id: string;
  assigned_to: string;
  assigned_user?: {
    id: string;
    voornaam: string;
    achternaam: string;
    email?: string;
  } | null;
  completed_at?: string | null;
  completed_by?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  gespreksonderwerpen?: string | null;
  toegestane_vragen?: string | null;
  verboden_vragen?: string | null;
  juridische_context?: string | null;
  notes?: string | null;
}

// Sluit aan op de Supabase-tabel timeline_events
export interface TimelineEvent {
  id: string;
  case_id: string;
  event_type: EventType;
  description: string;
  created_by: string;
  created_at: string | null;
  date: string | null;

  // Gebruik een veiligere type i.p.v. any
    metadata: Json | null;

  // Via select(..., created_by_profile:profiles!created_by(...))
  creator?: {
    voornaam: string;
    achternaam: string;
  };
}

// Sluit aan op de Supabase-tabel documents
export interface Document {
  id: string;
  case_id: string;
  file_name: string;
  document_type: DocumentType;
  file_url: string;
  uploaded_by: string;
  created_at: string | null;
}
