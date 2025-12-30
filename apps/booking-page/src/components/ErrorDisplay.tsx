/**
 * Error display component for booking page
 */

import type { ValidationError } from '../services/bookingService'

interface ErrorDisplayProps {
  error: ValidationError
  onRetry?: () => void
}

export function ErrorDisplay({ error, onRetry }: ErrorDisplayProps) {
  const getIcon = () => {
    switch (error.code) {
      case 'expired':
        return <ClockIcon />
      case 'used':
        return <CheckCircleIcon />
      case 'invalid':
      case 'error':
      default:
        return <AlertIcon />
    }
  }

  const getTitle = () => {
    switch (error.code) {
      case 'expired':
        return 'Link Expired'
      case 'used':
        return 'Already Booked'
      case 'invalid':
        return 'Invalid Link'
      case 'error':
      default:
        return 'Something Went Wrong'
    }
  }

  return (
    <div className="error-container">
      <div className="error-icon">
        {getIcon()}
      </div>
      <h1 className="error-title">{getTitle()}</h1>
      <p className="error-message">{error.message}</p>
      
      {error.code === 'error' && onRetry && (
        <button className="btn btn-primary" onClick={onRetry}>
          Try Again
        </button>
      )}
      
      <div className="error-help">
        <p>Need help? Contact our recruitment team:</p>
        <a href="mailto:recruitment@alliedpharmacies.co.uk" className="help-link">
          recruitment@alliedpharmacies.co.uk
        </a>
      </div>
    </div>
  )
}

// Icons
function AlertIcon() {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      fill="none" 
      viewBox="0 0 24 24" 
      strokeWidth={1.5} 
      stroke="currentColor"
      width="48"
      height="48"
    >
      <path 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" 
      />
    </svg>
  )
}

function ClockIcon() {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      fill="none" 
      viewBox="0 0 24 24" 
      strokeWidth={1.5} 
      stroke="currentColor"
      width="48"
      height="48"
    >
      <path 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" 
      />
    </svg>
  )
}

function CheckCircleIcon() {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      fill="none" 
      viewBox="0 0 24 24" 
      strokeWidth={1.5} 
      stroke="currentColor"
      width="48"
      height="48"
    >
      <path 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" 
      />
    </svg>
  )
}
