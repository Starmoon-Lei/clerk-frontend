# End-to-End Test Examples

## Overview

This document provides comprehensive examples of end-to-end (E2E) tests using Playwright for the Clerk business assistant application. E2E tests verify complete user workflows from start to finish.

## Basic Test Structure

### Test File Setup
```typescript
// tests/e2e/auth.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto('/');
  });

  test('should sign in with Google OAuth', async ({ page }) => {
    // Test implementation
  });
});
```

### Page Object Model
```typescript
// tests/e2e/pages/auth.page.ts
export class AuthPage {
  constructor(private page: Page) {}

  async navigateToSignIn() {
    await this.page.goto('/auth/signin');
  }

  async clickGoogleSignIn() {
    await this.page.click('[data-testid="google-signin-button"]');
  }

  async waitForRedirectToDashboard() {
    await this.page.waitForURL('/dashboard');
  }

  async isSignedIn() {
    return await this.page.isVisible('[data-testid="user-menu"]');
  }
}
```

## Authentication Tests

### Google OAuth Sign-In Flow
```typescript
// tests/e2e/auth.spec.ts
import { test, expect } from '@playwright/test';
import { AuthPage } from './pages/auth.page';

test.describe('Authentication', () => {
  let authPage: AuthPage;

  test.beforeEach(async ({ page }) => {
    authPage = new AuthPage(page);
  });

  test('should complete Google OAuth sign-in flow', async ({ page }) => {
    // Navigate to sign-in page
    await authPage.navigateToSignIn();

    // Verify sign-in page elements
    await expect(page.locator('h1')).toContainText('Sign In');
    await expect(page.locator('[data-testid="google-signin-button"]')).toBeVisible();

    // Mock Google OAuth response for testing
    await page.route('**/api/auth/signin/google', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          url: '/dashboard',
          user: {
            id: 'test-user-id',
            email: 'test@example.com',
            name: 'Test User'
          }
        })
      });
    });

    // Click Google sign-in button
    await authPage.clickGoogleSignIn();

    // Wait for redirect to dashboard
    await authPage.waitForRedirectToDashboard();

    // Verify successful sign-in
    expect(await authPage.isSignedIn()).toBe(true);
    await expect(page.locator('[data-testid="welcome-message"]')).toContainText('Welcome, Test User');
  });

  test('should handle sign-in errors gracefully', async ({ page }) => {
    await authPage.navigateToSignIn();

    // Mock OAuth error response
    await page.route('**/api/auth/signin/google', async route => {
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'OAuth provider error'
        })
      });
    });

    await authPage.clickGoogleSignIn();

    // Verify error message is displayed
    await expect(page.locator('[data-testid="error-message"]')).toContainText('Sign-in failed');
    await expect(page.locator('[data-testid="error-details"]')).toContainText('OAuth provider error');
  });

  test('should sign out successfully', async ({ page }) => {
    // First sign in (using test authentication state)
    await page.goto('/dashboard');
    await page.evaluate(() => {
      localStorage.setItem('test-auth', JSON.stringify({
        user: { id: 'test-user', email: 'test@example.com', name: 'Test User' },
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      }));
    });
    await page.reload();

    // Verify signed in state
    expect(await authPage.isSignedIn()).toBe(true);

    // Click sign out
    await page.click('[data-testid="user-menu"]');
    await page.click('[data-testid="sign-out-button"]');

    // Wait for redirect to home page
    await page.waitForURL('/');

    // Verify signed out state
    expect(await authPage.isSignedIn()).toBe(false);
    await expect(page.locator('[data-testid="sign-in-button"]')).toBeVisible();
  });
});
```

### Session Persistence Tests
```typescript
// tests/e2e/session.spec.ts
test.describe('Session Management', () => {
  test('should persist session across browser refresh', async ({ page }) => {
    // Sign in and navigate to dashboard
    await page.goto('/dashboard');
    await page.evaluate(() => {
      localStorage.setItem('test-auth', JSON.stringify({
        user: { id: 'test-user', email: 'test@example.com' },
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      }));
    });
    await page.reload();

    // Verify user is still signed in after refresh
    await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
    await expect(page.locator('[data-testid="dashboard-content"]')).toBeVisible();

    // Refresh the page
    await page.reload();

    // Verify session persists
    await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
    await expect(page.locator('[data-testid="dashboard-content"]')).toBeVisible();
  });

  test('should redirect to sign-in when session expires', async ({ page }) => {
    // Set expired session
    await page.goto('/dashboard');
    await page.evaluate(() => {
      localStorage.setItem('test-auth', JSON.stringify({
        user: { id: 'test-user', email: 'test@example.com' },
        expires: new Date(Date.now() - 1000).toISOString() // Expired
      }));
    });

    // Try to access protected route
    await page.goto('/dashboard');

    // Should redirect to sign-in
    await page.waitForURL('/auth/signin');
    await expect(page.locator('h1')).toContainText('Sign In');
  });
});
```

