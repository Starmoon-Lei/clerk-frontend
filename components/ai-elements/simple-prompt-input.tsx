'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { SendIcon, Loader2Icon } from 'lucide-react';

export interface SimplePromptInputProps {
  onSubmit: (text: string) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

/**
 * Simple, consolidated prompt input component
 * Replaces 9 micro-components with essential functionality only
 */
export function SimplePromptInput({
  onSubmit,
  disabled = false,
  placeholder = "What would you like to know?",
  className = "",
}: SimplePromptInputProps) {
  const [value, setValue] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (value.trim() && !disabled) {
      onSubmit(value.trim());
      setValue('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter') {
      // Don't submit if IME composition is in progress
      if (e.nativeEvent.isComposing) {
        return;
      }

      if (e.shiftKey) {
        // Allow newline with Shift+Enter
        return;
      }

      // Submit on Enter (without Shift)
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const canSubmit = value.trim() && !disabled;

  return (
    <form
      onSubmit={handleSubmit}
      className={`w-full rounded-xl border bg-background shadow-sm ${className}`}
    >
      <div className="flex flex-col">
        <Textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          className="resize-none border-none p-3 shadow-none outline-none ring-0 field-sizing-content max-h-[6lh] bg-transparent focus-visible:ring-0"
        />

        <div className="flex items-center justify-end p-2 border-t">
          <Button
            type="submit"
            disabled={!canSubmit}
            size="sm"
            className="gap-1.5"
          >
            {disabled ? (
              <Loader2Icon className="size-4 animate-spin" />
            ) : (
              <SendIcon className="size-4" />
            )}
            Send
          </Button>
        </div>
      </div>
    </form>
  );
}