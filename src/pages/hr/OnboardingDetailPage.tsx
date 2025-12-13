import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';
import { 
  ArrowLeft,
  CheckCircle2, 
  Clock, 
  User,
  Mail,
  Briefcase,
  Calendar,
  FileText,
  Shield,
  Users,
  Laptop,
  ClipboardCheck
} from 'lucide-react';

interface OnboardingTask {
  id: string;
  session_id: string;
  title: string;
  description: string | null;
  category: string;
  due_date: string | null;
  is_required: boolean;
  is_completed: boolean;
  completed_at: string | null;
  completed_by: string | null;
  notes: string | null;
  sort_order: number;
}

interface OnboardingSession {
  id: string;
  employee_id: string;
  status: string;
  start_date: string;
  target_completion_date: string | null;
  completed_at: string | null;
  notes: string | null;
}

const categoryIcons: Record<string, React.ReactNode> = {
  administratie: <FileText className="h-4 w-4" />,
  it: <Laptop className="h-4 w-4" />,
  sociaal: <Users className="h-4 w-4" />,
  compliance: <Shield className="h-4 w-4" />,
  werk: <Briefcase className="h-4 w-4" />,
  algemeen: <ClipboardCheck className="h-4 w-4" />
};

const categoryLabels: Record<string, string> = {
  administratie: 'Administratie',
  it: 'IT & Systemen',
  sociaal: 'Kennismaking',
  compliance: 'Compliance',
  werk: 'Werkzaamheden',
  algemeen: 'Algemeen'
};

const categoryColors: Record<string, string> = {
  administratie: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  it: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
  sociaal: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  compliance: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
  werk: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300',
  algemeen: 'bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-300'
};

