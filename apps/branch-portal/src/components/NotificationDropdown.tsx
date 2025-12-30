import { useNavigate } from 'react-router-dom'
import { useNotifications } from '../hooks/useNotifications'
import type { Notification, NotificationType } from '../hooks/useNotifications'

interface NotificationDropdownProps {
  onClose: () => void
}

/**
 * Notification dropdown showing recent notifications
 * Supports mark as read, mark all as read, and navigation
 */
export function NotificationDropdown({ onClose }: NotificationDropdownProps) {
  const navigate = useNavigate()
  const { notifications, unreadCount, loading, error, markAsRead, markAllAsRead } = useNotifications(20)

  const handleNotificationClick = async (notification: Notification) => {
    // Mark as read if unread
    if (!notification.read) {
      try {
        await markAsRead(notification.id)
      } catch (err) {
        console.error('Failed to mark as read:', err)
      }
    }

    // Navigate if there's a link
    if (notification.link) {
      navigate(notification.link)
      onClose()
    } else if (notification.entityType && notification.entityId) {
      // Build link from entity info
      const link = getEntityLink(notification.entityType, notification.entityId)
      if (link) {
        navigate(link)
        onClose()
      }
    }
  }

  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsRead()
    } catch (err) {
      console.error('Failed to mark all as read:', err)
    }
  }

  return (
    <div className="notification-dropdown">
      {/* Header */}
      <div className="notification-dropdown-header">
        <span className="dropdown-title">Notifications</span>
        {unreadCount > 0 && (
          <button 
            className="mark-all-btn"
            onClick={handleMarkAllAsRead}
            aria-label="Mark all as read"
          >
            Mark all read
          </button>
        )}
      </div>

      {/* Content */}
      <div className="notification-dropdown-content">
        {loading ? (
          <div className="notification-dropdown-loading">
            <div className="spinner-sm" />
            <span>Loading notifications...</span>
          </div>
        ) : error ? (
          <div className="notification-dropdown-error">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>{error}</span>
          </div>
        ) : notifications.length === 0 ? (
          <div className="notification-dropdown-empty">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.5">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
            <p>No notifications</p>
            <span className="text-muted">You're all caught up!</span>
          </div>
        ) : (
          <div className="notification-list">
            {notifications.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onClick={() => handleNotificationClick(notification)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Footer - only show if there are notifications */}
      {notifications.length > 0 && (
        <div className="notification-dropdown-footer">
          <span className="notification-count">
            {notifications.length} notification{notifications.length !== 1 ? 's' : ''}
            {unreadCount > 0 && ` • ${unreadCount} unread`}
          </span>
        </div>
      )}
    </div>
  )
}

// ============================================================================
// Notification Item Component
// ============================================================================

interface NotificationItemProps {
  notification: Notification
  onClick: () => void
}

function NotificationItem({ notification, onClick }: NotificationItemProps) {
  const icon = getNotificationIcon(notification.type)
  const timeAgo = formatTimeAgo(notification.createdAt?.toDate?.() || new Date())

  return (
    <div
      className={`notification-item ${notification.read ? '' : 'notification-item--unread'}`}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onClick()
        }
      }}
    >
      {/* Icon */}
      <div className={`notification-item-icon notification-item-icon--${notification.type}`}>
        {icon}
      </div>

      {/* Content */}
      <div className="notification-item-content">
        <span className="notification-item-title">{notification.title}</span>
        <span className="notification-item-message">{notification.message}</span>
        <span className="notification-item-time">{timeAgo}</span>
      </div>

      {/* Unread indicator */}
      {!notification.read && (
        <div className="notification-item-unread" aria-label="Unread" />
      )}
    </div>
  )
}

// ============================================================================
// Helper Functions
// ============================================================================

function getNotificationIcon(type: NotificationType): JSX.Element {
  switch (type) {
    case 'trial_scheduled':
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
      )
    case 'interview_scheduled':
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      )
    case 'feedback_required':
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
      )
    case 'feedback_submitted':
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
          <polyline points="22 4 12 14.01 9 11.01" />
        </svg>
      )
    case 'candidate_status_change':
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="8.5" cy="7" r="4" />
          <polyline points="17 11 19 13 23 9" />
        </svg>
      )
    case 'system':
    default:
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="16" x2="12" y2="12" />
          <line x1="12" y1="8" x2="12.01" y2="8" />
        </svg>
      )
  }
}

function getEntityLink(entityType: string, entityId: string): string | null {
  switch (entityType) {
    case 'interview':
      return `/feedback/${entityId}`
    case 'candidate':
      return `/candidates/${entityId}`
    default:
      return null
  }
}

function formatTimeAgo(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffMins < 1) {
    return 'Just now'
  } else if (diffMins < 60) {
    return `${diffMins}m ago`
  } else if (diffHours < 24) {
    return `${diffHours}h ago`
  } else if (diffDays === 1) {
    return 'Yesterday'
  } else if (diffDays < 7) {
    return `${diffDays}d ago`
  } else {
    return date.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
    })
  }
}
