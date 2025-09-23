# Testing Checklist and Quick Reference

## Pre-Development Testing Checklist

### Before Writing Code
- [ ] Understand the requirements and acceptance criteria
- [ ] Identify testable behaviors and edge cases
- [ ] Plan test strategy (unit, integration, component, E2E)
- [ ] Set up test environment and dependencies

### Test Planning
- [ ] Identify critical user paths for E2E testing
- [ ] Plan mock strategies for external dependencies
- [ ] Consider accessibility and performance testing needs
- [ ] Review existing test patterns and utilities

## Development Testing Checklist

### Writing Tests
- [ ] Follow AAA pattern (Arrange, Act, Assert)
- [ ] Use descriptive test names
- [ ] Test one behavior per test
- [ ] Include positive and negative test cases
- [ ] Test edge cases and error conditions

### Unit Tests
- [ ] Test pure functions with various inputs
- [ ] Mock external dependencies
- [ ] Test error handling and edge cases
- [ ] Achieve minimum 90% code coverage
- [ ] Keep tests fast (< 100ms each)

### Component Tests
- [ ] Test component rendering with different props
- [ ] Test user interactions (clicks, form submissions)
- [ ] Test conditional rendering logic
- [ ] Test accessibility attributes
- [ ] Mock external API calls

### Integration Tests
- [ ] Test API endpoints with realistic data
- [ ] Test database operations with test data
- [ ] Test authentication and authorization
- [ ] Test external service integrations
- [ ] Clean up test data after each test

### E2E Tests
- [ ] Test complete user workflows
- [ ] Test critical business processes
- [ ] Test cross-browser compatibility
- [ ] Test responsive design
- [ ] Test accessibility with keyboard navigation

## Code Review Testing Checklist

### Test Quality
- [ ] Tests are readable and maintainable
- [ ] Test names clearly describe expected behavior
- [ ] Tests cover the happy path and edge cases
- [ ] Mocks are appropriate and not over-mocked
- [ ] Test data is realistic and minimal

### Coverage and Quality
- [ ] New code has appropriate test coverage
- [ ] Tests actually test the intended behavior
- [ ] No flaky or unreliable tests
- [ ] Tests run quickly and efficiently
- [ ] Test utilities are reused appropriately

### Integration
- [ ] Tests pass in CI/CD pipeline
- [ ] No test interference or dependencies
- [ ] Proper test cleanup and isolation
- [ ] Performance impact is acceptable

## Pre-Deployment Checklist

### Test Execution
- [ ] All unit tests pass
- [ ] All integration tests pass
- [ ] All component tests pass
- [ ] All E2E tests pass
- [ ] Coverage thresholds are met

### Quality Gates
- [ ] No accessibility violations detected
- [ ] Performance budgets are maintained
- [ ] Security tests pass (if applicable)
- [ ] Cross-browser tests pass
- [ ] Mobile responsiveness tests pass

### Documentation
- [ ] Test documentation is updated
- [ ] New testing patterns are documented
- [ ] Breaking changes are communicated
- [ ] Test maintenance notes are added

## Quick Reference Commands

### Running Tests
```bash
# Run all tests
npm test

# Run specific test types
npm run test:unit
npm run test:integration
npm run test:component
npm run test:e2e

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm test -- MyComponent.test.tsx

# Run tests matching pattern
npm test -- --testNamePattern="should handle click"

# Run tests in specific directory
npm test -- tests/unit/

# Debug tests
npm test -- --detectOpenHandles --forceExit
```

### Playwright E2E Commands
```bash
# Run E2E tests
npx playwright test

# Run E2E tests in headed mode
npx playwright test --headed

# Run specific test file
npx playwright test auth.spec.ts

# Run tests in specific browser
npx playwright test --project=chromium

# Debug E2E tests
npx playwright test --debug

# Generate test report
npx playwright show-report
```

### Coverage Commands
```bash
# Generate coverage report
npm run test:coverage

# View coverage report in browser
npm run coverage:open

# Check coverage thresholds
npm run coverage:check
```

## Common Test Patterns Quick Reference

