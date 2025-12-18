import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, User, MapPin, Briefcase, CreditCard, Heart, FileText } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

// Validation schema
const employeeSchema = z.object({
  // Persoonlijk
  voornaam: z.string().min(1, 'Voornaam is verplicht'),
  achternaam: z.string().min(1, 'Achternaam is verplicht'),
  email: z.string().email('Ongeldig emailadres'),
  telefoon: z.string().nullable(),
  date_of_birth: z.string().nullable(),
  
  // Adres
  address: z.string().nullable(),
  postal_code: z.string().regex(/^\d{4}\s?[A-Z]{2}$/i, 'Ongeldige postcode (1234 AB)').nullable().or(z.literal('')),
  city: z.string().nullable(),
  
  // Werk
  functie: z.string().nullable(),
  department_id: z.string().nullable(),
  manager_id: z.string().nullable(),
  employee_number: z.string().nullable(),
  employment_status: z.string().nullable(),
  
  // Contract
  contract_type: z.string().nullable(),
  start_date: z.string().nullable(),
  end_date: z.string().nullable(),
  hours_per_week: z.number().min(0).max(60).nullable(),
  
  // Emergency
  emergency_contact_name: z.string().nullable(),
  emergency_contact_phone: z.string().nullable(),
  
  // Financieel
  bank_account: z.string().nullable(),
  
  // Notities
  notes: z.string().nullable(),
});

type EmployeeFormData = z.infer<typeof employeeSchema>;

interface Employee {
  id: string;
  voornaam: string;
  achternaam: string;
  email: string;
  telefoon: string | null;
  date_of_birth: string | null;
  address: string | null;
  postal_code: string | null;
  city: string | null;
  functie: string | null;
  department_id: string | null;
  manager_id: string | null;
  employee_number: string | null;
  employment_status: string | null;
  contract_type: string | null;
  start_date: string | null;
  end_date: string | null;
  hours_per_week: number | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  bank_account: string | null;
  notes: string | null;
}

interface Department {
  id: string;
  name: string;
}

interface Manager {
  id: string;
  voornaam: string;
  achternaam: string;
}

