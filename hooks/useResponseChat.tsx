import { useState, useCallback, useRef } from 'react';
import { createResponseStreamParser, ParsedStreamEvent } from '../lib/openai/response-stream';

export interface MessagePart {
  type: 'text' | 'reasoning' | 'tool-call' | 'tool-result' | 'source-url';
  text?: string;
  id?: string;
  name?: string;
  state?: string;
  arguments?: string;
  output?: string;
  url?: string;
}

export interface ResponseMessage {
  id: string;
  role: 'user' | 'assistant';
  parts: MessagePart[];
  content?: string;
}

export type ChatStatus = 'idle' | 'submitted' | 'streaming' | 'error';

export interface UseResponseChatOptions {
  initialMessages?: ResponseMessage[];
  api?: string;
  onFinish?: (message: ResponseMessage) => void;
  onError?: (error: Error) => void;
}

export interface ToolApprovalRequest {
  id: string;
  tool: string;
  args: Record<string, unknown>;
  description?: string;
  responseId: string;
}

/**
 * Creates a standardized user message object with timestamp-based ID
 * Used when sending user input to the chat API
 */
const createUserMessage = (text: string): ResponseMessage => ({
  id: `user-${Date.now()}`,
  role: 'user',
  parts: [{ type: 'text', text }],
  content: text,
});

/**
 * Creates an empty assistant message object to be populated during streaming
 * Acts as a container for incoming AI response parts (text, reasoning, tool calls)
 */
const createAssistantMessage = (): ResponseMessage => ({
  id: `assistant-${Date.now()}`,
  role: 'assistant',
  parts: [],
  content: '',
});

/**
 * Transforms message history into the API payload format
 * Extracts content text from complex message parts and applies model/search options
 */
const prepareRequestPayload = (
  messages: ResponseMessage[],
  userMessage: ResponseMessage,
  options?: { body?: { model?: string; webSearch?: boolean } }
) => ({
  messages: [...messages, userMessage].map(msg => ({
    role: msg.role,
    content: msg.content || msg.parts.find(p => p.type === 'text')?.text || '',
  })),
  model: options?.body?.model || 'gpt-4o',
  webSearch: options?.body?.webSearch || false,
});

/**
 * Processes AI reasoning events from the stream
 * Either appends to existing reasoning part or creates new reasoning part at the start
 * Reasoning shows the AI's internal thought process before generating responses
 */
const handleReasoningEvent = (
  event: ParsedStreamEvent,
  assistantMessage: ResponseMessage,
  setMessages: React.Dispatch<React.SetStateAction<ResponseMessage[]>>
) => {
  if (event.type !== 'reasoning') return;
  
  setMessages(prev => prev.map(msg => {
    if (msg.id === assistantMessage.id) {
      const existingReasoningIndex = msg.parts.findIndex(p => p.type === 'reasoning');
      if (existingReasoningIndex >= 0) {
        const updatedParts = [...msg.parts];
        updatedParts[existingReasoningIndex] = {
          ...updatedParts[existingReasoningIndex],
          text: (updatedParts[existingReasoningIndex].text || '') + event.text,
        };
        return { ...msg, parts: updatedParts };
      } else {
        return {
          ...msg,
          parts: [{ type: 'reasoning', text: event.text }, ...msg.parts],
        };
      }
    }
    return msg;
  }));
};

/**
 * Processes content (text) events from the stream
 * Incrementally builds the final response text by appending chunks
 * Updates both the message parts and the main content field for display
 */
const handleContentEvent = (
  event: ParsedStreamEvent,
  assistantMessage: ResponseMessage,
  setMessages: React.Dispatch<React.SetStateAction<ResponseMessage[]>>
) => {
  if (event.type !== 'content') return;
  
  setMessages(prev => prev.map(msg => {
    if (msg.id === assistantMessage.id) {
      const existingTextIndex = msg.parts.findIndex(p => p.type === 'text');
      if (existingTextIndex >= 0) {
        const updatedParts = [...msg.parts];
        updatedParts[existingTextIndex] = {
          ...updatedParts[existingTextIndex],
          text: (updatedParts[existingTextIndex].text || '') + event.text,
        };
        return {
          ...msg,
          parts: updatedParts,
          content: (msg.content || '') + event.text,
        };
      } else {
        return {
          ...msg,
          parts: [...msg.parts, { type: 'text', text: event.text }],
          content: (msg.content || '') + event.text,
        };
      }
    }
    return msg;
  }));
};

