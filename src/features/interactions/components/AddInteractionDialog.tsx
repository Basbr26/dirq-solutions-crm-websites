import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { format } from 'date-fns';
import { 
  Phone, 
  Mail, 
  Calendar, 
  FileText, 
  CheckSquare, 
  Presentation,
  Clock,
  ArrowDownCircle,
  ArrowUpCircle,
  Building2
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
import { useCreateInteraction, CreateInteractionData } from '../hooks/useInteractions';
import { useCompanies } from '@/features/companies/hooks/useCompanies';

interface AddInteractionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId?: string;
  contactId?: string;
  defaultType?: 'call' | 'email' | 'meeting' | 'note' | 'task' | 'demo';
}

const interactionTypes = [
  { value: 'call', label: 'Telefoongesprek', icon: Phone, color: 'text-blue-500' },
  { value: 'email', label: 'E-mail', icon: Mail, color: 'text-purple-500' },
  { value: 'meeting', label: 'Vergadering', icon: Calendar, color: 'text-green-500' },
  { value: 'note', label: 'Notitie', icon: FileText, color: 'text-gray-500' },
  { value: 'task', label: 'Taak', icon: CheckSquare, color: 'text-orange-500' },
  { value: 'demo', label: 'Demo', icon: Presentation, color: 'text-teal-500' },
];

export function AddInteractionDialog({
  open,
  onOpenChange,
  companyId,
  contactId,
  defaultType = 'note',
}: AddInteractionDialogProps) {
  const [isTask, setIsTask] = useState(defaultType === 'task');
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | undefined>(companyId);
  const { data: companiesData } = useCompanies({});
  const { register, handleSubmit, watch, setValue, reset, formState: { errors } } = useForm({
    defaultValues: {
      type: defaultType,
      direction: 'outbound' as 'inbound' | 'outbound',
      subject: '',
      description: '',
      duration_minutes: '',
      scheduled_at: '',
      due_date: '',
    },
  });

  const createInteraction = useCreateInteraction();
  const selectedType = watch('type');

  // Update form when dialog opens with new defaultType
  useEffect(() => {
    if (open) {
      setValue('type', defaultType);
      setIsTask(defaultType === 'task');
    }
  }, [open, defaultType, setValue]);

  const onSubmit = async (data: any) => {
    // Use either the prop companyId or the selected one from the dropdown
    const finalCompanyId = companyId || selectedCompanyId;
    
    // Require companyId if neither is set
    if (!finalCompanyId) {
      return;
    }

    const interactionData: CreateInteractionData = {
      company_id: finalCompanyId,
      contact_id: contactId,
      type: data.type,
      subject: data.subject,
      description: data.description || undefined,
      is_task: isTask,
    };

    // Add direction for calls/emails
    if (data.type === 'call' || data.type === 'email') {
      interactionData.direction = data.direction;
    }

    // Add duration for calls/meetings
    if (data.duration_minutes && (data.type === 'call' || data.type === 'meeting')) {
      interactionData.duration_minutes = parseInt(data.duration_minutes);
    }

    // Add scheduled_at for meetings
    if (data.scheduled_at && data.type === 'meeting') {
      interactionData.scheduled_at = new Date(data.scheduled_at).toISOString();
    }

    // Add task-specific fields
    if (isTask) {
      interactionData.task_status = 'pending';
      if (data.due_date) {
        interactionData.due_date = new Date(data.due_date).toISOString();
      }
    }

    createInteraction.mutate(interactionData, {
      onSuccess: () => {
        reset();
        setIsTask(false);
        onOpenChange(false);
      },
    });
  };

  const handleTypeChange = (value: string) => {
    setValue('type', value as any);
    if (value === 'task') {
      setIsTask(true);
    }
  };

  const selectedTypeConfig = interactionTypes.find(t => t.value === selectedType);
  const Icon = selectedTypeConfig?.icon || FileText;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] sm:max-w-[600px] h-[95vh] sm:h-auto max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icon className={`h-5 w-5 ${selectedTypeConfig?.color}`} />
            Nieuwe Activiteit
          </DialogTitle>
          <DialogDescription>
            Registreer een interactie of maak een taak aan
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Company Selection (only if no companyId prop provided) */}
          {!companyId && (
            <div className="space-y-2">
              <Label htmlFor="company">Bedrijf *</Label>
              <Select value={selectedCompanyId} onValueChange={setSelectedCompanyId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecteer een bedrijf..." />
                </SelectTrigger>
                <SelectContent>
                  {companiesData?.companies?.map((company) => (
                    <SelectItem key={company.id} value={company.id}>
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        {company.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Type Selection */}
          <div className="space-y-2">
            <Label htmlFor="type">Type *</Label>
            <Select value={selectedType} onValueChange={handleTypeChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {interactionTypes.map((type) => {
                  const TypeIcon = type.icon;
                  return (
                    <SelectItem key={type.value} value={type.value}>
                      <div className="flex items-center gap-2">
                        <TypeIcon className={`h-4 w-4 ${type.color}`} />
                        {type.label}
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          {/* Direction (for calls and emails) */}
          {(selectedType === 'call' || selectedType === 'email') && (
            <div className="space-y-2">
              <Label htmlFor="direction">Richting</Label>
              <Select 
                value={watch('direction')} 
                onValueChange={(value) => setValue('direction', value as any)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="outbound">
                    <div className="flex items-center gap-2">
                      <ArrowUpCircle className="h-4 w-4 text-green-500" />
                      Uitgaand
                    </div>
                  </SelectItem>
                  <SelectItem value="inbound">
                    <div className="flex items-center gap-2">
                      <ArrowDownCircle className="h-4 w-4 text-blue-500" />
                      Inkomend
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Subject */}
          <div className="space-y-2">
            <Label htmlFor="subject">Onderwerp *</Label>
            <Input
              id="subject"
              placeholder="Korte beschrijving van de activiteit"
              {...register('subject', { required: 'Onderwerp is verplicht' })}
            />
            {errors.subject && (
              <p className="text-sm text-destructive">{errors.subject.message}</p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Beschrijving</Label>
            <Textarea
              id="description"
              placeholder="Gedetailleerde notities..."
              rows={4}
              {...register('description')}
            />
          </div>

          {/* Duration (for calls and meetings) */}
          {(selectedType === 'call' || selectedType === 'meeting') && (
            <div className="space-y-2">
              <Label htmlFor="duration_minutes" className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Duur (minuten)
              </Label>
              <Input
                id="duration_minutes"
                type="number"
                min="1"
                placeholder="30"
                {...register('duration_minutes')}
              />
            </div>
          )}

          {/* Scheduled At (for meetings) */}
          {selectedType === 'meeting' && (
            <div className="space-y-2">
              <Label htmlFor="scheduled_at">Gepland op</Label>
              <Input
                id="scheduled_at"
                type="datetime-local"
                {...register('scheduled_at')}
              />
            </div>
          )}

          {/* Task Toggle */}
          <div className="flex items-center space-x-2">
            <Switch
              id="is-task"
              checked={isTask}
              onCheckedChange={setIsTask}
            />
            <Label htmlFor="is-task" className="cursor-pointer">
              Maak dit een taak (opvolging vereist)
            </Label>
          </div>

          {/* Due Date (for tasks) */}
          {isTask && (
            <div className="space-y-2">
              <Label htmlFor="due_date">Vervaldatum</Label>
              <Input
                id="due_date"
                type="date"
                {...register('due_date')}
              />
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuleren
            </Button>
            <Button type="submit" disabled={createInteraction.isPending}>
              {createInteraction.isPending ? 'Opslaan...' : 'Opslaan'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
