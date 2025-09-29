/**
 * Session refresh utility for long-running operations
 * Prevents session race conditions during file uploads and processing
 * Includes TTL-based caching to reduce database hits
 */

import { auth } from "../../auth";
import { Session } from "next-auth";

interface CachedSession {
  session: Session | null;
  timestamp: number;
  isValid: boolean;
}

// Simple in-memory cache for sessions with TTL
class SessionCache {
  private cache = new Map<string, CachedSession>();
  private readonly TTL = 5 * 60 * 1000; // 5 minutes TTL

  get(userId: string): CachedSession | null {
    const cached = this.cache.get(userId);
    if (!cached) return null;

    // Check if cache entry has expired
    if (Date.now() - cached.timestamp > this.TTL) {
      this.cache.delete(userId);
      return null;
    }

    return cached;
  }

  set(userId: string, session: Session | null, isValid: boolean): void {
    this.cache.set(userId, {
      session,
      timestamp: Date.now(),
      isValid
    });
  }

  clear(userId?: string): void {
    if (userId) {
      this.cache.delete(userId);
    } else {
      this.cache.clear();
    }
  }

  // Cleanup expired entries periodically
  cleanup(): void {
    const now = Date.now();
    for (const [key, value] of this.cache.entries()) {
      if (now - value.timestamp > this.TTL) {
        this.cache.delete(key);
      }
    }
  }

  // Get cache stats for monitoring
  getStats(): { size: number; ttl: number } {
    return { size: this.cache.size, ttl: this.TTL };
  }
}

// Global session cache instance
const sessionCache = new SessionCache();

// Cleanup expired cache entries every 10 minutes
setInterval(() => {
  sessionCache.cleanup();
}, 10 * 60 * 1000);

export interface SessionStatus {
  isValid: boolean;
  session: Session | null;
  needsRefresh: boolean;
  expiresIn: number; // seconds until expiration
}

/**
 * Check session validity and refresh if needed during operations
 * Uses TTL cache to reduce database hits
 * @param currentSession - Current session object
 * @returns Updated session status
 */
export async function checkAndRefreshSession(currentSession: Session | null): Promise<SessionStatus> {
  try {
    // If no current session, get fresh session
    if (!currentSession?.user?.id) {
      const freshSession = await auth();
      const isValid = !!freshSession?.user?.id;

      // Cache the result if we have a user ID
      if (freshSession?.user?.id) {
        sessionCache.set(freshSession.user.id, freshSession, isValid);
      }

      return {
        isValid,
        session: freshSession,
        needsRefresh: false,
        expiresIn: freshSession ? calculateExpiresIn(freshSession) : 0
      };
    }

    const userId = currentSession.user.id;

    // Check cache first
    const cached = sessionCache.get(userId);
    if (cached && cached.isValid) {
      // Cache hit - return cached session
      const expiresIn = cached.session ? calculateExpiresIn(cached.session) : 0;

      // Even with cache, check if session needs refresh soon
      const needsRefresh = expiresIn < 30 * 60; // 30 minutes

      if (!needsRefresh) {
        return {
          isValid: true,
          session: cached.session,
          needsRefresh: false,
          expiresIn
        };
      }

      // Session is cached but needs refresh - fall through to refresh logic
      console.log(`Cached session expires in ${Math.round(expiresIn / 60)} minutes, refreshing...`);
    }

    // Calculate time until session expires
    const expiresIn = calculateExpiresIn(currentSession);

    // If session expires within 30 minutes, refresh it
    const needsRefresh = expiresIn < 30 * 60; // 30 minutes

    if (needsRefresh) {
      if (!cached) {
        console.log(`Session expires in ${Math.round(expiresIn / 60)} minutes, refreshing...`);
      }

      // Get fresh session from database
      const freshSession = await auth();

      if (!freshSession?.user?.id) {
        // Clear cache for this user since session is invalid
        sessionCache.clear(userId);
        return {
          isValid: false,
          session: null,
          needsRefresh: false,
          expiresIn: 0
        };
      }

      // Cache the refreshed session
      sessionCache.set(freshSession.user.id, freshSession, true);

      return {
        isValid: true,
        session: freshSession,
        needsRefresh: true,
        expiresIn: calculateExpiresIn(freshSession)
      };
    }

    // Session is still valid and doesn't need refresh
    // Cache the current session for future use
    sessionCache.set(userId, currentSession, true);

    return {
      isValid: true,
      session: currentSession,
      needsRefresh: false,
      expiresIn
    };

  } catch (error) {
    console.error('Session refresh error:', error);

    // Differentiate between network errors and authentication failures
    const isNetworkError = error instanceof Error && (
      error.message.includes('fetch') ||
      error.message.includes('network') ||
      error.message.includes('timeout') ||
      error.message.includes('ENOTFOUND') ||
      error.message.includes('ECONNREFUSED') ||
      error.name === 'TypeError' || // Often network-related
      error.name === 'NetworkError'
    );

    if (isNetworkError) {
      console.warn('🌐 Network error during session refresh, keeping current session valid');
      // Return current session as still valid during network issues
      // but mark needs refresh for retry later
      return {
        isValid: !!currentSession?.user?.id,
        session: currentSession,
        needsRefresh: true, // Will retry on next call
        expiresIn: currentSession ? calculateExpiresIn(currentSession) : 0
      };
    }

    // For non-network errors (likely auth issues), mark session as invalid
    console.error('🔒 Authentication error during session refresh, session invalid');
    return {
      isValid: false,
      session: null,
      needsRefresh: false,
      expiresIn: 0
    };
  }
}

