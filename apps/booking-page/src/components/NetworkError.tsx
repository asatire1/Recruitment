/**
 * Network Error Handling Components
 * P3.3: Retry prompts, offline message
 * 
 * Provides user-friendly error states with retry options
 */

import { useState, useEffect } from 'react'

// ============================================================================
// TYPES
// ============================================================================

interface NetworkErrorProps {
  message?: string
  onRetry?: () => void
  isRetrying?: boolean
}

interface OfflineBannerProps {
  onRetry?: () => void
}

// ============================================================================
// NETWORK ERROR COMPONENT
// ============================================================================

export function NetworkError({ 
  message = 'Unable to connect. Please check your internet connection.',
  onRetry,
  isRetrying = false
}: NetworkErrorProps) {
  return (
    <div className="network-error" role="alert" aria-live="polite">
      <div className="network-error-icon">
        <WifiOffIcon />
      </div>
      
      <h2 className="network-error-title">Connection Problem</h2>
      <p className="network-error-message">{message}</p>
      
      {onRetry && (
        <button 
          className="btn btn-primary"
          onClick={onRetry}
          disabled={isRetrying}
          aria-busy={isRetrying}
        >
          {isRetrying ? (
            <>
              <span className="spinner spinner-small spinner-white" aria-hidden="true" />
              <span>Retrying...</span>
            </>
          ) : (
            <>
              <RefreshIcon />
              <span>Try Again</span>
            </>
          )}
        </button>
      )}
      
      <p className="network-error-hint">
        If the problem persists, try refreshing the page.
      </p>
    </div>
  )
}

// ============================================================================
// OFFLINE BANNER
// ============================================================================

export function OfflineBanner({ onRetry }: OfflineBannerProps) {
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [showBanner, setShowBanner] = useState(!navigator.onLine)

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      // Show "back online" briefly then hide
      setTimeout(() => setShowBanner(false), 3000)
    }
    
    const handleOffline = () => {
      setIsOnline(false)
      setShowBanner(true)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  if (!showBanner) return null

  return (
    <div 
      className={`offline-banner ${isOnline ? 'online' : 'offline'}`}
      role="status"
      aria-live="polite"
    >
      <div className="offline-banner-content">
        {isOnline ? (
          <>
            <CheckCircleIcon />
            <span>Back online</span>
          </>
        ) : (
          <>
            <WifiOffIcon />
            <span>You're offline</span>
            {onRetry && (
              <button 
                className="offline-banner-retry"
                onClick={onRetry}
                aria-label="Retry connection"
              >
                Retry
              </button>
            )}
          </>
        )}
      </div>
    </div>
  )
}

// ============================================================================
// RETRY WRAPPER - HOC for adding retry to any async operation
// ============================================================================

interface RetryWrapperProps {
  children: React.ReactNode
  error: Error | null
  onRetry: () => void
  isLoading: boolean
}

export function RetryWrapper({ 
  children, 
  error, 
  onRetry, 
  isLoading 
}: RetryWrapperProps) {
  if (error) {
    const isNetworkError = 
      error.message.includes('network') ||
      error.message.includes('fetch') ||
      error.message.includes('Failed to fetch') ||
      !navigator.onLine

    if (isNetworkError) {
      return <NetworkError onRetry={onRetry} isRetrying={isLoading} />
    }

    // Generic error
    return (
      <div className="error-container" role="alert">
        <div className="error-icon">
          <AlertIcon />
        </div>
        <h2 className="error-title">Something went wrong</h2>
        <p className="error-message">{error.message}</p>
        <button className="btn btn-primary" onClick={onRetry}>
          Try Again
        </button>
      </div>
    )
  }

  return <>{children}</>
}

// ============================================================================
// HOOK: useOnlineStatus
// ============================================================================

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine)

  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  return isOnline
}

// ============================================================================
// ICONS
// ============================================================================

function WifiOffIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" width="32" height="32">
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.288 15.038a5.25 5.25 0 017.424 0M5.106 11.856c3.807-3.808 9.98-3.808 13.788 0M1.924 8.674c5.565-5.565 14.587-5.565 20.152 0M12.53 18.22l-.53.53-.53-.53a.75.75 0 011.06 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 3l18 18" />
    </svg>
  )
}

function RefreshIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" width="20" height="20">
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
    </svg>
  )
}

function CheckCircleIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" width="20" height="20">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
}

function AlertIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" width="32" height="32">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
    </svg>
  )
}
