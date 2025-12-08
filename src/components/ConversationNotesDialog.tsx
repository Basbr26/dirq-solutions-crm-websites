import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageSquarePlus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface ConversationNotesDialogProps {
  caseId: string;
  onNoteAdded: () => void;
}

const conversationTypes = [
  { value: 'telefonisch', label: 'Telefonisch' },
  { value: 'video', label: 'Videogesprek' },
  { value: 'persoonlijk', label: 'Persoonlijk gesprek' },
  { value: 'email', label: 'Per e-mail' },
  { value: 'whatsapp', label: 'WhatsApp/SMS' },
];

const moodOptions = [
  { value: 'positief', label: '😊 Positief' },
  { value: 'neutraal', label: '😐 Neutraal' },
  { value: 'bezorgd', label: '😟 Bezorgd' },
  { value: 'gestrest', label: '😰 Gestrest' },
  { value: 'gefrustreerd', label: '😤 Gefrustreerd' },
];

export function ConversationNotesDialog({ caseId, onNoteAdded }: ConversationNotesDialogProps) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    conversation_date: new Date().toISOString().split('T')[0],
    conversation_type: 'telefonisch',
    summary: '',
    discussed_topics: '',
    agreements: '',
    follow_up_actions: '',
    employee_mood: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('conversation_notes')
        .insert({
          case_id: caseId,
          created_by: user.id,
          conversation_date: formData.conversation_date,
          conversation_type: formData.conversation_type,
          summary: formData.summary,
          discussed_topics: formData.discussed_topics || null,
          agreements: formData.agreements || null,
          follow_up_actions: formData.follow_up_actions || null,
          employee_mood: formData.employee_mood || null,
        });

      if (error) throw error;

      toast.success('Gespreksnotitie opgeslagen');
      setFormData({
        conversation_date: new Date().toISOString().split('T')[0],
        conversation_type: 'telefonisch',
        summary: '',
        discussed_topics: '',
        agreements: '',
        follow_up_actions: '',
        employee_mood: '',
      });
      setOpen(false);
      onNoteAdded();
    } catch (error) {
      console.error('Error saving conversation note:', error);
      toast.error('Fout bij opslaan notitie');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <MessageSquarePlus className="h-4 w-4 mr-2" />
          <span className="hidden sm:inline">Gesprek vastleggen</span>
          <span className="sm:hidden">Gesprek</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] h-[95vh] sm:h-auto sm:max-h-[90vh] flex flex-col p-0 gap-0">
        <div className="flex-shrink-0 px-4 sm:px-6 pt-4 sm:pt-6">
          <DialogHeader>
            <DialogTitle>Gespreksnotitie toevoegen</DialogTitle>
            <DialogDescription>
              Leg een gesprek met de medewerker vast in het dossier
            </DialogDescription>
          </DialogHeader>
        </div>

        <ScrollArea className="flex-1 min-h-0 px-4 sm:px-6">
          <form id="conversation-form" onSubmit={handleSubmit} className="space-y-4 py-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="conversation_date">Datum gesprek *</Label>
                <Input
                  id="conversation_date"
                  type="date"
                  value={formData.conversation_date}
                  onChange={(e) => setFormData({ ...formData, conversation_date: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="conversation_type">Type gesprek *</Label>
                <Select
                  value={formData.conversation_type}
                  onValueChange={(value) => setFormData({ ...formData, conversation_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {conversationTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="summary">Samenvatting gesprek *</Label>
              <Textarea
                id="summary"
                value={formData.summary}
                onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
                placeholder="Korte samenvatting van het gesprek..."
                rows={3}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="discussed_topics">Besproken onderwerpen</Label>
              <Textarea
                id="discussed_topics"
                value={formData.discussed_topics}
                onChange={(e) => setFormData({ ...formData, discussed_topics: e.target.value })}
                placeholder="Welke onderwerpen zijn besproken?"
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="agreements">Gemaakte afspraken</Label>
              <Textarea
                id="agreements"
                value={formData.agreements}
                onChange={(e) => setFormData({ ...formData, agreements: e.target.value })}
                placeholder="Welke afspraken zijn gemaakt?"
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="follow_up_actions">Vervolgacties</Label>
              <Textarea
                id="follow_up_actions"
                value={formData.follow_up_actions}
                onChange={(e) => setFormData({ ...formData, follow_up_actions: e.target.value })}
                placeholder="Welke acties moeten ondernomen worden?"
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="employee_mood">Stemming medewerker</Label>
              <Select
                value={formData.employee_mood}
                onValueChange={(value) => setFormData({ ...formData, employee_mood: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecteer stemming (optioneel)" />
                </SelectTrigger>
                <SelectContent>
                  {moodOptions.map((mood) => (
                    <SelectItem key={mood.value} value={mood.value}>
                      {mood.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </form>
        </ScrollArea>

        <div className="flex-shrink-0 flex justify-end gap-2 p-4 sm:px-6 sm:pb-6 border-t bg-background">
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            Annuleren
          </Button>
          <Button type="submit" form="conversation-form" disabled={loading}>
            {loading ? 'Opslaan...' : 'Opslaan'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
