export interface StreamEvent {
  type: 'reasoning' | 'content' | 'tool_call' | 'tool_result' | 'tool_approval_request' | 'done' | 'error';
  data: unknown;
}

export interface ReasoningEvent {
  type: 'reasoning';
  text: string;
  reasoning_item_id?: string;
}

export interface ContentEvent {
  type: 'content';
  text: string;
  delta?: boolean;
}

export interface ToolCallEvent {
  type: 'tool_call';
  id: string;
  name: string;
  state: 'streaming' | 'completed' | 'failed' | 'requires_approval';
  arguments?: string;
}

export interface ToolResultEvent {
  type: 'tool_result';
  id: string;
  output: string;
  error?: string;
}

export interface ToolApprovalRequestEvent {
  type: 'tool_approval_request';
  id: string;
  tool: string;
  args: Record<string, unknown>;
  description?: string;
}

export interface DoneEvent {
  type: 'done';
  usage?: {
    reasoning_tokens?: number;
    output_tokens?: number;
    total_tokens?: number;
  };
}

export interface ErrorEvent {
  type: 'error';
  error: string;
  message?: string;
}

export type ParsedStreamEvent = ReasoningEvent | ContentEvent | ToolCallEvent | ToolResultEvent | ToolApprovalRequestEvent | DoneEvent | ErrorEvent;

export class ResponseStreamParser {
  private buffer = '';
  
  parse(chunk: string): ParsedStreamEvent[] {
    this.buffer += chunk;
    const events: ParsedStreamEvent[] = [];
    
    const lines = this.buffer.split('\n');
    this.buffer = lines.pop() || '';
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed === 'data: [DONE]') continue;
      
      if (trimmed.startsWith('data: ')) {
        try {
          const data = JSON.parse(trimmed.slice(6));
          const event = this.parseEvent(data);
          if (event) events.push(event);
        } catch (error) {
          console.error('Failed to parse SSE data:', error, trimmed);
          events.push({
            type: 'error',
            error: 'Parse error',
            message: `Failed to parse: ${trimmed}`
          });
        }
      }
    }
    
    return events;
  }
  
  private parseEvent(data: unknown): ParsedStreamEvent | null {
    if (!data || typeof data !== 'object') return null;
    
    const eventData = data as Record<string, unknown>;
    
    switch (eventData.type) {
      // OpenAI Response API format - Content events
      case 'response.output_text.delta':
        return {
          type: 'content',
          text: String(eventData.delta || ''),
          delta: true
        };
        
      case 'response.output_text.done':
        return {
          type: 'done'
        };
        
      // OpenAI Response API format - Reasoning events
      case 'response.reasoning':
        return {
          type: 'reasoning',
          text: String(eventData.text || ''),
          reasoning_item_id: eventData.reasoning_item_id as string | undefined
        };
        
      // OpenAI Response API format - Tool events
      case 'response.mcp_tool_call':
        return {
          type: 'tool_call',
          id: String(eventData.id || ''),
          name: String(eventData.name || ''),
          state: 'streaming',
          arguments: String(eventData.arguments || '')
        };
        
      case 'response.mcp_tool_result':
        return {
          type: 'tool_result',
          id: String(eventData.id || ''),
          output: String(eventData.output || ''),
          error: eventData.error as string | undefined
        };
        
      // OpenAI Response API format - Meta events (ignore these)
      case 'response.created':
      case 'response.in_progress':
      case 'response.output_item.added':
      case 'response.output_item.done':
      case 'response.content_part.added':
      case 'response.content_part.done':
      case 'response.mcp_list_tools.in_progress':
      case 'response.mcp_list_tools.completed':
      case 'response.completed':
        return null;
        
      // Legacy event format
      case 'reasoning':
        return {
          type: 'reasoning',
          text: String(eventData.text || ''),
          reasoning_item_id: eventData.reasoning_item_id as string | undefined
        };
        
      case 'content':
        return {
          type: 'content',
          text: String(eventData.text || ''),
          delta: eventData.delta as boolean | undefined
        };
        
      case 'tool_call':
        const functionData = eventData.function as Record<string, unknown> | undefined;
        return {
          type: 'tool_call',
          id: String(eventData.id),
          name: String(eventData.name || functionData?.name || ''),
          state: (eventData.state as 'completed' | 'streaming' | 'failed' | 'requires_approval') || 'streaming',
          arguments: String(eventData.arguments || functionData?.arguments || '')
        };
        
      case 'tool_result':
        return {
          type: 'tool_result',
          id: String(eventData.id),
          output: String(eventData.output || eventData.result || ''),
          error: eventData.error as string | undefined
        };
        
      case 'tool_approval_request':
        return {
          type: 'tool_approval_request',
          id: String(eventData.id),
          tool: String(eventData.tool || eventData.name),
          args: (eventData.args || eventData.arguments || {}) as Record<string, unknown>,
          description: eventData.description as string | undefined
        };
        
      case 'done':
        return {
          type: 'done',
          usage: eventData.usage as {
            reasoning_tokens?: number;
            output_tokens?: number;
            total_tokens?: number;
          } | undefined
        };
        
      case 'error':
        return {
          type: 'error',
          error: String(eventData.error || 'Unknown error'),
          message: eventData.message as string | undefined
        };
        
      default:
        console.warn('Unknown event type:', eventData.type);
        return null;
    }
  }
  
  reset() {
    this.buffer = '';
  }
}

export function createResponseStreamParser(): ResponseStreamParser {
  return new ResponseStreamParser();
}