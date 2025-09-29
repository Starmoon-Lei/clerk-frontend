/**
 * Simple stream processing utilities
 * Replaces 319 lines of "memory-safe" theater with 30 lines that actually work
 */

/**
 * Simple file content reader using streams
 * No memory pressure monitoring, no chunk overlap, no enterprise theater
 */
export async function readFileStream(file: File, maxSize: number = 50 * 1024 * 1024): Promise<string> {
  if (file.size > maxSize) {
    throw new Error(`File too large: ${Math.round(file.size / 1024 / 1024)}MB > ${Math.round(maxSize / 1024 / 1024)}MB`);
  }

  const reader = file.stream().getReader();
  const decoder = new TextDecoder();
  let content = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      content += decoder.decode(value, { stream: true });
    }
    return content;
  } finally {
    reader.releaseLock();
  }
}

/**
 * Simple response stream reader
 * No memory monitoring, no concurrent process tracking, no garbage collection
 */
export async function readResponseStream(response: Response, maxSize: number = 50 * 1024 * 1024): Promise<string> {
  if (!response.body) {
    throw new Error('No response body to read');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let content = '';
  let totalSize = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      totalSize += value.length;
      if (totalSize > maxSize) {
        throw new Error(`Response too large: ${totalSize} bytes > ${maxSize} bytes`);
      }

      content += decoder.decode(value, { stream: true });
    }
    return content;
  } finally {
    reader.releaseLock();
  }
}

/**
 * Simple check if file can be processed
 * No memory pressure monitoring, no concurrent process limits
 */
export function canProcessFile(fileSize: number, maxSize: number = 50 * 1024 * 1024): { allowed: boolean; reason?: string } {
  if (fileSize > maxSize) {
    return {
      allowed: false,
      reason: `File too large (${Math.round(fileSize / 1024 / 1024)}MB > ${Math.round(maxSize / 1024 / 1024)}MB)`
    };
  }
  return { allowed: true };
}