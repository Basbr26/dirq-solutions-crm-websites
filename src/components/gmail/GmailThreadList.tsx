import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { ComposeDialog } from './ComposeDialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Reply, ChevronDown, ChevronRight, Mail } from 'lucide-react';
import { cn } from '@/lib/utils';

interface GmailMessageRow {
  id: string;
  gmail_message_id: string;
  gmail_thread_id: string;
  subject: string | null;
  from_email: string | null;
  from_name: string | null;
  to_emails: string[] | null;
  body_text: string | null;
  body_html: string | null;
  direction: 'inbound' | 'outbound';
  is_read: boolean;
  received_at: string | null;
}

interface Props {
  contactId?: string;
  companyId?: string;
}

export function GmailThreadList({ contactId, companyId }: Props) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<GmailMessageRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedThreads, setExpandedThreads] = useState<Set<string>>(new Set());
  const [composeOpen, setComposeOpen] = useState(false);
  const [replyTo, setReplyTo] = useState<{ threadId: string; email: string; subject: string } | null>(null);

  useEffect(() => {
    if (!user) return;
    loadMessages();
  }, [user, contactId, companyId]);

  async function loadMessages() {
    setIsLoading(true);
    let query = supabase
      .from('gmail_messages')
      .select('*')
      .eq('user_id', user!.id)
      .order('received_at', { ascending: false })
      .limit(100);

    if (contactId) query = query.eq('contact_id', contactId);
    else if (companyId) query = query.eq('company_id', companyId);

    const { data } = await query;
    setMessages(data || []);
    setIsLoading(false);
  }

  // Group by thread
  const threadMap = new Map<string, GmailMessageRow[]>();
  for (const msg of messages) {
    const tid = msg.gmail_thread_id;
    if (!threadMap.has(tid)) threadMap.set(tid, []);
    threadMap.get(tid)!.push(msg);
  }
  const threads = Array.from(threadMap.values()).map(msgs => ({
    threadId: msgs[0].gmail_thread_id,
    subject: msgs[0].subject || '(geen onderwerp)',
    messages: msgs.sort((a, b) =>
      new Date(a.received_at || 0).getTime() - new Date(b.received_at || 0).getTime()
    ),
    latestDate: msgs.reduce((latest, m) =>
      new Date(m.received_at || 0) > new Date(latest.received_at || 0) ? m : latest
    ).received_at,
    hasUnread: msgs.some(m => !m.is_read),
  }));

  const toggleThread = (threadId: string) => {
    setExpandedThreads(prev => {
      const next = new Set(prev);
      next.has(threadId) ? next.delete(threadId) : next.add(threadId);
      return next;
    });
  };

  const handleReply = (thread: typeof threads[0]) => {
    const latest = thread.messages[thread.messages.length - 1];
    setReplyTo({
      threadId: thread.threadId,
      email: latest.from_email || '',
      subject: thread.subject.startsWith('Re:') ? thread.subject : `Re: ${thread.subject}`,
    });
    setComposeOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (threads.length === 0) {
    return (
      <div className="text-center py-8 space-y-3">
        <Mail className="h-8 w-8 mx-auto text-muted-foreground opacity-40" />
        <p className="text-sm text-muted-foreground">Geen emails gevonden</p>
        <p className="text-xs text-muted-foreground">
          Synchroniseer Gmail via Instellingen → Integraties om emails te koppelen
        </p>
        <Button size="sm" variant="outline" onClick={() => { setReplyTo(null); setComposeOpen(true); }}>
          Nieuw bericht
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex justify-end mb-2">
        <Button size="sm" variant="outline" onClick={() => { setReplyTo(null); setComposeOpen(true); }}>
          <Mail className="h-3.5 w-3.5 mr-1.5" />
          Nieuw bericht
        </Button>
      </div>

      {threads.map(thread => {
        const isExpanded = expandedThreads.has(thread.threadId);
        return (
          <div key={thread.threadId} className="border rounded-lg overflow-hidden">
            {/* Thread header */}
            <button
              className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/50 transition-colors"
              onClick={() => toggleThread(thread.threadId)}
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  {thread.hasUnread && (
                    <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                  )}
                  <span className={cn('text-sm truncate', thread.hasUnread ? 'font-semibold' : 'font-normal')}>
                    {thread.subject}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {thread.messages.length} bericht{thread.messages.length !== 1 ? 'en' : ''} ·{' '}
                  {thread.messages[thread.messages.length - 1].from_name ||
                    thread.messages[thread.messages.length - 1].from_email}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Badge variant={thread.messages[0].direction === 'inbound' ? 'secondary' : 'outline'} className="text-[10px]">
                  {thread.messages[0].direction === 'inbound' ? 'Ontvangen' : 'Verzonden'}
                </Badge>
                <span className="text-[11px] text-muted-foreground">
                  {formatDate(thread.latestDate)}
                </span>
              </div>
            </button>

            {/* Messages */}
            {isExpanded && (
              <div className="border-t divide-y">
                {thread.messages.map(msg => (
                  <div key={msg.gmail_message_id} className="px-4 py-3 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-medium">
                        {msg.from_name || msg.from_email}
                        {msg.from_name && (
                          <span className="text-muted-foreground font-normal ml-1">
                            &lt;{msg.from_email}&gt;
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-muted-foreground">
                        {msg.received_at ? new Date(msg.received_at).toLocaleString('nl-NL') : ''}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed line-clamp-4">
                      {msg.body_text || '(geen inhoud)'}
                    </p>
                  </div>
                ))}

                {/* Reply button */}
                <div className="px-4 py-2 flex justify-end">
                  <Button size="sm" variant="ghost" className="gap-1.5" onClick={() => handleReply(thread)}>
                    <Reply className="h-3.5 w-3.5" />
                    Beantwoorden
                  </Button>
                </div>
              </div>
            )}
          </div>
        );
      })}

      <ComposeDialog
        open={composeOpen}
        onOpenChange={setComposeOpen}
        initialTo={replyTo?.email}
        initialSubject={replyTo?.subject}
        replyToThreadId={replyTo?.threadId}
        contactId={contactId}
        companyId={companyId}
        onSent={() => loadMessages()}
      />
    </div>
  );
}

function formatDate(date: string | null): string {
  if (!date) return '';
  const d = new Date(date);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days === 0) return d.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' });
  if (days === 1) return 'Gisteren';
  if (days < 7) return d.toLocaleDateString('nl-NL', { weekday: 'short' });
  return d.toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' });
}
