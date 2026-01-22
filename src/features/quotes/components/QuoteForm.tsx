/**
 * QuoteForm Component
 * Reusable form for creating/editing quotes
 */

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Quote, CreateQuoteInput } from '@/types/quotes';
import { 
  generateFinanceStarterQuote, 
  generateFinanceGrowthQuote,
  type QuoteTemplateData 
} from '@/features/quotes/templates/financeQuoteTemplates';
import { format, addDays } from 'date-fns';
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
import { useProjects } from '@/features/projects/hooks/useProjects';
import { ContactForm } from '@/features/contacts/components/ContactForm';
import { Loader2, Plus, Trash2, UserPlus } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const quoteItemSchema = z.object({
  title: z.string().min(1, 'Titel is verplicht'),
  description: z.string().optional(),
  quantity: z.number().min(1, 'Minimaal 1').default(1),
  unit_price: z.number().min(0, 'Prijs moet positief zijn').default(0),
  category: z.string().optional(),
});

const quoteFormSchema = z.object({
  company_id: z.string().uuid('Selecteer een bedrijf'),
  contact_id: z.string().uuid('Selecteer een contactpersoon').optional().or(z.literal('')),
  project_id: z.string().uuid('Selecteer een project').optional().or(z.literal('')),
  title: z.string().min(1, 'Titel is verplicht'),
  description: z.string().optional(),
  tax_rate: z.number().min(0).max(100).default(21),
  valid_until: z.string().optional(),
  payment_terms: z.string().optional(),
  delivery_time: z.string().optional(),
  notes: z.string().optional(),
  items: z.array(quoteItemSchema).min(1, 'Minimaal 1 regel item'),
});

type QuoteFormData = z.infer<typeof quoteFormSchema>;

interface QuoteFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quote?: Quote;
  onSubmit: (data: CreateQuoteInput) => void;
  isLoading?: boolean;
  defaultCompanyId?: string;
  defaultContactId?: string;
}

