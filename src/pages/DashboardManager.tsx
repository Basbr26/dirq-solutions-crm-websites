import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Clock, Users } from 'lucide-react';
import { DashboardHeader } from '@/components/DashboardHeader';

export default function DashboardManager() {
  return (
    <div className="min-h-screen bg-secondary">
      <DashboardHeader title="Manager Dashboard" />

      <main className="container mx-auto px-6 py-8">
        <div className="grid gap-6 md:grid-cols-3 mb-8">
          <Card className="shadow-dirq">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Mijn Team
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-3xl font-bold text-foreground">8</div>
                <Users className="h-8 w-8 text-primary" />
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                2 ziek gemeld
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
                <div className="text-3xl font-bold text-foreground">3</div>
                <Clock className="h-8 w-8 text-primary" />
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                1 vandaag
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
                <div className="text-3xl font-bold text-foreground">5</div>
                <CheckCircle2 className="h-8 w-8 text-primary" />
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Goed werk!
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
            <div className="space-y-3">
              {[
                { title: 'Bel medewerker voor verzuimgesprek', deadline: 'Vandaag', priority: 'high' },
                { title: 'Check verbetering bij medewerker', deadline: 'Morgen', priority: 'medium' },
                { title: 'Voorbereiding Plan van Aanpak gesprek', deadline: '5 dagen', priority: 'medium' },
              ].map((task, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                >
                  <div>
                    <p className="font-medium text-foreground">{task.title}</p>
                    <p className="text-sm text-muted-foreground">Deadline: {task.deadline}</p>
                  </div>
                  <Button size="sm">Uitvoeren</Button>
                </div>
              ))}
            </div>
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
            <div className="space-y-4">
              {[1, 2].map((item) => (
                <div
                  key={item}
                  className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-sm font-semibold text-primary">TM</span>
                    </div>
                    <div>
                      <p className="font-medium text-foreground">Teamlid Naam</p>
                      <p className="text-sm text-muted-foreground">Functie</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Ziek sinds</p>
                      <p className="font-medium">5 dagen</p>
                    </div>
                    <Button variant="outline" size="sm">
                      Bekijk dossier
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
