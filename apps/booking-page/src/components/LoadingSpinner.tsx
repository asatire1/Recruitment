/**
 * Loading spinner component
 */

interface LoadingSpinnerProps {
  message?: string
  size?: 'small' | 'medium' | 'large'
}

export function LoadingSpinner({ 
  message = 'Loading...', 
  size = 'medium' 
}: LoadingSpinnerProps) {
  return (
    <div className={`loading-container loading-container--${size}`}>
      <div className="spinner" />
      {message && <p className="loading-message">{message}</p>}
    </div>
  )
}
