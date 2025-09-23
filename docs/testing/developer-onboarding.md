# Developer Testing Onboarding Guide

## Welcome to Testing at Clerk

This guide will help you get up to speed with our testing practices and tools. By the end of this guide, you'll understand our testing philosophy, know how to run and write tests, and be familiar with our testing patterns.

## Getting Started

### Prerequisites
- Node.js 18+ installed
- Basic understanding of JavaScript/TypeScript
- Familiarity with React and Next.js
- Understanding of testing concepts (unit, integration, E2E)

### Initial Setup

1. **Clone and Install Dependencies**
```bash
git clone <repository-url>
cd clerk
npm install
```

2. **Verify Test Environment**
```bash
# Run all tests to ensure everything works
npm test

# Run specific test types
npm run test:unit
npm run test:integration
npm run test:e2e
```

3. **Install Recommended VS Code Extensions**
- Jest Runner
- Playwright Test for VS Code
- Testing Library snippets
- axe Accessibility Linter

## Understanding Our Testing Strategy

### Testing Philosophy
We follow a **test pyramid** approach:
- **Many unit tests** - Fast, isolated, test individual functions
- **Some integration tests** - Test component interactions
- **Few E2E tests** - Test complete user workflows

### Test Types and Their Purpose

#### Unit Tests (70% of tests)
- **What**: Test individual functions, utilities, and hooks
- **When**: For business logic, utility functions, data transformations
- **Tools**: Jest, React Testing Library
- **Speed**: Very fast (< 100ms each)

```typescript
// Example: Testing a utility function
describe('formatCurrency', () => {
  it('should format USD correctly', () => {
    expect(formatCurrency(1234.56, 'USD')).toBe('$1,234.56');
  });
});
```

#### Integration Tests (20% of tests)
- **What**: Test how components work together
- **When**: For API endpoints, database operations, service integrations
- **Tools**: Jest, MSW (Mock Service Worker)
- **Speed**: Moderate (< 1s each)

```typescript
// Example: Testing an API endpoint
test('POST /api/chat should return AI response', async () => {
  const response = await request(app)
    .post('/api/chat')
    .send({ message: 'Hello' });
    
  expect(response.status).toBe(200);
  expect(response.body.message).toBeDefined();
});
```

#### Component Tests (8% of tests)
- **What**: Test React components in isolation
- **When**: For UI components, user interactions, rendering logic
- **Tools**: Jest, React Testing Library
- **Speed**: Fast (< 500ms each)

```typescript
// Example: Testing a React component
test('should render button with correct text', () => {
  render(<Button>Click me</Button>);
  expect(screen.getByRole('button')).toHaveTextContent('Click me');
});
```

#### End-to-End Tests (2% of tests)
- **What**: Test complete user workflows
- **When**: For critical user journeys, cross-browser testing
- **Tools**: Playwright
- **Speed**: Slow (5-30s each)

```typescript
// Example: Testing user authentication flow
test('should sign in user successfully', async ({ page }) => {
  await page.goto('/auth/signin');
  await page.fill('[data-testid="email"]', 'test@example.com');
  await page.click('[data-testid="signin-button"]');
  await expect(page).toHaveURL('/dashboard');
});
```

## Your First Week

### Day 1: Environment Setup and Exploration
- [ ] Set up development environment
- [ ] Run existing tests and explore test files
- [ ] Read through this documentation
- [ ] Join the team testing channel/discussions

**Exercise**: Run the test suite and identify the different types of tests in the codebase.

### Day 2-3: Writing Your First Tests
- [ ] Find a simple utility function without tests
- [ ] Write unit tests following our patterns
- [ ] Get code review feedback
- [ ] Learn about our mock strategies

**Exercise**: Write unit tests for a utility function in `lib/utils.ts`.

### Day 4-5: Component and Integration Testing
- [ ] Write tests for a React component
- [ ] Write an integration test for an API endpoint
- [ ] Learn about MSW for API mocking
- [ ] Practice using React Testing Library

