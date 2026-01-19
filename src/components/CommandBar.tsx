/**
 * Command Bar Component
 * Central AI-powered command input for agents (Manus, n8n, Gemini)
 * 
 * Usage examples:
 * - "Maak taak: Bel Bas morgen"
 * - "Update deal status naar gewonnen"
 * - "Stuur offerte naar klant"
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useHotkeys } from 'react-hotkeys-hook';
import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useAgentContext, sendAgentCommand, type AgentContext } from '@/lib/agent-context';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { 
  Sparkles, 
  Send, 
  Loader2, 
  CheckCircle2, 
  XCircle,
  Clock,
  Zap,
  MessageSquare,
  Calendar,
  FileText,
  Building2,
  User,
  TrendingUp,
} from 'lucide-react';
import { toast } from 'sonner';

interface CommandBarProps {
  /** Show as floating button or inline */
  variant?: 'floating' | 'inline' | 'dialog';
  /** Custom webhook URL */
  webhookUrl?: string;
  /** Callback when command is processed */
  onCommandProcessed?: (result: CommandResult) => void;
}

interface CommandResult {
  success: boolean;
  commandId?: string;
  intent?: string;
  entities?: Record<string, unknown>;
  message?: string;
  error?: string;
}

interface CommandSuggestion {
  icon: React.ReactNode;
  label: string;
  template: string;
  category: 'task' | 'deal' | 'document' | 'contact' | 'company';
}

const COMMAND_SUGGESTIONS: CommandSuggestion[] = [
  { 
    icon: <Clock className="h-4 w-4" />, 
    label: 'Maak taak', 
    template: 'Maak taak: [beschrijving] voor [datum]',
    category: 'task'
  },
  { 
    icon: <Calendar className="h-4 w-4" />, 
    label: 'Plan meeting', 
    template: 'Plan meeting met [naam] op [datum] om [tijd]',
    category: 'task'
  },
  { 
    icon: <TrendingUp className="h-4 w-4" />, 
    label: 'Update deal', 
    template: 'Update deal [naam] naar [fase]',
    category: 'deal'
  },
  { 
    icon: <FileText className="h-4 w-4" />, 
    label: 'Stuur document', 
    template: 'Stuur offerte naar [bedrijf/contact]',
    category: 'document'
  },
  { 
    icon: <Building2 className="h-4 w-4" />, 
    label: 'Nieuw bedrijf', 
    template: 'Maak bedrijf [naam] aan met email [email]',
    category: 'company'
  },
  { 
    icon: <User className="h-4 w-4" />, 
    label: 'Nieuw contact', 
    template: 'Voeg contact [naam] toe aan [bedrijf]',
    category: 'contact'
  },
  { 
    icon: <MessageSquare className="h-4 w-4" />, 
    label: 'Log notitie', 
    template: 'Notitie: [tekst] bij [bedrijf/contact]',
    category: 'task'
  },
];

