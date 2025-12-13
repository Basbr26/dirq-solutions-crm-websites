import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';
import { 
  CheckCircle2, 
  Clock, 
  Sparkles,
  PartyPopper,
  FileText,
  Shield,
  Users,
  Laptop,
  Briefcase,
  ClipboardCheck,
  ArrowRight
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
  sort_order: number;
}

const categoryIcons: Record<string, React.ReactNode> = {
  administratie: <FileText className="h-5 w-5" />,
  it: <Laptop className="h-5 w-5" />,
  sociaal: <Users className="h-5 w-5" />,
  compliance: <Shield className="h-5 w-5" />,
  werk: <Briefcase className="h-5 w-5" />,
  algemeen: <ClipboardCheck className="h-5 w-5" />
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
  administratie: 'from-blue-500 to-blue-600',
  it: 'from-purple-500 to-purple-600',
  sociaal: 'from-green-500 to-green-600',
  compliance: 'from-red-500 to-red-600',
  werk: 'from-orange-500 to-orange-600',
  algemeen: 'from-gray-500 to-gray-600'
};

export default function WelcomePage() {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();

  // Fetch active onboarding session for current user
  const { data: session, isLoading: sessionLoading } = useQuery({
    queryKey: ['my-onboarding-session', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('onboarding_sessions')
        .select('*')
        .eq('employee_id', user!.id)
        .eq('status', 'in_progress')
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id
  });

  // Fetch tasks for the session
  const { data: tasks = [], isLoading: tasksLoading } = useQuery({
    queryKey: ['my-onboarding-tasks', session?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('onboarding_tasks')
        .select('*')
        .eq('session_id', session!.id)
        .order('sort_order');

      if (error) throw error;
      return data as OnboardingTask[];
    },
    enabled: !!session?.id
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
      queryClient.invalidateQueries({ queryKey: ['my-onboarding-tasks', session?.id] });
      toast.success('Taak bijgewerkt');
    },
    onError: () => {
      toast.error('Fout bij bijwerken taak');
    }
  });

  const completedTasks = tasks.filter(t => t.is_completed).length;
  const totalTasks = tasks.length;
  const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  const isComplete = progress === 100;

  // Group tasks by category
  const tasksByCategory = tasks.reduce((acc, task) => {
    const category = task.category || 'algemeen';
    if (!acc[category]) acc[category] = [];
    acc[category].push(task);
    return acc;
  }, {} as Record<string, OnboardingTask[]>);

  // Get next uncompleted task
  const nextTask = tasks.find(t => !t.is_completed);

  if (sessionLoading || tasksLoading) {
    return (
      <AppLayout title="Welkom">
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
      <AppLayout title="Welkom">
        <div className="p-6 max-w-3xl mx-auto">
          <Card className="border-0 shadow-lg">
            <CardContent className="py-16 text-center">
              <Sparkles className="h-16 w-16 mx-auto text-primary mb-6" />
              <h1 className="text-3xl font-bold mb-4">
                Welkom, {profile?.voornaam}!
              </h1>
              <p className="text-lg text-muted-foreground">
                Je bent helemaal klaar om te beginnen. Veel succes!
              </p>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Welkom">
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        {/* Welcome Header */}
        <Card className="border-0 shadow-lg overflow-hidden">
          <div className="bg-gradient-to-r from-primary to-primary/80 p-8 text-primary-foreground">
            <div className="flex items-center gap-4">
              {isComplete ? (
                <PartyPopper className="h-12 w-12" />
              ) : (
                <Sparkles className="h-12 w-12" />
              )}
              <div>
                <h1 className="text-3xl font-bold">
                  {isComplete ? 'Gefeliciteerd!' : `Welkom, ${profile?.voornaam}!`}
                </h1>
                <p className="text-primary-foreground/90 mt-1">
                  {isComplete 
                    ? 'Je hebt alle onboarding taken afgerond. Veel succes!' 
                    : 'Hieronder vind je de taken om je start soepel te laten verlopen.'
                  }
                </p>
              </div>
            </div>
          </div>
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-medium">Je voortgang</span>
                <span className="text-2xl font-bold text-primary">{progress}%</span>
              </div>
              <Progress value={progress} className="h-4" />
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>{completedTasks} van {totalTasks} taken afgerond</span>
                {session.target_completion_date && (
                  <span>Streefdatum: {format(new Date(session.target_completion_date), 'd MMMM yyyy', { locale: nl })}</span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Next Task Card */}
        {nextTask && (
          <Card className="border-2 border-primary/20 shadow-md">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-xl bg-gradient-to-br ${categoryColors[nextTask.category] || categoryColors.algemeen} text-white`}>
                  {categoryIcons[nextTask.category] || categoryIcons.algemeen}
                </div>
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground font-medium">Volgende stap</p>
                  <h3 className="text-lg font-semibold">{nextTask.title}</h3>
                  {nextTask.description && (
                    <p className="text-sm text-muted-foreground mt-1">{nextTask.description}</p>
                  )}
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tasks by Category */}
        <div className="grid gap-6 md:grid-cols-2">
          {Object.entries(tasksByCategory).map(([category, categoryTasks]) => {
            const categoryCompleted = categoryTasks.filter(t => t.is_completed).length;
            const categoryTotal = categoryTasks.length;
            const categoryProgress = Math.round((categoryCompleted / categoryTotal) * 100);

            return (
              <Card key={category} className="shadow-md">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg bg-gradient-to-br ${categoryColors[category] || categoryColors.algemeen} text-white`}>
                        {categoryIcons[category] || categoryIcons.algemeen}
                      </div>
                      <div>
                        <CardTitle className="text-base">
                          {categoryLabels[category] || category}
                        </CardTitle>
                        <CardDescription>
                          {categoryCompleted} / {categoryTotal}
                        </CardDescription>
                      </div>
                    </div>
                    {categoryProgress === 100 && (
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    )}
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
                            className="mt-0.5"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className={`text-sm ${task.is_completed ? 'line-through text-muted-foreground' : 'font-medium'}`}>
                                {task.title}
                              </span>
                              {task.is_required && !task.is_completed && (
                                <Badge variant="outline" className="text-xs">Verplicht</Badge>
                              )}
                            </div>
                            {task.due_date && !task.is_completed && (
                              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                Deadline: {format(new Date(task.due_date), 'd MMM', { locale: nl })}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </AppLayout>
  );
}
