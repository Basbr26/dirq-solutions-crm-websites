import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Info, FileText, Shield, Calendar } from 'lucide-react';
import { DashboardHeader } from '@/components/DashboardHeader';
import { useAuth } from '@/hooks/useAuth';
import { getEmployeeCase } from '@/lib/supabaseHelpers';
import { SickLeaveCase } from '@/types/sickLeave';
import { format, differenceInDays } from 'date-fns';
import { nl } from 'date-fns/locale';
import { toast } from 'sonner';

const statusConfig = {
  actief: { label: 'Actief', variant: 'destructive' as const },
  herstel: { label: 'Herstel', variant: 'default' as const },
  afgesloten: { label: 'Afgesloten', variant: 'secondary' as const },
};

export default function DashboardMedewerker() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeCase, setActiveCase] = useState<SickLeaveCase | null>(null);
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
    } catch (error) {
      console.error('Error loading case:', error);
      toast.error('Fout bij laden van gegevens');
    } finally {
      setLoading(false);
    }
  };

  const daysOut = activeCase 
    ? differenceInDays(
        activeCase.eind_datum ? new Date(activeCase.eind_datum) : new Date(),
        new Date(activeCase.start_datum)
      ) + 1
    : 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-secondary">
        <DashboardHeader title="Mijn Overzicht" />
        <main className="container mx-auto px-6 py-8 max-w-4xl">
          <p className="text-muted-foreground">Laden...</p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-secondary">
      <DashboardHeader title="Mijn Overzicht" />

      <main className="container mx-auto px-6 py-8 max-w-4xl">
        {!activeCase ? (
          <Alert className="mb-6 border-primary/20 bg-primary/5">
            <Info className="h-4 w-4 text-primary" />
            <AlertTitle>Je bent momenteel niet ziek gemeld</AlertTitle>
            <AlertDescription>
              Als je ziek wordt, meld dit dan altijd telefonisch bij je manager.
            </AlertDescription>
          </Alert>
        ) : (
          <Card className="shadow-dirq mb-6">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Jouw Actieve Ziekmelding</CardTitle>
                  <CardDescription>Huidige status en informatie</CardDescription>
                </div>
                <Badge variant={statusConfig[activeCase.status].variant}>
                  {statusConfig[activeCase.status].label}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Startdatum</p>
                  <p className="font-medium flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-primary" />
                    {format(new Date(activeCase.start_datum), 'd MMMM yyyy', { locale: nl })}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Dagen verzuimd</p>
                  <p className="font-medium">{daysOut} dagen</p>
                </div>
              </div>
              {activeCase.reden && (
                <div>
                  <p className="text-sm text-muted-foreground">Reden</p>
                  <p className="font-medium">{activeCase.reden}</p>
                </div>
              )}
              <Button 
                className="w-full" 
                onClick={() => navigate(`/case/${activeCase.id}`)}
              >
                Bekijk Volledig Dossier
              </Button>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-6 mb-8">
          <Card className="shadow-dirq">
            <CardHeader>
              <div className="flex items-center gap-3">
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
                  <li>• Je hoeft geen medische details te delen</li>
                  <li>• Je hebt recht op begeleiding en ondersteuning</li>
                  <li>• Je krijgt minimaal 70% van je loon doorbetaald</li>
                  <li>• Je mag niet zomaar ontslagen worden</li>
                </ul>
              </div>

              <div className="p-4 rounded-lg bg-muted/50">
                <h3 className="font-semibold mb-2 text-foreground">Jouw plichten:</h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• Meld je altijd telefonisch ziek bij je manager</li>
                  <li>• Houd je aan afspraken en contactmomenten</li>
                  <li>• Werk mee aan herstel en re-integratie</li>
                  <li>• Wees bereikbaar tijdens afgesproken tijden</li>
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
      </main>
    </div>
  );
}
