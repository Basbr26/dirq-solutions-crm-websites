import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  Plus, 
  Pencil, 
  Trash2, 
  GripVertical,
  ClipboardList,
  FileText,
  Laptop,
  Users,
  Shield,
  Briefcase,
  ClipboardCheck,
  Copy,
  MoreVertical,
  ArrowLeft
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

interface OnboardingTemplate {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  items_count?: number;
}

interface TemplateItem {
  id: string;
  template_id: string;
  title: string;
  description: string | null;
  category: string;
  due_days: number;
  is_required: boolean;
  assigned_to_role: string;
  sort_order: number;
}

const categoryOptions = [
  { value: 'administratie', label: 'Administratie', icon: FileText },
  { value: 'it', label: 'IT & Systemen', icon: Laptop },
  { value: 'sociaal', label: 'Kennismaking', icon: Users },
  { value: 'compliance', label: 'Compliance', icon: Shield },
  { value: 'werk', label: 'Werkzaamheden', icon: Briefcase },
  { value: 'algemeen', label: 'Algemeen', icon: ClipboardCheck },
];

const roleOptions = [
  { value: 'employee', label: 'Medewerker' },
  { value: 'manager', label: 'Manager' },
  { value: 'hr', label: 'HR' },
];

export default function OnboardingTemplatesPage() {
  const queryClient = useQueryClient();
  const [selectedTemplate, setSelectedTemplate] = useState<OnboardingTemplate | null>(null);
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [itemDialogOpen, setItemDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteItemDialogOpen, setDeleteItemDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<OnboardingTemplate | null>(null);
  const [editingItem, setEditingItem] = useState<TemplateItem | null>(null);
  const [itemToDelete, setItemToDelete] = useState<TemplateItem | null>(null);

  // Form states
  const [templateForm, setTemplateForm] = useState({ name: '', description: '', is_active: true });
  const [itemForm, setItemForm] = useState({
    title: '',
    description: '',
    category: 'algemeen',
    due_days: 7,
    is_required: true,
    assigned_to_role: 'employee'
  });

  // Fetch templates
  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['onboarding-templates-admin'],
    queryFn: async () => {
      const { data: templatesData, error } = await supabase
        .from('onboarding_templates')
        .select('*')
        .order('name');

      if (error) throw error;

      // Get item counts
      const templatesWithCounts = await Promise.all(
        (templatesData || []).map(async (template) => {
          const { count } = await supabase
            .from('onboarding_template_items')
            .select('*', { count: 'exact', head: true })
            .eq('template_id', template.id);

          return { ...template, items_count: count || 0 };
        })
      );

      return templatesWithCounts as OnboardingTemplate[];
    }
  });

  // Fetch items for selected template
  const { data: templateItems = [] } = useQuery({
    queryKey: ['template-items', selectedTemplate?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('onboarding_template_items')
        .select('*')
        .eq('template_id', selectedTemplate!.id)
        .order('sort_order');

      if (error) throw error;
      return data as TemplateItem[];
    },
    enabled: !!selectedTemplate?.id
  });

  // Create/Update template
  const saveTemplateMutation = useMutation({
    mutationFn: async () => {
      if (editingTemplate) {
        const { error } = await supabase
          .from('onboarding_templates')
          .update({
            name: templateForm.name,
            description: templateForm.description || null,
            is_active: templateForm.is_active
          })
          .eq('id', editingTemplate.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('onboarding_templates')
          .insert({
            name: templateForm.name,
            description: templateForm.description || null,
            is_active: templateForm.is_active
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['onboarding-templates-admin'] });
      setTemplateDialogOpen(false);
      setEditingTemplate(null);
      setTemplateForm({ name: '', description: '', is_active: true });
      toast.success(editingTemplate ? 'Template bijgewerkt' : 'Template aangemaakt');
    },
    onError: () => {
      toast.error('Fout bij opslaan template');
    }
  });

  // Delete template
  const deleteTemplateMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('onboarding_templates')
        .delete()
        .eq('id', editingTemplate!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['onboarding-templates-admin'] });
      setDeleteDialogOpen(false);
      setEditingTemplate(null);
      if (selectedTemplate?.id === editingTemplate?.id) {
        setSelectedTemplate(null);
      }
      toast.success('Template verwijderd');
    },
    onError: () => {
      toast.error('Fout bij verwijderen template');
    }
  });

  // Duplicate template
  const duplicateTemplateMutation = useMutation({
    mutationFn: async (templateId: string) => {
      // Get original template
      const { data: original, error: fetchError } = await supabase
        .from('onboarding_templates')
        .select('*')
        .eq('id', templateId)
        .single();
      if (fetchError) throw fetchError;

      // Create new template
      const { data: newTemplate, error: createError } = await supabase
        .from('onboarding_templates')
        .insert({
          name: `${original.name} (kopie)`,
          description: original.description,
          is_active: false
        })
        .select()
        .single();
      if (createError) throw createError;

      // Get original items
      const { data: items, error: itemsError } = await supabase
        .from('onboarding_template_items')
        .select('*')
        .eq('template_id', templateId);
      if (itemsError) throw itemsError;

      // Create new items
      if (items && items.length > 0) {
        const newItems = items.map(item => ({
          template_id: newTemplate.id,
          title: item.title,
          description: item.description,
          category: item.category,
          due_days: item.due_days,
          is_required: item.is_required,
          assigned_to_role: item.assigned_to_role,
          sort_order: item.sort_order
        }));

        const { error: insertError } = await supabase
          .from('onboarding_template_items')
          .insert(newItems);
        if (insertError) throw insertError;
      }

      return newTemplate;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['onboarding-templates-admin'] });
      toast.success('Template gedupliceerd');
    },
    onError: () => {
      toast.error('Fout bij dupliceren template');
    }
  });

  // Create/Update item
  const saveItemMutation = useMutation({
    mutationFn: async () => {
      if (editingItem) {
        const { error } = await supabase
          .from('onboarding_template_items')
          .update({
            title: itemForm.title,
            description: itemForm.description || null,
            category: itemForm.category,
            due_days: itemForm.due_days,
            is_required: itemForm.is_required,
            assigned_to_role: itemForm.assigned_to_role
          })
          .eq('id', editingItem.id);
        if (error) throw error;
      } else {
        const maxSort = Math.max(0, ...templateItems.map(i => i.sort_order));
        const { error } = await supabase
          .from('onboarding_template_items')
          .insert({
            template_id: selectedTemplate!.id,
            title: itemForm.title,
            description: itemForm.description || null,
            category: itemForm.category,
            due_days: itemForm.due_days,
            is_required: itemForm.is_required,
            assigned_to_role: itemForm.assigned_to_role,
            sort_order: maxSort + 1
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['template-items', selectedTemplate?.id] });
      queryClient.invalidateQueries({ queryKey: ['onboarding-templates-admin'] });
      setItemDialogOpen(false);
      setEditingItem(null);
      setItemForm({
        title: '',
        description: '',
        category: 'algemeen',
        due_days: 7,
        is_required: true,
        assigned_to_role: 'employee'
      });
      toast.success(editingItem ? 'Taak bijgewerkt' : 'Taak toegevoegd');
    },
    onError: () => {
      toast.error('Fout bij opslaan taak');
    }
  });

  // Delete item
  const deleteItemMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('onboarding_template_items')
        .delete()
        .eq('id', itemToDelete!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['template-items', selectedTemplate?.id] });
      queryClient.invalidateQueries({ queryKey: ['onboarding-templates-admin'] });
      setDeleteItemDialogOpen(false);
      setItemToDelete(null);
      toast.success('Taak verwijderd');
    },
    onError: () => {
      toast.error('Fout bij verwijderen taak');
    }
  });

  const openEditTemplate = (template: OnboardingTemplate) => {
    setEditingTemplate(template);
    setTemplateForm({
      name: template.name,
      description: template.description || '',
      is_active: template.is_active
    });
    setTemplateDialogOpen(true);
  };

  const openNewTemplate = () => {
    setEditingTemplate(null);
    setTemplateForm({ name: '', description: '', is_active: true });
    setTemplateDialogOpen(true);
  };

  const openEditItem = (item: TemplateItem) => {
    setEditingItem(item);
    setItemForm({
      title: item.title,
      description: item.description || '',
      category: item.category,
      due_days: item.due_days,
      is_required: item.is_required,
      assigned_to_role: item.assigned_to_role
    });
    setItemDialogOpen(true);
  };

  const openNewItem = () => {
    setEditingItem(null);
    setItemForm({
      title: '',
      description: '',
      category: 'algemeen',
      due_days: 7,
      is_required: true,
      assigned_to_role: 'employee'
    });
    setItemDialogOpen(true);
  };

  const getCategoryIcon = (category: string) => {
    const cat = categoryOptions.find(c => c.value === category);
    if (cat) {
      const Icon = cat.icon;
      return <Icon className="h-4 w-4" />;
    }
    return <ClipboardCheck className="h-4 w-4" />;
  };

  return (
    <AppLayout 
      title="Onboarding Templates" 
      subtitle="Beheer checklists voor nieuwe medewerkers"
      actions={
        <Button variant="outline" asChild>
          <Link to="/hr/onboarding">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Terug naar overzicht
          </Link>
        </Button>
      }
    >
      <div className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Templates List */}
          <div className="lg:col-span-1 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Templates</h2>
              <Button size="sm" onClick={openNewTemplate}>
                <Plus className="h-4 w-4 mr-1" />
                Nieuw
              </Button>
            </div>

            {isLoading ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  Laden...
                </CardContent>
              </Card>
            ) : templates.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  Geen templates gevonden
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {templates.map((template) => (
                  <Card 
                    key={template.id}
                    className={`cursor-pointer transition-all hover:shadow-md ${
                      selectedTemplate?.id === template.id ? 'ring-2 ring-primary' : ''
                    }`}
                    onClick={() => setSelectedTemplate(template)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-primary/10">
                            <ClipboardList className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <h3 className="font-medium">{template.name}</h3>
                            <p className="text-sm text-muted-foreground">
                              {template.items_count} taken
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={template.is_active ? 'default' : 'secondary'}>
                            {template.is_active ? 'Actief' : 'Inactief'}
                          </Badge>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="bg-popover">
                              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openEditTemplate(template); }}>
                                <Pencil className="h-4 w-4 mr-2" />
                                Bewerken
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); duplicateTemplateMutation.mutate(template.id); }}>
                                <Copy className="h-4 w-4 mr-2" />
                                Dupliceren
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                className="text-destructive"
                                onClick={(e) => { 
                                  e.stopPropagation(); 
                                  setEditingTemplate(template);
                                  setDeleteDialogOpen(true); 
                                }}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Verwijderen
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Template Items */}
          <div className="lg:col-span-2">
            {selectedTemplate ? (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>{selectedTemplate.name}</CardTitle>
                      <CardDescription>
                        {selectedTemplate.description || 'Geen beschrijving'}
                      </CardDescription>
                    </div>
                    <Button onClick={openNewItem}>
                      <Plus className="h-4 w-4 mr-2" />
                      Taak toevoegen
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {templateItems.length === 0 ? (
                    <div className="py-8 text-center text-muted-foreground">
                      Nog geen taken. Voeg de eerste taak toe.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {templateItems.map((item, index) => (
                        <div key={item.id}>
                          {index > 0 && <Separator className="my-3" />}
                          <div className="flex items-start gap-3">
                            <div className="p-2 rounded-lg bg-muted text-muted-foreground">
                              {getCategoryIcon(item.category)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{item.title}</span>
                                {item.is_required && (
                                  <Badge variant="outline" className="text-xs">Verplicht</Badge>
                                )}
                              </div>
                              {item.description && (
                                <p className="text-sm text-muted-foreground mt-1">
                                  {item.description}
                                </p>
                              )}
                              <div className="flex flex-wrap gap-3 mt-2 text-xs text-muted-foreground">
                                <span>
                                  Categorie: {categoryOptions.find(c => c.value === item.category)?.label || item.category}
                                </span>
                                <span>•</span>
                                <span>Deadline: {item.due_days} dagen</span>
                                <span>•</span>
                                <span>
                                  Toegewezen aan: {roleOptions.find(r => r.value === item.assigned_to_role)?.label || item.assigned_to_role}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditItem(item)}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8 text-destructive hover:text-destructive"
                                onClick={() => {
                                  setItemToDelete(item);
                                  setDeleteItemDialogOpen(true);
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="py-16 text-center text-muted-foreground">
                  <ClipboardList className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Selecteer een template om de taken te bekijken</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Template Dialog */}
      <Dialog open={templateDialogOpen} onOpenChange={setTemplateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingTemplate ? 'Template bewerken' : 'Nieuwe template'}</DialogTitle>
            <DialogDescription>
              {editingTemplate ? 'Pas de template gegevens aan' : 'Maak een nieuwe onboarding checklist'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Naam *</Label>
              <Input
                value={templateForm.name}
                onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })}
                placeholder="Bijv. Standaard Onboarding"
              />
            </div>
            <div className="space-y-2">
              <Label>Beschrijving</Label>
              <Textarea
                value={templateForm.description}
                onChange={(e) => setTemplateForm({ ...templateForm, description: e.target.value })}
                placeholder="Korte beschrijving van deze template"
                rows={3}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label>Actief</Label>
                <p className="text-sm text-muted-foreground">Template beschikbaar voor nieuwe onboardings</p>
              </div>
              <Switch
                checked={templateForm.is_active}
                onCheckedChange={(checked) => setTemplateForm({ ...templateForm, is_active: checked })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTemplateDialogOpen(false)}>
              Annuleren
            </Button>
            <Button 
              onClick={() => saveTemplateMutation.mutate()}
              disabled={!templateForm.name || saveTemplateMutation.isPending}
            >
              {saveTemplateMutation.isPending ? 'Opslaan...' : 'Opslaan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Item Dialog */}
      <Dialog open={itemDialogOpen} onOpenChange={setItemDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingItem ? 'Taak bewerken' : 'Nieuwe taak'}</DialogTitle>
            <DialogDescription>
              {editingItem ? 'Pas de taak gegevens aan' : 'Voeg een nieuwe taak toe aan de checklist'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
            <div className="space-y-2">
              <Label>Titel *</Label>
              <Input
                value={itemForm.title}
                onChange={(e) => setItemForm({ ...itemForm, title: e.target.value })}
                placeholder="Bijv. Arbeidsovereenkomst ondertekenen"
              />
            </div>
            <div className="space-y-2">
              <Label>Beschrijving</Label>
              <Textarea
                value={itemForm.description}
                onChange={(e) => setItemForm({ ...itemForm, description: e.target.value })}
                placeholder="Uitleg over wat er moet gebeuren"
                rows={2}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Categorie</Label>
                <Select 
                  value={itemForm.category} 
                  onValueChange={(value) => setItemForm({ ...itemForm, category: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover">
                    {categoryOptions.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Deadline (dagen)</Label>
                <Input
                  type="number"
                  min={0}
                  value={itemForm.due_days}
                  onChange={(e) => setItemForm({ ...itemForm, due_days: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Toegewezen aan</Label>
              <Select 
                value={itemForm.assigned_to_role} 
                onValueChange={(value) => setItemForm({ ...itemForm, assigned_to_role: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover">
                  {roleOptions.map((role) => (
                    <SelectItem key={role.value} value={role.value}>
                      {role.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label>Verplichte taak</Label>
                <p className="text-sm text-muted-foreground">Moet afgerond worden voor voltooiing</p>
              </div>
              <Switch
                checked={itemForm.is_required}
                onCheckedChange={(checked) => setItemForm({ ...itemForm, is_required: checked })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setItemDialogOpen(false)}>
              Annuleren
            </Button>
            <Button 
              onClick={() => saveItemMutation.mutate()}
              disabled={!itemForm.title || saveItemMutation.isPending}
            >
              {saveItemMutation.isPending ? 'Opslaan...' : 'Opslaan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Template Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Template verwijderen?</AlertDialogTitle>
            <AlertDialogDescription>
              Weet je zeker dat je "{editingTemplate?.name}" wilt verwijderen? Dit verwijdert ook alle taken in deze template.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuleren</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteTemplateMutation.mutate()}
            >
              Verwijderen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Item Dialog */}
      <AlertDialog open={deleteItemDialogOpen} onOpenChange={setDeleteItemDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Taak verwijderen?</AlertDialogTitle>
            <AlertDialogDescription>
              Weet je zeker dat je "{itemToDelete?.title}" wilt verwijderen?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuleren</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteItemMutation.mutate()}
            >
              Verwijderen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
