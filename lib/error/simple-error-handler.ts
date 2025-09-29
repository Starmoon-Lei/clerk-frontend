/**
 * Simple Error Handler - 10-Year Engineer Approach
 *
 * REPLACES 4 over-engineered systems with one that actually works:
 * ❌ openai-error-handler.ts (418 lines of complexity)
 * ❌ centralized-error-handler.ts (50+ error codes)
 * ❌ consolidated-error-service.ts (circuit breakers for a small app)
 * ❌ production-error-handler.ts (over-classified everything)
 *
 * ✅ Solves actual problems:
 * - Handle OpenAI API errors with user-friendly messages
 * - Simple retry logic for rate limits
 * - Basic logging for debugging
 * - Clean API responses
 */

import { NextResponse } from 'next/server';

export interface SimpleErrorResult {
  success: false;
  error: string;
  userMessage: string;
  shouldRetry?: boolean;
  retryAfter?: number;
}

/**
 * Handle DynamoDB errors - database operation failures
 */
export function handleDynamoDBError(error: unknown): SimpleErrorResult {
  const errorObj = error && typeof error === 'object' ? error as Record<string, unknown> : {};
  const errorName = typeof errorObj?.name === 'string' ? errorObj.name : '';
  const message = typeof errorObj?.message === 'string' ? errorObj.message : 'Database error';

  console.error('DynamoDB Error:', { name: errorName, message, error });

  switch (errorName) {
    case 'ResourceNotFoundException':
      return {
        success: false,
        error: 'Table not found',
        userMessage: 'Database table not found. Please contact support.',
        shouldRetry: false
      };

    case 'ConditionalCheckFailedException':
      return {
        success: false,
        error: 'Conditional check failed',
        userMessage: 'Data was modified by another process. Please try again.',
        shouldRetry: true,
        retryAfter: 1000
      };

    case 'ProvisionedThroughputExceededException':
    case 'ThrottlingException':
      return {
        success: false,
        error: 'Database throttled',
        userMessage: 'Service is busy. Please wait a moment and try again.',
        shouldRetry: true,
        retryAfter: 5000
      };

    case 'ValidationException':
      return {
        success: false,
        error: 'Invalid request',
        userMessage: 'Invalid data format. Please check your input.',
        shouldRetry: false
      };

    case 'UnauthorizedException':
    case 'AccessDeniedException':
      return {
        success: false,
        error: 'Database access denied',
        userMessage: 'Authentication failed. Please sign in again.',
        shouldRetry: false
      };

    default:
      return {
        success: false,
        error: message,
        userMessage: 'Database operation failed. Please try again or contact support.',
        shouldRetry: true,
        retryAfter: 3000
      };
  }
}

/**
 * Handle authentication errors - session and auth failures
 */
export function handleAuthError(error: unknown): SimpleErrorResult {
  const errorObj = error && typeof error === 'object' ? error as Record<string, unknown> : {};
  const message = typeof errorObj?.message === 'string' ? errorObj.message : 'Authentication error';

  console.error('Auth Error:', { message, error });

  if (message.includes('session') || message.includes('expired')) {
    return {
      success: false,
      error: 'Session expired',
      userMessage: 'Your session has expired. Please sign in again.',
      shouldRetry: false
    };
  }

  if (message.includes('token') || message.includes('invalid')) {
    return {
      success: false,
      error: 'Invalid token',
      userMessage: 'Authentication token is invalid. Please sign in again.',
      shouldRetry: false
    };
  }

  return {
    success: false,
    error: message,
    userMessage: 'Authentication failed. Please sign in again.',
    shouldRetry: false
  };
}

/**
 * Handle validation errors - input validation failures
 */
export function handleValidationError(error: unknown): SimpleErrorResult {
  const errorObj = error && typeof error === 'object' ? error as Record<string, unknown> : {};
  const message = typeof errorObj?.message === 'string' ? errorObj.message : 'Validation error';

  console.error('Validation Error:', { message, error });

  return {
    success: false,
    error: 'Validation failed',
    userMessage: 'Invalid input data. Please check your information and try again.',
    shouldRetry: false
  };
}

/**
 * Handle OpenAI API errors - covers 90% of real error scenarios
 */
export function handleOpenAIError(error: unknown): SimpleErrorResult {
  // Fix 8: Safe type validation instead of unsafe coercion
  const errorObj = error && typeof error === 'object' ? error as Record<string, unknown> : {};

  // Safely validate and extract status with proper type checking
  const status = (() => {
    const statusValue = errorObj?.status;
    const codeValue = errorObj?.code;

    if (typeof statusValue === 'number' && Number.isInteger(statusValue)) {
      return statusValue;
    }
    if (typeof codeValue === 'number' && Number.isInteger(codeValue)) {
      return codeValue;
    }
    return 500; // Default fallback
  })();

  // Safely validate and extract message
  const message = (() => {
    const messageValue = errorObj?.message;
    if (typeof messageValue === 'string' && messageValue.trim().length > 0) {
      return messageValue;
    }
    return 'Unknown error'; // Default fallback
  })();

  console.error('OpenAI Error:', { status, message, error });

  switch (status) {
    case 429:
      return {
        success: false,
        error: 'Rate limit exceeded',
        userMessage: 'Too many requests. Please wait 30 seconds and try again.',
        shouldRetry: true,
        retryAfter: 30000
      };

    case 413:
      return {
        success: false,
        error: 'File too large',
        userMessage: 'File is too large. Please upload a file smaller than 40MB.',
        shouldRetry: false
      };

    case 401:
    case 403:
      return {
        success: false,
        error: 'Authentication error',
        userMessage: 'Authentication issue. Please refresh the page and try again.',
        shouldRetry: false
      };

    case 404:
      return {
        success: false,
        error: 'Resource not found',
        userMessage: 'The file or resource was not found. It may have been deleted.',
        shouldRetry: false
      };

    case 500:
    case 502:
    case 503:
    case 504:
      return {
        success: false,
        error: 'Server error',
        userMessage: 'OpenAI services are temporarily unavailable. Please try again in a few minutes.',
        shouldRetry: true,
        retryAfter: 120000
      };

    default:
      return {
        success: false,
        error: message || 'Unknown error',
        userMessage: 'Something went wrong. Please try again or contact support.',
        shouldRetry: false
      };
  }
}

