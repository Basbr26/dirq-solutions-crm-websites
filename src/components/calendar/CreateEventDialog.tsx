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
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';

interface CreateEventDialogProps {
  /** Display as a Floating Action Button */
  variant?: 'default' | 'fab';
  /** Pre-fill start date (YYYY-MM-DD). Also auto-opens the dialog when set. */
  initialDate?: string;
  /** Controlled open state (no trigger button rendered when provided) */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
const MINUTES = ['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55'];

function TimeSelect({ value, onChange }: {
  value: string;
  onChange: (value: string) => void;
}) {
  const [h, m] = value ? value.split(':') : ['', ''];

  const setHour = (newH: string) => onChange(`${newH}:${m || '00'}`);
  const setMin = (newM: string) => onChange(`${h || '00'}:${newM}`);

  return (
    <div className="flex items-center gap-1">
      <Select value={h} onValueChange={setHour}>
        <SelectTrigger className="w-[68px]">
          <SelectValue placeholder="uu" />
        </SelectTrigger>
        <SelectContent className="max-h-48">
          {HOURS.map(hr => <SelectItem key={hr} value={hr}>{hr}</SelectItem>)}
        </SelectContent>
      </Select>
      <span className="text-muted-foreground font-semibold">:</span>
      <Select value={m} onValueChange={setMin}>
        <SelectTrigger className="w-[68px]">
          <SelectValue placeholder="mm" />
        </SelectTrigger>
        <SelectContent className="max-h-48">
          {MINUTES.map(min => <SelectItem key={min} value={min}>{min}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}

export function CreateEventDialog({ variant = 'default', initialDate, open: controlledOpen, onOpenChange: controlledOnOpenChange }: CreateEventDialogProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [internalOpen, setInternalOpen] = useState(false);
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');

  const isControlled = controlledOpen !== undefined;
  const isOpen = isControlled ? controlledOpen : internalOpen;

  const handleOpenChange = (value: boolean) => {
    if (!isControlled) setInternalOpen(value);
    controlledOnOpenChange?.(value);
    if (!value) {
      setStartTime('');
      setEndTime('');
    }
  };

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
      handleOpenChange(false);
    },
    onError: (error: any) => {
      toast({ title: 'Fout', description: error.message, variant: 'destructive' });
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    const title = formData.get('title') as string;
    const event_type = formData.get('event_type') as string;
    const location = formData.get('location') as string;
    const description = formData.get('description') as string;
    const start_date = formData.get('start_date') as string;
    const end_date = formData.get('end_date') as string;

    const start_datetime = startTime
      ? new Date(`${start_date}T${startTime}`).toISOString()
      : new Date(`${start_date}T00:00:00`).toISOString();

    const end_datetime = end_date && endTime
      ? new Date(`${end_date}T${endTime}`).toISOString()
      : end_date
      ? new Date(`${end_date}T23:59:59`).toISOString()
      : new Date(new Date(start_datetime).getTime() + 3600000).toISOString();

    createMutation.mutate({
      title,
      event_type,
      location: location || undefined,
      description: description || undefined,
      start_time: start_datetime,
      end_time: end_datetime,
    });
  };

  const formContent = (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="title">{t('common.title')} *</Label>
        <Input id="title" name="title" required />
      </div>

      <div className="space-y-2">
        <Label htmlFor="event_type">{t('common.type')} *</Label>
        <Select name="event_type" required>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="meeting">{t('calendar.types.meeting')}</SelectItem>
            <SelectItem value="call">{t('calendar.types.call')}</SelectItem>
            <SelectItem value="task">{t('calendar.types.task')}</SelectItem>
            <SelectItem value="reminder">{t('calendar.types.reminder')}</SelectItem>
            <SelectItem value="other">{t('calendar.types.other')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="start_date">{t('calendar.startDate')} *</Label>
          <Input
            id="start_date"
            name="start_date"
            type="date"
            required
            defaultValue={initialDate || ''}
          />
        </div>
        <div className="space-y-2">
          <Label>{t('calendar.startTime')}</Label>
          <TimeSelect value={startTime} onChange={setStartTime} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="end_date">{t('calendar.endDate')}</Label>
          <Input
            id="end_date"
            name="end_date"
            type="date"
            defaultValue={initialDate || ''}
          />
        </div>
        <div className="space-y-2">
          <Label>{t('calendar.endTime')}</Label>
          <TimeSelect value={endTime} onChange={setEndTime} />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="location">{t('calendar.location')}</Label>
        <Input id="location" name="location" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">{t('common.description')}</Label>
        <Textarea id="description" name="description" rows={3} />
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
          {t('common.cancel')}
        </Button>
        <Button type="submit" disabled={createMutation.isPending}>
          {createMutation.isPending ? t('common.saving') : t('common.save')}
        </Button>
      </div>
    </form>
  );

  const dialogBody = (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>{t('calendar.newActivity')}</DialogTitle>
        <DialogDescription>{t('calendar.newActivityDescription')}</DialogDescription>
      </DialogHeader>
      {formContent}
    </DialogContent>
  );

  // Controlled mode: no trigger button, opened externally (e.g. slot click)
  if (isControlled) {
    return (
      <Dialog open={isOpen} onOpenChange={handleOpenChange}>
        {dialogBody}
      </Dialog>
    );
  }

  // Default mode: has a trigger button
  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {variant === 'fab' ? (
          <Button
            className={cn(
              "h-14 w-14 rounded-full shadow-lg",
              "bg-primary hover:bg-primary/90",
              "flex items-center justify-center",
              "active:scale-95 transition-transform"
            )}
            aria-label={t('calendar.newActivity')}
          >
            <Plus className="h-6 w-6" />
          </Button>
        ) : (
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            {t('calendar.newActivity')}
          </Button>
        )}
      </DialogTrigger>
      {dialogBody}
    </Dialog>
  );
}
