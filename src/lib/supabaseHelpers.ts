import { supabase } from '@/integrations/supabase/client';
import { defaultTaskTemplates } from './taskTemplates';

/**
 * Genereert automatisch taken op basis van de Wet Poortwachter templates
 * Wordt aangeroepen bij het aanmaken van een nieuwe ziekmelding
 */
export async function generateInitialTasks(caseId: string, startDate: string, assignedTo: string) {
  const tasks = defaultTaskTemplates.map(template => ({
    case_id: caseId,
    title: template.title,
    description: template.description,
    deadline: calculateDeadline(startDate, template.deadlineDays),
    task_status: 'open' as const,
    assigned_to: assignedTo,
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
  eventType: 'ziekmelding' | 'gesprek' | 'document_toegevoegd' | 'taak_afgerond' | 'herstelmelding' | 'evaluatie' | 'statuswijziging',
  beschrijving: string,
  createdBy: string
) {
  const { data, error } = await supabase
    .from('timeline_events')
    .insert({
      case_id: caseId,
      event_type: eventType,
      description: beschrijving,
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
      employee:profiles!sick_leave_cases_employee_id_fkey (
        id,
        voornaam,
        achternaam,
        email,
        foto_url
      )
    `)
    .eq('profiles.manager_id', managerId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

/**
 * Haalt alle taken op voor een manager (van zijn team)
 */
export async function getManagerTasks(managerId: string) {
  // First get all cases for this manager
  const { data: cases, error: casesError } = await supabase
    .from('sick_leave_cases')
    .select('id')
    .eq('profiles.manager_id', managerId);

  if (casesError) throw casesError;
  
  const caseIds = cases?.map(c => c.id) || [];
  
  if (caseIds.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from('tasks')
    .select(`
      *,
      case:sick_leave_cases!inner (
        id,
        employee_id,
        employee:profiles!sick_leave_cases_employee_id_fkey (
          voornaam,
          achternaam
        )
      )
    `)
    .in('case_id', caseIds)
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
    .select(`
      *,
      employee:profiles!sick_leave_cases_employee_id_fkey (
        voornaam,
        achternaam,
        email
      )
    `)
    .eq('employee_id', employeeId)
    .in('case_status', ['actief', 'herstel_gemeld'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
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
    // Filter out medical document types if needed
    query = query.in('document_type', ['probleemanalyse', 'plan_van_aanpak', 'evaluatie_3_maanden', 'evaluatie_6_maanden', 'evaluatie_1_jaar', 'herstelmelding', 'overig']);
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
      creator:profiles!timeline_events_created_by_fkey (
        id,
        voornaam,
        achternaam,
        email
      )
    `)
    .eq('case_id', caseId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

/**
 * Update taak status
 */
export async function updateTaskStatus(
  taskId: string,
  status: 'open' | 'in_progress' | 'afgerond',
  caseId: string,
  userId: string,
  taskTitle: string
) {
  const updates: any = {
    task_status: status,
    updated_at: new Date().toISOString(),
  };

  if (status === 'afgerond') {
    updates.completed_at = new Date().toISOString();
    updates.completed_by = userId;
  }

  const { error } = await supabase
    .from('tasks')
    .update(updates)
    .eq('id', taskId);

  if (error) throw error;

  // Create timeline event for completed tasks
  if (status === 'afgerond') {
    await createTimelineEvent(
      caseId,
      'taak_afgerond',
      `Taak afgerond: ${taskTitle}`,
      userId
    );
  }
}

/**
 * Update case status
 */
export async function updateCaseStatus(
  caseId: string,
  status: 'actief' | 'herstel_gemeld' | 'gesloten',
  userId: string
) {
  const updates: any = {
    case_status: status,
    updated_at: new Date().toISOString(),
  };

  if (status === 'gesloten') {
    updates.end_date = new Date().toISOString().split('T')[0];
  }

  const { error } = await supabase
    .from('sick_leave_cases')
    .update(updates)
    .eq('id', caseId);

  if (error) throw error;

  // Create timeline event
  const statusLabels = {
    actief: 'Actief',
    herstel_gemeld: 'Herstel gemeld',
    gesloten: 'Gesloten',
  };

  await createTimelineEvent(
    caseId,
    'statuswijziging',
    `Status gewijzigd naar: ${statusLabels[status]}`,
    userId
  );
}