## Chat Functionality Tests

### Basic Chat Flow
```typescript
// tests/e2e/chat.spec.ts
import { test, expect } from '@playwright/test';

test.describe('AI Chat Functionality', () => {
  test.beforeEach(async ({ page }) => {
    // Set up authenticated state
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('test-auth', JSON.stringify({
        user: { id: 'test-user', email: 'test@example.com', name: 'Test User' },
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      }));
    });
    await page.goto('/chat');
  });

  test('should send message and receive AI response', async ({ page }) => {
    // Mock AI API response
    await page.route('**/api/chat', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          message: 'This is a test AI response to your question.',
          id: 'response-1',
          timestamp: new Date().toISOString()
        })
      });
    });

    // Type message in chat input
    const chatInput = page.locator('[data-testid="chat-input"]');
    await chatInput.fill('Hello, can you help me with a question?');

    // Send message
    await page.click('[data-testid="send-button"]');

    // Verify user message appears
    await expect(page.locator('[data-testid="user-message"]').last()).toContainText(
      'Hello, can you help me with a question?'
    );

    // Verify AI response appears
    await expect(page.locator('[data-testid="ai-message"]').last()).toContainText(
      'This is a test AI response to your question.'
    );

    // Verify input is cleared
    await expect(chatInput).toHaveValue('');
  });

  test('should handle streaming AI responses', async ({ page }) => {
    // Mock streaming response
    await page.route('**/api/chat', async route => {
      const chunks = [
        'This is ',
        'a streaming ',
        'AI response ',
        'that arrives ',
        'in chunks.'
      ];

      // Simulate streaming by sending chunks with delays
      let responseText = '';
      for (const chunk of chunks) {
        responseText += chunk;
        await page.evaluate((text) => {
          window.dispatchEvent(new CustomEvent('ai-stream-chunk', { detail: text }));
        }, responseText);
        await page.waitForTimeout(100);
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          message: responseText,
          id: 'streaming-response-1'
        })
      });
    });

    await page.locator('[data-testid="chat-input"]').fill('Tell me a story');
    await page.click('[data-testid="send-button"]');

    // Verify streaming response builds up
    await expect(page.locator('[data-testid="ai-message"]').last()).toContainText(
      'This is a streaming AI response that arrives in chunks.'
    );
  });

  test('should handle chat errors gracefully', async ({ page }) => {
    // Mock API error
    await page.route('**/api/chat', async route => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'AI service temporarily unavailable'
        })
      });
    });

    await page.locator('[data-testid="chat-input"]').fill('This will cause an error');
    await page.click('[data-testid="send-button"]');

    // Verify error message is displayed
    await expect(page.locator('[data-testid="error-message"]')).toContainText(
      'Sorry, I encountered an error. Please try again.'
    );

    // Verify retry button is available
    await expect(page.locator('[data-testid="retry-button"]')).toBeVisible();
  });
});
```

### File Upload in Chat
```typescript
test.describe('File Upload in Chat', () => {
  test('should upload and process files in chat', async ({ page }) => {
    await page.goto('/chat');

    // Mock file upload API
    await page.route('**/api/upload-files', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          files: [
            {
              id: 'file-1',
              name: 'test-document.pdf',
              size: 1024,
              type: 'application/pdf',
              content: 'Extracted text from PDF document'
            }
          ]
        })
      });
    });

    // Mock chat API with file context
    await page.route('**/api/chat', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          message: 'I can see you uploaded a PDF document. Based on the content, I can help you with...',
          id: 'response-with-file'
        })
      });
    });

    // Upload file
    const fileInput = page.locator('[data-testid="file-input"]');
    await fileInput.setInputFiles({
      name: 'test-document.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('PDF content')
    });

    // Verify file appears in upload area
    await expect(page.locator('[data-testid="uploaded-file"]')).toContainText('test-document.pdf');

    // Send message with file
    await page.locator('[data-testid="chat-input"]').fill('Can you analyze this document?');
    await page.click('[data-testid="send-button"]');

    // Verify AI response acknowledges the file
    await expect(page.locator('[data-testid="ai-message"]').last()).toContainText(
      'I can see you uploaded a PDF document'
    );
  });

  test('should handle file upload errors', async ({ page }) => {
    await page.goto('/chat');

    // Mock file upload error
    await page.route('**/api/upload-files', async route => {
      await route.fulfill({
        status: 413,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'File too large. Maximum size is 10MB.'
        })
      });
    });

    // Try to upload large file
    const fileInput = page.locator('[data-testid="file-input"]');
    await fileInput.setInputFiles({
      name: 'large-file.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.alloc(15 * 1024 * 1024) // 15MB file
    });

    // Verify error message
    await expect(page.locator('[data-testid="upload-error"]')).toContainText(
      'File too large. Maximum size is 10MB.'
    );
  });
});
```