/**
 * Processes tool call events when AI wants to execute functions
 * Tracks tool execution state (streaming, completed, failed, requires_approval)
 * Either updates existing tool call or creates new one with arguments
 */
const handleToolCallEvent = (
  event: ParsedStreamEvent,
  assistantMessage: ResponseMessage,
  setMessages: React.Dispatch<React.SetStateAction<ResponseMessage[]>>
) => {
  if (event.type !== 'tool_call') return;
  
  setMessages(prev => prev.map(msg => {
    if (msg.id === assistantMessage.id) {
      const existingToolIndex = msg.parts.findIndex(p => p.type === 'tool-call' && p.id === event.id);
      const toolPart: MessagePart = {
        type: 'tool-call',
        id: event.id,
        name: event.name,
        state: event.state,
        text: event.arguments || '',
      };

      if (existingToolIndex >= 0) {
        const updatedParts = [...msg.parts];
        updatedParts[existingToolIndex] = {
          ...updatedParts[existingToolIndex],
          ...toolPart,
          text: (updatedParts[existingToolIndex].text || '') + (event.arguments || ''),
        };
        return { ...msg, parts: updatedParts };
      } else {
        return { ...msg, parts: [...msg.parts, toolPart] };
      }
    }
    return msg;
  }));
};

/**
 * Processes tool execution results from completed function calls
 * Appends the output/result as a new message part to show what the tool returned
 */
const handleToolResultEvent = (
  event: ParsedStreamEvent,
  assistantMessage: ResponseMessage,
  setMessages: React.Dispatch<React.SetStateAction<ResponseMessage[]>>
) => {
  if (event.type !== 'tool_result') return;
  
  setMessages(prev => prev.map(msg => {
    if (msg.id === assistantMessage.id) {
      return {
        ...msg,
        parts: [...msg.parts, {
          type: 'tool-result',
          id: event.id,
          text: event.output,
          output: event.output,
        }],
      };
    }
    return msg;
  }));
};

/**
 * Manages the streaming response lifecycle from the chat API
 * Reads response chunks, decodes them, parses events, and delegates to event handlers
 * Continues until stream is complete, handling any parsing errors gracefully
 */
const processStreamResponse = async (
  response: Response,
  parser: ReturnType<typeof createResponseStreamParser>,
  onStreamEvent: (event: ParsedStreamEvent) => Promise<void>
) => {
  const reader = response.body?.getReader();
  const decoder = new TextDecoder();

  if (!reader) {
    throw new Error('No response body reader available');
  }

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value, { stream: true });
    const events = parser.parse(chunk);

    for (const event of events) {
      await onStreamEvent(event);
    }
  }
};

/**
 * React hook for managing streaming chat conversations with AI assistants
 * 
 * Handles the complete chat lifecycle:
 * - Sends messages to chat API with streaming support
 * - Processes different types of stream events (content, reasoning, tool calls)
 * - Manages conversation state and status tracking
 * - Supports tool approval workflow for sensitive operations
 * - Provides abort capabilities for ongoing requests
 * 
 * @param initialMessages - Starting conversation history
 * @param api - Chat API endpoint (defaults to '/api/chat')
 * @param onFinish - Callback when assistant response is complete
 * @param onError - Callback for handling errors
 * @returns Chat state and control functions
 */
