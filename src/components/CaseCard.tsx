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
  herstel: { label: 'Herstel', variant: 'default' as const },
  afgesloten: { label: 'Afgesloten', variant: 'secondary' as const },
};

export function CaseCard({ case_, onClick }: CaseCardProps) {
  const daysOut = case_.eind_datum 
    ? Math.ceil((new Date(case_.eind_datum).getTime() - new Date(case_.start_datum).getTime()) / (1000 * 60 * 60 * 24))
    : Math.ceil((new Date().getTime() - new Date(case_.start_datum).getTime()) / (1000 * 60 * 60 * 24));

  return (
    <Card 
      className="cursor-pointer hover:shadow-md transition-shadow"
      onClick={onClick}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-lg">{case_.medewerker_naam}</CardTitle>
          </div>
          <Badge variant={statusConfig[case_.status].variant}>
            {statusConfig[case_.status].label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="h-4 w-4" />
          <span>
            Start: {format(new Date(case_.start_datum), 'dd MMMM yyyy', { locale: nl })}
          </span>
        </div>
        
        {case_.eind_datum && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>
              Eind: {format(new Date(case_.eind_datum), 'dd MMMM yyyy', { locale: nl })}
            </span>
          </div>
        )}

        <div className="flex items-start gap-2 text-sm">
          <FileText className="h-4 w-4 text-muted-foreground mt-0.5" />
          <span className="line-clamp-2">{case_.reden}</span>
        </div>

        <div className="pt-2 text-sm font-medium">
          {case_.eind_datum ? `${daysOut} dagen verzuim` : `${daysOut} dagen (lopend)`}
        </div>
      </CardContent>
    </Card>
  );
}
