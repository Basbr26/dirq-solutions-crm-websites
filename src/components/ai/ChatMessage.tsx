/**
 * Chat Message Component - Enhanced Version
 * Individual message bubble with markdown support and actions
 */

import { formatDistanceToNow } from 'date-fns';
import { nl } from 'date-fns/locale';
import { Sparkles, User, ThumbsUp, ThumbsDown, Copy, Check, CornerDownRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useState, useMemo } from 'react';
import { submitFeedback } from '@/lib/ai/claudeClient';
import { toast } from 'sonner';

export interface ChatMessageProps {
  id?: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  userId?: string;
  onFeedback?: (isHelpful: boolean) => void;
}

// Simple markdown-like formatting
function formatContent(content: string): React.ReactNode[] {
  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let inCodeBlock = false;
  let codeContent: string[] = [];
  let codeLanguage = '';

  lines.forEach((line, lineIndex) => {
    // Code block start/end
    if (line.startsWith('```')) {
      if (!inCodeBlock) {
        inCodeBlock = true;
        codeLanguage = line.slice(3).trim();
        codeContent = [];
      } else {
        inCodeBlock = false;
        elements.push(
          <pre
            key={`code-${lineIndex}`}
            className="bg-zinc-900 text-zinc-100 rounded-lg p-3 my-2 overflow-x-auto text-xs font-mono"
          >
            {codeLanguage && (
              <div className="text-zinc-500 text-[10px] mb-2 uppercase tracking-wider">
                {codeLanguage}
              </div>
            )}
            <code>{codeContent.join('\n')}</code>
          </pre>
        );
      }
      return;
    }

    if (inCodeBlock) {
      codeContent.push(line);
      return;
    }

    // Empty line
    if (!line.trim()) {
      elements.push(<br key={`br-${lineIndex}`} />);
      return;
    }

    // Headers
    if (line.startsWith('### ')) {
      elements.push(
        <h4 key={`h4-${lineIndex}`} className="font-semibold text-sm mt-3 mb-1">
          {line.slice(4)}
        </h4>
      );
      return;
    }
    if (line.startsWith('## ')) {
      elements.push(
        <h3 key={`h3-${lineIndex}`} className="font-semibold text-base mt-3 mb-1">
          {line.slice(3)}
        </h3>
      );
      return;
    }
    if (line.startsWith('# ')) {
      elements.push(
        <h2 key={`h2-${lineIndex}`} className="font-bold text-lg mt-3 mb-1">
          {line.slice(2)}
        </h2>
      );
      return;
    }

    // Bullet points
    if (line.startsWith('- ') || line.startsWith('* ')) {
      elements.push(
        <div key={`li-${lineIndex}`} className="flex gap-2 ml-1">
          <span className="text-[#06BDC7] mt-1.5">•</span>
          <span>{formatInlineText(line.slice(2))}</span>
        </div>
      );
      return;
    }

    // Numbered list
    const numberedMatch = line.match(/^(\d+)\.\s/);
    if (numberedMatch) {
      elements.push(
        <div key={`ol-${lineIndex}`} className="flex gap-2 ml-1">
          <span className="text-[#06BDC7] font-medium min-w-[1.25rem]">{numberedMatch[1]}.</span>
          <span>{formatInlineText(line.slice(numberedMatch[0].length))}</span>
        </div>
      );
      return;
    }

    // Regular paragraph
    elements.push(
      <p key={`p-${lineIndex}`} className="leading-relaxed">
        {formatInlineText(line)}
      </p>
    );
  });

  return elements;
}

