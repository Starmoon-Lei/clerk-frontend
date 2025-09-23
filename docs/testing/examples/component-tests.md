# Component Test Examples

This document provides comprehensive examples of component tests using React Testing Library for the Clerk application.

## Basic Component Testing

### Simple UI Component
```typescript
// components/ui/button.tsx
import { ButtonHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'destructive' | 'outline';
  size?: 'default' | 'sm' | 'lg';
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', ...props }, ref) => {
    return (
      <button
        className={cn(
          'inline-flex items-center justify-center rounded-md font-medium',
          variant === 'default' && 'bg-primary text-primary-foreground',
          variant === 'destructive' && 'bg-destructive text-destructive-foreground',
          size === 'default' && 'h-10 px-4 py-2',
          size === 'sm' && 'h-9 px-3',
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);

// tests/components/ui/button.test.tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from '@/components/ui/button';

describe('Button Component', () => {
  it('should render with default props', () => {
    render(<Button>Click me</Button>);
    
    const button = screen.getByRole('button', { name: 'Click me' });
    expect(button).toBeInTheDocument();
    expect(button).toHaveClass('bg-primary', 'h-10');
  });

  it('should apply variant classes correctly', () => {
    render(<Button variant="destructive">Delete</Button>);
    
    const button = screen.getByRole('button', { name: 'Delete' });
    expect(button).toHaveClass('bg-destructive');
  });

  it('should apply size classes correctly', () => {
    render(<Button size="sm">Small</Button>);
    
    const button = screen.getByRole('button', { name: 'Small' });
    expect(button).toHaveClass('h-9');
  });

  it('should handle click events', async () => {
    const user = userEvent.setup();
    const handleClick = jest.fn();
    
    render(<Button onClick={handleClick}>Click me</Button>);
    
    const button = screen.getByRole('button', { name: 'Click me' });
    await user.click(button);
    
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('should be disabled when disabled prop is true', () => {
    render(<Button disabled>Disabled</Button>);
    
    const button = screen.getByRole('button', { name: 'Disabled' });
    expect(button).toBeDisabled();
  });

  it('should apply custom className', () => {
    render(<Button className="custom-class">Custom</Button>);
    
    const button = screen.getByRole('button', { name: 'Custom' });
    expect(button).toHaveClass('custom-class');
  });
});
```

## Testing Components with State

### Component with Internal State
```typescript
// components/ai-elements/prompt-input.tsx
import { useState } from 'react';
import { Button } from '@/components/ui/button';

interface PromptInputProps {
  onSubmit: (message: string) => void;
  disabled?: boolean;
}

export function PromptInput({ onSubmit, disabled }: PromptInputProps) {
  const [message, setMessage] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim()) {
      onSubmit(message.trim());
      setMessage('');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Type your message..."
        disabled={disabled}
        className="flex-1 resize-none"
        rows={3}
      />
      <Button type="submit" disabled={disabled || !message.trim()}>
        Send
      </Button>
    </form>
  );
}

// tests/components/ai-elements/prompt-input.test.tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PromptInput } from '@/components/ai-elements/prompt-input';

describe('PromptInput Component', () => {
  const mockOnSubmit = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render textarea and submit button', () => {
    render(<PromptInput onSubmit={mockOnSubmit} />);
    
    expect(screen.getByPlaceholderText('Type your message...')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Send' })).toBeInTheDocument();
  });

  it('should update textarea value when typing', async () => {
    const user = userEvent.setup();
    render(<PromptInput onSubmit={mockOnSubmit} />);
    
    const textarea = screen.getByPlaceholderText('Type your message...');
    await user.type(textarea, 'Hello world');
    
    expect(textarea).toHaveValue('Hello world');
  });

  it('should enable submit button when message is not empty', async () => {
    const user = userEvent.setup();
    render(<PromptInput onSubmit={mockOnSubmit} />);
    
    const textarea = screen.getByPlaceholderText('Type your message...');
    const submitButton = screen.getByRole('button', { name: 'Send' });
    
    expect(submitButton).toBeDisabled();
    
    await user.type(textarea, 'Hello');
    expect(submitButton).toBeEnabled();
  });

  it('should call onSubmit with trimmed message when form is submitted', async () => {
    const user = userEvent.setup();
    render(<PromptInput onSubmit={mockOnSubmit} />);
    
    const textarea = screen.getByPlaceholderText('Type your message...');
    const submitButton = screen.getByRole('button', { name: 'Send' });
    
    await user.type(textarea, '  Hello world  ');
    await user.click(submitButton);
    
    expect(mockOnSubmit).toHaveBeenCalledWith('Hello world');
  });

  it('should clear textarea after successful submission', async () => {
    const user = userEvent.setup();
    render(<PromptInput onSubmit={mockOnSubmit} />);
    
    const textarea = screen.getByPlaceholderText('Type your message...');
    
    await user.type(textarea, 'Hello world');
    await user.click(screen.getByRole('button', { name: 'Send' }));
    
    expect(textarea).toHaveValue('');
  });

  it('should not submit when message is only whitespace', async () => {
    const user = userEvent.setup();
    render(<PromptInput onSubmit={mockOnSubmit} />);
    
    const textarea = screen.getByPlaceholderText('Type your message...');
    
    await user.type(textarea, '   ');
    await user.click(screen.getByRole('button', { name: 'Send' }));
    
    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it('should be disabled when disabled prop is true', () => {
    render(<PromptInput onSubmit={mockOnSubmit} disabled />);
    
    const textarea = screen.getByPlaceholderText('Type your message...');
    const submitButton = screen.getByRole('button', { name: 'Send' });
    
    expect(textarea).toBeDisabled();
    expect(submitButton).toBeDisabled();
  });
});
```