interface EditEmployeeDialogProps {
  employee: Employee;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function EditEmployeeDialog({ employee, open, onOpenChange, onSuccess }: EditEmployeeDialogProps) {
  const [loading, setLoading] = useState(false);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [managers, setManagers] = useState<Manager[]>([]);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<EmployeeFormData>({
    resolver: zodResolver(employeeSchema),
    defaultValues: {
      voornaam: employee.voornaam || '',
      achternaam: employee.achternaam || '',
      email: employee.email || '',
      telefoon: employee.telefoon || '',
      date_of_birth: employee.date_of_birth || '',
      address: employee.address || '',
      postal_code: employee.postal_code || '',
      city: employee.city || '',
      functie: employee.functie || '',
      department_id: employee.department_id || '',
      manager_id: employee.manager_id || '',
      employee_number: employee.employee_number || '',
      employment_status: employee.employment_status || 'active',
      contract_type: employee.contract_type || '',
      start_date: employee.start_date || '',
      end_date: employee.end_date || '',
      hours_per_week: employee.hours_per_week || null,
      emergency_contact_name: employee.emergency_contact_name || '',
      emergency_contact_phone: employee.emergency_contact_phone || '',
      bank_account: employee.bank_account || '',
      notes: employee.notes || '',
    },
  });

  // Load departments and managers
  useState(() => {
    const loadData = async () => {
      const [deptResult, managersResult] = await Promise.all([
        supabase.from('departments').select('id, name').order('name'),
        supabase.from('profiles').select('id, voornaam, achternaam').order('voornaam'),
      ]);

      if (deptResult.data) setDepartments(deptResult.data);
      if (managersResult.data) setManagers(managersResult.data);
    };

    if (open) loadData();
  });

  const onSubmit = async (data: EmployeeFormData) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          voornaam: data.voornaam,
          achternaam: data.achternaam,
          email: data.email,
          telefoon: data.telefoon || null,
          date_of_birth: data.date_of_birth || null,
          address: data.address || null,
          postal_code: data.postal_code || null,
          city: data.city || null,
          functie: data.functie || null,
          department_id: data.department_id || null,
          manager_id: data.manager_id || null,
          employee_number: data.employee_number || null,
          employment_status: data.employment_status || 'active',
          contract_type: data.contract_type || null,
          start_date: data.start_date || null,
          end_date: data.end_date || null,
          hours_per_week: data.hours_per_week || null,
          emergency_contact_name: data.emergency_contact_name || null,
          emergency_contact_phone: data.emergency_contact_phone || null,
          bank_account: data.bank_account || null,
          notes: data.notes || null,
        })
        .eq('id', employee.id);

      if (error) throw error;

      toast.success('Medewerker bijgewerkt');
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Error updating employee:', error);
      toast.error('Fout bij bijwerken medewerker');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Medewerker bewerken</DialogTitle>
          <DialogDescription>
            {employee.voornaam} {employee.achternaam}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)}>
          <Tabs defaultValue="personal" className="w-full">
            <TabsList className="grid w-full grid-cols-6">
              <TabsTrigger value="personal">
                <User className="h-4 w-4 mr-1" />
                Persoonlijk
              </TabsTrigger>
              <TabsTrigger value="address">
                <MapPin className="h-4 w-4 mr-1" />
                Adres
              </TabsTrigger>
              <TabsTrigger value="work">
                <Briefcase className="h-4 w-4 mr-1" />
                Dienstverband
              </TabsTrigger>
              <TabsTrigger value="contract">
                <CreditCard className="h-4 w-4 mr-1" />
                Contract
              </TabsTrigger>
              <TabsTrigger value="emergency">
                <Heart className="h-4 w-4 mr-1" />
                Noodcontact
              </TabsTrigger>
              <TabsTrigger value="notes">
                <FileText className="h-4 w-4 mr-1" />
                Notities
              </TabsTrigger>
            </TabsList>

            {/* Personal Tab */}
            <TabsContent value="personal" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="voornaam">Voornaam *</Label>
                  <Input id="voornaam" {...register('voornaam')} />
                  {errors.voornaam && (
                    <p className="text-sm text-destructive">{errors.voornaam.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="achternaam">Achternaam *</Label>
                  <Input id="achternaam" {...register('achternaam')} />
                  {errors.achternaam && (
                    <p className="text-sm text-destructive">{errors.achternaam.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input id="email" type="email" {...register('email')} />
                  {errors.email && (
                    <p className="text-sm text-destructive">{errors.email.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="telefoon">Telefoon</Label>
                  <Input id="telefoon" {...register('telefoon')} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="date_of_birth">Geboortedatum</Label>
                  <Input id="date_of_birth" type="date" {...register('date_of_birth')} />
                </div>
              </div>
            </TabsContent>

            {/* Address Tab */}
            <TabsContent value="address" className="space-y-4 mt-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="address">Adres</Label>
                  <Input id="address" placeholder="Straat + huisnummer" {...register('address')} />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="postal_code">Postcode</Label>
                    <Input id="postal_code" placeholder="1234 AB" {...register('postal_code')} />
                    {errors.postal_code && (
                      <p className="text-sm text-destructive">{errors.postal_code.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="city">Plaats</Label>
                    <Input id="city" {...register('city')} />
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Dienstverband Tab */}
            <TabsContent value="work" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="functie">Functie</Label>
                  <Input id="functie" {...register('functie')} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="employee_number">Personeelsnummer</Label>
                  <div className="flex gap-2">
                    <Input 
                      id="employee_number" 
                      {...register('employee_number')} 
                      readOnly
                      className="bg-muted"
                      placeholder="Automatisch gegenereerd"
                    />
                    {!watch('employee_number') && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={async () => {
                          const { data, error } = await supabase.rpc('generate_employee_number');
                          if (!error && data) {
                            setValue('employee_number', data);
                            toast.success('Personeelsnummer gegenereerd');
                          }
                        }}
                      >
                        Genereer
                      </Button>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Wordt automatisch gegenereerd bij aanmaken nieuwe medewerker
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="department_id">Afdeling</Label>
                  <Select
                    value={watch('department_id') || ''}
                    onValueChange={(value) => setValue('department_id', value)}
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
                  <Label htmlFor="manager_id">Manager</Label>
                  <Select
                    value={watch('manager_id') || ''}
                    onValueChange={(value) => setValue('manager_id', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecteer manager" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Geen manager</SelectItem>
                      {managers.filter(m => m.id && m.id.trim() !== '').map((mgr) => (
                        <SelectItem key={mgr.id} value={mgr.id}>
                          {mgr.voornaam} {mgr.achternaam}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2 col-span-2">
                  <Label htmlFor="employment_status">Status</Label>
                  <Select
                    value={watch('employment_status') || 'active'}
                    onValueChange={(value) => setValue('employment_status', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Actief</SelectItem>
                      <SelectItem value="inactive">Inactief</SelectItem>
                      <SelectItem value="on_leave">Met verlof</SelectItem>
                      <SelectItem value="terminated">Uit dienst</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </TabsContent>

            {/* Contract Tab */}
            <TabsContent value="contract" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="contract_type">Contract type</Label>
                  <Select
                    value={watch('contract_type') || ''}
                    onValueChange={(value) => setValue('contract_type', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecteer type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="permanent">Vast</SelectItem>
                      <SelectItem value="temporary">Tijdelijk</SelectItem>
                      <SelectItem value="freelance">ZZP</SelectItem>
                      <SelectItem value="intern">Stagiair</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="hours_per_week">Uren per week</Label>
                  <Input
                    id="hours_per_week"
                    type="number"
                    {...register('hours_per_week', { valueAsNumber: true })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="start_date">Startdatum</Label>
                  <Input id="start_date" type="date" {...register('start_date')} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="end_date">Einddatum</Label>
                  <Input id="end_date" type="date" {...register('end_date')} />
                </div>
              </div>
            </TabsContent>

            {/* Emergency Tab */}
            <TabsContent value="emergency" className="space-y-4 mt-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="emergency_contact_name">Naam noodcontact</Label>
                  <Input
                    id="emergency_contact_name"
                    placeholder="Volledige naam"
                    {...register('emergency_contact_name')}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="emergency_contact_phone">Telefoon noodcontact</Label>
                  <Input
                    id="emergency_contact_phone"
                    placeholder="+31 6 12345678"
                    {...register('emergency_contact_phone')}
                  />
                </div>
              </div>
            </TabsContent>

            {/* Notes Tab */}
            <TabsContent value="notes" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="notes">Interne notities</Label>
                <Textarea
                  id="notes"
                  rows={8}
                  placeholder="Interne notities over deze medewerker..."
                  {...register('notes')}
                />
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuleren
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Opslaan
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
