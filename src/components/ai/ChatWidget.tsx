/**
 * AI Chat Widget Component - Enhanced Version
 * Modern floating chat interface with Gemini AI via n8n webhook
 *
 * Features:
 * - Full-screen expandable chat
 * - Quick action suggestions
 * - Markdown support in responses
 * - Session management via Supabase
 * - Smooth animations
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useHotkeys } from 'react-hotkeys-hook';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { logger } from '@/lib/logger';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { ChatMessage, type ChatMessageProps } from './ChatMessage';
import {
  MessageCircle,
  Send,
  Loader2,
  Sparkles,
  RotateCcw,
  Maximize2,
  Minimize2,
  Zap,
  HelpCircle,
  FileText,
  Users,
  TrendingUp,
  X,
  Mic,
  MessageSquare,
} from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

interface ChatWidgetProps {
  webhookUrl?: string;
}

interface StoredMessage {
  id: string;
  session_id: string;
  user_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

// Quick action suggestions
const quickActions = [
  { icon: Users, label: 'Zoek klant', prompt: 'Help me een klant zoeken op naam of KVK nummer' },
  { icon: FileText, label: 'Maak offerte', prompt: 'Ik wil een nieuwe offerte maken' },
  { icon: TrendingUp, label: 'Sales stats', prompt: 'Geef me een overzicht van mijn sales statistieken' },
  { icon: HelpCircle, label: 'CRM hulp', prompt: 'Hoe werkt het CRM systeem?' },
];

const DEFAULT_WEBHOOK_URL = import.meta.env.VITE_N8N_CHAT_WEBHOOK_URL ||
  'https://dirqsolutions.app.n8n.cloud/webhook/af0281c2-177e-4f17-b89c-6fea1caedf83/chat';

export function ChatWidget({ webhookUrl = DEFAULT_WEBHOOK_URL }: ChatWidgetProps) {
  const { t } = useTranslation();
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();

  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [input, setInput] = useState('');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [isVoiceMode, setIsVoiceMode] = useState(false);

  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Keyboard shortcut: Cmd/Ctrl + J
  useHotkeys('mod+j', (e) => {
    e.preventDefault();
    setOpen(true);
  }, { enableOnFormTags: true });

  // Get or create session
  const sessionQuery = useQuery({
    queryKey: ['chat-session', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

      const { data: sessions, error: fetchError } = await supabase
        .from('chat_sessions')
        .select('id, title, last_message_at')
        .eq('user_id', user.id)
        .gte('last_message_at', oneDayAgo)
        .order('last_message_at', { ascending: false })
        .limit(1);

      if (fetchError) {
        logger.error('Failed to fetch chat sessions', { userId: user.id, error: fetchError });
      }

      if (sessions && sessions.length > 0) {
        return sessions[0].id;
      }

      const { data: newSession, error: createError } = await supabase
        .from('chat_sessions')
        .insert({
          user_id: user.id,
          title: 'Dirq',
        })
        .select('id')
        .single();

      if (createError || !newSession) {
        logger.error('Failed to create chat session', { userId: user.id, error: createError });
        throw new Error('Could not create chat session');
      }

      return newSession.id;
    },
    enabled: !!user?.id && open,
    staleTime: Infinity,
  });

  useEffect(() => {
    if (sessionQuery.data) {
      setSessionId(sessionQuery.data);
    }
  }, [sessionQuery.data]);

  // Fetch messages
  const messagesQuery = useQuery({
    queryKey: ['chat-messages', sessionId],
    queryFn: async () => {
      if (!sessionId) return [];

      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true })
        .limit(100);

      if (error) {
        logger.error('Failed to fetch chat messages', { sessionId, error });
        return [];
      }

      return (data || []) as StoredMessage[];
    },
    enabled: !!sessionId,
    refetchInterval: false,
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (message: string) => {
      if (!sessionId || !user?.id) {
        throw new Error('No active session');
      }

      // Save user message
      const { error: userMsgError } = await supabase
        .from('chat_messages')
        .insert({
          session_id: sessionId,
          user_id: user.id,
          role: 'user',
          content: message,
          metadata: {},
        });

      if (userMsgError) {
        logger.error('Failed to save user message', { sessionId, error: userMsgError });
        throw new Error('Failed to save message');
      }

      queryClient.invalidateQueries({ queryKey: ['chat-messages', sessionId] });

      setIsTyping(true);

      const webhookPayload = {
        message,
        sessionId: sessionId, // n8n Chat Memory expects camelCase
        session_id: sessionId, // Keep for backward compatibility
        user_id: user.id,
        userId: user.id, // n8n compatibility
        user_name: profile ? `${profile.voornaam || ''} ${profile.achternaam || ''}`.trim() : 'Gebruiker',
        userName: profile ? `${profile.voornaam || ''} ${profile.achternaam || ''}`.trim() : 'Gebruiker',
        user_role: profile?.role || 'SALES',
        userRole: profile?.role || 'SALES',
        timestamp: new Date().toISOString(),
        context: {
          current_page: window.location.pathname,
        },
      };

      try {
        const response = await fetch(webhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(webhookPayload),
        });

        if (!response.ok) {
          throw new Error(`Webhook failed: ${response.status}`);
        }

        const result = await response.json();

        const assistantContent = result.output || result.response || result.message || result.content ||
          'Sorry, ik kon geen antwoord genereren. Probeer het opnieuw.';

        const { error: assistantMsgError } = await supabase
          .from('chat_messages')
          .insert({
            session_id: sessionId,
            user_id: user.id,
            role: 'assistant',
            content: assistantContent,
            metadata: {
              tokens_used: result.tokens_used || null,
              model: result.model || 'gemini',
            },
          });

        if (assistantMsgError) {
          logger.error('Failed to save assistant message', { sessionId, error: assistantMsgError });
        }

        await supabase
          .from('chat_sessions')
          .update({ last_message_at: new Date().toISOString() })
          .eq('id', sessionId);

        return { success: true, response: assistantContent };
      } catch (error) {
        logger.error('Webhook request failed', { webhookUrl, error });

        const errorMessage = 'Sorry, er ging iets mis. De AI-service is mogelijk tijdelijk niet beschikbaar.';

        await supabase
          .from('chat_messages')
          .insert({
            session_id: sessionId,
            user_id: user.id,
            role: 'assistant',
            content: errorMessage,
            metadata: { error: true },
          });

        throw error;
      } finally {
        setIsTyping(false);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat-messages', sessionId] });
      setInput('');
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: ['chat-messages', sessionId] });
      toast.error(t('chat.errorSending', 'Bericht versturen mislukt'));
    },
  });

  // Start new session
  const startNewSession = useCallback(async () => {
    if (!user?.id) return;

    const { data: newSession, error } = await supabase
      .from('chat_sessions')
      .insert({
        user_id: user.id,
        title: 'Dirq',
      })
      .select('id')
      .single();

    if (error) {
      toast.error('Kon geen nieuwe sessie starten');
      return;
    }

    setSessionId(newSession.id);
    queryClient.invalidateQueries({ queryKey: ['chat-session', user.id] });
    queryClient.invalidateQueries({ queryKey: ['chat-messages'] });
  }, [user?.id, queryClient]);

  // Handle submit
  const handleSubmit = useCallback(() => {
    if (!input.trim() || sendMessageMutation.isPending) return;
    sendMessageMutation.mutate(input.trim());
  }, [input, sendMessageMutation]);

  // Handle quick action
  const handleQuickAction = useCallback((prompt: string) => {
    setInput(prompt);
    setTimeout(() => {
      sendMessageMutation.mutate(prompt);
    }, 100);
  }, [sendMessageMutation]);

  // Handle key press
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }, [handleSubmit]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [input]);

  // Scroll to bottom
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [messagesQuery.data, isTyping]);

  // Focus textarea when opening
  useEffect(() => {
    if (open && textareaRef.current && !isVoiceMode) {
      setTimeout(() => textareaRef.current?.focus(), 100);
    }
  }, [open, isVoiceMode]);

  // Load ElevenLabs script when voice mode is activated
  useEffect(() => {
    if (isVoiceMode) {
      const existingScript = document.querySelector('script[src*="elevenlabs.io/convai-widget"]');
      if (!existingScript) {
        const script = document.createElement('script');
        script.src = 'https://elevenlabs.io/convai-widget/index.js';
        script.async = true;
        script.type = 'text/javascript';
        document.body.appendChild(script);
      }
    }
  }, [isVoiceMode]);

  const messages = messagesQuery.data || [];
  const isLoading = sessionQuery.isLoading || messagesQuery.isLoading;

  return (
    <>
      {/* Floating Button */}
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.5, type: 'spring', stiffness: 200 }}
        className="fixed z-40"
        style={{
          right: '1.5rem',
          bottom: '1.5rem',
        }}
      >
        <Button
          onClick={() => setOpen(true)}
          className={cn(
            "h-12 w-12 rounded-full shadow-lg",
            "bg-[#06BDC7] hover:bg-[#05a8b1]",
            "hover:shadow-xl hover:shadow-[#06BDC7]/20",
            "transition-all duration-200 hover:scale-105",
            "border border-white/10"
          )}
          aria-label={t('chat.openChat', 'Open Dirq')}
        >
          <MessageCircle className="h-5 w-5 text-white" />
        </Button>
      </motion.div>

      {/* Chat Sheet */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="right"
          className={cn(
            "p-0 flex flex-col gap-0 border-l border-border/50",
            "bg-gradient-to-b from-background via-background to-muted/20",
            expanded ? "w-full sm:max-w-full" : "w-full sm:max-w-[480px]"
          )}
        >
          {/* Header */}
          <SheetHeader className="px-6 py-4 border-b bg-gradient-to-r from-[#06BDC7]/10 via-transparent to-transparent">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="h-10 w-10 rounded-xl bg-[#06BDC7] flex items-center justify-center shadow-md">
                    <span className="text-white font-bold text-lg">D</span>
                  </div>
                  <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-green-500 border-2 border-background" />
                </div>
                <div>
                  <SheetTitle className="text-lg font-semibold flex items-center gap-2">
                    Dirq
                    <Badge variant="secondary" className="text-[10px] font-normal">
                      AI
                    </Badge>
                  </SheetTitle>
                  <p className="text-xs text-muted-foreground">
                    {isVoiceMode ? 'Voice Assistant' : 'CRM Assistant'} • Online
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1">
                {/* Voice/Text Toggle */}
                <Button
                  variant={isVoiceMode ? "default" : "ghost"}
                  size="icon"
                  onClick={() => setIsVoiceMode(!isVoiceMode)}
                  title={isVoiceMode ? t('chat.switchToText', 'Schakel naar tekst') : t('chat.switchToVoice', 'Schakel naar spraak')}
                  className={cn(
                    "h-9 w-9 transition-all duration-200",
                    isVoiceMode
                      ? "bg-gradient-to-r from-[#06BDC7] to-[#0891B2] text-white hover:opacity-90"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {isVoiceMode ? <Mic className="h-4 w-4" /> : <MessageSquare className="h-4 w-4" />}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={startNewSession}
                  title={t('chat.newSession', 'Nieuwe conversatie')}
                  className="h-9 w-9 text-muted-foreground hover:text-foreground"
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setExpanded(!expanded)}
                  className="h-9 w-9 text-muted-foreground hover:text-foreground hidden sm:flex"
                >
                  {expanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setOpen(false)}
                  className="h-9 w-9 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </SheetHeader>

          {/* Messages Area */}
          <ScrollArea ref={scrollAreaRef} className="flex-1 px-4">
            <div className="py-6 space-y-6">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-12 gap-3">
                  <Loader2 className="h-8 w-8 animate-spin text-[#06BDC7]" />
                  <p className="text-sm text-muted-foreground">Laden...</p>
                </div>
              ) : messages.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex flex-col items-center py-8"
                >
                  {/* Welcome message */}
                  <div className="h-16 w-16 rounded-2xl bg-[#06BDC7]/10 flex items-center justify-center mb-4">
                    <span className="text-[#06BDC7] font-bold text-3xl">D</span>
                  </div>
                  <h3 className="text-lg font-semibold mb-2">
                    Hoi! Ik ben Dirq
                  </h3>
                  <p className="text-sm text-muted-foreground text-center mb-6 max-w-sm">
                    Je persoonlijke CRM-assistent. Vraag me over klanten, offertes, projecten of pipeline.
                  </p>

                  {/* Quick Actions */}
                  <div className="grid grid-cols-2 gap-2 w-full max-w-sm">
                    {quickActions.map((action, index) => (
                      <motion.button
                        key={action.label}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        onClick={() => handleQuickAction(action.prompt)}
                        className={cn(
                          "flex items-center gap-2 p-3 rounded-xl text-left",
                          "bg-muted/50 hover:bg-muted border border-border/50",
                          "transition-all duration-200 hover:scale-[1.02] hover:shadow-sm",
                          "group"
                        )}
                      >
                        <div className="h-8 w-8 rounded-lg bg-background flex items-center justify-center group-hover:bg-[#06BDC7]/10 transition-colors">
                          <action.icon className="h-4 w-4 text-muted-foreground group-hover:text-[#06BDC7]" />
                        </div>
                        <span className="text-sm font-medium">{action.label}</span>
                      </motion.button>
                    ))}
                  </div>
                </motion.div>
              ) : (
                <AnimatePresence mode="popLayout">
                  {messages.map((msg, index) => (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.2 }}
                    >
                      <ChatMessage
                        id={msg.id}
                        role={msg.role}
                        content={msg.content}
                        timestamp={new Date(msg.created_at)}
                        userId={user?.id}
                      />
                    </motion.div>
                  ))}
                </AnimatePresence>
              )}

              {/* Typing indicator */}
              <AnimatePresence>
                {isTyping && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="flex gap-3"
                  >
                    <div className="h-9 w-9 rounded-xl bg-[#06BDC7]/10 flex items-center justify-center">
                      <span className="text-[#06BDC7] font-bold text-sm">D</span>
                    </div>
                    <div className="bg-muted rounded-2xl rounded-tl-md px-4 py-3 border border-border/50">
                      <div className="flex gap-1.5">
                        <span className="w-2 h-2 bg-[#06BDC7] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-2 h-2 bg-[#06BDC7] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-2 h-2 bg-[#06BDC7] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </ScrollArea>

          {/* Input Area */}
          <div className="px-4 py-4 border-t bg-background/80 backdrop-blur-sm">
            <AnimatePresence mode="wait">
              {isVoiceMode ? (
                /* Voice Mode - ElevenLabs Widget */
                <motion.div
                  key="voice-mode"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="flex flex-col items-center gap-3"
                >
                  {/* ElevenLabs Widget Container */}
                  <div
                    id="elevenlabs-widget-container"
                    className="w-full min-h-[120px] rounded-xl bg-muted/50 border border-border/50 flex items-center justify-center overflow-hidden"
                  >
                    <elevenlabs-convai agent-id="agent_7401kh4wm601fe2bh6vrtpdnpvww"></elevenlabs-convai>
                  </div>

                  {/* Voice mode hint */}
                  <p className="text-xs text-muted-foreground text-center">
                    Klik op de microfoon om te praten met Dirq
                  </p>
                </motion.div>
              ) : (
                /* Text Mode - Regular Input */
                <motion.div
                  key="text-mode"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="flex gap-2 items-end"
                >
                  <div className="flex-1 relative">
                    <Textarea
                      ref={textareaRef}
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder={t('chat.placeholder', 'Typ je vraag...')}
                      disabled={sendMessageMutation.isPending || isLoading}
                      className={cn(
                        "min-h-[48px] max-h-[120px] resize-none pr-12",
                        "rounded-xl border-border/50 bg-muted/50",
                        "focus:ring-2 focus:ring-[#06BDC7]/20 focus:border-[#06BDC7]",
                        "transition-all duration-200"
                      )}
                      rows={1}
                    />
                    <Button
                      type="button"
                      size="icon"
                      onClick={handleSubmit}
                      disabled={!input.trim() || sendMessageMutation.isPending || isLoading}
                      className={cn(
                        "absolute right-2 bottom-2 h-8 w-8 rounded-lg",
                        "bg-gradient-to-r from-[#06BDC7] to-[#0891B2]",
                        "hover:opacity-90 disabled:opacity-50",
                        "transition-all duration-200"
                      )}
                    >
                      {sendMessageMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin text-white" />
                      ) : (
                        <Send className="h-4 w-4 text-white" />
                      )}
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Footer info */}
            <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <kbd className="px-1.5 py-0.5 rounded bg-muted border border-border text-[10px] font-mono">⌘J</kbd>
                <span className="hidden sm:inline">{t('chat.shortcut', 'om te openen')}</span>
              </span>
              <span className="flex items-center gap-1.5">
                {isVoiceMode ? (
                  <>
                    <Mic className="h-3 w-3 text-[#06BDC7]" />
                    <span>Dirq Voice</span>
                  </>
                ) : (
                  <>
                    <Zap className="h-3 w-3 text-[#06BDC7]" />
                    <span>Dirq AI</span>
                  </>
                )}
                {messages.length > 0 && (
                  <Badge variant="outline" className="text-[10px] ml-1">
                    {messages.length} berichten
                  </Badge>
                )}
              </span>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

export default ChatWidget;