## Testing Components with Context

### Component Using Session Context
```typescript
// components/ai-elements/conversation.tsx
import { useSession } from 'next-auth/react';
import { Message } from '@/components/ai-elements/message';

interface ConversationProps {
  messages: Array<{
    id: string;
    content: string;
    role: 'user' | 'assistant';
  }>;
}

export function Conversation({ messages }: ConversationProps) {
  const { data: session, status } = useSession();

  if (status === 'loading') {
    return <div>Loading...</div>;
  }

  if (!session) {
    return <div>Please sign in to view conversations</div>;
  }

  return (
    <div className="conversation">
      {messages.length === 0 ? (
        <div>No messages yet</div>
      ) : (
        messages.map((message) => (
          <Message key={message.id} message={message} />
        ))
      )}
    </div>
  );
}

// tests/components/ai-elements/conversation.test.tsx
import { render, screen } from '@testing-library/react';
import { useSession } from 'next-auth/react';
import { Conversation } from '@/components/ai-elements/conversation';

// Mock next-auth
jest.mock('next-auth/react');
const mockUseSession = useSession as jest.MockedFunction<typeof useSession>;

// Mock Message component
jest.mock('@/components/ai-elements/message', () => ({
  Message: ({ message }: any) => <div data-testid="message">{message.content}</div>,
}));

describe('Conversation Component', () => {
  const mockMessages = [
    { id: '1', content: 'Hello', role: 'user' as const },
    { id: '2', content: 'Hi there!', role: 'assistant' as const },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should show loading state when session is loading', () => {
    mockUseSession.mockReturnValue({
      data: null,
      status: 'loading',
    } as any);

    render(<Conversation messages={mockMessages} />);
    
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('should show sign in message when not authenticated', () => {
    mockUseSession.mockReturnValue({
      data: null,
      status: 'unauthenticated',
    } as any);

    render(<Conversation messages={mockMessages} />);
    
    expect(screen.getByText('Please sign in to view conversations')).toBeInTheDocument();
  });

  it('should render messages when authenticated', () => {
    mockUseSession.mockReturnValue({
      data: { user: { id: '1', email: 'test@example.com' } },
      status: 'authenticated',
    } as any);

    render(<Conversation messages={mockMessages} />);
    
    expect(screen.getByText('Hello')).toBeInTheDocument();
    expect(screen.getByText('Hi there!')).toBeInTheDocument();
    expect(screen.getAllByTestId('message')).toHaveLength(2);
  });

  it('should show empty state when no messages', () => {
    mockUseSession.mockReturnValue({
      data: { user: { id: '1', email: 'test@example.com' } },
      status: 'authenticated',
    } as any);

    render(<Conversation messages={[]} />);
    
    expect(screen.getByText('No messages yet')).toBeInTheDocument();
  });
});
```

