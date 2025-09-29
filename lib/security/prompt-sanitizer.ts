/**
 * Secure prompt builder and sanitizer
 * Prevents prompt injection attacks and unauthorized instructions
 */

/**
 * Sanitize user input for safe inclusion in AI prompts
 */
export function sanitizeUserInput(input: string): string {
  if (!input || typeof input !== 'string') {
    return '';
  }

  // Remove potential injection markers and commands
  const sanitized = input
    // Remove common prompt injection markers
    .replace(/\b(ignore|forget|disregard|override)\s+(previous|above|all)\s+(instructions?|prompts?|rules?)/gi, '[FILTERED]')
    .replace(/\b(system|assistant|user):\s*/gi, '[FILTERED]')
    .replace(/\b(act\s+as|pretend\s+to\s+be|role\s*play|simulate)/gi, '[FILTERED]')

    // Remove injection attempt patterns
    .replace(/\b(now\s+you\s+are|from\s+now\s+on)/gi, '[FILTERED]')
    .replace(/\b(instead\s+of|rather\s+than)/gi, '[FILTERED]')
    .replace(/\b(new\s+instructions?|updated\s+instructions?)/gi, '[FILTERED]')

    // Remove potential code execution
    .replace(/```[\s\S]*?```/g, '[CODE_BLOCK_FILTERED]')
    .replace(/`[^`]*`/g, '[CODE_FILTERED]')

    // Remove excessive whitespace and newlines that could be used for injection
    .replace(/\s{2,}/g, ' ')
    .replace(/\n{2,}/g, '\n')

    // Trim and limit length
    .trim()
    .substring(0, 100); // Limit user context to 100 chars

  return sanitized;
}

/**
 * Validate user ID format (should be UUID or similar safe format)
 */
export function validateUserId(userId: string): boolean {
  if (!userId || typeof userId !== 'string') {
    return false;
  }

  // UUID format validation (most auth systems use UUIDs)
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  // Alternative formats (adjust based on your auth system)
  const alphanumericRegex = /^[a-zA-Z0-9_-]{8,64}$/;

  return uuidRegex.test(userId) || alphanumericRegex.test(userId);
}

/**
 * Create safe user context for AI prompts
 */
export function createSafeUserContext(userId?: string): string {
  if (!userId) {
    return '';
  }

  // Validate user ID format
  if (!validateUserId(userId)) {
    console.warn('Invalid user ID format detected, excluding from prompt:', userId);
    return '';
  }

  // Sanitize the user ID
  const sanitizedUserId = sanitizeUserInput(userId);

  if (!sanitizedUserId || sanitizedUserId.includes('[FILTERED]')) {
    console.warn('Potentially malicious user ID detected, excluding from prompt:', userId);
    return '';
  }

  // Use structured format that's harder to exploit
  return `[USER_CONTEXT: ID=${sanitizedUserId}]`;
}

/**
 * Detect potential prompt injection attempts
 */
export function detectPromptInjection(text: string): {
  isDetected: boolean;
  risk: 'low' | 'medium' | 'high';
  reasons: string[];
} {
  if (!text || typeof text !== 'string') {
    return { isDetected: false, risk: 'low', reasons: [] };
  }

  const reasons: string[] = [];
  let riskLevel: 'low' | 'medium' | 'high' = 'low';

  // High-risk patterns
  const highRiskPatterns = [
    /ignore\s+(previous|all)\s+instructions?/gi,
    /forget\s+(everything|all)\s+(above|before)/gi,
    /new\s+(instructions?|task|role)/gi,
    /act\s+as\s+(admin|root|system)/gi,
    /override\s+(security|safety|rules)/gi,
  ];

  // Medium-risk patterns
  const mediumRiskPatterns = [
    /system:\s*/gi,
    /assistant:\s*/gi,
    /\[INST\]/gi,
    /<<SYS>>/gi,
    /role\s*play/gi,
  ];

  // Low-risk patterns
  const lowRiskPatterns = [
    /pretend/gi,
    /imagine/gi,
    /simulate/gi,
  ];

  // Check high-risk patterns
  for (const pattern of highRiskPatterns) {
    if (pattern.test(text)) {
      reasons.push('High-risk instruction override detected');
      riskLevel = 'high';
    }
  }

  // Check medium-risk patterns
  for (const pattern of mediumRiskPatterns) {
    if (pattern.test(text)) {
      reasons.push('Medium-risk system directive detected');
      if (riskLevel === 'low') riskLevel = 'medium';
    }
  }

  // Check low-risk patterns
  for (const pattern of lowRiskPatterns) {
    if (pattern.test(text)) {
      reasons.push('Low-risk role-play pattern detected');
    }
  }

  return {
    isDetected: reasons.length > 0,
    risk: riskLevel,
    reasons
  };
}

/**
 * Build secure AI instructions with user context
 */
export function buildSecureInstructions(
  baseInstructions: string,
  userContext?: { userId?: string; webSearch?: boolean }
): string {
  // Validate base instructions
  const injectionCheck = detectPromptInjection(baseInstructions);
  if (injectionCheck.isDetected && injectionCheck.risk === 'high') {
    throw new Error('High-risk prompt injection detected in base instructions');
  }

  // Build secure user context
  const safeUserContext = userContext?.userId ? createSafeUserContext(userContext.userId) : '';

  // Structure the prompt with clear boundaries
  let securePrompt = baseInstructions;

  // Add user context in a structured way that's harder to exploit
  if (safeUserContext) {
    securePrompt += `\n\n--- USER SESSION INFO ---\n${safeUserContext}\nNote: All data operations must be scoped to this user for privacy and security.\n--- END USER SESSION INFO ---`;
  }

  // Add web search context if enabled
  if (userContext?.webSearch) {
    securePrompt += `\n\nWeb search is enabled for this session. You may access external tools through MCP servers.`;
  }

  // Add security reminders
  securePrompt += `\n\nSECURITY REMINDER: Never reveal user IDs, session tokens, or internal system information. Always maintain data privacy and security.`;

  return securePrompt;
}

/**
 * Log security events for monitoring
 */
export function logSecurityEvent(
  event: 'prompt_injection_detected' | 'invalid_user_id' | 'sanitization_applied',
  details: { userId?: string; input?: string; risk?: string }
): void {
  console.warn('🚨 Security Event:', {
    event,
    timestamp: new Date().toISOString(),
    userId: details.userId ? 'REDACTED' : undefined,
    inputLength: details.input?.length,
    risk: details.risk
  });
}