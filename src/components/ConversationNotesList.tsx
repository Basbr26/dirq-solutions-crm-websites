import { useState, useEffect } from 'react';
import { logger } from '@/lib/logger';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MessageSquare, Phone, Video, User, Mail, MessageCircle, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface ConversationNote {
  id: string;
  case_id: string;
  created_by: string;
  conversation_date: string;
  conversation_type: string;
  summary: string;
  discussed_topics: string | null;
  agreements: string | null;
  follow_up_actions: string | null;
  employee_mood: string | null;
  created_at: string;
  creator?: {
    voornaam: string;
    achternaam: string;
  };
}

interface ConversationNotesListProps {
  caseId: string;
  refreshTrigger?: number;
}

const conversationTypeConfig: Record<string, { icon: React.ElementType; label: string }> = {
  telefonisch: { icon: Phone, label: 'Telefonisch' },
  video: { icon: Video, label: 'Videogesprek' },
  persoonlijk: { icon: User, label: 'Persoonlijk' },
  email: { icon: Mail, label: 'E-mail' },
  whatsapp: { icon: MessageCircle, label: 'WhatsApp/SMS' },
};

const moodConfig: Record<string, { emoji: string; label: string; color: string }> = {
  positief: { emoji: '😊', label: 'Positief', color: 'bg-green-500/10 text-green-600' },
  neutraal: { emoji: '😐', label: 'Neutraal', color: 'bg-muted text-muted-foreground' },
  bezorgd: { emoji: '😟', label: 'Bezorgd', color: 'bg-yellow-500/10 text-yellow-600' },
  gestrest: { emoji: '😰', label: 'Gestrest', color: 'bg-orange-500/10 text-orange-600' },
  gefrustreerd: { emoji: '😤', label: 'Gefrustreerd', color: 'bg-red-500/10 text-red-600' },
};

export function ConversationNotesList({ caseId, refreshTrigger }: ConversationNotesListProps) {
  const { user, role } = useAuth();
  const [notes, setNotes] = useState<ConversationNote[]>([]);
  const [loading, setLoading] = useState(true);

  const loadNotes = async () => {
    try {
      const { data, error } = await supabase
        .from('conversation_notes')
        .select('*')
        .eq('case_id', caseId)
        .order('conversation_date', { ascending: false });

      if (error) throw error;

      // Fetch creator profiles separately
      const notesWithCreators: ConversationNote[] = [];
      for (const note of data || []) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('voornaam, achternaam')
          .eq('id', note.created_by)
          .maybeSingle();

        notesWithCreators.push({
          ...note,
          creator: profile || undefined,
        });
      }

      setNotes(notesWithCreators);
    } catch (error) {
      logger.error('Failed to load conversation notes', { employeeId, error });
      toast.error('Fout bij laden gespreksnotities');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caseId, refreshTrigger]);

  const handleDelete = async (noteId: string) => {
    try {
      const { error } = await supabase
        .from('conversation_notes')
        .delete()
        .eq('id', noteId);

      if (error) throw error;

      toast.success('Notitie verwijderd');
      loadNotes();
    } catch (error) {
      logger.error('Failed to delete note', { noteId, error });
      toast.error('Fout bij verwijderen notitie');
    }
  };

  if (loading) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Laden...
      </div>
    );
  }

  if (notes.length === 0) {
    return (
      <div className="text-center py-8">
        <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
        <p className="text-muted-foreground">Nog geen gespreksnotities vastgelegd</p>
        <p className="text-sm text-muted-foreground mt-1">
          Gebruik de knop "Gesprek vastleggen" om een gesprek te documenteren
        </p>
      </div>
    );
  }

  const canDelete = role === 'hr' || role === 'manager';

  return (
    <div className="space-y-4">
      {notes.map((note) => {
        const typeConfig = conversationTypeConfig[note.conversation_type] || conversationTypeConfig.telefonisch;
        const TypeIcon = typeConfig.icon;
        const mood = note.employee_mood ? moodConfig[note.employee_mood] : null;

        return (
          <Card key={note.id} className="relative">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-primary/10">
                    <TypeIcon className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-base">
                      {typeConfig.label} - {format(new Date(note.conversation_date), 'd MMMM yyyy', { locale: nl })}
                    </CardTitle>
                    {note.creator && (
                      <p className="text-sm text-muted-foreground">
                        Door: {note.creator.voornaam} {note.creator.achternaam}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {mood && (
                    <Badge variant="outline" className={mood.color}>
                      {mood.emoji} {mood.label}
                    </Badge>
                  )}
                  {canDelete && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Notitie verwijderen?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Weet je zeker dat je deze gespreksnotitie wilt verwijderen? Dit kan niet ongedaan worden gemaakt.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Annuleren</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(note.id)}>
                            Verwijderen
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="text-sm font-medium mb-1">Samenvatting</h4>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{note.summary}</p>
              </div>

              {note.discussed_topics && (
                <div>
                  <h4 className="text-sm font-medium mb-1">Besproken onderwerpen</h4>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{note.discussed_topics}</p>
                </div>
              )}

              {note.agreements && (
                <div>
                  <h4 className="text-sm font-medium mb-1">Gemaakte afspraken</h4>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{note.agreements}</p>
                </div>
              )}

              {note.follow_up_actions && (
                <div>
                  <h4 className="text-sm font-medium mb-1">Vervolgacties</h4>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{note.follow_up_actions}</p>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
