# Unit Test Examples

This document provides comprehensive examples of unit tests for different types of code in the Clerk application.

## Testing Utility Functions

### Basic Function Testing
```typescript
// lib/utils.ts
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// tests/unit/lib/utils.test.ts
import { cn } from '@/lib/utils';

describe('cn utility function', () => {
  it('should merge class names correctly', () => {
    const result = cn('btn', 'btn-primary', { 'btn-disabled': false });
    expect(result).toBe('btn btn-primary');
  });

  it('should handle conditional classes', () => {
    const result = cn('btn', { 'btn-active': true, 'btn-disabled': false });
    expect(result).toBe('btn btn-active');
  });

  it('should handle empty inputs', () => {
    const result = cn();
    expect(result).toBe('');
  });
});
```

### Testing Functions with External Dependencies
```typescript
// lib/auth-utils.ts
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth.config';

export async function getCurrentUser() {
  const session = await getServerSession(authOptions);
  return session?.user || null;
}

// tests/unit/lib/auth-utils.test.ts
import { getCurrentUser } from '@/lib/auth-utils';
import { getServerSession } from 'next-auth';

// Mock the external dependency
jest.mock('next-auth', () => ({
  getServerSession: jest.fn(),
}));

const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;

describe('getCurrentUser', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return user when session exists', async () => {
    const mockUser = { id: '1', email: 'test@example.com', name: 'Test User' };
    mockGetServerSession.mockResolvedValue({ user: mockUser });

    const result = await getCurrentUser();

    expect(result).toEqual(mockUser);
    expect(mockGetServerSession).toHaveBeenCalledWith(authOptions);
  });

  it('should return null when no session exists', async () => {
    mockGetServerSession.mockResolvedValue(null);

    const result = await getCurrentUser();

    expect(result).toBeNull();
  });
});
```

## Testing Custom Hooks

### Hook with State Management
```typescript
// hooks/useResponseChat.tsx
import { useState, useCallback } from 'react';

export function useResponseChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const addMessage = useCallback((message: Message) => {
    setMessages(prev => [...prev, message]);
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  return {
    messages,
    isLoading,
    addMessage,
    clearMessages,
  };
}

// tests/unit/hooks/useResponseChat.test.tsx
import { renderHook, act } from '@testing-library/react';
import { useResponseChat } from '@/hooks/useResponseChat';

describe('useResponseChat', () => {
  it('should initialize with empty messages', () => {
    const { result } = renderHook(() => useResponseChat());

    expect(result.current.messages).toEqual([]);
    expect(result.current.isLoading).toBe(false);
  });

  it('should add message correctly', () => {
    const { result } = renderHook(() => useResponseChat());
    const testMessage = { id: '1', content: 'Hello', role: 'user' as const };

    act(() => {
      result.current.addMessage(testMessage);
    });

    expect(result.current.messages).toEqual([testMessage]);
  });

  it('should clear messages correctly', () => {
    const { result } = renderHook(() => useResponseChat());
    const testMessage = { id: '1', content: 'Hello', role: 'user' as const };

    act(() => {
      result.current.addMessage(testMessage);
    });

    expect(result.current.messages).toHaveLength(1);

    act(() => {
      result.current.clearMessages();
    });

    expect(result.current.messages).toEqual([]);
  });
});
```

## Testing Authentication Logic

### Testing Auth Configuration
```typescript
// auth.config.ts
export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
};

// tests/unit/auth/auth.config.test.ts
import { authOptions } from '@/auth.config';

describe('Auth Configuration', () => {
  describe('JWT callback', () => {
    it('should add user id to token when user is provided', async () => {
      const mockToken = { sub: 'user-123' };
      const mockUser = { id: 'user-123', email: 'test@example.com' };

      const result = await authOptions.callbacks!.jwt!({
        token: mockToken,
        user: mockUser,
      } as any);

      expect(result).toEqual({
        sub: 'user-123',
        id: 'user-123',
      });
    });

    it('should return token unchanged when no user is provided', async () => {
      const mockToken = { sub: 'user-123' };

      const result = await authOptions.callbacks!.jwt!({
        token: mockToken,
      } as any);

      expect(result).toEqual(mockToken);
    });
  });

  describe('Session callback', () => {
    it('should add user id to session from token', async () => {
      const mockSession = {
        user: { email: 'test@example.com', name: 'Test User' },
        expires: '2024-01-01',
      };
      const mockToken = { id: 'user-123' };

      const result = await authOptions.callbacks!.session!({
        session: mockSession,
        token: mockToken,
      } as any);

      expect(result.user.id).toBe('user-123');
    });
  });
});
```

