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
import { Plus, CalendarIcon, ChevronRight, ChevronLeft, AlertTriangle, CheckCircle2, Shield, Info, Lightbulb } from 'lucide-react';
import { z } from 'zod';
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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

const ziekmeldingSchema = z.object({
  employee_id: z.string().uuid('Selecteer een medewerker'),
  start_date: z.string().min(1, 'Start datum is verplicht'),
  functional_limitations: z
    .string()
    .trim()
    .min(5, 'Functionele beperkingen moeten minimaal 5 karakters zijn')
    .max(500),
  expected_recovery_date: z.string().min(1, 'Verwachte betermelding is verplicht'),
  availability_notes: z.string().max(1000).optional(),
  can_work_partial: z.boolean().optional(),
  partial_work_description: z.string().max(500).optional(),
});

type ZiekmeldingFormData = z.infer<typeof ziekmeldingSchema>;

interface ZiekmeldingWizardProps {
  onSubmit: (data: ZiekmeldingFormData) => Promise<string | undefined>;
}

interface Employee {
  id: string;
  voornaam: string;
  achternaam: string;
  email: string;
  user_roles?: { role: string }[] | null;
}

type ProfileWithRoles = {
  id: string;
  voornaam: string;
  achternaam: string;
  email: string;
  user_roles: { role: string }[] | null;
};

// Templates voor veelvoorkomende functionele beperkingen
const functionalLimitationTemplates = [
  {
    id: 'fysiek-licht',
    label: 'Fysieke beperking (licht)',
    description: 'Kan niet langdurig staan of lopen, geen zware tilwerkzaamheden, beperkte mobiliteit. Wel in staat tot zittend werk en lichte administratieve taken.',
  },
  {
    id: 'fysiek-zwaar',
    label: 'Fysieke beperking (ernstig)',
    description: 'Volledig arbeidsongeschikt voor fysiek werk. Rust noodzakelijk. Contact mogelijk voor korte gesprekken.',
  },
  {
    id: 'mentaal-licht',
    label: 'Mentale beperking (licht)',
    description: 'Verminderde concentratie en energie. Kan geen complexe taken uitvoeren. Wel geschikt voor lichte, gestructureerde werkzaamheden met beperkte uren.',
  },
  {
    id: 'mentaal-zwaar',
    label: 'Mentale beperking (ernstig)',
    description: 'Niet in staat tot werken. Beperkt contact mogelijk. Rust en herstel hebben prioriteit.',
  },
  {
    id: 'combinatie',
    label: 'Gecombineerde beperking',
    description: 'Zowel fysieke als mentale beperkingen. Niet in staat tot regulier werk. Geleidelijke opbouw mogelijk na medische evaluatie.',
  },
];

// Privacy-compliance richtlijnen
const TOEGESTANE_VRAGEN = [
  'Hoe lang denk je afwezig te zijn?',
  'Heb je lopende afspraken die overgedragen moeten worden?',
  'Ben je in staat om gedeeltelijk te werken?',
  'Welk werk zou je eventueel nog wel kunnen doen?',
  'Hoe kunnen we je bereiken?',
  'Zijn er aanpassingen nodig bij terugkeer?',
];

const VERBODEN_VRAGEN = [
  'Wat is je diagnose of ziekte?',
  'Welke medicijnen gebruik je?',
  'Wat is de oorzaak van je ziekte?',
  'Ben je bij een arts geweest en wat zei die?',
  'Heb je dit eerder gehad?',
  'Is het werk-gerelateerd? (alleen bedrijfsarts mag dit vragen)',
];

const WIZARD_STEPS = [
  { id: 'intro', title: 'Privacy Richtlijnen', icon: Shield },
  { id: 'medewerker', title: 'Medewerker', icon: CheckCircle2 },
  { id: 'beperkingen', title: 'Functionele Beperkingen', icon: Info },
  { id: 'beschikbaarheid', title: 'Beschikbaarheid', icon: Lightbulb },
  { id: 'bevestiging', title: 'Bevestiging', icon: CheckCircle2 },
];

