import { SickLeaveCase, Task } from "@/types/sickLeave";
import { format } from "date-fns";
import { nl } from "date-fns/locale";

export function exportCasesToCSV(cases: SickLeaveCase[]) {
  const headers = [
    'ID',
    'Medewerker',
    'Startdatum',
    'Einddatum',
    'Functionele Beperkingen',
    'Status',
  ];

  const rows = cases.map(c => [
    c.id,
    c.employee ? `${c.employee.voornaam} ${c.employee.achternaam}` : 'Onbekend',
    format(new Date(c.start_date), 'dd-MM-yyyy', { locale: nl }),
    c.end_date ? format(new Date(c.end_date), 'dd-MM-yyyy', { locale: nl }) : 'Lopend',
    c.functional_limitations || 'Niet gespecificeerd',
    c.case_status === 'herstel_gemeld' ? 'Herstel Gemeld' : c.case_status.charAt(0).toUpperCase() + c.case_status.slice(1),
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n');

  downloadCSV(csvContent, `ziekmeldingen-${format(new Date(), 'yyyy-MM-dd')}.csv`);
}

export function exportTasksToCSV(tasks: Task[], cases: SickLeaveCase[]) {
  const headers = [
    'ID',
    'Case ID',
    'Medewerker',
    'Titel',
    'Beschrijving',
    'Deadline',
    'Status',
    'Voltooid op',
  ];

  const rows = tasks.map(t => {
    const relatedCase = cases.find(c => c.id === t.case_id);
    const employeeName = relatedCase?.employee 
      ? `${relatedCase.employee.voornaam} ${relatedCase.employee.achternaam}` 
      : 'Onbekend';
    
    return [
      t.id,
      t.case_id,
      employeeName,
      t.title,
      t.description || '',
      format(new Date(t.deadline), 'dd-MM-yyyy', { locale: nl }),
      t.task_status === 'open' ? 'Open' : t.task_status === 'in_progress' ? 'Bezig' : 'Voltooid',
      t.completed_at ? format(new Date(t.completed_at), 'dd-MM-yyyy', { locale: nl }) : '',
    ];
  });

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n');

  downloadCSV(csvContent, `taken-${format(new Date(), 'yyyy-MM-dd')}.csv`);
}

function downloadCSV(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}