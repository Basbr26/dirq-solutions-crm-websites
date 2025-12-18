import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { UserPlus, Mail, User, Briefcase, Calendar, CheckCircle2, Copy } from 'lucide-react';

const employeeSchema = z.object({
  email: z.string().email('Ongeldig emailadres'),
  voornaam: z.string().min(1, 'Voornaam is verplicht'),
  achternaam: z.string().min(1, 'Achternaam is verplicht'),
  employment_status: z.enum([
    'aanbieding_verstuurd',
    'aanbieding_geaccepteerd', 
    'in_dienst',
    'proeftijd',
    'tijdelijk_contract',
    'vast_contract',
    'uitdienst_aangevraagd',
    'uitdienst'
  ]),
  functie: z.string().nullable(),
  department_id: z.string().nullable(),
  manager_id: z.string().nullable(),
  date_of_birth: z.string().nullable(),
  start_date: z.string().nullable(),
  contract_type: z.string().nullable(),
  hours_per_week: z.number().min(0).max(60).nullable(),
});

type EmployeeFormData = z.infer<typeof employeeSchema>;

interface Department {
  id: string;
  name: string;
}

interface Manager {
  id: string;
  voornaam: string;
  achternaam: string;
}

interface CreateEmployeeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const EMPLOYMENT_STATUSES = [
  { value: 'aanbieding_verstuurd', label: 'Aanbieding Verstuurd', color: 'bg-blue-100 text-blue-800' },
  { value: 'aanbieding_geaccepteerd', label: 'Aanbieding Geaccepteerd', color: 'bg-green-100 text-green-800' },
  { value: 'proeftijd', label: 'Proeftijd', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'in_dienst', label: 'In Dienst', color: 'bg-green-100 text-green-800' },
  { value: 'tijdelijk_contract', label: 'Tijdelijk Contract', color: 'bg-orange-100 text-orange-800' },
  { value: 'vast_contract', label: 'Vast Contract', color: 'bg-green-100 text-green-800' },
  { value: 'uitdienst_aangevraagd', label: 'Uitdienst Aangevraagd', color: 'bg-red-100 text-red-800' },
  { value: 'uitdienst', label: 'Uit Dienst', color: 'bg-gray-100 text-gray-800' },
];

