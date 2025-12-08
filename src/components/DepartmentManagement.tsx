import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Pencil, Trash2, Building2, User } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Manager {
  id: string;
  voornaam: string;
  achternaam: string;
}

interface Department {
  id: string;
  name: string;
  description: string | null;
  manager_id: string | null;
  created_at: string;
  employee_count?: number;
  manager?: Manager | null;
}

interface DepartmentManagementProps {
  onRefresh?: () => void;
}

export function DepartmentManagement({ onRefresh }: DepartmentManagementProps) {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [managers, setManagers] = useState<Manager[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [managerId, setManagerId] = useState<string>('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Load departments
      const { data: depts, error: deptsError } = await supabase
        .from('departments')
        .select('*')
        .order('name');

      if (deptsError) throw deptsError;

      // Load all profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, voornaam, achternaam, department_id');

      if (profilesError) throw profilesError;

      // Load managers (users with manager role)
      const { data: managerRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'manager');

      if (rolesError) throw rolesError;

      const managerIds = managerRoles?.map(r => r.user_id) || [];
      const managerProfiles = profiles?.filter(p => managerIds.includes(p.id)) || [];
      setManagers(managerProfiles);

      // Combine departments with manager info and employee count
      const deptWithDetails = (depts || []).map(dept => {
        const manager = profiles?.find(p => p.id === dept.manager_id);
        return {
          ...dept,
          employee_count: profiles?.filter(p => p.department_id === dept.id).length || 0,
          manager: manager ? { id: manager.id, voornaam: manager.voornaam, achternaam: manager.achternaam } : null,
        };
      });

      setDepartments(deptWithDetails);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Fout bij laden van gegevens');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('Naam is verplicht');
      return;
    }

    setSaving(true);
    try {
      const deptData = {
        name: name.trim(),
        description: description.trim() || null,
        manager_id: managerId || null,
      };

      if (editingDept) {
        const { error } = await supabase
          .from('departments')
          .update(deptData)
          .eq('id', editingDept.id);

        if (error) throw error;
        toast.success('Afdeling bijgewerkt');
      } else {
        const { error } = await supabase
          .from('departments')
          .insert(deptData);

        if (error) throw error;
        toast.success('Afdeling aangemaakt');
      }

      setDialogOpen(false);
      resetForm();
      loadData();
      onRefresh?.();
    } catch (error) {
      console.error('Error saving department:', error);
      toast.error('Fout bij opslaan van afdeling');
    } finally {
      setSaving(false);
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
      loadData();
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
    setManagerId(dept.manager_id || '');
    setDialogOpen(true);
  };

  const openNewDialog = () => {
    resetForm();
    setDialogOpen(true);
  };

  const resetForm = () => {
    setEditingDept(null);
    setName('');
    setDescription('');
    setManagerId('');
  };

  return (
    <Card>
      <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5" />
          Afdelingen
        </CardTitle>
        <Button onClick={openNewDialog} className="gap-2">
          <Plus className="h-4 w-4" />
          Nieuwe afdeling
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : departments.length === 0 ? (
          <div className="text-center py-12">
            <Building2 className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground mb-4">Nog geen afdelingen aangemaakt</p>
            <Button onClick={openNewDialog} variant="outline" className="gap-2">
              <Plus className="h-4 w-4" />
              Eerste afdeling aanmaken
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto -mx-6 px-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Afdeling</TableHead>
                  <TableHead className="hidden md:table-cell">Manager</TableHead>
                  <TableHead className="text-center">Medewerkers</TableHead>
                  <TableHead className="text-right">Acties</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {departments.map((dept) => (
                  <TableRow key={dept.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{dept.name}</p>
                        {dept.description && (
                          <p className="text-sm text-muted-foreground line-clamp-1">{dept.description}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {dept.manager ? (
                        <div className="flex items-center gap-2">
                          <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center">
                            <span className="text-xs font-medium text-primary">
                              {dept.manager.voornaam[0]}{dept.manager.achternaam[0]}
                            </span>
                          </div>
                          <span>{dept.manager.voornaam} {dept.manager.achternaam}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary">{dept.employee_count}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
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

      <Dialog open={dialogOpen} onOpenChange={(open) => {
        setDialogOpen(open);
        if (!open) resetForm();
      }}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              {editingDept ? 'Afdeling bewerken' : 'Nieuwe afdeling'}
            </DialogTitle>
            <DialogDescription>
              {editingDept 
                ? 'Pas de gegevens van de afdeling aan' 
                : 'Maak een nieuwe afdeling aan en wijs optioneel een manager toe'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="dept-name">Naam *</Label>
              <Input
                id="dept-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Bijv. Sales, IT, Marketing..."
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="dept-manager">Afdelingsmanager</Label>
              <Select value={managerId} onValueChange={setManagerId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecteer een manager" />
                </SelectTrigger>
                <SelectContent className="bg-popover">
                  <SelectItem value="">Geen manager</SelectItem>
                  {managers.map((mgr) => (
                    <SelectItem key={mgr.id} value={mgr.id}>
                      {mgr.voornaam} {mgr.achternaam}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {managers.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  Tip: Maak eerst gebruikers aan met de rol "Manager"
                </p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="dept-description">Beschrijving</Label>
              <Textarea
                id="dept-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Korte beschrijving van de afdeling..."
                rows={3}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
              Annuleren
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent mr-2" />
              ) : null}
              {editingDept ? 'Opslaan' : 'Aanmaken'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
