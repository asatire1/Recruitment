// Branch Portal Hooks

// B4: Notification hooks
export { useNotifications, useUnreadCount } from './useNotifications'
export type { Notification, NotificationType } from './useNotifications'

// B4.3/B4.4: Push notification hooks
export { usePushNotifications, usePushAvailable } from './usePushNotifications'

// B4.6/B4.7: Offline & sync hooks
export {
  useOnlineStatus,
  useOfflineSchedule,
  useTodayOfflineSchedule,
  useSyncStatus,
  useOfflineReady,
  useCacheStats,
} from './useOffline'

// Re-export B2 and B3 hooks if they exist
// These will be bundled in the final package
