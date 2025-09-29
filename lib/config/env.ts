/**
 * Simple Environment Configuration
 * Replaces 152 lines of over-engineering with 30 lines of working code
 */

// Validate required environment variables at startup
function validateRequiredEnvVars(): void {
  const required = [
    'OPENAI_API_KEY',
    'AWS_REGION',
    'AWS_ACCESS_KEY_ID',
    'AWS_SECRET_ACCESS_KEY'
  ];

  const missing = required.filter(key => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}

// Validate once at module load (fail-fast approach)
validateRequiredEnvVars();

// Simple exports with defaults - direct access, no function call overhead
export const OPENAI_API_KEY = process.env.OPENAI_API_KEY!;
export const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o';
export const MCP_SERVER_URL = process.env.MCP_SERVER_URL;
export const OPENAI_CONTENT_LIMIT = parseInt(process.env.OPENAI_CONTENT_LIMIT || '10000');
export const PROCESSING_TIMEOUT_MS = parseInt(process.env.PROCESSING_TIMEOUT_MS || '300000');
export const MAX_CONCURRENT_FILES = parseInt(process.env.MAX_CONCURRENT_FILES || '3');
export const EXTERNAL_SERVICES_ENABLED = process.env.EXTERNAL_SERVICES_ENABLED !== 'false';
export const ALLOWED_EXTERNAL_DOMAINS = process.env.ALLOWED_EXTERNAL_DOMAINS;

// Environment detection
export const isDevelopment = process.env.NODE_ENV === 'development';
export const isProduction = process.env.NODE_ENV === 'production';
export const isTesting = process.env.NODE_ENV === 'test';

// Legacy compatibility object (for gradual migration)
export const env = {
  openaiApiKey: OPENAI_API_KEY,
  openaiModel: OPENAI_MODEL,
  mcpServerUrl: MCP_SERVER_URL,
  contentLimit: OPENAI_CONTENT_LIMIT,
  processingTimeoutMs: PROCESSING_TIMEOUT_MS,
  maxConcurrentFiles: MAX_CONCURRENT_FILES,
  externalServicesEnabled: EXTERNAL_SERVICES_ENABLED,
  allowedExternalDomains: ALLOWED_EXTERNAL_DOMAINS,
};