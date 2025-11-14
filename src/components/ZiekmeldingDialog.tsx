import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
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

const ziekmeldingSchema = z.object({
  medewerker_naam: z.string().trim().min(2, 'Naam moet minimaal 2 karakters zijn').max(100),
  start_datum: z.string().min(1, 'Start datum is verplicht'),
  reden: z.string().trim().min(5, 'Reden moet minimaal 5 karakters zijn').max(500),
  notities: z.string().max(1000).optional(),
});

type ZiekmeldingFormData = z.infer<typeof ziekmeldingSchema>;

interface ZiekmeldingDialogProps {
  onSubmit: (data: ZiekmeldingFormData) => void;
}

export function ZiekmeldingDialog({ onSubmit }: ZiekmeldingDialogProps) {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState<ZiekmeldingFormData>({
    medewerker_naam: '',
    start_datum: new Date().toISOString().split('T')[0],
    reden: '',
    notities: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { toast } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const validated = ziekmeldingSchema.parse(formData);
      onSubmit(validated);
      
      toast({
        title: 'Ziekmelding geregistreerd',
        description: `Ziekmelding voor ${validated.medewerker_naam} is succesvol aangemaakt.`,
      });
      
      // Reset form
      setFormData({
        medewerker_naam: '',
        start_datum: new Date().toISOString().split('T')[0],
        reden: '',
        notities: '',
      });
      setErrors({});
      setOpen(false);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            newErrors[err.path[0].toString()] = err.message;
          }
        });
        setErrors(newErrors);
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
      <DialogContent className="sm:max-w-[600px] max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Nieuwe ziekmelding registreren</DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[calc(90vh-8rem)] pr-4">
          <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="medewerker_naam">Naam medewerker *</Label>
            <Input
              id="medewerker_naam"
              value={formData.medewerker_naam}
              onChange={(e) => setFormData({ ...formData, medewerker_naam: e.target.value })}
              placeholder="Bijv. Jan Jansen"
            />
            {errors.medewerker_naam && (
              <p className="text-sm text-destructive">{errors.medewerker_naam}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="start_datum">Start datum *</Label>
            <Input
              id="start_datum"
              type="date"
              value={formData.start_datum}
              onChange={(e) => setFormData({ ...formData, start_datum: e.target.value })}
            />
            {errors.start_datum && (
              <p className="text-sm text-destructive">{errors.start_datum}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="reden">Reden ziekmelding *</Label>
            <Textarea
              id="reden"
              value={formData.reden}
              onChange={(e) => setFormData({ ...formData, reden: e.target.value })}
              placeholder="Korte beschrijving van de klachten"
              rows={3}
            />
            {errors.reden && (
              <p className="text-sm text-destructive">{errors.reden}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="notities">Extra notities (optioneel)</Label>
            <Textarea
              id="notities"
              value={formData.notities}
              onChange={(e) => setFormData({ ...formData, notities: e.target.value })}
              placeholder="Aanvullende informatie"
              rows={2}
            />
            {errors.notities && (
              <p className="text-sm text-destructive">{errors.notities}</p>
            )}
          </div>

          <Alert className="border-primary/50">
            <Info className="h-4 w-4" />
            <AlertTitle>Wet Poortwachter - Automatische taken</AlertTitle>
            <AlertDescription className="mt-2">
              <p className="text-sm mb-2">Bij deze ziekmelding worden automatisch de volgende taken aangemaakt volgens de Wet Poortwachter:</p>
              <ul className="space-y-1 text-sm">
                {defaultTaskTemplates.map((template, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="text-muted-foreground min-w-[60px]">Dag {template.deadlineDays}:</span>
                    <span>{template.titel}</span>
                  </li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Annuleren
            </Button>
            <Button type="submit">Ziekmelding registreren</Button>
          </div>
        </form>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
