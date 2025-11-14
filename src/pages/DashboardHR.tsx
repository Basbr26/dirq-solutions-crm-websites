import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, AlertCircle, Calendar, Plus } from 'lucide-react';
import { DashboardHeader } from '@/components/DashboardHeader';

export default function DashboardHR() {
  return (
    <div className="min-h-screen bg-secondary">
      <DashboardHeader title="HR Dashboard">
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Nieuwe ziekmelding
        </Button>
      </DashboardHeader>

      <main className="container mx-auto px-6 py-8">
        <div className="grid gap-6 md:grid-cols-3 mb-8">
          <Card className="shadow-dirq">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Open Dossiers
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-3xl font-bold text-foreground">12</div>
                <Users className="h-8 w-8 text-primary" />
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                3 nieuwe deze week
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-dirq border-destructive/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Te Late Taken
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-3xl font-bold text-destructive">4</div>
                <AlertCircle className="h-8 w-8 text-destructive" />
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Actie vereist
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-dirq">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Aankomende Deadlines
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-3xl font-bold text-foreground">7</div>
                <Calendar className="h-8 w-8 text-primary" />
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Binnen 7 dagen
              </p>
            </CardContent>
          </Card>
        </div>

        <Card className="shadow-dirq">
          <CardHeader>
            <CardTitle>Actieve Verzuimdossiers</CardTitle>
            <CardDescription>
              Alle medewerkers met een actief verzuimdossier
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((item) => (
                <div
                  key={item}
                  className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-sm font-semibold text-primary">MN</span>
                    </div>
                    <div>
                      <p className="font-medium text-foreground">Medewerker Naam</p>
                      <p className="text-sm text-muted-foreground">Functie - Team</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Ziek sinds</p>
                      <p className="font-medium">12 dagen</p>
                    </div>
                    <Button variant="outline" size="sm">
                      Dossier openen
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
