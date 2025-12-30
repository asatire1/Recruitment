import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

export interface ToastNotification {
  id: string
  title: string
  body: string
  type?: 'trial_scheduled' | 'feedback_required' | 'system'
  link?: string
  duration?: number
}

interface NotificationToastProps {
  notification: ToastNotification
  onClose: (id: string) => void
}

/**
 * Toast notification for foreground push messages
 */
export function NotificationToast({ notification, onClose }: NotificationToastProps) {
  const navigate = useNavigate()
  const [exiting, setExiting] = useState(false)
  
  const duration = notification.duration || 5000

  // Auto-dismiss after duration
  useEffect(() => {
    const timer = setTimeout(() => {
      handleClose()
    }, duration)

    return () => clearTimeout(timer)
  }, [duration])

  const handleClose = () => {
    setExiting(true)
    setTimeout(() => {
      onClose(notification.id)
    }, 200) // Match exit animation duration
  }

  const handleClick = () => {
    if (notification.link) {
      navigate(notification.link)
    }
    handleClose()
  }

  const getIconClass = () => {
    switch (notification.type) {
      case 'trial_scheduled':
        return 'notification-toast__icon--trial'
      case 'feedback_required':
        return 'notification-toast__icon--feedback'
      default:
        return ''
    }
  }

  const getIcon = () => {
    switch (notification.type) {
      case 'trial_scheduled':
        return (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
        )
      case 'feedback_required':
        return (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
        )
      default:
        return (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
        )
    }
  }

  return (
    <div
      className={`notification-toast ${exiting ? 'notification-toast--exit' : ''}`}
      onClick={handleClick}
      role="alert"
      aria-live="polite"
    >
      <div className={`notification-toast__icon ${getIconClass()}`}>
        {getIcon()}
      </div>
      
      <div className="notification-toast__content">
        <div className="notification-toast__title">{notification.title}</div>
        <div className="notification-toast__body">{notification.body}</div>
      </div>
      
      <button
        className="notification-toast__close"
        onClick={(e) => {
          e.stopPropagation()
          handleClose()
        }}
        aria-label="Dismiss notification"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>
  )
}

/**
 * Container for managing multiple toast notifications
 */
interface NotificationToastContainerProps {
  notifications: ToastNotification[]
  onRemove: (id: string) => void
  maxVisible?: number
}

export function NotificationToastContainer({
  notifications,
  onRemove,
  maxVisible = 3,
}: NotificationToastContainerProps) {
  // Only show the most recent notifications
  const visibleNotifications = notifications.slice(-maxVisible)

  if (visibleNotifications.length === 0) return null

  return (
    <div className="notification-toast-container">
      {visibleNotifications.map((notification, index) => (
        <div
          key={notification.id}
          style={{
            position: 'fixed',
            top: `calc(var(--header-height) + var(--safe-area-top) + ${16 + index * 80}px)`,
            left: '16px',
            right: '16px',
            zIndex: 1100 - index,
          }}
        >
          <NotificationToast
            notification={notification}
            onClose={onRemove}
          />
        </div>
      ))}
    </div>
  )
}
