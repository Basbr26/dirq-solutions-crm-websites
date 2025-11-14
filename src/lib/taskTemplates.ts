import { Task } from '@/types/sickLeave';

interface TaskTemplate {
  title: string;
  description: string;
  deadlineDays: number; // dagen na start_date
}

export const defaultTaskTemplates: TaskTemplate[] = [
  {
    title: 'Eerste contact met medewerker',
    description: 'Neem binnen 24 uur contact op met de zieke medewerker om te informeren naar de situatie.',
    deadlineDays: 1,
  },
  {
    title: 'Manager informeren',
    description: 'Informeer de direct leidinggevende over de ziekmelding en bespreek werkoverleg.',
    deadlineDays: 1,
  },
  {
    title: 'Arbo-arts raadplegen',
    description: 'Plan een afspraak met de bedrijfsarts indien nodig voor medische beoordeling.',
    deadlineDays: 7,
  },
  {
    title: 'Probleemanalyse uitvoeren',
    description: 'Analyseer mogelijke oorzaken van het verzuim en documenteer bevindingen.',
    deadlineDays: 14,
  },
  {
    title: 'Plan van aanpak opstellen',
    description: 'Stel samen met medewerker en manager een re-integratieplan op.',
    deadlineDays: 21,
  },
  {
    title: 'Eerste evaluatiegesprek',
    description: 'Voer een evaluatiegesprek over voortgang en eventuele aanpassingen.',
    deadlineDays: 42,
  },
];

export function generateTasksFromTemplate(
  caseId: string,
  startDate: string,
  createdBy: string
): Omit<Task, 'id' | 'created_at' | 'updated_at' | 'completed_at' | 'completed_by' | 'gespreksonderwerpen' | 'toegestane_vragen' | 'verboden_vragen' | 'juridische_context' | 'notes'>[] {
  const start = new Date(startDate);
  
  return defaultTaskTemplates.map((template) => {
    const deadline = new Date(start);
    deadline.setDate(deadline.getDate() + template.deadlineDays);
    
    return {
      case_id: caseId,
      title: template.title,
      description: template.description,
      deadline: deadline.toISOString().split('T')[0],
      task_status: 'open' as const,
      assigned_to: null,
    };
  });
}