import { SickLeaveCase, Task } from "@/types/sickLeave";
import { format } from "date-fns";
import { nl } from "date-fns/locale";

export function exportCasesToCSV(cases: SickLeaveCase[]) {
  const headers = [
    'ID',
    'Medewerker',
    'Startdatum',
    'Einddatum',
    'Reden',
    'Status',
    'Notities',
  ];

  const rows = cases.map(c => [
    c.id,
    c.medewerker_naam,
    format(new Date(c.start_datum), 'dd-MM-yyyy', { locale: nl }),
    c.eind_datum ? format(new Date(c.eind_datum), 'dd-MM-yyyy', { locale: nl }) : 'Lopend',
    c.reden,
    c.status.charAt(0).toUpperCase() + c.status.slice(1),
    c.notities || '',
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
    return [
      t.id,
      t.case_id,
      relatedCase?.medewerker_naam || 'Onbekend',
      t.titel,
      t.beschrijving,
      format(new Date(t.deadline), 'dd-MM-yyyy', { locale: nl }),
      t.status === 'open' ? 'Open' : t.status === 'in_progress' ? 'Bezig' : 'Voltooid',
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