export function CreateEmployeeDialog({ open, onOpenChange, onSuccess }: CreateEmployeeDialogProps) {
  const [loading, setLoading] = useState(false);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [managers, setManagers] = useState<Manager[]>([]);
  const [generatedCredentials, setGeneratedCredentials] = useState<{
    email: string;
    password: string;
  } | null>(null);

  const { register, handleSubmit, formState: { errors }, setValue, watch, reset } = useForm<EmployeeFormData>({
    resolver: zodResolver(employeeSchema),
    defaultValues: {
      email: '',
      voornaam: '',
      achternaam: '',
      employment_status: 'aanbieding_verstuurd',
      functie: null,
      department_id: null,
      manager_id: null,
      date_of_birth: null,
      start_date: null,
      contract_type: null,
      hours_per_week: null,
    },
  });

  useEffect(() => {
    if (open) {
      loadDepartments();
      loadManagers();
      setGeneratedCredentials(null);
      reset();
    }
  }, [open, reset]);

  const loadDepartments = async () => {
    const { data } = await supabase.from('departments').select('id, name').order('name');
    setDepartments(data || []);
  };

  const loadManagers = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('id, voornaam, achternaam')
      .in('role', ['hr', 'manager', 'super_admin'])
      .order('voornaam');
    setManagers(data || []);
  };

  const generatePassword = () => {
    const length = 12;
    const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%";
    let password = "";
    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    return password;
  };

  const onSubmit = async (data: EmployeeFormData) => {
    setLoading(true);
    try {
      const generatedPassword = generatePassword();

      // First create auth user via Supabase Admin API with password
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: data.email,
        password: generatedPassword,
        email_confirm: true,
        user_metadata: {
          voornaam: data.voornaam,
          achternaam: data.achternaam,
        },
      });

      if (authError) throw authError;

      // Generate employee number
      const { data: empNumber } = await supabase.rpc('generate_employee_number');

      // Then create/update profile with all details
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: authData.user.id,
          email: data.email,
          voornaam: data.voornaam,
          achternaam: data.achternaam,
          role: 'medewerker',
          employment_status: data.employment_status,
          employee_number: empNumber,
          functie: data.functie || null,
          department_id: data.department_id || null,
          manager_id: data.manager_id || null,
          date_of_birth: data.date_of_birth || null,
          start_date: data.start_date || null,
          contract_type: data.contract_type || null,
          hours_per_week: data.hours_per_week || null,
          invitation_sent_at: new Date().toISOString(),
          temporary_password: generatedPassword,
          must_change_password: true,
        });

      if (profileError) throw profileError;

      // Toon inloggegevens
      setGeneratedCredentials({
        email: data.email,
        password: generatedPassword,
      });

      toast.success(`Medewerker aangemaakt!`);
      
      onSuccess();
    } catch (error) {
      console.error('Create employee error:', error);
      toast.error('Aanmaken mislukt: ' + (error instanceof Error ? error.message : 'Onbekende fout'));
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Gekopieerd naar klembord");
  };

  const closeCredentialsDialog = () => {
    setGeneratedCredentials(null);
    onOpenChange(false);
  };

  // Inloggegevens dialog
  if (generatedCredentials) {
    return (
      <Dialog open={true} onOpenChange={closeCredentialsDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              Inloggegevens
            </DialogTitle>
            <DialogDescription>
              Geef deze gegevens door aan de medewerker. Het wachtwoord moet bij eerste login worden gewijzigd.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-lg border bg-muted/50 p-4 space-y-3">
              <div>
                <Label className="text-xs text-muted-foreground">Email</Label>
                <div className="flex items-center gap-2 mt-1">
                  <code className="flex-1 text-sm font-mono bg-background px-3 py-2 rounded border">
                    {generatedCredentials.email}
                  </code>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copyToClipboard(generatedCredentials.email)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div>
                <Label className="text-xs text-muted-foreground">Tijdelijk wachtwoord</Label>
                <div className="flex items-center gap-2 mt-1">
                  <code className="flex-1 text-sm font-mono bg-background px-3 py-2 rounded border">
                    {generatedCredentials.password}
                  </code>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copyToClipboard(generatedCredentials.password)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            <Button
              className="w-full"
              onClick={() =>
                copyToClipboard(
                  `Email: ${generatedCredentials.email}\nWachtwoord: ${generatedCredentials.password}`
                )
              }
            >
              <Copy className="mr-2 h-4 w-4" />
              Kopieer beide
            </Button>
          </div>

          <DialogFooter>
            <Button onClick={closeCredentialsDialog}>Sluiten</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-full sm:max-w-[700px] max-h-screen sm:max-h-[90vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader className="pb-4">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <UserPlus className="h-5 w-5" />
            Nieuwe Medewerker
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="basic">
                <User className="h-4 w-4 mr-2" />
                Basis
              </TabsTrigger>
              <TabsTrigger value="work">
                <Briefcase className="h-4 w-4 mr-2" />
                Werk
              </TabsTrigger>
              <TabsTrigger value="contract">
                <Calendar className="h-4 w-4 mr-2" />
                Contract
              </TabsTrigger>
            </TabsList>

            {/* Basic Info Tab */}
            <TabsContent value="basic" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="voornaam">Voornaam *</Label>
                  <Input id="voornaam" {...register('voornaam')} disabled={loading} />
                  {errors.voornaam && (
                    <p className="text-sm text-destructive">{errors.voornaam.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="achternaam">Achternaam *</Label>
                  <Input id="achternaam" {...register('achternaam')} disabled={loading} />
                  {errors.achternaam && (
                    <p className="text-sm text-destructive">{errors.achternaam.message}</p>
                  )}
                </div>

                <div className="col-span-2 space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input id="email" type="email" {...register('email')} disabled={loading} />
                  {errors.email && (
                    <p className="text-sm text-destructive">{errors.email.message}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Account wordt automatisch aangemaakt. Medewerker ontvangt een uitnodigingsmail.
                  </p>
                </div>

                <div className="col-span-2 space-y-2">
                  <Label htmlFor="employment_status">Status *</Label>
                  <Select
                    value={watch('employment_status')}
                    onValueChange={(value) => setValue('employment_status', value as EmployeeFormData['employment_status'])}
                    disabled={loading}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {EMPLOYMENT_STATUSES.map((status) => (
                        <SelectItem key={status.value} value={status.value}>
                          {status.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="col-span-2 space-y-2">
                  <Label htmlFor="date_of_birth">Geboortedatum</Label>
                  <Input id="date_of_birth" type="date" {...register('date_of_birth')} disabled={loading} />
                </div>
              </div>
            </TabsContent>

            {/* Work Info Tab */}
            <TabsContent value="work" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 space-y-2">
                  <Label htmlFor="functie">Functie</Label>
                  <Input id="functie" {...register('functie')} disabled={loading} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="department_id">Afdeling</Label>
                  <Select
                    value={watch('department_id') || ''}
                    onValueChange={(value) => setValue('department_id', value)}
                    disabled={loading}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecteer afdeling" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Geen afdeling</SelectItem>
                      {departments.filter(d => d.id && d.id.trim() !== '').map((dept) => (
                        <SelectItem key={dept.id} value={dept.id}>
                          {dept.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="manager_id">Leidinggevende</Label>
                  <Select
                    value={watch('manager_id') || ''}
                    onValueChange={(value) => setValue('manager_id', value)}
                    disabled={loading}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecteer leidinggevende" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Geen leidinggevende</SelectItem>
                      {managers.filter(m => m.id && m.id.trim() !== '').map((manager) => (
                        <SelectItem key={manager.id} value={manager.id}>
                          {manager.voornaam} {manager.achternaam}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </TabsContent>

            {/* Contract Tab */}
            <TabsContent value="contract" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="start_date">Startdatum</Label>
                  <Input id="start_date" type="date" {...register('start_date')} disabled={loading} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contract_type">Contract Type</Label>
                  <Select
                    value={watch('contract_type') || ''}
                    onValueChange={(value) => setValue('contract_type', value)}
                    disabled={loading}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecteer type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Geen</SelectItem>
                      <SelectItem value="vast">Vast</SelectItem>
                      <SelectItem value="tijdelijk">Tijdelijk</SelectItem>
                      <SelectItem value="oproep">Oproep</SelectItem>
                      <SelectItem value="stage">Stage</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="col-span-2 space-y-2">
                  <Label htmlFor="hours_per_week">Uren per week</Label>
                  <Input
                    id="hours_per_week"
                    type="number"
                    step="0.1"
                    min="0"
                    max="60"
                    {...register('hours_per_week', { valueAsNumber: true })}
                    disabled={loading}
                  />
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Annuleren
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Aanmaken...' : 'Medewerker Aanmaken'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
