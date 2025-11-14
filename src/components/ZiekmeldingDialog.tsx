import { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Plus, Info } from 'lucide-react';
import { z } from 'zod';
import { defaultTaskTemplates } from '@/lib/taskTemplates';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';

const ziekmeldingSchema = z.object({
  employee_id: z.string().uuid('Selecteer een medewerker'),
  start_date: z.string().min(1, 'Start datum is verplicht'),
  functional_limitations: z
    .string()
    .trim()
    .min(5, 'Functionele beperkingen moeten minimaal 5 karakters zijn')
    .max(500),
  expected_duration: z.string().optional(),
  availability_notes: z.string().max(1000).optional(),
  can_work_partial: z.boolean().optional(),
  partial_work_description: z.string().max(500).optional(),
});

type ZiekmeldingFormData = z.infer<typeof ziekmeldingSchema>;

interface ZiekmeldingDialogProps {
  onSubmit: (data: ZiekmeldingFormData) => void | Promise<void>;
}

interface Employee {
  id: string;
  voornaam: string;
  achternaam: string;
  email: string;
  user_roles?: { role: string }[] | null;
}

// Shape van de Supabase-response voor deze query
type ProfileWithRoles = {
  id: string;
  voornaam: string;
  achternaam: string;
  email: string;
  user_roles: { role: string }[] | null;
};

export function ZiekmeldingDialog({ onSubmit }: ZiekmeldingDialogProps) {
  const [open, setOpen] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [formData, setFormData] = useState<ZiekmeldingFormData>({
    employee_id: '',
    start_date: new Date().toISOString().split('T')[0],
    functional_limitations: '',
    expected_duration: '',
    availability_notes: '',
    can_work_partial: false,
    partial_work_description: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { toast } = useToast();

  const loadEmployees = useCallback(async () => {
    setLoadingEmployees(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        // Gebruik de relationele select, maar forceer het type met .returns<>
        .select(
          `
          id,
          voornaam,
          achternaam,
          email,
          user_roles(role)
        `
        )
        .returns<ProfileWithRoles[]>();

      if (error) throw error;

      const list = Array.isArray(data) ? data : [];

      const medewerkers: Employee[] = list.filter((emp) =>
        Array.isArray(emp.user_roles)
          ? emp.user_roles.some((r) => r.role === 'medewerker')
          : false
      );

      setEmployees(medewerkers);
    } catch (error) {
      console.error('Error loading employees:', error);
      toast({
        variant: 'destructive',
        title: 'Fout bij laden medewerkers',
        description: 'Kon medewerkers niet laden',
      });
    } finally {
      setLoadingEmployees(false);
    }
  }, [toast]);

  useEffect(() => {
    if (open) {
      void loadEmployees();
    }
  }, [open, loadEmployees]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const validated = ziekmeldingSchema.parse(formData);
      await onSubmit(validated);

      const selectedEmployee = employees.find(
        (emp) => emp.id === validated.employee_id
      );

      toast({
        title: 'Ziekmelding geregistreerd',
        description: `Ziekmelding voor ${selectedEmployee?.voornaam ?? ''} ${
          selectedEmployee?.achternaam ?? ''
        } is succesvol aangemaakt.`,
      });

      // Reset form
      setFormData({
        employee_id: '',
        start_date: new Date().toISOString().split('T')[0],
        functional_limitations: '',
        expected_duration: '',
        availability_notes: '',
        can_work_partial: false,
        partial_work_description: '',
      });
      setErrors({});
      setOpen(false);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          const key = err.path[0];
          if (key) {
            newErrors[String(key)] = err.message;
          }
        });
        setErrors(newErrors);
      } else {
        console.error('Error submitting ziekmelding:', error);
        toast({
          variant: 'destructive',
          title: 'Fout bij registreren ziekmelding',
          description: 'Er ging iets mis bij het opslaan van de ziekmelding.',
        });
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Nieuwe ziekmelding
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Nieuwe ziekmelding registreren</DialogTitle>
          <DialogDescription>
            Registreer een nieuwe ziekmelding volgens de Wet Poortwachter
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[calc(90vh-8rem)] pr-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="employee_id">Medewerker *</Label>
              <Select
                value={formData.employee_id}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, employee_id: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      loadingEmployees ? 'Laden...' : 'Selecteer medewerker'
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.voornaam} {emp.achternaam} ({emp.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.employee_id && (
                <p className="text-sm text-destructive">{errors.employee_id}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="start_date">Eerste ziektedag *</Label>
              <Input
                id="start_date"
                type="date"
                value={formData.start_date}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    start_date: e.target.value,
                  }))
                }
              />
              {errors.start_date && (
                <p className="text-sm text-destructive">{errors.start_date}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="functional_limitations">
                Functionele beperkingen *
              </Label>
              <Textarea
                id="functional_limitations"
                value={formData.functional_limitations}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    functional_limitations: e.target.value,
                  }))
                }
                placeholder="Bijv: Kan niet langdurig staan, geen zware tilwerkzaamheden, beperkte concentratie"
                rows={3}
              />
              <p className="text-xs text-muted-foreground">
                Beschrijf wat de medewerker WEL en NIET kan doen, geen medische
                diagnose
              </p>
              {errors.functional_limitations && (
                <p className="text-sm text-destructive">
                  {errors.functional_limitations}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="expected_duration">
                Verwachte duur (optioneel)
              </Label>
              <Input
                id="expected_duration"
                value={formData.expected_duration ?? ''}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    expected_duration: e.target.value,
                  }))
                }
                placeholder="Bijv: 1-2 weken"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="availability_notes">
                Bereikbaarheid (optioneel)
              </Label>
              <Textarea
                id="availability_notes"
                value={formData.availability_notes ?? ''}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    availability_notes: e.target.value,
                  }))
                }
                placeholder="Bijv: Bereikbaar tussen 9-17 uur op mobiel"
                rows={2}
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="can_work_partial"
                  checked={!!formData.can_work_partial}
                  onCheckedChange={(checked) =>
                    setFormData((prev) => ({
                      ...prev,
                      can_work_partial: Boolean(checked),
                    }))
                  }
                />
                <Label
                  htmlFor="can_work_partial"
                  className="text-sm font-normal cursor-pointer"
                >
                  Medewerker kan gedeeltelijk werken
                </Label>
              </div>

              {formData.can_work_partial && (
                <div className="space-y-2 pl-6">
                  <Label htmlFor="partial_work_description">
                    Beschrijving gedeeltelijk werken
                  </Label>
                  <Textarea
                    id="partial_work_description"
                    value={formData.partial_work_description ?? ''}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        partial_work_description: e.target.value,
                      }))
                    }
                  />
                </div>
              )}
            </div>
            {/* einde formulier */}
          </form>
        </ScrollArea>
      </DialogContent>
          </Dialog>
        );
    }
