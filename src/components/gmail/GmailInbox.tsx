import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import {
  initGmail,
  fetchInboxThreads,
  markAsRead,
  setGmailToken,
  type GmailThread,
  type GmailMessage,
} from '@/lib/gmail';
import { ComposeDialog } from './ComposeDialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, RefreshCw, Pencil, ChevronRight, ArrowLeft, Reply } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { logger } from '@/lib/logger';

export function GmailInbox() {
  const { user } = useAuth();
  const [isReady, setIsReady] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [threads, setThreads] = useState<GmailThread[]>([]);
  const [selectedThread, setSelectedThread] = useState<GmailThread | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [composeOpen, setComposeOpen] = useState(false);
  const [replyContext, setReplyContext] = useState<{ threadId: string; messageId: string; to: string; subject: string } | null>(null);

  const ensureGmailReady = useCallback(async () => {
    if (!user) return false;
    const { data } = await supabase
      .from('profiles')
      .select('gmail_access_token, gmail_token_expires_at')
      .eq('id', user.id)
      .single();

    if (!data?.gmail_access_token) return false;

    const expiresAt = new Date(data.gmail_token_expires_at || 0);
    if (expiresAt <= new Date()) return false;

    await initGmail();
    const expiresIn = Math.floor((expiresAt.getTime() - Date.now()) / 1000);
    setGmailToken(data.gmail_access_token, expiresIn);
    return true;
  }, [user]);

  const loadThreads = useCallback(async () => {
    setIsLoading(true);
    try {
      const ready = await ensureGmailReady();
      if (!ready) {
        toast.error('Gmail niet verbonden. Verbind via Instellingen → Integraties.');
        return;
      }
      setIsReady(true);
      const data = await fetchInboxThreads(50);
      setThreads(data);
    } catch (error) {
      logger.error(error, { context: 'gmail_load_threads' });
      toast.error('Inbox laden mislukt');
    } finally {
      setIsLoading(false);
    }
  }, [ensureGmailReady]);

  useEffect(() => {
    loadThreads();
  }, [loadThreads]);

  const handleSelectThread = async (thread: GmailThread) => {
    setSelectedThread(thread);
    // Mark unread messages as read
    for (const msg of thread.messages) {
      if (!msg.isRead) {
        await markAsRead(msg.id);
      }
    }
    // Update local state
    setThreads(prev =>
      prev.map(t =>
        t.threadId === thread.threadId
          ? { ...t, messages: t.messages.map(m => ({ ...m, isRead: true })) }
          : t
      )
    );
  };

  const handleReply = (msg: GmailMessage) => {
    setReplyContext({
      threadId: msg.threadId,
      messageId: msg.id,
      to: msg.fromEmail,
      subject: msg.subject.startsWith('Re:') ? msg.subject : `Re: ${msg.subject}`,
    });
    setComposeOpen(true);
  };

  const filteredThreads = threads.filter(t =>
    !searchQuery ||
    t.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.messages[0]?.fromEmail.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const unreadCount = threads.reduce((sum, t) => sum + t.messages.filter(m => !m.isRead).length, 0);

  return (
    <div className="flex h-full min-h-[600px] border rounded-lg overflow-hidden bg-background">
      {/* Sidebar: thread list */}
      <div className="w-80 border-r flex flex-col shrink-0">
        {/* Header */}
        <div className="p-3 border-b space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="font-semibold text-sm">Inbox</h2>
              {unreadCount > 0 && (
                <Badge variant="default" className="h-5 text-[10px]">{unreadCount}</Badge>
              )}
            </div>
            <div className="flex gap-1">
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={loadThreads} disabled={isLoading}>
                <RefreshCw className={cn('h-3.5 w-3.5', isLoading && 'animate-spin')} />
              </Button>
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { setReplyContext(null); setComposeOpen(true); }}>
                <Pencil className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
          <Input
            placeholder="Zoeken..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="h-8 text-sm"
          />
        </div>

        {/* Thread list */}
        <ScrollArea className="flex-1">
          {isLoading && threads.length === 0 ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : filteredThreads.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              {isReady ? 'Geen emails gevonden' : 'Gmail niet verbonden'}
            </div>
          ) : (
            filteredThreads.map(thread => {
              const hasUnread = thread.messages.some(m => !m.isRead);
              const latest = thread.messages[thread.messages.length - 1];
              const isSelected = selectedThread?.threadId === thread.threadId;
              return (
                <button
                  key={thread.threadId}
                  onClick={() => handleSelectThread(thread)}
                  className={cn(
                    'w-full text-left px-3 py-2.5 border-b hover:bg-muted/50 transition-colors',
                    isSelected && 'bg-muted',
                    hasUnread && 'bg-blue-50/50 dark:bg-blue-950/20'
                  )}
                >
                  <div className="flex items-start justify-between gap-1">
                    <span className={cn('text-sm truncate', hasUnread ? 'font-semibold' : 'font-normal')}>
                      {latest?.fromName || latest?.fromEmail || 'Onbekend'}
                    </span>
                    <span className="text-[10px] text-muted-foreground shrink-0 mt-0.5">
                      {formatDate(thread.latestDate)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    {hasUnread && <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />}
                    <p className={cn('text-xs truncate', hasUnread ? 'font-medium text-foreground' : 'text-muted-foreground')}>
                      {thread.subject}
                    </p>
                  </div>
                  <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                    {thread.snippet}
                  </p>
                </button>
              );
            })
          )}
        </ScrollArea>
      </div>

      {/* Main: thread view */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {selectedThread ? (
          <>
            {/* Thread header */}
            <div className="px-4 py-3 border-b flex items-center gap-3">
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 md:hidden"
                onClick={() => setSelectedThread(null)}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm truncate">{selectedThread.subject}</h3>
                <p className="text-xs text-muted-foreground">
                  {selectedThread.messages.length} bericht{selectedThread.messages.length !== 1 ? 'en' : ''}
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 shrink-0"
                onClick={() => handleReply(selectedThread.messages[selectedThread.messages.length - 1])}
              >
                <Reply className="h-3.5 w-3.5" />
                Beantwoorden
              </Button>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4 max-w-3xl mx-auto">
                {selectedThread.messages.map(msg => (
                  <MessageCard key={msg.id} msg={msg} onReply={handleReply} />
                ))}
              </div>
            </ScrollArea>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center space-y-2">
              <ChevronRight className="h-8 w-8 mx-auto opacity-30" />
              <p className="text-sm">Selecteer een email</p>
            </div>
          </div>
        )}
      </div>

      {/* Compose dialog */}
      <ComposeDialog
        open={composeOpen}
        onOpenChange={setComposeOpen}
        initialTo={replyContext?.to}
        initialSubject={replyContext?.subject}
        replyToThreadId={replyContext?.threadId}
        replyToMessageId={replyContext?.messageId}
        onSent={() => loadThreads()}
      />
    </div>
  );
}

function MessageCard({ msg, onReply }: { msg: GmailMessage; onReply: (msg: GmailMessage) => void }) {
  const [expanded, setExpanded] = useState(true);
  const [showHtml, setShowHtml] = useState(false);

  return (
    <div className="border rounded-lg overflow-hidden">
      {/* Message header */}
      <button
        className="w-full text-left px-4 py-3 bg-muted/30 hover:bg-muted/50 transition-colors"
        onClick={() => setExpanded(e => !e)}
      >
        <div className="flex items-center justify-between">
          <div>
            <span className="font-medium text-sm">
              {msg.fromName || msg.fromEmail}
            </span>
            {msg.fromName && (
              <span className="text-xs text-muted-foreground ml-1">&lt;{msg.fromEmail}&gt;</span>
            )}
          </div>
          <span className="text-xs text-muted-foreground">
            {msg.receivedAt.toLocaleString('nl-NL')}
          </span>
        </div>
        {!expanded && (
          <p className="text-xs text-muted-foreground truncate mt-0.5">{msg.snippet}</p>
        )}
      </button>

      {expanded && (
        <div className="px-4 py-3">
          {/* Body */}
          {msg.bodyHtml ? (
            <div className="space-y-2">
              <div className="flex gap-2 mb-2">
                <button
                  className={cn('text-xs px-2 py-0.5 rounded', !showHtml ? 'bg-primary text-primary-foreground' : 'text-muted-foreground')}
                  onClick={() => setShowHtml(false)}
                >
                  Tekst
                </button>
                <button
                  className={cn('text-xs px-2 py-0.5 rounded', showHtml ? 'bg-primary text-primary-foreground' : 'text-muted-foreground')}
                  onClick={() => setShowHtml(true)}
                >
                  HTML
                </button>
              </div>
              {showHtml ? (
                <iframe
                  srcDoc={msg.bodyHtml}
                  className="w-full min-h-[200px] border-0"
                  sandbox="allow-same-origin"
                  title="Email body"
                />
              ) : (
                <pre className="whitespace-pre-wrap text-sm font-sans leading-relaxed">
                  {msg.bodyText || msg.snippet}
                </pre>
              )}
            </div>
          ) : (
            <pre className="whitespace-pre-wrap text-sm font-sans leading-relaxed">
              {msg.bodyText || msg.snippet}
            </pre>
          )}

          <div className="mt-3 flex justify-end">
            <Button size="sm" variant="ghost" className="gap-1.5" onClick={() => onReply(msg)}>
              <Reply className="h-3.5 w-3.5" />
              Beantwoorden
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function formatDate(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days === 0) return date.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' });
  if (days === 1) return 'Gisteren';
  if (days < 7) return date.toLocaleDateString('nl-NL', { weekday: 'short' });
  return date.toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' });
}
