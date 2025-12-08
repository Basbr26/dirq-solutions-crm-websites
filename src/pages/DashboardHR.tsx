import { useState, useEffect } from 'react';
import { DashboardHeader } from '@/components/DashboardHeader';
import { ZiekmeldingWizard } from '@/components/ZiekmeldingWizard';
import { CaseCard } from '@/components/CaseCard';
import { AnalyticsDashboard } from '@/components/AnalyticsDashboard';
import { Input } from '@/components/ui/input';
import { TasksList } from '@/components/TasksList';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SickLeaveCase, CaseStatus, Task } from '@/types/sickLeave';
import { Search, TrendingUp, Users, Clock, BarChart3, Download } from 'lucide-react';
import { exportCasesToCSV, exportTasksToCSV } from '@/lib/exportUtils';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { generateInitialTasks, createTimelineEvent } from '@/lib/supabaseHelpers';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { MobileBottomNav } from '@/components/MobileBottomNav';

export default function DashboardHR() {
    const handleDeleteCase = async (caseId: string) => {
      if (!window.confirm('Weet je zeker dat je deze ziekmelding wilt verwijderen? Dit verwijdert ook alle gerelateerde taken, documenten en tijdlijn gebeurtenissen.')) return;
      
      try {
        // Eerst verwijder gerelateerde taken
        const { error: tasksError } = await supabase
          .from('tasks')
          .delete()
          .eq('case_id', caseId);
        
        if (tasksError) throw tasksError;

        // Verwijder documenten
        const { error: docsError } = await supabase
          .from('documents')
          .delete()
          .eq('case_id', caseId);
        
        if (docsError) throw docsError;

        // Verwijder timeline events
        const { error: timelineError } = await supabase
          .from('timeline_events')
          .delete()
          .eq('case_id', caseId);
        
        if (timelineError) throw timelineError;

        // Nu verwijder de case zelf
        const { error: caseError } = await supabase
          .from('sick_leave_cases')
          .delete()
          .eq('id', caseId);
        
        if (caseError) throw caseError;

        toast.success('Ziekmelding en alle gerelateerde gegevens verwijderd');
        loadCases();
        loadTasks();
      } catch (error) {
        toast.error('Verwijderen mislukt: ' + (error instanceof Error ? error.message : 'Onbekende fout'));
        console.error('Delete error:', error);
      }
    };
  const { user } = useAuth();
  const navigate = useNavigate();
  const [cases, setCases] = useState<SickLeaveCase[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<CaseStatus | 'all'>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCases();
    loadTasks();
  }, []);

  const loadCases = async () => {
    try {
      const { data, error } = await supabase
        .from('sick_leave_cases')
        .select('*, employee:profiles!sick_leave_cases_employee_id_fkey(voornaam, achternaam, email)')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setCases(data || []);
    } catch (error) {
      console.error('Error loading cases:', error);
      toast.error('Fout bij laden van cases');
    } finally {
      setLoading(false);
    }
  };

  const loadTasks = async () => {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select(`
          *,
          assigned_user:profiles!tasks_assigned_to_fkey (
            voornaam,
            achternaam
          ),
          case:sick_leave_cases!inner (
            id,
            employee_id,
            employee:profiles!sick_leave_cases_employee_id_fkey (
              voornaam,
              achternaam
            )
          )
        `)
        .order('deadline', { ascending: true });
      
      if (error) throw error;
      setTasks(data || []);
    } catch (error) {
      console.error('Error loading tasks:', error);
      toast.error('Fout bij laden van taken');
    }
  };

  const handleNewCase = async (data: {
    employee_id: string;
    start_date: string;
    functional_limitations: string;
    expected_recovery_date: string;
    availability_notes?: string;
    can_work_partial?: boolean;
    partial_work_description?: string;
  }): Promise<string | undefined> => {
    if (!user) {
      toast.error('Je moet ingelogd zijn om een case aan te maken');
      return;
    }

    try {
      // Insert new case met correcte property names
      const { data: newCase, error: caseError } = await supabase
        .from('sick_leave_cases')
        .insert({
          employee_id: data.employee_id,
          start_date: data.start_date,
          functional_limitations: data.functional_limitations,
          case_status: 'actief',
          created_by: user.id,
          expected_recovery_date: data.expected_recovery_date || null,
          availability_notes: data.availability_notes || null,
          can_work_partial: data.can_work_partial || false,
          partial_work_description: data.partial_work_description || null,
        })
        .select('*, employee:profiles!employee_id(voornaam, achternaam, email)')
        .single();

      if (caseError) {
        console.error('Supabase error:', caseError);
        throw caseError;
      }

      // Generate initial tasks - assigned to employee's manager
      await generateInitialTasks(newCase.id, newCase.start_date, data.employee_id, user.id);
      
      // Create timeline event
      await createTimelineEvent(
        newCase.id,
        'ziekmelding',
        `Ziekmelding ontvangen: ${newCase.functional_limitations}`,
        user.id
      );

      toast.success('Ziekmelding succesvol aangemaakt');
      loadCases();
      loadTasks();
      return newCase.id;
    } catch (error: unknown) {
      console.error('Error creating case:', error);
      toast.error(
        `Fout bij aanmaken ziekmelding: ${
          typeof error === 'object' && error !== null && 'message' in error
            ? (error as { message?: string }).message
            : 'Onbekende fout'
        }`
      );
      return undefined;
    }
  };

  const filteredCases = cases.filter(c => {
    const employeeName = c.employee 
      ? (c.employee.voornaam && c.employee.achternaam 
          ? `${c.employee.voornaam} ${c.employee.achternaam}`.toLowerCase()
          : c.employee.email?.toLowerCase() || '')
      : '';
    const limitations = c.functional_limitations?.toLowerCase() || '';
    
    const matchesSearch = employeeName.includes(searchQuery.toLowerCase()) ||
                         limitations.includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || c.case_status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: cases.length,
    actief: cases.filter(c => c.case_status === 'actief').length,
    herstel_gemeld: cases.filter(c => c.case_status === 'herstel_gemeld').length,
    gesloten: cases.filter(c => c.case_status === 'gesloten').length,
  };

  const handleExportCases = () => {
    exportCasesToCSV(cases);
    toast.success('Ziekmeldingen geÃ«xporteerd naar CSV');
  };

  const handleExportTasks = () => {
    exportTasksToCSV(tasks, cases);
    toast.success('Taken geÃ«xporteerd naar CSV');
  };

  return (
    <div className="min-h-screen bg-background pb-20 sm:pb-0">
      <DashboardHeader title="HR Dashboard" />
      
      <div className="container mx-auto px-4 sm:px-6 py-4 sm:py-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-1 sm:mb-2">Verzuimdossiers</h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              Overzicht van alle verzuimcases
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={handleExportCases} className="text-xs sm:text-sm">
              <Download className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Export Gevallen</span>
              <span className="sm:hidden">Gevallen</span>
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportTasks} className="text-xs sm:text-sm">
              <Download className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Export Taken</span>
              <span className="sm:hidden">Taken</span>
            </Button>
            <ZiekmeldingWizard onSubmit={handleNewCase} />
          </div>
        </div>

        <Tabs defaultValue="overzicht" className="w-full">
          <TabsList className="mb-4 sm:mb-6 w-full sm:w-auto grid grid-cols-3 sm:flex">
            <TabsTrigger value="overzicht" className="text-xs sm:text-sm">Overzicht</TabsTrigger>
            <TabsTrigger value="taken" className="text-xs sm:text-sm">Taken</TabsTrigger>
            <TabsTrigger value="analyse" className="text-xs sm:text-sm gap-1 sm:gap-2">
              <BarChart3 className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Analyse & Rapportage</span>
              <span className="sm:hidden">Analyse</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overzicht" className="space-y-4 sm:space-y-6">
            <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardContent className="p-4 sm:p-6">
                  <div className="flex items-center gap-2 sm:gap-4">
                    <div className="p-2 sm:p-3 rounded-lg bg-primary/10 flex-shrink-0">
                      <Users className="h-4 w-4 sm:h-6 sm:w-6 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm text-muted-foreground">Totaal</p>
                      <p className="text-xl sm:text-2xl font-bold">{stats.total}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4 sm:p-6">
                  <div className="flex items-center gap-2 sm:gap-4">
                    <div className="p-2 sm:p-3 rounded-lg bg-destructive/10 flex-shrink-0">
                      <TrendingUp className="h-4 w-4 sm:h-6 sm:w-6 text-destructive" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm text-muted-foreground">Actief</p>
                      <p className="text-xl sm:text-2xl font-bold">{stats.actief}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4 sm:p-6">
                  <div className="flex items-center gap-2 sm:gap-4">
                    <div className="p-2 sm:p-3 rounded-lg bg-primary/10 flex-shrink-0">
                      <Clock className="h-4 w-4 sm:h-6 sm:w-6 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm text-muted-foreground truncate">Herstel Gemeld</p>
                      <p className="text-xl sm:text-2xl font-bold">{stats.herstel_gemeld}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4 sm:p-6">
                  <div className="flex items-center gap-2 sm:gap-4">
                    <div className="p-2 sm:p-3 rounded-lg bg-secondary/10 flex-shrink-0">
                      <Users className="h-4 w-4 sm:h-6 sm:w-6 text-secondary-foreground" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm text-muted-foreground">Gesloten</p>
                      <p className="text-xl sm:text-2xl font-bold">{stats.gesloten}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
                <Input
                  placeholder="Zoek op naam..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 sm:pl-10 text-sm h-9 sm:h-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as CaseStatus | 'all')}>
                <SelectTrigger className="w-full sm:w-48 text-sm h-9 sm:h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle statussen</SelectItem>
                  <SelectItem value="actief">Actief</SelectItem>
                  <SelectItem value="herstel_gemeld">Herstel Gemeld</SelectItem>
                  <SelectItem value="gesloten">Gesloten</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {filteredCases.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-muted-foreground">
                    {searchQuery || statusFilter !== 'all' 
                      ? 'Geen ziekmeldingen gevonden met deze filters'
                      : 'Nog geen ziekmeldingen'}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                {filteredCases.map((caseItem) => (
                  <CaseCard 
                    key={caseItem.id}
                    case_={caseItem} 
                    onClick={() => navigate(`/case/${caseItem.id}`)}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="taken">
            <TasksList tasks={tasks} />
          </TabsContent>

          <TabsContent value="analyse">
            <AnalyticsDashboard cases={cases} />
          </TabsContent>
        </Tabs>
      </div>
      
      <MobileBottomNav />
    </div>
  );
}