export function CommandBar({ 
  variant = 'floating', 
  webhookUrl,
  onCommandProcessed 
}: CommandBarProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { user, profile } = useAuth();
  const agentContext = useAgentContext();
  
  // Keyboard shortcut: Cmd/Ctrl + K
  useHotkeys('mod+k', (e) => {
    e.preventDefault();
    setOpen(true);
  }, { enableOnFormTags: true });
  
  // Save command to database
  const saveCommandMutation = useMutation({
    mutationFn: async (data: {
      rawInput: string;
      context: AgentContext | null;
      result?: CommandResult;
    }) => {
      const { error } = await supabase
        .from('agent_commands')
        .insert({
          raw_input: data.rawInput,
          parsed_intent: data.result?.intent,
          parsed_entities: data.result?.entities,
          status: data.result?.success ? 'completed' : 'failed',
          result: data.result,
          error_message: data.result?.error,
          source: 'command_bar',
          user_id: user?.id,
          session_context: data.context,
        });
      
      if (error) throw error;
    },
  });
  
  // Process command
  const processCommandMutation = useMutation({
    mutationFn: async (command: string) => {
      const context = agentContext || {
        route: { path: window.location.pathname, params: {}, query: {} },
        user: user ? {
          id: user.id,
          email: user.email || '',
          role: '',
          name: profile ? `${profile.voornaam} ${profile.achternaam}` : '',
        } : null,
        entity: { type: null, id: null, data: null },
        activeTab: null,
        visibleData: {},
        availableActions: [],
        timestamp: new Date().toISOString(),
      };
      
      // Send to webhook
      const result = await sendAgentCommand(command, context, webhookUrl);
      
      // Save to database
      await saveCommandMutation.mutateAsync({
        rawInput: command,
        context,
        result: {
          success: result.success,
          commandId: result.commandId,
          message: result.success ? 'Command processed' : result.error,
          error: result.error,
        },
      });
      
      return result;
    },
    onSuccess: (result) => {
      if (result.success) {
        toast.success('Commando verwerkt', {
          description: 'Je opdracht is doorgestuurd naar de AI-agent.',
        });
      } else {
        toast.error('Commando mislukt', {
          description: result.error || 'Er ging iets mis bij het verwerken.',
        });
      }
      
      onCommandProcessed?.(result as CommandResult);
      setInput('');
      setOpen(false);
    },
    onError: (error) => {
      toast.error(t('errors.errorSending'), {
        description: error instanceof Error ? error.message : 'Onbekende fout',
      });
    },
  });
  
  const handleSubmit = useCallback(() => {
    if (!input.trim()) return;
    processCommandMutation.mutate(input.trim());
  }, [input, processCommandMutation]);
  
  const handleSuggestionClick = (suggestion: CommandSuggestion) => {
    setInput(suggestion.template);
    setShowSuggestions(false);
    inputRef.current?.focus();
  };
  
  const isProcessing = processCommandMutation.isPending;
  
  // Floating button variant
  if (variant === 'floating') {
    return (
      <>
        <Button
          onClick={() => setOpen(true)}
          className={cn(
            "fixed z-50 h-12 w-12 rounded-full shadow-lg",
            "bg-gradient-to-r from-primary to-primary/80",
            "hover:from-primary/90 hover:to-primary/70",
            "transition-all duration-200",
            "md:h-auto md:w-auto md:px-4 md:rounded-lg"
          )}
          style={{
            right: '1rem',
            bottom: 'calc(6rem + env(safe-area-inset-bottom, 0px))',
          }}
          data-agent="command-bar-trigger"
          data-agent-action="open-command-bar"
        >
          <Sparkles className="h-5 w-5 md:mr-2" />
          <span className="hidden md:inline">AI Command</span>
          <kbd className="hidden md:inline-flex ml-2 pointer-events-none h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100">
            <span className="text-xs">⌘</span>K
          </kbd>
        </Button>
        
        <CommandBarDialog
          open={open}
          onOpenChange={setOpen}
          input={input}
          onInputChange={setInput}
          onSubmit={handleSubmit}
          isProcessing={isProcessing}
          suggestions={COMMAND_SUGGESTIONS}
          onSuggestionClick={handleSuggestionClick}
        />
      </>
    );
  }
  
  // Dialog variant (triggered externally)
  if (variant === 'dialog') {
    return (
      <CommandBarDialog
        open={open}
        onOpenChange={setOpen}
        input={input}
        onInputChange={setInput}
        onSubmit={handleSubmit}
        isProcessing={isProcessing}
        suggestions={COMMAND_SUGGESTIONS}
        onSuggestionClick={handleSuggestionClick}
      />
    );
  }
  
  // Inline variant
  return (
    <div 
      className="relative flex items-center gap-2"
      data-agent="command-bar-inline"
    >
      <div className="relative flex-1">
        <Sparkles className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onFocus={() => setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSubmit();
            }
          }}
          placeholder="Type een commando... (bijv. 'Maak taak: Bel klant morgen')"
          className="pl-10 pr-20"
          disabled={isProcessing}
          data-agent="command-input"
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          <kbd className="hidden sm:inline-flex pointer-events-none h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100">
            <span className="text-xs">⌘</span>K
          </kbd>
        </div>
      </div>
      
      <Button
        onClick={handleSubmit}
        disabled={!input.trim() || isProcessing}
        size="icon"
        data-agent-action="send-command"
      >
        {isProcessing ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Send className="h-4 w-4" />
        )}
      </Button>
      
      {/* Suggestions dropdown */}
      {showSuggestions && !input && (
        <div className="absolute top-full left-0 right-0 mt-2 p-2 bg-popover border rounded-lg shadow-lg z-50">
          <p className="text-xs text-muted-foreground mb-2 px-2">Suggesties</p>
          <div className="space-y-1">
            {COMMAND_SUGGESTIONS.slice(0, 5).map((suggestion, i) => (
              <button
                key={i}
                onClick={() => handleSuggestionClick(suggestion)}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted text-sm text-left"
              >
                {suggestion.icon}
                <span>{suggestion.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Dialog component for command bar
interface CommandBarDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  input: string;
  onInputChange: (value: string) => void;
  onSubmit: () => void;
  isProcessing: boolean;
  suggestions: CommandSuggestion[];
  onSuggestionClick: (suggestion: CommandSuggestion) => void;
}

function CommandBarDialog({
  open,
  onOpenChange,
  input,
  onInputChange,
  onSubmit,
  isProcessing,
  suggestions,
  onSuggestionClick,
}: CommandBarDialogProps) {
  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <div className="flex items-center border-b px-3">
        <Sparkles className="h-4 w-4 mr-2 text-primary" />
        <CommandInput 
          placeholder="Typ een commando of zoek..."
          value={input}
          onValueChange={onInputChange}
          data-agent="command-dialog-input"
        />
        {isProcessing && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
      </div>
      <CommandList>
        <CommandEmpty>
          {input ? (
            <div className="py-6 text-center">
              <p className="text-sm text-muted-foreground mb-4">
                Druk op Enter om te verzenden:
              </p>
              <Badge variant="secondary" className="text-sm">
                "{input}"
              </Badge>
              <Button 
                className="mt-4 w-full" 
                onClick={onSubmit}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Verwerken...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Verzend naar AI
                  </>
                )}
              </Button>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">{t('dialogs.noResultsFound')}</p>
          )}
        </CommandEmpty>
        
        {!input && (
          <>
            <CommandGroup heading="Snelle acties">
              {suggestions.filter(s => s.category === 'task').map((suggestion, i) => (
                <CommandItem 
                  key={i}
                  onSelect={() => onSuggestionClick(suggestion)}
                  className="cursor-pointer"
                >
                  {suggestion.icon}
                  <span className="ml-2">{suggestion.label}</span>
                </CommandItem>
              ))}
            </CommandGroup>
            
            <CommandSeparator />
            
            <CommandGroup heading="Deals & Documenten">
              {suggestions.filter(s => ['deal', 'document'].includes(s.category)).map((suggestion, i) => (
                <CommandItem 
                  key={i}
                  onSelect={() => onSuggestionClick(suggestion)}
                  className="cursor-pointer"
                >
                  {suggestion.icon}
                  <span className="ml-2">{suggestion.label}</span>
                </CommandItem>
              ))}
            </CommandGroup>
            
            <CommandSeparator />
            
            <CommandGroup heading="CRM">
              {suggestions.filter(s => ['company', 'contact'].includes(s.category)).map((suggestion, i) => (
                <CommandItem 
                  key={i}
                  onSelect={() => onSuggestionClick(suggestion)}
                  className="cursor-pointer"
                >
                  {suggestion.icon}
                  <span className="ml-2">{suggestion.label}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}
      </CommandList>
      
      <div className="border-t p-2 flex items-center justify-between text-xs text-muted-foreground">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 rounded bg-muted">↵</kbd>
            Verzenden
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 rounded bg-muted">Esc</kbd>
            Sluiten
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Zap className="h-3 w-3 text-primary" />
          <span>Powered by AI</span>
        </div>
      </div>
    </CommandDialog>
  );
}

export default CommandBar;
