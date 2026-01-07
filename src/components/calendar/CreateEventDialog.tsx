import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Plus } from 'lucide-react';

export function CreateEventDialog() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  const createMutation = useMutation({
    mutationFn: async (values: any) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase.from('calendar_events').insert({
        user_id: user.id,
        ...values,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar-events'] });
      toast({ title: 'Event aangemaakt', description: 'Het event is toegevoegd aan je kalender' });
      setOpen(false);
    },
    onError: (error: any) => {
      toast({ title: 'Fout', description: error.message, variant: 'destructive' });
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    // Extract form values
    const title = formData.get('title') as string;
    const event_type = formData.get('event_type') as string;
    const location = formData.get('location') as string;
    const description = formData.get('description') as string;
    const start_date = formData.get('start_date') as string;
    const start_time = formData.get('start_time') as string;
    const end_date = formData.get('end_date') as string;
    const end_time = formData.get('end_time') as string;

    // Combine date + time into ISO timestamps
    const start_datetime = start_time 
      ? new Date(`${start_date}T${start_time}`).toISOString()
      : new Date(`${start_date}T00:00:00`).toISOString();
    
    const end_datetime = end_date && end_time
      ? new Date(`${end_date}T${end_time}`).toISOString()
      : end_date
      ? new Date(`${end_date}T23:59:59`).toISOString()
      : new Date(new Date(start_datetime).getTime() + 3600000).toISOString(); // +1 hour default

    const values = {
      title,
      event_type,
      location: location || undefined,
      description: description || undefined,
      start_time: start_datetime,
      end_time: end_datetime,
    };

    createMutation.mutate(values);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Nieuwe Activiteit
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nieuwe Activiteit</DialogTitle>
          <DialogDescription>
            Maak een nieuwe kalenderafspraak aan
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Titel *</Label>
            <Input id="title" name="title" required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="event_type">Type *</Label>
            <Select name="event_type" required>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="meeting">Sales Meeting</SelectItem>
                <SelectItem value="call">Sales Call</SelectItem>
                <SelectItem value="demo">Product Demo</SelectItem>
                <SelectItem value="followup">Follow-up</SelectItem>
                <SelectItem value="deadline">Project Deadline</SelectItem>
                <SelectItem value="training">Training</SelectItem>
                <SelectItem value="personal">Persoonlijk</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start_date">Startdatum *</Label>
              <Input id="start_date" name="start_date" type="date" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="start_time">Starttijd</Label>
              <Input id="start_time" name="start_time" type="time" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="end_date">Einddatum</Label>
              <Input id="end_date" name="end_date" type="date" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end_time">Eindtijd</Label>
              <Input id="end_time" name="end_time" type="time" />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">Locatie</Label>
            <Input id="location" name="location" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Beschrijving</Label>
            <Textarea id="description" name="description" rows={3} />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Annuleren
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Opslaan...' : 'Opslaan'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
