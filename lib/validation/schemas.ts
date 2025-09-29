/**
 * Input validation schemas using Zod
 * Prevents injection attacks and ensures data integrity
 */

import { z } from 'zod';

// Chat request validation
export const chatRequestSchema = z.object({
  messages: z.array(
    z.object({
      role: z.enum(['user', 'assistant', 'system']),
      content: z.union([
        z.string().min(1, 'Message content cannot be empty').max(10000, 'Message too long'),
        z.array(z.string())
      ])
    })
  ).min(1, 'At least one message required').max(50, 'Too many messages in conversation'),

  model: z.string().optional().refine(
    (val) => !val || /^[a-zA-Z0-9_-]+$/.test(val),
    'Model name contains invalid characters'
  ),

  webSearch: z.boolean().optional()
});

// File upload validation
export const uploadRequestSchema = z.object({
  files: z.array(z.instanceof(File))
    .min(1, 'At least one file required')
    .max(10, 'Maximum 10 files allowed')
    .refine(
      (files) => files.every(file => file.size <= 40 * 1024 * 1024),
      'All files must be smaller than 40MB'
    )
    .refine(
      (files) => files.every(file =>
        ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/tiff', 'image/bmp']
          .includes(file.type)
      ),
      'Unsupported file format. Only PDF, JPEG, PNG, TIFF, BMP allowed'
    )
    .refine(
      (files) => files.every(file =>
        file.name.length <= 255 && /^[a-zA-Z0-9\s._-]+$/.test(file.name)
      ),
      'Invalid filename. Only letters, numbers, spaces, dots, underscores, hyphens allowed'
    )
});

// Environment configuration validation (Fix 8: Remove external service backdoor)
export const envConfigSchema = z.object({
  OPENAI_API_KEY: z.string().min(1, 'OpenAI API key is required'),
  OPENAI_MODEL: z.string().optional().default('gpt-4o'),
  // Fix 8: MCP_SERVER_URL now requires explicit configuration (no hardcoded default)
  MCP_SERVER_URL: z.string().url().optional().refine(
    (url) => {
      if (!url) return true; // Allow undefined

      // Basic security validation
      try {
        const urlObj = new URL(url);

        // Require HTTPS in production
        if (process.env.NODE_ENV === 'production' && urlObj.protocol !== 'https:') {
          return false;
        }

        // Block obvious unsafe URLs
        const unsafeDomains = ['localhost', '127.0.0.1', 'example.com', 'test.com'];
        if (process.env.NODE_ENV === 'production' && unsafeDomains.includes(urlObj.hostname)) {
          return false;
        }

        return true;
      } catch {
        return false;
      }
    },
    'MCP_SERVER_URL must be a valid HTTPS URL (in production) and not use unsafe domains'
  ),
  OPENAI_CONTENT_LIMIT: z.coerce.number().positive().optional().default(10000),
  PROCESSING_TIMEOUT_MS: z.coerce.number().positive().optional().default(300000),
  MAX_CONCURRENT_FILES: z.coerce.number().min(1).max(10).optional().default(3),
  // Fix 8: Additional security configuration options
  EXTERNAL_SERVICES_ENABLED: z.string().optional().default('true').transform(val => val === 'true'),
  ALLOWED_EXTERNAL_DOMAINS: z.string().optional()
});

// Tool approval validation
export const toolApprovalSchema = z.object({
  approved: z.boolean(),
  responseId: z.string().optional(),
  toolCallId: z.string().optional()
});

// Generic error response schema
export const errorResponseSchema = z.object({
  success: z.literal(false),
  error: z.string(),
  details: z.array(z.any()).optional(),
  requestId: z.string().optional(),
  timestamp: z.string().optional()
});

// Success response schema
export const successResponseSchema = z.object({
  success: z.literal(true),
  data: z.any().optional(),
  requestId: z.string().optional(),
  timestamp: z.string().optional()
});

// Export type inferences for TypeScript
export type ChatRequest = z.infer<typeof chatRequestSchema>;
export type UploadRequest = z.infer<typeof uploadRequestSchema>;
export type EnvConfig = z.infer<typeof envConfigSchema>;
export type ToolApprovalRequest = z.infer<typeof toolApprovalSchema>;
export type ErrorResponse = z.infer<typeof errorResponseSchema>;
export type SuccessResponse = z.infer<typeof successResponseSchema>;