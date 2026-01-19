import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Calendar, dateFnsLocalizer, View } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay, addMonths, subMonths, isSameDay } from 'date-fns';
import { nl } from 'date-fns/locale';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import '@/styles/calendar-professional.css';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { FloatingActionButton } from '@/components/ui/floating-action-button';
import { Plus, Download, Filter, ChevronLeft, ChevronRight, Trash2, Building2, User, Link as LinkIcon, X, MapPin, Clock, Calendar as CalendarIcon } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { CreateEventDialog } from '@/components/calendar/CreateEventDialog';
import { EventDetailDialog } from '@/components/calendar/EventDetailDialog';
import { CalendarFilters } from '@/components/calendar/CalendarFilters';
import { HorizontalDatePicker } from '@/components/calendar/HorizontalDatePicker';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { SidePanel } from '@/components/ui/side-panel';

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
  google_event_id?: string | null;
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
  const { t } = useTranslation();
  const { user } = useAuth();
  const [view, setView] = useState<View>('month');
  const [date, setDate] = useState(new Date());
  const [showFilters, setShowFilters] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [filters, setFilters] = useState({
    meeting: true,
    call: true,
    demo: true,
    followup: true,
    deadline: true,
    training: true,
    company: true,
    personal: true,
    task: true, // Taken met due_date
  });
  const isDesktop = useMediaQuery('(min-width: 768px)');
  
  const queryClient = useQueryClient();
  
  // Fetch events for current month (calendar_events + scheduled interactions)
  const { data: events, isLoading } = useQuery({
    queryKey: ['calendar-events', user?.id, date.getFullYear(), date.getMonth()],
    queryFn: async () => {
      if (!user) return [];
      
      const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
      const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59);
      
      // Fetch calendar events (alleen toekomstige en huidige maand)
      const { data: calendarData, error: calendarError } = await supabase
        .from('calendar_events')
        .select('*')
        .eq('user_id', user.id)
        .gte('start_time', startOfMonth.toISOString())
        .lte('start_time', endOfMonth.toISOString())
        .order('start_time');
      
      if (calendarError) {
        console.error('Error fetching calendar events:', calendarError);
      }

      // Fetch scheduled interactions (calls, meetings, demos with scheduled_at)
      const { data: scheduledInteractions, error: scheduledError } = await supabase
        .from('interactions')
        .select('*')
        .eq('user_id', user.id)
        .in('type', ['meeting', 'call', 'demo'])
        .not('scheduled_at', 'is', null)
        .gte('scheduled_at', startOfMonth.toISOString())
        .lte('scheduled_at', endOfMonth.toISOString())
        .order('scheduled_at');

      if (scheduledError) {
        console.error('Error fetching scheduled interactions:', scheduledError);
      }

      // Fetch tasks with due dates
      const { data: tasks, error: tasksError } = await supabase
        .from('interactions')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_task', true)
        .not('due_date', 'is', null)
        .gte('due_date', format(startOfMonth, 'yyyy-MM-dd'))
        .lte('due_date', format(endOfMonth, 'yyyy-MM-dd'))
        .order('due_date');

      if (tasksError) {
        console.error('Error fetching tasks:', tasksError);
      }

      // Type color mapping
      const typeColors: Record<string, string> = {
        call: '#3b82f6',      // blue
        meeting: '#10b981',   // green
        demo: '#06b6d4',      // cyan
        task: '#f59e0b',      // orange
      };

      // Combine all sources
      const allEvents: CalendarEvent[] = [
        ...(calendarData || []),
        // Transform scheduled interactions
        ...(scheduledInteractions || []).map(interaction => ({
          id: interaction.id,
          user_id: interaction.user_id,
          title: interaction.subject,
          description: interaction.description,
          event_type: interaction.type as any,
          start_time: interaction.scheduled_at!,
          end_time: interaction.completed_at || new Date(new Date(interaction.scheduled_at!).getTime() + (interaction.duration_minutes || 60) * 60000).toISOString(),
          all_day: false,
          color: typeColors[interaction.type] || '#6b7280',
          location: null,
        })),
        // Transform tasks
        ...(tasks || []).map(task => ({
          id: task.id,
          user_id: task.user_id,
          title: `📋 ${task.subject}`,
          description: task.description,
          event_type: 'task' as any,
          start_time: task.due_date!,
          end_time: task.due_date!,
          all_day: true,
          color: typeColors.task,
          location: null,
          is_virtual: false,
          meeting_url: null,
        }))
      ];
      
      return allEvents as CalendarEvent[];
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
    let icsContent = 'BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//Dirq CRM//Calendar//EN\n';
    
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

  // Get events for selected day (mobile)
  const selectedDayEvents = calendarEvents.filter(event => 
    isSameDay(event.start, date)
  );

  // Get marked dates for HorizontalDatePicker (dates with events)
  const markedDates = calendarEvents.map(event => event.start);

  return (
    <AppLayout
      title="Activiteiten Agenda"
      subtitle="Beheer je sales meetings, demos en follow-ups in één overzicht"
      hideQuickAction={true}
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
          {isDesktop && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
            >
              <Download className="h-4 w-4 mr-2" />
              Exporteer
            </Button>
          )}
          <CreateEventDialog />
        </div>
      }
    >
      <div className="p-4 md:p-6 space-y-4">
        {/* Filters Panel */}
        {showFilters && (
          <CalendarFilters
            filters={filters}
            onChange={setFilters}
          />
        )}
        
        {/* Desktop: react-big-calendar with enhanced styling */}
        {isDesktop ? (
          <Card className="p-4 lg:p-6">
            {isLoading ? (
              <div className="flex items-center justify-center h-[600px]">
                <div className="animate-pulse text-muted-foreground">
                  Calendar laden...
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Custom Toolbar - Above calendar */}
                <div className="flex items-center justify-between pb-4 border-b">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleNavigate('PREV')}
                      className="h-9 w-9"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => handleNavigate('TODAY')}
                      className="h-9"
                    >
                      Vandaag
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleNavigate('NEXT')}
                      className="h-9 w-9"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  <div className="text-lg lg:text-xl font-semibold">
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

                {/* Calendar Grid */}
                <div style={{ height: '700px' }} className="calendar-professional">
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
                </div>
              </div>
            )}
          </Card>
        ) : (
          /* Mobile: HorizontalDatePicker + Day Events */
          <div className="space-y-4">
            <Card className="p-4">
              {isLoading ? (
                <div className="flex items-center justify-center h-32">
                  <div className="animate-pulse text-muted-foreground">
                    Calendar laden...
                  </div>
                </div>
              ) : (
                <HorizontalDatePicker
                  selectedDate={date}
                  onDateSelect={setDate}
                  markedDates={markedDates}
                />
              )}
            </Card>
            
            {/* Day Events */}
            <Card className="p-4">
              <div className="space-y-3">
                <h3 className="font-semibold text-lg">
                  {format(date, 'EEEE d MMMM', { locale: nl })}
                </h3>
                
                {selectedDayEvents.length === 0 ? (
                  <p className="text-muted-foreground text-sm py-8 text-center">
                    Geen events op deze dag
                  </p>
                ) : (
                  <div className="space-y-2">
                    {selectedDayEvents.map((event) => (
                      <button
                        key={event.id}
                        onClick={() => setSelectedEvent(event.resource)}
                        className={cn(
                          "w-full text-left p-3 rounded-lg border-l-4 bg-muted/50 hover:bg-muted transition-colors",
                        )}
                        style={{ borderLeftColor: event.resource.color }}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium truncate">{event.title}</h4>
                            {event.resource.description && (
                              <p className="text-sm text-muted-foreground line-clamp-1">
                                {event.resource.description}
                              </p>
                            )}
                          </div>
                          {!event.allDay && (
                            <span className="text-xs text-muted-foreground whitespace-nowrap">
                              {format(event.start, 'HH:mm')} - {format(event.end, 'HH:mm')}
                            </span>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </Card>
          </div>
        )}
      </div>
      
      {/* Floating Action Button - Mobile only */}
      {!isDesktop && (
        <div 
          className="fixed z-40 md:hidden"
          style={{
            right: '1rem',
            bottom: 'calc(5rem + env(safe-area-inset-bottom, 0px))',
          }}
        >
          <CreateEventDialog variant="fab" />
        </div>
      )}

      {/* Event Detail - Side Panel on Desktop, Dialog on Mobile */}
      {selectedEvent && (
        isDesktop ? (
          <SidePanel
            open={!!selectedEvent}
            onClose={() => setSelectedEvent(null)}
            title="Event Details"
            width="lg"
          >
            <EventDetailContent event={selectedEvent} onClose={() => setSelectedEvent(null)} />
          </SidePanel>
        ) : (
          <EventDetailDialog
            event={selectedEvent}
            open={!!selectedEvent}
            onOpenChange={(open) => {
              if (!open) setSelectedEvent(null);
            }}
          />
        )
      )}
    </AppLayout>
  );
}

// Helper component for Event Detail Content (reusable in both SidePanel and Dialog)
function EventDetailContent({ event, onClose }: { event: CalendarEvent; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const eventTypeConfig = {
    meeting: { label: 'Vergadering', color: 'bg-green-500' },
    call: { label: 'Telefoongesprek', color: 'bg-blue-500' },
    task: { label: 'Taak', color: 'bg-orange-500' },
    reminder: { label: 'Herinnering', color: 'bg-purple-500' },
    personal: { label: 'Persoonlijk', color: 'bg-gray-500' },
    training: { label: 'Training', color: 'bg-indigo-500' },
    demo: { label: 'Demo', color: 'bg-pink-500' },
    other: { label: 'Overig', color: 'bg-slate-500' },
  };

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('calendar_events')
        .delete()
        .eq('id', event.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar-events'] });
      toast.success('Event verwijderd');
      setShowDeleteDialog(false);
      onClose();
    },
    onError: (error: any) => {
      toast.error(`Fout bij verwijderen: ${error.message}`);
    },
  });

  const config = eventTypeConfig[event.event_type as keyof typeof eventTypeConfig] || eventTypeConfig.other;

  return (
    <>
      <div className="space-y-6">
        {/* Header with icon and badge */}
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-lg ${config.color}`}>
            <CalendarIcon className="h-5 w-5 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-semibold mb-1">{event.title}</h3>
            <Badge variant="secondary">{config.label}</Badge>
          </div>
        </div>

        {/* Time & Date Section */}
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <CalendarIcon className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div>
              <p className="text-sm font-medium text-muted-foreground">Datum</p>
              <p className="text-base">
                {format(new Date(event.start_time), 'EEEE d MMMM yyyy', { locale: nl })}
              </p>
            </div>
          </div>

          {!event.all_day && (
            <div className="flex items-start gap-3">
              <Clock className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Tijd</p>
                <p className="text-base">
                  {format(new Date(event.start_time), 'HH:mm', { locale: nl })}
                  {event.end_time && <> - {format(new Date(event.end_time), 'HH:mm', { locale: nl })}</>}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Location */}
        {event.location && (
          <div className="flex items-start gap-3">
            <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div>
              <p className="text-sm font-medium text-muted-foreground">Locatie</p>
              <p className="text-base">{event.location}</p>
            </div>
          </div>
        )}

        {/* Description */}
        {event.description && (
          <div className="border-t pt-4">
            <p className="text-sm font-medium text-muted-foreground mb-2">Beschrijving</p>
            <p className="text-base whitespace-pre-wrap">{event.description}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
          >
            <X className="h-4 w-4 mr-2" />
            Sluiten
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setShowDeleteDialog(true)}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Verwijderen
          </Button>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Weet je het zeker?</AlertDialogTitle>
            <AlertDialogDescription>
              Dit calendar event wordt permanent verwijderd. Deze actie kan niet ongedaan worden gemaakt.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuleren</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMutation.mutate()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? 'Verwijderen...' : 'Verwijderen'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
