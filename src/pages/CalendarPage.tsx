import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Calendar, dateFnsLocalizer, View } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay, addMonths, subMonths } from 'date-fns';
import { nl } from 'date-fns/locale';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Plus, Download, Filter, ChevronLeft, ChevronRight } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { CreateEventDialog } from '@/components/calendar/CreateEventDialog';
import { EventDetailDialog } from '@/components/calendar/EventDetailDialog';
import { CalendarFilters } from '@/components/calendar/CalendarFilters';
import { toast } from 'sonner';

const locales = { nl };
const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { locale: nl, weekStartsOn: 1 }),
  getDay,
  locales,
});

interface CalendarEvent {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  event_type: string;
  start_time: string;
  end_time: string;
  all_day: boolean;
  color: string;
  location: string | null;
  is_virtual: boolean;
  meeting_url: string | null;
}

interface BigCalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  allDay: boolean;
  resource: CalendarEvent;
}

export default function CalendarPage() {
  const { user } = useAuth();
  const [view, setView] = useState<View>('month');
  const [date, setDate] = useState(new Date());
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [filters, setFilters] = useState({
    meeting: true,
    task: true,
    leave: true,
    birthday: true,
    training: true,
    review: true,
    deadline: true,
    other: true
  });
  
  const queryClient = useQueryClient();
  
  // Fetch events for current month
  const { data: events, isLoading } = useQuery({
    queryKey: ['calendar-events', user?.id, date.getFullYear(), date.getMonth()],
    queryFn: async () => {
      if (!user) return [];
      
      const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
      const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59);
      
      const { data, error } = await supabase
        .from('calendar_events')
        .select('*')
        .eq('user_id', user.id)
        .gte('start_time', startOfMonth.toISOString())
        .lte('start_time', endOfMonth.toISOString())
        .order('start_time');
      
      if (error) {
        console.error('Error fetching calendar events:', error);
        throw error;
      }
      
      return data as CalendarEvent[];
    },
    enabled: !!user
  });
  
  // Transform to react-big-calendar format
  const calendarEvents: BigCalendarEvent[] = events?.filter(event => 
    filters[event.event_type as keyof typeof filters]
  ).map(event => ({
    id: event.id,
    title: event.title,
    start: new Date(event.start_time),
    end: new Date(event.end_time),
    allDay: event.all_day,
    resource: event
  })) || [];
  
  // Export to ICS
  const handleExport = () => {
    if (!events || events.length === 0) {
      toast.error('Geen events om te exporteren');
      return;
    }
    
    // Simple ICS generation
    let icsContent = 'BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//Dirq HR//Calendar//EN\n';
    
    events.forEach(event => {
      icsContent += 'BEGIN:VEVENT\n';
      icsContent += `UID:${event.id}\n`;
      icsContent += `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z\n`;
      icsContent += `DTSTART:${new Date(event.start_time).toISOString().replace(/[-:]/g, '').split('.')[0]}Z\n`;
      icsContent += `DTEND:${new Date(event.end_time).toISOString().replace(/[-:]/g, '').split('.')[0]}Z\n`;
      icsContent += `SUMMARY:${event.title}\n`;
      if (event.description) {
        icsContent += `DESCRIPTION:${event.description}\n`;
      }
      if (event.location) {
        icsContent += `LOCATION:${event.location}\n`;
      }
      icsContent += 'END:VEVENT\n';
    });
    
    icsContent += 'END:VCALENDAR';
    
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `calendar-${format(date, 'yyyy-MM')}.ics`;
    a.click();
    URL.revokeObjectURL(url);
    
    toast.success('Calendar geëxporteerd');
  };
  
  // Event style getter
  const eventStyleGetter = (event: BigCalendarEvent) => {
    return {
      style: {
        backgroundColor: event.resource.color || '#3B82F6',
        borderRadius: '4px',
        opacity: 0.9,
        color: 'white',
        border: 'none',
        display: 'block',
        fontSize: '0.875rem',
        padding: '2px 4px'
      }
    };
  };
  
  const handleNavigate = (action: 'PREV' | 'NEXT' | 'TODAY') => {
    if (action === 'PREV') {
      setDate(subMonths(date, 1));
    } else if (action === 'NEXT') {
      setDate(addMonths(date, 1));
    } else {
      setDate(new Date());
    }
  };

  return (
    <AppLayout
      title="Persoonlijke Agenda"
      subtitle="Beheer je meetings, taken en verlof in één overzicht"
      actions={
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="h-4 w-4 mr-2" />
            Filters
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
          >
            <Download className="h-4 w-4 mr-2" />
            Exporteer
          </Button>
          <Button size="sm" onClick={() => setShowCreateDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nieuw Event
          </Button>
        </div>
      }
    >
      <div className="p-4 md:p-6 space-y-4">
        {/* Filters Panel */}
        {showFilters && (
          <CalendarFilters
            filters={filters}
            onChange={setFilters}
            onClose={() => setShowFilters(false)}
          />
        )}
        
        {/* Calendar */}
        <Card className="p-4">
          {isLoading ? (
            <div className="flex items-center justify-center h-[600px]">
              <div className="animate-pulse text-muted-foreground">
                Calendar laden...
              </div>
            </div>
          ) : (
            <div style={{ height: '700px' }}>
              <Calendar
                localizer={localizer}
                events={calendarEvents}
                startAccessor="start"
                endAccessor="end"
                view={view}
                onView={(newView) => setView(newView)}
                date={date}
                onNavigate={(newDate) => setDate(newDate)}
                eventPropGetter={eventStyleGetter}
                onSelectEvent={(event) => setSelectedEvent(event.resource)}
                onSelectSlot={({ start }) => {
                  setShowCreateDialog(true);
                }}
                selectable
                popup
                toolbar={false}
                messages={{
                  next: 'Volgende',
                  previous: 'Vorige',
                  today: 'Vandaag',
                  month: 'Maand',
                  week: 'Week',
                  day: 'Dag',
                  agenda: 'Agenda',
                  date: 'Datum',
                  time: 'Tijd',
                  event: 'Event',
                  noEventsInRange: 'Geen events in deze periode',
                  showMore: (total) => `+${total} meer`
                }}
              />
              
              {/* Custom Toolbar */}
              <div className="flex items-center justify-between mt-4 pt-4 border-t">
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => handleNavigate('PREV')}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleNavigate('TODAY')}
                  >
                    Vandaag
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => handleNavigate('NEXT')}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
                
                <div className="text-lg font-semibold">
                  {format(date, 'MMMM yyyy', { locale: nl })}
                </div>
                
                <div className="flex gap-1">
                  <Button
                    variant={view === 'month' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setView('month')}
                  >
                    Maand
                  </Button>
                  <Button
                    variant={view === 'week' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setView('week')}
                  >
                    Week
                  </Button>
                  <Button
                    variant={view === 'day' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setView('day')}
                  >
                    Dag
                  </Button>
                </div>
              </div>
            </div>
          )}
        </Card>
      </div>
      
      {/* Dialogs */}
      <CreateEventDialog
        open={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['calendar-events'] });
          setShowCreateDialog(false);
          toast.success('Event aangemaakt');
        }}
      />
      
      {selectedEvent && (
        <EventDetailDialog
          event={selectedEvent}
          open={!!selectedEvent}
          onClose={() => setSelectedEvent(null)}
          onDeleted={() => {
            queryClient.invalidateQueries({ queryKey: ['calendar-events'] });
            setSelectedEvent(null);
            toast.success('Event verwijderd');
          }}
        />
      )}
    </AppLayout>
  );
}
