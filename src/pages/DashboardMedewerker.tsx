import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TasksList } from '@/components/TasksList';
import { Info, FileText, Shield, Calendar } from 'lucide-react';
import { DashboardHeader } from '@/components/DashboardHeader';
import { MobileBottomNav } from '@/components/MobileBottomNav';
import { PullToRefresh } from '@/components/PullToRefresh';
import { useAuth } from '@/hooks/useAuth';
import { getEmployeeCase } from '@/lib/supabaseHelpers';
import { SickLeaveCase } from '@/types/sickLeave';
import { supabase } from '@/integrations/supabase/client';
import { format, differenceInDays } from 'date-fns';
import { nl } from 'date-fns/locale';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';

const statusConfig = {
  actief: { label: 'Actief', variant: 'destructive' as const },
  herstel_gemeld: { label: 'Herstel Gemeld', variant: 'default' as const },
  afgesloten: { label: 'Afgesloten', variant: 'secondary' as const },
};

export default function DashboardMedewerker() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeCase, setActiveCase] = useState<SickLeaveCase | null>(null);
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadActiveCase();
    }
  }, [user]);

  const loadActiveCase = async () => {
    if (!user) return;

    try {
      const caseData = await getEmployeeCase(user.id);
      setActiveCase(caseData);
      
      // Load tasks for the employee
      const { data: tasksData } = await supabase
        .from('tasks')
        .select('*')
        .eq('assigned_to', user.id)
        .order('deadline', { ascending: true });
      
      setTasks(tasksData || []);
    } catch (error) {
      console.error('Error loading case:', error);
      toast.error('Fout bij laden van gegevens');
    } finally {
      setLoading(false);
    }
  };

  const daysOut = activeCase 
    ? differenceInDays(
        activeCase.end_date ? new Date(activeCase.end_date) : new Date(),
        new Date(activeCase.start_date)
      ) + 1
    : 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-secondary pb-20 sm:pb-0">
        <DashboardHeader title="Mijn Overzicht" />
        <main className="container mx-auto px-4 sm:px-6 py-4 sm:py-8 max-w-4xl">
          <Card className="shadow-dirq mb-6">
            <CardHeader className="px-4 sm:px-6 pt-4 sm:pt-6">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-32 mt-2" />
            </CardHeader>
            <CardContent className="space-y-4 px-4 sm:px-6 pb-4 sm:pb-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-5 w-32" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-5 w-20" />
                </div>
              </div>
              <Skeleton className="h-10 w-full" />
            </CardContent>
          </Card>
          <div className="space-y-4">
            <Skeleton className="h-48 w-full rounded-lg" />
            <Skeleton className="h-48 w-full rounded-lg" />
          </div>
        </main>
        <MobileBottomNav />
      </div>
    );
  }

  const handleRefresh = useCallback(async () => {
    await loadActiveCase();
  }, [user]);

  return (
    <div className="min-h-screen bg-secondary pb-20 sm:pb-0">
      <DashboardHeader title="Mijn Overzicht" />

      <PullToRefresh onRefresh={handleRefresh} className="h-[calc(100vh-4rem)] sm:h-auto sm:overflow-visible">
        <main className="container mx-auto px-4 sm:px-6 py-4 sm:py-8 max-w-4xl">
        <Tabs defaultValue="overview" className="space-y-4 sm:space-y-6">
          <TabsList className="w-full sm:w-auto grid grid-cols-2 sm:flex">
            <TabsTrigger value="overview" className="text-xs sm:text-sm">Overzicht</TabsTrigger>
            <TabsTrigger value="tasks" className="text-xs sm:text-sm">Mijn Taken</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4 sm:space-y-6">
        {!activeCase ? (
          <Alert className="mb-4 sm:mb-6 border-primary/20 bg-primary/5">
            <Info className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" />
            <AlertTitle className="text-sm sm:text-base">Je bent momenteel niet ziek gemeld</AlertTitle>
            <AlertDescription className="text-xs sm:text-sm">
              Als je ziek wordt, meld dit dan altijd telefonisch bij je manager.
            </AlertDescription>
          </Alert>
        ) : (
          <Card className="shadow-dirq mb-4 sm:mb-6">
            <CardHeader className="px-4 sm:px-6 pt-4 sm:pt-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-0">
                <div>
                  <CardTitle className="text-base sm:text-lg">Jouw Actieve Ziekmelding</CardTitle>
                  <CardDescription className="text-xs sm:text-sm">Huidige status en informatie</CardDescription>
                </div>
                <Badge variant={statusConfig[activeCase.case_status].variant} className="text-xs self-start sm:self-auto">
                  {statusConfig[activeCase.case_status].label}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 sm:space-y-4 px-4 sm:px-6 pb-4 sm:pb-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <p className="text-xs sm:text-sm text-muted-foreground">Startdatum</p>
                  <p className="font-medium flex items-center gap-2 text-sm sm:text-base">
                    <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" />
                    {format(new Date(activeCase.start_date), 'd MMM yyyy', { locale: nl })}
                  </p>
                </div>
                <div>
                  <p className="text-xs sm:text-sm text-muted-foreground">Dagen verzuimd</p>
                  <p className="font-medium text-sm sm:text-base">{daysOut} dagen</p>
                </div>
              </div>
              {activeCase.functional_limitations && (
                <div>
                  <p className="text-xs sm:text-sm text-muted-foreground">Functionele beperkingen</p>
                  <p className="font-medium text-sm sm:text-base">{activeCase.functional_limitations}</p>
                </div>
              )}
              <Button 
                className="w-full text-sm sm:text-base" 
                onClick={() => navigate(`/case/${activeCase.id}`)}
              >
                Bekijk Volledig Dossier
              </Button>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-4 sm:gap-6">
          <Card className="shadow-dirq">
            <CardHeader className="px-4 sm:px-6 pt-4 sm:pt-6">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Shield className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle>Rechten & Plichten</CardTitle>
                  <CardDescription>
                    Wat je moet weten over verzuim
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 rounded-lg bg-muted/50">
                <h3 className="font-semibold mb-2 text-foreground">Jouw rechten:</h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>â€¢ Je hoeft geen medische details te delen</li>
                  <li>â€¢ Je hebt recht op begeleiding en ondersteuning</li>
                  <li>â€¢ Je krijgt minimaal 70% van je loon doorbetaald</li>
                  <li>â€¢ Je mag niet zomaar ontslagen worden</li>
                </ul>
              </div>

              <div className="p-4 rounded-lg bg-muted/50">
                <h3 className="font-semibold mb-2 text-foreground">Jouw plichten:</h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>â€¢ Meld je altijd telefonisch ziek bij je manager</li>
                  <li>â€¢ Houd je aan afspraken en contactmomenten</li>
                  <li>â€¢ Werk mee aan herstel en re-integratie</li>
                  <li>â€¢ Wees bereikbaar tijdens afgesproken tijden</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-dirq">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <FileText className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle>Poortwachter-proces</CardTitle>
                  <CardDescription>
                    Wat gebeurt er bij langdurig verzuim?
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-semibold">
                      1
                    </div>
                    <div className="w-0.5 h-full bg-border mt-2"></div>
                  </div>
                  <div className="pb-6">
                    <h4 className="font-semibold text-foreground">Week 1</h4>
                    <p className="text-sm text-muted-foreground">
                      Eerste gesprek met je manager over je situatie en mogelijkheden
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-semibold">
                      2
                    </div>
                    <div className="w-0.5 h-full bg-border mt-2"></div>
                  </div>
                  <div className="pb-6">
                    <h4 className="font-semibold text-foreground">Week 6</h4>
                    <p className="text-sm text-muted-foreground">
                      Probleemanalyse: samen kijken naar oorzaken en mogelijke oplossingen
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-semibold">
                      3
                    </div>
                    <div className="w-0.5 h-full bg-border mt-2"></div>
                  </div>
                  <div className="pb-6">
                    <h4 className="font-semibold text-foreground">Week 8</h4>
                    <p className="text-sm text-muted-foreground">
                      Plan van Aanpak: concrete afspraken over herstel en terugkeer
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-semibold">
                      4
                    </div>
                  </div>
                  <div>
                    <h4 className="font-semibold text-foreground">Evaluaties</h4>
                    <p className="text-sm text-muted-foreground">
                      Regelmatige evaluatie van het herstelproces en aanpassing van het plan
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-dirq">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Info className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle>Veelgestelde vragen</CardTitle>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <details className="group">
                <summary className="font-semibold cursor-pointer text-foreground hover:text-primary transition-colors">
                  Mag mijn werkgever vragen wat ik heb?
                </summary>
                <p className="mt-2 text-sm text-muted-foreground pl-4">
                  Nee, je werkgever mag niet vragen naar je diagnose of medische details. 
                  Wel mag gevraagd worden naar functionele beperkingen: wat kun je wel en niet doen?
                </p>
              </details>

              <details className="group">
                <summary className="font-semibold cursor-pointer text-foreground hover:text-primary transition-colors">
                  Moet ik bereikbaar zijn tijdens mijn ziekte?
                </summary>
                <p className="mt-2 text-sm text-muted-foreground pl-4">
                  Ja, je moet bereikbaar zijn tijdens afgesproken tijden. Dit wordt in overleg 
                  met je manager bepaald. Het doel is om je herstel te ondersteunen, niet om je te controleren.
                </p>
              </details>

              <details className="group">
                <summary className="font-semibold cursor-pointer text-foreground hover:text-primary transition-colors">
                  Mag ik op vakantie tijdens mijn ziekte?
                </summary>
                <p className="mt-2 text-sm text-muted-foreground pl-4">
                  Dat hangt af van je situatie. Als vakantie bijdraagt aan je herstel, kan het 
                  toegestaan zijn. Dit moet je altijd vooraf bespreken met je werkgever en mogelijk 
                  de bedrijfsarts.
                </p>
            </details>
          </CardContent>
        </Card>
      </div>
          </TabsContent>

          <TabsContent value="tasks">
            <TasksList tasks={tasks} />
          </TabsContent>
        </Tabs>
      </main>
      </PullToRefresh>
      <MobileBottomNav />
    </div>
  );
}