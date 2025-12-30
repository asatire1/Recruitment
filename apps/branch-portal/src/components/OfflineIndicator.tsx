import { useState, useEffect } from 'react'
import { useOnlineStatus, useSyncStatus, useCacheStats } from '../hooks/useOffline'

/**
 * Offline banner shown when device is offline
 */
export function OfflineBanner() {
  const online = useOnlineStatus()
  const { syncing, pendingCount } = useSyncStatus()
  const [visible, setVisible] = useState(false)
  const [wasOffline, setWasOffline] = useState(false)

  useEffect(() => {
    if (!online) {
      setVisible(true)
      setWasOffline(true)
    } else if (wasOffline) {
      // Show "back online" briefly
      setTimeout(() => {
        setVisible(false)
        setWasOffline(false)
      }, 3000)
    }
  }, [online, wasOffline])

  if (!visible) return null

  return (
    <div className={`offline-banner ${online ? 'offline-banner--online' : ''}`}>
      <div className="offline-banner__content">
        {online ? (
          <>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
            <span>
              {syncing ? 'Syncing...' : 'Back online'}
              {pendingCount > 0 && !syncing && ` (${pendingCount} pending)`}
            </span>
          </>
        ) : (
          <>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="1" y1="1" x2="23" y2="23" />
              <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55" />
              <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39" />
              <path d="M10.71 5.05A16 16 0 0 1 22.58 9" />
              <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88" />
              <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
              <line x1="12" y1="20" x2="12.01" y2="20" />
            </svg>
            <span>You're offline - viewing cached data</span>
          </>
        )}
      </div>
    </div>
  )
}

/**
 * Small offline indicator dot for header
 */
export function OfflineIndicatorDot() {
  const online = useOnlineStatus()
  const { syncing } = useSyncStatus()

  if (online && !syncing) return null

  return (
    <div 
      className={`offline-dot ${syncing ? 'offline-dot--syncing' : ''}`}
      title={syncing ? 'Syncing...' : 'Offline'}
      aria-label={syncing ? 'Syncing data' : 'Currently offline'}
    />
  )
}

/**
 * Sync status indicator with button
 */
export function SyncStatusIndicator() {
  const online = useOnlineStatus()
  const { syncing, lastSyncResult, pendingCount, triggerSync } = useSyncStatus()
  const { lastCacheTime } = useCacheStats()

  if (!online) {
    return (
      <div className="sync-status sync-status--offline">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="1" y1="1" x2="23" y2="23" />
          <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55" />
          <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39" />
        </svg>
        <span>Offline</span>
        {lastCacheTime && (
          <span className="sync-status__time">
            Last sync: {formatTimeAgo(lastCacheTime)}
          </span>
        )}
      </div>
    )
  }

  return (
    <div className="sync-status">
      {syncing ? (
        <>
          <div className="spinner-sm" />
          <span>Syncing...</span>
        </>
      ) : (
        <>
          {lastSyncResult === 'success' && (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          )}
          {pendingCount > 0 && (
            <button 
              className="sync-status__btn"
              onClick={triggerSync}
              disabled={syncing}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="23 4 23 10 17 10" />
                <polyline points="1 20 1 14 7 14" />
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
              </svg>
              Sync ({pendingCount})
            </button>
          )}
          {pendingCount === 0 && (
            <span className="sync-status__ok">All synced</span>
          )}
        </>
      )}
    </div>
  )
}

/**
 * Cache info display for debugging/settings
 */
export function CacheInfoDisplay() {
  const { scheduleCount, lastCacheTime, syncQueueCount, loading } = useCacheStats()
  const online = useOnlineStatus()

  if (loading) {
    return <div className="cache-info cache-info--loading">Loading cache info...</div>
  }

  return (
    <div className="cache-info">
      <div className="cache-info__row">
        <span className="cache-info__label">Status</span>
        <span className={`cache-info__value ${online ? 'online' : 'offline'}`}>
          {online ? 'Online' : 'Offline'}
        </span>
      </div>
      <div className="cache-info__row">
        <span className="cache-info__label">Cached Events</span>
        <span className="cache-info__value">{scheduleCount}</span>
      </div>
      <div className="cache-info__row">
        <span className="cache-info__label">Last Cache</span>
        <span className="cache-info__value">
          {lastCacheTime ? formatTimeAgo(lastCacheTime) : 'Never'}
        </span>
      </div>
      <div className="cache-info__row">
        <span className="cache-info__label">Pending Sync</span>
        <span className="cache-info__value">{syncQueueCount}</span>
      </div>
    </div>
  )
}

// Helper function
function formatTimeAgo(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}
