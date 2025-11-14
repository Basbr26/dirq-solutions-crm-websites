import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Info, Calendar, UserCheck, FileText, ClipboardCheck } from 'lucide-react';
import { defaultTaskTemplates } from '@/lib/taskTemplates';

export function WetPoortwachterInfo() {
  const milestones = [
    { week: '1-6 weken', title: 'Eerste fase', description: 'Contact met medewerker, informeren manager, eventueel bedrijfsarts raadplegen' },
    { week: '6 weken', title: 'Probleemanalyse', description: 'Verplichte probleemanalyse door werkgever en medewerker' },
    { week: '6-8 weken', title: 'Plan van Aanpak', description: 'Opstellen re-integratieplan met concrete doelen en acties' },
    { week: '42 weken', title: 'Evaluatie', description: 'Eerste evaluatie met bedrijfsarts over voortgang' },
    { week: '1 jaar', title: 'Loonstop mogelijk', description: 'Na 1 jaar verzuim kan loonbetaling stoppen' },
    { week: '2 jaar', title: 'WIA aanvraag', description: 'Bij blijvend verzuim: aanvraag WIA uitkering' },
  ];

  return (
    <div className="space-y-6">
      <Alert className="border-primary/50">
        <Info className="h-4 w-4" />
        <AlertTitle>Wet Poortwachter</AlertTitle>
        <AlertDescription>
          De Wet Poortwachter regelt de verplichtingen van werkgever en werknemer tijdens ziekte.
          Het doel is om re-integratie te bevorderen en langdurig verzuim te voorkomen.
        </AlertDescription>
      </Alert>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ClipboardCheck className="h-4 w-4" />
              Automatische taken
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-3">
              Bij elke nieuwe ziekmelding worden automatisch taken aangemaakt volgens de Wet Poortwachter:
            </p>
            <ul className="space-y-2">
              {defaultTaskTemplates.map((template, index) => (
                <li key={index} className="text-sm flex items-start gap-2">
                  <Calendar className="h-4 w-4 mt-0.5 text-primary flex-shrink-0" />
                  <div>
                    <span className="font-medium">Dag {template.deadlineDays}:</span>{' '}
                    {template.title}
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="h-4 w-4" />
              Belangrijke mijlpalen
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-3">
              Wettelijke termijnen en verplichtingen:
            </p>
            <ul className="space-y-3">
              {milestones.map((milestone, index) => (
                <li key={index} className="text-sm">
                  <div className="flex items-start gap-2">
                    <UserCheck className="h-4 w-4 mt-0.5 text-primary flex-shrink-0" />
                    <div>
                      <span className="font-medium text-primary">{milestone.week}:</span>{' '}
                      <span className="font-medium">{milestone.title}</span>
                      <p className="text-muted-foreground mt-0.5">{milestone.description}</p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
