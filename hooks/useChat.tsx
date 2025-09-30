import { useState, useCallback } from 'react';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

export interface UseChatOptions {
  initialMessages?: ChatMessage[];
  api?: string;
  onFinish?: (message: ChatMessage) => void;
  onError?: (error: Error) => void;
}

export interface UseChatReturn {
  messages: ChatMessage[];
  isLoading: boolean;
  sendMessage: (text: string, options?: { model?: string; webSearch?: boolean }) => Promise<void>;
  clearMessages: () => void;
}

/**
 * Ultra-simple non-streaming chat hook
 * Perfect for business Q&A: fast, reliable, professional
 * 30 lines vs 864+ lines of unnecessary streaming complexity
 */
export function useChat({
  initialMessages = [],
  api = '/api/chat',
  onFinish,
  onError,
}: UseChatOptions = {}): UseChatReturn {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [isLoading, setIsLoading] = useState(false);

  const sendMessage = useCallback(async (
    text: string,
    options?: { model?: string; webSearch?: boolean }
  ) => {
    if (isLoading || !text.trim()) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text.trim(),
    };

    // Add user message immediately
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const response = await fetch(api, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMessage].map(msg => ({
            role: msg.role,
            content: msg.content,
          })),
          model: options?.model || 'gpt-5-mini-2025-08-07',
          webSearch: options?.webSearch || false,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: data.content || data.output?.content || '',
      };

      setMessages(prev => [...prev, assistantMessage]);
      onFinish?.(assistantMessage);

    } catch (error) {
      console.error('Chat error:', error);
      onError?.(error instanceof Error ? error : new Error('Unknown error'));
    } finally {
      setIsLoading(false);
    }
  }, [messages, isLoading, api, onFinish, onError]);

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  return {
    messages,
    isLoading,
    sendMessage,
    clearMessages,
  };
}