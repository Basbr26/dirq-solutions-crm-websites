/**
 * InteractionItem Component
 * Display a single interaction/activity item
 */

import { format } from 'date-fns';
import { nl } from 'date-fns/locale';
import {
  Phone,
  Mail,
  Users,
  FileText,
  CheckSquare,
  Calendar,
  MessageSquare,
  ArrowDownCircle,
  ArrowUpCircle,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { Interaction } from '../hooks/useInteractions';

const interactionIcons = {
  call: Phone,
  email: Mail,
  meeting: Users,
  note: FileText,
  task: CheckSquare,
  demo: Calendar,
};

const interactionColors = {
  call: 'text-blue-500',
  email: 'text-purple-500',
  meeting: 'text-green-500',
  note: 'text-orange-500',
  task: 'text-red-500',
  demo: 'text-indigo-500',
};

const interactionLabels = {
  call: 'Telefoongesprek',
  email: 'Email',
  meeting: 'Meeting',
  note: 'Notitie',
  task: 'Taak',
  demo: 'Demo',
};

interface InteractionItemProps {
  interaction: Interaction;
  compact?: boolean;
}

export function InteractionItem({ interaction, compact = false }: InteractionItemProps) {
  const Icon = interactionIcons[interaction.type];
  const color = interactionColors[interaction.type];
  const label = interactionLabels[interaction.type];

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className={`mt-1 ${color}`}>
            <Icon className="h-5 w-5" />
          </div>
          
          <div className="flex-1 min-w-0">
            {/* Header */}
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <Badge variant="outline" className="text-xs">
                    {label}
                  </Badge>
                  {interaction.direction && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      {interaction.direction === 'inbound' ? (
                        <>
                          <ArrowDownCircle className="h-3 w-3" />
                          <span>Inkomend</span>
                        </>
                      ) : (
                        <>
                          <ArrowUpCircle className="h-3 w-3" />
                          <span>Uitgaand</span>
                        </>
                      )}
                    </div>
                  )}
                  {interaction.is_task && (
                    <Badge 
                      variant={
                        interaction.task_status === 'completed' ? 'default' :
                        interaction.task_status === 'cancelled' ? 'destructive' :
                        'secondary'
                      }
                      className="text-xs"
                    >
                      {interaction.task_status === 'completed' ? 'Afgerond' :
                       interaction.task_status === 'cancelled' ? 'Geannuleerd' :
                       'Te doen'}
                    </Badge>
                  )}
                </div>
                <h4 className="font-medium text-sm truncate">{interaction.subject}</h4>
              </div>
              
              <div className="text-xs text-muted-foreground whitespace-nowrap">
                {format(new Date(interaction.created_at), 'dd MMM yyyy', { locale: nl })}
              </div>
            </div>

            {/* Description */}
            {!compact && interaction.description && (
              <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                {interaction.description}
              </p>
            )}

            {/* Meta info */}
            <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
              {interaction.user && (
                <div className="flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  <span>{interaction.user.voornaam} {interaction.user.achternaam}</span>
                </div>
              )}
              
              {interaction.contact && (
                <div className="flex items-center gap-1">
                  <span>•</span>
                  <span>{interaction.contact.first_name} {interaction.contact.last_name}</span>
                </div>
              )}
              
              {interaction.duration_minutes && (
                <div className="flex items-center gap-1">
                  <span>•</span>
                  <span>{interaction.duration_minutes} min</span>
                </div>
              )}
              
              {interaction.due_date && (
                <div className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  <span>Deadline: {format(new Date(interaction.due_date), 'dd MMM', { locale: nl })}</span>
                </div>
              )}
            </div>

            {/* Tags */}
            {interaction.tags && interaction.tags.length > 0 && (
              <div className="flex items-center gap-1 mt-2 flex-wrap">
                {interaction.tags.map((tag, index) => (
                  <Badge key={index} variant="secondary" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
