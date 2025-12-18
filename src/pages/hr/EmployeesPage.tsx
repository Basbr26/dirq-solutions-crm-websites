import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Search, Plus, Filter, Users, UserCheck, UserMinus, Clock } from 'lucide-react';
import { CreateEmployeeDialog } from '@/components/employee/CreateEmployeeDialog';

interface Employee {
  id: string;
  voornaam: string;
  achternaam: string;
  email: string;
  functie: string | null;
  telefoon: string | null;
  foto_url: string | null;
  department_id: string | null;
  employment_status: string | null;
  contract_type: string | null;
  start_date: string | null;
  hours_per_week: number | null;
  department?: {
    name: string;
  } | null;
}

export default function EmployeesPage() {
  const navigate = useNavigate();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [departments, setDepartments] = useState<{ id: string; name: string }[]>([]);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      console.log('🔍 Loading employees list...');
      
      // Get current user to check role
      const { data: { user } } = await supabase.auth.getUser();
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user?.id || '')
        .single();
      
      // Build employees query with manager filter
      let employeesQuery = supabase
        .from('profiles')
        .select('*, department:departments!profiles_department_id_fkey(name)');
      
      // Managers can only see their direct reports
      if (profile?.role === 'manager' && user) {
        employeesQuery = employeesQuery.eq('manager_id', user.id);
      }
      
      employeesQuery = employeesQuery.order('achternaam', { ascending: true });
      
      const [employeesResult, departmentsResult] = await Promise.all([
        employeesQuery,
        supabase
          .from('departments')
          .select('id, name')
          .order('name', { ascending: true }),
      ]);

      console.log('📊 Employees query:', {
        count: employeesResult.data?.length || 0,
        error: employeesResult.error
      });
      console.log('📊 Departments query:', {
        count: departmentsResult.data?.length || 0,
        error: departmentsResult.error
      });

      if (employeesResult.error) {
        console.error('❌ Employees query error:', employeesResult.error);
        throw employeesResult.error;
      }
      if (departmentsResult.error) {
        console.error('❌ Departments query error:', departmentsResult.error);
        throw departmentsResult.error;
      }

      console.log('✅ Employees loaded:', employeesResult.data?.length || 0);
      setEmployees(employeesResult.data || []);
      setDepartments(departmentsResult.data || []);
    } catch (error) {
      console.error('❌ Error loading employees:', error);
      console.error('Error details:', {
        message: error instanceof Error ? error.message : 'Unknown',
        code: (error as any)?.code,
        details: (error as any)?.details,
        hint: (error as any)?.hint
      });
      toast.error('Fout bij laden van medewerkers');
    } finally {
      setLoading(false);
    }
  };

  const filteredEmployees = employees.filter(emp => {
    const matchesSearch = 
      `${emp.voornaam} ${emp.achternaam}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.functie?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || emp.employment_status === statusFilter;
    const matchesDepartment = departmentFilter === 'all' || emp.department_id === departmentFilter;
    
    return matchesSearch && matchesStatus && matchesDepartment;
  });

  const stats = {
    total: employees.length,
    actief: employees.filter(e => e.employment_status === 'actief').length,
    metVerlof: employees.filter(e => e.employment_status === 'met_verlof').length,
    uitDienst: employees.filter(e => e.employment_status === 'uit_dienst').length,
  };

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case 'actief':
        return <Badge variant="default" className="bg-success text-success-foreground">Actief</Badge>;
      case 'met_verlof':
        return <Badge variant="secondary">Met verlof</Badge>;
      case 'uit_dienst':
        return <Badge variant="outline" className="text-muted-foreground">Uit dienst</Badge>;
      case 'inactief':
        return <Badge variant="destructive">Inactief</Badge>;
      default:
        return <Badge variant="outline">Onbekend</Badge>;
    }
  };

  const getContractLabel = (type: string | null) => {
    switch (type) {
      case 'fulltime': return 'Voltijd';
      case 'parttime': return 'Deeltijd';
      case 'tijdelijk': return 'Tijdelijk';
      case 'oproep': return 'Oproep';
      case 'stage': return 'Stage';
      default: return '-';
    }
  };

  return (
    <AppLayout 
      title="Medewerkers" 
      subtitle={`${stats.total} medewerkers in totaal`}
      actions={
        <Button onClick={() => setCreateDialogOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Nieuwe medewerker</span>
        </Button>
      }
    >
      <div className="p-4 md:p-6 space-y-6">
        {/* Stats */}
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Totaal</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-success/10">
                  <UserCheck className="h-5 w-5 text-success" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Actief</p>
                  <p className="text-2xl font-bold">{stats.actief}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-warning/10">
                  <Clock className="h-5 w-5 text-warning" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Met verlof</p>
                  <p className="text-2xl font-bold">{stats.metVerlof}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-muted">
                  <UserMinus className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Uit dienst</p>
                  <p className="text-2xl font-bold">{stats.uitDienst}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Zoek op naam, email of functie..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle statussen</SelectItem>
              <SelectItem value="actief">Actief</SelectItem>
              <SelectItem value="met_verlof">Met verlof</SelectItem>
              <SelectItem value="inactief">Inactief</SelectItem>
              <SelectItem value="uit_dienst">Uit dienst</SelectItem>
            </SelectContent>
          </Select>
          <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Afdeling" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle afdelingen</SelectItem>
              {departments.map(dept => (
                <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Employee Table */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[300px]">Medewerker</TableHead>
                    <TableHead>Functie</TableHead>
                    <TableHead>Afdeling</TableHead>
                    <TableHead>Contract</TableHead>
                    <TableHead>Uren</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell colSpan={6}>
                          <div className="h-12 bg-muted animate-pulse rounded" />
                        </TableCell>
                      </TableRow>
                    ))
                  ) : filteredEmployees.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        {searchQuery || statusFilter !== 'all' || departmentFilter !== 'all'
                          ? 'Geen medewerkers gevonden met deze filters'
                          : 'Nog geen medewerkers'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredEmployees.map((employee) => (
                      <TableRow 
                        key={employee.id} 
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => navigate(`/hr/medewerkers/${employee.id}`)}
                      >
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10">
                              <AvatarImage src={employee.foto_url || undefined} />
                              <AvatarFallback className="bg-primary/10 text-primary font-medium">
                                {employee.voornaam?.[0]}{employee.achternaam?.[0]}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">{employee.voornaam} {employee.achternaam}</p>
                              <p className="text-sm text-muted-foreground">{employee.email}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{employee.functie || '-'}</TableCell>
                        <TableCell>{employee.department?.name || '-'}</TableCell>
                        <TableCell>{getContractLabel(employee.contract_type)}</TableCell>
                        <TableCell>{employee.hours_per_week ? `${employee.hours_per_week}u` : '-'}</TableCell>
                        <TableCell>{getStatusBadge(employee.employment_status)}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      <CreateEmployeeDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSuccess={loadData}
      />
    </AppLayout>
  );
}