## Navigation and Page Tests

### Multi-Page Navigation
```typescript
// tests/e2e/navigation.spec.ts
test.describe('Navigation', () => {
  test('should navigate between pages correctly', async ({ page }) => {
    // Start at home page
    await page.goto('/');
    await expect(page.locator('h1')).toContainText('Welcome to Clerk Assistant');

    // Navigate to about page
    await page.click('[data-testid="nav-about"]');
    await page.waitForURL('/about');
    await expect(page.locator('h1')).toContainText('About');

    // Navigate to chat (should redirect to sign-in)
    await page.click('[data-testid="nav-chat"]');
    await page.waitForURL('/auth/signin');
    await expect(page.locator('h1')).toContainText('Sign In');

    // Sign in and navigate to chat
    await page.evaluate(() => {
      localStorage.setItem('test-auth', JSON.stringify({
        user: { id: 'test-user', email: 'test@example.com' },
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      }));
    });
    await page.goto('/chat');
    await expect(page.locator('[data-testid="chat-interface"]')).toBeVisible();
  });

  test('should handle browser back/forward navigation', async ({ page }) => {
    // Navigate through pages
    await page.goto('/');
    await page.click('[data-testid="nav-about"]');
    await page.waitForURL('/about');

    // Use browser back button
    await page.goBack();
    await page.waitForURL('/');
    await expect(page.locator('h1')).toContainText('Welcome');

    // Use browser forward button
    await page.goForward();
    await page.waitForURL('/about');
    await expect(page.locator('h1')).toContainText('About');
  });
});
```

### Form Interactions
```typescript
test.describe('Form Interactions', () => {
  test('should validate and submit contact form', async ({ page }) => {
    await page.goto('/contact');

    // Test form validation
    await page.click('[data-testid="submit-button"]');
    await expect(page.locator('[data-testid="name-error"]')).toContainText('Name is required');
    await expect(page.locator('[data-testid="email-error"]')).toContainText('Email is required');

    // Fill form with invalid email
    await page.fill('[data-testid="name-input"]', 'John Doe');
    await page.fill('[data-testid="email-input"]', 'invalid-email');
    await page.click('[data-testid="submit-button"]');
    await expect(page.locator('[data-testid="email-error"]')).toContainText('Invalid email format');

    // Fill form correctly
    await page.fill('[data-testid="email-input"]', 'john@example.com');
    await page.fill('[data-testid="message-input"]', 'This is a test message');

    // Mock form submission
    await page.route('**/api/contact', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, id: 'contact-1' })
      });
    });

    await page.click('[data-testid="submit-button"]');

    // Verify success message
    await expect(page.locator('[data-testid="success-message"]')).toContainText(
      'Thank you for your message. We\'ll get back to you soon!'
    );
  });
});
```

## Responsive Design Tests

### Mobile and Desktop Views
```typescript
test.describe('Responsive Design', () => {
  test('should display mobile navigation on small screens', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');

    // Verify mobile menu is hidden initially
    await expect(page.locator('[data-testid="mobile-menu"]')).not.toBeVisible();

    // Click hamburger menu
    await page.click('[data-testid="hamburger-menu"]');

    // Verify mobile menu appears
    await expect(page.locator('[data-testid="mobile-menu"]')).toBeVisible();
    await expect(page.locator('[data-testid="mobile-nav-chat"]')).toBeVisible();
    await expect(page.locator('[data-testid="mobile-nav-about"]')).toBeVisible();
  });

  test('should display desktop navigation on large screens', async ({ page }) => {
    // Set desktop viewport
    await page.setViewportSize({ width: 1200, height: 800 });
    await page.goto('/');

    // Verify desktop navigation is visible
    await expect(page.locator('[data-testid="desktop-nav"]')).toBeVisible();
    await expect(page.locator('[data-testid="hamburger-menu"]')).not.toBeVisible();
  });

  test('should adapt chat interface for mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/chat');

    // Verify mobile chat layout
    await expect(page.locator('[data-testid="chat-container"]')).toHaveClass(/mobile-layout/);
    await expect(page.locator('[data-testid="chat-input"]')).toBeVisible();
    await expect(page.locator('[data-testid="send-button"]')).toBeVisible();
  });
});
```

