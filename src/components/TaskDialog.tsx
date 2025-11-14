import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Plus } from 'lucide-react';

interface TaskDialogProps {
  onSubmit: (data: {
    titel: string;
    beschrijving: string;
    deadline: string;
    toegewezen_aan?: string;
  }) => void;
}

export function TaskDialog({ onSubmit }: TaskDialogProps) {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    titel: '',
    beschrijving: '',
    deadline: '',
    toegewezen_aan: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      toegewezen_aan: formData.toegewezen_aan || undefined,
    });
    setFormData({ titel: '', beschrijving: '', deadline: '', toegewezen_aan: '' });
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Nieuwe taak
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Nieuwe taak toevoegen</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="titel">Titel *</Label>
            <Input
              id="titel"
              value={formData.titel}
              onChange={(e) => setFormData({ ...formData, titel: e.target.value })}
              required
            />
          </div>
          <div>
            <Label htmlFor="beschrijving">Beschrijving *</Label>
            <Textarea
              id="beschrijving"
              value={formData.beschrijving}
              onChange={(e) => setFormData({ ...formData, beschrijving: e.target.value })}
              required
            />
          </div>
          <div>
            <Label htmlFor="deadline">Deadline *</Label>
            <Input
              id="deadline"
              type="date"
              value={formData.deadline}
              onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
              required
            />
          </div>
          <div>
            <Label htmlFor="toegewezen_aan">Toegewezen aan</Label>
            <Input
              id="toegewezen_aan"
              value={formData.toegewezen_aan}
              onChange={(e) => setFormData({ ...formData, toegewezen_aan: e.target.value })}
              placeholder="Naam medewerker (optioneel)"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Annuleren
            </Button>
            <Button type="submit">Taak toevoegen</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
