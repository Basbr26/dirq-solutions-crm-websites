import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { DashboardHeader } from '@/components/DashboardHeader';
import { TaskDialog } from '@/components/TaskDialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Calendar, User, FileText, CheckCircle2, Clock, Circle } from 'lucide-react';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';
import { CaseStatus, TaskStatus, Task, Document, SickLeaveCase, TimelineEvent } from '@/types/sickLeave';
import { useToast } from '@/hooks/use-toast';
import { DocumentUpload } from '@/components/DocumentUpload';
import { DocumentList } from '@/components/DocumentList';
import { WetPoortwachterInfo } from '@/components/WetPoortwachterInfo';
import { toast as sonnerToast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { getCaseDocuments, getCaseTimeline, updateTaskStatus, updateCaseStatus } from '@/lib/supabaseHelpers';

const statusConfig = {
  actief: { label: 'Actief', variant: 'destructive' as const },
  herstel_gemeld: { label: 'Herstel Gemeld', variant: 'default' as const },
  gesloten: { label: 'Gesloten', variant: 'secondary' as const },
};

const taskStatusConfig = {
  open: { label: 'Open', icon: Circle, color: 'text-muted-foreground' },
  in_progress: { label: 'Bezig', icon: Clock, color: 'text-primary' },
  completed: { label: 'Voltooid', icon: CheckCircle2, color: 'text-green-600' },
};

const eventTypeConfig = {
  ziekmelding: { label: 'Ziekmelding', color: 'bg-destructive/10 text-destructive' },
  gesprek: { label: 'Gesprek', color: 'bg-primary/10 text-primary' },
  herstel: { label: 'Herstel', color: 'bg-green-600/10 text-green-600' },
  afmelding: { label: 'Afmelding', color: 'bg-secondary/10 text-secondary-foreground' },
  notitie: { label: 'Notitie', color: 'bg-muted text-muted-foreground' },
  document_upload: { label: 'Document Upload', color: 'bg-blue-600/10 text-blue-600' },
  task_completed: { label: 'Taak Voltooid', color: 'bg-green-600/10 text-green-600' },
  status_change: { label: 'Status Wijziging', color: 'bg-orange-600/10 text-orange-600' },
};

export default function CaseDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, role } = useAuth();
  
  const [case_, setCase] = useState<SickLeaveCase | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<CaseStatus>('actief');

  useEffect(() => {
    if (id) {
      loadCaseData();
    }
  }, [id]);

  const loadCaseData = async () => {
    if (!id || !user || !role) return;

    setLoading(true);
    try {
      const { data: caseData, error: caseError } = await supabase
        .from('sick_leave_cases')
        .select('*, employee:profiles!employee_id(voornaam, achternaam, email)')
        .eq('id', id)
        .single();

      if (caseError) throw caseError;
      
      setCase(caseData as SickLeaveCase);
      setStatus(caseData.case_status);

      const { data: tasksData, error: tasksError } = await supabase
        .from('tasks')
        .select('*')
        .eq('case_id', id)
        .order('deadline', { ascending: true });

      if (tasksError) throw tasksError;
      setTasks(tasksData || []);

      const documentsData = await getCaseDocuments(id, role);
      setDocuments(documentsData || []);

      const timelineData = await getCaseTimeline(id);
      setTimeline(timelineData || []);

    } catch (error) {
      console.error('Error loading case:', error);
      sonnerToast.error('Fout bij laden van case');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <DashboardHeader title="Verzuimdossier" />
        <div className="container mx-auto px-4 py-8">
          <p>Laden...</p>
        </div>
      </div>
    );
  }

  if (!case_) {
    return (
      <div className="min-h-screen bg-background">
        <DashboardHeader title="Verzuimdossier" />
        <div className="container mx-auto px-4 py-8">
          <p>Case niet gevonden</p>
        </div>
      </div>
    );
  }

  const handleStatusChange = async (newStatus: CaseStatus) => {
    if (!id || !user) return;

    try {
      await updateCaseStatus(id, newStatus, user.id);
      setStatus(newStatus);
      setCase({ ...case_, case_status: newStatus });
      toast({
        title: 'Status bijgewerkt',
        description: `Case status gewijzigd naar: ${statusConfig[newStatus].label}`,
      });
      loadCaseData();
    } catch (error) {
      console.error('Error updating status:', error);
      sonnerToast.error('Fout bij bijwerken status');
    }
  };

  const handleTaskStatusChange = async (taskId: string, newStatus: TaskStatus) => {
    if (!id || !user) return;

    try {
      const task = tasks.find(t => t.id === taskId);
      if (!task) return;

      await updateTaskStatus(taskId, newStatus, id, user.id, task.title);
      setTasks(tasks.map(t => 
        t.id === taskId 
          ? { ...t, task_status: newStatus, completed_at: newStatus === 'completed' ? new Date().toISOString() : null }
          : t
      ));
      toast({
        title: 'Taak bijgewerkt',
        description: `Taak status gewijzigd naar: ${taskStatusConfig[newStatus].label}`,
      });
      loadCaseData();
    } catch (error) {
      console.error('Error updating task:', error);
      sonnerToast.error('Fout bij bijwerken taak');
    }
  };

  const handleTaskAssignment = async (taskId: string, assignee: string) => {
    try {
      const { error } = await supabase
        .from('tasks')
        .update({ assigned_to: assignee || null })
        .eq('id', taskId);

      if (error) throw error;

      setTasks(tasks.map(t => 
        t.id === taskId 
          ? { ...t, assigned_to: assignee || null }
          : t
      ));
      sonnerToast.success('Taak toegewezen');
    } catch (error) {
      console.error('Error assigning task:', error);
      sonnerToast.error('Fout bij toewijzen taak');
    }
  };

  const handleNewTask = async (data: {
    title: string;
    description: string;
    deadline: string;
    assigned_to?: string;
  }) => {
    if (!case_) return;
    
    const newTask: Partial<Task> = {
      id: `task-${Date.now()}`,
      case_id: case_.id,
      title: data.title,
      description: data.description,
      deadline: data.deadline,
      task_status: 'open',
      assigned_to: data.assigned_to || null,
      created_at: new Date().toISOString(),
      completed_at: null,
      completed_by: null,
      updated_at: new Date().toISOString(),
      gespreksonderwerpen: null,
      toegestane_vragen: null,
      verboden_vragen: null,
      juridische_context: null,
      notes: null,
    };
    
    setTasks([...tasks, newTask as Task]);
    toast({
      title: 'Taak toegevoegd',
      description: 'Nieuwe taak is succesvol aangemaakt',
    });
  };

  const handleDocumentUpload = (data: { file_name: string; document_type: any; file: File }) => {
    if (!case_ || !user) return;
    
    const newDoc: Document = {
      id: `doc-${Date.now()}`,
      case_id: case_.id,
      file_name: data.file_name,
      document_type: data.document_type,
      file_url: URL.createObjectURL(data.file),
      uploaded_by: user.id,
      created_at: new Date().toISOString(),
    };
    setDocuments([...documents, newDoc]);
    sonnerToast.success('Document geüpload');
  };

  const handleDocumentDelete = (docId: string) => {
    setDocuments(documents.filter(d => d.id !== docId));
    sonnerToast.success('Document verwijderd');
  };

  const daysOut = case_.end_date 
    ? Math.ceil((new Date(case_.end_date).getTime() - new Date(case_.start_date).getTime()) / (1000 * 60 * 60 * 24))
    : Math.ceil((new Date().getTime() - new Date(case_.start_date).getTime()) / (1000 * 60 * 60 * 24));

  const employeeName = case_.employee 
    ? `${case_.employee.voornaam} ${case_.employee.achternaam}`
    : 'Onbekende medewerker';

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader title="Verzuimdossier" />
      
      <div className="container mx-auto px-4 py-8">
        <Button 
          variant="ghost" 
          className="mb-6 gap-2"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft className="h-4 w-4" />
          Terug
        </Button>

        <div className="grid gap-6">
          {/* Header Card */}
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <User className="h-5 w-5 text-muted-foreground" />
                    <CardTitle className="text-2xl">{employeeName}</CardTitle>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Start: {format(new Date(case_.start_date), 'dd MMMM yyyy', { locale: nl })}
                    </div>
                    {case_.end_date && (
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        Eind: {format(new Date(case_.end_date), 'dd MMMM yyyy', { locale: nl })}
                      </div>
                    )}
                  </div>
                  <p className="text-lg font-medium">{daysOut} dagen verzuim</p>
                </div>
                
                <div className="space-y-2">
                  <Badge variant={statusConfig[status].variant} className="text-sm">
                    {statusConfig[status].label}
                  </Badge>
                  <Select value={status} onValueChange={(v) => handleStatusChange(v as CaseStatus)}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="actief">Actief</SelectItem>
                      <SelectItem value="herstel_gemeld">Herstel Gemeld</SelectItem>
                      <SelectItem value="gesloten">Gesloten</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {case_.functional_limitations && (
                <div>
                  <h3 className="font-medium mb-2 flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Functionele Beperkingen
                  </h3>
                  <p className="text-muted-foreground">{case_.functional_limitations}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Tabs */}
          <Tabs defaultValue="tasks" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="tasks">Taken ({tasks.length})</TabsTrigger>
              <TabsTrigger value="documents">Documenten ({documents.length})</TabsTrigger>
              <TabsTrigger value="timeline">Timeline ({timeline.length})</TabsTrigger>
            </TabsList>
            
            <TabsContent value="tasks" className="space-y-4">
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <CardTitle>Taken ({tasks.length})</CardTitle>
                    <TaskDialog onSubmit={handleNewTask} />
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <WetPoortwachterInfo />
                  
                  {tasks.length === 0 ? (
                    <div className="py-8 text-center text-muted-foreground">
                      Geen taken beschikbaar
                    </div>
                  ) : (
                    <div className="space-y-4 mt-4">
                      {tasks.map((task) => {
                        const StatusIcon = taskStatusConfig[task.task_status].icon;
                        return (
                          <Card key={task.id}>
                            <CardHeader className="pb-3">
                              <div className="flex items-start justify-between">
                                <CardTitle className="text-lg">{task.title}</CardTitle>
                                <Select 
                                  value={task.task_status} 
                                  onValueChange={(v) => handleTaskStatusChange(task.id, v as TaskStatus)}
                                >
                                  <SelectTrigger className="w-32">
                                    <div className="flex items-center gap-2">
                                      <StatusIcon className={`h-4 w-4 ${taskStatusConfig[task.task_status].color}`} />
                                      <span>{taskStatusConfig[task.task_status].label}</span>
                                    </div>
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="open">Open</SelectItem>
                                    <SelectItem value="in_progress">Bezig</SelectItem>
                                    <SelectItem value="completed">Voltooid</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </CardHeader>
                            <CardContent className="space-y-2">
                              <p className="text-sm text-muted-foreground">{task.description}</p>
                              <div className="flex items-center gap-4 text-sm">
                                <div className="flex items-center gap-2">
                                  <Calendar className="h-4 w-4 text-muted-foreground" />
                                  <span>Deadline: {format(new Date(task.deadline), 'dd MMMM yyyy', { locale: nl })}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <User className="h-4 w-4 text-muted-foreground" />
                                  <Input
                                    value={task.assigned_to || ''}
                                    onChange={(e) => handleTaskAssignment(task.id, e.target.value)}
                                    placeholder="Niet toegewezen"
                                    className="h-7 w-40 text-sm"
                                  />
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="documents" className="space-y-4">
              <div className="flex justify-end">
                <DocumentUpload onUpload={handleDocumentUpload} />
              </div>
              <DocumentList documents={documents} onDelete={handleDocumentDelete} />
            </TabsContent>
            
            <TabsContent value="timeline" className="space-y-4">
              {timeline.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center text-muted-foreground">
                    Geen gebeurtenissen beschikbaar
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {timeline.map((event) => (
                    <Card key={event.id}>
                      <CardContent className="py-4">
                        <div className="flex items-start gap-4">
                          <div className="flex-1 space-y-1">
                            <div className="flex items-center gap-2">
                              <Badge className={eventTypeConfig[event.event_type].color}>
                                {eventTypeConfig[event.event_type].label}
                              </Badge>
                              {event.created_at && (
                                <span className="text-sm text-muted-foreground">
                                  {format(new Date(event.created_at), 'dd MMM yyyy HH:mm', { locale: nl })}
                                </span>
                              )}
                            </div>
                            <p className="text-sm">{event.description}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}