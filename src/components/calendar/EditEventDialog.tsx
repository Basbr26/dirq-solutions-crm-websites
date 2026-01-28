import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { updateGoogleCalendarEvent } from '@/lib/googleCalendar';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Pencil } from 'lucide-react';
import { logger } from '@/lib/logger';

interface EditEventDialogProps {
  event: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditEventDialog({ event, open, onOpenChange }: EditEventDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    title: event.title || '',
    event_type: event.event_type || 'meeting',
    location: event.location || '',
    description: event.description || '',
    start_date: event.start_time ? new Date(event.start_time).toISOString().split('T')[0] : '',
    start_time: event.start_time ? new Date(event.start_time).toISOString().split('T')[1].substring(0, 5) : '',
    end_date: event.end_time ? new Date(event.end_time).toISOString().split('T')[0] : '',
    end_time: event.end_time ? new Date(event.end_time).toISOString().split('T')[1].substring(0, 5) : '',
  });

  const updateMutation = useMutation({
    mutationFn: async (values: any) => {
      // If it's a Google Calendar event, update in Google first
      if (event.google_event_id) {
        const googleEventData = {
          summary: values.title,
          description: values.description || '',
          location: values.location || '',
          start: {
            dateTime: values.start_datetime,
            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          },
          end: {
            dateTime: values.end_datetime,
            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          },
        };

        try {
          await updateGoogleCalendarEvent(event.google_event_id, googleEventData);
        } catch (error) {
          logger.error('Failed to update Google Calendar event', { eventId: event.google_event_id, error });
          throw new Error('Kon event niet bijwerken in Google Calendar. Zorg dat je bent ingelogd.');
        }
      }

      // Update in local database
      const { error } = await supabase
        .from('calendar_events')
        .update({
          title: values.title,
          event_type: values.event_type,
          location: values.location,
          description: values.description,
          start_time: values.start_datetime,
          end_time: values.end_datetime,
        })
        .eq('id', event.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar-events'] });
      toast({ 
        title: 'Event bijgewerkt', 
        description: event.google_event_id 
          ? 'Het event is bijgewerkt in je kalender en Google Calendar' 
          : 'Het event is bijgewerkt in je kalender' 
      });
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({ 
        title: 'Fout', 
        description: error.message || 'Er is een fout opgetreden bij het bijwerken van het event', 
        variant: 'destructive' 
      });
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    const { title, event_type, location, description, start_date, start_time, end_date, end_time } = formData;

    // Combine date + time into ISO timestamps
    const start_datetime = start_time 
      ? new Date(`${start_date}T${start_time}`).toISOString()
      : new Date(`${start_date}T00:00:00`).toISOString();
    
    const end_datetime = end_date && end_time
      ? new Date(`${end_date}T${end_time}`).toISOString()
      : end_date
        ? new Date(`${end_date}T23:59:59`).toISOString()
        : new Date(new Date(start_datetime).getTime() + 60 * 60 * 1000).toISOString(); // +1 hour default

    updateMutation.mutate({
      title,
      event_type,
      location,
      description,
      start_datetime,
      end_datetime,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="h-5 w-5" />
            Event bewerken
          </DialogTitle>
          <DialogDescription>
            {event.google_event_id 
              ? 'Dit event is gesynchroniseerd met Google Calendar. Wijzigingen worden ook daar doorgevoerd.'
              : 'Pas de gegevens van dit event aan.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Titel *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Vergadering met klant"
              required
            />
          </div>

          {/* Event Type */}
          <div className="space-y-2">
            <Label htmlFor="event_type">Type *</Label>
            <Select 
              value={formData.event_type}
              onValueChange={(value) => setFormData({ ...formData, event_type: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="meeting">Vergadering</SelectItem>
                <SelectItem value="call">Telefoongesprek</SelectItem>
                <SelectItem value="task">Taak</SelectItem>
                <SelectItem value="reminder">Herinnering</SelectItem>
                <SelectItem value="personal">Persoonlijk</SelectItem>
                <SelectItem value="training">Training</SelectItem>
                <SelectItem value="demo">Demo</SelectItem>
                <SelectItem value="other">Overig</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Location */}
          <div className="space-y-2">
            <Label htmlFor="location">Locatie</Label>
            <Input
              id="location"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              placeholder="Kantoor, online, etc."
            />
          </div>

          {/* Start Date & Time */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start_date">Startdatum *</Label>
              <Input
                id="start_date"
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="start_time">Starttijd</Label>
              <Input
                id="start_time"
                type="time"
                value={formData.start_time}
                onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
              />
            </div>
          </div>

          {/* End Date & Time */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="end_date">Einddatum</Label>
              <Input
                id="end_date"
                type="date"
                value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end_time">Eindtijd</Label>
              <Input
                id="end_time"
                type="time"
                value={formData.end_time}
                onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
              />
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Beschrijving</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Extra details over dit event..."
              rows={4}
            />
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={updateMutation.isPending}
            >
              Annuleren
            </Button>
            <Button type="submit" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? 'Bijwerken...' : 'Event bijwerken'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
