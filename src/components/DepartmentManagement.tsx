import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Building2, Search, Plus, Pencil, Trash2, Users } from 'lucide-react';
import { useDepartments } from '@/hooks/useDepartments';
import { DepartmentDialog } from '@/components/departments/DepartmentDialog';
import { DeleteDepartmentAlert } from '@/components/departments/DeleteDepartmentAlert';
import type { Department } from '@/hooks/useDepartments';

interface DepartmentManagementProps {
  onRefresh?: () => void;
}

export function DepartmentManagement({ onRefresh }: DepartmentManagementProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState<Department | null>(null);
  const [deleteAlertOpen, setDeleteAlertOpen] = useState(false);
  const [departmentToDelete, setDepartmentToDelete] = useState<Department | null>(null);

  const {
    data: departments = [],
    isLoading,
    createDepartment,
    updateDepartment,
    deleteDepartment,
  } = useDepartments();

  const handleCreateClick = () => {
    setSelectedDepartment(null);
    setDialogOpen(true);
  };

  const handleEditClick = (department: Department) => {
    setSelectedDepartment(department);
    setDialogOpen(true);
  };

  const handleDeleteClick = (department: Department) => {
    setDepartmentToDelete(department);
    setDeleteAlertOpen(true);
  };

  const handleSubmit = async (data: { name: string; description?: string; manager_id?: string }) => {
    if (selectedDepartment) {
      await updateDepartment.mutateAsync({
        id: selectedDepartment.id,
        ...data,
      });
    } else {
      await createDepartment.mutateAsync(data);
    }
    onRefresh?.();
  };

  const handleConfirmDelete = async () => {
    if (departmentToDelete) {
      await deleteDepartment.mutateAsync(departmentToDelete.id);
      setDeleteAlertOpen(false);
      setDepartmentToDelete(null);
      onRefresh?.();
    }
  };

  const filteredDepartments = departments.filter(dept => {
    const nameMatch = dept.name.toLowerCase().includes(searchQuery.toLowerCase());
    const managerMatch = dept.manager
      ? `${dept.manager.voornaam} ${dept.manager.achternaam}`.toLowerCase().includes(searchQuery.toLowerCase())
      : false;
    return nameMatch || managerMatch;
  });

  return (
    <>
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Afdelingen
          </CardTitle>
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Zoek afdeling..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button onClick={handleCreateClick} className="gap-2">
              <Plus className="h-4 w-4" />
              Nieuwe afdeling
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground text-center py-8">Laden...</p>
          ) : filteredDepartments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                {searchQuery ? 'Geen afdelingen gevonden' : 'Nog geen afdelingen aangemaakt'}
              </p>
              {!searchQuery && (
                <Button onClick={handleCreateClick} variant="outline" className="mt-4 gap-2">
                  <Plus className="h-4 w-4" />
                  Maak je eerste afdeling
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Naam</TableHead>
                    <TableHead className="hidden md:table-cell">Beschrijving</TableHead>
                    <TableHead>Manager</TableHead>
                    <TableHead className="text-center">
                      <Users className="h-4 w-4 mx-auto" />
                    </TableHead>
                    <TableHead className="text-right">Acties</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDepartments.map((department) => (
                    <TableRow key={department.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                          {department.name}
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <p className="text-sm text-muted-foreground line-clamp-1">
                          {department.description || '—'}
                        </p>
                      </TableCell>
                      <TableCell>
                        {department.manager ? (
                          <Badge variant="secondary" className="font-normal">
                            {department.manager.voornaam} {department.manager.achternaam}
                          </Badge>
                        ) : (
                          <span className="text-sm text-muted-foreground">Geen manager</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline">
                          {department.employee_count || 0}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEditClick(department)}
                            className="h-8 w-8"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteClick(department)}
                            className="h-8 w-8 text-destructive hover:text-destructive"
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

      <DepartmentDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        department={selectedDepartment}
        onSubmit={handleSubmit}
      />

      <DeleteDepartmentAlert
        open={deleteAlertOpen}
        onOpenChange={setDeleteAlertOpen}
        department={departmentToDelete}
        onConfirm={handleConfirmDelete}
      />
    </>
  );
}
