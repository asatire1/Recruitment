import { useState, useEffect, useCallback } from 'react'
import {
  cacheScheduleEvents,
  getCachedTodaySchedule,
  getCachedEventsForRange,
  getCacheStats,
  clearOldCachedEvents,
  CachedEvent,
} from '../services/offlineStorage'
import {
  onConnectionChange,
  onSyncEvent,
  processSyncQueue,
  initializeSyncService,
  isOnline,
  SyncEvent,
} from '../services/syncService'

// ============================================================================
// useOnlineStatus - Track online/offline state
// ============================================================================

export function useOnlineStatus(): boolean {
  const [online, setOnline] = useState(navigator.onLine)

  useEffect(() => {
    const unsubscribe = onConnectionChange(setOnline)
    return unsubscribe
  }, [])

  return online
}

// ============================================================================
// useOfflineSchedule - Get cached schedule when offline
// ============================================================================

interface UseOfflineScheduleResult {
  events: CachedEvent[]
  loading: boolean
  error: string | null
  isFromCache: boolean
  lastCacheTime: Date | null
  refreshCache: () => Promise<void>
}

export function useOfflineSchedule(
  startDate: Date,
  endDate: Date,
  liveEvents?: CachedEvent[]
): UseOfflineScheduleResult {
  const online = useOnlineStatus()
  const [cachedEvents, setCachedEvents] = useState<CachedEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastCacheTime, setLastCacheTime] = useState<Date | null>(null)
  const [isFromCache, setIsFromCache] = useState(false)

  // Load cached events
  const loadCachedEvents = useCallback(async () => {
    try {
      const events = await getCachedEventsForRange(startDate, endDate)
      setCachedEvents(events)
      
      const stats = await getCacheStats()
      if (stats.lastCacheTime) {
        setLastCacheTime(new Date(stats.lastCacheTime))
      }
    } catch (err) {
      console.error('Failed to load cached events:', err)
      setError('Failed to load offline data')
    }
  }, [startDate, endDate])

  // Initial load
  useEffect(() => {
    setLoading(true)
    loadCachedEvents().finally(() => setLoading(false))
  }, [loadCachedEvents])

  // Cache live events when available
  useEffect(() => {
    if (liveEvents && liveEvents.length > 0 && online) {
      cacheScheduleEvents(liveEvents)
        .then(() => {
          setLastCacheTime(new Date())
          console.log(`Cached ${liveEvents.length} events`)
        })
        .catch(console.error)
    }
  }, [liveEvents, online])

  // Determine which events to use
  const events = online && liveEvents ? liveEvents : cachedEvents

  useEffect(() => {
    setIsFromCache(!online || !liveEvents)
  }, [online, liveEvents])

  // Refresh cache manually
  const refreshCache = useCallback(async () => {
    if (!online) {
      throw new Error('Cannot refresh while offline')
    }
    // This would typically trigger a fetch from Firestore
    // The parent component should handle this and pass updated liveEvents
    await loadCachedEvents()
  }, [online, loadCachedEvents])

  return {
    events,
    loading,
    error,
    isFromCache,
    lastCacheTime,
    refreshCache,
  }
}

// ============================================================================
// useTodayOfflineSchedule - Simplified hook for today only
// ============================================================================

export function useTodayOfflineSchedule(liveEvents?: CachedEvent[]): UseOfflineScheduleResult {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  
  return useOfflineSchedule(today, tomorrow, liveEvents)
}

// ============================================================================
// useSyncStatus - Track background sync status
// ============================================================================

interface UseSyncStatusResult {
  syncing: boolean
  lastSyncResult: 'success' | 'failed' | null
  pendingCount: number
  syncedCount: number
  triggerSync: () => Promise<void>
}

export function useSyncStatus(): UseSyncStatusResult {
  const [syncing, setSyncing] = useState(false)
  const [lastSyncResult, setLastSyncResult] = useState<'success' | 'failed' | null>(null)
  const [pendingCount, setPendingCount] = useState(0)
  const [syncedCount, setSyncedCount] = useState(0)

  useEffect(() => {
    const unsubscribe = onSyncEvent((event: SyncEvent) => {
      switch (event.type) {
        case 'sync_started':
          setSyncing(true)
          setPendingCount(event.pendingCount || 0)
          break
        case 'sync_completed':
          setSyncing(false)
          setLastSyncResult('success')
          setSyncedCount(event.syncedCount || 0)
          setPendingCount(event.pendingCount || 0)
          break
        case 'sync_failed':
          setSyncing(false)
          setLastSyncResult('failed')
          break
      }
    })

    return unsubscribe
  }, [])

  const triggerSync = useCallback(async () => {
    if (!isOnline()) {
      return
    }
    setSyncing(true)
    try {
      await processSyncQueue()
    } finally {
      setSyncing(false)
    }
  }, [])

  return {
    syncing,
    lastSyncResult,
    pendingCount,
    syncedCount,
    triggerSync,
  }
}

// ============================================================================
// useOfflineReady - Initialize offline services
// ============================================================================

export function useOfflineReady(): boolean {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    // Initialize sync service
    const cleanup = initializeSyncService()

    // Clean up old cached data
    clearOldCachedEvents()
      .then(() => {
        console.log('Old cached events cleared')
      })
      .catch(console.error)

    setReady(true)

    return cleanup
  }, [])

  return ready
}

// ============================================================================
// useCacheStats - Get cache statistics
// ============================================================================

interface CacheStatsResult {
  scheduleCount: number
  lastCacheTime: Date | null
  syncQueueCount: number
  loading: boolean
}

export function useCacheStats(): CacheStatsResult {
  const [stats, setStats] = useState<CacheStatsResult>({
    scheduleCount: 0,
    lastCacheTime: null,
    syncQueueCount: 0,
    loading: true,
  })

  useEffect(() => {
    getCacheStats()
      .then((result) => {
        setStats({
          scheduleCount: result.scheduleCount,
          lastCacheTime: result.lastCacheTime ? new Date(result.lastCacheTime) : null,
          syncQueueCount: result.syncQueueCount,
          loading: false,
        })
      })
      .catch(() => {
        setStats((prev) => ({ ...prev, loading: false }))
      })
  }, [])

  return stats
}
