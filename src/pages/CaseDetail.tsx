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
// NEW IMPORTS voor document signing
import { CaseDocumentUpload } from '@/components/CaseDocumentUpload';
import { CaseDocumentsList } from '@/components/CaseDocumentsList';
import { GenerateTemplateDocument } from '@/components/GenerateTemplateDocument';
// Gespreksnotities
import { ConversationNotesDialog } from '@/components/ConversationNotesDialog';
import { ConversationNotesList } from '@/components/ConversationNotesList';
import { ActivityLog } from '@/components/ActivityLog';
import { CalendarExportButton } from '@/components/CalendarExportButton';
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
      label: "Document geÃ¼pload",
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
    const handleDeleteCase = async () => {
      if (!case_ || !window.confirm('Weet je zeker dat je deze ziekmelding wilt verwijderen? Dit verwijdert ook alle gerelateerde taken, documenten en tijdlijn gebeurtenissen.')) return;
      
      try {
        // Eerst verwijder gerelateerde taken
        const { error: tasksError } = await supabase
          .from('tasks')
          .delete()
          .eq('case_id', case_.id);
        
        if (tasksError) throw tasksError;

        // Verwijder documenten
        const { error: docsError } = await supabase
          .from('documents')
          .delete()
          .eq('case_id', case_.id);
        
        if (docsError) throw docsError;

        // Verwijder timeline events
        const { error: timelineError } = await supabase
          .from('timeline_events')
          .delete()
          .eq('case_id', case_.id);
        
        if (timelineError) throw timelineError;

        // Nu verwijder de case zelf
        const { error: caseError } = await supabase
          .from('sick_leave_cases')
          .delete()
          .eq('id', case_.id);
        
        if (caseError) throw caseError;

        toast({
          title: 'Ziekmelding verwijderd',
          description: 'Het dossier en alle gerelateerde gegevens zijn succesvol verwijderd.',
        });
        navigate(-1);
      } catch (error) {
        toast({
          title: 'Verwijderen mislukt',
          description: 'Er ging iets mis bij het verwijderen: ' + (error instanceof Error ? error.message : 'Onbekende fout'),
          variant: 'destructive',
        });
        console.error('Delete error:', error);
      }
    };
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, role } = useAuth();
  
  const [case_, setCase] = useState<SickLeaveCase | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [notesRefreshTrigger, setNotesRefreshTrigger] = useState(0);
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
      
      const typedCase = caseData as unknown as SickLeaveCase;

      // Map 'archief' -> 'gesloten' voor display
      const dbStatus = (typedCase.case_status === 'archief'
        ? 'gesloten'
        : typedCase.case_status) as ActiveCaseStatus;

      setCase({ ...typedCase, case_status: dbStatus });
      setStatus(dbStatus);

      // Taken (selecteer alleen relevante velden en assigned_user via FK)
      const { data: tasksData, error: tasksError } = await supabase
        .from('tasks')
        .select(`
          id,
          title,
          description,
          deadline,
          task_status,
          case_id,
          assigned_to,
          assigned_user:profiles (
            id,
            voornaam,
            achternaam,
            email
          )
        `)
        .eq('case_id', id)
        .order('deadline', { ascending: true });

        if (tasksError) throw tasksError;
        setTasks((tasksData || []).map(t => ({
          ...t,
          task_status: normalizeTaskStatus(t.task_status),
          assigned_user:
            t.assigned_user != null &&
            typeof t.assigned_user === 'object' &&
            t.assigned_user !== null &&
            t.assigned_user && !('error' in t.assigned_user)
              ? t.assigned_user
              : null,
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
    sonnerToast.success('Document geÃ¼pload');
  };

  const handleDocumentDelete = (docId: string) => {
    setDocuments(documents.filter(d => d.id !== docId));
    sonnerToast.success('Document verwijderd');
  };

  const daysOut = case_.end_date 
    ? Math.ceil((new Date(case_.end_date).getTime() - new Date(case_.start_date).getTime()) / (1000 * 60 * 60 * 24))
    : Math.ceil((new Date().getTime() - new Date(case_.start_date).getTime()) / (1000 * 60 * 60 * 24)) + 1;

  const employeeName = case_.employee 
    ? (case_.employee.voornaam && case_.employee.achternaam 
        ? `${case_.employee.voornaam} ${case_.employee.achternaam}`.trim()
        : case_.employee.email || 'Onbekende medewerker')
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

        <div className="grid gap-4 sm:gap-6">
          {/* Header Card */}
          <Card>
            <CardHeader className="px-4 py-4 sm:px-6 sm:py-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-2 min-w-0">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <User className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground flex-shrink-0" />
                    <CardTitle className="text-lg sm:text-2xl truncate">{employeeName}</CardTitle>
                  </div>
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-4 text-xs sm:text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                      <span>Start: {format(new Date(case_.start_date), 'dd MMM yyyy', { locale: nl })}</span>
                    </div>
                    {case_.end_date && (
                      <div className="flex items-center gap-2">
                        <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                        <span>Eind: {format(new Date(case_.end_date), 'dd MMM yyyy', { locale: nl })}</span>
                      </div>
                    )}
                  </div>
                  <p className="text-base sm:text-lg font-medium">{daysOut} dagen verzuim</p>
                </div>
                
                <div className="flex flex-col gap-2 sm:items-end">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={statusConfig[status].variant} className="text-xs sm:text-sm">
                      {statusConfig[status].label}
                    </Badge>
                    <Button
                      variant="destructive"
                      size="sm"
                      className="text-xs sm:text-sm h-7 sm:h-8"
                      onClick={handleDeleteCase}
                    >
                      Verwijder
                    </Button>
                  </div>
                  <Select value={status} onValueChange={(v) => handleStatusChange(v as ActiveCaseStatus)}>
                    <SelectTrigger className="w-full sm:w-40 h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-popover">
                      <SelectItem value="actief">Actief</SelectItem>
                      <SelectItem value="herstel_gemeld">Herstel Gemeld</SelectItem>
                      <SelectItem value="gesloten">Gesloten</SelectItem>
                      <SelectItem value="archief">Archief</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 px-4 sm:px-6">
              {case_.functional_limitations && (
                <div>
                  <h3 className="font-medium mb-2 flex items-center gap-2 text-sm sm:text-base">
                    <FileText className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                    Functionele Beperkingen
                  </h3>
                  <p className="text-muted-foreground text-sm sm:text-base">{case_.functional_limitations}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Tabs */}
          <Tabs defaultValue="tasks" className="w-full">
            <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
              <TabsList className="inline-flex w-auto min-w-full sm:grid sm:w-full sm:grid-cols-5 h-auto flex-nowrap">
                <TabsTrigger value="tasks" className="text-xs sm:text-sm px-2 sm:px-4 py-2 whitespace-nowrap">
                  Taken ({tasks.length})
                </TabsTrigger>
                <TabsTrigger value="conversations" className="text-xs sm:text-sm px-2 sm:px-4 py-2 whitespace-nowrap">
                  Gesprekken
                </TabsTrigger>
                <TabsTrigger value="documents" className="text-xs sm:text-sm px-2 sm:px-4 py-2 whitespace-nowrap">
                  Docs ({documents.length})
                </TabsTrigger>
                <TabsTrigger value="timeline" className="text-xs sm:text-sm px-2 sm:px-4 py-2 whitespace-nowrap">
                  Timeline ({timeline.length})
                </TabsTrigger>
                <TabsTrigger value="activity" className="text-xs sm:text-sm px-2 sm:px-4 py-2 whitespace-nowrap">
                  Activiteit
                </TabsTrigger>
              </TabsList>
            </div>
            
            <TabsContent value="tasks" className="space-y-4 mt-4">
              <Card>
                <CardHeader className="px-4 py-4 sm:px-6">
                  <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center">
                    <CardTitle className="text-base sm:text-lg">Taken ({tasks.length})</CardTitle>
                    <TaskDialog onSubmit={handleNewTask} />
                  </div>
                </CardHeader>
                <CardContent className="space-y-4 px-4 sm:px-6">
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
                            <CardHeader className="pb-2 sm:pb-3 px-4 sm:px-6">
                              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                                <CardTitle className="text-base sm:text-lg">{task.title}</CardTitle>
                                <Select 
                                  value={safeStatus}
                                  onValueChange={(v) => handleTaskStatusChange(task.id, v as UpdatableTaskStatus)}
                                >
                                  <SelectTrigger className="w-full sm:w-32 h-8 sm:h-9">
                                    <div className="flex items-center gap-2">
                                      <StatusIcon className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${taskStatusConfig[safeStatus].color}`} />
                                      <span className="text-xs sm:text-sm">{taskStatusConfig[safeStatus].label}</span>
                                    </div>
                                  </SelectTrigger>
                                  <SelectContent className="bg-popover">
                                    <SelectItem value="open">Open</SelectItem>
                                    <SelectItem value="in_progress">Bezig</SelectItem>
                                    <SelectItem value="afgerond">Afgerond</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </CardHeader>
                            <CardContent className="space-y-2 px-4 sm:px-6">
                              {task.description && (
                                <p className="text-xs sm:text-sm text-muted-foreground">{task.description}</p>
                              )}
                              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between text-xs sm:text-sm text-muted-foreground">
                                <div className="flex flex-wrap items-center gap-2 sm:gap-4">
                                  <div className="flex items-center gap-1">
                                    <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground flex-shrink-0" />
                                    <span className="text-xs sm:text-sm">
                                      {format(new Date(task.deadline), 'dd MMM yyyy', { locale: nl })}
                                    </span>
                                  </div>
                                  {task.assigned_user && (
                                    <span className="text-xs">
                                      • {task.assigned_user.voornaam} {task.assigned_user.achternaam}
                                    </span>
                                  )}
                                  {task.notes && (
                                    <span className="text-xs hidden sm:inline">• Notities</span>
                                  )}
                                </div>
                                <CalendarExportButton
                                  task={{
                                    title: task.title,
                                    description: task.description || undefined,
                                    deadline: task.deadline,
                                    employeeName: employeeName,
                                  }}
                                />
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

            <TabsContent value="conversations" className="space-y-4 mt-4">
              <Card>
                <CardHeader className="px-4 py-4 sm:px-6">
                  <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center">
                    <CardTitle className="text-base sm:text-lg">Gespreksnotities</CardTitle>
                    {(role === 'hr' || role === 'manager') && (
                      <ConversationNotesDialog 
                        caseId={case_.id} 
                        onNoteAdded={() => setNotesRefreshTrigger(prev => prev + 1)} 
                      />
                    )}
                  </div>
                </CardHeader>
                <CardContent className="px-4 sm:px-6">
                  <ConversationNotesList 
                    caseId={case_.id} 
                    refreshTrigger={notesRefreshTrigger} 
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="documents" className="space-y-4 mt-4">
              {/* Actie knoppen voor HR/Manager */}
              {(role === 'hr' || role === 'manager') && (
                <div className="flex flex-wrap gap-2">
                  <CaseDocumentUpload
                    caseId={case_.id}
                    caseStartDate={case_.start_date}
                    employeeId={case_.employee_id}
                    onUploadComplete={loadCaseData}
                  />
                  <GenerateTemplateDocument
                    caseData={case_}
                    company={{ naam: 'Uw Bedrijf', adres: 'Bedrijfsadres' }}
                    userId={user?.id || ''}
                    onGenerated={loadCaseData}
                  />
                  <DocumentUpload onUpload={handleDocumentUpload} />
                </div>
              )}
              
              {/* Document Signing Lijst */}
              <CaseDocumentsList
                caseId={case_.id}
                employeeId={case_.employee_id}
                userRole={role}
                userId={user?.id}
                onRefresh={loadCaseData}
              />
              
              {/* Oude DocumentList voor backward compatibility */}
              <DocumentList documents={documents} onDelete={handleDocumentDelete} />
            </TabsContent>
            
            <TabsContent value="timeline" className="space-y-4 mt-4">
              {timeline.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center text-muted-foreground text-sm">
                    Geen gebeurtenissen beschikbaar
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-2 sm:space-y-3">
                  {timeline.map((event) => {
                    return (
                      <Card key={event.id}>
                        <CardContent className="py-3 sm:py-4 px-4 sm:px-6">
                          <div className="flex items-start gap-2 sm:gap-4">
                            <div className="flex-1 space-y-1 min-w-0">
                              <div className="flex flex-wrap items-center gap-1 sm:gap-2">
                                <Badge
                                  className={`text-[10px] sm:text-xs ${
                                    eventTypeConfig[event.event_type]?.color ??
                                    "bg-muted text-muted-foreground"
                                  }`}
                                >
                                  {eventTypeConfig[event.event_type]?.label ?? event.event_type}
                                </Badge>
                                {event.created_at && (
                                  <span className="text-[10px] sm:text-sm text-muted-foreground">
                                    {format(new Date(event.created_at), 'dd MMM yyyy HH:mm', { locale: nl })}
                                  </span>
                                )}
                                {event.creator && (
                                  <span className="text-[10px] sm:text-sm text-muted-foreground hidden sm:inline">
                                    • {event.creator.voornaam} {event.creator.achternaam}
                                  </span>
                                )}
                              </div>
                              <p className="text-xs sm:text-sm">{event.description}</p>
                              {event.creator && (
                                <p className="text-[10px] text-muted-foreground sm:hidden">
                                  Door: {event.creator.voornaam} {event.creator.achternaam}
                                </p>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </TabsContent>

            <TabsContent value="activity" className="space-y-4 mt-4">
              <ActivityLog caseId={case_.id} />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}