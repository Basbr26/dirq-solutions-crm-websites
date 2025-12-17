import { formatDistanceToNow } from 'date-fns';
import { nl } from 'date-fns/locale';
import { Bot, User, ThumbsUp, ThumbsDown, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useState } from 'react';
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

export function ChatMessage({ id, role, content, timestamp, userId, onFeedback }: ChatMessageProps) {
  const [copied, setCopied] = useState(false);
  const [feedbackGiven, setFeedbackGiven] = useState(false);

  const isUser = role === 'user';
  const isSystem = role === 'system';

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
      setFeedbackGiven(true);
      onFeedback?.(isHelpful);
      toast.success('Bedankt voor je feedback!');
    } catch (error) {
      toast.error('Feedback opslaan mislukt');
    }
  };

  if (isSystem) {
    return (
      <div className="flex justify-center py-2">
        <div className="text-xs text-muted-foreground bg-muted px-3 py-1 rounded-full">
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
          'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center',
          isUser ? 'bg-primary text-primary-foreground' : 'bg-muted'
        )}
      >
        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>

      {/* Message Content */}
      <div className={cn('flex flex-col gap-1 max-w-[80%]', isUser && 'items-end')}>
        <div
          className={cn(
            'rounded-lg px-4 py-2 break-words',
            isUser
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-foreground border border-border'
          )}
        >
          {/* Parse content for links and format */}
          <div className="text-sm whitespace-pre-wrap">
            {content.split('\n').map((line, i) => (
              <span key={i}>
                {line}
                {i < content.split('\n').length - 1 && <br />}
              </span>
            ))}
          </div>
        </div>

        {/* Timestamp and Actions */}
        <div className={cn('flex items-center gap-2', isUser ? 'flex-row-reverse' : 'flex-row')}>
          <span className="text-xs text-muted-foreground">
            {formatDistanceToNow(timestamp, { addSuffix: true, locale: nl })}
          </span>

          {/* Actions for assistant messages */}
          {!isUser && (
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={handleCopy}
              >
                {copied ? (
                  <Check className="h-3 w-3 text-green-500" />
                ) : (
                  <Copy className="h-3 w-3" />
                )}
              </Button>

              {/* Feedback buttons */}
              {id && userId && !feedbackGiven && (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={() => handleFeedback(true)}
                  >
                    <ThumbsUp className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={() => handleFeedback(false)}
                  >
                    <ThumbsDown className="h-3 w-3" />
                  </Button>
                </>
              )}

              {feedbackGiven && (
                <span className="text-xs text-muted-foreground">✓ Bedankt</span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
