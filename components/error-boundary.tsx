'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

/**
 * Production Error Boundary - Catches React errors and provides graceful fallback UI
 * Prevents entire application crashes from single component failures
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error Boundary caught an error:', error, errorInfo);

    // Log to production monitoring service (placeholder for implementation)
    if (typeof window !== 'undefined' && process.env.NODE_ENV === 'production') {
      // In production, you'd send this to your monitoring service
      // analytics.track('react_error_boundary', {
      //   error: error.message,
      //   stack: error.stack,
      //   componentStack: errorInfo.componentStack,
      //   timestamp: new Date().toISOString(),
      // });
    }

    this.setState({
      error,
      errorInfo,
    });
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6 text-center">
            <AlertTriangle className="mx-auto h-12 w-12 text-red-500 mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Something went wrong
            </h2>
            <p className="text-gray-600 mb-6">
              We&apos;re sorry, but something unexpected happened. Please try again.
            </p>

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="text-left bg-gray-100 rounded p-3 mb-4 text-sm">
                <summary className="font-medium cursor-pointer text-gray-700">
                  Error Details (Development Only)
                </summary>
                <div className="mt-2 text-xs text-gray-600">
                  <strong>Error:</strong> {this.state.error.message}
                  <br />
                  <strong>Stack:</strong>
                  <pre className="whitespace-pre-wrap mt-1 text-xs">
                    {this.state.error.stack}
                  </pre>
                </div>
              </details>
            )}

            <button
              onClick={this.handleRetry}
              className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md transition-colors duration-200"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Chat Error Boundary - Specialized error boundary for chat components
 * Provides chat-specific error handling without breaking the entire UI
 */
export function ChatErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary
      fallback={
        <div className="flex items-center justify-center h-64 bg-gray-50 rounded-lg border">
          <div className="text-center">
            <AlertTriangle className="mx-auto h-8 w-8 text-orange-500 mb-2" />
            <p className="text-gray-600 font-medium">Chat Unavailable</p>
            <p className="text-gray-500 text-sm mt-1">
              Please refresh the page to continue chatting
            </p>
          </div>
        </div>
      }
    >
      {children}
    </ErrorBoundary>
  );
}

/**
 * File Upload Error Boundary - Specialized error boundary for file upload components
 */
export function FileUploadErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary
      fallback={
        <div className="flex items-center justify-center h-32 bg-red-50 rounded-lg border border-red-200">
          <div className="text-center">
            <AlertTriangle className="mx-auto h-6 w-6 text-red-500 mb-2" />
            <p className="text-red-700 font-medium">File Upload Error</p>
            <p className="text-red-600 text-sm mt-1">
              Unable to process file uploads. Please try again later.
            </p>
          </div>
        </div>
      }
    >
      {children}
    </ErrorBoundary>
  );
}