export function ZiekmeldingWizard({ onSubmit }: ZiekmeldingWizardProps) {
  const [open, setOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [formData, setFormData] = useState<ZiekmeldingFormData>({
    employee_id: '',
    start_date: new Date().toISOString().split('T')[0],
    functional_limitations: '',
    expected_recovery_date: '',
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
        .select(`
          id,
          voornaam,
          achternaam,
          email,
          user_roles(role)
        `)
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
      setCurrentStep(0);
      setSelectedTemplate(null);
      setFormData({
        employee_id: '',
        start_date: new Date().toISOString().split('T')[0],
        functional_limitations: '',
        expected_recovery_date: '',
        availability_notes: '',
        can_work_partial: false,
        partial_work_description: '',
      });
      setErrors({});
    }
  }, [open, loadEmployees]);

  const handleTemplateSelect = (templateId: string) => {
    const template = functionalLimitationTemplates.find(t => t.id === templateId);
    if (template) {
      setSelectedTemplate(templateId);
      setFormData(prev => ({
        ...prev,
        functional_limitations: template.description,
      }));
    }
  };

  const validateCurrentStep = (): boolean => {
    const newErrors: Record<string, string> = {};

    switch (currentStep) {
      case 1: // Medewerker stap
        if (!formData.employee_id) {
          newErrors.employee_id = 'Selecteer een medewerker';
        }
        if (!formData.start_date) {
          newErrors.start_date = 'Selecteer de eerste ziektedag';
        }
        break;
      case 2: // Beperkingen stap
        if (!formData.functional_limitations || formData.functional_limitations.length < 5) {
          newErrors.functional_limitations = 'Beschrijf de functionele beperkingen (min 5 karakters)';
        }
        if (!formData.expected_recovery_date) {
          newErrors.expected_recovery_date = 'Selecteer verwachte hersteldatum';
        }
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (currentStep === 0 || validateCurrentStep()) {
      setCurrentStep(prev => Math.min(prev + 1, WIZARD_STEPS.length - 1));
    }
  };

  const handleBack = () => {
    setCurrentStep(prev => Math.max(prev - 1, 0));
  };

  const handleSubmit = async () => {
    try {
      setSubmitting(true);
      const validated = ziekmeldingSchema.parse(formData);
      const caseId = await onSubmit(validated);

      if (!caseId) {
        throw new Error('Case ID niet ontvangen');
      }

      const selectedEmployee = employees.find(emp => emp.id === validated.employee_id);

      toast({
        title: 'Ziekmelding geregistreerd',
        description: `Ziekmelding voor ${selectedEmployee?.voornaam ?? ''} ${selectedEmployee?.achternaam ?? ''} is succesvol aangemaakt.`,
      });

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
          title: 'Fout bij registreren',
          description: 'Er ging iets mis bij het opslaan van de ziekmelding.',
        });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const selectedEmployee = employees.find(emp => emp.id === formData.employee_id);
  const progress = ((currentStep + 1) / WIZARD_STEPS.length) * 100;

  const renderStepContent = () => {
    switch (currentStep) {
      case 0: // Privacy Intro
        return (
          <div className="space-y-6">
            <Alert className="border-primary/50 bg-primary/5">
              <Shield className="h-4 w-4 text-primary" />
              <AlertTitle>Privacy-compliant registreren</AlertTitle>
              <AlertDescription>
                Bij het registreren van een ziekmelding moet u rekening houden met de AVG en Wet Poortwachter. 
                Deze wizard helpt u bij het stellen van de juiste vragen.
              </AlertDescription>
            </Alert>

            <div className="grid gap-4 md:grid-cols-2">
              <Card className="border-green-200 bg-green-50/50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2 text-green-700">
                    <CheckCircle2 className="h-4 w-4" />
                    Toegestane vragen
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm text-green-800">
                    {TOEGESTANE_VRAGEN.map((vraag, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <span className="text-green-600 mt-0.5">•</span>
                        {vraag}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              <Card className="border-red-200 bg-red-50/50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2 text-red-700">
                    <AlertTriangle className="h-4 w-4" />
                    Verboden vragen
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm text-red-800">
                    {VERBODEN_VRAGEN.map((vraag, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <span className="text-red-600 mt-0.5">•</span>
                        {vraag}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </div>

            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription className="text-sm">
                <strong>Belangrijk:</strong> Alleen de bedrijfsarts mag medische informatie opvragen. 
                U noteert alleen wat de medewerker vrijwillig deelt over functionele beperkingen.
              </AlertDescription>
            </Alert>
          </div>
        );

      case 1: // Medewerker selectie
        return (
          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="employee_id" className="text-base font-medium">
                Welke medewerker wilt u ziekmelden? *
              </Label>
              <Select
                value={formData.employee_id}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, employee_id: value }))
                }
              >
                <SelectTrigger className="h-12">
                  <SelectValue
                    placeholder={loadingEmployees ? 'Laden...' : 'Selecteer medewerker'}
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
              <Label htmlFor="start_date" className="text-base font-medium">
                Wat is de eerste ziektedag? *
              </Label>
              <Input
                id="start_date"
                type="date"
                className="h-12"
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

            {selectedEmployee && (
              <Alert className="border-primary/30 bg-primary/5">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                <AlertDescription>
                  U registreert een ziekmelding voor <strong>{selectedEmployee.voornaam} {selectedEmployee.achternaam}</strong>
                </AlertDescription>
              </Alert>
            )}
          </div>
        );

      case 2: // Functionele beperkingen
        return (
          <div className="space-y-6">
            <div className="space-y-3">
              <Label className="text-base font-medium">
                Kies een template of schrijf zelf
              </Label>
              <div className="grid gap-2">
                {functionalLimitationTemplates.map((template) => (
                  <Card
                    key={template.id}
                    className={cn(
                      "cursor-pointer transition-all hover:border-primary/50",
                      selectedTemplate === template.id && "border-primary bg-primary/5"
                    )}
                    onClick={() => handleTemplateSelect(template.id)}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-center gap-2">
                        <div className={cn(
                          "h-4 w-4 rounded-full border-2 flex items-center justify-center",
                          selectedTemplate === template.id ? "border-primary bg-primary" : "border-muted-foreground"
                        )}>
                          {selectedTemplate === template.id && (
                            <div className="h-2 w-2 rounded-full bg-white" />
                          )}
                        </div>
                        <span className="font-medium text-sm">{template.label}</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="functional_limitations" className="text-base font-medium">
                Functionele beperkingen *
              </Label>
              <Textarea
                id="functional_limitations"
                value={formData.functional_limitations}
                onChange={(e) => {
                  setFormData((prev) => ({
                    ...prev,
                    functional_limitations: e.target.value,
                  }));
                  setSelectedTemplate(null);
                }}
                placeholder="Beschrijf wat de medewerker wel en niet kan doen..."
                rows={4}
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground">
                Let op: beschrijf alleen functionele beperkingen, geen medische diagnoses
              </p>
              {errors.functional_limitations && (
                <p className="text-sm text-destructive">{errors.functional_limitations}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-base font-medium">
                Verwachte hersteldatum *
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full h-12 justify-start text-left font-normal",
                      !formData.expected_recovery_date && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.expected_recovery_date ? (
                      format(new Date(formData.expected_recovery_date), "PPP", { locale: nl })
                    ) : (
                      <span>Selecteer datum</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={formData.expected_recovery_date ? new Date(formData.expected_recovery_date) : undefined}
                    onSelect={(date) => {
                      if (date) {
                        setFormData((prev) => ({
                          ...prev,
                          expected_recovery_date: date.toISOString().split('T')[0],
                        }));
                      }
                    }}
                    disabled={(date) => date < new Date(formData.start_date)}
                    initialFocus
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
              {errors.expected_recovery_date && (
                <p className="text-sm text-destructive">{errors.expected_recovery_date}</p>
              )}
            </div>
          </div>
        );

      case 3: // Beschikbaarheid
        return (
          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="availability_notes" className="text-base font-medium">
                Hoe is de medewerker bereikbaar?
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
                placeholder="Bijv: Bereikbaar op mobiel tussen 10:00-16:00, bij voorkeur via WhatsApp"
                rows={3}
              />
            </div>

            <div className="space-y-4">
              <div className="flex items-center space-x-3 p-4 border rounded-lg">
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
                <div className="space-y-1">
                  <Label htmlFor="can_work_partial" className="text-sm font-medium cursor-pointer">
                    Medewerker kan gedeeltelijk werken
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Vink aan als de medewerker aangepast werk kan doen
                  </p>
                </div>
              </div>

              {formData.can_work_partial && (
                <div className="space-y-2 pl-4 border-l-2 border-primary/30">
                  <Label htmlFor="partial_work_description" className="text-sm font-medium">
                    Welk werk kan de medewerker wel doen?
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
                    placeholder="Bijv: Administratief werk, max 4 uur per dag, geen klantcontact"
                    rows={3}
                  />
                </div>
              )}
            </div>

            <Alert className="border-amber-200 bg-amber-50/50">
              <Lightbulb className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-sm text-amber-800">
                <strong>Tip:</strong> Bespreek met de medewerker of er mogelijkheden zijn voor aangepast werk. 
                Dit helpt bij re-integratie en is onderdeel van goed werkgeverschap.
              </AlertDescription>
            </Alert>
          </div>
        );

      case 4: // Bevestiging
        return (
          <div className="space-y-6">
            <Alert className="border-green-200 bg-green-50/50">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertTitle className="text-green-700">Controleer de gegevens</AlertTitle>
              <AlertDescription className="text-green-800">
                Controleer of alle informatie correct is voordat u de ziekmelding registreert.
              </AlertDescription>
            </Alert>

            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Medewerker</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="font-medium">
                    {selectedEmployee?.voornaam} {selectedEmployee?.achternaam}
                  </p>
                  <p className="text-sm text-muted-foreground">{selectedEmployee?.email}</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Periode</CardTitle>
                </CardHeader>
                <CardContent className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Eerste ziektedag:</span>
                    <span className="font-medium">
                      {formData.start_date && format(new Date(formData.start_date), "d MMMM yyyy", { locale: nl })}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Verwacht herstel:</span>
                    <span className="font-medium">
                      {formData.expected_recovery_date && format(new Date(formData.expected_recovery_date), "d MMMM yyyy", { locale: nl })}
                    </span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Functionele beperkingen</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm">{formData.functional_limitations}</p>
                </CardContent>
              </Card>

              {formData.can_work_partial && (
                <Card className="border-primary/30">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      Gedeeltelijk werken
                      <Badge variant="secondary" className="text-xs">Ja</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm">{formData.partial_work_description || 'Geen beschrijving'}</p>
                  </CardContent>
                </Card>
              )}

              {formData.availability_notes && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Bereikbaarheid</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm">{formData.availability_notes}</p>
                  </CardContent>
                </Card>
              )}
            </div>

            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription className="text-sm">
                Na registratie worden automatisch taken aangemaakt volgens het Wet Poortwachter schema.
              </AlertDescription>
            </Alert>
          </div>
        );

      default:
        return null;
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
      <DialogContent className="sm:max-w-[700px] h-[95vh] sm:h-auto sm:max-h-[90vh] flex flex-col p-0 gap-0">
        <div className="flex-shrink-0 px-4 sm:px-6 pt-4 sm:pt-6">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle>Ziekmelding Registreren</DialogTitle>
                <DialogDescription>
                  Stap {currentStep + 1} van {WIZARD_STEPS.length}: {WIZARD_STEPS[currentStep].title}
                </DialogDescription>
              </div>
            </div>
            <Progress value={progress} className="h-2 mt-4" />
          </DialogHeader>

          {/* Step indicators */}
          <div className="flex justify-center gap-1 sm:gap-2 py-3 overflow-x-auto">
            {WIZARD_STEPS.map((step, index) => {
              const Icon = step.icon;
              return (
                <div
                  key={step.id}
                  className={cn(
                    "flex items-center gap-1 px-2 py-1 rounded-full text-xs transition-colors flex-shrink-0",
                    index === currentStep
                      ? "bg-primary text-primary-foreground"
                      : index < currentStep
                      ? "bg-primary/20 text-primary"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  <Icon className="h-3 w-3" />
                  <span className="hidden sm:inline">{step.title}</span>
                </div>
              );
            })}
          </div>
        </div>

        <ScrollArea className="flex-1 min-h-0 px-4 sm:px-6">
          <div className="py-4">
            {renderStepContent()}
          </div>
        </ScrollArea>

        <div className="flex-shrink-0 flex justify-between p-4 sm:px-6 sm:pb-6 border-t bg-background">
          <Button
            type="button"
            variant="outline"
            onClick={handleBack}
            disabled={currentStep === 0}
            className="gap-2"
          >
            <ChevronLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Vorige</span>
          </Button>

          {currentStep < WIZARD_STEPS.length - 1 ? (
            <Button onClick={handleNext} className="gap-2">
              <span className="hidden sm:inline">Volgende</span>
              <span className="sm:hidden">Verder</span>
              <ChevronRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={submitting} className="gap-2">
              {submitting ? 'Bezig...' : 'Registreren'}
              <CheckCircle2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