/**
 * Calculate seconds until session expires
 */
function calculateExpiresIn(session: Session): number {
  if (!session.expires) {
    // Default to 7 days from now if no expiry set
    return 7 * 24 * 60 * 60;
  }

  const expiryTime = new Date(session.expires).getTime();
  const currentTime = Date.now();

  return Math.max(0, Math.floor((expiryTime - currentTime) / 1000));
}

/**
 * Validate session during long-running operations with retry logic
 * Call this periodically during file processing
 */
export async function validateSessionDuringOperation(
  session: Session | null,
  operationName: string,
  maxRetries: number = 3
): Promise<{ valid: boolean; session: Session | null }> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const status = await checkAndRefreshSession(session);

      if (!status.isValid) {
        console.warn(`Session invalid during ${operationName}, aborting operation`);
        return { valid: false, session: null };
      }

      if (status.needsRefresh && attempt > 1) {
        console.log(`Session refreshed during ${operationName} (attempt ${attempt})`);
      } else if (status.needsRefresh) {
        console.log(`Session refreshed during ${operationName}`);
      }

      return { valid: true, session: status.session };

    } catch (error) {
      lastError = error as Error;

      // Check if this is a network error that we should retry
      const isNetworkError = error instanceof Error && (
        error.message.includes('fetch') ||
        error.message.includes('network') ||
        error.message.includes('timeout') ||
        error.message.includes('ENOTFOUND') ||
        error.message.includes('ECONNREFUSED') ||
        error.name === 'TypeError' ||
        error.name === 'NetworkError'
      );

      if (isNetworkError && attempt < maxRetries) {
        const retryDelay = Math.min(1000 * Math.pow(2, attempt - 1), 5000); // Exponential backoff, max 5s
        console.warn(`🌐 Network error during session validation (attempt ${attempt}/${maxRetries}), retrying in ${retryDelay}ms...`);

        await new Promise(resolve => setTimeout(resolve, retryDelay));
        continue; // Retry the operation
      }

      // Non-network error or exhausted retries
      if (isNetworkError) {
        console.warn(`🌐 Network error persists after ${maxRetries} attempts, keeping session valid but operation may be degraded`);
        // For persistent network issues, keep the session valid if we have one
        return {
          valid: !!session?.user?.id,
          session: session
        };
      }

      // Non-network error - likely authentication issue
      console.error(`🔒 Authentication error during ${operationName}:`, error);
      return { valid: false, session: null };
    }
  }

  // This should not be reached, but just in case
  throw lastError || new Error('Session validation failed unexpectedly');
}

/**
 * Session refresh middleware for API routes
 */
export async function withSessionRefresh<T>(
  operation: (session: Session) => Promise<T>,
  initialSession: Session | null,
  operationName: string = 'operation'
): Promise<T> {
  const { valid, session } = await validateSessionDuringOperation(initialSession, operationName);

  if (!valid || !session) {
    throw new Error('Session invalid or expired');
  }

  return await operation(session);
}

/**
 * Clear session cache for a specific user or all users
 * Call this when user signs out or when authentication errors occur
 */
export function clearSessionCache(userId?: string): void {
  sessionCache.clear(userId);
  if (userId) {
    console.log(`🧹 Cleared session cache for user: ${userId}`);
  } else {
    console.log('🧹 Cleared all session cache entries');
  }
}

/**
 * Get session cache statistics for monitoring
 */
export function getSessionCacheStats(): { size: number; ttl: number } {
  return sessionCache.getStats();
}