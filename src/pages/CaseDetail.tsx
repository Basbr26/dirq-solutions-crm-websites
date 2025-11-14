import { useState, useEffect, useCallback } from 'react';
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
import type { EventType } from '@/types/sickLeave';
// Type for raw timeline event from Supabase
type RawTimelineEvent = {
  id: string;
  case_id: string;
  event_type: string;
  description: string;
  created_by: string;
  created_at: string | null;
  date: string | null;
  metadata: unknown;
  creator?: {
    voornaam: string;
    achternaam: string;
    email?: string;
    id?: string;
  };
};
import { useToast } from '@/hooks/use-toast';
import { DocumentUpload } from '@/components/DocumentUpload';
import { DocumentList } from '@/components/DocumentList';
import { WetPoortwachterInfo } from '@/components/WetPoortwachterInfo';
import { toast as sonnerToast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { getCaseDocuments, getCaseTimeline, updateTaskStatus, updateCaseStatus } from '@/lib/supabaseHelpers';
// Mapping helpers
const normalizeTaskStatus = (status: string): UpdatableTaskStatus => {
  if (status === 'overdue') return 'open';
  return status as UpdatableTaskStatus;
};

const mapEventType = (dbType: string): TimelineEvent['event_type'] => {
  const map: Record<string, TimelineEvent['event_type']> = {
    document_toegevoegd: 'document_upload',
    taak_afgerond: 'afgerond',
    statuswijziging: 'status_change',
  };
  return (map[dbType] || dbType) as TimelineEvent['event_type'];
};

// CaseStatus uit de database bevat ook 'archief', maar deze pagina ondersteunt alleen actieve dossiers:
// map 'archief' -> 'gesloten' voor de UI.
type ActiveCaseStatus = Extract<CaseStatus, 'actief' | 'herstel_gemeld' | 'gesloten'>;

// TaskStatus uit de database bevat mogelijk ook 'overdue' (virtueel in je andere lijst).
// Voor updates willen we alleen echte statuswaarden gebruiken:
type UpdatableTaskStatus = Extract<TaskStatus, 'open' | 'in_progress' | 'afgerond'>;

const statusConfig = {
  actief: { label: 'Actief', variant: 'destructive' as const },
  herstel_gemeld: { label: 'Herstel Gemeld', variant: 'default' as const },
  gesloten: { label: 'Gesloten', variant: 'secondary' as const },
  archief: { label: 'Archief', variant: 'outline' as const },
};

const taskStatusConfig = {
  open: { label: 'Open', icon: Circle, color: 'text-muted-foreground' },
  in_progress: { label: 'Bezig', icon: Clock, color: 'text-primary' },
  afgerond: { label: 'Afgerond', icon: CheckCircle2, color: 'text-green-600' },
  overdue: { label: 'Te laat', icon: Clock, color: 'text-red-600' },
};

// Sluit aan bij je enum waardes in Supabase / createTimelineEvent:
const eventTypeConfig: Record<EventType, { label: string; color: string }> = {
    // Fallbacks for extended EventType union
    document_upload: {
      label: "Document geüpload",
      color: "bg-muted text-muted-foreground",
    },
    afgerond: {
      label: "Afgerond",
      color: "bg-green-600/10 text-green-600",
    },
    status_change: {
      label: "Status gewijzigd",
      color: "bg-muted text-muted-foreground",
    },
  ziekmelding: {
    label: "Ziekmelding",
    color: "bg-destructive/10 text-destructive",
  },
  gesprek: {
    label: "Gesprek",
    color: "bg-primary/10 text-primary",
  },
  document_toegevoegd: {
    label: "Document toegevoegd",
    color: "bg-blue-600/10 text-blue-600",
  },
  taak_afgerond: {
    label: "Taak afgerond",
    color: "bg-green-600/10 text-green-600",
  },
  herstelmelding: {
    label: "Herstelmelding",
    color: "bg-green-600/10 text-green-600",
  },
  evaluatie: {
    label: "Evaluatie",
    color: "bg-violet-600/10 text-violet-600",
  },
  statuswijziging: {
    label: "Statuswijziging",
    color: "bg-orange-600/10 text-orange-600",
  },
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
  const [status, setStatus] = useState<ActiveCaseStatus>('actief');

  const loadCaseData = useCallback(async () => {
    if (!id || !user || !role) return;

    setLoading(true);
    try {
      // Case + medewerker (correcte join)
      const { data: caseData, error: caseError } = await supabase
        .from('sick_leave_cases')
        .select(`
          *,
          employee:profiles!sick_leave_cases_employee_id_fkey (
            voornaam,
            achternaam,
            email
          )
        `)
        .eq('id', id)
        .single();

      if (caseError) throw caseError;
      
      const typedCase = caseData as SickLeaveCase;

      // Map 'archief' -> 'gesloten' voor display
      const dbStatus = (typedCase.case_status === 'archief'
        ? 'gesloten'
        : typedCase.case_status) as ActiveCaseStatus;

      setCase({ ...typedCase, case_status: dbStatus });
      setStatus(dbStatus);

      // Taken
      const { data: tasksData, error: tasksError } = await supabase
        .from('tasks')
        .select('*')
        .eq('case_id', id)
        .order('deadline', { ascending: true });

      if (tasksError) throw tasksError;
      setTasks((tasksData || []).map(t => ({
        ...t,
        task_status: normalizeTaskStatus(t.task_status),
      })));

      // Documenten (met rol-filter)
      const documentsData = await getCaseDocuments(id, role);
      setDocuments((documentsData || []) as Document[]);

      // Timeline: helper geeft raw Supabase rows + joined profile.
      const rawTimeline = await getCaseTimeline(id);
      setTimeline(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            ((rawTimeline || []) as any[]).map((e) => {
              let creator;
              if (
                e.creator &&
                typeof e.creator === 'object' &&
                'voornaam' in e.creator &&
                'achternaam' in e.creator &&
                typeof e.creator.voornaam === 'string' &&
                typeof e.creator.achternaam === 'string'
              ) {
                creator = {
                  voornaam: e.creator.voornaam,
                  achternaam: e.creator.achternaam,
                };
              } else {
                creator = undefined;
              }
              return {
                ...e,
                metadata: e.metadata ?? null,
                event_type: mapEventType(e.event_type),
                creator,
              };
            })
      );
    } catch (error) {
      console.error('Error loading case:', error);
      sonnerToast.error('Fout bij laden van case');
    } finally {
      setLoading(false);
    }
  }, [id, user, role]);

  useEffect(() => {
    void loadCaseData();
  }, [loadCaseData]);

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

  const handleStatusChange = async (newStatus: ActiveCaseStatus) => {
    if (!id || !user) return;

    try {
      await updateCaseStatus(id, newStatus, user.id);
      setStatus(newStatus);
      setCase({ ...case_, case_status: newStatus });
      toast({
        title: 'Status bijgewerkt',
        description: `Case status gewijzigd naar: ${statusConfig[newStatus].label}`,
      });
      void loadCaseData();
    } catch (error) {
      console.error('Error updating status:', error);
      sonnerToast.error('Fout bij bijwerken status');
    }
  };

  const handleTaskStatusChange = async (taskId: string, newStatus: UpdatableTaskStatus) => {
    if (!id || !user) return;

    try {
      const task = tasks.find(t => t.id === taskId);
      if (!task) return;

      await updateTaskStatus(taskId, newStatus, id, user.id, task.title);

      setTasks(tasks.map(t => 
        t.id === taskId 
          ? { 
              ...t, 
              task_status: newStatus,
              completed_at: newStatus === 'afgerond' ? new Date().toISOString() : null 
            }
          : t
      ));

      toast({
        title: 'Taak bijgewerkt',
        description: `Taak status gewijzigd naar: ${taskStatusConfig[newStatus].label}`,
      });
      void loadCaseData();
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
    if (!case_ || !user) return;

    try {
      const { data: createdTask, error } = await supabase
        .from('tasks')
        .insert({
          case_id: case_.id,
          title: data.title,
          description: data.description,
          deadline: data.deadline,
          task_status: 'open',
          assigned_to: data.assigned_to || null,
          created_at: new Date().toISOString(),
        })
        .select('*')
        .single();

      if (error) throw error;

      setTasks([...tasks, createdTask]);

      toast({
        title: 'Taak toegevoegd',
        description: 'Nieuwe taak is succesvol aangemaakt',
      });

    } catch (error) {
      console.error(error);
      toast({
        title: 'Fout',
        description: 'Kon taak niet aanmaken',
        variant: 'destructive',
      });
    }
  };

  const handleDocumentUpload = (data: { file_name: string; document_type: "probleemanalyse" | "plan_van_aanpak" | "evaluatie_3_maanden" | "evaluatie_6_maanden" | "evaluatie_1_jaar" | "herstelmelding" | "uwv_melding" | "overig"; file: File }) => {
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
                  <Select value={status} onValueChange={(v) => handleStatusChange(v as ActiveCaseStatus)}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="actief">Actief</SelectItem>
                      <SelectItem value="herstel_gemeld">Herstel Gemeld</SelectItem>
                      <SelectItem value="gesloten">Gesloten</SelectItem>
                      <SelectItem value="archief">Archief</SelectItem>
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
                        // Als er ooit een status buiten UpdatableTaskStatus voorkomt, fallback naar 'open'
                        const safeStatus: UpdatableTaskStatus =
                          (['open', 'in_progress', 'afgerond'].includes(task.task_status as string)
                            ? task.task_status
                            : 'open') as UpdatableTaskStatus;

                        const StatusIcon = taskStatusConfig[safeStatus].icon;
                        return (
                          <Card key={task.id}>
                            <CardHeader className="pb-3">
                              <div className="flex items-start justify-between">
                                <CardTitle className="text-lg">{task.title}</CardTitle>
                                <Select 
                                  value={safeStatus}
                                  onValueChange={(v) => handleTaskStatusChange(task.id, v as UpdatableTaskStatus)}
                                >
                                  <SelectTrigger className="w-32">
                                    <div className="flex items-center gap-2">
                                      <StatusIcon className={`h-4 w-4 ${taskStatusConfig[safeStatus].color}`} />
                                      <span>{taskStatusConfig[safeStatus].label}</span>
                                    </div>
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="open">Open</SelectItem>
                                    <SelectItem value="in_progress">Bezig</SelectItem>
                                    <SelectItem value="afgerond">Afgerond</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </CardHeader>
                            <CardContent className="space-y-2">
                              {task.description && (
                                <p className="text-sm text-muted-foreground">{task.description}</p>
                              )}
                              <div className="flex items-center gap-4 text-sm">
                                <div className="flex items-center gap-2">
                                  <Calendar className="h-4 w-4 text-muted-foreground" />
                                  <span>
                                    Deadline: {format(new Date(task.deadline), 'dd MMMM yyyy', { locale: nl })}
                                  </span>
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
                  {timeline.map((event) => {
                    return (
                      <Card key={event.id}>
                        <CardContent className="py-4">
                          <div className="flex items-start gap-4">
                            <div className="flex-1 space-y-1">
                              <div className="flex items-center gap-2">
                                <Badge
                                  className={
                                    eventTypeConfig[event.event_type]?.color ??
                                    "bg-muted text-muted-foreground"
                                  }
                                >
                                  {eventTypeConfig[event.event_type]?.label ?? event.event_type}
                                </Badge>
                                {event.created_at && (
                                  <span className="text-sm text-muted-foreground">
                                    {format(new Date(event.created_at), 'dd MMM yyyy HH:mm', { locale: nl })}
                                  </span>
                                )}
                                {event.creator && (
                                  <span className="text-sm text-muted-foreground">
                                    • {event.creator.voornaam} {event.creator.achternaam}
                                  </span>
                                )}
                              </div>
                              <p className="text-sm">{event.description}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