### Basic Test Structure
```typescript
describe('ComponentName', () => {
  beforeEach(() => {
    // Setup before each test
  });

  afterEach(() => {
    // Cleanup after each test
  });

  it('should do something when condition is met', () => {
    // Arrange
    const input = 'test input';
    
    // Act
    const result = functionUnderTest(input);
    
    // Assert
    expect(result).toBe('expected output');
  });
});
```

### Component Test Pattern
```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

test('should handle user interaction', async () => {
  const user = userEvent.setup();
  const mockHandler = jest.fn();
  
  render(<Component onAction={mockHandler} />);
  
  await user.click(screen.getByRole('button'));
  
  expect(mockHandler).toHaveBeenCalledWith(expectedArgs);
});
```

### API Test Pattern
```typescript
import { server } from '../setup/msw';
import { rest } from 'msw';

test('should handle API response', async () => {
  server.use(
    rest.get('/api/data', (req, res, ctx) => {
      return res(ctx.json({ data: 'test' }));
    })
  );
  
  const result = await apiFunction();
  
  expect(result).toEqual({ data: 'test' });
});
```

### E2E Test Pattern
```typescript
import { test, expect } from '@playwright/test';

test('should complete user workflow', async ({ page }) => {
  await page.goto('/');
  
  await page.fill('[data-testid="input"]', 'test value');
  await page.click('[data-testid="submit"]');
  
  await expect(page.locator('[data-testid="result"]')).toContainText('success');
});
```

## Debugging Test Issues

### Common Issues and Quick Fixes

#### Tests Not Running
```bash
# Check Jest configuration
cat jest.config.js

# Clear Jest cache
npx jest --clearCache

# Check for syntax errors
npm run lint
```

#### Mock Issues
```typescript
// Reset mocks between tests
beforeEach(() => {
  jest.clearAllMocks();
});

// Check if function is mocked
console.log(jest.isMockFunction(myFunction));

// Restore original implementation
jest.restoreAllMocks();
```

#### Async Test Issues
```typescript
// Use async/await properly
test('async test', async () => {
  const result = await asyncFunction();
  expect(result).toBe('expected');
});

// Wait for elements in React Testing Library
await screen.findByText('async content');

// Wait for Playwright elements
await page.waitForSelector('[data-testid="element"]');
```

#### Coverage Issues
```typescript
// Exclude files from coverage
module.exports = {
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.tsx'
  ]
};

// Add coverage ignore comments
/* istanbul ignore next */
if (process.env.NODE_ENV === 'development') {
  // Development only code
}
```

## Performance Optimization

### Test Performance Tips
- Keep unit tests under 100ms each
- Use `describe.skip()` for temporarily disabled tests
- Group related tests in describe blocks
- Use `beforeAll` for expensive setup
- Mock heavy dependencies
- Run tests in parallel when possible

### CI/CD Optimization
- Cache node_modules and test dependencies
- Run test types in parallel
- Use test sharding for large test suites
- Fail fast on critical test failures
- Generate and store test reports

## Accessibility Testing Quick Reference

### Automated Accessibility Tests
```typescript
import { axe, toHaveNoViolations } from 'jest-axe';

expect.extend(toHaveNoViolations);

test('should have no accessibility violations', async () => {
  const { container } = render(<Component />);
  const results = await axe(container);
  expect(results).toHaveNoViolations();
});
```

### Manual Accessibility Checklist
- [ ] Keyboard navigation works correctly
- [ ] Focus indicators are visible
- [ ] ARIA labels and roles are appropriate
- [ ] Color contrast meets WCAG standards
- [ ] Screen reader announcements are clear
- [ ] Form labels are properly associated

## Security Testing Considerations

### Input Validation Tests
- [ ] Test with malicious input strings
- [ ] Test SQL injection attempts
- [ ] Test XSS attack vectors
- [ ] Test file upload security
- [ ] Test authentication bypass attempts

### API Security Tests
- [ ] Test unauthorized access attempts
- [ ] Test rate limiting
- [ ] Test input sanitization
- [ ] Test CORS configuration
- [ ] Test sensitive data exposure

This checklist serves as a comprehensive guide for maintaining high-quality testing practices throughout the development lifecycle.