## Testing Components with Custom Providers

### Custom Test Wrapper
```typescript
// tests/helpers/test-wrapper.tsx
import { ReactNode } from 'react';
import { SessionProvider } from 'next-auth/react';
import { render, RenderOptions } from '@testing-library/react';

interface TestWrapperProps {
  children: ReactNode;
  session?: any;
}

function TestWrapper({ children, session = null }: TestWrapperProps) {
  return (
    <SessionProvider session={session}>
      {children}
    </SessionProvider>
  );
}

interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  session?: any;
}

export function renderWithProviders(
  ui: React.ReactElement,
  { session, ...renderOptions }: CustomRenderOptions = {}
) {
  return render(ui, {
    wrapper: ({ children }) => (
      <TestWrapper session={session}>{children}</TestWrapper>
    ),
    ...renderOptions,
  });
}

// Usage in tests
// tests/components/protected-component.test.tsx
import { screen } from '@testing-library/react';
import { renderWithProviders } from '@/tests/helpers/test-wrapper';
import { ProtectedComponent } from '@/components/protected-component';

describe('ProtectedComponent', () => {
  it('should render when user is authenticated', () => {
    const mockSession = {
      user: { id: '1', email: 'test@example.com', name: 'Test User' },
    };

    renderWithProviders(<ProtectedComponent />, { session: mockSession });
    
    expect(screen.getByText('Welcome, Test User!')).toBeInTheDocument();
  });

  it('should show login prompt when not authenticated', () => {
    renderWithProviders(<ProtectedComponent />);
    
    expect(screen.getByText('Please log in')).toBeInTheDocument();
  });
});
```

## Testing Form Components

### Form with Validation
```typescript
// components/forms/contact-form.tsx
import { useState } from 'react';
import { Button } from '@/components/ui/button';

interface ContactFormProps {
  onSubmit: (data: { name: string; email: string; message: string }) => void;
}

export function ContactForm({ onSubmit }: ContactFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }

    if (!formData.message.trim()) {
      newErrors.message = 'Message is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      onSubmit(formData);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="name">Name</label>
        <input
          id="name"
          type="text"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          className={errors.name ? 'border-red-500' : ''}
        />
        {errors.name && <span className="error">{errors.name}</span>}
      </div>

      <div>
        <label htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          className={errors.email ? 'border-red-500' : ''}
        />
        {errors.email && <span className="error">{errors.email}</span>}
      </div>

      <div>
        <label htmlFor="message">Message</label>
        <textarea
          id="message"
          value={formData.message}
          onChange={(e) => setFormData({ ...formData, message: e.target.value })}
          className={errors.message ? 'border-red-500' : ''}
        />
        {errors.message && <span className="error">{errors.message}</span>}
      </div>

      <Button type="submit">Submit</Button>
    </form>
  );
}

// tests/components/forms/contact-form.test.tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ContactForm } from '@/components/forms/contact-form';

describe('ContactForm Component', () => {
  const mockOnSubmit = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render all form fields', () => {
    render(<ContactForm onSubmit={mockOnSubmit} />);
    
    expect(screen.getByLabelText('Name')).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Message')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Submit' })).toBeInTheDocument();
  });

  it('should show validation errors for empty fields', async () => {
    const user = userEvent.setup();
    render(<ContactForm onSubmit={mockOnSubmit} />);
    
    const submitButton = screen.getByRole('button', { name: 'Submit' });
    await user.click(submitButton);
    
    expect(screen.getByText('Name is required')).toBeInTheDocument();
    expect(screen.getByText('Email is required')).toBeInTheDocument();
    expect(screen.getByText('Message is required')).toBeInTheDocument();
    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it('should show email validation error for invalid email', async () => {
    const user = userEvent.setup();
    render(<ContactForm onSubmit={mockOnSubmit} />);
    
    const emailInput = screen.getByLabelText('Email');
    await user.type(emailInput, 'invalid-email');
    
    const submitButton = screen.getByRole('button', { name: 'Submit' });
    await user.click(submitButton);
    
    expect(screen.getByText('Email is invalid')).toBeInTheDocument();
  });

  it('should submit form with valid data', async () => {
    const user = userEvent.setup();
    render(<ContactForm onSubmit={mockOnSubmit} />);
    
    await user.type(screen.getByLabelText('Name'), 'John Doe');
    await user.type(screen.getByLabelText('Email'), 'john@example.com');
    await user.type(screen.getByLabelText('Message'), 'Hello world');
    
    const submitButton = screen.getByRole('button', { name: 'Submit' });
    await user.click(submitButton);
    
    expect(mockOnSubmit).toHaveBeenCalledWith({
      name: 'John Doe',
      email: 'john@example.com',
      message: 'Hello world',
    });
  });

  it('should clear errors when valid input is provided', async () => {
    const user = userEvent.setup();
    render(<ContactForm onSubmit={mockOnSubmit} />);
    
    // First, trigger validation errors
    const submitButton = screen.getByRole('button', { name: 'Submit' });
    await user.click(submitButton);
    
    expect(screen.getByText('Name is required')).toBeInTheDocument();
    
    // Then, provide valid input
    const nameInput = screen.getByLabelText('Name');
    await user.type(nameInput, 'John Doe');
    await user.click(submitButton);
    
    expect(screen.queryByText('Name is required')).not.toBeInTheDocument();
  });
});
```

