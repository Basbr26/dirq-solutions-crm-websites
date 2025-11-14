import { supabase } from './supabase';
import { defaultTaskTemplates } from './taskTemplates';

/**
 * Genereert automatisch taken op basis van de Wet Poortwachter templates
 * Wordt aangeroepen bij het aanmaken van een nieuwe ziekmelding
 */
export async function generateInitialTasks(caseId: string, startDate: string) {
  const tasks = defaultTaskTemplates.map(template => ({
    case_id: caseId,
    titel: template.titel,
    beschrijving: template.beschrijving,
    deadline: calculateDeadline(startDate, template.deadlineDays),
    status: 'open' as const,
    toegewezen_aan: null,
  }));

  const { data, error } = await supabase
    .from('tasks')
    .insert(tasks)
    .select();

  if (error) throw error;
  return data;
}

/**
 * Berekent een deadline datum op basis van een startdatum en aantal dagen
 */
export function calculateDeadline(startDate: string, daysAfter: number): string {
  const date = new Date(startDate);
  date.setDate(date.getDate() + daysAfter);
  return date.toISOString().split('T')[0];
}

/**
 * Creëert een timeline event
 */
export async function createTimelineEvent(
  caseId: string,
  eventType: 'ziekmelding' | 'gesprek' | 'herstel' | 'afmelding' | 'notitie' | 'document_upload' | 'task_completed' | 'status_change',
  beschrijving: string,
  createdBy: string
) {
  const { data, error } = await supabase
    .from('timeline_events')
    .insert({
      case_id: caseId,
      event_type: eventType,
      beschrijving,
      created_by: createdBy,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Haalt alle cases op voor een manager (alleen van zijn team)
 */
export async function getManagerCases(managerId: string) {
  const { data, error } = await supabase
    .from('sick_leave_cases')
    .select(`
      *,
      profiles!sick_leave_cases_medewerker_id_fkey (
        id,
        voornaam,
        achternaam,
        email,
        foto_url
      )
    `)
    .eq('manager_id', managerId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

/**
 * Haalt alle taken op voor een manager (van zijn team)
 */
export async function getManagerTasks(managerId: string) {
  const { data, error } = await supabase
    .from('tasks')
    .select(`
      *,
      sick_leave_cases!inner (
        medewerker_naam,
        manager_id
      )
    `)
    .eq('sick_leave_cases.manager_id', managerId)
    .order('deadline', { ascending: true });

  if (error) throw error;
  return data;
}

/**
 * Haalt de case op van een medewerker
 */
export async function getEmployeeCase(employeeId: string) {
  const { data, error } = await supabase
    .from('sick_leave_cases')
    .select('*')
    .eq('medewerker_id', employeeId)
    .eq('status', 'actief')
    .single();

  if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows
  return data;
}

/**
 * Haalt documenten op voor een case (met filtering voor medewerkers)
 */
export async function getCaseDocuments(caseId: string, userRole: string) {
  let query = supabase
    .from('documents')
    .select('*')
    .eq('case_id', caseId);

  // Medewerkers en managers mogen geen medische documenten zien
  if (userRole !== 'hr') {
    query = query.neq('categorie', 'medisch');
  }

  const { data, error } = await query.order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

/**
 * Haalt timeline events op voor een case
 */
export async function getCaseTimeline(caseId: string) {
  const { data, error } = await supabase
    .from('timeline_events')
    .select(`
      *,
      profiles!timeline_events_created_by_fkey (
        voornaam,
        achternaam
      )
    `)
    .eq('case_id', caseId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

/**
 * Update de status van een taak en creëer een timeline event
 */
export async function updateTaskStatus(
  taskId: string,
  status: 'open' | 'in_progress' | 'completed',
  caseId: string,
  userId: string,
  taskTitle: string
) {
  // Update task
  const { error: taskError } = await supabase
    .from('tasks')
    .update({ 
      status,
      completed_at: status === 'completed' ? new Date().toISOString() : null
    })
    .eq('id', taskId);

  if (taskError) throw taskError;

  // Create timeline event if completed
  if (status === 'completed') {
    await createTimelineEvent(
      caseId,
      'task_completed',
      `Taak voltooid: ${taskTitle}`,
      userId
    );
  }
}

/**
 * Update de status van een case en creëer een timeline event
 */
export async function updateCaseStatus(
  caseId: string,
  status: 'actief' | 'herstel' | 'afgesloten',
  userId: string
) {
  // Update case
  const { error: caseError } = await supabase
    .from('sick_leave_cases')
    .update({ status })
    .eq('id', caseId);

  if (caseError) throw caseError;

  // Create timeline event
  const statusLabels = {
    actief: 'Case status gewijzigd naar Actief',
    herstel: 'Case status gewijzigd naar Herstel',
    afgesloten: 'Case afgesloten',
  };

  await createTimelineEvent(
    caseId,
    'status_change',
    statusLabels[status],
    userId
  );
}
