// ============================================================================
// Allied Recruitment Portal - Error Boundary (R11.4)
// Location: apps/recruitment-portal/src/components/ErrorBoundary.tsx
// ============================================================================

import { Component, ErrorInfo, ReactNode } from 'react'
import './ErrorBoundary.css'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    }
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo })
    
    // Log to console in development
    console.error('Error caught by boundary:', error, errorInfo)
    
    // Call optional error handler
    this.props.onError?.(error, errorInfo)
    
    // In production, you could send to error tracking service
    // e.g., Sentry, LogRocket, etc.
    if (import.meta.env.PROD) {
      // sendToErrorTracking(error, errorInfo)
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null })
  }

  handleReload = () => {
    window.location.reload()
  }

  handleGoHome = () => {
    window.location.href = '/'
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="error-boundary" role="alert">
          <div className="error-boundary-content">
            <div className="error-boundary-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
            
            <h1 className="error-boundary-title">Something went wrong</h1>
            <p className="error-boundary-message">
              We're sorry, but something unexpected happened. Please try again.
            </p>
            
            {import.meta.env.DEV && this.state.error && (
              <details className="error-boundary-details">
                <summary>Error details (development only)</summary>
                <pre className="error-boundary-stack">
                  {this.state.error.toString()}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            )}
            
            <div className="error-boundary-actions">
              <button 
                className="error-boundary-btn error-boundary-btn-primary"
                onClick={this.handleRetry}
              >
                Try Again
              </button>
              <button 
                className="error-boundary-btn error-boundary-btn-secondary"
                onClick={this.handleReload}
              >
                Reload Page
              </button>
              <button 
                className="error-boundary-btn error-boundary-btn-tertiary"
                onClick={this.handleGoHome}
              >
                Go to Dashboard
              </button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

// ============================================================================
// PAGE ERROR BOUNDARY - For individual pages
// ============================================================================

interface PageErrorProps {
  error: Error
  resetErrorBoundary: () => void
}

export function PageError({ error, resetErrorBoundary }: PageErrorProps) {
  return (
    <div className="page-error" role="alert">
      <div className="page-error-content">
        <div className="page-error-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        </div>
        
        <h2 className="page-error-title">Failed to load this page</h2>
        <p className="page-error-message">
          {error.message || 'An unexpected error occurred'}
        </p>
        
        <div className="page-error-actions">
          <button 
            className="page-error-btn page-error-btn-primary"
            onClick={resetErrorBoundary}
          >
            Try Again
          </button>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// QUERY ERROR - For React Query errors
// ============================================================================

interface QueryErrorProps {
  message?: string
  onRetry?: () => void
}

export function QueryError({ message = 'Failed to load data', onRetry }: QueryErrorProps) {
  return (
    <div className="query-error" role="alert">
      <div className="query-error-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <line x1="15" y1="9" x2="9" y2="15" />
          <line x1="9" y1="9" x2="15" y2="15" />
        </svg>
      </div>
      <p className="query-error-message">{message}</p>
      {onRetry && (
        <button className="query-error-btn" onClick={onRetry}>
          Retry
        </button>
      )}
    </div>
  )
}

// ============================================================================
// EMPTY STATE
// ============================================================================

interface EmptyStateProps {
  icon?: ReactNode
  title: string
  message?: string
  action?: {
    label: string
    onClick: () => void
  }
}

export function EmptyState({ icon, title, message, action }: EmptyStateProps) {
  return (
    <div className="empty-state">
      {icon && <div className="empty-state-icon">{icon}</div>}
      <h3 className="empty-state-title">{title}</h3>
      {message && <p className="empty-state-message">{message}</p>}
      {action && (
        <button className="empty-state-btn" onClick={action.onClick}>
          {action.label}
        </button>
      )}
    </div>
  )
}

export default ErrorBoundary
