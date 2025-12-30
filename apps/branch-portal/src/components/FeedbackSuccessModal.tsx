import { useEffect } from 'react'

interface FeedbackSuccessModalProps {
  candidateName: string
  onClose: () => void
}

export function FeedbackSuccessModal({ candidateName, onClose }: FeedbackSuccessModalProps) {
  // Auto-close after 3 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose()
    }, 3000)

    return () => clearTimeout(timer)
  }, [onClose])

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [onClose])

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div 
        className="modal success-modal" 
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="success-modal__content">
          <div className="success-icon">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          </div>
          
          <h2>Feedback Submitted!</h2>
          <p>
            Thank you for submitting feedback for <strong>{candidateName}</strong>.
          </p>
          <p className="subtext">
            The recruitment team will review your feedback.
          </p>

          <button className="btn btn--primary" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  )
}
