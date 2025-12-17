import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';
import { 
  MessageCircle, 
  X, 
  Send, 
  Loader2, 
  Sparkles,
  Minimize2,
  Maximize2
} from 'lucide-react';
import { ChatMessage } from './ChatMessage';
import { useAuth } from '@/hooks/useAuth';
import { 
  sendMessageToClaude, 
  saveMessage, 
  getOrCreateSession, 
  getChatHistory,
  type Message 
} from '@/lib/ai/claudeClient';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface QuickReply {
  label: string;
  query: string;
}

const quickReplies: QuickReply[] = [
  { label: '📅 Verlofdagen', query: 'Hoeveel verlofdagen heb ik nog?' },
  { label: '🤒 Ziekmelding', query: 'Wat zijn de stappen bij ziekmelding?' },
  { label: '💼 Functioneren', query: 'Wanneer is mijn functioneringsgesprek?' },
  { label: '📞 HR Contact', query: 'Hoe kan ik HR bereiken?' },
];

export function HRChatbot() {
  const { user, profile, role } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<(Message & { id?: string; timestamp: Date })[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Initialize session and load history
  useEffect(() => {
    if (isOpen && user && !sessionId) {
      initializeChat();
    }
  }, [isOpen, user]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  const initializeChat = async () => {
    if (!user) return;

    try {
      const newSessionId = await getOrCreateSession(user.id);
      setSessionId(newSessionId);

      // Load chat history
      const history = await getChatHistory(newSessionId, 10);
      
      if (history.length === 0) {
        // Welcome message
        setMessages([
          {
            role: 'assistant',
            content: `Hoi ${profile?.voornaam || 'daar'}! 👋\n\nIk ben je AI HR Assistant. Ik kan je helpen met vragen over:\n• Verlof en vakantiedagen\n• Ziekmelding en verzuimprocedures\n• Functioneringsgesprekken\n• Arbeidsvoorwaarden en beleid\n• En nog veel meer!\n\nWaar kan ik je mee helpen?`,
            timestamp: new Date(),
          },
        ]);
      } else {
        setMessages(
          history.map((msg) => ({
            ...msg,
            timestamp: new Date(),
          }))
        );
      }
    } catch (error) {
      console.error('Failed to initialize chat:', error);
      toast.error('Chat kon niet worden gestart');
    }
  };

  const handleSendMessage = async (text?: string) => {
    const messageText = text || input.trim();
    if (!messageText || !user || !sessionId) return;

    setInput('');
    setIsLoading(true);

    // Add user message
    const userMessage: Message & { timestamp: Date } = {
      role: 'user',
      content: messageText,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);

    try {
      // Save user message
      await saveMessage(sessionId, user.id, 'user', messageText);

      // Get AI response
      const context = {
        userId: user.id,
        userName: `${profile?.voornaam} ${profile?.achternaam}`,
        role: role || 'medewerker',
        // @ts-expect-error - afdeling may not be in profile type yet
        department: profile?.afdeling,
      };

      const response = await sendMessageToClaude(
        [...messages, userMessage],
        context,
        false
      );

      // Add assistant message
      const assistantMessage: Message & { timestamp: Date } = {
        role: 'assistant',
        content: response.content,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMessage]);

      // Save assistant message
      await saveMessage(sessionId, user.id, 'assistant', response.content, {
        usage: response.usage,
      });
    } catch (error: unknown) {
      console.error('Chat error:', error);
      
      let errorMessage = 'Er is een fout opgetreden. Probeer het opnieuw.';
      if (error instanceof Error && error.message?.includes('Rate limit')) {
        errorMessage = 'Je hebt te veel berichten verstuurd. Wacht even voordat je verder gaat.';
      }

      toast.error(errorMessage);

      // Add error message
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `Sorry, ${errorMessage}`,
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleQuickReply = (query: string) => {
    handleSendMessage(query);
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (!user) return null;

  return (
    <>
      {/* Floating Chat Button */}
      {!isOpen && (
        <Button
          size="lg"
          className={cn(
            'fixed bottom-6 right-6 rounded-full w-14 h-14 shadow-lg',
            'hover:scale-110 transition-transform',
            'animate-pulse'
          )}
          onClick={() => setIsOpen(true)}
        >
          <MessageCircle className="h-6 w-6" />
        </Button>
      )}

      {/* Chat Panel */}
      {isOpen && (
        <Card
          className={cn(
            'fixed right-6 shadow-2xl flex flex-col',
            'transition-all duration-300 ease-in-out',
            isMinimized
              ? 'bottom-6 w-80 h-14'
              : 'bottom-6 w-[400px] h-[600px]'
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b bg-primary text-primary-foreground">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              <div>
                <h3 className="font-semibold">HR Assistant</h3>
                {!isMinimized && (
                  <p className="text-xs opacity-90">Powered by AI</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 hover:bg-primary-foreground/20"
                onClick={() => setIsMinimized(!isMinimized)}
              >
                {isMinimized ? (
                  <Maximize2 className="h-4 w-4" />
                ) : (
                  <Minimize2 className="h-4 w-4" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 hover:bg-primary-foreground/20"
                onClick={() => setIsOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Chat Content */}
          {!isMinimized && (
            <>
              {/* Messages */}
              <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
                <div className="space-y-4">
                  {messages.map((message, index) => (
                    <ChatMessage
                      key={index}
                      role={message.role}
                      content={message.content}
                      timestamp={message.timestamp}
                      userId={user.id}
                    />
                  ))}

                  {/* Typing Indicator */}
                  {isLoading && (
                    <div className="flex gap-3">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                        <Loader2 className="h-4 w-4 animate-spin" />
                      </div>
                      <div className="bg-muted rounded-lg px-4 py-2">
                        <div className="flex gap-1">
                          <div className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" />
                          <div className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce delay-100" />
                          <div className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce delay-200" />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>

              {/* Quick Replies */}
              {messages.length <= 1 && !isLoading && (
                <div className="px-4 pb-2">
                  <p className="text-xs text-muted-foreground mb-2">Veelgestelde vragen:</p>
                  <div className="flex flex-wrap gap-2">
                    {quickReplies.map((reply, index) => (
                      <Badge
                        key={index}
                        variant="outline"
                        className="cursor-pointer hover:bg-accent"
                        onClick={() => handleQuickReply(reply.query)}
                      >
                        {reply.label}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Input */}
              <div className="p-4 border-t">
                <div className="flex gap-2">
                  <Input
                    ref={inputRef}
                    placeholder="Stel een vraag..."
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    disabled={isLoading}
                    className="flex-1"
                  />
                  <Button
                    size="icon"
                    onClick={() => handleSendMessage()}
                    disabled={!input.trim() || isLoading}
                  >
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Tip: Druk op Enter om te versturen
                </p>
              </div>
            </>
          )}
        </Card>
      )}
    </>
  );
}
