# Testing Troubleshooting Guide

## Common Issues and Solutions

### Jest Configuration Issues

#### Problem: Tests not finding modules or imports failing
**Symptoms:**
- `Cannot find module` errors
- Import/export syntax errors
- TypeScript compilation errors

**Solutions:**
```bash
# Check Jest configuration in package.json or jest.config.js
# Ensure moduleNameMapping is correct for path aliases
{
  "moduleNameMapping": {
    "^@/(.*)$": "<rootDir>/$1",
    "^~/(.*)$": "<rootDir>/$1"
  }
}

# Verify TypeScript configuration
# Check tsconfig.json paths match Jest moduleNameMapping
```

#### Problem: Environment setup issues
**Symptoms:**
- `document is not defined` in unit tests
- `window is not defined` errors
- DOM methods not available

**Solutions:**
```javascript
// In jest.config.js, ensure correct environment
module.exports = {
  testEnvironment: 'jsdom', // for React components
  // or
  testEnvironment: 'node', // for API/utility tests
};

// Or specify per-test file
/**
 * @jest-environment jsdom
 */
```

### React Testing Library Issues

#### Problem: Elements not found in tests
**Symptoms:**
- `Unable to find an element` errors
- Tests failing when component seems to render correctly

**Solutions:**
```typescript
// Use screen.debug() to see what's actually rendered
import { screen } from '@testing-library/react';

test('should find element', () => {
  render(<MyComponent />);
  screen.debug(); // Prints current DOM to console
  
  // Use more specific queries
  const button = screen.getByRole('button', { name: /submit/i });
  // Instead of generic getByText
});

// Wait for async elements
await screen.findByText('Async content');
// Instead of getByText for content that loads asynchronously
```

#### Problem: Act warnings in console
**Symptoms:**
- Warning: `An update to Component inside a test was not wrapped in act(...)`

**Solutions:**
```typescript
// Use userEvent instead of fireEvent
import userEvent from '@testing-library/user-event';

test('should handle click', async () => {
  const user = userEvent.setup();
  render(<Button onClick={handleClick} />);
  
  await user.click(screen.getByRole('button'));
  // Instead of fireEvent.click()
});

// Wrap state updates in act when necessary
import { act } from '@testing-library/react';

act(() => {
  // Code that causes state updates
});
```

### Mock Service Worker (MSW) Issues

#### Problem: API mocks not working
**Symptoms:**
- Real API calls being made during tests
- Network errors in tests
- Inconsistent test results

**Solutions:**
```typescript
// Ensure MSW server is properly set up
// In tests/setup/msw.ts
import { setupServer } from 'msw/node';
import { handlers } from '../__mocks__/handlers';

export const server = setupServer(...handlers);

// In jest.setup.js
import { server } from './tests/setup/msw';

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

#### Problem: Handler not matching requests
**Symptoms:**
- Requests bypassing mock handlers
- Unexpected responses in tests

**Solutions:**
```typescript
// Check handler URL patterns match exactly
rest.get('/api/users/:id', (req, res, ctx) => {
  // Make sure the URL pattern matches your actual API calls
});

// Use server.use() to add handlers for specific tests
test('should handle error response', () => {
  server.use(
    rest.get('/api/users', (req, res, ctx) => {
      return res(ctx.status(500), ctx.json({ error: 'Server error' }));
    })
  );
  
  // Test error handling
});
```

### Playwright E2E Issues

#### Problem: Tests timing out or flaky
**Symptoms:**
- Tests pass locally but fail in CI
- Intermittent failures
- Timeout errors

**Solutions:**
```typescript
// Use proper waiting strategies
await page.waitForSelector('[data-testid="content"]');
// Instead of page.waitForTimeout()

// Use auto-waiting actions
await page.click('button'); // Automatically waits for element
await page.fill('input', 'text'); // Waits for element to be ready