## Testing Accessibility

### Component with Accessibility Features
```typescript
// tests/components/accessibility/button.accessibility.test.tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import { Button } from '@/components/ui/button';

expect.extend(toHaveNoViolations);

describe('Button Accessibility', () => {
  it('should not have accessibility violations', async () => {
    const { container } = render(<Button>Click me</Button>);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('should be keyboard accessible', async () => {
    const user = userEvent.setup();
    const handleClick = jest.fn();
    
    render(<Button onClick={handleClick}>Click me</Button>);
    
    const button = screen.getByRole('button', { name: 'Click me' });
    
    // Test keyboard navigation
    await user.tab();
    expect(button).toHaveFocus();
    
    // Test keyboard activation
    await user.keyboard('{Enter}');
    expect(handleClick).toHaveBeenCalledTimes(1);
    
    await user.keyboard(' ');
    expect(handleClick).toHaveBeenCalledTimes(2);
  });

  it('should have proper ARIA attributes when disabled', () => {
    render(<Button disabled>Disabled button</Button>);
    
    const button = screen.getByRole('button', { name: 'Disabled button' });
    expect(button).toHaveAttribute('aria-disabled', 'true');
  });
});
```

## Best Practices for Component Tests

### 1. Test User Behavior, Not Implementation
```typescript
// Good - tests user behavior
it('should show success message when form is submitted', async () => {
  const user = userEvent.setup();
  render(<MyForm />);
  
  await user.type(screen.getByLabelText('Email'), 'test@example.com');
  await user.click(screen.getByRole('button', { name: 'Submit' }));
  
  expect(screen.getByText('Form submitted successfully')).toBeInTheDocument();
});

// Avoid - tests implementation details
it('should call setState when input changes', () => {
  const component = render(<MyForm />);
  // Testing internal state changes
});
```

### 2. Use Semantic Queries
```typescript
// Good - semantic queries
screen.getByRole('button', { name: 'Submit' })
screen.getByLabelText('Email address')
screen.getByText('Welcome message')

// Avoid - implementation-specific queries
screen.getByClassName('submit-btn')
screen.getById('email-input')
```

### 3. Test Edge Cases
```typescript
describe('SearchInput', () => {
  it('should handle empty search query');
  it('should handle very long search query');
  it('should handle special characters in query');
  it('should handle network errors gracefully');
});
```

### 4. Use Custom Render Functions
```typescript
// Create reusable render functions for components that need providers
function renderWithRouter(ui: React.ReactElement, { route = '/' } = {}) {
  return render(ui, { wrapper: ({ children }) => <Router>{children}</Router> });
}
```