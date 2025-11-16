import { SickLeaveCase } from '@/types/sickLeave';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, User, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';

interface CaseCardProps {
  case_: SickLeaveCase;
  onClick: () => void;
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
    : Math.ceil((new Date().getTime() - new Date(case_.start_date).getTime()) / (1000 * 60 * 60 * 24)) + 1;

  const employeeName = case_.employee 
    ? (case_.employee.voornaam && case_.employee.achternaam 
        ? `${case_.employee.voornaam} ${case_.employee.achternaam}`.trim()
        : case_.employee.email || 'Onbekende medewerker')
    : 'Onbekende medewerker';

  return (
    <Card 
      className="cursor-pointer hover:shadow-md transition-shadow"
      onClick={onClick}
    >
      <CardHeader className="pb-2 sm:pb-3 px-4 sm:px-6 pt-3 sm:pt-6">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <User className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground flex-shrink-0" />
            <CardTitle className="text-base sm:text-lg truncate">{employeeName}</CardTitle>
          </div>
          <Badge variant={statusConfig[case_.case_status].variant} className="text-[10px] sm:text-xs flex-shrink-0">
            {statusConfig[case_.case_status].label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-1.5 sm:space-y-2 px-4 sm:px-6 pb-4 sm:pb-6">
        <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
          <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
          <span className="truncate">
            Start: {format(new Date(case_.start_date), 'dd MMM yyyy', { locale: nl })}
          </span>
        </div>
        {case_.end_date && (
          <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
            <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
            <span className="truncate">
              Eind: {format(new Date(case_.end_date), 'dd MMM yyyy', { locale: nl })}
            </span>
          </div>
        )}
        {case_.functional_limitations && (
          <div className="flex items-start gap-2 text-xs sm:text-sm">
            <FileText className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
            <span className="line-clamp-2">{case_.functional_limitations}</span>
          </div>
        )}
        <div className="pt-1 sm:pt-2 text-xs sm:text-sm font-medium">
          {case_.end_date ? `${daysOut} dagen verzuim` : `${daysOut} dagen (lopend)`}
        </div>
      </CardContent>
    </Card>
  );
}