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
  Building2,
  Mailbox,
  Video
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
import { useContact } from '@/features/contacts/hooks/useContacts';
import { useProjects, useProject } from '@/features/projects/hooks/useProjects';
import { useQuotes, useQuote } from '@/features/quotes/hooks/useQuotes';
import { useTranslation } from 'react-i18next';

interface AddInteractionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId?: string;
  contactId?: string;
  projectId?: string; // Support for project-specific interactions
  quoteId?: string; // Support for quote-specific interactions
  defaultType?: 'call' | 'email' | 'meeting' | 'note' | 'task' | 'demo' | 'physical_mail' | 'linkedin_video_audit';
}

export function AddInteractionDialog({
  open,
  onOpenChange,
  companyId,
  contactId,
  projectId,
  quoteId,
  defaultType = 'note',
}: AddInteractionDialogProps) {
  const { t } = useTranslation();
  const [isTask, setIsTask] = useState(defaultType === 'task');
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | undefined>(companyId);
  const [selectedProjectId, setSelectedProjectId] = useState<string | undefined>(projectId);
  const [selectedQuoteId, setSelectedQuoteId] = useState<string | undefined>(quoteId);
  const { companies: companiesData } = useCompanies({});
  
  // Auto-fetch related entities when IDs are provided
  const { data: contactData } = useContact(contactId || '');
  const { data: projectData } = useProject(projectId || '');
  const { data: quoteData } = useQuote(quoteId || '');
  
  // Determine the company_id for fetching related projects/quotes
  const effectiveCompanyId = companyId || contactData?.company_id;
  
  // Fetch projects and quotes for the company (for optional linking)
  const { projects: companyProjects } = useProjects(
    effectiveCompanyId ? { company_id: effectiveCompanyId } : undefined
  );
  const { quotes: companyQuotes } = useQuotes(
    effectiveCompanyId ? { company_id: effectiveCompanyId } : undefined
  );
  
  const interactionTypes = [
    { value: 'call', label: t('interactions.types.call'), icon: Phone, color: 'text-blue-500' },
    { value: 'email', label: t('interactions.types.email'), icon: Mail, color: 'text-purple-500' },
    { value: 'meeting', label: t('interactions.types.meeting'), icon: Calendar, color: 'text-green-500' },
    { value: 'note', label: t('interactions.types.note'), icon: FileText, color: 'text-gray-500' },
    { value: 'task', label: t('interactions.types.task'), icon: CheckSquare, color: 'text-orange-500' },
    { value: 'demo', label: t('interactions.types.demo'), icon: Presentation, color: 'text-teal-500' },
    { value: 'physical_mail', label: t('interactions.physicalMail'), icon: Mailbox, color: 'text-pink-500' },
    { value: 'linkedin_video_audit', label: t('interactions.linkedinVideoAudit'), icon: Video, color: 'text-red-500' },
  ];
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
    // Auto-populate company_id from various sources
    const finalCompanyId = companyId || 
      contactData?.company_id || 
      projectData?.company_id || 
      quoteData?.company_id || 
      selectedCompanyId;
    
    // Auto-populate contact_id from project or quote if not provided
    const finalContactId = contactId || 
      projectData?.contact_id || 
      quoteData?.contact_id;
    
    // Use selected project/quote or the ones passed as props
    const finalProjectId = selectedProjectId || projectId;
    const finalQuoteId = selectedQuoteId || quoteId;
    
    // Require companyId
    if (!finalCompanyId) {
      return;
    }

    const interactionData: CreateInteractionData = {
      company_id: finalCompanyId,
      contact_id: finalContactId,
      lead_id: finalProjectId, // Link to project if provided
      quote_id: finalQuoteId, // Link to quote if provided
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
        setSelectedProjectId(undefined);
        setSelectedQuoteId(undefined);
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
            {t('interactions.newActivity')}
          </DialogTitle>
          <DialogDescription>
            {t('interactions.newActivityDescription')}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Company Selection (only if no companyId prop provided) */}
          {!companyId && !contactId && (
            <div className="space-y-2">
              <Label htmlFor="company">{t('common.company')} *</Label>
              <Select value={selectedCompanyId} onValueChange={setSelectedCompanyId}>
                <SelectTrigger>
                  <SelectValue placeholder={t('companies.selectCompany')} />
                </SelectTrigger>
                <SelectContent>
                  {companiesData?.map((company: any) => (
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

          {/* Optional Project/Quote linking (when logging from contact or company) */}
          {!projectId && effectiveCompanyId && companyProjects && companyProjects.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="project">{t('projects.title')} ({t('common.optional')})</Label>
              <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                <SelectTrigger>
                  <SelectValue placeholder={t('projects.selectProject')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Geen deal</SelectItem>
                  {companyProjects.map((project: any) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {!quoteId && effectiveCompanyId && companyQuotes && companyQuotes.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="quote">{t('quotes.title')} ({t('common.optional')})</Label>
              <Select value={selectedQuoteId} onValueChange={setSelectedQuoteId}>
                <SelectTrigger>
                  <SelectValue placeholder={t('quotes.selectQuote')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Geen offerte</SelectItem>
                  {companyQuotes.map((quote: any) => (
                    <SelectItem key={quote.id} value={quote.id}>
                      {quote.quote_number} - {quote.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Type Selection */}
          <div className="space-y-2">
            <Label htmlFor="type">{t('common.type')} *</Label>
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
              <Label htmlFor="direction">{t('interactions.direction')}</Label>
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
                      {t('interactions.outbound')}
                    </div>
                  </SelectItem>
                  <SelectItem value="inbound">
                    <div className="flex items-center gap-2">
                      <ArrowDownCircle className="h-4 w-4 text-blue-500" />
                      {t('interactions.inbound')}
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Subject */}
          <div className="space-y-2">
            <Label htmlFor="subject">{t('common.subject')} *</Label>
            <Input
              id="subject"
              placeholder={t('interactions.subjectPlaceholder')}
              {...register('subject', { required: t('interactions.subjectRequired') })}
            />
            {errors.subject && (
              <p className="text-sm text-destructive">{errors.subject.message}</p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">{t('common.description')}</Label>
            <Textarea
              id="description"
              placeholder={t('interactions.descriptionPlaceholder')}
              rows={4}
              {...register('description')}
            />
          </div>

          {/* Duration (for calls and meetings) */}
          {(selectedType === 'call' || selectedType === 'meeting') && (
            <div className="space-y-2">
              <Label htmlFor="duration_minutes" className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                {t('interactions.duration')}
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
              <Label htmlFor="scheduled_at">{t('interactions.scheduledAt')}</Label>
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
              {t('interactions.makeTask')}
            </Label>
          </div>

          {/* Due Date (for tasks) */}
          {isTask && (
            <div className="space-y-2">
              <Label htmlFor="due_date">{t('interactions.dueDate')}</Label>
              <Input
                id="due_date"
                type="date"
                {...register('due_date')}
              />
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={createInteraction.isPending}>
              {createInteraction.isPending ? t('common.saving') : t('common.save')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