**Exercise**: Write component tests for a UI component and integration tests for an API route.

## Essential Testing Patterns

### 1. Test Structure (AAA Pattern)
Always structure tests with Arrange, Act, Assert:

```typescript
test('should calculate total price with tax', () => {
  // Arrange - Set up test data
  const items = [{ price: 100 }, { price: 200 }];
  const taxRate = 0.1;
  
  // Act - Execute the function
  const total = calculateTotalWithTax(items, taxRate);
  
  // Assert - Verify the result
  expect(total).toBe(330);
});
```

### 2. Descriptive Test Names
Use clear, descriptive names that explain the expected behavior:

```typescript
// Good ✅
test('should return user data when valid ID is provided')
test('should throw error when user is not found')
test('should render loading state while fetching data')

// Avoid ❌
test('user test')
test('should work')
test('test component')
```

### 3. Mock External Dependencies
Always mock external services and APIs:

```typescript
// Mock external API
jest.mock('lib/openai', () => ({
  generateResponse: jest.fn().mockResolvedValue('Mocked AI response')
}));

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn()
  })
}));
```

### 4. Use Test Data Factories
Create reusable functions for generating test data:

```typescript
// tests/fixtures/user.factory.ts
export const createTestUser = (overrides = {}) => ({
  id: 'test-user-id',
  email: 'test@example.com',
  name: 'Test User',
  ...overrides
});

// Usage in tests
const user = createTestUser({ name: 'John Doe' });
```

## Common Testing Scenarios

### Testing React Components
```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

test('should handle button click', async () => {
  const user = userEvent.setup();
  const mockHandler = jest.fn();
  
  render(<Button onClick={mockHandler}>Click me</Button>);
  
  await user.click(screen.getByRole('button'));
  
  expect(mockHandler).toHaveBeenCalledTimes(1);
});
```

### Testing API Routes
```typescript
import { createMocks } from 'node-mocks-http';
import handler from 'pages/api/users';

test('GET /api/users should return user list', async () => {
  const { req, res } = createMocks({ method: 'GET' });
  
  await handler(req, res);
  
  expect(res._getStatusCode()).toBe(200);
  expect(JSON.parse(res._getData())).toHaveProperty('users');
});
```

### Testing with Authentication
```typescript
// Mock authenticated session
const mockSession = {
  user: { id: 'user-1', email: 'test@example.com' },
  expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
};

jest.mock('next-auth/react', () => ({
  useSession: () => ({ data: mockSession, status: 'authenticated' })
}));
```

## Development Workflow

### Before Writing Code
1. **Understand Requirements**: Read user stories and acceptance criteria
2. **Plan Tests**: Identify what needs to be tested
3. **Write Tests First** (TDD): Write failing tests, then implement

### While Writing Code
1. **Run Tests Frequently**: Use watch mode (`npm run test:watch`)
2. **Check Coverage**: Ensure new code is covered
3. **Refactor Tests**: Keep tests clean and maintainable

### Before Committing
1. **Run Full Test Suite**: `npm test`
2. **Check Coverage**: `npm run test:coverage`
3. **Fix Any Issues**: Address failing tests or coverage gaps

## Debugging Tests

### Common Issues and Solutions

#### Tests Not Running
```bash
# Clear Jest cache
npx jest --clearCache

# Check for syntax errors
npm run lint

# Run with verbose output
npm test -- --verbose
```

#### Mock Issues
```typescript
// Check if function is mocked
console.log(jest.isMockFunction(myFunction));

// Reset mocks between tests
beforeEach(() => {
  jest.clearAllMocks();
});
```

#### Async Test Problems
```typescript
// Always use async/await for async operations
test('async operation', async () => {
  const result = await asyncFunction();
  expect(result).toBe('expected');
});

// Wait for elements in React Testing Library
const element = await screen.findByText('async content');
```