## Testing Error Handling

### Function with Error Cases
```typescript
// lib/validation.ts
export function validateEmail(email: string): boolean {
  if (!email) {
    throw new Error('Email is required');
  }
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// tests/unit/lib/validation.test.ts
import { validateEmail } from '@/lib/validation';

describe('validateEmail', () => {
  it('should return true for valid email', () => {
    expect(validateEmail('test@example.com')).toBe(true);
  });

  it('should return false for invalid email', () => {
    expect(validateEmail('invalid-email')).toBe(false);
  });

  it('should throw error for empty email', () => {
    expect(() => validateEmail('')).toThrow('Email is required');
  });

  it('should throw error for null email', () => {
    expect(() => validateEmail(null as any)).toThrow('Email is required');
  });
});
```

## Testing Async Functions

### Function with Promise
```typescript
// lib/api-client.ts
export async function fetchUserData(userId: string): Promise<User> {
  const response = await fetch(`/api/users/${userId}`);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch user: ${response.status}`);
  }
  
  return response.json();
}

// tests/unit/lib/api-client.test.ts
import { fetchUserData } from '@/lib/api-client';

// Mock fetch globally
global.fetch = jest.fn();
const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

describe('fetchUserData', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return user data on successful fetch', async () => {
    const mockUser = { id: '1', name: 'Test User', email: 'test@example.com' };
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => mockUser,
    } as Response);

    const result = await fetchUserData('1');

    expect(result).toEqual(mockUser);
    expect(mockFetch).toHaveBeenCalledWith('/api/users/1');
  });

  it('should throw error on failed fetch', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 404,
    } as Response);

    await expect(fetchUserData('1')).rejects.toThrow('Failed to fetch user: 404');
  });

  it('should throw error on network failure', async () => {
    mockFetch.mockRejectedValue(new Error('Network error'));

    await expect(fetchUserData('1')).rejects.toThrow('Network error');
  });
});
```

## Testing TypeScript Types

### Type Guard Functions
```typescript
// lib/type-guards.ts
export function isUser(obj: any): obj is User {
  return obj && typeof obj.id === 'string' && typeof obj.email === 'string';
}

// tests/unit/lib/type-guards.test.ts
import { isUser } from '@/lib/type-guards';

describe('isUser type guard', () => {
  it('should return true for valid user object', () => {
    const validUser = { id: '1', email: 'test@example.com', name: 'Test' };
    expect(isUser(validUser)).toBe(true);
  });

  it('should return false for object missing id', () => {
    const invalidUser = { email: 'test@example.com', name: 'Test' };
    expect(isUser(invalidUser)).toBe(false);
  });

  it('should return false for object missing email', () => {
    const invalidUser = { id: '1', name: 'Test' };
    expect(isUser(invalidUser)).toBe(false);
  });

  it('should return false for null or undefined', () => {
    expect(isUser(null)).toBe(false);
    expect(isUser(undefined)).toBe(false);
  });
});
```

## Best Practices for Unit Tests

### 1. Test Isolation
- Each test should be independent
- Use `beforeEach` and `afterEach` for setup/cleanup
- Clear mocks between tests

### 2. Descriptive Test Names
```typescript
// Good
it('should return formatted currency when valid amount is provided')

// Avoid
it('should work correctly')
```

### 3. Single Responsibility
```typescript
// Good - tests one thing
it('should validate email format correctly', () => {
  expect(validateEmail('test@example.com')).toBe(true);
});

it('should throw error for empty email', () => {
  expect(() => validateEmail('')).toThrow();
});

// Avoid - tests multiple things
it('should validate email', () => {
  expect(validateEmail('test@example.com')).toBe(true);
  expect(() => validateEmail('')).toThrow();
});
```

### 4. Use Appropriate Matchers
```typescript
// Good - specific matchers
expect(result).toBeNull();
expect(array).toHaveLength(3);
expect(string).toContain('substring');

// Avoid - generic matchers
expect(result === null).toBe(true);
expect(array.length).toBe(3);
```

### 5. Mock External Dependencies
```typescript
// Good - mock external dependencies
jest.mock('@/lib/database', () => ({
  query: jest.fn(),
}));

// Avoid - testing with real external dependencies
```