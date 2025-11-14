import { Task } from '@/types/sickLeave';

interface TaskTemplate {
  titel: string;
  beschrijving: string;
  deadlineDays: number; // dagen na start_datum
}

export const defaultTaskTemplates: TaskTemplate[] = [
  {
    titel: 'Eerste contact met medewerker',
    beschrijving: 'Neem binnen 24 uur contact op met de zieke medewerker om te informeren naar de situatie.',
    deadlineDays: 1,
  },
  {
    titel: 'Manager informeren',
    beschrijving: 'Informeer de direct leidinggevende over de ziekmelding en bespreek werkoverleg.',
    deadlineDays: 1,
  },
  {
    titel: 'Arbo-arts raadplegen',
    beschrijving: 'Plan een afspraak met de bedrijfsarts indien nodig voor medische beoordeling.',
    deadlineDays: 7,
  },
  {
    titel: 'Probleemanalyse uitvoeren',
    beschrijving: 'Analyseer mogelijke oorzaken van het verzuim en documenteer bevindingen.',
    deadlineDays: 14,
  },
  {
    titel: 'Plan van aanpak opstellen',
    beschrijving: 'Stel samen met medewerker en manager een re-integratieplan op.',
    deadlineDays: 21,
  },
  {
    titel: 'Eerste evaluatiegesprek',
    beschrijving: 'Voer een evaluatiegesprek over voortgang en eventuele aanpassingen.',
    deadlineDays: 42,
  },
];

export function generateTasksFromTemplate(
  caseId: string,
  startDatum: string,
  createdBy: string
): Task[] {
  const startDate = new Date(startDatum);
  
  return defaultTaskTemplates.map((template, index) => {
    const deadline = new Date(startDate);
    deadline.setDate(deadline.getDate() + template.deadlineDays);
    
    return {
      id: `task-${caseId}-${index}`,
      case_id: caseId,
      titel: template.titel,
      beschrijving: template.beschrijving,
      deadline: deadline.toISOString().split('T')[0],
      status: 'open',
      toegewezen_aan: null,
      created_at: new Date().toISOString(),
      completed_at: null,
    };
  });
}
