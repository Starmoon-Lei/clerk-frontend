/**
 * External service security validator
 * Prevents backdoors and validates external service connections
 */

interface ExternalServiceConfig {
  enabled: boolean;
  allowedDomains: string[];
  requireHttps: boolean;
  timeoutMs: number;
}

/**
 * Validate external service URL for security
 */
export function validateExternalServiceUrl(url: string): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!url || typeof url !== 'string') {
    errors.push('Invalid URL provided');
    return { isValid: false, errors, warnings };
  }

  try {
    const urlObj = new URL(url);

    // Require HTTPS in production
    if (urlObj.protocol !== 'https:' && process.env.NODE_ENV === 'production') {
      errors.push('HTTPS required for external services in production');
    }

    // Check against allowed domains
    const allowedDomains = getAllowedExternalDomains();
    const isAllowedDomain = allowedDomains.some(domain => {
      if (domain.startsWith('*.')) {
        // Wildcard subdomain matching
        const baseDomain = domain.substring(2);
        return urlObj.hostname.endsWith(baseDomain);
      }
      return urlObj.hostname === domain;
    });

    if (!isAllowedDomain) {
      errors.push(`Domain not in allowlist: ${urlObj.hostname}`);
    }

    // Security checks
    if (urlObj.hostname === 'localhost' || urlObj.hostname === '127.0.0.1') {
      if (process.env.NODE_ENV === 'production') {
        errors.push('Localhost URLs not allowed in production');
      } else {
        warnings.push('Using localhost URL in development');
      }
    }

    // Check for suspicious ports
    const suspiciousPorts = ['22', '23', '25', '53', '110', '143', '993', '995'];
    if (urlObj.port && suspiciousPorts.includes(urlObj.port)) {
      warnings.push(`Suspicious port detected: ${urlObj.port}`);
    }

    // Check for IP addresses (should use domains)
    const ipRegex = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/;
    if (ipRegex.test(urlObj.hostname)) {
      warnings.push('Using IP address instead of domain name');
    }

  } catch (error) {
    errors.push(`Invalid URL format: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Get allowed external domains from environment
 */
function getAllowedExternalDomains(): string[] {
  const envAllowed = process.env.ALLOWED_EXTERNAL_DOMAINS;

  if (envAllowed) {
    return envAllowed.split(',').map(domain => domain.trim());
  }

  // Default allowed domains for MCP services (can be overridden)
  const defaultAllowed = [
    'your-trusted-domain.com',
    '*.vercel.app', // Only if you trust Vercel deployments
    // Add your own trusted domains here
  ];

  // In development, be more permissive
  if (process.env.NODE_ENV === 'development') {
    defaultAllowed.push('localhost', '127.0.0.1', '*.ngrok.io');
  }

  return defaultAllowed;
}

/**
 * Get external service configuration
 */
export function getExternalServiceConfig(): ExternalServiceConfig {
  return {
    enabled: process.env.EXTERNAL_SERVICES_ENABLED !== 'false',
    allowedDomains: getAllowedExternalDomains(),
    requireHttps: process.env.NODE_ENV === 'production',
    timeoutMs: parseInt(process.env.EXTERNAL_SERVICE_TIMEOUT_MS || '10000', 10)
  };
}

/**
 * Check if external services are enabled
 */
export function areExternalServicesEnabled(): boolean {
  const config = getExternalServiceConfig();
  return config.enabled;
}

/**
 * Get safe MCP server URL with validation
 */
export function getSafeMcpServerUrl(): string | null {
  // Check if external services are disabled
  if (!areExternalServicesEnabled()) {
    console.log('🔒 External services disabled - MCP server will not be used');
    return null;
  }

  const mcpUrl = process.env.MCP_SERVER_URL;

  if (!mcpUrl) {
    console.warn('⚠️ MCP_SERVER_URL not configured - external tool access disabled');
    return null;
  }

  // Validate the URL
  const validation = validateExternalServiceUrl(mcpUrl);

  if (!validation.isValid) {
    console.error('🚨 MCP server URL validation failed:', validation.errors);
    return null;
  }

  if (validation.warnings.length > 0) {
    console.warn('⚠️ MCP server URL warnings:', validation.warnings);
  }

  return mcpUrl;
}

/**
 * Log external service usage for monitoring
 */
export function logExternalServiceUsage(
  serviceName: string,
  url: string,
  action: 'connect' | 'request' | 'error',
  details?: { userId?: string; duration?: number; error?: string }
): void {
  console.log('🌐 External Service Usage:', {
    service: serviceName,
    url: new URL(url).hostname, // Log only hostname for privacy
    action,
    timestamp: new Date().toISOString(),
    userId: details?.userId ? 'REDACTED' : undefined,
    duration: details?.duration,
    error: details?.error
  });
}