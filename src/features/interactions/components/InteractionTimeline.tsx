import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { nl } from 'date-fns/locale';
import { 
  Phone, 
  Mail, 
  Calendar, 
  FileText, 
  CheckSquare, 
  Presentation,
  ArrowDownCircle,
  ArrowUpCircle,
  Clock,
  User,
  Check,
  X,
  MoreVertical,
  Edit,
  Trash2,
  CheckCircle2,
  XCircle
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useInteractions, useUpdateInteraction, useDeleteInteraction, Interaction } from '../hooks/useInteractions';
import { cn } from '@/lib/utils';

interface InteractionTimelineProps {
  companyId?: string;
  contactId?: string;
  limit?: number;
  className?: string;
}

const typeConfig = {
  call: { icon: Phone, label: 'Telefoongesprek', color: 'bg-blue-500' },
  email: { icon: Mail, label: 'E-mail', color: 'bg-purple-500' },
  meeting: { icon: Calendar, label: 'Vergadering', color: 'bg-green-500' },
  note: { icon: FileText, label: 'Notitie', color: 'bg-gray-500' },
  task: { icon: CheckSquare, label: 'Taak', color: 'bg-orange-500' },
  demo: { icon: Presentation, label: 'Demo', color: 'bg-teal-500' },
};

export function InteractionTimeline({ 
  companyId, 
  contactId, 
  limit = 10,
  className 
}: InteractionTimelineProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [interactionToDelete, setInteractionToDelete] = useState<string | null>(null);

  const { data, isLoading } = useInteractions({
    companyId,
    contactId,
    pageSize: limit,
  });

  const updateInteraction = useUpdateInteraction();
  const deleteInteraction = useDeleteInteraction();

  const handleMarkCompleted = (id: string) => {
    updateInteraction.mutate({ id, data: { task_status: 'completed' } });
  };

  const handleMarkCancelled = (id: string) => {
    updateInteraction.mutate({ id, data: { task_status: 'cancelled' } });
  };

  const handleDelete = () => {
    if (interactionToDelete) {
      deleteInteraction.mutate(interactionToDelete, {
        onSuccess: () => {
          setDeleteDialogOpen(false);
          setInteractionToDelete(null);
        },
      });
    }
  };

  if (isLoading) {
    return (
      <div className={cn("space-y-4", className)}>
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex gap-4">
            <Skeleton className="h-10 w-10 rounded-full flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-3 w-2/3" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!data || data.interactions.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="pt-6 text-center text-muted-foreground">
          <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p>Nog geen activiteiten geregistreerd</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={cn("relative space-y-6", className)}>
      {/* Timeline line */}
      <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-border" />

      {data.interactions.map((interaction, index) => {
        const config = typeConfig[interaction.type];
        const Icon = config.icon;
        const isLast = index === data.interactions.length - 1;

        return (
          <div key={interaction.id} className="relative flex gap-4">
            {/* Icon */}
            <div className={cn(
              "relative z-10 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border-2 border-background",
              config.color
            )}>
              <Icon className="h-5 w-5 text-white" />
            </div>

            {/* Content */}
            <div className="flex-1 pb-6">
              <Card className="shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="pt-4">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-semibold text-sm">{interaction.subject}</h4>
                        {interaction.direction && (
                          <Badge variant="outline" className="gap-1">
                            {interaction.direction === 'inbound' ? (
                              <>
                                <ArrowDownCircle className="h-3 w-3 text-blue-500" />
                                Inkomend
                              </>
                            ) : (
                              <>
                                <ArrowUpCircle className="h-3 w-3 text-green-500" />
                                Uitgaand
                              </>
                            )}
                          </Badge>
                        )}
                        {interaction.is_task && (
                          <Badge 
                            variant={interaction.task_status === 'completed' ? 'default' : 'secondary'}
                            className="gap-1"
                          >
                            {interaction.task_status === 'completed' ? (
                              <Check className="h-3 w-3" />
                            ) : interaction.task_status === 'cancelled' ? (
                              <X className="h-3 w-3" />
                            ) : (
                              <Clock className="h-3 w-3" />
                            )}
                            {interaction.task_status === 'completed' ? 'Voltooid' :
                             interaction.task_status === 'cancelled' ? 'Geannuleerd' :
                             'Openstaand'}
                          </Badge>
                        )}
                      </div>

                      <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground flex-wrap">
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {interaction.user?.voornaam} {interaction.user?.achternaam}
                        </span>
                        <span>•</span>
                        <span>
                          {formatDistanceToNow(new Date(interaction.created_at), {
                            addSuffix: true,
                            locale: nl,
                          })}
                        </span>
                        {interaction.duration_minutes && (
                          <>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {interaction.duration_minutes} min
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Actions Dropdown */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {interaction.is_task && interaction.task_status === 'pending' && (
                          <>
                            <DropdownMenuItem onClick={() => handleMarkCompleted(interaction.id)}>
                              <CheckCircle2 className="h-4 w-4 mr-2 text-green-500" />
                              Markeer voltooid
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleMarkCancelled(interaction.id)}>
                              <XCircle className="h-4 w-4 mr-2 text-gray-500" />
                              Annuleer taak
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                          </>
                        )}
                        <DropdownMenuItem 
                          onClick={() => {
                            setInteractionToDelete(interaction.id);
                            setDeleteDialogOpen(true);
                          }}
                          className="text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Verwijderen
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>

                    <Badge variant="secondary" className="text-xs">
                      {config.label}
                    </Badge>
                  </div>

                  {/* Description */}
                  {interaction.description && (
                    <p className="text-sm text-muted-foreground mt-2 whitespace-pre-wrap">
                      {interaction.description}
                    </p>
                  )}

                  {/* Company/Contact */}
                  {(interaction.company || interaction.contact) && (
                    <div className="mt-3 pt-3 border-t text-xs text-muted-foreground flex gap-4">
                      {interaction.company && (
                        <span>🏢 {interaction.company.name}</span>
                      )}
                      {interaction.contact && (
                        <span>👤 {interaction.contact.first_name} {interaction.contact.last_name}</span>
                      )}
                    </div>
                  )}

                  {/* Due Date (for tasks) */}
                  {interaction.is_task && interaction.due_date && (
                    <div className="mt-2 text-xs text-muted-foreground">
                      📅 Vervaldatum: {new Date(interaction.due_date).toLocaleDateString('nl-NL')}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        );
      })}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Interactie verwijderen?</AlertDialogTitle>
            <AlertDialogDescription>
              Deze actie kan niet ongedaan worden gemaakt. De interactie wordt permanent verwijderd.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuleren</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Verwijderen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
