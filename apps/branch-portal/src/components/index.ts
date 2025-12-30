// Layout & Auth
export { AppLayout } from './AppLayout'
export { ProtectedRoute } from './ProtectedRoute'

// B2: Calendar & Events
export { TodayWidget } from './TodayWidget'
export { UpcomingList } from './UpcomingList'
export { EventCard } from './EventCard'
export { EventDetailModal } from './EventDetailModal'
export { WeekCalendar } from './WeekCalendar'
export { MonthCalendar } from './MonthCalendar'

// B3: Feedback
export { FeedbackForm } from './FeedbackForm'
export { FeedbackHistory } from './FeedbackHistory'
export { FeedbackSuccessModal } from './FeedbackSuccessModal'
export { PendingFeedbackList } from './PendingFeedbackList'
export { StarRating } from './StarRating'

// B4.1/B4.2: Notifications
export { NotificationBell } from './NotificationBell'
export { NotificationDropdown } from './NotificationDropdown'

// B4.3/B4.4: Push Notifications
export { PushNotificationPrompt, PushNotificationToggle } from './PushNotificationPrompt'
export { NotificationToast, NotificationToastContainer } from './NotificationToast'
export type { ToastNotification } from './NotificationToast'

// B4.6/B4.7: Offline components
export {
  OfflineBanner,
  OfflineIndicatorDot,
  SyncStatusIndicator,
  CacheInfoDisplay,
} from './OfflineIndicator'
