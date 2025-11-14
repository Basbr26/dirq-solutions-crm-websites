import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TasksList } from '@/components/TasksList';
import { CheckCircle2, Clock, Users, AlertTriangle } from 'lucide-react';
import { DashboardHeader } from '@/components/DashboardHeader';
import { useAuth } from '@/hooks/useAuth';
import { getManagerCases, getManagerTasks } from '@/lib/supabaseHelpers';
import { SickLeaveCase, Task } from '@/types/sickLeave';
import { format, isToday, isTomorrow, startOfWeek, endOfWeek } from 'date-fns';
import { nl } from 'date-fns/locale';
import { toast } from 'sonner';

const statusConfig = {
  actief: { label: 'Actief', variant: 'destructive' as const },
  herstel: { label: 'Herstel', variant: 'default' as const },
  afgesloten: { label: 'Afgesloten', variant: 'secondary' as const },
};

export default function DashboardManager() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [cases, setCases] = useState<SickLeaveCase[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user && profile) {
      loadData();
    }
  }, [user, profile]);

  const loadData = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const [casesData, tasksData] = await Promise.all([
        getManagerCases(user.id),
        getManagerTasks(user.id)
      ]);
      
      setCases((casesData || []).map(c => ({
        ...c,
        reason: typeof c.reason === 'string' ? c.reason : '',
      })));
      setTasks(tasksData || []);
    } catch (error) {
      console.error('Error loading manager data:', error);
      toast.error('Fout bij laden van gegevens');
    } finally {
      setLoading(false);
    }
  };

  const stats = {
    totalTeam: cases.length > 0 ? cases.filter(c => c.case_status !== 'gesloten').length : 0,
    sickCount: cases.filter(c => c.case_status === 'actief').length,
    recoveryCount: cases.filter(c => c.case_status === 'herstel_gemeld').length,
    openTasks: tasks.filter(t => t.task_status === 'open').length,
    tasksToday: tasks.filter(t => t.task_status === 'open' && t.deadline && isToday(new Date(t.deadline))).length,
    completedThisWeek: tasks.filter(t => 
      t.task_status === 'afgerond' && 
      t.completed_at && 
      new Date(t.completed_at) >= startOfWeek(new Date()) &&
      new Date(t.completed_at) <= endOfWeek(new Date())
    ).length,
    overdueTasks: tasks.filter(t => 
      t.task_status !== 'afgerond' && 
      t.deadline && 
      new Date(t.deadline) < new Date()
    ).length,
  };

  const myTasks = tasks
    .filter(t => t.assigned_to === user?.id && t.task_status !== 'afgerond')
    .sort((a, b) => {
      if (!a.deadline) return 1;
      if (!b.deadline) return -1;
      return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
    })
    .slice(0, 5);

  const activeCases = cases
    .filter(c => c.case_status === 'actief' || c.case_status === 'herstel_gemeld')
    .sort((a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime())
    .slice(0, 5);

  const getDeadlineLabel = (deadline: string | null) => {
    if (!deadline) return 'Geen deadline';
    const date = new Date(deadline);
    if (isToday(date)) return 'Vandaag';
    if (isTomorrow(date)) return 'Morgen';
    return format(date, 'd MMM', { locale: nl });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-secondary">
        <DashboardHeader title="Manager Dashboard" />
        <main className="container mx-auto px-6 py-8">
          <p className="text-muted-foreground">Laden...</p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-secondary">
      <DashboardHeader title="Manager Dashboard" />

      <main className="container mx-auto px-6 py-8">
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview">Overzicht</TabsTrigger>
            <TabsTrigger value="tasks">Taken</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
        <div className="grid gap-6 md:grid-cols-4 mb-8">
          <Card className="shadow-dirq">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Actief Ziek
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-3xl font-bold text-foreground">{stats.sickCount}</div>
                <Users className="h-8 w-8 text-destructive" />
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {stats.recoveryCount} in herstel
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-dirq">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Openstaande Taken
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-3xl font-bold text-foreground">{stats.openTasks}</div>
                <Clock className="h-8 w-8 text-primary" />
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {stats.tasksToday} vandaag
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-dirq">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Afgerond Deze Week
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-3xl font-bold text-foreground">{stats.completedThisWeek}</div>
                <CheckCircle2 className="h-8 w-8 text-green-600" />
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Goed werk!
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-dirq">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Vertraagde Taken
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-3xl font-bold text-foreground">{stats.overdueTasks}</div>
                <AlertTriangle className="h-8 w-8 text-orange-600" />
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Actie vereist
              </p>
            </CardContent>
          </Card>
        </div>

        <Card className="shadow-dirq mb-6">
          <CardHeader>
            <CardTitle>Mijn Taken</CardTitle>
            <CardDescription>
              Taken die op jou wachten
            </CardDescription>
          </CardHeader>
          <CardContent>
            {myTasks.length === 0 ? (
              <p className="text-muted-foreground text-sm">Geen openstaande taken</p>
            ) : (
              <div className="space-y-3">
                {myTasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors cursor-pointer"
                    onClick={() => navigate(`/case/${task.case_id}`)}
                  >
                    <div>
                      <p className="font-medium text-foreground">{task.title}</p>
                      <p className="text-sm text-muted-foreground">
                        Deadline: {getDeadlineLabel(task.deadline)}
                      </p>
                    </div>
                    <Button size="sm" onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/case/${task.case_id}`);
                    }}>
                      Bekijk Case
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-dirq">
          <CardHeader>
            <CardTitle>Mijn Team - Verzuimoverzicht</CardTitle>
            <CardDescription>
              Teamleden met actief verzuim
            </CardDescription>
          </CardHeader>
          <CardContent>
            {activeCases.length === 0 ? (
              <p className="text-muted-foreground text-sm">Geen actieve verzuimcases</p>
            ) : (
              <div className="space-y-3">
                {activeCases.map((case_) => (
                  <div
                    key={case_.id}
                    className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors cursor-pointer"
                    onClick={() => navigate(`/case/${case_.id}`)}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <p className="font-medium text-foreground">{case_.employee?.voornaam} {case_.employee?.achternaam}</p>
                        <Badge variant={statusConfig[case_.case_status].variant}>
                          {statusConfig[case_.case_status].label}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Ziek sinds: {format(new Date(case_.start_date), 'd MMMM yyyy', { locale: nl })}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Reden: {case_.reason}
                      </p>
                    </div>
                    <Button size="sm" variant="outline">
                      Bekijk
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
          </TabsContent>

          <TabsContent value="tasks">
            <TasksList tasks={tasks} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
