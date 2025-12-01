/**
 * Simple In-Memory Rate Limiting
 */

interface RateLimit {
  count: number;
  resetAt: number;
}

// In-memory storage - perfect for single instance deployments
const rateLimits = new Map<string, RateLimit>();

/**
 * Check if user/IP can make request
 */
export function checkRateLimit(
  identifier: string,
  limit: number = 20,
  windowMs: number = 60000
): { allowed: boolean; remaining: number; retryAfter?: number } {
  const now = Date.now();
  const userLimit = rateLimits.get(identifier);

  // No previous record or window expired - allow and create new
  if (!userLimit || now > userLimit.resetAt) {
    rateLimits.set(identifier, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1 };
  }

  // Check if limit exceeded
  if (userLimit.count >= limit) {
    const retryAfter = Math.ceil((userLimit.resetAt - now) / 1000);
    return { allowed: false, remaining: 0, retryAfter };
  }

  // Increment count and allow
  userLimit.count++;
  return { allowed: true, remaining: limit - userLimit.count };
}

/**
 * Get identifier for rate limiting (user ID preferred, fallback to IP)
 */
export function getRateLimitIdentifier(request: Request, userId?: string): string {
  if (userId) return `user:${userId}`;

  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown';
  return `ip:${ip}`;
}

/**
 * Rate limits for different endpoints
 */
export const RATE_LIMITS = {
  UPLOAD: { limit: 5, windowMs: 60000 },   // 5 uploads per minute
  CHAT: { limit: 20, windowMs: 60000 },    // 20 messages per minute
  GENERAL: { limit: 50, windowMs: 60000 }  // 50 requests per minute
} as const;

// Clean expired entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, limit] of rateLimits.entries()) {
    if (now > limit.resetAt + 60000) { // Clean 1 minute after expiry
      rateLimits.delete(key);
    }
  }
}, 5 * 60 * 1000);