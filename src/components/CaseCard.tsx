import { SickLeaveCase } from '@/types/sickLeave';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, User, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';

interface CaseCardProps {
  case_: SickLeaveCase;
  onClick: () => void;
  onDelete?: () => void;
}

const statusConfig = {
  actief: { label: 'Actief', variant: 'destructive' as const },
  herstel_gemeld: { label: 'Herstel gemeld', variant: 'default' as const },
  gesloten: { label: 'Gesloten', variant: 'secondary' as const },
  archief: { label: 'Archief', variant: 'outline' as const },
};

export function CaseCard({ case_, onClick }: CaseCardProps) {
  const daysOut = case_.end_date 
    ? Math.ceil((new Date(case_.end_date).getTime() - new Date(case_.start_date).getTime()) / (1000 * 60 * 60 * 24))
    : Math.ceil((new Date().getTime() - new Date(case_.start_date).getTime()) / (1000 * 60 * 60 * 24));

  const employeeName = case_.employee 
    ? `${case_.employee.voornaam} ${case_.employee.achternaam}`
    : 'Onbekende medewerker';

  return (
    <Card 
      className="cursor-pointer hover:shadow-md transition-shadow relative"
      onClick={onClick}
    >
      {typeof onDelete === 'function' && (
        <button
          className="absolute top-2 right-2 z-10 opacity-80 bg-destructive text-white rounded px-2 py-1 text-xs shadow hover:bg-destructive/80 transition"
          title="Verwijder ziekmelding"
          onClick={e => {
            e.stopPropagation();
            onDelete();
          }}
        >
          Verwijder
        </button>
      )}
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-lg">{employeeName}</CardTitle>
          </div>
          <Badge variant={statusConfig[case_.case_status].variant}>
            {statusConfig[case_.case_status].label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="h-4 w-4" />
          <span>
            Start: {format(new Date(case_.start_date), 'dd MMMM yyyy', { locale: nl })}
          </span>
        </div>
        {case_.end_date && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>
              Eind: {format(new Date(case_.end_date), 'dd MMMM yyyy', { locale: nl })}
            </span>
          </div>
        )}
        {case_.functional_limitations && (
          <div className="flex items-start gap-2 text-sm">
            <FileText className="h-4 w-4 text-muted-foreground mt-0.5" />
            <span className="line-clamp-2">{case_.functional_limitations}</span>
          </div>
        )}
        <div className="pt-2 text-sm font-medium">
          {case_.end_date ? `${daysOut} dagen verzuim` : `${daysOut} dagen (lopend)`}
        </div>
      </CardContent>
    </Card>
  );
}
