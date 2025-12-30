// Branch Portal Services

// Push notifications
export {
  checkPushSupport,
  getPermissionStatus,
  requestNotificationPermission,
  getFCMToken,
  saveFCMToken,
  removeFCMToken,
  setupForegroundMessageHandler,
  initializePushNotifications,
} from './pushNotifications'

export type { PushNotificationState } from './pushNotifications'

// Offline storage
export {
  cacheScheduleEvents,
  getCachedTodaySchedule,
  getCachedEventsForDate,
  getCachedEventsForRange,
  clearOldCachedEvents,
  cacheUserData,
  getCachedUserData,
  addToSyncQueue,
  getPendingSyncItems,
  removeSyncItem,
  clearAllOfflineData,
  getCacheStats,
} from './offlineStorage'

export type { CachedEvent, CachedUserData, SyncQueueItem } from './offlineStorage'

// Sync service
export {
  initializeSyncService,
  processSyncQueue,
  triggerManualSync,
  onSyncEvent,
  onConnectionChange,
  isOnline,
  registerPeriodicSync,
} from './syncService'

export type { SyncEvent } from './syncService'