### Debugging Tools
- Use `screen.debug()` to see rendered DOM
- Use `console.log()` for debugging test data
- Use VS Code debugger with Jest Runner extension
- Use Playwright's debug mode for E2E tests

## Code Review Guidelines

### What to Look For
- [ ] Tests cover the happy path and edge cases
- [ ] Test names are descriptive and clear
- [ ] Mocks are appropriate and not over-used
- [ ] Tests are isolated and don't depend on each other
- [ ] Test data is realistic but minimal

### What to Avoid
- [ ] Testing implementation details
- [ ] Overly complex test setup
- [ ] Flaky or unreliable tests
- [ ] Tests that are too slow
- [ ] Duplicate test logic

## Performance Considerations

### Writing Fast Tests
- Keep unit tests under 100ms each
- Mock expensive operations (API calls, file I/O)
- Use `beforeAll` for expensive setup that can be shared
- Avoid unnecessary DOM operations in unit tests

### CI/CD Optimization
- Tests run in parallel in our CI pipeline
- Failed tests fail fast to save time
- Coverage reports are generated automatically
- E2E tests run on multiple browsers

## Accessibility Testing

### Automated Testing
We use axe-core for automated accessibility testing:

```typescript
import { axe, toHaveNoViolations } from 'jest-axe';

expect.extend(toHaveNoViolations);

test('should have no accessibility violations', async () => {
  const { container } = render(<MyComponent />);
  const results = await axe(container);
  expect(results).toHaveNoViolations();
});
```

### Manual Testing Checklist
- [ ] Keyboard navigation works
- [ ] Focus indicators are visible
- [ ] ARIA labels are appropriate
- [ ] Color contrast is sufficient
- [ ] Screen reader compatibility

## Getting Help

### Resources
- **Documentation**: Check `/docs/testing/` for detailed guides
- **Examples**: Look at existing tests for patterns
- **Team Chat**: Ask questions in the testing channel
- **Code Reviews**: Learn from feedback on your tests

### When to Ask for Help
- You're stuck on a testing approach
- Tests are flaky or unreliable
- You need help with complex mocking
- You're unsure about test coverage
- Performance issues with tests

### How to Ask for Help
1. **Describe the Problem**: What are you trying to test?
2. **Show Your Code**: Include the test code and error messages
3. **Explain What You've Tried**: What approaches have you attempted?
4. **Provide Context**: What's the expected behavior?

## Advanced Topics (Week 2+)

### Custom Test Utilities
Learn to create reusable test utilities for common patterns.

### Performance Testing
Understand how to write performance tests and benchmarks.

### Visual Regression Testing
Learn about screenshot testing for UI components.

### Test Data Management
Advanced strategies for managing test data and fixtures.

### CI/CD Integration
Understanding how tests run in our deployment pipeline.

## Measuring Success

### Individual Metrics
- [ ] Can write unit tests independently
- [ ] Can write component tests with React Testing Library
- [ ] Can write integration tests with proper mocking
- [ ] Can debug failing tests effectively
- [ ] Understands when to use different test types

### Team Metrics
- [ ] Code coverage remains above thresholds
- [ ] Test suite execution time stays reasonable
- [ ] Number of flaky tests remains low
- [ ] Test-related bugs are minimal
- [ ] Team velocity is maintained

## Next Steps

After completing this onboarding:
1. **Practice Regularly**: Write tests for all new code
2. **Learn Advanced Patterns**: Explore complex testing scenarios
3. **Contribute to Testing Infrastructure**: Help improve our testing tools
4. **Mentor Others**: Help onboard new team members
5. **Stay Updated**: Keep up with testing best practices and new tools

## Feedback and Improvement

This onboarding guide is a living document. Please provide feedback on:
- What was helpful or confusing
- What topics need more detail
- What examples would be useful
- How the process could be improved

Your feedback helps us improve the onboarding experience for future team members.

Welcome to the team, and happy testing! 🧪