export function useResponseChat({
  initialMessages = [],
  api = '/api/chat',
  onFinish,
  onError,
}: UseResponseChatOptions = {}) {
  const [messages, setMessages] = useState<ResponseMessage[]>(initialMessages);
  const [status, setStatus] = useState<ChatStatus>('idle');
  const [pendingApproval, setPendingApproval] = useState<ToolApprovalRequest | null>(null);
  
  const abortControllerRef = useRef<AbortController | null>(null);
  const currentResponseIdRef = useRef<string | null>(null);
  const parserRef = useRef(createResponseStreamParser());

  /**
   * Sends a message to the AI and handles the streaming response
   * 
   * Process flow:
   * 1. Creates user message and adds to conversation
   * 2. Makes streaming API request with conversation history
   * 3. Processes incoming stream events (content, reasoning, tools)
   * 4. Updates message state incrementally as response streams in
   * 5. Handles errors and cleanup
   */
  const sendMessage = useCallback(async (
    message: { text: string }, 
    options?: { body?: { model?: string; webSearch?: boolean } }
  ) => {
    if (status === 'streaming') return;

    // Create messages
    const userMessage = createUserMessage(message.text);
    const assistantMessage = createAssistantMessage();

    // Update state
    setMessages(prev => [...prev, userMessage]);
    setStatus('submitted');

    try {
      // Setup request
      abortControllerRef.current = new AbortController();
      parserRef.current.reset();

      // Make API call
      const response = await fetch(api, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(prepareRequestPayload(messages, userMessage, options)),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // Start streaming
      setStatus('streaming');
      setMessages(prev => [...prev, assistantMessage]);

      // Process stream response
      await processStreamResponse(
        response,
        parserRef.current,
        (event) => handleStreamEvent(event, assistantMessage)
      );

      setStatus('idle');
      onFinish?.(assistantMessage);

    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        setStatus('idle');
        return;
      }

      setStatus('error');
      console.error('Chat error:', error);
      onError?.(error instanceof Error ? error : new Error('Unknown error'));
    } finally {
      abortControllerRef.current = null;
      currentResponseIdRef.current = null;
    }
  }, [messages, status, api, onFinish, onError]);

  /**
   * Central event dispatcher for all streaming response events
   * Routes different event types to their specialized handlers
   * Also handles meta-events like errors, completion, and tool approval requests
   */
  const handleStreamEvent = useCallback(async (
    event: ParsedStreamEvent, 
    assistantMessage: ResponseMessage
  ) => {
    switch (event.type) {
      case 'reasoning':
        handleReasoningEvent(event, assistantMessage, setMessages);
        break;

      case 'content':
        handleContentEvent(event, assistantMessage, setMessages);
        break;

      case 'tool_call':
        handleToolCallEvent(event, assistantMessage, setMessages);
        break;

      case 'tool_result':
        handleToolResultEvent(event, assistantMessage, setMessages);
        break;

      case 'tool_approval_request':
        setPendingApproval({
          ...event,
          responseId: currentResponseIdRef.current || '',
        });
        break;

      case 'error':
        console.error('Stream error:', event.error);
        setStatus('error');
        onError?.(new Error(event.error));
        break;

      case 'done':
        setStatus('idle');
        break;
    }
  }, [onError]);

  /**
   * Handles user approval/rejection of sensitive tool calls
   * Sends approval decision back to the API to continue or halt tool execution
   */
  const approveToolCall = useCallback(async (approved: boolean) => {
    if (!pendingApproval) return;

    try {
      await fetch(api, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          responseId: pendingApproval.responseId,
          toolCallId: pendingApproval.id,
          approved,
        }),
      });

      setPendingApproval(null);
    } catch (error) {
      console.error('Tool approval error:', error);
      onError?.(error instanceof Error ? error : new Error('Tool approval failed'));
    }
  }, [pendingApproval, api, onError]);

  /**
   * Aborts any ongoing streaming request and resets status to idle
   * Used to cancel long-running responses or when component unmounts
   */
  const stop = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setStatus('idle');
    }
  }, []);

  return {
    messages,
    status,
    sendMessage,
    stop,
    pendingApproval,
    approveToolCall,
  };
}