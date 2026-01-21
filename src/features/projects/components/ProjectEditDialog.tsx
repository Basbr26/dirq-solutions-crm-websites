import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';
import { Project } from '@/types/projects';
import { useUpdateProject } from '../hooks/useProjectMutations';
import { toast } from 'sonner';

interface ProjectEditDialogProps {
  project: Project;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProjectEditDialog({ project, open, onOpenChange }: ProjectEditDialogProps) {
  const { t } = useTranslation();
  const updateProject = useUpdateProject(project.id);
  
  const [value, setValue] = useState(project.value);
  const [expectedCloseDate, setExpectedCloseDate] = useState(project.expected_close_date || '');
  const [upsellInput, setUpsellInput] = useState('');
  const [upsells, setUpsells] = useState<string[]>(project.upsell_opportunities || []);

  const handleAddUpsell = () => {
    if (upsellInput.trim() && !upsells.includes(upsellInput.trim())) {
      setUpsells([...upsells, upsellInput.trim()]);
      setUpsellInput('');
    }
  };

  const handleRemoveUpsell = (upsell: string) => {
    setUpsells(upsells.filter(u => u !== upsell));
  };

  const handleSave = () => {
    updateProject.mutate(
      {
        value,
        expected_close_date: expectedCloseDate || undefined,
        upsell_opportunities: upsells.length > 0 ? upsells : undefined,
      },
      {
        onSuccess: () => {
          toast.success('Project bijgewerkt');
          onOpenChange(false);
        },
        onError: (error: Error) => {
          toast.error(t('errors.errorUpdating', { message: error.message }));
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Project Bewerken: {project.title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Value */}
          <div className="space-y-2">
            <Label htmlFor="value">Projectwaarde (€)</Label>
            <Input
              id="value"
              type="number"
              min="0"
              step="100"
              value={value}
              onChange={(e) => setValue(Number(e.target.value))}
            />
          </div>

          {/* Expected Close Date */}
          <div className="space-y-2">
            <Label htmlFor="expected_close_date">Verwachte Afsluiting</Label>
            <Input
              id="expected_close_date"
              type="date"
              value={expectedCloseDate}
              onChange={(e) => setExpectedCloseDate(e.target.value)}
            />
          </div>

          {/* Upsell Opportunities */}
          <div className="space-y-2">
            <Label>Upsell Kansen</Label>
            <p className="text-sm text-muted-foreground">
              Voeg mogelijke upsell kansen toe zoals "SEO pakket €500", "Logo design €350", "AI chatbot €1500"
            </p>
            
            {/* Current upsells */}
            {upsells.length > 0 && (
              <div className="flex flex-wrap gap-2 p-3 bg-muted rounded-md">
                {upsells.map((upsell, idx) => (
                  <Badge key={idx} variant="secondary" className="gap-1">
                    {upsell}
                    <button
                      onClick={() => handleRemoveUpsell(upsell)}
                      className="ml-1 hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}

            {/* Add new upsell */}
            <div className="flex gap-2">
              <Input
                placeholder="Bijv. SEO pakket €500"
                value={upsellInput}
                onChange={(e) => setUpsellInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddUpsell();
                  }
                }}
              />
              <Button 
                type="button" 
                variant="secondary" 
                onClick={handleAddUpsell}
                disabled={!upsellInput.trim()}
              >
                Toevoegen
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuleren
          </Button>
          <Button onClick={handleSave} disabled={updateProject.isPending}>
            {updateProject.isPending ? 'Opslaan...' : 'Opslaan'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
