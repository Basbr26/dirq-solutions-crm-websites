import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Send } from 'lucide-react';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';

interface ComposeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Pre-fill To field */
  initialTo?: string;
  /** Pre-fill Subject (e.g. for reply: Re: ...) */
  initialSubject?: string;
  /** For replies: thread context */
  replyToThreadId?: string;
  replyToMessageId?: string;
  /** Optional CRM link */
  contactId?: string;
  companyId?: string;
  /** Called after successful send */
  onSent?: (messageId: string, threadId: string) => void;
}

export function ComposeDialog({
  open,
  onOpenChange,
  initialTo = '',
  initialSubject = '',
  replyToThreadId,
  replyToMessageId,
  contactId,
  companyId,
  onSent,
}: ComposeDialogProps) {
  const { user } = useAuth();
  const [to, setTo] = useState(initialTo);
  const [subject, setSubject] = useState(initialSubject);
  const [body, setBody] = useState('');
  const [isSending, setIsSending] = useState(false);

  // Sync initial values when props change
  const handleOpenChange = (val: boolean) => {
    if (val) {
      setTo(initialTo);
      setSubject(initialSubject);
      setBody('');
    }
    onOpenChange(val);
  };

  const handleSend = async () => {
    if (!to.trim() || !subject.trim() || !body.trim()) {
      toast.error('Vul Aan, Onderwerp en Bericht in');
      return;
    }
    if (!user) return;

    setIsSending(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/gmail-send`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({
            to: to.trim(),
            subject: subject.trim(),
            body: body.replace(/\n/g, '<br>'),
            thread_id: replyToThreadId,
            in_reply_to: replyToMessageId,
            contact_id: contactId,
            company_id: companyId,
          }),
        }
      );

      const data = await resp.json();

      if (data.success) {
        toast.success('Email verzonden');
        onSent?.(data.message_id, data.thread_id);
        onOpenChange(false);
        setTo('');
        setSubject('');
        setBody('');
      } else {
        toast.error(data.error || 'Verzenden mislukt');
      }
    } catch (error) {
      logger.error(error, { context: 'compose_send', user_id: user.id });
      toast.error('Verzenden mislukt');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{replyToThreadId ? 'Beantwoorden' : 'Nieuw bericht'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div className="space-y-1">
            <Label htmlFor="compose-to">Aan</Label>
            <Input
              id="compose-to"
              placeholder="naam@voorbeeld.nl"
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="compose-subject">Onderwerp</Label>
            <Input
              id="compose-subject"
              placeholder="Onderwerp"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="compose-body">Bericht</Label>
            <Textarea
              id="compose-body"
              placeholder="Typ hier uw bericht..."
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={10}
              className="resize-none font-mono text-sm"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSending}>
            Annuleren
          </Button>
          <Button onClick={handleSend} disabled={isSending} className="gap-2">
            {isSending ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Verzenden...</>
            ) : (
              <><Send className="h-4 w-4" /> Verzenden</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
