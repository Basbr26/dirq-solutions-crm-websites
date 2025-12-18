import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Pencil, Users, Search, Trash2 } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { AppRole } from '@/hooks/useAuth';

interface UserWithRole {
  id: string;
  voornaam: string;
  achternaam: string;
  email: string;
  functie: string | null;
  department_id: string | null;
  manager_id: string | null;
  role?: AppRole;
  department?: { name: string } | null;
  manager?: { voornaam: string; achternaam: string } | null;
}

interface Department {
  id: string;
  name: string;
}

interface UserManagementProps {
  onRefresh?: () => void;
}

export function UserManagement({ onRefresh }: UserManagementProps) {
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [managers, setManagers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserWithRole | null>(null);
  const [editRole, setEditRole] = useState<AppRole>('medewerker');
  const [editDepartment, setEditDepartment] = useState<string>('none');
  const [editManager, setEditManager] = useState<string>('none');
  const [editFunctie, setEditFunctie] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<UserWithRole | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<AppRole | null>(null);

  useEffect(() => {
    loadData();
    loadCurrentUserRole();
  }, []);

  const loadCurrentUserRole = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: role } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .single();
      setCurrentUserRole(role?.role as AppRole);
    }
  };

  const loadData = async () => {
    try {
      // Load users with their roles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('achternaam');

      if (profilesError) throw profilesError;

      // Load roles
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');

      if (rolesError) throw rolesError;

      // Load departments
      const { data: depts, error: deptsError } = await supabase
        .from('departments')
        .select('id, name')
        .order('name');

      if (deptsError) throw deptsError;
      setDepartments(depts || []);

      // Combine users with their roles and departments
      const usersWithRoles = (profiles || []).map(profile => {
        const userRole = roles?.find(r => r.user_id === profile.id);
        const dept = depts?.find(d => d.id === profile.department_id);
        const mgr = profiles?.find(p => p.id === profile.manager_id);
        return {
          ...profile,
          role: userRole?.role as AppRole,
          department: dept ? { name: dept.name } : null,
          manager: mgr ? { voornaam: mgr.voornaam, achternaam: mgr.achternaam } : null,
        };
      });

      setUsers(usersWithRoles);
      setManagers(usersWithRoles.filter(u => u.role === 'manager'));
    } catch (error) {
      console.error('Error loading users:', error);
      toast.error('Fout bij laden van gebruikers');
    } finally {
      setLoading(false);
    }
  };

  const openEditDialog = (user: UserWithRole) => {
    setSelectedUser(user);
    setEditRole(user.role || 'medewerker');
    setEditDepartment(user.department_id || 'none');
    setEditManager(user.manager_id || 'none');
    setEditFunctie(user.functie || '');
    setEditDialogOpen(true);
  };

  const handleSaveUser = async () => {
    if (!selectedUser) return;

    try {
      // Update profile
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          department_id: editDepartment === 'none' ? null : editDepartment || null,
          manager_id: editManager === 'none' ? null : editManager || null,
          functie: editFunctie || null,
        })
        .eq('id', selectedUser.id);

      if (profileError) throw profileError;

      // Update role if changed
      if (editRole !== selectedUser.role) {
        // First delete existing role
        await supabase
          .from('user_roles')
          .delete()
          .eq('user_id', selectedUser.id);

        // Then insert new role
        const { error: roleError } = await supabase
          .from('user_roles')
          .insert({
            user_id: selectedUser.id,
            role: editRole,
          });

        if (roleError) throw roleError;
      }

      toast.success('Gebruiker bijgewerkt');
      setEditDialogOpen(false);
      loadData();
      onRefresh?.();
    } catch (error) {
      console.error('Error updating user:', error);
      toast.error('Fout bij bijwerken van gebruiker');
    }
  };

  const openDeleteDialog = (user: UserWithRole) => {
    setUserToDelete(user);
    setDeleteDialogOpen(true);
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;

    try {
      // Delete user via admin API
      const { error } = await supabase.auth.admin.deleteUser(userToDelete.id);
      
      if (error) throw error;

      toast.success('Gebruiker verwijderd');
      setDeleteDialogOpen(false);
      setUserToDelete(null);
      loadData();
      onRefresh?.();
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error('Fout bij verwijderen van gebruiker. Mogelijk ontbreken de benodigde rechten.');
    }
  };

  const getRoleBadgeVariant = (role?: AppRole) => {
    switch (role) {
      case 'super_admin': return 'default';
      case 'hr': return 'secondary';
      case 'manager': return 'outline';
      default: return 'outline';
    }
  };

  const getRoleLabel = (role?: AppRole) => {
    switch (role) {
      case 'super_admin': return 'Super Admin';
      case 'hr': return 'HR';
      case 'manager': return 'Manager';
      case 'medewerker': return 'Medewerker';
      default: return 'Geen rol';
    }
  };

  const filteredUsers = users.filter(user => {
    const fullName = `${user.voornaam} ${user.achternaam}`.toLowerCase();
    return fullName.includes(searchQuery.toLowerCase()) || 
           user.email.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <Card>
      <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Gebruikers
        </CardTitle>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Zoek gebruiker..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-muted-foreground text-center py-8">Laden...</p>
        ) : filteredUsers.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            Geen gebruikers gevonden
          </p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Naam</TableHead>
                  <TableHead className="hidden md:table-cell">E-mail</TableHead>
                  <TableHead>Rol</TableHead>
                  <TableHead className="hidden lg:table-cell">Afdeling</TableHead>
                  <TableHead className="hidden lg:table-cell">Manager</TableHead>
                  <TableHead className="text-right">Acties</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">
                      {user.voornaam} {user.achternaam}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground">
                      {user.email}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getRoleBadgeVariant(user.role)}>
                        {getRoleLabel(user.role)}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      {user.department?.name || '-'}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      {user.manager 
                        ? `${user.manager.voornaam} ${user.manager.achternaam}` 
                        : '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDialog(user)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        {currentUserRole === 'super_admin' && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openDeleteDialog(user)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>
              Gebruiker bewerken: {selectedUser?.voornaam} {selectedUser?.achternaam}
            </DialogTitle>
            <DialogDescription>
              Wijzig de gebruikersgegevens en rolrechten
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4 overflow-y-auto flex-1">
            <div className="space-y-2">
              <Label htmlFor="role">Rol</Label>
              <Select value={editRole} onValueChange={(v) => setEditRole(v as AppRole)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="medewerker">Medewerker</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="hr">HR</SelectItem>
                  <SelectItem value="super_admin">Super Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="department">Afdeling</Label>
              <Select value={editDepartment} onValueChange={setEditDepartment}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecteer afdeling" />
                </SelectTrigger>
                <SelectContent className="bg-popover">
                  <SelectItem value="none">Geen afdeling</SelectItem>
                  {departments.map((dept) => (
                    <SelectItem key={dept.id} value={dept.id}>
                      {dept.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="manager">Manager</Label>
              <Select value={editManager} onValueChange={setEditManager}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecteer manager" />
                </SelectTrigger>
                <SelectContent className="bg-popover">
                  <SelectItem value="none">Geen manager</SelectItem>
                  {managers
                    .filter(m => m.id !== selectedUser?.id)
                    .map((mgr) => (
                      <SelectItem key={mgr.id} value={mgr.id}>
                        {mgr.voornaam} {mgr.achternaam}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="functie">Functie</Label>
              <Input
                id="functie"
                value={editFunctie}
                onChange={(e) => setEditFunctie(e.target.value)}
                placeholder="Bijv. Software Developer"
              />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Gebruiker verwijderen</AlertDialogTitle>
            <AlertDialogDescription>
              Weet je zeker dat je <strong>{userToDelete?.voornaam} {userToDelete?.achternaam}</strong> wilt verwijderen?
              <br /><br />
              Deze actie kan niet ongedaan worden gemaakt. Alle gegevens van deze gebruiker worden permanent verwijderd.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuleren</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteUser}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Verwijderen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Annuleren
            </Button>
            <Button onClick={handleSaveUser}>
              Opslaan
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
