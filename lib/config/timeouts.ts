/**
 * Centralized timeout configuration
 * Prevents timeout mismatches between frontend and backend
 */

// Base timeout configurations in milliseconds
export const TIMEOUTS = {
  // API route timeouts (must match Next.js maxDuration)
  API: {
    CHAT: 120000, // 2 minutes - reasonable for chat responses
    UPLOAD: 300000, // 5 minutes - for file processing
    AUTH: 30000, // 30 seconds - for authentication
    GENERAL: 60000, // 1 minute - for general API calls
  },

  // Client-side timeouts (should be slightly higher than API timeouts)
  CLIENT: {
    CHAT: 130000, // 2.1 minutes - buffer for chat
    UPLOAD: 320000, // 5.3 minutes - buffer for uploads
    AUTH: 40000, // 40 seconds - buffer for auth
    GENERAL: 70000, // 1.1 minutes - buffer for general
  },

  // Processing timeouts
  PROCESSING: {
    DOCUMENT: 300000, // 6 minutes per document
    FILE_UPLOAD: 240000, // 4 minutes per file
    AI_RESPONSE: 120000, // 2 minutes for AI responses
  },

  // Connection timeouts
  CONNECTION: {
    DATABASE: 10000, // 10 seconds for DB connections
    OPENAI: 30000, // 30 seconds for OpenAI connections
    HTTP: 15000, // 15 seconds for HTTP connections
  }
} as const;

/**
 * Get API timeout in seconds for Next.js maxDuration
 */
export function getApiTimeoutSeconds(apiType: keyof typeof TIMEOUTS.API): number {
  return Math.ceil(TIMEOUTS.API[apiType] / 1000);
}

/**
 * Get client timeout for fetch requests
 */
export function getClientTimeout(apiType: keyof typeof TIMEOUTS.CLIENT): number {
  return TIMEOUTS.CLIENT[apiType];
}

/**
 * Create AbortController with timeout
 */
export function createTimeoutController(timeoutMs: number): {
  controller: AbortController;
  timeoutId: NodeJS.Timeout;
  cleanup: () => void;
} {
  const controller = new AbortController();

  const timeoutId = setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  const cleanup = () => {
    clearTimeout(timeoutId);
  };

  return { controller, timeoutId, cleanup };
}

/**
 * Timeout configurations for different operations
 */
export const OPERATION_TIMEOUTS = {
  // File operations
  SINGLE_FILE_PROCESS: TIMEOUTS.PROCESSING.FILE_UPLOAD,
  BATCH_FILE_PROCESS: TIMEOUTS.API.UPLOAD,

  // Chat operations
  CHAT_MESSAGE: TIMEOUTS.API.CHAT,
  STREAM_RESPONSE: TIMEOUTS.CLIENT.CHAT,

  // Authentication operations
  LOGIN: TIMEOUTS.API.AUTH,
  SESSION_REFRESH: TIMEOUTS.CONNECTION.DATABASE,

  // External services
  OPENAI_REQUEST: TIMEOUTS.CONNECTION.OPENAI,
  DATABASE_QUERY: TIMEOUTS.CONNECTION.DATABASE,
} as const;

/**
 * Validate timeout configuration
 */
export function validateTimeouts(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check that client timeouts are higher than API timeouts
  if (TIMEOUTS.CLIENT.CHAT <= TIMEOUTS.API.CHAT) {
    errors.push('Client chat timeout must be higher than API chat timeout');
  }

  if (TIMEOUTS.CLIENT.UPLOAD <= TIMEOUTS.API.UPLOAD) {
    errors.push('Client upload timeout must be higher than API upload timeout');
  }

  if (TIMEOUTS.CLIENT.AUTH <= TIMEOUTS.API.AUTH) {
    errors.push('Client auth timeout must be higher than API auth timeout');
  }

  // Check reasonable minimum timeouts
  if (TIMEOUTS.API.CHAT < 30000) {
    errors.push('Chat API timeout too low (minimum 30 seconds)');
  }

  if (TIMEOUTS.API.UPLOAD < 60000) {
    errors.push('Upload API timeout too low (minimum 60 seconds)');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Log timeout configuration for debugging
 */
export function logTimeoutConfig(): void {
  console.log('🕒 Timeout Configuration:', {
    api: Object.entries(TIMEOUTS.API).map(([key, value]) =>
      `${key}: ${value / 1000}s`
    ),
    client: Object.entries(TIMEOUTS.CLIENT).map(([key, value]) =>
      `${key}: ${value / 1000}s`
    ),
    validation: validateTimeouts()
  });
}