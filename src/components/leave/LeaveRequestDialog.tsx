import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format, differenceInBusinessDays, addDays } from 'date-fns';
import { nl } from 'date-fns/locale';
import { CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

interface LeaveRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const leaveTypes = [
  { value: 'vakantie', label: 'Vakantie' },
  { value: 'adv', label: 'ADV' },
  { value: 'bijzonder', label: 'Bijzonder verlof' },
  { value: 'onbetaald', label: 'Onbetaald verlof' },
  { value: 'ouderschaps', label: 'Ouderschapsverlof' },
  { value: 'zwangerschaps', label: 'Zwangerschapsverlof' },
];

export function LeaveRequestDialog({ open, onOpenChange, onSuccess }: LeaveRequestDialogProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [leaveType, setLeaveType] = useState<string>('vakantie');
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [reason, setReason] = useState('');

  const calculateDays = () => {
    if (!startDate || !endDate) return 0;
    // Calculate business days (excluding weekends)
    const days = differenceInBusinessDays(addDays(endDate, 1), startDate);
    return Math.max(days, 1);
  };

  const handleSubmit = async () => {
    if (!user || !startDate || !endDate) {
      toast.error('Vul alle verplichte velden in');
      return;
    }

    if (endDate < startDate) {
      toast.error('Einddatum moet na startdatum liggen');
      return;
    }

    setLoading(true);
    try {
      const days = calculateDays();

      const { error } = await supabase
        .from('leave_requests')
        .insert([{
          employee_id: user.id,
          leave_type: leaveType as 'vakantie' | 'adv' | 'bijzonder' | 'onbetaald' | 'ouderschaps' | 'zwangerschaps',
          start_date: format(startDate, 'yyyy-MM-dd'),
          end_date: format(endDate, 'yyyy-MM-dd'),
          days,
          reason: reason || null,
          status: 'pending' as const,
        }]);

      if (error) throw error;

      // Reset form
      setLeaveType('vakantie');
      setStartDate(undefined);
      setEndDate(undefined);
      setReason('');
      
      onSuccess();
    } catch (error) {
      console.error('Error submitting leave request:', error);
      toast.error('Fout bij indienen verlofaanvraag');
    } finally {
      setLoading(false);
    }
  };

  const days = calculateDays();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>Verlof aanvragen</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 py-4">
          <div className="space-y-2">
            <Label>Type verlof *</Label>
            <Select value={leaveType} onValueChange={setLeaveType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {leaveTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Startdatum *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !startDate && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, 'd MMM yyyy', { locale: nl }) : 'Selecteer'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={setStartDate}
                    initialFocus
                    disabled={(date) => date < new Date()}
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>Einddatum *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !endDate && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate ? format(endDate, 'd MMM yyyy', { locale: nl }) : 'Selecteer'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={setEndDate}
                    initialFocus
                    disabled={(date) => date < (startDate || new Date())}
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {startDate && endDate && (
            <div className="p-3 bg-muted rounded-lg text-center">
              <span className="text-2xl font-bold text-primary">{days}</span>
              <span className="text-muted-foreground ml-2">
                {days === 1 ? 'werkdag' : 'werkdagen'}
              </span>
            </div>
          )}

          <div className="space-y-2">
            <Label>Reden (optioneel)</Label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Eventuele toelichting..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter className="flex-shrink-0 flex-col-reverse sm:flex-row gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Annuleren
          </Button>
          <Button onClick={handleSubmit} disabled={loading || !startDate || !endDate}>
            {loading ? 'Bezig...' : 'Aanvraag indienen'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
