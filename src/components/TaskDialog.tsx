import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
type Assignee = {
  id: string;
  voornaam: string;
  achternaam: string;
  email: string;
  user_roles?: { role: string }[] | string;
};
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
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

    const [assignees, setAssignees] = useState<Assignee[]>([]);
    const [loadingAssignees, setLoadingAssignees] = useState(false);
  useEffect(() => {
    if (open) {
      loadAssignees();
    }
  }, [open]);

  const loadAssignees = async () => {
    setLoadingAssignees(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, voornaam, achternaam, email, user_roles:user_roles!user_id(role)')
        .order('voornaam');

      if (error) throw error;
      // user_roles bevat nu alleen HR/manager door de juiste join
      let verantwoordelijken: Assignee[] = [];
      if (Array.isArray(data)) {
        verantwoordelijken = data.filter((emp: Assignee) => {
          return Array.isArray(emp.user_roles) && (emp.user_roles as { role: string }[]).some((r) => r.role === 'hr' || r.role === 'manager');
        });
      }
      setAssignees(verantwoordelijken);
    } catch (error) {
      console.error('Error loading assignees:', error);
      setAssignees([]);
    } finally {
      setLoadingAssignees(false);
    }
  };

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
            <Label htmlFor="assigned_to">Toegewezen aan *</Label>
            <Select
              value={formData.assigned_to}
              onValueChange={(value) => setFormData({ ...formData, assigned_to: value })}
              required
            >
              <SelectTrigger>
                <SelectValue placeholder={loadingAssignees ? "Laden..." : "Selecteer verantwoordelijke (HR/Manager)"} />
              </SelectTrigger>
              <SelectContent>
                {assignees.map((emp) => (
                  <SelectItem key={emp.id} value={emp.id}>
                    {emp.voornaam} {emp.achternaam} ({emp.email})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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