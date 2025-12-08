import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Calendar, Download, ExternalLink } from 'lucide-react';
import { 
  downloadICSFile, 
  generateGoogleCalendarUrl, 
  generateOutlookCalendarUrl,
  exportTaskToCalendar 
} from '@/lib/calendarUtils';
import { toast } from 'sonner';

interface CalendarExportButtonProps {
  task: {
    title: string;
    description?: string;
    deadline: string;
    employeeName?: string;
  };
  variant?: 'default' | 'ghost' | 'outline';
  size?: 'default' | 'sm' | 'icon';
}

export function CalendarExportButton({ 
  task, 
  variant = 'ghost', 
  size = 'icon' 
}: CalendarExportButtonProps) {
  const [open, setOpen] = useState(false);

  const handleDownloadICS = () => {
    const event = exportTaskToCalendar(task);
    downloadICSFile(event);
    toast.success('Agenda-bestand gedownload');
    setOpen(false);
  };

  const handleGoogleCalendar = () => {
    const event = exportTaskToCalendar(task);
    const url = generateGoogleCalendarUrl(event);
    window.open(url, '_blank');
    setOpen(false);
  };

  const handleOutlookCalendar = () => {
    const event = exportTaskToCalendar(task);
    const url = generateOutlookCalendarUrl(event);
    window.open(url, '_blank');
    setOpen(false);
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant={variant} size={size} title="Toevoegen aan agenda">
          <Calendar className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={handleDownloadICS}>
          <Download className="h-4 w-4 mr-2" />
          Download .ics bestand
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleGoogleCalendar}>
          <ExternalLink className="h-4 w-4 mr-2" />
          Google Calendar
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleOutlookCalendar}>
          <ExternalLink className="h-4 w-4 mr-2" />
          Outlook Calendar
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
