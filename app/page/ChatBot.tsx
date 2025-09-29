'use client';

import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from '@/components/ai-elements/conversation';
import { Message, MessageContent } from '@/components/ai-elements/message';
import { SimplePromptInput } from '@/components/ai-elements/simple-prompt-input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Action,
  Actions
} from '@/components/ai-elements/actions';
import { useState } from 'react';
import { Response } from '@/components/ai-elements/response';
import { CopyIcon, RefreshCcwIcon } from 'lucide-react';
import { Loader } from '@/components/ai-elements/loader';
import { useChat } from '../../hooks/useChat';
// Removed AuthorizationModal - not needed with simplified chat
import { ChatErrorBoundary } from '../../components/error-boundary';

const models = [
  {
    name: 'GPT 5',
    value: 'openai/gpt-5',
  },
];

const ChatBot = () => {
  const [input, setInput] = useState('');
  const [model, setModel] = useState<string>(models[0].value);
  const [webSearch] = useState(false);
  const { messages, isLoading, sendMessage } = useChat({
    onError: (error) => {
      console.error('Chat error:', error);
    }
  });

  const regenerate = () => {
    if (input.trim()) {
      sendMessage(input, { model, webSearch });
    }
  };
  
  const handleSubmit = (text: string) => {
    setInput(text);
    sendMessage(text, { model, webSearch });
  };

  return (
    <div className="max-w-4xl mx-auto p-6 relative size-full h-screen">
      <div className="flex flex-col h-full">
        <ChatErrorBoundary>
          <Conversation className="h-full" data-testid="conversation">
            <ConversationContent>
            {messages.map((message) => (
              <div key={message.id}>
                <Message from={message.role}>
                  <MessageContent>
                    <Response>
                      {message.content}
                    </Response>
                  </MessageContent>
                </Message>
                {message.role === 'assistant' && message.id === messages.at(-1)?.id && (
                  <Actions className="mt-2">
                    <Action
                      onClick={() => regenerate()}
                      label="Retry"
                    >
                      <RefreshCcwIcon className="size-3" />
                    </Action>
                    <Action
                      onClick={() =>
                        navigator.clipboard.writeText(message.content)
                      }
                      label="Copy"
                    >
                      <CopyIcon className="size-3" />
                    </Action>
                  </Actions>
                )}
              </div>
            ))}
            {isLoading && <Loader data-testid="chat-loader" />}
          </ConversationContent>
          <ConversationScrollButton />
        </Conversation>
        </ChatErrorBoundary>

        <div className="mt-4 space-y-3">
          <div className="flex justify-end">
            <Select value={model} onValueChange={setModel}>
              <SelectTrigger className="w-32" data-testid="model-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {models.map((model) => (
                  <SelectItem key={model.value} value={model.value} data-testid="model-option">
                    {model.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <SimplePromptInput
            onSubmit={handleSubmit}
            disabled={isLoading}
            data-testid="prompt-input"
          />
        </div>
      </div>

      {/* Authorization modal removed - simplified chat doesn't need tool approvals */}
    </div>
  );
};

export default ChatBot;