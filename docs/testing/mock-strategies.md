# Mock Strategies and Best Practices

## Overview

This document outlines comprehensive mocking strategies for testing the Clerk business assistant application. Proper mocking is essential for creating fast, reliable, and isolated tests.

## Types of Mocks

### 1. Function Mocks
Used for mocking individual functions or methods.

```typescript
// Basic function mock
const mockFunction = jest.fn();

// Mock with return value
const mockGetUser = jest.fn().mockReturnValue({ id: '1', name: 'Test User' });

// Mock with resolved promise
const mockApiCall = jest.fn().mockResolvedValue({ data: 'success' });

// Mock with rejected promise
const mockFailedCall = jest.fn().mockRejectedValue(new Error('API Error'));
```

### 2. Module Mocks
Used for mocking entire modules or libraries.

```typescript
// Mock entire module
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn()
  }),
  useSearchParams: () => new URLSearchParams()
}));

// Partial module mock
jest.mock('lib/auth', () => ({
  ...jest.requireActual('lib/auth'),
  getSession: jest.fn().mockResolvedValue(mockSession)
}));
```

### 3. Class Mocks
Used for mocking class instances and their methods.

```typescript
// Mock class constructor
jest.mock('aws-sdk', () => ({
  DynamoDB: {
    DocumentClient: jest.fn().mockImplementation(() => ({
      get: jest.fn().mockReturnValue({
        promise: () => Promise.resolve({ Item: mockItem })
      }),
      put: jest.fn().mockReturnValue({
        promise: () => Promise.resolve({})
      })
    }))
  }
}));
```

## Application-Specific Mock Strategies

### Authentication Mocks

#### NextAuth Session Mock
```typescript
// tests/__mocks__/next-auth.ts
export const mockSession = {
  user: {
    id: 'test-user-id',
    email: 'test@example.com',
    name: 'Test User',
    image: 'https://example.com/avatar.jpg'
  },
  expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
};

// Mock useSession hook
jest.mock('next-auth/react', () => ({
  useSession: () => ({
    data: mockSession,
    status: 'authenticated'
  }),
  signIn: jest.fn(),
  signOut: jest.fn()
}));
```

#### Auth Configuration Mock
```typescript
// tests/__mocks__/auth-config.ts
export const mockAuthConfig = {
  providers: [
    {
      id: 'google',
      name: 'Google',
      type: 'oauth'
    }
  ],
  callbacks: {
    jwt: jest.fn(),
    session: jest.fn()
  }
};
```

### Database Mocks

#### DynamoDB Mock
```typescript
// tests/__mocks__/aws-sdk.ts
const mockDynamoDBClient = {
  get: jest.fn(),
  put: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  query: jest.fn(),
  scan: jest.fn()
};

export const DynamoDB = {
  DocumentClient: jest.fn(() => ({
    ...mockDynamoDBClient,
    get: (params) => ({
      promise: () => {
        if (params.Key.id === 'existing-id') {
          return Promise.resolve({ Item: mockUserData });
        }
        return Promise.resolve({});
      }
    }),
    put: () => ({
      promise: () => Promise.resolve({})
    })
  }))
};
```

#### Database Operation Helpers
```typescript
// tests/helpers/database-mocks.ts
export const createMockDatabaseOperations = () => ({
  getUser: jest.fn().mockImplementation((id) => {
    if (id === 'existing-user') {
      return Promise.resolve(mockUser);
    }
    return Promise.resolve(null);
  }),
  
  createUser: jest.fn().mockResolvedValue(mockUser),
  
  updateUser: jest.fn().mockImplementation((id, updates) => 
    Promise.resolve({ ...mockUser, ...updates })
  ),
  
  deleteUser: jest.fn().mockResolvedValue(true)
});
```

### AI Service Mocks

#### OpenAI API Mock
```typescript
// tests/__mocks__/openai.ts
export const mockOpenAIResponse = {
  choices: [
    {
      message: {
        role: 'assistant',
        content: 'This is a mocked AI response'
      },
      finish_reason: 'stop'
    }
  ],
  usage: {
    prompt_tokens: 10,
    completion_tokens: 20,
    total_tokens: 30
  }
};

export const mockOpenAI = {
  chat: {
    completions: {
      create: jest.fn().mockResolvedValue(mockOpenAIResponse)
    }
  }
};
```

