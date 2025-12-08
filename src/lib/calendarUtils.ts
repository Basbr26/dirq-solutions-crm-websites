import { format, addHours } from 'date-fns';

interface CalendarEvent {
  title: string;
  description?: string;
  startDate: Date;
  endDate?: Date;
  location?: string;
  allDay?: boolean;
}

/**
 * Generate an ICS file content for a calendar event
 */
export function generateICSContent(event: CalendarEvent): string {
  const uid = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}@dirq-solutions.nl`;
  const now = new Date();
  
  const formatDateForICS = (date: Date, allDay = false): string => {
    if (allDay) {
      return format(date, 'yyyyMMdd');
    }
    return format(date, "yyyyMMdd'T'HHmmss");
  };

  const endDate = event.endDate || addHours(event.startDate, 1);
  const description = event.description?.replace(/\n/g, '\\n') || '';
  
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Dirq Solutions//Verzuim//NL',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${formatDateForICS(now)}`,
    event.allDay 
      ? `DTSTART;VALUE=DATE:${formatDateForICS(event.startDate, true)}`
      : `DTSTART:${formatDateForICS(event.startDate)}`,
    event.allDay
      ? `DTEND;VALUE=DATE:${formatDateForICS(endDate, true)}`
      : `DTEND:${formatDateForICS(endDate)}`,
    `SUMMARY:${event.title}`,
  ];

  if (description) {
    lines.push(`DESCRIPTION:${description}`);
  }

  if (event.location) {
    lines.push(`LOCATION:${event.location}`);
  }

  lines.push(
    'STATUS:CONFIRMED',
    'END:VEVENT',
    'END:VCALENDAR'
  );

  return lines.join('\r\n');
}

/**
 * Download an ICS file
 */
export function downloadICSFile(event: CalendarEvent, filename?: string): void {
  const icsContent = generateICSContent(event);
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = filename || `${event.title.replace(/[^a-zA-Z0-9]/g, '_')}.ics`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Generate Google Calendar URL for an event
 */
export function generateGoogleCalendarUrl(event: CalendarEvent): string {
  const baseUrl = 'https://calendar.google.com/calendar/render';
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.title,
    dates: event.allDay
      ? `${format(event.startDate, 'yyyyMMdd')}/${format(event.endDate || addHours(event.startDate, 24), 'yyyyMMdd')}`
      : `${format(event.startDate, "yyyyMMdd'T'HHmmss")}/${format(event.endDate || addHours(event.startDate, 1), "yyyyMMdd'T'HHmmss")}`,
  });

  if (event.description) {
    params.append('details', event.description);
  }

  if (event.location) {
    params.append('location', event.location);
  }

  return `${baseUrl}?${params.toString()}`;
}

/**
 * Generate Outlook Calendar URL for an event
 */
export function generateOutlookCalendarUrl(event: CalendarEvent): string {
  const baseUrl = 'https://outlook.live.com/calendar/0/deeplink/compose';
  const params = new URLSearchParams({
    path: '/calendar/action/compose',
    rru: 'addevent',
    subject: event.title,
    startdt: event.startDate.toISOString(),
    enddt: (event.endDate || addHours(event.startDate, 1)).toISOString(),
  });

  if (event.description) {
    params.append('body', event.description);
  }

  if (event.location) {
    params.append('location', event.location);
  }

  if (event.allDay) {
    params.append('allday', 'true');
  }

  return `${baseUrl}?${params.toString()}`;
}

/**
 * Export task to calendar
 */
export function exportTaskToCalendar(task: {
  title: string;
  description?: string;
  deadline: string;
  employeeName?: string;
}): CalendarEvent {
  const deadlineDate = new Date(task.deadline);
  
  return {
    title: `[Verzuim] ${task.title}`,
    description: task.employeeName 
      ? `Taak voor medewerker: ${task.employeeName}\n\n${task.description || ''}`
      : task.description,
    startDate: deadlineDate,
    allDay: true,
  };
}
