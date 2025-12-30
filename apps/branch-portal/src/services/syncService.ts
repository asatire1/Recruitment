/**
 * Background Sync Service
 * B4.7: Sync on reconnect - processes queued actions when back online
 */

import {
  getPendingSyncItems,
  removeSyncItem,
  incrementSyncRetry,
  SyncQueueItem,
} from './offlineStorage'
import { getFirestore, doc, updateDoc, serverTimestamp } from 'firebase/firestore'

const MAX_RETRIES = 3
const RETRY_DELAY = 5000 // 5 seconds

type SyncEventCallback = (event: SyncEvent) => void

export interface SyncEvent {
  type: 'sync_started' | 'sync_completed' | 'sync_failed' | 'item_synced' | 'item_failed'
  itemId?: string
  error?: string
  pendingCount?: number
  syncedCount?: number
}

// Event listeners
const listeners: Set<SyncEventCallback> = new Set()

/**
 * Subscribe to sync events
 */
export function onSyncEvent(callback: SyncEventCallback): () => void {
  listeners.add(callback)
  return () => listeners.delete(callback)
}

/**
 * Emit sync event to all listeners
 */
function emitSyncEvent(event: SyncEvent): void {
  listeners.forEach((callback) => {
    try {
      callback(event)
    } catch (error) {
      console.error('Sync event callback error:', error)
    }
  })
}

/**
 * Process a single sync queue item
 */
async function processSyncItem(item: SyncQueueItem): Promise<boolean> {
  const db = getFirestore()

  try {
    switch (item.action) {
      case 'update_feedback': {
        const { interviewId, feedback } = item.data as {
          interviewId: string
          feedback: Record<string, unknown>
        }
        const interviewRef = doc(db, 'interviews', interviewId)
        await updateDoc(interviewRef, {
          feedback: {
            ...feedback,
            submittedAt: serverTimestamp(),
          },
          updatedAt: serverTimestamp(),
        })
        break
      }

      case 'mark_notification_read': {
        const { notificationId } = item.data as { notificationId: string }
        const notificationRef = doc(db, 'notifications', notificationId)
        await updateDoc(notificationRef, {
          read: true,
          readAt: serverTimestamp(),
        })
        break
      }

      default:
        console.warn(`Unknown sync action: ${item.action}`)
        return false
    }

    return true
  } catch (error) {
    console.error(`Failed to process sync item ${item.id}:`, error)
    return false
  }
}

/**
 * Process all pending sync items
 */
export async function processSyncQueue(): Promise<{
  success: number
  failed: number
  remaining: number
}> {
  const items = await getPendingSyncItems()
  
  if (items.length === 0) {
    return { success: 0, failed: 0, remaining: 0 }
  }

  emitSyncEvent({ type: 'sync_started', pendingCount: items.length })

  let success = 0
  let failed = 0

  for (const item of items) {
    // Skip items that have exceeded max retries
    if (item.retryCount >= MAX_RETRIES) {
      failed++
      emitSyncEvent({ type: 'item_failed', itemId: item.id, error: 'Max retries exceeded' })
      await removeSyncItem(item.id) // Remove permanently failed items
      continue
    }

    const processed = await processSyncItem(item)

    if (processed) {
      success++
      await removeSyncItem(item.id)
      emitSyncEvent({ type: 'item_synced', itemId: item.id })
    } else {
      failed++
      await incrementSyncRetry(item.id)
      emitSyncEvent({ type: 'item_failed', itemId: item.id })
    }
  }

  const remaining = items.length - success - failed

  emitSyncEvent({
    type: success > 0 ? 'sync_completed' : 'sync_failed',
    syncedCount: success,
    pendingCount: remaining,
  })

  return { success, failed, remaining }
}

// ============================================================================
// ONLINE/OFFLINE DETECTION
// ============================================================================

type ConnectionCallback = (online: boolean) => void
const connectionListeners: Set<ConnectionCallback> = new Set()

/**
 * Subscribe to connection state changes
 */
export function onConnectionChange(callback: ConnectionCallback): () => void {
  connectionListeners.add(callback)
  
  // Call immediately with current state
  callback(navigator.onLine)
  
  return () => connectionListeners.delete(callback)
}

/**
 * Emit connection state change
 */
function emitConnectionChange(online: boolean): void {
  connectionListeners.forEach((callback) => {
    try {
      callback(online)
    } catch (error) {
      console.error('Connection callback error:', error)
    }
  })
}

// Global online/offline handlers
let syncTimeout: ReturnType<typeof setTimeout> | null = null

function handleOnline(): void {
  console.log('[Sync] Back online')
  emitConnectionChange(true)
  
  // Delay sync slightly to ensure stable connection
  if (syncTimeout) {
    clearTimeout(syncTimeout)
  }
  
  syncTimeout = setTimeout(() => {
    console.log('[Sync] Processing sync queue...')
    processSyncQueue()
      .then((result) => {
        console.log('[Sync] Queue processed:', result)
      })
      .catch((error) => {
        console.error('[Sync] Queue processing failed:', error)
      })
  }, 2000) // Wait 2 seconds after coming online
}

function handleOffline(): void {
  console.log('[Sync] Gone offline')
  emitConnectionChange(false)
  
  if (syncTimeout) {
    clearTimeout(syncTimeout)
    syncTimeout = null
  }
}

/**
 * Initialize sync service - call once on app start
 */
export function initializeSyncService(): () => void {
  // Add event listeners
  window.addEventListener('online', handleOnline)
  window.addEventListener('offline', handleOffline)

  // Initial sync if online
  if (navigator.onLine) {
    setTimeout(() => {
      processSyncQueue().catch(console.error)
    }, 3000) // Wait 3 seconds after app start
  }

  // Return cleanup function
  return () => {
    window.removeEventListener('online', handleOnline)
    window.removeEventListener('offline', handleOffline)
    if (syncTimeout) {
      clearTimeout(syncTimeout)
    }
  }
}

/**
 * Check if currently online
 */
export function isOnline(): boolean {
  return navigator.onLine
}

/**
 * Manually trigger sync (e.g., from UI button)
 */
export async function triggerManualSync(): Promise<boolean> {
  if (!navigator.onLine) {
    console.log('[Sync] Cannot sync while offline')
    return false
  }

  try {
    const result = await processSyncQueue()
    return result.failed === 0
  } catch (error) {
    console.error('[Sync] Manual sync failed:', error)
    return false
  }
}

// ============================================================================
// PERIODIC SYNC (for browsers that support it)
// ============================================================================

/**
 * Register periodic background sync (if supported)
 */
export async function registerPeriodicSync(): Promise<boolean> {
  if (!('serviceWorker' in navigator)) {
    return false
  }

  try {
    const registration = await navigator.serviceWorker.ready

    // Check if periodic sync is supported
    if ('periodicSync' in registration) {
      // @ts-expect-error - periodicSync not in types
      const status = await navigator.permissions.query({
        name: 'periodic-background-sync',
      })

      if (status.state === 'granted') {
        // @ts-expect-error - periodicSync not in types
        await registration.periodicSync.register('sync-schedule', {
          minInterval: 60 * 60 * 1000, // 1 hour minimum
        })
        console.log('[Sync] Periodic sync registered')
        return true
      }
    }
  } catch (error) {
    console.log('[Sync] Periodic sync not available:', error)
  }

  return false
}
