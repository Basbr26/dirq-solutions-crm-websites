import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Company, CompanyFormData } from '@/types/crm';
import { getIndustryName } from '@/lib/industry-translations';
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
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Sparkles, FileText, Search, AlertCircle, Building2 } from 'lucide-react';
import { parseDrimbleText, parseCompanySize, cleanPhoneNumber, formatKVKNumber } from '@/lib/companyDataParser';
import { toast } from 'sonner';
import { Card } from '@/components/ui/card';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const companyFormSchema = z.object({
  name: z.string().min(2, 'Naam moet minimaal 2 karakters bevatten'),
  industry_id: z.string().optional(),
  website: z.string().url('Voer een geldige URL in').or(z.literal('')).optional(),
  phone: z.string().optional(),
  email: z.string().email('Voer een geldig e-mailadres in').or(z.literal('')).optional(),
  address: z.object({
    street: z.string().optional(),
    city: z.string().optional(),
    postal_code: z.string().optional(),
    country: z.string().optional(),
  }).optional(),
  company_size: z.enum(['1-10', '11-50', '51-200', '201-500', '501+']).optional(),
  annual_revenue: z.number().optional(),
  status: z.enum(['prospect', 'active', 'inactive', 'churned']),
  priority: z.enum(['low', 'medium', 'high']),
  notes: z.string().optional(),
  // v2.0 External Data Integration
  kvk_number: z.string().regex(/^\d{8}$/, 'KVK nummer moet 8 cijfers zijn').optional().or(z.literal('')),
  linkedin_url: z.string().url('Voer een geldige LinkedIn URL in').optional().or(z.literal('')),
  source: z.enum(['Manual', 'Apollo', 'KVK', 'Website', 'Manus', 'Referral', 'n8n_automation']).optional(),
});

interface CompanyFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  company?: Company;
  onSubmit: (data: CompanyFormData) => void;
  isLoading?: boolean;
}

