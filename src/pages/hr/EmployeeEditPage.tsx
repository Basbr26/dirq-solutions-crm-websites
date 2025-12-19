import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';
import { nl } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { z } from 'zod';
import {
  ArrowLeft,
  Save,
  User,
  Briefcase,
  MapPin,
  Phone,
  CreditCard,
  Calendar as CalendarIcon,
  Loader2,
} from 'lucide-react';

const employeeSchema = z.object({
  voornaam: z.string().min(1, 'Voornaam is verplicht').max(100),
  achternaam: z.string().min(1, 'Achternaam is verplicht').max(100),
  email: z.string().email('Ongeldig e-mailadres').max(255),
  telefoon: z.string().max(20).optional().or(z.literal('')),
  functie: z.string().max(100).optional().or(z.literal('')),
  employee_number: z.string().max(50).optional().or(z.literal('')),
  date_of_birth: z.date().optional().nullable(),
  start_date: z.date().optional().nullable(),
  end_date: z.date().optional().nullable(),
  contract_type: z.string().optional(),
  hours_per_week: z.number().min(0).max(60).optional().nullable(),
  employment_status: z.string().optional(),
  department_id: z.string().uuid().optional().nullable(),
  manager_id: z.string().uuid().optional().nullable(),
  address: z.string().max(200).optional().or(z.literal('')),
  postal_code: z.string().max(10).optional().or(z.literal('')),
  city: z.string().max(100).optional().or(z.literal('')),
  emergency_contact_name: z.string().max(100).optional().or(z.literal('')),
  emergency_contact_phone: z.string().max(20).optional().or(z.literal('')),
  bank_account: z.string().max(34).optional().or(z.literal('')),
  notes: z.string().max(2000).optional().or(z.literal('')),
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

export default function EmployeeEditPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [managers, setManagers] = useState<Manager[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const [formData, setFormData] = useState<EmployeeFormData>({
    voornaam: '',
    achternaam: '',
    email: '',
    telefoon: '',
    functie: '',
    employee_number: '',
    date_of_birth: null,
    start_date: null,
    end_date: null,
    contract_type: 'fulltime',
    hours_per_week: 40,
    employment_status: 'actief',
    department_id: null,
    manager_id: null,
    address: '',
    postal_code: '',
    city: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    bank_account: '',
    notes: '',
  });

  useEffect(() => {
    if (id) {
      loadData();
    }
  }, [id]);

  const loadData = async () => {
    try {
      const [employeeResult, deptResult, managerResult] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', id).maybeSingle(),
        supabase.from('departments').select('id, name').order('name'),
        supabase.from('profiles').select('id, voornaam, achternaam').order('achternaam'),
      ]);

      if (deptResult.data) setDepartments(deptResult.data);
      if (managerResult.data) setManagers(managerResult.data);

      if (employeeResult.error) throw employeeResult.error;
      
      if (!employeeResult.data) {
        toast.error('Medewerker niet gevonden');
        navigate('/hr/medewerkers');
        return;
      }

      const emp = employeeResult.data;
      setFormData({
        voornaam: emp.voornaam || '',
        achternaam: emp.achternaam || '',
        email: emp.email || '',
        telefoon: emp.telefoon || '',
        functie: emp.functie || '',
        employee_number: emp.employee_number || '',
        date_of_birth: emp.date_of_birth ? parseISO(emp.date_of_birth) : null,
        start_date: emp.start_date ? parseISO(emp.start_date) : null,
        end_date: emp.end_date ? parseISO(emp.end_date) : null,
        contract_type: emp.contract_type || 'fulltime',
        hours_per_week: emp.hours_per_week || 40,
        employment_status: emp.employment_status || 'actief',
        department_id: emp.department_id || null,
        manager_id: emp.manager_id || null,
        address: emp.address || '',
        postal_code: emp.postal_code || '',
        city: emp.city || '',
        emergency_contact_name: emp.emergency_contact_name || '',
        emergency_contact_phone: emp.emergency_contact_phone || '',
        bank_account: emp.bank_account || '',
        notes: emp.notes || '',
      });
    } catch (error) {
      console.error('Error loading employee:', error);
      const errorMessage = error instanceof Error ? error.message : 'Onbekende fout';
      toast.error(`Fout bij laden medewerker: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    try {
      const validatedData = employeeSchema.parse(formData);
      setSaving(true);

      const { error } = await supabase
        .from('profiles')
        .update({
          voornaam: validatedData.voornaam,
          achternaam: validatedData.achternaam,
          email: validatedData.email,
          telefoon: validatedData.telefoon || null,
          functie: validatedData.functie || null,
          employee_number: validatedData.employee_number || null,
          date_of_birth: validatedData.date_of_birth ? format(validatedData.date_of_birth, 'yyyy-MM-dd') : null,
          start_date: validatedData.start_date ? format(validatedData.start_date, 'yyyy-MM-dd') : null,
          end_date: validatedData.end_date ? format(validatedData.end_date, 'yyyy-MM-dd') : null,
          contract_type: validatedData.contract_type || null,
          hours_per_week: validatedData.hours_per_week || null,
          employment_status: validatedData.employment_status || 'actief',
          department_id: validatedData.department_id || null,
          manager_id: validatedData.manager_id || null,
          address: validatedData.address || null,
          postal_code: validatedData.postal_code || null,
          city: validatedData.city || null,
          emergency_contact_name: validatedData.emergency_contact_name || null,
          emergency_contact_phone: validatedData.emergency_contact_phone || null,
          bank_account: validatedData.bank_account || null,
          notes: validatedData.notes || null,
        })
        .eq('id', id);

      if (error) throw error;

      toast.success('Medewerker succesvol bijgewerkt');
      navigate(`/hr/medewerkers/${id}`);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            fieldErrors[err.path[0].toString()] = err.message;
          }
        });
        setErrors(fieldErrors);
        toast.error('Controleer de invoervelden');
      } else {
        console.error('Error updating employee:', error);
        toast.error('Fout bij bijwerken medewerker');
      }
    } finally {
      setSaving(false);
    }
  };

  const updateField = <K extends keyof EmployeeFormData>(
    field: K,
    value: EmployeeFormData[K]
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const updated = { ...prev };
        delete updated[field];
        return updated;
      });
    }
  };

  const DatePickerField = ({
    label,
    value,
    onChange,
    error,
  }: {
    label: string;
    value: Date | null | undefined;
    onChange: (date: Date | undefined) => void;
    error?: string;
  }) => (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              'w-full justify-start text-left font-normal',
              !value && 'text-muted-foreground',
              error && 'border-destructive'
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {value ? format(value, 'd MMMM yyyy', { locale: nl }) : 'Selecteer datum'}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={value || undefined}
            onSelect={onChange}
            locale={nl}
            initialFocus
          />
        </PopoverContent>
      </Popover>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );

  if (loading) {
    return (
      <AppLayout title="Medewerker bewerken">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout
      title="Medewerker bewerken"
      subtitle={`${formData.voornaam} ${formData.achternaam}`}
    >
      <div className="p-4 md:p-6 max-w-4xl mx-auto">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(`/hr/medewerkers/${id}`)}
          className="gap-2 mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Terug naar profiel
        </Button>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Personal Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Persoonlijke gegevens
              </CardTitle>
              <CardDescription>Basisinformatie van de medewerker</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="voornaam">Voornaam *</Label>
                <Input
                  id="voornaam"
                  value={formData.voornaam}
                  onChange={(e) => updateField('voornaam', e.target.value)}
                  className={cn(errors.voornaam && 'border-destructive')}
                />
                {errors.voornaam && <p className="text-sm text-destructive">{errors.voornaam}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="achternaam">Achternaam *</Label>
                <Input
                  id="achternaam"
                  value={formData.achternaam}
                  onChange={(e) => updateField('achternaam', e.target.value)}
                  className={cn(errors.achternaam && 'border-destructive')}
                />
                {errors.achternaam && <p className="text-sm text-destructive">{errors.achternaam}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">E-mailadres *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => updateField('email', e.target.value)}
                  className={cn(errors.email && 'border-destructive')}
                  disabled
                />
                <p className="text-xs text-muted-foreground">E-mail kan niet worden gewijzigd</p>
                {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="telefoon">Telefoonnummer</Label>
                <Input
                  id="telefoon"
                  type="tel"
                  inputMode="tel"
                  value={formData.telefoon}
                  onChange={(e) => updateField('telefoon', e.target.value)}
                />
              </div>

              <DatePickerField
                label="Geboortedatum"
                value={formData.date_of_birth}
                onChange={(date) => updateField('date_of_birth', date || null)}
                error={errors.date_of_birth}
              />

              <div className="space-y-2">
                <Label htmlFor="employee_number">Personeelsnummer</Label>
                <Input
                  id="employee_number"
                  value={formData.employee_number}
                  onChange={(e) => updateField('employee_number', e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Employment Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="h-5 w-5" />
                Dienstverband
              </CardTitle>
              <CardDescription>Contract en functie informatie</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="functie">Functie</Label>
                <Input
                  id="functie"
                  value={formData.functie}
                  onChange={(e) => updateField('functie', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Afdeling</Label>
                <Select
                  value={formData.department_id || ''}
                  onValueChange={(v) => updateField('department_id', v || null)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecteer afdeling" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.filter(d => d.id && d.id.trim() !== '').map((dept) => (
                      <SelectItem key={dept.id} value={dept.id}>
                        {dept.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Leidinggevende</Label>
                <Select
                  value={formData.manager_id || ''}
                  onValueChange={(v) => updateField('manager_id', v || null)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecteer leidinggevende" />
                  </SelectTrigger>
                  <SelectContent>
                    {managers.filter(m => m.id !== id).map((mgr) => (
                      <SelectItem key={mgr.id} value={mgr.id}>
                        {mgr.voornaam} {mgr.achternaam}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Contracttype</Label>
                <Select
                  value={formData.contract_type}
                  onValueChange={(v) => updateField('contract_type', v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fulltime">Voltijd</SelectItem>
                    <SelectItem value="parttime">Deeltijd</SelectItem>
                    <SelectItem value="tijdelijk">Tijdelijk</SelectItem>
                    <SelectItem value="oproep">Oproep</SelectItem>
                    <SelectItem value="stage">Stage</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="hours_per_week">Uren per week</Label>
                <Input
                  id="hours_per_week"
                  type="number"
                  min={0}
                  max={60}
                  value={formData.hours_per_week || ''}
                  onChange={(e) => updateField('hours_per_week', e.target.value ? Number(e.target.value) : null)}
                />
              </div>

              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={formData.employment_status}
                  onValueChange={(v) => updateField('employment_status', v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sollicitant">Sollicitant</SelectItem>
                    <SelectItem value="actief">Actief</SelectItem>
                    <SelectItem value="met_verlof">Met verlof</SelectItem>
                    <SelectItem value="inactief">Inactief</SelectItem>
                    <SelectItem value="uit_dienst">Uit dienst</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <DatePickerField
                label="In dienst per"
                value={formData.start_date}
                onChange={(date) => updateField('start_date', date || null)}
              />

              <DatePickerField
                label="Uit dienst per"
                value={formData.end_date}
                onChange={(date) => updateField('end_date', date || null)}
              />
            </CardContent>
          </Card>

          {/* Address */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Adresgegevens
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2 space-y-2">
                <Label htmlFor="address">Straat en huisnummer</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => updateField('address', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="postal_code">Postcode</Label>
                <Input
                  id="postal_code"
                  inputMode="text"
                  value={formData.postal_code}
                  onChange={(e) => updateField('postal_code', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="city">Plaats</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) => updateField('city', e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Emergency Contact */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Phone className="h-5 w-5" />
                Noodcontact
              </CardTitle>
              <CardDescription>Contactpersoon in geval van nood</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="emergency_contact_name">Naam</Label>
                <Input
                  id="emergency_contact_name"
                  value={formData.emergency_contact_name}
                  onChange={(e) => updateField('emergency_contact_name', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="emergency_contact_phone">Telefoonnummer</Label>
                <Input
                  id="emergency_contact_phone"
                  type="tel"
                  inputMode="tel"
                  value={formData.emergency_contact_phone}
                  onChange={(e) => updateField('emergency_contact_phone', e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Financial */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Financieel
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-w-md">
                <Label htmlFor="bank_account">IBAN</Label>
                <Input
                  id="bank_account"
                  value={formData.bank_account}
                  onChange={(e) => updateField('bank_account', e.target.value.toUpperCase())}
                  placeholder="NL00 BANK 0000 0000 00"
                />
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          <Card>
            <CardHeader>
              <CardTitle>Notities</CardTitle>
              <CardDescription>Interne opmerkingen (alleen zichtbaar voor HR)</CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                value={formData.notes}
                onChange={(e) => updateField('notes', e.target.value)}
                rows={4}
                placeholder="Notities over deze medewerker..."
              />
            </CardContent>
          </Card>

          {/* Submit */}
          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate(`/hr/medewerkers/${id}`)}
            >
              Annuleren
            </Button>
            <Button type="submit" disabled={saving} className="gap-2">
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Opslaan
            </Button>
          </div>
        </form>
      </div>
    </AppLayout>
  );
}
