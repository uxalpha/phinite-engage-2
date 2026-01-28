'use client'

import React, { Component, ErrorInfo, ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
}

/**
 * ErrorBoundary component to catch and handle errors in React components
 * Prevents the entire app from crashing when an error occurs
 */
class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    }
  }

  static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
      errorInfo: null,
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error details to console (can be extended to send to logging service)
    console.error('ErrorBoundary caught an error:', {
      error,
      errorInfo,
      componentStack: errorInfo.componentStack,
    })

    // Update state with error info
    this.setState({
      error,
      errorInfo,
    })

    // TODO: Send to external logging service (e.g., Sentry, LogRocket)
    // logErrorToService(error, errorInfo)
  }

  handleReset = () => {
    // Reset the error state
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    })
  }

  render() {
    if (this.state.hasError) {
      // Custom fallback UI provided by parent
      if (this.props.fallback) {
        return this.props.fallback
      }

      // Default fallback UI
      return (
        <div className="min-h-screen flex items-center justify-center bg-streak-gray p-4">
          <div className="max-w-2xl w-full">
            <Alert variant="destructive" className="rounded-2xl p-6">
              <div className="flex flex-col items-center text-center gap-4">
                <div className="text-6xl mb-2">⚠️</div>
                <AlertTitle className="text-2xl font-bold">
                  Something went wrong
                </AlertTitle>
                <AlertDescription className="text-base">
                  We encountered an unexpected error. This has been logged and we'll look into it.
                </AlertDescription>

                {process.env.NODE_ENV === 'development' && this.state.error && (
                  <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg w-full text-left">
                    <p className="font-mono text-xs text-red-800 mb-2">
                      <strong>Error:</strong> {this.state.error.message}
                    </p>
                    {this.state.errorInfo && (
                      <details className="mt-2">
                        <summary className="cursor-pointer text-xs font-semibold text-red-900">
                          Component Stack
                        </summary>
                        <pre className="mt-2 text-xs overflow-auto max-h-40 text-red-700">
                          {this.state.errorInfo.componentStack}
                        </pre>
                      </details>
                    )}
                  </div>
                )}

                <div className="flex gap-3 mt-4">
                  <Button
                    onClick={this.handleReset}
                    className="bg-streak-purple hover:bg-streak-purple/90"
                  >
                    Try Again
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      this.handleReset()
                      window.location.href = '/dashboard'
                    }}
                  >
                    Go to Dashboard
                  </Button>
                </div>
              </div>
            </Alert>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary

/**
 * Simple error fallback component that can be used as a custom fallback
 */
export function ErrorFallback({ error, resetError }: { error?: Error; resetError?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] p-8 text-center">
      <div className="text-6xl mb-4">😵</div>
      <h2 className="text-2xl font-bold mb-2">Oops! Something went wrong</h2>
      <p className="text-muted-foreground mb-6">
        {error?.message || 'An unexpected error occurred'}
      </p>
      {resetError && (
        <Button onClick={resetError} className="bg-streak-purple hover:bg-streak-purple/90">
          Try Again
        </Button>
      )}
    </div>
  )
}
