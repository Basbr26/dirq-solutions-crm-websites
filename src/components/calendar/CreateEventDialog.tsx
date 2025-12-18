import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';

interface CreateEventDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const eventTypes = [
  { value: 'meeting', label: 'Meeting', color: '#3B82F6' },
  { value: 'task', label: 'Taak', color: '#F59E0B' },
  { value: 'training', label: 'Training', color: '#8B5CF6' },
  { value: 'review', label: 'Review', color: '#6366F1' },
  { value: 'deadline', label: 'Deadline', color: '#EF4444' },
  { value: 'other', label: 'Overig', color: '#6B7280' },
];

export function CreateEventDialog({ open, onClose, onSuccess }: CreateEventDialogProps) {
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [eventType, setEventType] = useState('meeting');
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endDate, setEndDate] = useState('');
  const [endTime, setEndTime] = useState('10:00');
  const [allDay, setAllDay] = useState(false);
  const [location, setLocation] = useState('');
  const [isVirtual, setIsVirtual] = useState(false);
  const [meetingUrl, setMeetingUrl] = useState('');

  const createEvent = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not authenticated');
      
      const selectedType = eventTypes.find(t => t.value === eventType);
      
      const startDateTime = allDay 
        ? `${startDate}T00:00:00`
        : `${startDate}T${startTime}:00`;
      
      const endDateTime = allDay
        ? `${endDate || startDate}T23:59:59`
        : `${endDate || startDate}T${endTime}:00`;

      const { data, error } = await supabase
        .from('calendar_events')
        .insert({
          user_id: user.id,
          title,
          description: description || null,
          event_type: eventType,
          start_time: startDateTime,
          end_time: endDateTime,
          all_day: allDay,
          color: selectedType?.color || '#3B82F6',
          location: location || null,
          is_virtual: isVirtual,
          meeting_url: meetingUrl || null,
          created_by: user.id
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      // Reset form
      setTitle('');
      setDescription('');
      setEventType('meeting');
      setStartDate('');
      setStartTime('09:00');
      setEndDate('');
      setEndTime('10:00');
      setAllDay(false);
      setLocation('');
      setIsVirtual(false);
      setMeetingUrl('');
      
      onSuccess();
    },
    onError: (error: any) => {
      console.error('Error creating event:', error);
      toast.error('Fout bij aanmaken event: ' + error.message);
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title || !startDate) {
      toast.error('Titel en startdatum zijn verplicht');
      return;
    }
    
    createEvent.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nieuw Event</DialogTitle>
          <DialogDescription>
            Maak een nieuwe afspraak of taak aan in je agenda
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Titel *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="bijv. Team Meeting"
              required
            />
          </div>

          {/* Event Type */}
          <div className="space-y-2">
            <Label htmlFor="type">Type</Label>
            <Select value={eventType} onValueChange={setEventType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {eventTypes.map(type => (
                  <SelectItem key={type.value} value={type.value}>
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: type.color }}
                      />
                      {type.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* All Day Switch */}
          <div className="flex items-center justify-between">
            <Label htmlFor="all-day">Hele dag</Label>
            <Switch
              id="all-day"
              checked={allDay}
              onCheckedChange={setAllDay}
            />
          </div>

          {/* Start Date/Time */}
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-2">
              <Label htmlFor="start-date">Startdatum *</Label>
              <Input
                id="start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
              />
            </div>
            {!allDay && (
              <div className="space-y-2">
                <Label htmlFor="start-time">Starttijd</Label>
                <Input
                  id="start-time"
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                />
              </div>
            )}
          </div>

          {/* End Date/Time */}
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-2">
              <Label htmlFor="end-date">Einddatum</Label>
              <Input
                id="end-date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            {!allDay && (
              <div className="space-y-2">
                <Label htmlFor="end-time">Eindtijd</Label>
                <Input
                  id="end-time"
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                />
              </div>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Beschrijving</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optionele beschrijving"
              rows={3}
            />
          </div>

          {/* Location */}
          <div className="space-y-2">
            <Label htmlFor="location">Locatie</Label>
            <Input
              id="location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="bijv. Vergaderruimte A"
            />
          </div>

          {/* Virtual Meeting */}
          <div className="flex items-center justify-between">
            <Label htmlFor="virtual">Virtuele meeting</Label>
            <Switch
              id="virtual"
              checked={isVirtual}
              onCheckedChange={setIsVirtual}
            />
          </div>

          {isVirtual && (
            <div className="space-y-2">
              <Label htmlFor="meeting-url">Meeting URL</Label>
              <Input
                id="meeting-url"
                type="url"
                value={meetingUrl}
                onChange={(e) => setMeetingUrl(e.target.value)}
                placeholder="https://teams.microsoft.com/..."
              />
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={createEvent.isPending}
            >
              Annuleren
            </Button>
            <Button type="submit" disabled={createEvent.isPending}>
              {createEvent.isPending ? 'Aanmaken...' : 'Aanmaken'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