export function QuoteForm({ 
  open, 
  onOpenChange, 
  quote, 
  onSubmit, 
  isLoading,
  defaultCompanyId,
  defaultContactId,
}: QuoteFormProps) {
  const { t } = useTranslation();
  const { companies: companiesData } = useCompanies();
  const queryClient = useQueryClient();
  const [createContactDialogOpen, setCreateContactDialogOpen] = useState(false);
  
  const form = useForm<QuoteFormData>({
    resolver: zodResolver(quoteFormSchema),
    defaultValues: {
      company_id: defaultCompanyId || '',
      contact_id: defaultContactId || '',
      project_id: '',
      title: '',
      description: '',
      tax_rate: 21,
      valid_until: '',
      payment_terms: '30 dagen',
      delivery_time: '4-6 weken',
      notes: '',
      items: [
        {
          title: '',
          description: '',
          quantity: 1,
          unit_price: 0,
          category: '',
        },
      ],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'items',
  });

  const selectedCompanyId = form.watch('company_id');
  
  // Fetch contacts for selected company
  const { contacts: contactsData } = useContacts({
    companyId: selectedCompanyId || undefined,
  });
  
  // Fetch projects for selected company
  const { projects: projectsData } = useProjects({
    company_id: selectedCompanyId || undefined,
  });

  // Create contact mutation
  const createContact = useMutation({
    mutationFn: async (contactData: any) => {
      const { data, error } = await supabase
        .from('contacts')
        .insert([contactData])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (newContact) => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      toast.success('Contact succesvol aangemaakt');
      setCreateContactDialogOpen(false);
      // Set the newly created contact as selected
      form.setValue('contact_id', newContact.id);
    },
    onError: (error: any) => {
      toast.error(t('errors.errorCreatingContact', { message: error.message }));
    },
  });

  const handleCreateContact = async (contactData: any) => {
    await createContact.mutateAsync({
      ...contactData,
      company_id: selectedCompanyId,
    });
  };

  // Apply Finance template
  const applyFinanceTemplate = async (templateType: 'starter' | 'growth') => {
    if (!selectedCompanyId) {
      toast.error(t('forms.selectCompanyFirst'));
      return;
    }

    // Get company data
    const company = companiesData.find((c: any) => c.id === selectedCompanyId);
    if (!company) return;

    // Get contact data if selected
    const selectedContactId = form.watch('contact_id');
    const contact = selectedContactId 
      ? contactsData.find((c: any) => c.id === selectedContactId)
      : undefined;

    // Prepare template data
    const templateData: QuoteTemplateData = {
      companyName: company.name,
      companyAddress: company.address?.street,
      companyCity: company.address?.city,
      companyPostalCode: company.address?.postal_code,
      companyKvk: company.kvk_number,
      companyVat: undefined, // Not in Company type yet
      contactFirstName: contact?.first_name || '',
      contactLastName: contact?.last_name || '',
      contactEmail: contact?.email,
      contactPhone: contact?.phone,
      quoteNumber: `OFF-${Date.now()}`,
      quoteDate: format(new Date(), 'yyyy-MM-dd'),
      validUntil: format(addDays(new Date(), 30), 'yyyy-MM-dd'),
    };

    // Generate template
    const template = templateType === 'starter' 
      ? generateFinanceStarterQuote(templateData)
      : generateFinanceGrowthQuote(templateData);

    // Apply to form
    form.setValue('title', template.title);
    form.setValue('description', template.description);
    form.setValue('tax_rate', template.tax_rate);
    form.setValue('valid_until', templateData.validUntil);
    form.setValue('payment_terms', template.payment_terms);
    form.setValue('delivery_time', template.delivery_time);
    form.setValue('notes', template.notes);
    
    // Set items
    form.setValue('items', template.items.map(item => ({
      title: item.title,
      description: item.description,
      quantity: item.quantity,
      unit_price: item.unit_price,
      category: item.category,
    })));

    toast.success(`${templateType === 'starter' ? 'Finance Starter' : 'Finance Growth'} template toegepast! 🎉`);
  };

  // Calculate totals
  const items = form.watch('items');
  const taxRate = form.watch('tax_rate') || 21;
  const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
  const taxAmount = (subtotal * taxRate) / 100;
  const total = subtotal + taxAmount;

  useEffect(() => {
    if (!open) {
      form.reset();
    } else if (defaultCompanyId || defaultContactId) {
      // Pre-fill company and contact when opening with defaults
      if (defaultCompanyId) form.setValue('company_id', defaultCompanyId);
      if (defaultContactId) form.setValue('contact_id', defaultContactId);
    }
  }, [open, form, defaultCompanyId, defaultContactId]);

  const handleSubmit = (data: QuoteFormData) => {
    const submitData: CreateQuoteInput = {
      title: data.title || '',
      company_id: data.company_id || '',
      contact_id: data.contact_id || undefined,
      project_id: data.project_id || undefined,
      valid_until: data.valid_until || undefined,
      notes: data.notes,
      payment_terms: data.payment_terms,
      delivery_time: data.delivery_time,
      items: data.items.map((item, index) => ({
        title: item.title || '',
        description: item.description || '',
        category: item.category || 'website_development',
        quantity: item.quantity || 1,
        unit_price: item.unit_price || 0,
        item_order: index,
      })),
    };
    onSubmit(submitData);
  };

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-4xl h-[95vh] sm:h-auto max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{quote ? t('dialogs.editTitle', { item: t('quotes.quote') }) : t('dialogs.newTitle', { item: t('quotes.quote') })}</DialogTitle>
          <DialogDescription>
            {t('quotes.formDescription')}
          </DialogDescription>
        </DialogHeader>

        {/* Finance Templates */}
        {!quote && selectedCompanyId && (
          <div className="space-y-3 pb-4 border-b">
            <h4 className="text-sm font-medium text-muted-foreground">
              {t('quotes.quickStartFinance')}
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Button
                type="button"
                variant="outline"
                className="h-auto flex flex-col items-start p-4 hover:bg-accent"
                onClick={() => applyFinanceTemplate('starter')}
              >
                <div className="font-semibold text-base mb-1">{t('quotes.financeStarterTitle')}</div>
                <div className="text-sm text-muted-foreground">{t('quotes.financeStarterPrice')}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  {t('quotes.financeStarterDesc')}
                </div>
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-auto flex flex-col items-start p-4 hover:bg-accent"
                onClick={() => applyFinanceTemplate('growth')}
              >
                <div className="font-semibold text-base mb-1">{t('quotes.financeGrowthTitle')}</div>
                <div className="text-sm text-muted-foreground">{t('quotes.financeGrowthPrice')}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  {t('quotes.financeGrowthDesc')}
                </div>
              </Button>
            </div>
          </div>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            {/* Basic Info */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">{t('quotes.generalInfo')}</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="company_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('quotes.requiredCompany')}</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={t('forms.selectCompany')} />
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
                      <div className="flex items-center justify-between">
                        <FormLabel>{t('quotes.contactPersonLabel')}</FormLabel>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setCreateContactDialogOpen(true)}
                          disabled={!selectedCompanyId}
                          className="h-auto p-1 text-xs"
                        >
                          <UserPlus className="h-3 w-3 mr-1" />
                          Nieuw
                        </Button>
                      </div>
                      <Select 
                        onValueChange={field.onChange} 
                        value={field.value}
                        disabled={!selectedCompanyId}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={t('forms.selectContact')} />
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
              
              {/* Project/Lead selector */}
              <FormField
                control={form.control}
                name="project_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Project/Lead (optioneel)</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      value={field.value}
                      disabled={!selectedCompanyId}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Koppel aan project..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="">Geen project</SelectItem>
                        {projectsData?.map((project: any) => (
                          <SelectItem key={project.id} value={project.id}>
                            {project.title} ({project.stage})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Koppel deze offerte aan een bestaand project
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('quotes.requiredTitle')}</FormLabel>
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

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="valid_until"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Geldig tot</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="payment_terms"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('quotes.paymentTerms')}</FormLabel>
                      <FormControl>
                        <Input placeholder="30 dagen" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="delivery_time"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('quotes.deliveryTime')}</FormLabel>
                      <FormControl>
                        <Input placeholder="4-6 weken" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Line Items */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">{t('quotes.lineItemsSection')}</h3>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => append({ title: '', description: '', quantity: 1, unit_price: 0, category: '' })}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  {t('quotes.addItem')}
                </Button>
              </div>

              {fields.map((field, index) => (
                <Card key={field.id} className="p-4">
                  <div className="space-y-4">
                    <div className="flex justify-between items-start">
                      <h4 className="font-medium">Item {index + 1}</h4>
                      {fields.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => remove(index)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name={`items.${index}.title`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t('quotes.requiredTitle')}</FormLabel>
                            <FormControl>
                              <Input placeholder="Website design" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name={`items.${index}.category`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Categorie</FormLabel>
                            <FormControl>
                              <Input placeholder="Design, Development, etc." {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name={`items.${index}.description`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Beschrijving</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Gedetailleerde beschrijving"
                              rows={2}
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      <FormField
                        control={form.control}
                        name={`items.${index}.quantity`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Aantal *</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                min="1"
                                {...field}
                                onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name={`items.${index}.unit_price`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Prijs per stuk *</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                min="0"
                                step="0.01"
                                {...field}
                                onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="flex flex-col justify-end">
                        <FormLabel>Totaal</FormLabel>
                        <div className="h-10 flex items-center font-semibold">
                          €{((items[index]?.quantity || 0) * (items[index]?.unit_price || 0)).toFixed(2)}
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            {/* Financial Summary */}
            <Card className="p-4 bg-muted/50">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span>Subtotaal:</span>
                  <span className="font-semibold">€{subtotal.toFixed(2)}</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <span>BTW:</span>
                    <FormField
                      control={form.control}
                      name="tax_rate"
                      render={({ field }) => (
                        <FormItem className="flex-row items-center gap-2">
                          <FormControl>
                            <Input 
                              type="number" 
                              min="0"
                              max="100"
                              step="0.1"
                              className="w-20"
                              {...field}
                              onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                            />
                          </FormControl>
                          <span>%</span>
                        </FormItem>
                      )}
                    />
                  </div>
                  <span className="font-semibold">€{taxAmount.toFixed(2)}</span>
                </div>

                <div className="flex justify-between items-center text-lg font-bold border-t pt-2">
                  <span>Totaal:</span>
                  <span>€{total.toFixed(2)}</span>
                </div>
              </div>
            </Card>

            {/* Notes */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Interne Notities</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Interne opmerkingen (niet zichtbaar voor klant)"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Deze notities zijn alleen intern zichtbaar
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isLoading}
              >
                {t('common.cancel')}
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {quote ? t('common.save') : t('common.create')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
    
    {/* Create Contact Dialog */}
    <Dialog open={createContactDialogOpen} onOpenChange={setCreateContactDialogOpen}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('quotes.addNewContact')}</DialogTitle>
          <DialogDescription>
            {t('dialogs.addNewContactForCompany')}
          </DialogDescription>
        </DialogHeader>
        <ContactForm
          defaultCompanyId={selectedCompanyId}
          onSubmit={handleCreateContact}
          onCancel={() => setCreateContactDialogOpen(false)}
          isSubmitting={createContact.isPending}
        />
      </DialogContent>
    </Dialog>
    </>
  );
}
