import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus } from 'lucide-react';
import { defaultTaskTemplates } from '@/lib/taskTemplates';

interface TaskDialogProps {
  onSubmit: (data: {
    title: string;
    description: string;
    deadline: string;
    assigned_to?: string;
  }) => void;
}

export function TaskDialog({ onSubmit }: TaskDialogProps) {
  const [open, setOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('custom');
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    deadline: '',
    assigned_to: '',
  });

  const handleTemplateChange = (value: string) => {
    setSelectedTemplate(value);
    if (value === 'custom') {
      setFormData({
        title: '',
        description: '',
        deadline: '',
        assigned_to: '',
      });
    } else {
      const templateIndex = parseInt(value);
      const template = defaultTaskTemplates[templateIndex];
      const deadline = new Date();
      deadline.setDate(deadline.getDate() + template.deadlineDays);
      
      setFormData({
        title: template.title,
        description: template.description,
        deadline: deadline.toISOString().split('T')[0],
        assigned_to: '',
      });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      assigned_to: formData.assigned_to || undefined,
    });
    setFormData({ title: '', description: '', deadline: '', assigned_to: '' });
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
          <DialogDescription>
            Voeg een nieuwe taak toe aan dit verzuimdossier
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="template">Taak template</Label>
            <Select value={selectedTemplate} onValueChange={handleTemplateChange}>
              <SelectTrigger>
                <SelectValue placeholder="Kies een template of maak custom taak" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="custom">Aangepaste taak</SelectItem>
                {defaultTaskTemplates.map((template, index) => (
                  <SelectItem key={index} value={index.toString()}>
                    {template.title} (dag {template.deadlineDays})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="title">Titel *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
            />
          </div>
          <div>
            <Label htmlFor="description">Beschrijving *</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
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
            <Label htmlFor="assigned_to">Toegewezen aan (User ID)</Label>
            <Input
              id="assigned_to"
              value={formData.assigned_to}
              onChange={(e) => setFormData({ ...formData, assigned_to: e.target.value })}
              placeholder="UUID van medewerker (optioneel)"
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