## Accessibility Tests

### Keyboard Navigation
```typescript
test.describe('Accessibility', () => {
  test('should support keyboard navigation', async ({ page }) => {
    await page.goto('/');

    // Test tab navigation
    await page.keyboard.press('Tab');
    await expect(page.locator('[data-testid="nav-about"]')).toBeFocused();

    await page.keyboard.press('Tab');
    await expect(page.locator('[data-testid="nav-chat"]')).toBeFocused();

    // Test Enter key activation
    await page.keyboard.press('Enter');
    await page.waitForURL('/auth/signin');
  });

  test('should have proper ARIA labels and roles', async ({ page }) => {
    await page.goto('/chat');

    // Verify ARIA attributes
    await expect(page.locator('[data-testid="chat-input"]')).toHaveAttribute('aria-label', 'Type your message');
    await expect(page.locator('[data-testid="send-button"]')).toHaveAttribute('aria-label', 'Send message');
    await expect(page.locator('[data-testid="chat-messages"]')).toHaveAttribute('role', 'log');
  });

  test('should announce dynamic content to screen readers', async ({ page }) => {
    await page.goto('/chat');

    // Mock AI response
    await page.route('**/api/chat', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          message: 'AI response for screen reader test'
        })
      });
    });

    await page.fill('[data-testid="chat-input"]', 'Test message');
    await page.click('[data-testid="send-button"]');

    // Verify aria-live region is updated
    await expect(page.locator('[data-testid="screen-reader-announcements"]')).toContainText(
      'AI response received'
    );
  });
});
```

## Performance Tests

### Page Load Performance
```typescript
test.describe('Performance', () => {
  test('should load pages within acceptable time limits', async ({ page }) => {
    const startTime = Date.now();
    
    await page.goto('/');
    
    // Wait for page to be fully loaded
    await page.waitForLoadState('networkidle');
    
    const loadTime = Date.now() - startTime;
    
    // Verify page loads within 3 seconds
    expect(loadTime).toBeLessThan(3000);
    
    // Verify critical elements are visible
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('[data-testid="main-content"]')).toBeVisible();
  });

  test('should handle large chat conversations efficiently', async ({ page }) => {
    await page.goto('/chat');

    // Mock API to return large conversation
    await page.route('**/api/chat/history', async route => {
      const messages = Array.from({ length: 100 }, (_, i) => ({
        id: `msg-${i}`,
        content: `Message ${i} content`,
        role: i % 2 === 0 ? 'user' : 'assistant',
        timestamp: new Date(Date.now() - (100 - i) * 60000).toISOString()
      }));

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ messages })
      });
    });

    const startTime = Date.now();
    
    // Load conversation history
    await page.click('[data-testid="load-history-button"]');
    
    // Wait for messages to render
    await expect(page.locator('[data-testid="chat-message"]')).toHaveCount(100);
    
    const renderTime = Date.now() - startTime;
    
    // Verify rendering completes within reasonable time
    expect(renderTime).toBeLessThan(2000);
  });
});
```

## Test Utilities and Helpers

### Custom Test Fixtures
```typescript
// tests/e2e/fixtures/auth.fixture.ts
import { test as base } from '@playwright/test';

type AuthFixtures = {
  authenticatedPage: Page;
};

export const test = base.extend<AuthFixtures>({
  authenticatedPage: async ({ page }, use) => {
    // Set up authenticated state
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('test-auth', JSON.stringify({
        user: { id: 'test-user', email: 'test@example.com', name: 'Test User' },
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      }));
    });
    
    await use(page);
  }
});
```

### Test Data Helpers
```typescript
// tests/e2e/helpers/test-data.ts
export const createTestChatHistory = (count: number) => {
  return Array.from({ length: count }, (_, i) => ({
    id: `msg-${i}`,
    content: `Test message ${i + 1}`,
    role: i % 2 === 0 ? 'user' : 'assistant',
    timestamp: new Date(Date.now() - (count - i) * 60000).toISOString()
  }));
};

export const mockApiResponses = {
  successfulAuth: {
    user: { id: 'test-user', email: 'test@example.com', name: 'Test User' },
    session: { expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() }
  },
  
  aiResponse: (content: string) => ({
    message: content,
    id: `response-${Date.now()}`,
    timestamp: new Date().toISOString()
  }),
  
  fileUploadSuccess: (filename: string) => ({
    files: [{
      id: `file-${Date.now()}`,
      name: filename,
      size: 1024,
      type: 'application/pdf'
    }]
  })
};
```

This comprehensive set of E2E test examples covers all critical user flows and provides patterns for testing complex interactions in the Clerk business assistant application.