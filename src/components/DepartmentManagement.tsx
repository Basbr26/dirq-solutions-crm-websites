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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Plus, Pencil, Trash2, Building2, ChevronDown, ChevronRight, Users, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

interface Manager {
  id: string;
  voornaam: string;
  achternaam: string;
}

interface Employee {
  id: string;
  voornaam: string;
  achternaam: string;
  email: string;
  functie: string | null;
}

interface SickLeaveCase {
  id: string;
  employee_id: string;
  start_date: string;
  case_status: string;
  employee?: Employee;
}

interface Department {
  id: string;
  name: string;
  description: string | null;
  manager_id: string | null;
  created_at: string;
  employee_count?: number;
  active_sick_leaves?: number;
  manager?: Manager | null;
  employees?: Employee[];
  sickLeaveCases?: SickLeaveCase[];
}

interface DepartmentManagementProps {
  onRefresh?: () => void;
}

export function DepartmentManagement({ onRefresh }: DepartmentManagementProps) {
  const { role, user } = useAuth();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [managers, setManagers] = useState<Manager[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [managerId, setManagerId] = useState<string>('none');
  const [saving, setSaving] = useState(false);
  const [expandedDepts, setExpandedDepts] = useState<Set<string>>(new Set());

  const isSuperAdmin = role === 'super_admin';
  const isManager = role === 'manager';

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
        .select('id, voornaam, achternaam, email, functie, department_id');

      if (profilesError) throw profilesError;

      // Load managers (users with manager role)
      const { data: managerRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'manager');

      if (rolesError) throw rolesError;

      // Load active sick leave cases
      const { data: sickCases, error: sickError } = await supabase
        .from('sick_leave_cases')
        .select('id, employee_id, start_date, case_status')
        .eq('case_status', 'actief');

      if (sickError) throw sickError;

      const managerIds = managerRoles?.map(r => r.user_id) || [];
      const managerProfiles = profiles?.filter(p => managerIds.includes(p.id)) || [];
      setManagers(managerProfiles);

      // Combine departments with manager info, employees and sick leave data
      let deptWithDetails = (depts || []).map(dept => {
        const manager = profiles?.find(p => p.id === dept.manager_id);
        const deptEmployees = profiles?.filter(p => p.department_id === dept.id) || [];
        const deptEmployeeIds = deptEmployees.map(e => e.id);
        const deptSickCases = (sickCases || [])
          .filter(sc => deptEmployeeIds.includes(sc.employee_id))
          .map(sc => ({
            ...sc,
            employee: deptEmployees.find(e => e.id === sc.employee_id)
          }));

        return {
          ...dept,
          employee_count: deptEmployees.length,
          active_sick_leaves: deptSickCases.length,
          manager: manager ? { id: manager.id, voornaam: manager.voornaam, achternaam: manager.achternaam } : null,
          employees: deptEmployees,
          sickLeaveCases: deptSickCases,
        };
      });

      // Filter for managers - only show their own department
      if (isManager && user) {
        deptWithDetails = deptWithDetails.filter(d => d.manager_id === user.id);
      }

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
        manager_id: managerId === 'none' ? null : managerId || null,
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
    setManagerId(dept.manager_id || 'none');
    setDialogOpen(true);
  };

  const openNewDialog = () => {
    resetForm();
    setManagerId('none');
    setDialogOpen(true);
  };

  const resetForm = () => {
    setEditingDept(null);
    setName('');
    setDescription('');
    setManagerId('none');
  };

  const toggleExpand = (deptId: string) => {
    setExpandedDepts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(deptId)) {
        newSet.delete(deptId);
      } else {
        newSet.add(deptId);
      }
      return newSet;
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('nl-NL', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  return (
    <Card>
      <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5" />
          Afdelingen
        </CardTitle>
        {isSuperAdmin && (
          <Button onClick={openNewDialog} className="gap-2">
            <Plus className="h-4 w-4" />
            Nieuwe afdeling
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : departments.length === 0 ? (
          <div className="text-center py-12">
            <Building2 className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground mb-4">
              {isManager ? 'Je bent nog niet aan een afdeling gekoppeld' : 'Nog geen afdelingen aangemaakt'}
            </p>
            {isSuperAdmin && (
              <Button onClick={openNewDialog} variant="outline" className="gap-2">
                <Plus className="h-4 w-4" />
                Eerste afdeling aanmaken
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {departments.map((dept) => (
              <Collapsible 
                key={dept.id} 
                open={expandedDepts.has(dept.id)}
                onOpenChange={() => toggleExpand(dept.id)}
              >
                <div className="border rounded-lg overflow-hidden">
                  <CollapsibleTrigger asChild>
                    <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-4 flex-1">
                        <div className="flex items-center gap-2">
                          {expandedDepts.has(dept.id) ? (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          )}
                          <div>
                            <p className="font-medium">{dept.name}</p>
                            {dept.description && (
                              <p className="text-sm text-muted-foreground line-clamp-1">{dept.description}</p>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4">
                        {dept.manager && (
                          <div className="hidden md:flex items-center gap-2">
                            <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center">
                              <span className="text-xs font-medium text-primary">
                                {dept.manager.voornaam[0]}{dept.manager.achternaam[0]}
                              </span>
                            </div>
                            <span className="text-sm">{dept.manager.voornaam} {dept.manager.achternaam}</span>
                          </div>
                        )}
                        
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="gap-1">
                            <Users className="h-3 w-3" />
                            {dept.employee_count}
                          </Badge>
                          {(dept.active_sick_leaves || 0) > 0 && (
                            <Badge variant="destructive" className="gap-1">
                              <AlertTriangle className="h-3 w-3" />
                              {dept.active_sick_leaves} verzuim
                            </Badge>
                          )}
                        </div>
                        
                        {isSuperAdmin && (
                          <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
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
                        )}
                      </div>
                    </div>
                  </CollapsibleTrigger>
                  
                  <CollapsibleContent>
                    <div className="border-t p-4 space-y-4">
                      {/* Employees Section */}
                      <div>
                        <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                          <Users className="h-4 w-4" />
                          Medewerkers ({dept.employees?.length || 0})
                        </h4>
                        {dept.employees && dept.employees.length > 0 ? (
                          <div className="overflow-x-auto">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Naam</TableHead>
                                  <TableHead className="hidden sm:table-cell">E-mail</TableHead>
                                  <TableHead className="hidden md:table-cell">Functie</TableHead>
                                  <TableHead>Status</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {dept.employees.map((emp) => {
                                  const isSick = dept.sickLeaveCases?.some(sc => sc.employee_id === emp.id);
                                  return (
                                    <TableRow key={emp.id}>
                                      <TableCell className="font-medium">
                                        {emp.voornaam} {emp.achternaam}
                                      </TableCell>
                                      <TableCell className="hidden sm:table-cell text-muted-foreground">
                                        {emp.email}
                                      </TableCell>
                                      <TableCell className="hidden md:table-cell">
                                        {emp.functie || '-'}
                                      </TableCell>
                                      <TableCell>
                                        {isSick ? (
                                          <Badge variant="destructive">Verzuim</Badge>
                                        ) : (
                                          <Badge variant="outline" className="text-green-600 border-green-600">Actief</Badge>
                                        )}
                                      </TableCell>
                                    </TableRow>
                                  );
                                })}
                              </TableBody>
                            </Table>
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground py-2">
                            Geen medewerkers gekoppeld aan deze afdeling
                          </p>
                        )}
                      </div>

                      {/* Sick Leave Section */}
                      {(dept.sickLeaveCases?.length || 0) > 0 && (
                        <div className="pt-4 border-t">
                          <h4 className="text-sm font-medium mb-2 flex items-center gap-2 text-destructive">
                            <AlertTriangle className="h-4 w-4" />
                            Actief Verzuim ({dept.sickLeaveCases?.length || 0})
                          </h4>
                          <div className="overflow-x-auto">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Medewerker</TableHead>
                                  <TableHead>Startdatum</TableHead>
                                  <TableHead>Status</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {dept.sickLeaveCases?.map((sc) => (
                                  <TableRow key={sc.id}>
                                    <TableCell className="font-medium">
                                      {sc.employee?.voornaam} {sc.employee?.achternaam}
                                    </TableCell>
                                    <TableCell>{formatDate(sc.start_date)}</TableCell>
                                    <TableCell>
                                      <Badge variant="destructive">Actief</Badge>
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        </div>
                      )}
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>
            ))}
          </div>
        )}
      </CardContent>

      <Dialog open={dialogOpen} onOpenChange={(open) => {
        setDialogOpen(open);
        if (!open) resetForm();
      }}>
        <DialogContent className="sm:max-w-[500px] max-h-[85vh] flex flex-col">
          <DialogHeader className="flex-shrink-0">
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
          
          <div className="space-y-4 py-4 overflow-y-auto flex-1">
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
                  <SelectItem value="none">Geen manager</SelectItem>
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
