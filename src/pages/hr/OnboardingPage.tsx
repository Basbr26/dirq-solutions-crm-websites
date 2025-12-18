import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { format, addDays } from 'date-fns';
import { nl } from 'date-fns/locale';
import { 
  UserPlus, 
  CheckCircle2, 
  Clock, 
  Users, 
  ClipboardList,
  ChevronRight,
  Play,
  Eye,
  Settings
} from 'lucide-react';
import { Link } from 'react-router-dom';

interface OnboardingSession {
  id: string;
  employee_id: string;
  template_id: string | null;
  status: string;
  start_date: string;
  target_completion_date: string | null;
  completed_at: string | null;
  notes: string | null;
  created_at: string;
  employee?: {
    id: string;
    voornaam: string;
    achternaam: string;
    email: string;
    functie: string | null;
  };
  tasks_count?: number;
  completed_tasks_count?: number;
}

interface OnboardingTemplate {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
}

interface Employee {
  id: string;
  voornaam: string;
  achternaam: string;
  email: string;
  functie: string | null;
  start_date: string | null;
}

export default function OnboardingPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<string>('');
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');

  // Fetch onboarding sessions
  const { data: sessions = [], isLoading: sessionsLoading } = useQuery({
    queryKey: ['onboarding-sessions'],
    queryFn: async () => {
      const { data: sessionsData, error } = await supabase
        .from('onboarding_sessions')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch employee data and task counts for each session
      const sessionsWithDetails = await Promise.all(
        (sessionsData || []).map(async (session) => {
          const [employeeResult, tasksResult] = await Promise.all([
            supabase
              .from('profiles')
              .select('id, voornaam, achternaam, email, functie')
              .eq('id', session.employee_id)
              .maybeSingle(),
            supabase
              .from('onboarding_tasks')
              .select('id, is_completed')
              .eq('session_id', session.id)
          ]);

          const tasks = tasksResult.data || [];
          return {
            ...session,
            employee: employeeResult.data,
            tasks_count: tasks.length,
            completed_tasks_count: tasks.filter(t => t.is_completed).length
          };
        })
      );

      return sessionsWithDetails as OnboardingSession[];
    }
  });

  // Fetch templates
  const { data: templates = [] } = useQuery({
    queryKey: ['onboarding-templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('onboarding_templates')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      return data as OnboardingTemplate[];
    }
  });

  // Fetch employees without active onboarding
  const { data: availableEmployees = [] } = useQuery({
    queryKey: ['available-employees-for-onboarding'],
    queryFn: async () => {
      const { data: allEmployees, error: empError } = await supabase
        .from('profiles')
        .select('id, voornaam, achternaam, email, functie, start_date')
        .order('voornaam');

      if (empError) throw empError;

      const { data: activeSessions } = await supabase
        .from('onboarding_sessions')
        .select('employee_id')
        .eq('status', 'in_progress');

      const activeEmployeeIds = new Set((activeSessions || []).map(s => s.employee_id));
      return (allEmployees || []).filter(emp => !activeEmployeeIds.has(emp.id)) as Employee[];
    }
  });

  // Create onboarding session
  const createSessionMutation = useMutation({
    mutationFn: async () => {
      if (!selectedEmployee || !selectedTemplate) {
        throw new Error('Selecteer een medewerker en template');
      }

      // Get template items
      const { data: templateItems, error: itemsError } = await supabase
        .from('onboarding_template_items')
        .select('*')
        .eq('template_id', selectedTemplate)
        .order('sort_order');

      if (itemsError) throw itemsError;

      // Create session
      const startDate = new Date();
      const maxDueDays = Math.max(...(templateItems || []).map(item => item.due_days || 7));
      const targetDate = addDays(startDate, maxDueDays);

      const { data: session, error: sessionError } = await supabase
        .from('onboarding_sessions')
        .insert({
          employee_id: selectedEmployee,
          template_id: selectedTemplate,
          start_date: format(startDate, 'yyyy-MM-dd'),
          target_completion_date: format(targetDate, 'yyyy-MM-dd'),
          created_by: user?.id
        })
        .select()
        .single();

      if (sessionError) throw sessionError;

      // Create tasks from template items
      const tasks = (templateItems || []).map(item => ({
        session_id: session.id,
        template_item_id: item.id,
        title: item.title,
        description: item.description,
        category: item.category,
        due_date: format(addDays(startDate, item.due_days || 7), 'yyyy-MM-dd'),
        is_required: item.is_required,
        sort_order: item.sort_order,
        assigned_to: item.assigned_to_role === 'employee' ? selectedEmployee : user?.id
      }));

      const { error: tasksError } = await supabase
        .from('onboarding_tasks')
        .insert(tasks);

      if (tasksError) throw tasksError;

      return session;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['onboarding-sessions'] });
      queryClient.invalidateQueries({ queryKey: ['available-employees-for-onboarding'] });
      setIsDialogOpen(false);
      setSelectedEmployee('');
      setSelectedTemplate('');
      toast.success('Onboarding gestart');
    },
    onError: (error) => {
      toast.error('Fout bij starten onboarding: ' + error.message);
    }
  });

  const activeSessions = sessions.filter(s => s.status === 'in_progress');
  const completedSessions = sessions.filter(s => s.status === 'completed');

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'in_progress':
        return <Badge variant="default" className="bg-blue-500">Actief</Badge>;
      case 'completed':
        return <Badge variant="default" className="bg-green-500">Voltooid</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">Geannuleerd</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getProgress = (session: OnboardingSession) => {
    if (!session.tasks_count) return 0;
    return Math.round((session.completed_tasks_count || 0) / session.tasks_count * 100);
  };

  return (
    <AppLayout 
      title="Onboarding" 
      subtitle="Beheer het inwerkproces van nieuwe medewerkers"
    >
      <div className="p-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-900">
                  <Play className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{activeSessions.length}</p>
                  <p className="text-sm text-muted-foreground">Actieve onboardings</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-green-100 dark:bg-green-900">
                  <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{completedSessions.length}</p>
                  <p className="text-sm text-muted-foreground">Afgerond</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-purple-100 dark:bg-purple-900">
                  <ClipboardList className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{templates.length}</p>
                  <p className="text-sm text-muted-foreground">Templates</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-orange-100 dark:bg-orange-900">
                  <Users className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{availableEmployees.length}</p>
                  <p className="text-sm text-muted-foreground">Beschikbaar</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Actions */}
        <div className="flex justify-between items-center flex-wrap gap-2">
          <h2 className="text-lg font-semibold">Onboarding Overzicht</h2>
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link to="/hr/onboarding/templates">
                <Settings className="h-4 w-4 mr-2" />
                Templates beheren
              </Link>
            </Button>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Nieuwe Onboarding
                </Button>
              </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Onboarding Starten</DialogTitle>
                <DialogDescription>
                  Start het inwerkproces voor een nieuwe medewerker
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Medewerker</Label>
                  <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecteer medewerker" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover">
                      {availableEmployees.filter(e => e.id && e.id.trim() !== '').map((emp) => (
                        <SelectItem key={emp.id} value={emp.id}>
                          {emp.voornaam} {emp.achternaam} - {emp.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Onboarding Template</Label>
                  <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecteer template" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover">
                      {templates.filter(t => t.id && t.id.trim() !== '').map((template) => (
                        <SelectItem key={template.id} value={template.id}>
                          {template.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Annuleren
                </Button>
                <Button 
                  onClick={() => createSessionMutation.mutate()}
                  disabled={!selectedEmployee || !selectedTemplate || createSessionMutation.isPending}
                >
                  {createSessionMutation.isPending ? 'Bezig...' : 'Starten'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          </div>
        </div>

        {/* Sessions List */}
        <Tabs defaultValue="active">
          <TabsList>
            <TabsTrigger value="active">Actief ({activeSessions.length})</TabsTrigger>
            <TabsTrigger value="completed">Afgerond ({completedSessions.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="mt-4">
            {sessionsLoading ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  Laden...
                </CardContent>
              </Card>
            ) : activeSessions.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  Geen actieve onboardings
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {activeSessions.map((session) => (
                  <Card key={session.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                            <span className="text-lg font-semibold text-primary">
                              {session.employee?.voornaam?.[0]}{session.employee?.achternaam?.[0]}
                            </span>
                          </div>
                          <div>
                            <h3 className="font-semibold">
                              {session.employee?.voornaam} {session.employee?.achternaam}
                            </h3>
                            <p className="text-sm text-muted-foreground">
                              {session.employee?.functie || session.employee?.email}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <div className="flex items-center gap-2 mb-1">
                              {getStatusBadge(session.status)}
                            </div>
                            <p className="text-xs text-muted-foreground">
                              Gestart: {format(new Date(session.start_date), 'd MMM yyyy', { locale: nl })}
                            </p>
                          </div>
                          <Button variant="ghost" size="icon" asChild>
                            <Link to={`/hr/onboarding/${session.id}`}>
                              <ChevronRight className="h-5 w-5" />
                            </Link>
                          </Button>
                        </div>
                      </div>
                      <div className="mt-4">
                        <div className="flex items-center justify-between text-sm mb-2">
                          <span className="text-muted-foreground">Voortgang</span>
                          <span className="font-medium">
                            {session.completed_tasks_count || 0} / {session.tasks_count || 0} taken
                          </span>
                        </div>
                        <Progress value={getProgress(session)} className="h-2" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="completed" className="mt-4">
            {completedSessions.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  Geen afgeronde onboardings
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {completedSessions.map((session) => (
                  <Card key={session.id}>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="h-12 w-12 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                            <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400" />
                          </div>
                          <div>
                            <h3 className="font-semibold">
                              {session.employee?.voornaam} {session.employee?.achternaam}
                            </h3>
                            <p className="text-sm text-muted-foreground">
                              Afgerond: {session.completed_at ? format(new Date(session.completed_at), 'd MMM yyyy', { locale: nl }) : '-'}
                            </p>
                          </div>
                        </div>
                        <Button variant="ghost" size="icon" asChild>
                          <Link to={`/hr/onboarding/${session.id}`}>
                            <Eye className="h-5 w-5" />
                          </Link>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
