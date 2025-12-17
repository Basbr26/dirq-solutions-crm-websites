import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Building2, Plus, Search, Users } from 'lucide-react';
import { useDepartments, Department, DepartmentForm } from '@/hooks/useDepartments';
import { DepartmentCard } from '@/components/departments/DepartmentCard';
import { DepartmentDialog } from '@/components/departments/DepartmentDialog';
import { DeleteDepartmentAlert } from '@/components/departments/DeleteDepartmentAlert';
import { Skeleton } from '@/components/ui/skeleton';

export default function DepartmentsPage() {
  const {
    departments,
    isLoading,
    createDepartment,
    updateDepartment,
    deleteDepartment,
  } = useDepartments();

  const [searchQuery, setSearchQuery] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState<Department | null>(null);
  const [deleteAlertOpen, setDeleteAlertOpen] = useState(false);
  const [departmentToDelete, setDepartmentToDelete] = useState<Department | null>(null);

  const filteredDepartments = departments.filter((dept) =>
    dept.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalEmployees = departments.reduce((sum, dept) => sum + (dept.employee_count || 0), 0);

  const handleCreate = () => {
    setSelectedDepartment(null);
    setDialogOpen(true);
  };

  const handleEdit = (department: Department) => {
    setSelectedDepartment(department);
    setDialogOpen(true);
  };

  const handleDeleteClick = (department: Department) => {
    setDepartmentToDelete(department);
    setDeleteAlertOpen(true);
  };

  const handleSubmit = async (data: DepartmentForm) => {
    if (selectedDepartment) {
      await updateDepartment.mutateAsync({ id: selectedDepartment.id, ...data });
    } else {
      await createDepartment.mutateAsync(data);
    }
  };

  const handleDeleteConfirm = async () => {
    if (departmentToDelete) {
      await deleteDepartment.mutateAsync(departmentToDelete.id);
      setDeleteAlertOpen(false);
      setDepartmentToDelete(null);
    }
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-10 w-40" />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </div>
          <Skeleton className="h-10 w-full" />
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-48" />
            ))}
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Building2 className="h-8 w-8" />
              Afdelingen beheer
            </h1>
            <p className="text-muted-foreground mt-1">
              Beheer afdelingen en wijs managers toe
            </p>
          </div>
          <Button onClick={handleCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Nieuwe afdeling
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-primary/10 rounded-lg">
                  <Building2 className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Totaal afdelingen</p>
                  <p className="text-2xl font-bold">{departments.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-500/10 rounded-lg">
                  <Users className="h-6 w-6 text-blue-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Totaal medewerkers</p>
                  <p className="text-2xl font-bold">{totalEmployees}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-green-500/10 rounded-lg">
                  <Users className="h-6 w-6 text-green-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Met manager</p>
                  <p className="text-2xl font-bold">
                    {departments.filter((d) => d.manager_id).length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Zoek afdeling..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Departments Grid */}
        {filteredDepartments.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                {searchQuery ? 'Geen afdelingen gevonden' : 'Geen afdelingen'}
              </h3>
              <p className="text-muted-foreground mb-4">
                {searchQuery
                  ? 'Probeer een andere zoekterm'
                  : 'Begin met het aanmaken van je eerste afdeling'}
              </p>
              {!searchQuery && (
                <Button onClick={handleCreate}>
                  <Plus className="h-4 w-4 mr-2" />
                  Nieuwe afdeling
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredDepartments.map((department) => (
              <DepartmentCard
                key={department.id}
                department={department}
                onEdit={() => handleEdit(department)}
                onDelete={() => handleDeleteClick(department)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Dialogs */}
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
        onConfirm={handleDeleteConfirm}
      />
    </AppLayout>
  );
}
