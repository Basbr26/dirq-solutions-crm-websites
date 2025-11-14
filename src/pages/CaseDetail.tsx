import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { DashboardHeader } from '@/components/DashboardHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Calendar, User, FileText, CheckCircle2, Clock, Circle } from 'lucide-react';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';
import { mockSickLeaveCases, mockTasks, mockTimelineEvents } from '@/lib/mockData';
import { CaseStatus, TaskStatus } from '@/types/sickLeave';
import { useToast } from '@/hooks/use-toast';

const statusConfig = {
  actief: { label: 'Actief', variant: 'destructive' as const },
  herstel: { label: 'Herstel', variant: 'default' as const },
  afgesloten: { label: 'Afgesloten', variant: 'secondary' as const },
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
};

export default function CaseDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const case_ = mockSickLeaveCases.find(c => c.id === id);
  const caseTasks = mockTasks.filter(t => t.case_id === id);
  const caseEvents = mockTimelineEvents.filter(e => e.case_id === id).sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  const [status, setStatus] = useState<CaseStatus>(case_?.status || 'actief');

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

  const handleStatusChange = (newStatus: CaseStatus) => {
    setStatus(newStatus);
    toast({
      title: 'Status bijgewerkt',
      description: `Case status gewijzigd naar: ${statusConfig[newStatus].label}`,
    });
  };

  const handleTaskStatusChange = (taskId: string, newStatus: TaskStatus) => {
    toast({
      title: 'Taak bijgewerkt',
      description: `Taak status gewijzigd naar: ${taskStatusConfig[newStatus].label}`,
    });
  };

  const daysOut = case_.eind_datum 
    ? Math.ceil((new Date(case_.eind_datum).getTime() - new Date(case_.start_datum).getTime()) / (1000 * 60 * 60 * 24))
    : Math.ceil((new Date().getTime() - new Date(case_.start_datum).getTime()) / (1000 * 60 * 60 * 24));

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
                    <CardTitle className="text-2xl">{case_.medewerker_naam}</CardTitle>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Start: {format(new Date(case_.start_datum), 'dd MMMM yyyy', { locale: nl })}
                    </div>
                    {case_.eind_datum && (
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        Eind: {format(new Date(case_.eind_datum), 'dd MMMM yyyy', { locale: nl })}
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
                      <SelectItem value="herstel">Herstel</SelectItem>
                      <SelectItem value="afgesloten">Afgesloten</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-medium mb-2 flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Reden ziekmelding
                </h3>
                <p className="text-muted-foreground">{case_.reden}</p>
              </div>
              
              {case_.notities && (
                <div>
                  <h3 className="font-medium mb-2">Notities</h3>
                  <p className="text-muted-foreground">{case_.notities}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Tabs */}
          <Tabs defaultValue="tasks" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="tasks">Taken ({caseTasks.length})</TabsTrigger>
              <TabsTrigger value="timeline">Timeline ({caseEvents.length})</TabsTrigger>
            </TabsList>
            
            <TabsContent value="tasks" className="space-y-4">
              {caseTasks.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center text-muted-foreground">
                    Geen taken beschikbaar
                  </CardContent>
                </Card>
              ) : (
                caseTasks.map((task) => {
                  const StatusIcon = taskStatusConfig[task.status].icon;
                  return (
                    <Card key={task.id}>
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <CardTitle className="text-lg">{task.titel}</CardTitle>
                          <Select 
                            value={task.status} 
                            onValueChange={(v) => handleTaskStatusChange(task.id, v as TaskStatus)}
                          >
                            <SelectTrigger className="w-32">
                              <div className="flex items-center gap-2">
                                <StatusIcon className={`h-4 w-4 ${taskStatusConfig[task.status].color}`} />
                                <span>{taskStatusConfig[task.status].label}</span>
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
                        <p className="text-sm text-muted-foreground">{task.beschrijving}</p>
                        <div className="flex items-center gap-2 text-sm">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span>Deadline: {format(new Date(task.deadline), 'dd MMMM yyyy', { locale: nl })}</span>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </TabsContent>
            
            <TabsContent value="timeline" className="space-y-4">
              {caseEvents.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center text-muted-foreground">
                    Geen gebeurtenissen beschikbaar
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {caseEvents.map((event) => (
                    <Card key={event.id}>
                      <CardContent className="py-4">
                        <div className="flex items-start gap-4">
                          <div className="flex-1 space-y-1">
                            <div className="flex items-center gap-2">
                              <Badge className={eventTypeConfig[event.event_type].color}>
                                {eventTypeConfig[event.event_type].label}
                              </Badge>
                              <span className="text-sm text-muted-foreground">
                                {format(new Date(event.created_at), 'dd MMM yyyy HH:mm', { locale: nl })}
                              </span>
                            </div>
                            <p className="text-sm">{event.beschrijving}</p>
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
