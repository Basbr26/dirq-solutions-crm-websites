import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Pencil, Trash2, Building2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Department {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  employee_count?: number;
}

interface DepartmentManagementProps {
  onRefresh?: () => void;
}

export function DepartmentManagement({ onRefresh }: DepartmentManagementProps) {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    loadDepartments();
  }, []);

  const loadDepartments = async () => {
    try {
      const { data, error } = await supabase
        .from('departments')
        .select('*')
        .order('name');

      if (error) throw error;

      // Get employee count per department
      const { data: profiles } = await supabase
        .from('profiles')
        .select('department_id');

      const deptWithCounts = (data || []).map(dept => ({
        ...dept,
        employee_count: profiles?.filter(p => p.department_id === dept.id).length || 0,
      }));

      setDepartments(deptWithCounts);
    } catch (error) {
      console.error('Error loading departments:', error);
      toast.error('Fout bij laden van afdelingen');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('Naam is verplicht');
      return;
    }

    try {
      if (editingDept) {
        const { error } = await supabase
          .from('departments')
          .update({ name, description })
          .eq('id', editingDept.id);

        if (error) throw error;
        toast.success('Afdeling bijgewerkt');
      } else {
        const { error } = await supabase
          .from('departments')
          .insert({ name, description });

        if (error) throw error;
        toast.success('Afdeling aangemaakt');
      }

      setDialogOpen(false);
      resetForm();
      loadDepartments();
      onRefresh?.();
    } catch (error) {
      console.error('Error saving department:', error);
      toast.error('Fout bij opslaan van afdeling');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Weet je zeker dat je deze afdeling wilt verwijderen?')) return;

    try {
      const { error } = await supabase
        .from('departments')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Afdeling verwijderd');
      loadDepartments();
      onRefresh?.();
    } catch (error) {
      console.error('Error deleting department:', error);
      toast.error('Fout bij verwijderen van afdeling');
    }
  };

  const openEditDialog = (dept: Department) => {
    setEditingDept(dept);
    setName(dept.name);
    setDescription(dept.description || '');
    setDialogOpen(true);
  };

  const resetForm = () => {
    setEditingDept(null);
    setName('');
    setDescription('');
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5" />
          Afdelingen
        </CardTitle>
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              Nieuwe afdeling
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingDept ? 'Afdeling bewerken' : 'Nieuwe afdeling'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Naam</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Bijv. Sales, IT, HR..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Beschrijving (optioneel)</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Korte beschrijving van de afdeling..."
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Annuleren
                </Button>
                <Button onClick={handleSave}>
                  {editingDept ? 'Bijwerken' : 'Aanmaken'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-muted-foreground text-center py-8">Laden...</p>
        ) : departments.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            Nog geen afdelingen aangemaakt
          </p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Naam</TableHead>
                  <TableHead className="hidden sm:table-cell">Beschrijving</TableHead>
                  <TableHead className="text-center">Medewerkers</TableHead>
                  <TableHead className="text-right">Acties</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {departments.map((dept) => (
                  <TableRow key={dept.id}>
                    <TableCell className="font-medium">{dept.name}</TableCell>
                    <TableCell className="hidden sm:table-cell text-muted-foreground">
                      {dept.description || '-'}
                    </TableCell>
                    <TableCell className="text-center">{dept.employee_count}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDialog(dept)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(dept.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
