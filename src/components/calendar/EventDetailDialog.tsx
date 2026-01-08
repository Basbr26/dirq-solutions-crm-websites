import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { Calendar, Clock, MapPin, Trash2, Building2, User, Link as LinkIcon, Pencil, X } from 'lucide-react';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';

interface EventDetailDialogProps {
  event: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const eventTypeConfig = {
  meeting: { label: 'Vergadering', color: 'bg-green-500' },
  call: { label: 'Telefoongesprek', color: 'bg-blue-500' },
  task: { label: 'Taak', color: 'bg-orange-500' },
  reminder: { label: 'Herinnering', color: 'bg-purple-500' },
  personal: { label: 'Persoonlijk', color: 'bg-gray-500' },
  training: { label: 'Training', color: 'bg-indigo-500' },
  demo: { label: 'Demo', color: 'bg-pink-500' },
  other: { label: 'Overig', color: 'bg-slate-500' },
};

export function EventDetailDialog({ event, open, onOpenChange }: EventDetailDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('calendar_events')
        .delete()
        .eq('id', event.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar-events'] });
      toast({ title: 'Event verwijderd', description: 'Het calendar event is succesvol verwijderd' });
      setShowDeleteDialog(false);
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({ title: 'Fout', description: error.message, variant: 'destructive' });
    },
  });

  if (!event) return null;

  const config = eventTypeConfig[event.event_type] || eventTypeConfig.other;

  const handleDelete = () => {
    deleteMutation.mutate();
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${config.color}`}>
                  <Calendar className="h-5 w-5 text-white" />
                </div>
                <div>
                  <DialogTitle className="text-2xl">{event.title}</DialogTitle>
                  <Badge variant="secondary" className="mt-1">
                    {config.label}
                  </Badge>
                </div>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Time & Date Section */}
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Datum</p>
                  <p className="text-base">
                    {format(new Date(event.start_time), 'EEEE d MMMM yyyy', { locale: nl })}
                  </p>
                </div>
              </div>

              {!event.all_day && (
                <div className="flex items-start gap-3">
                  <Clock className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Tijd</p>
                    <p className="text-base">
                      {format(new Date(event.start_time), 'HH:mm', { locale: nl })}
                      {event.end_time && <> - {format(new Date(event.end_time), 'HH:mm', { locale: nl })}</>}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Location Section */}
            {event.location && (
              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Locatie</p>
                  <p className="text-base">{event.location}</p>
                </div>
              </div>
            )}

            {/* Meeting URL Section */}
            {event.meeting_url && (
              <div className="flex items-start gap-3">
                <LinkIcon className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Meeting Link</p>
                  <a 
                    href={event.meeting_url} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="text-base text-primary hover:underline"
                  >
                    Deelnemen aan meeting
                  </a>
                </div>
              </div>
            )}

            {/* Company Section */}
            {event.company_id && (
              <div className="flex items-start gap-3">
                <Building2 className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Bedrijf</p>
                  <p className="text-base">Gekoppeld bedrijf</p>
                </div>
              </div>
            )}

            {/* Contact Section */}
            {event.contact_id && (
              <div className="flex items-start gap-3">
                <User className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Contact</p>
                  <p className="text-base">Gekoppeld contact</p>
                </div>
              </div>
            )}

            {/* Description Section */}
            {event.description && (
              <div className="border-t pt-4">
                <p className="text-sm font-medium text-muted-foreground mb-2">Beschrijving</p>
                <p className="text-base whitespace-pre-wrap">{event.description}</p>
              </div>
            )}

            {/* Google Event Badge */}
            {event.google_event_id && (
              <div className="border-t pt-4">
                <Badge variant="outline" className="gap-2">
                  <Calendar className="h-3 w-3" />
                  Gesynchroniseerd met Google Calendar
                </Badge>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              <X className="h-4 w-4 mr-2" />
              Sluiten
            </Button>
            <Button
              variant="destructive"
              onClick={() => setShowDeleteDialog(true)}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Verwijderen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Weet je het zeker?</AlertDialogTitle>
            <AlertDialogDescription>
              Dit calendar event wordt permanent verwijderd. Deze actie kan niet ongedaan worden gemaakt.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuleren</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? 'Verwijderen...' : 'Verwijderen'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