/**
 * Simple retry wrapper - handles the 80% case of "just retry 3 times"
 */
export async function withSimpleRetry<T>(
  operation: () => Promise<T>,
  context: string,
  maxAttempts: number = 3
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      const errorResult = handleError(error, context);

      console.log(`${context} failed (attempt ${attempt}/${maxAttempts}):`, errorResult.error);

      // Don't retry if error says not to
      if (!errorResult.shouldRetry || attempt === maxAttempts) {
        throw error;
      }

      // Simple exponential backoff
      const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

/**
 * Centralized error handler - routes to appropriate specialized handler
 */
export function handleError(error: unknown, context?: string): SimpleErrorResult {
  const errorObj = error && typeof error === 'object' ? error as Record<string, unknown> : {};
  const errorName = typeof errorObj?.name === 'string' ? errorObj.name : '';
  const message = typeof errorObj?.message === 'string' ? errorObj.message : '';

  // Route to appropriate specialized handler based on error characteristics
  if (errorName.includes('DynamoDB') || errorName.includes('ResourceNotFound') ||
      errorName.includes('ConditionalCheck') || errorName.includes('ProvisionedThroughput') ||
      errorName.includes('Throttling') || errorName.includes('Validation') ||
      errorName.includes('Unauthorized') || errorName.includes('AccessDenied')) {
    return handleDynamoDBError(error);
  }

  if (message.includes('authentication') || message.includes('session') ||
      message.includes('token') || message.includes('unauthorized') ||
      context?.includes('auth') || context?.includes('session')) {
    return handleAuthError(error);
  }

  if (errorName.includes('ZodError') || message.includes('validation') ||
      message.includes('invalid input') || context?.includes('validation')) {
    return handleValidationError(error);
  }

  // Check for OpenAI-specific errors
  const status = typeof errorObj?.status === 'number' ? errorObj.status :
                 typeof errorObj?.code === 'number' ? errorObj.code : null;

  if (status && status >= 400 && status < 600) {
    return handleOpenAIError(error);
  }

  // Default fallback for unknown errors
  console.error('Unhandled Error:', { error, context, name: errorName, message });

  return {
    success: false,
    error: message || 'Unknown error',
    userMessage: 'Something went wrong. Please try again or contact support.',
    shouldRetry: false
  };
}

/**
 * Handle API route errors - clean responses for users
 */
export function handleApiRouteError(
  error: unknown,
  endpoint: string,
  userId?: string,
  requestId?: string
): NextResponse {
  const errorResult = handleError(error, `api:${endpoint}`);

  console.error(`API Error [${endpoint}]`, {
    userId,
    requestId,
    error: errorResult.error,
    timestamp: new Date().toISOString()
  });

  return NextResponse.json({
    success: false,
    error: errorResult.userMessage,
    requestId,
    timestamp: new Date().toISOString()
  }, {
    status: getHttpStatus(error)
  });
}

/**
 * Get appropriate HTTP status from error - Fix 8: Safe type validation
 */
function getHttpStatus(error: unknown): number {
  // Fix 8: Safe type validation instead of unsafe coercion
  const errorObj = error && typeof error === 'object' ? error as Record<string, unknown> : {};

  // Safely validate status with proper type checking
  const status = (() => {
    const statusValue = errorObj?.status;
    const codeValue = errorObj?.code;

    if (typeof statusValue === 'number' && Number.isInteger(statusValue) && statusValue >= 400 && statusValue < 600) {
      return statusValue;
    }
    if (typeof codeValue === 'number' && Number.isInteger(codeValue) && codeValue >= 400 && codeValue < 600) {
      return codeValue;
    }
    return 500; // Default to server error
  })();

  return status;
}

/**
 * Simple error logging - just what we need for debugging
 */
export function logError(
  message: string,
  error: unknown,
  context?: { userId?: string; operation?: string; [key: string]: unknown }
): void {
  const errorObj = error as Record<string, unknown>;
  console.error(message, {
    error: (errorObj?.message as string) || error,
    stack: errorObj?.stack as string,
    timestamp: new Date().toISOString(),
    ...context
  });
}

/**
 * Get user-friendly error message - the most important function
 */
export function getUserFriendlyMessage(error: unknown, context?: string): string {
  return handleError(error, context).userMessage;
}