export default function OnboardingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [completeDialogOpen, setCompleteDialogOpen] = useState(false);

  // Fetch session with employee data
  const { data: session, isLoading: sessionLoading } = useQuery({
    queryKey: ['onboarding-session', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('onboarding_sessions')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data as OnboardingSession;
    },
    enabled: !!id
  });

  // Fetch employee
  const { data: employee } = useQuery({
    queryKey: ['employee', session?.employee_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, voornaam, achternaam, email, functie, start_date, telefoon')
        .eq('id', session!.employee_id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!session?.employee_id
  });

  // Fetch tasks
  const { data: tasks = [], isLoading: tasksLoading } = useQuery({
    queryKey: ['onboarding-tasks', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('onboarding_tasks')
        .select('*')
        .eq('session_id', id)
        .order('sort_order');

      if (error) throw error;
      return data as OnboardingTask[];
    },
    enabled: !!id
  });

  // Toggle task completion
  const toggleTaskMutation = useMutation({
    mutationFn: async ({ taskId, completed }: { taskId: string; completed: boolean }) => {
      const { error } = await supabase
        .from('onboarding_tasks')
        .update({
          is_completed: completed,
          completed_at: completed ? new Date().toISOString() : null,
          completed_by: completed ? user?.id : null
        })
        .eq('id', taskId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['onboarding-tasks', id] });
    },
    onError: () => {
      toast.error('Fout bij bijwerken taak');
    }
  });

  // Complete session
  const completeSessionMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('onboarding_sessions')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['onboarding-session', id] });
      setCompleteDialogOpen(false);
      toast.success('Onboarding afgerond');
    },
    onError: () => {
      toast.error('Fout bij afronden onboarding');
    }
  });

  const completedTasks = tasks.filter(t => t.is_completed).length;
  const totalTasks = tasks.length;
  const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  const requiredIncomplete = tasks.filter(t => t.is_required && !t.is_completed).length;

  // Group tasks by category
  const tasksByCategory = tasks.reduce((acc, task) => {
    const category = task.category || 'algemeen';
    if (!acc[category]) acc[category] = [];
    acc[category].push(task);
    return acc;
  }, {} as Record<string, OnboardingTask[]>);

  if (sessionLoading || tasksLoading) {
    return (
      <AppLayout title="Onboarding">
        <div className="p-6">
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              Laden...
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  if (!session) {
    return (
      <AppLayout title="Onboarding">
        <div className="p-6">
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              Onboarding niet gevonden
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout 
      title="Onboarding Details"
      actions={
        <Button variant="outline" onClick={() => navigate('/hr/onboarding')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Terug
        </Button>
      }
    >
      <div className="p-6 space-y-6">
        {/* Employee Info */}
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-2xl font-semibold text-primary">
                    {employee?.voornaam?.[0]}{employee?.achternaam?.[0]}
                  </span>
                </div>
                <div>
                  <h2 className="text-xl font-semibold">
                    {employee?.voornaam} {employee?.achternaam}
                  </h2>
                  <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mt-1">
                    <span className="flex items-center gap-1">
                      <Mail className="h-4 w-4" />
                      {employee?.email}
                    </span>
                    {employee?.functie && (
                      <span className="flex items-center gap-1">
                        <Briefcase className="h-4 w-4" />
                        {employee.functie}
                      </span>
                    )}
                    {employee?.start_date && (
                      <span className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        Start: {format(new Date(employee.start_date), 'd MMM yyyy', { locale: nl })}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={session.status === 'completed' ? 'default' : 'secondary'} className={session.status === 'completed' ? 'bg-green-500' : 'bg-blue-500'}>
                  {session.status === 'completed' ? 'Voltooid' : 'Actief'}
                </Badge>
                {session.status === 'in_progress' && requiredIncomplete === 0 && (
                  <Button onClick={() => setCompleteDialogOpen(true)}>
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Afronden
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Progress Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Voortgang</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  {completedTasks} van {totalTasks} taken afgerond
                </span>
                <span className="text-lg font-semibold">{progress}%</span>
              </div>
              <Progress value={progress} className="h-3" />
              <div className="flex flex-wrap gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>Gestart: {format(new Date(session.start_date), 'd MMM yyyy', { locale: nl })}</span>
                </div>
                {session.target_completion_date && (
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span>Streefdatum: {format(new Date(session.target_completion_date), 'd MMM yyyy', { locale: nl })}</span>
                  </div>
                )}
                {requiredIncomplete > 0 && (
                  <div className="flex items-center gap-2 text-orange-600 dark:text-orange-400">
                    <span>{requiredIncomplete} verplichte taken nog open</span>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tasks by Category */}
        <div className="space-y-6">
          {Object.entries(tasksByCategory).map(([category, categoryTasks]) => (
            <Card key={category}>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${categoryColors[category] || categoryColors.algemeen}`}>
                    {categoryIcons[category] || categoryIcons.algemeen}
                  </div>
                  <div>
                    <CardTitle className="text-lg">
                      {categoryLabels[category] || category}
                    </CardTitle>
                    <CardDescription>
                      {categoryTasks.filter(t => t.is_completed).length} / {categoryTasks.length} voltooid
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {categoryTasks.map((task, index) => (
                    <div key={task.id}>
                      {index > 0 && <Separator className="my-3" />}
                      <div className="flex items-start gap-3">
                        <Checkbox
                          checked={task.is_completed}
                          onCheckedChange={(checked) => {
                            toggleTaskMutation.mutate({
                              taskId: task.id,
                              completed: !!checked
                            });
                          }}
                          disabled={session.status === 'completed'}
                          className="mt-1"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className={`font-medium ${task.is_completed ? 'line-through text-muted-foreground' : ''}`}>
                              {task.title}
                            </span>
                            {task.is_required && (
                              <Badge variant="outline" className="text-xs">Verplicht</Badge>
                            )}
                          </div>
                          {task.description && (
                            <p className="text-sm text-muted-foreground mt-1">
                              {task.description}
                            </p>
                          )}
                          <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-muted-foreground">
                            {task.due_date && (
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                Deadline: {format(new Date(task.due_date), 'd MMM', { locale: nl })}
                              </span>
                            )}
                            {task.is_completed && task.completed_at && (
                              <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
                                <CheckCircle2 className="h-3 w-3" />
                                Afgerond: {format(new Date(task.completed_at), 'd MMM yyyy', { locale: nl })}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Complete Dialog */}
        <Dialog open={completeDialogOpen} onOpenChange={setCompleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Onboarding Afronden</DialogTitle>
              <DialogDescription>
                Weet je zeker dat je de onboarding voor {employee?.voornaam} {employee?.achternaam} wilt afronden?
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCompleteDialogOpen(false)}>
                Annuleren
              </Button>
              <Button 
                onClick={() => completeSessionMutation.mutate()}
                disabled={completeSessionMutation.isPending}
              >
                {completeSessionMutation.isPending ? 'Bezig...' : 'Afronden'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
