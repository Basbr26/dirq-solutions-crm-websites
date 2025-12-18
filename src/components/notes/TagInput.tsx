import { useState } from 'react';
import { X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface TagInputProps {
  value?: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  className?: string;
}

export function TagInput({ value = [], onChange, placeholder, className }: TagInputProps) {
  const [input, setInput] = useState('');

  const addTag = (tag: string) => {
    const trimmed = tag.trim().toLowerCase();
    if (trimmed && !value.includes(trimmed)) {
      onChange([...value, trimmed]);
      setInput('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    onChange(value.filter((tag) => tag !== tagToRemove));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (input) {
        addTag(input);
      }
    } else if (e.key === 'Backspace' && !input && value.length > 0) {
      // Remove last tag on backspace if input is empty
      removeTag(value[value.length - 1]);
    } else if (e.key === ',' || e.key === ';') {
      // Also accept comma or semicolon as separator
      e.preventDefault();
      if (input) {
        addTag(input);
      }
    }
  };

  const handleBlur = () => {
    // Add tag on blur if there's input
    if (input) {
      addTag(input);
    }
  };

  return (
    <div
      className={cn(
        'flex flex-wrap gap-2 p-2 border rounded-md min-h-[40px] cursor-text',
        'focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2',
        className
      )}
      onClick={() => {
        // Focus input when clicking anywhere in the container
        const inputEl = document.getElementById('tag-input');
        inputEl?.focus();
      }}
    >
      {value.map((tag) => (
        <Badge key={tag} variant="secondary" className="gap-1 pr-1">
          #{tag}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              removeTag(tag);
            }}
            className="ml-1 hover:text-destructive transition-colors"
            aria-label={`Remove tag ${tag}`}
          >
            <X className="h-3 w-3" />
          </button>
        </Badge>
      ))}
      <Input
        id="tag-input"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        placeholder={value.length === 0 ? placeholder : ''}
        className="border-0 shadow-none flex-1 min-w-[120px] focus-visible:ring-0 focus-visible:ring-offset-0 px-1 h-auto"
      />
    </div>
  );
}
