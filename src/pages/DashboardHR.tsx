import { useState, useEffect } from 'react';
import { DashboardHeader } from '@/components/DashboardHeader';
import { ZiekmeldingDialog } from '@/components/ZiekmeldingDialog';
import { CaseCard } from '@/components/CaseCard';
import { AnalyticsDashboard } from '@/components/AnalyticsDashboard';
import { Input } from '@/components/ui/input';
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

export default function DashboardHR() {
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
        .select('*')
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
        .select('*')
        .order('deadline', { ascending: true });
      
      if (error) throw error;
      setTasks(data || []);
    } catch (error) {
      console.error('Error loading tasks:', error);
      toast.error('Fout bij laden van taken');
    }
  };

  const handleNewCase = async (data: any) => {
    if (!user) return;

    try {
      const { data: newCase, error: caseError } = await supabase
        .from('sick_leave_cases')
        .insert({
          medewerker_id: data.medewerker_id,
          medewerker_naam: data.medewerker_naam,
          start_datum: data.start_datum,
          reden: data.reden,
          status: 'actief',
          notities: data.notities || null,
        })
        .select()
        .single();

      if (caseError) throw caseError;

      await generateInitialTasks(newCase.id, newCase.start_datum);
      await createTimelineEvent(
        newCase.id,
        'ziekmelding',
        `Ziekmelding ontvangen: ${newCase.reden}`,
        user.id
      );

      toast.success('Ziekmelding succesvol aangemaakt');
      loadCases();
      loadTasks();
    } catch (error) {
      console.error('Error creating case:', error);
      toast.error('Fout bij aanmaken ziekmelding');
    }
  };

  const filteredCases = cases.filter(c => {
    const matchesSearch = c.medewerker_naam.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         c.reden.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: cases.length,
    actief: cases.filter(c => c.status === 'actief').length,
    herstel: cases.filter(c => c.status === 'herstel').length,
    afgesloten: cases.filter(c => c.status === 'afgesloten').length,
  };

  const handleExportCases = () => {
    exportCasesToCSV(cases);
    toast.success('Ziekmeldingen geëxporteerd naar CSV');
  };

  const handleExportTasks = () => {
    exportTasksToCSV(tasks, cases);
    toast.success('Taken geëxporteerd naar CSV');
  };

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader title="HR Dashboard" />
      
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold mb-2">Verzuimdossiers</h1>
            <p className="text-muted-foreground">
              Overzicht van alle verzuimcases
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleExportCases}>
              <Download className="h-4 w-4 mr-2" />
              Export Gevallen
            </Button>
            <Button variant="outline" onClick={handleExportTasks}>
              <Download className="h-4 w-4 mr-2" />
              Export Taken
            </Button>
            <ZiekmeldingDialog onSubmit={handleNewCase} />
          </div>
        </div>

        <Tabs defaultValue="overzicht" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="overzicht">Overzicht</TabsTrigger>
            <TabsTrigger value="analyse">
              <BarChart3 className="h-4 w-4 mr-2" />
              Analyse & Rapportage
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overzicht" className="space-y-6">
            <div className="grid gap-4 md:grid-cols-4">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-lg bg-primary/10">
                      <Users className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Totaal</p>
                      <p className="text-2xl font-bold">{stats.total}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-lg bg-destructive/10">
                      <TrendingUp className="h-6 w-6 text-destructive" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Actief</p>
                      <p className="text-2xl font-bold">{stats.actief}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-lg bg-primary/10">
                      <Clock className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Herstel</p>
                      <p className="text-2xl font-bold">{stats.herstel}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-lg bg-secondary/10">
                      <Users className="h-6 w-6 text-secondary-foreground" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Afgesloten</p>
                      <p className="text-2xl font-bold">{stats.afgesloten}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="flex gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Zoek op naam of reden..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as CaseStatus | 'all')}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle statussen</SelectItem>
                  <SelectItem value="actief">Actief</SelectItem>
                  <SelectItem value="herstel">Herstel</SelectItem>
                  <SelectItem value="afgesloten">Afgesloten</SelectItem>
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
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredCases.map((caseItem) => (
                  <CaseCard 
                    key={caseItem.id} 
                    case_={caseItem} 
                    onClick={() => window.location.href = `/case/${caseItem.id}`}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="analyse">
            <AnalyticsDashboard cases={cases} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