// Format inline text (bold, italic, code, links)
function formatInlineText(text: string): React.ReactNode {
  // Simple replacements - in production you'd want a proper parser
  const parts: React.ReactNode[] = [];
  let remaining = text;
  let keyIndex = 0;

  // Process inline code first
  while (remaining.includes('`')) {
    const startIndex = remaining.indexOf('`');
    const endIndex = remaining.indexOf('`', startIndex + 1);

    if (endIndex === -1) break;

    if (startIndex > 0) {
      parts.push(remaining.slice(0, startIndex));
    }

    parts.push(
      <code
        key={`inline-code-${keyIndex++}`}
        className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono text-[#06BDC7]"
      >
        {remaining.slice(startIndex + 1, endIndex)}
      </code>
    );

    remaining = remaining.slice(endIndex + 1);
  }

  if (remaining) {
    // Process bold
    const boldParts = remaining.split(/\*\*(.*?)\*\*/g);
    boldParts.forEach((part, i) => {
      if (i % 2 === 1) {
        parts.push(<strong key={`bold-${keyIndex++}`}>{part}</strong>);
      } else if (part) {
        // Process italic in non-bold parts
        const italicParts = part.split(/\*(.*?)\*/g);
        italicParts.forEach((italicPart, j) => {
          if (j % 2 === 1) {
            parts.push(<em key={`italic-${keyIndex++}`}>{italicPart}</em>);
          } else if (italicPart) {
            parts.push(italicPart);
          }
        });
      }
    });
  }

  return parts.length > 0 ? parts : text;
}

export function ChatMessage({ id, role, content, timestamp, userId, onFeedback }: ChatMessageProps) {
  const [copied, setCopied] = useState(false);
  const [feedbackGiven, setFeedbackGiven] = useState<'up' | 'down' | null>(null);

  const isUser = role === 'user';
  const isSystem = role === 'system';

  const formattedContent = useMemo(() => {
    if (isUser) return content;
    return formatContent(content);
  }, [content, isUser]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success('Gekopieerd naar klembord');
    } catch (error) {
      toast.error('Kopiëren mislukt');
    }
  };

  const handleFeedback = async (isHelpful: boolean) => {
    if (!id || !userId || feedbackGiven) return;

    try {
      await submitFeedback(id, userId, isHelpful);
      setFeedbackGiven(isHelpful ? 'up' : 'down');
      onFeedback?.(isHelpful);
    } catch (error) {
      toast.error('Feedback opslaan mislukt');
    }
  };

  if (isSystem) {
    return (
      <div className="flex justify-center py-2">
        <div className="text-xs text-muted-foreground bg-muted/50 px-4 py-1.5 rounded-full border border-border/50">
          {content}
        </div>
      </div>
    );
  }

  return (
    <div className={cn('flex gap-3 group', isUser ? 'flex-row-reverse' : 'flex-row')}>
      {/* Avatar */}
      <div
        className={cn(
          'flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center shadow-sm',
          isUser
            ? 'bg-gradient-to-br from-zinc-700 to-zinc-800 text-white'
            : 'bg-gradient-to-br from-[#06BDC7]/20 to-[#0891B2]/20'
        )}
      >
        {isUser ? (
          <User className="h-4 w-4" />
        ) : (
          <Sparkles className="h-4 w-4 text-[#06BDC7]" />
        )}
      </div>

      {/* Message Content */}
      <div className={cn('flex flex-col gap-1.5 max-w-[85%]', isUser && 'items-end')}>
        <div
          className={cn(
            'rounded-2xl px-4 py-3 break-words shadow-sm',
            isUser
              ? 'bg-gradient-to-br from-zinc-800 to-zinc-900 text-white rounded-tr-md'
              : 'bg-muted/80 text-foreground border border-border/50 rounded-tl-md'
          )}
        >
          <div className="text-sm space-y-1">
            {isUser ? (
              <p className="whitespace-pre-wrap">{content}</p>
            ) : (
              formattedContent
            )}
          </div>
        </div>

        {/* Timestamp and Actions */}
        <div className={cn('flex items-center gap-2 px-1', isUser ? 'flex-row-reverse' : 'flex-row')}>
          <span className="text-[11px] text-muted-foreground/70">
            {formatDistanceToNow(timestamp, { addSuffix: true, locale: nl })}
          </span>

          {/* Actions for assistant messages */}
          {!isUser && (
            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 hover:bg-muted"
                onClick={handleCopy}
                title="Kopiëren"
              >
                {copied ? (
                  <Check className="h-3 w-3 text-green-500" />
                ) : (
                  <Copy className="h-3 w-3 text-muted-foreground" />
                )}
              </Button>

              {/* Feedback buttons */}
              {id && userId && (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn(
                      "h-6 w-6 p-0 hover:bg-muted",
                      feedbackGiven === 'up' && "bg-green-500/10"
                    )}
                    onClick={() => handleFeedback(true)}
                    disabled={feedbackGiven !== null}
                    title="Nuttig"
                  >
                    <ThumbsUp className={cn(
                      "h-3 w-3",
                      feedbackGiven === 'up' ? "text-green-500" : "text-muted-foreground"
                    )} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn(
                      "h-6 w-6 p-0 hover:bg-muted",
                      feedbackGiven === 'down' && "bg-red-500/10"
                    )}
                    onClick={() => handleFeedback(false)}
                    disabled={feedbackGiven !== null}
                    title="Niet nuttig"
                  >
                    <ThumbsDown className={cn(
                      "h-3 w-3",
                      feedbackGiven === 'down' ? "text-red-500" : "text-muted-foreground"
                    )} />
                  </Button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