#### Streaming Response Mock
```typescript
// tests/__mocks__/streaming-response.ts
export const createMockStreamingResponse = (chunks: string[]) => {
  let index = 0;
  
  return {
    [Symbol.asyncIterator]: async function* () {
      for (const chunk of chunks) {
        yield {
          choices: [
            {
              delta: {
                content: chunk
              }
            }
          ]
        };
      }
    }
  };
};

// Usage in tests
const mockStream = createMockStreamingResponse(['Hello', ' world', '!']);
mockOpenAI.chat.completions.create.mockResolvedValue(mockStream);
```

### File Upload Mocks

#### File Object Mock
```typescript
// tests/__mocks__/file.ts
export const createMockFile = (
  name = 'test.txt',
  content = 'test content',
  type = 'text/plain'
) => {
  const file = new File([content], name, { type });
  return file;
};

// FormData mock
export const createMockFormData = (files: File[]) => {
  const formData = new FormData();
  files.forEach((file, index) => {
    formData.append(`file-${index}`, file);
  });
  return formData;
};
```

#### File Processing Mock
```typescript
// tests/__mocks__/file-processing.ts
export const mockFileProcessor = {
  processFile: jest.fn().mockImplementation((file) => {
    return Promise.resolve({
      name: file.name,
      size: file.size,
      type: file.type,
      content: 'processed content',
      metadata: {
        pages: 1,
        wordCount: 100
      }
    });
  }),
  
  validateFile: jest.fn().mockReturnValue(true),
  
  extractText: jest.fn().mockResolvedValue('extracted text content')
};
```

## MSW (Mock Service Worker) Setup

### Basic MSW Configuration
```typescript
// tests/setup/msw.ts
import { setupServer } from 'msw/node';
import { rest } from 'msw';

export const handlers = [
  // Auth endpoints
  rest.post('/api/auth/signin', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({ user: mockUser, session: mockSession })
    );
  }),
  
  // Chat endpoints
  rest.post('/api/chat', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({ message: 'Mocked AI response' })
    );
  }),
  
  // File upload endpoints
  rest.post('/api/upload-files', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({ files: [{ id: '1', name: 'uploaded.txt' }] })
    );
  })
];

export const server = setupServer(...handlers);
```

### Dynamic Response Handlers
```typescript
// tests/helpers/msw-helpers.ts
export const createDynamicHandler = (endpoint: string, responses: any[]) => {
  let callCount = 0;
  
  return rest.post(endpoint, (req, res, ctx) => {
    const response = responses[callCount] || responses[responses.length - 1];
    callCount++;
    
    if (response.error) {
      return res(ctx.status(response.status || 500), ctx.json(response.error));
    }
    
    return res(ctx.status(200), ctx.json(response.data));
  });
};

// Usage
const chatHandler = createDynamicHandler('/api/chat', [
  { data: { message: 'First response' } },
  { data: { message: 'Second response' } },
  { error: { message: 'Rate limited' }, status: 429 }
]);
```

## Mock Data Factories

### User Data Factory
```typescript
// tests/fixtures/user.factory.ts
export interface TestUser {
  id: string;
  email: string;
  name: string;
  image?: string;
  createdAt: Date;
  updatedAt: Date;
}

export const createTestUser = (overrides: Partial<TestUser> = {}): TestUser => ({
  id: `user-${Math.random().toString(36).substr(2, 9)}`,
  email: `test-${Date.now()}@example.com`,
  name: 'Test User',
  image: 'https://example.com/avatar.jpg',
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides
});

export const createTestUsers = (count: number): TestUser[] => {
  return Array.from({ length: count }, (_, index) => 
    createTestUser({ name: `Test User ${index + 1}` })
  );
};
```

### Chat Data Factory
```typescript
// tests/fixtures/chat.factory.ts
export interface TestChatMessage {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
  userId: string;
}

export const createTestMessage = (
  overrides: Partial<TestChatMessage> = {}
): TestChatMessage => ({
  id: `msg-${Math.random().toString(36).substr(2, 9)}`,
  content: 'Test message content',
  role: 'user',
  timestamp: new Date(),
  userId: 'test-user-id',
  ...overrides
});

export const createTestConversation = (messageCount: number) => {
  const messages: TestChatMessage[] = [];
  
  for (let i = 0; i < messageCount; i++) {
    messages.push(
      createTestMessage({
        role: i % 2 === 0 ? 'user' : 'assistant',
        content: `Message ${i + 1} content`
      })
    );
  }
  
  return messages;
};
```

