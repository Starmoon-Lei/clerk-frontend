'use client';

import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from '@/components/ai-elements/conversation';
import { Message, MessageContent } from '@/components/ai-elements/message';
import {
  PromptInput,
  PromptInputModelSelect,
  PromptInputModelSelectContent,
  PromptInputModelSelectItem,
  PromptInputModelSelectTrigger,
  PromptInputModelSelectValue,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputToolbar,
  PromptInputTools,
} from '@/components/ai-elements/prompt-input';
import {
  Action,
  Actions
} from '@/components/ai-elements/actions';
import {
  Tool,
  ToolHeader,
  ToolContent,
  ToolInput,
  ToolOutput,
} from '@/components/ai-elements/tool';
import { Fragment, useState } from 'react';
import { Response } from '@/components/ai-elements/response';
import { CopyIcon, RefreshCcwIcon } from 'lucide-react';
import {
  Source,
  Sources,
  SourcesContent,
  SourcesTrigger,
} from '@/components/ai-elements/sources';
import {
  Reasoning,
  ReasoningContent,
  ReasoningTrigger,
} from '@/components/ai-elements/reasoning';
import { Loader } from '@/components/ai-elements/loader';
import { useResponseChat } from '../../hooks/useResponseChat';
import { AuthorizationModal } from '../components/AuthorizationModal';

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
  const { messages, sendMessage, status, pendingApproval, approveToolCall } = useResponseChat({
    onError: (error) => {
      console.error('Chat error:', error);
    }
  });

  const regenerate = () => {
    sendMessage(
      { text: input },
      {
        body: {
          model: model,
          webSearch: webSearch,
        },
      },
    );
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      sendMessage(
        { text: input },
        {
          body: {
            model: model,
            webSearch: webSearch,
          },
        },
      );
      setInput('');
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 relative size-full h-screen">
      <div className="flex flex-col h-full">
        <Conversation className="h-full" data-testid="conversation">
          <ConversationContent>
            {messages.map((message) => (
              <div key={message.id}>
                {/* Sources */}
                {message.role === 'assistant' && message.parts.filter((part) => part.type === 'source-url').length > 0 && (
                  <Sources>
                    <SourcesTrigger
                      count={
                        message.parts.filter(
                          (part) => part.type === 'source-url',
                        ).length
                      }
                    />
                    {message.parts.filter((part) => part.type === 'source-url').map((part, i) => (
                      <SourcesContent key={`${message.id}-${i}`}>
                        <Source
                          key={`${message.id}-${i}`}
                          href={part.url}
                          title={part.url}
                        />
                      </SourcesContent>
                    ))}
                  </Sources>
                )}

                {/* Reasoning */}
                {message.parts.filter((part) => part.type === 'reasoning').map((part, i) => (
                  <Reasoning
                    key={`${message.id}-reasoning-${i}`}
                    className="w-full"
                    isStreaming={status === 'streaming' && message.id === messages.at(-1)?.id}
                  >
                    <ReasoningTrigger />
                    <ReasoningContent>{part.text || ''}</ReasoningContent>
                  </Reasoning>
                ))}

                {/* Tool Calls */}
                {message.parts.filter((part) => part.type === 'tool-call').map((part) => (
                  <Tool key={`${message.id}-tool-${part.id}`}>
                    <ToolHeader
                      type={(part.name || 'tool') as unknown as Parameters<typeof ToolHeader>[0]['type']}
                      state={(part.state === 'streaming' ? 'input-streaming' : 
                            part.state === 'completed' ? 'output-available' : 
                            part.state === 'failed' ? 'output-error' : 'input-available') as unknown as Parameters<typeof ToolHeader>[0]['state']}
                    />
                    <ToolContent>
                      {part.text && (
                        <ToolInput input={(() => {
                          try {
                            return JSON.parse(part.text || '{}');
                          } catch {
                            return { arguments: part.text };
                          }
                        })()} />
                      )}
                      {message.parts.filter(p => p.type === 'tool-result' && p.id === part.id).map((resultPart) => (
                        <ToolOutput
                          key={`${part.id}-result`}
                          output={resultPart.output}
                          errorText={resultPart.output?.startsWith('Error:') ? resultPart.output : undefined}
                        />
                      ))}
                    </ToolContent>
                  </Tool>
                ))}

                {/* Text Content */}
                {message.parts.filter((part) => part.type === 'text').map((part, i) => (
                  <Fragment key={`${message.id}-text-${i}`}>
                    <Message from={message.role}>
                      <MessageContent>
                        <Response>
                          {part.text}
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
                            navigator.clipboard.writeText(part.text || '')
                          }
                          label="Copy"
                        >
                          <CopyIcon className="size-3" />
                        </Action>
                      </Actions>
                    )}
                  </Fragment>
                ))}
              </div>
            ))}
            {status === 'submitted' && <Loader data-testid="chat-loader" />}
            {status === 'error' && (
              <div className="p-4 bg-destructive/10 text-destructive rounded-md" data-testid="error-message">
                An error occurred while processing your request. Please try again.
              </div>
            )}
          </ConversationContent>
          <ConversationScrollButton />
        </Conversation>

        <PromptInput onSubmit={handleSubmit} className="mt-4" data-testid="prompt-input">
          <PromptInputTextarea
            onChange={(e) => setInput(e.target.value)}
            value={input}
            data-testid="chat-input"
          />
          <PromptInputToolbar>
            <PromptInputTools>
              {/* <PromptInputButton
                variant={webSearch ? 'default' : 'ghost'}
                onClick={() => setWebSearch(!webSearch)}
              >
                <GlobeIcon size={16} />
                <span>Search</span>
              </PromptInputButton> */}
              <PromptInputModelSelect
                onValueChange={(value) => {
                  setModel(value);
                }}
                value={model}
                data-testid="model-select"
              >
                <PromptInputModelSelectTrigger>
                  <PromptInputModelSelectValue />
                </PromptInputModelSelectTrigger>
                <PromptInputModelSelectContent>
                  {models.map((model) => (
                    <PromptInputModelSelectItem key={model.value} value={model.value} data-testid="model-option">
                      {model.name}
                    </PromptInputModelSelectItem>
                  ))}
                </PromptInputModelSelectContent>
              </PromptInputModelSelect>
            </PromptInputTools>
            <PromptInputSubmit disabled={!input} data-testid="chat-submit" />
          </PromptInputToolbar>
        </PromptInput>
      </div>

      <AuthorizationModal
        request={pendingApproval}
        onApprove={() => approveToolCall(true)}
        onDeny={() => approveToolCall(false)}
      />
    </div>
  );
};

export default ChatBot;