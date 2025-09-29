/**
 * Simple OpenAI Client - 20 lines vs 259 lines of over-engineering
 * Uses OpenAI SDK's built-in connection pooling, retries, and rate limiting
 */

import OpenAI from 'openai';
import { OPENAI_API_KEY } from '../config/env';

// Simple cached client instance
let openaiClient: OpenAI | null = null;

function createOpenAIClient(): OpenAI {
  if (!OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY environment variable is required');
  }

  return new OpenAI({
    apiKey: OPENAI_API_KEY,
    timeout: 30000, // 30 seconds
    maxRetries: 3,
  });
}

/**
 * Get OpenAI client with lazy initialization
 */
export function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    openaiClient = createOpenAIClient();
  }
  return openaiClient;
}

/**
 * Legacy interface for backward compatibility
 * Replaces complex SafeOpenAIClient with simple wrapper
 */
export class SimpleOpenAIClient {
  private client: OpenAI;

  constructor() {
    this.client = getOpenAIClient();
  }

  /**
   * Execute OpenAI operation - maintains same interface as SafeOpenAIClient
   */
  async execute<T>(operation: (client: OpenAI) => Promise<T>): Promise<T> {
    return await operation(this.client);
  }
}

// Singleton instance for backward compatibility
let simpleClientInstance: SimpleOpenAIClient | null = null;

export function getSafeOpenAIClient(): SimpleOpenAIClient {
  if (!simpleClientInstance) {
    simpleClientInstance = new SimpleOpenAIClient();
  }
  return simpleClientInstance;
}

/**
 * Reset client instance (useful for testing)
 */
export function resetOpenAIClient(): void {
  openaiClient = null;
  simpleClientInstance = null;
}