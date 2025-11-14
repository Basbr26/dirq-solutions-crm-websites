import { Database } from '@/integrations/supabase/types';

export type CaseStatus = Database['public']['Enums']['case_status'];
export type TaskStatus = Database['public']['Enums']['task_status'];
export type AppRole = Database['public']['Enums']['app_role'];
export type DocumentType = Database['public']['Enums']['document_type'];
export type EventType = Database['public']['Enums']['event_type'];

// For backward compatibility and UI display
export interface SickLeaveCase {
  id: string;
  employee_id: string;
  start_date: string;
  end_date: string | null;
  case_status: CaseStatus;
  functional_limitations: string | null;
  created_by: string;
  created_at: string | null;
  updated_at: string | null;
  employee?: {
    voornaam: string;
    achternaam: string;
    email?: string;
  };
}

export interface Task {
  id: string;
  case_id: string;
  title: string;
  description: string | null;
  deadline: string;
  task_status: TaskStatus;
  assigned_to: string;
  completed_at: string | null;
  completed_by: string | null;
  created_at: string | null;
  updated_at: string | null;
  
  // Wet Poortwachter specific fields
  gespreksonderwerpen: string | null;
  toegestane_vragen: string | null;
  verboden_vragen: string | null;
  juridische_context: string | null;
  notes: string | null;
}

export interface TimelineEvent {
  id: string;
  case_id: string;
  event_type: EventType;
  description: string;
  created_by: string;
  created_at: string | null;
  date: string | null;
  metadata: any;
  creator?: {
    voornaam: string;
    achternaam: string;
  };
}

export interface Document {
  id: string;
  case_id: string;
  file_name: string;
  document_type: DocumentType;
  file_url: string;
  uploaded_by: string;
  created_at: string | null;
}