// Increase timeout for slow operations
await page.waitForResponse(
  response => response.url().includes('/api/data'),
  { timeout: 10000 }
);
```

#### Problem: Authentication issues in E2E tests
**Symptoms:**
- Tests failing due to authentication redirects
- Unable to access protected routes

**Solutions:**
```typescript
// Set up authentication state before tests
test.beforeEach(async ({ page }) => {
  // Mock authentication or use test user
  await page.goto('/api/auth/signin');
  await page.fill('[name="email"]', 'test@example.com');
  await page.click('button[type="submit"]');
  await page.waitForURL('/dashboard');
});

// Or use storage state for faster authentication
// Save authenticated state once, reuse in tests
```

### Database Testing Issues

#### Problem: Test data conflicts
**Symptoms:**
- Tests failing due to existing data
- Inconsistent test results
- Database constraint violations

**Solutions:**
```typescript
// Use proper test data cleanup
afterEach(async () => {
  // Clean up test data
  await db.user.deleteMany({
    where: { email: { contains: 'test' } }
  });
});

// Use unique test data
const createTestUser = () => ({
  email: `test-${Date.now()}@example.com`,
  name: `Test User ${Math.random()}`
});

// Use transactions for test isolation
test('should create user', async () => {
  await db.$transaction(async (tx) => {
    // Test operations within transaction
    // Automatically rolled back after test
  });
});
```

### Performance Issues

#### Problem: Slow test execution
**Symptoms:**
- Tests taking too long to run
- CI pipeline timeouts
- Poor developer experience

**Solutions:**
```typescript
// Use test.concurrent for independent tests
test.concurrent('should handle user creation', async () => {
  // Test implementation
});

// Optimize test setup/teardown
beforeAll(async () => {
  // Expensive setup once per test suite
});

beforeEach(async () => {
  // Only necessary per-test setup
});

// Use test doubles to avoid slow operations
const mockApiCall = jest.fn().mockResolvedValue(mockData);
// Instead of actual API calls
```

### Coverage Issues

#### Problem: Coverage not accurate or too low
**Symptoms:**
- Coverage reports showing uncovered lines that should be covered
- Unable to reach coverage thresholds

**Solutions:**
```javascript
// Check coverage configuration
module.exports = {
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.tsx',
    '!src/test-utils/**'
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  }
};

// Add coverage comments for intentionally uncovered code
/* istanbul ignore next */
if (process.env.NODE_ENV === 'development') {
  // Development-only code
}
```

## Debugging Strategies

### 1. Use Debug Tools
```typescript
// React Testing Library debug
import { screen } from '@testing-library/react';
screen.debug(); // Shows current DOM state

// Jest debug
console.log('Debug info:', { variable, state });

// Playwright debug
await page.pause(); // Pauses execution for inspection
```

### 2. Isolate the Problem
```bash
# Run single test file
npm test -- MyComponent.test.tsx

# Run specific test
npm test -- --testNamePattern="should handle click"

# Run with verbose output
npm test -- --verbose
```

### 3. Check Test Environment
```typescript
// Verify test environment setup
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('Test environment:', expect.getState().testEnvironment);
```

## Getting Help

### Before Asking for Help
1. Check this troubleshooting guide
2. Review test examples in the codebase
3. Check official documentation for the testing library
4. Search for similar issues in GitHub/Stack Overflow

### When Asking for Help
Include:
- Error message (full stack trace)
- Test code that's failing
- Expected vs actual behavior
- Environment details (Node version, OS, etc.)
- Steps to reproduce

### Useful Resources
- [Jest Troubleshooting](https://jestjs.io/docs/troubleshooting)
- [React Testing Library FAQ](https://testing-library.com/docs/react-testing-library/faq)
- [Playwright Debugging](https://playwright.dev/docs/debug)
- [MSW Troubleshooting](https://mswjs.io/docs/getting-started/troubleshooting)

## Prevention Tips

### Write Maintainable Tests
- Keep tests simple and focused
- Use descriptive test names
- Avoid testing implementation details
- Use proper test data management

### Regular Maintenance
- Update test dependencies regularly
- Review and refactor flaky tests
- Monitor test performance metrics
- Keep test documentation up to date

### Team Practices
- Code review test changes
- Share testing patterns and solutions
- Document team-specific testing conventions
- Regular testing knowledge sharing sessions