export function CompanyForm({ open, onOpenChange, company, onSubmit, isLoading }: CompanyFormProps) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [pasteText, setPasteText] = useState('');
  const [showQuickFill, setShowQuickFill] = useState(!company);
  const [duplicateInfo, setDuplicateInfo] = useState<{ type: 'name' | 'kvk', existingName: string, existingId: string } | null>(null);
  const [showDuplicateDialog, setShowDuplicateDialog] = useState(false);
  
  const { data: industries } = useQuery({
    queryKey: ['industries'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('industries')
        .select('*')
        .eq('is_active', true)
        .order('name');
      
      if (error) throw error;
      return data;
    },
  });

  const form = useForm<CompanyFormData>({
    resolver: zodResolver(companyFormSchema),
    defaultValues: {
      name: '',
      industry_id: undefined,
      website: '',
      phone: '',
      email: '',
      address: {
        street: '',
        city: '',
        postal_code: '',
        country: 'Nederland',
      },
      company_size: undefined,
      status: 'prospect',
      priority: 'medium',
      notes: '',
      kvk_number: '',
      linkedin_url: '',
      source: 'Manual',
    },
  });

  // Reset form when company changes or dialog opens/closes
  useEffect(() => {
    if (company) {
      form.reset({
        name: company.name,
        industry_id: company.industry_id || undefined,
        website: company.website || '',
        phone: company.phone || '',
        email: company.email || '',
        address: company.address || {
          street: '',
          city: '',
          postal_code: '',
          country: 'Nederland',
        },
        company_size: company.company_size,
        annual_revenue: company.annual_revenue || undefined,
        status: company.status,
        priority: company.priority,
        notes: company.notes || '',
        kvk_number: company.kvk_number || '',
        linkedin_url: company.linkedin_url || '',
        source: company.source || 'Manual',
      });
    } else {
      form.reset({
        name: '',
        industry_id: undefined,
        website: '',
        phone: '',
        email: '',
        address: {
          street: '',
          city: '',
          postal_code: '',
          country: 'Nederland',
        },
        company_size: undefined,
        status: 'prospect',
        priority: 'medium',
        notes: '',
        kvk_number: '',
        linkedin_url: '',
        source: 'Manual',
      });
    }
  }, [company, open, form]);

  const handleParsePaste = () => {
    if (!pasteText.trim()) {
      toast.error(t('companies.pasteDataFirst'));
      return;
    }

    const parsed = parseDrimbleText(pasteText);
    
    // Fill form with parsed data
    if (parsed.name) form.setValue('name', parsed.name);
    if (parsed.website) form.setValue('website', parsed.website);
    if (parsed.email) form.setValue('email', parsed.email);
    if (parsed.phone) form.setValue('phone', cleanPhoneNumber(parsed.phone));
    if (parsed.kvk_number) form.setValue('kvk_number', formatKVKNumber(parsed.kvk_number));
    if (parsed.linkedin_url) form.setValue('linkedin_url', parsed.linkedin_url);
    if (parsed.address) {
      form.setValue('address', {
        street: parsed.address.street || '',
        city: parsed.address.city || '',
        postal_code: parsed.address.postal_code || '',
        country: parsed.address.country || 'Nederland',
      });
    }
    
    const companySize = parseCompanySize(pasteText);
    if (companySize) {
      form.setValue('company_size', companySize as any);
    }
    
    // Set source to Manual for paste
    form.setValue('source', 'Manual');
    
    toast.success(t('companies.dataFilled'));
    setPasteText('');
    setShowQuickFill(false);
  };



  const handleSubmit = async (data: CompanyFormData) => {
    // Clear any previous error
    setDuplicateInfo(null);
    
    try {
      // Check if company name already exists
      const { data: existingName } = await supabase
        .from('companies')
        .select('id, name')
        .ilike('name', data.name)  // Case-insensitive
        .maybeSingle();

      if (existingName && existingName.id !== company?.id) {
        setDuplicateInfo({
          type: 'name',
          existingName: existingName.name,
          existingId: existingName.id,
        });
        setShowDuplicateDialog(true);
        return;
      }

      // Check KVK number if provided
      if (data.kvk_number) {
        const { data: existingKVK } = await supabase
          .from('companies')
          .select('id, name')
          .eq('kvk_number', data.kvk_number)
          .maybeSingle();

        if (existingKVK && existingKVK.id !== company?.id) {
          setDuplicateInfo({
            type: 'kvk',
            existingName: existingKVK.name,
            existingId: existingKVK.id,
          });
          setShowDuplicateDialog(true);
          return;
        }
      }
    } catch (error) {
      console.error('Error checking duplicates:', error);
    }
    
    onSubmit(data);
    if (!company) {
      form.reset();
      setDuplicateInfo(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-2xl h-[95vh] sm:h-auto max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{company ? t('dialogs.editTitle', { item: t('companies.title').slice(0, -1).toLowerCase() }) : t('dialogs.newTitle', { item: t('companies.title').slice(0, -1).toLowerCase() })}</DialogTitle>
          <DialogDescription>
            {company
              ? t('companies.editDescription')
              : t('companies.addDescription')}
          </DialogDescription>
        </DialogHeader>

        {/* Quick Fill Section - Only show when creating new company */}
        {!company && showQuickFill && (
          <Card className="p-4 bg-primary/5 border-primary/20">
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Sparkles className="h-4 w-4 text-primary" />
                <span>Snel invullen</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="ml-auto h-6 text-xs"
                  onClick={() => setShowQuickFill(false)}
                >
                  Sluiten
                </Button>
              </div>
              
              <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-md">
                <p className="font-medium mb-1">💡 Zo werkt het:</p>
                <ol className="list-decimal list-inside space-y-1">
                  <li>Zoek het bedrijf op via KVK.nl of een andere bron</li>
                  <li>Kopieer de gegevens (naam, adres, KVK nummer, etc.)</li>
                  <li>Plak ze in het tekstveld hieronder</li>
                  <li>Klik op "Gegevens invullen" - formulier wordt automatisch gevuld</li>
                </ol>
              </div>
              
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground font-medium">
                  Stap 2: Plak gekopieerde gegevens
                </label>
                <Textarea
                  placeholder={t('companies.pasteBusinessData')}
                  value={pasteText}
                  onChange={(e) => setPasteText(e.target.value)}
                  className="min-h-[100px] text-sm"
                />
              </div>
              
              <Button
                type="button"
                variant="default"
                size="sm"
                className="w-full"
                onClick={handleParsePaste}
                disabled={!pasteText.trim()}
              >
                <FileText className="h-4 w-4 mr-2" />
                Gegevens invullen
              </Button>
            </div>
          </Card>
        )}

        {!company && !showQuickFill && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => setShowQuickFill(true)}
          >
            <Sparkles className="h-4 w-4 mr-2" />
            Snel invullen via KVK
          </Button>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold">Basisinformatie</h3>
              
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('formLabels.companyName')} *</FormLabel>
                    <FormControl>
                      <Input placeholder="Acme Corporation" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="industry_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('companies.industry')}</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={t('forms.selectIndustry')} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {industries?.map((industry) => (
                            <SelectItem key={industry.id} value={industry.id}>
                              {getIndustryName(industry.name, i18n.language)}
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
                  name="company_size"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('formLabels.companySize')}</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={t('forms.selectSize')} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="1-10">1-10 werknemers</SelectItem>
                          <SelectItem value="11-50">11-50 werknemers</SelectItem>
                          <SelectItem value="51-200">51-200 werknemers</SelectItem>
                          <SelectItem value="201-500">201-500 werknemers</SelectItem>
                          <SelectItem value="501+">501+ werknemers</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="prospect">Prospect</SelectItem>
                          <SelectItem value="active">Actief</SelectItem>
                          <SelectItem value="inactive">Inactief</SelectItem>
                          <SelectItem value="churned">Verloren</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="priority"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('companies.priority')} *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="low">Laag</SelectItem>
                          <SelectItem value="medium">Normaal</SelectItem>
                          <SelectItem value="high">Hoog</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="source"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('companies.source')}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t('forms.selectSource')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Manual">Handmatig</SelectItem>
                        <SelectItem value="Apollo">Apollo.io</SelectItem>
                        <SelectItem value="KVK">KVK API</SelectItem>
                        <SelectItem value="Website">Website Formulier</SelectItem>
                        <SelectItem value="Manus">Manus AI</SelectItem>
                        <SelectItem value="Referral">Referral</SelectItem>
                        <SelectItem value="n8n_automation">n8n Automatisering</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Contact Information */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold">Contactgegevens</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('formLabels.email')}</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="info@company.com" 
                          inputMode="email"
                          type="email"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('formLabels.phone')}</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="+31 20 123 4567" 
                          inputMode="tel"
                          type="tel"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="website"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('formLabels.website')}</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="https://www.company.com" 
                        inputMode="url"
                        type="url"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* External Data Integration (v2.0) */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold">Externe Data (optioneel)</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="kvk_number"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('formLabels.kvkNumber')}</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="12345678 (8 cijfers)" 
                          inputMode="numeric"
                          maxLength={8}
                          {...field}
                          onChange={(e) => {
                            field.onChange(e);
                            setDuplicateInfo(null);
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="linkedin_url"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('formLabels.linkedinUrl')}</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="https://www.linkedin.com/company/..." 
                          inputMode="url"
                          type="url"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Address */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold">Adres</h3>
              
              <FormField
                control={form.control}
                name="address.street"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('companies.streetAddress')}</FormLabel>
                    <FormControl>
                      <Input placeholder="Keizersgracht 123" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="address.postal_code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('formLabels.postalCode')}</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="1015 CW" 
                          inputMode="text"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="address.city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('formLabels.city')}</FormLabel>
                      <FormControl>
                        <Input placeholder="Amsterdam" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="address.country"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Land</FormLabel>
                      <FormControl>
                        <Input placeholder="Nederland" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Notes */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notities</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Aanvullende informatie over dit bedrijf..."
                      className="resize-none"
                      rows={4}
                      {...field}
                    />
                  </FormControl>
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
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {company ? t('common.save') : t('common.create')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>

      {/* Duplicate Warning Dialog */}
      <AlertDialog open={showDuplicateDialog} onOpenChange={setShowDuplicateDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              Bedrijf bestaat al
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>
                {duplicateInfo?.type === 'name' ? (
                  <span>
                    Er bestaat al een bedrijf met de naam <strong>"{duplicateInfo.existingName}"</strong>.
                  </span>
                ) : (
                  <span>
                    Dit KVK nummer is al in gebruik bij bedrijf <strong>"{duplicateInfo?.existingName}"</strong>.
                  </span>
                )}
              </p>
              <p className="text-sm text-muted-foreground">
                Wil je het bestaande bedrijf bekijken?
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuleren</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (duplicateInfo?.existingId) {
                  onOpenChange(false);
                  navigate(`/companies/${duplicateInfo.existingId}`);
                }
              }}
              className="bg-primary hover:bg-primary/90"
            >
              Bekijk Bestaand Bedrijf
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}
