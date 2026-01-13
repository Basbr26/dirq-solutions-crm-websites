/**
 * ProjectForm Component
 * Reusable form for creating/editing projects
 */

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Project, CreateProjectInput, ProjectType } from '@/types/projects';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useCompanies } from '@/features/companies/hooks/useCompanies';
import { useContacts } from '@/features/contacts/hooks/useContacts';
import { Loader2 } from 'lucide-react';

const projectFormSchema = z.object({
  company_id: z.string().uuid('Selecteer een bedrijf'),
  contact_id: z.string().uuid('Selecteer een contactpersoon').optional().or(z.literal('')),
  title: z.string().min(1, 'Titel is verplicht'),
  description: z.string().optional(),
  project_type: z.enum(['landing_page', 'corporate_website', 'ecommerce', 'web_app', 'blog', 'portfolio', 'custom', 'ai_automation']).optional(),
  value: z.number().min(0, 'Waarde moet positief zijn').default(0),
  expected_close_date: z.string().optional(),
  notes: z.string().optional(),
  // v2.0 Finance fields
  package_id: z.enum(['finance_starter', 'finance_growth']).optional(),
  selected_addons: z.array(z.enum(['addon_logo', 'addon_rush', 'addon_page'])).optional(),
  monthly_recurring_revenue: z.number().min(0, 'MRR moet positief zijn').optional(),
});

type ProjectFormData = z.infer<typeof projectFormSchema>;

const packageLabels: Record<string, string> = {
  finance_starter: 'Finance Starter',
  finance_growth: 'Finance Growth',
};

const addonLabels: Record<string, string> = {
  addon_logo: 'Logo Design',
  addon_rush: 'Rush Levering (48u)',
  addon_page: 'Extra Pagina',
};

const projectTypeLabels: Record<ProjectType, string> = {
  landing_page: 'Landing Page',
  corporate_website: 'Bedrijfswebsite',
  ecommerce: 'Webshop',
  web_app: 'Web Applicatie',
  blog: 'Blog',
  portfolio: 'Portfolio',
  custom: 'Custom',
  ai_automation: 'AI Automatisering',
};

interface ProjectFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project?: Project;
  onSubmit: (data: CreateProjectInput) => void;
  isLoading?: boolean;
}

export function ProjectForm({ open, onOpenChange, project, onSubmit, isLoading }: ProjectFormProps) {
  const { companies: companiesData } = useCompanies();
  const { toast } = useToast();
  
  const form = useForm<ProjectFormData>({
    resolver: zodResolver(projectFormSchema),
    defaultValues: {
      company_id: '',
      contact_id: '',
      title: '',
      description: '',
      project_type: undefined,
      value: 0,
      expected_close_date: '',
      notes: '',
      // v2.0 fields
      package_id: undefined,
      selected_addons: [],
      monthly_recurring_revenue: undefined,
    },
  });

  const selectedCompanyId = form.watch('company_id');
  
  const { contacts: contactsData } = useContacts({
    companyId: selectedCompanyId || undefined,
  });

  useEffect(() => {
    if (!open) {
      form.reset();
    } else if (project) {
      form.reset({
        company_id: project.company_id,
        contact_id: project.contact_id || '',
        title: project.title,
        description: project.description || '',
        project_type: project.project_type,
        value: project.value,
        expected_close_date: project.expected_close_date || '',
        notes: project.notes || '',
        // v2.0 fields
        package_id: project.package_id,
        selected_addons: project.selected_addons || [],
        monthly_recurring_revenue: project.monthly_recurring_revenue,
      });
    }
  }, [open, project, form]);

  const handleSubmit = (data: ProjectFormData) => {
    if (!data.company_id) {
      toast({
        title: 'Fout',
        description: 'Bedrijf is verplicht',
        variant: 'destructive',
      });
      return;
    }
    
    const submitData: CreateProjectInput = {
      title: data.title || '',
      description: data.description || '',
      company_id: data.company_id,
      contact_id: data.contact_id || undefined,
      project_type: data.project_type,
      value: data.value,
      expected_close_date: data.expected_close_date || undefined,
      notes: data.notes,
      // v2.0 fields
      package_id: data.package_id,
      selected_addons: data.selected_addons,
      monthly_recurring_revenue: data.monthly_recurring_revenue,
    };
    onSubmit(submitData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-2xl h-[95vh] sm:h-auto max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{project ? 'Project Bewerken' : 'Nieuw Project'}</DialogTitle>
          <DialogDescription>
            Vul de gegevens in voor het project
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            {/* Basic Info */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Algemene Informatie</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="company_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bedrijf *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecteer bedrijf" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {companiesData.map((company: any) => (
                            <SelectItem key={company.id} value={company.id}>
                              {company.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="contact_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contactpersoon</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        value={field.value}
                        disabled={!selectedCompanyId}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecteer contactpersoon" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {contactsData.map((contact: any) => (
                            <SelectItem key={contact.id} value={contact.id}>
                              {contact.first_name} {contact.last_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Titel *</FormLabel>
                    <FormControl>
                      <Input placeholder="Website ontwikkeling" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Beschrijving</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Korte beschrijving van het project"
                        rows={3}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="project_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Project Type</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecteer type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {Object.entries(projectTypeLabels).map(([value, label]) => (
                            <SelectItem key={value} value={value}>
                              {label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="value"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Waarde (€) *</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          min="0"
                          step="0.01"
                          placeholder="5000"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormDescription>
                        Verwachte projectwaarde
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="expected_close_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Verwachte Afrondingsdatum</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormDescription>
                      Wanneer verwacht je de deal te sluiten?
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* v2.0 Finance Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Finance (v2.0)</h3>
              <p className="text-sm text-muted-foreground">
                Optionele finance tracking voor maandelijkse omzet
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="package_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Finance Pakket</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecteer pakket" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {Object.entries(packageLabels).map(([value, label]) => (
                            <SelectItem key={value} value={value}>
                              {label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Gekozen finance pakket
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="monthly_recurring_revenue"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Maandelijkse Omzet (€)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          min="0"
                          step="0.01"
                          placeholder="49.00"
                          {...field}
                          onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                          value={field.value || ''}
                        />
                      </FormControl>
                      <FormDescription>
                        MRR voor dit project
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="selected_addons"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Geselecteerde Add-ons</FormLabel>
                    <div className="space-y-2">
                      {Object.entries(addonLabels).map(([value, label]) => (
                        <div key={value} className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id={value}
                            checked={field.value?.includes(value as any)}
                            onChange={(e) => {
                              const currentValues = field.value || [];
                              if (e.target.checked) {
                                field.onChange([...currentValues, value]);
                              } else {
                                field.onChange(currentValues.filter((v: string) => v !== value));
                              }
                            }}
                            className="h-4 w-4 rounded border-gray-300"
                          />
                          <label htmlFor={value} className="text-sm cursor-pointer">
                            {label}
                          </label>
                        </div>
                      ))}
                    </div>
                    <FormDescription>
                      Extra opties voor dit project
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Notes */}
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notities</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Extra opmerkingen over dit project"
                        rows={3}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isLoading}
              >
                Annuleren
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {project ? 'Opslaan' : 'Aanmaken'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
