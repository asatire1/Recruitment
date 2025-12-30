import { useUnreadCount } from '../hooks/useNotifications'

interface NotificationBellProps {
  onClick: () => void
  isOpen?: boolean
}

/**
 * Notification bell icon with unread count badge
 * Shows animated badge when there are unread notifications
 */
export function NotificationBell({ onClick, isOpen = false }: NotificationBellProps) {
  const { unreadCount, loading } = useUnreadCount()

  return (
    <button
      className={`notification-bell ${isOpen ? 'active' : ''}`}
      onClick={onClick}
      aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
      aria-expanded={isOpen}
      aria-haspopup="true"
    >
      {/* Bell Icon */}
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="bell-icon"
      >
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
      </svg>
      
      {/* Unread Badge */}
      {!loading && unreadCount > 0 && (
        <span className="notification-badge" aria-hidden="true">
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
    </button>
  )
}