## Mock Best Practices

### 1. Keep Mocks Simple and Focused
```typescript
// Good - focused mock
const mockUserService = {
  getUser: jest.fn().mockResolvedValue(mockUser)
};

// Avoid - overly complex mock
const mockUserService = {
  getUser: jest.fn().mockImplementation(async (id) => {
    // Complex logic that should be in the actual implementation
    if (!id) throw new Error('ID required');
    if (id.length < 3) throw new Error('Invalid ID');
    // ... more complex logic
    return mockUser;
  })
};
```

### 2. Use Realistic Mock Data
```typescript
// Good - realistic data
const mockUser = {
  id: 'usr_2NxZ8C7oA8VWM4qp',
  email: 'john.doe@company.com',
  name: 'John Doe',
  createdAt: '2024-01-15T10:30:00Z'
};

// Avoid - unrealistic data
const mockUser = {
  id: '1',
  email: 'test',
  name: 'test'
};
```

### 3. Reset Mocks Between Tests
```typescript
// In test setup
beforeEach(() => {
  jest.clearAllMocks();
  // or for specific mocks
  mockUserService.getUser.mockClear();
});

afterEach(() => {
  // Reset MSW handlers
  server.resetHandlers();
});
```

### 4. Mock at the Right Level
```typescript
// Good - mock at the boundary
jest.mock('lib/database', () => ({
  getUser: jest.fn(),
  createUser: jest.fn()
}));

// Avoid - mocking too deep
jest.mock('aws-sdk/clients/dynamodb', () => {
  // Deep internal mocking
});
```

### 5. Use Type-Safe Mocks
```typescript
// Type-safe mock creation
const createMockService = <T>(service: T): jest.Mocked<T> => {
  const mock = {} as jest.Mocked<T>;
  
  Object.keys(service as any).forEach(key => {
    mock[key as keyof T] = jest.fn() as any;
  });
  
  return mock;
};

// Usage
const mockUserService = createMockService(userService);
```

## Common Mock Patterns

### 1. Conditional Mocks
```typescript
const mockApiCall = jest.fn().mockImplementation((params) => {
  if (params.id === 'error-case') {
    return Promise.reject(new Error('API Error'));
  }
  if (params.id === 'not-found') {
    return Promise.resolve(null);
  }
  return Promise.resolve(mockData);
});
```

### 2. Stateful Mocks
```typescript
const createStatefulMock = () => {
  let state = { users: [] };
  
  return {
    getUsers: jest.fn(() => Promise.resolve(state.users)),
    addUser: jest.fn((user) => {
      state.users.push(user);
      return Promise.resolve(user);
    }),
    clearUsers: jest.fn(() => {
      state.users = [];
      return Promise.resolve();
    })
  };
};
```

### 3. Time-Based Mocks
```typescript
// Mock Date for consistent testing
const mockDate = new Date('2024-01-15T10:30:00Z');
jest.spyOn(global, 'Date').mockImplementation(() => mockDate);

// Mock timers
jest.useFakeTimers();
jest.setSystemTime(mockDate);

// In test cleanup
afterAll(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});
```

## Troubleshooting Mock Issues

### Mock Not Being Applied
```typescript
// Ensure mock is hoisted
jest.mock('module-name'); // This should be at the top

// Check mock implementation
console.log(jest.isMockFunction(mockFunction)); // Should be true
```

### Mock Interference Between Tests
```typescript
// Clear mocks between tests
beforeEach(() => {
  jest.clearAllMocks();
});

// Or restore original implementation
afterEach(() => {
  jest.restoreAllMocks();
});
```

### Type Issues with Mocks
```typescript
// Use proper typing for mocks
const mockFunction = jest.fn() as jest.MockedFunction<typeof originalFunction>;

// Or use jest.mocked utility
const mockedModule = jest.mocked(originalModule);
```

This comprehensive mock strategy ensures consistent, maintainable, and reliable test mocks across the entire application.