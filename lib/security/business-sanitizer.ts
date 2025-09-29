/**
 * Business-appropriate data sanitization
 * Focuses on realistic PII in business documents, not payment processing
 */

export interface BusinessSanitizationOptions {
  redactEmails?: boolean;
  preserveStructure?: boolean;
}

const DEFAULT_OPTIONS: BusinessSanitizationOptions = {
  redactEmails: false, // Emails are often needed for business context
  preserveStructure: true,
};

/**
 * Realistic patterns for business document processing
 */
const BUSINESS_SENSITIVE = {
  // Email addresses
  email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,

  // US Tax ID (EIN) - common in business documents
  ein: /\b\d{2}-\d{7}\b/g,

  // Phone numbers with various formats
  phone: /\b(?:\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})\b/g,
} as const;

/**
 * Sanitize business data by redacting only realistic sensitive information
 */
export function sanitizeBusinessData(
  data: unknown,
  options: BusinessSanitizationOptions = {}
): unknown {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  // Handle primitives
  if (typeof data === 'string') {
    return sanitizeText(data, opts);
  }

  if (data === null || data === undefined || typeof data !== 'object') {
    return data;
  }

  // Handle arrays
  if (Array.isArray(data)) {
    return data.map(item => sanitizeBusinessData(item, opts));
  }

  // Handle objects
  const sanitized: Record<string, unknown> = opts.preserveStructure ? {} : {};

  for (const [key, value] of Object.entries(data)) {
    sanitized[key] = sanitizeBusinessData(value, opts);
  }

  return sanitized;
}

/**
 * Sanitize individual text values
 */
function sanitizeText(text: string, options: BusinessSanitizationOptions): string {
  let sanitized = text;

  // Always redact tax IDs (these are definitely sensitive)
  sanitized = sanitized.replace(BUSINESS_SENSITIVE.ein, '[TAX-ID]');

  // Always redact phone numbers (keep format for context)
  sanitized = sanitized.replace(BUSINESS_SENSITIVE.phone, '[PHONE]');

  // Conditionally redact emails
  if (options.redactEmails) {
    sanitized = sanitized.replace(BUSINESS_SENSITIVE.email, (email) => {
      const [username, domain] = email.split('@');
      if (!username || !domain) return '[EMAIL]';

      const maskedUsername = username.length > 2
        ? `${username.charAt(0)}***${username.charAt(username.length - 1)}`
        : '***';

      return `${maskedUsername}@${domain}`;
    });
  }

  return sanitized;
}

/**
 * Check if business data contains sensitive information
 */
export function containsBusinessSensitiveData(data: unknown): {
  hasSensitive: boolean;
  types: string[];
} {
  const types: string[] = [];

  function checkValue(value: unknown): void {
    if (typeof value === 'string') {
      if (BUSINESS_SENSITIVE.ein.test(value)) types.push('Tax ID');
      if (BUSINESS_SENSITIVE.phone.test(value)) types.push('Phone Number');
      if (BUSINESS_SENSITIVE.email.test(value)) types.push('Email');
    } else if (typeof value === 'object' && value !== null) {
      if (Array.isArray(value)) {
        value.forEach(checkValue);
      } else {
        Object.values(value).forEach(checkValue);
      }
    }
  }

  checkValue(data);

  return {
    hasSensitive: types.length > 0,
    types: [...new Set(types)],
  };
}

/**
 * Safe logging helper for business data
 */
export function safeBusinessLog(message: string, data: unknown): void {
  const sanitized = sanitizeBusinessData(data, { redactEmails: true });
  console.log(message, sanitized);
}