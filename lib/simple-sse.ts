/**
 * Simple Server-Sent Events parser
 * Replaces 220 lines of complex event parsing with 25 lines that work
 */

export interface SSEChunk {
  content?: string;
  done?: boolean;
  error?: string;
}

/**
 * Parse SSE data from a single line
 * No complex event routing, no legacy format support, no enterprise theater
 */
export function parseSSELine(line: string): SSEChunk | null {
  if (!line.startsWith('data: ')) return null;

  const data = line.slice(6).trim();
  if (data === '[DONE]') return { done: true };

  try {
    const chunk = JSON.parse(data);

    // Extract content from various OpenAI response formats
    let content = '';
    if (chunk.content) {
      content = chunk.content;
    } else if (chunk.output?.content) {
      content = chunk.output.content;
    } else if (chunk.delta?.content) {
      content = chunk.delta.content;
    } else if (chunk.text) {
      content = chunk.text;
    }

    if (content) {
      return { content };
    }

    // Handle errors
    if (chunk.error) {
      return { error: chunk.error };
    }

    return null;
  } catch (error) {
    console.warn('Failed to parse SSE chunk:', error);
    return null;
  }
}

/**
 * Process buffer of SSE data and extract chunks
 */
export function parseSSEBuffer(buffer: string): { chunks: SSEChunk[]; remainingBuffer: string } {
  const lines = buffer.split('\n');
  const remainingBuffer = lines.pop() || ''; // Keep incomplete line
  const chunks: SSEChunk[] = [];

  for (const line of lines) {
    const chunk = parseSSELine(line);
    if (chunk) {
      chunks.push(chunk);
    }
  }

  return { chunks, remainingBuffer };
}