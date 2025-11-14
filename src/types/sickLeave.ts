export type CaseStatus = 'actief' | 'herstel' | 'afgesloten';
export type TaskStatus = 'open' | 'in_progress' | 'completed';
export type AppRole = 'hr' | 'manager' | 'medewerker';

export interface SickLeaveCase {
  id: string;
  medewerker_id: string;
  medewerker_naam: string;
  start_datum: string;
  eind_datum: string | null;
  reden: string;
  status: CaseStatus;
  manager_id: string | null;
  notities: string | null;
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: string;
  case_id: string;
  titel: string;
  beschrijving: string;
  deadline: string;
  status: TaskStatus;
  toegewezen_aan: string | null;
  created_at: string;
  completed_at: string | null;
}

export interface TimelineEvent {
  id: string;
  case_id: string;
  event_type: 'ziekmelding' | 'gesprek' | 'herstel' | 'afmelding' | 'notitie';
  beschrijving: string;
  created_by: string;
  created_at: string;
}
