import { useForm } from "react-hook-form";
import { useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCompanies } from "@/features/companies/hooks/useCompanies";
import { Contact } from "@/types/crm";
import { Loader2 } from "lucide-react";

const contactFormSchema = z.object({
  first_name: z.string().min(1, "Voornaam is verplicht"),
  last_name: z.string().min(1, "Achternaam is verplicht"),
  email: z.string().email("Ongeldig e-mailadres").optional().or(z.literal("")),
  phone: z.string().optional(),
  mobile: z.string().optional(),
  position: z.string().optional(),
  department: z.string().optional(),
  linkedin_url: z.string().url("Ongeldige URL").optional().or(z.literal("")),
  company_id: z.string().uuid("Selecteer een bedrijf").optional(),
  is_primary: z.boolean().default(false),
  is_decision_maker: z.boolean().default(false),
  notes: z.string().optional(),
});

type ContactFormValues = z.infer<typeof contactFormSchema>;

interface ContactFormProps {
  contact?: Contact;
  defaultCompanyId?: string;
  onSubmit: (data: ContactFormValues) => void;
  onCancel?: () => void;
  isSubmitting?: boolean;
}

export function ContactForm({
  contact,
  defaultCompanyId,
  onSubmit,
  onCancel,
  isSubmitting = false,
}: ContactFormProps) {
  const { data: companiesData, isLoading: isLoadingCompanies } = useCompanies();

  const form = useForm<ContactFormValues>({
    resolver: zodResolver(contactFormSchema),
    defaultValues: {
      first_name: contact?.first_name || "",
      last_name: contact?.last_name || "",
      email: contact?.email || "",
      phone: contact?.phone || "",
      mobile: contact?.mobile || "",
      position: contact?.position || "",
      department: contact?.department || "",
      linkedin_url: contact?.linkedin_url || "",
      company_id: contact?.company_id || defaultCompanyId || undefined,
      is_primary: contact?.is_primary || false,
      is_decision_maker: contact?.is_decision_maker || false,
      notes: contact?.notes || "",
    },
  });

  // Reset form when contact changes
  useEffect(() => {
    if (contact) {
      form.reset({
        first_name: contact.first_name || "",
        last_name: contact.last_name || "",
        email: contact.email || "",
        phone: contact.phone || "",
        mobile: contact.mobile || "",
        position: contact.position || "",
        department: contact.department || "",
        linkedin_url: contact.linkedin_url || "",
        company_id: contact.company_id || defaultCompanyId || undefined,
        is_primary: contact.is_primary || false,
        is_decision_maker: contact.is_decision_maker || false,
        notes: contact.notes || "",
      });
    }
  }, [contact, defaultCompanyId, form]);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Name Fields */}
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="first_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Voornaam *</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="Jan" 
                    autoComplete="given-name"
                    {...field} 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="last_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Achternaam *</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="Jansen" 
                    autoComplete="family-name"
                    {...field} 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Contact Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>E-mail</FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    placeholder="jan.jansen@bedrijf.nl"
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
                <FormLabel>Telefoon</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="+31 20 123 4567" 
                    inputMode="tel"
                    type="tel"
                    autoComplete="tel-national"
                    {...field} 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="mobile"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Mobiel</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="+31 6 12 34 56 78" 
                    inputMode="tel"
                    type="tel"
                    autoComplete="tel-local"
                    {...field} 
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
                <FormLabel>LinkedIn URL</FormLabel>
                <FormControl>
                  <Input
                    placeholder="https://linkedin.com/in/janjansen"
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

        {/* Position & Department */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="position"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Functie</FormLabel>
                <FormControl>
                  <Input placeholder="Marketing Manager" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="department"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Afdeling</FormLabel>
                <FormControl>
                  <Input placeholder="Marketing" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Company Selection */}
        <FormField
          control={form.control}
          name="company_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Bedrijf</FormLabel>
              <Select 
                onValueChange={field.onChange} 
                value={field.value}
                disabled={!!defaultCompanyId}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecteer een bedrijf" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {isLoadingCompanies ? (
                    <div className="flex items-center justify-center p-4">
                      <Loader2 className="h-4 w-4 animate-spin" />
                    </div>
                  ) : (
                    <>
                      <SelectItem value="none">Geen bedrijf</SelectItem>
                      {companiesData?.companies.map((company) => (
                        <SelectItem key={company.id} value={company.id}>
                          {company.name}
                        </SelectItem>
                      ))}
                    </>
                  )}
                </SelectContent>
              </Select>
              <FormDescription>
                {defaultCompanyId 
                  ? "Dit contact wordt automatisch gekoppeld aan dit bedrijf"
                  : "Koppel dit contact aan een bedrijf"
                }
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Contact Flags */}
        <div className="space-y-4">
          <FormField
            control={form.control}
            name="is_primary"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel>Primair contactpersoon</FormLabel>
                  <FormDescription>
                    Dit is het hoofdcontact voor het bedrijf
                  </FormDescription>
                </div>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="is_decision_maker"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel>Beslisser</FormLabel>
                  <FormDescription>
                    Deze persoon neemt beslissingen over aankopen
                  </FormDescription>
                </div>
              </FormItem>
            )}
          />
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
                  placeholder="Aanvullende informatie over dit contact..."
                  className="min-h-[100px]"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Form Actions */}
        <div className="flex justify-end gap-2">
          {onCancel && (
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isSubmitting}
            >
              Annuleren
            </Button>
          )}
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {contact ? "Opslaan" : "Aanmaken"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
