/**
 * Offline Storage Service
 * Uses IndexedDB to cache schedule data for offline viewing
 * B4.6: Offline schedule capability
 */

const DB_NAME = 'branch-portal-offline'
const DB_VERSION = 1

// Store names
const STORES = {
  SCHEDULE: 'schedule',
  NOTIFICATIONS: 'notifications',
  USER_DATA: 'userData',
  SYNC_QUEUE: 'syncQueue',
} as const

export interface CachedEvent {
  id: string
  candidateId: string
  candidateName: string
  type: 'interview' | 'trial'
  status: string
  scheduledAt: string // ISO string
  branchId?: string
  branchName?: string
  jobTitle?: string
  notes?: string
  cachedAt: number // timestamp
}

export interface CachedUserData {
  id: string
  displayName: string
  email: string
  role: string
  branchIds: string[]
  cachedAt: number
}

export interface SyncQueueItem {
  id: string
  action: 'update_feedback' | 'mark_notification_read'
  data: Record<string, unknown>
  createdAt: number
  retryCount: number
}

/**
 * Open the IndexedDB database
 */
function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onerror = () => {
      console.error('Failed to open IndexedDB:', request.error)
      reject(request.error)
    }

    request.onsuccess = () => {
      resolve(request.result)
    }

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result

      // Schedule store - keyed by date for easy day lookup
      if (!db.objectStoreNames.contains(STORES.SCHEDULE)) {
        const scheduleStore = db.createObjectStore(STORES.SCHEDULE, { keyPath: 'id' })
        scheduleStore.createIndex('date', 'scheduledAt', { unique: false })
        scheduleStore.createIndex('branchId', 'branchId', { unique: false })
      }

      // Notifications store
      if (!db.objectStoreNames.contains(STORES.NOTIFICATIONS)) {
        const notifStore = db.createObjectStore(STORES.NOTIFICATIONS, { keyPath: 'id' })
        notifStore.createIndex('userId', 'userId', { unique: false })
        notifStore.createIndex('read', 'read', { unique: false })
      }

      // User data store
      if (!db.objectStoreNames.contains(STORES.USER_DATA)) {
        db.createObjectStore(STORES.USER_DATA, { keyPath: 'id' })
      }

      // Sync queue for offline actions
      if (!db.objectStoreNames.contains(STORES.SYNC_QUEUE)) {
        const syncStore = db.createObjectStore(STORES.SYNC_QUEUE, { keyPath: 'id' })
        syncStore.createIndex('createdAt', 'createdAt', { unique: false })
      }
    }
  })
}

// ============================================================================
// SCHEDULE CACHING (B4.6)
// ============================================================================

/**
 * Cache events for offline viewing
 */
export async function cacheScheduleEvents(events: CachedEvent[]): Promise<void> {
  const db = await openDatabase()
  const tx = db.transaction(STORES.SCHEDULE, 'readwrite')
  const store = tx.objectStore(STORES.SCHEDULE)

  const now = Date.now()

  for (const event of events) {
    await new Promise<void>((resolve, reject) => {
      const request = store.put({
        ...event,
        cachedAt: now,
      })
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  db.close()
}

/**
 * Get cached events for a specific date
 */
export async function getCachedEventsForDate(date: Date): Promise<CachedEvent[]> {
  const db = await openDatabase()
  const tx = db.transaction(STORES.SCHEDULE, 'readonly')
  const store = tx.objectStore(STORES.SCHEDULE)

  // Get date range for the day
  const startOfDay = new Date(date)
  startOfDay.setHours(0, 0, 0, 0)
  const endOfDay = new Date(date)
  endOfDay.setHours(23, 59, 59, 999)

  return new Promise((resolve, reject) => {
    const events: CachedEvent[] = []
    const request = store.openCursor()

    request.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result
      if (cursor) {
        const eventDate = new Date(cursor.value.scheduledAt)
        if (eventDate >= startOfDay && eventDate <= endOfDay) {
          events.push(cursor.value)
        }
        cursor.continue()
      } else {
        db.close()
        resolve(events.sort((a, b) => 
          new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()
        ))
      }
    }

    request.onerror = () => {
      db.close()
      reject(request.error)
    }
  })
}

/**
 * Get cached events for today
 */
export async function getCachedTodaySchedule(): Promise<CachedEvent[]> {
  return getCachedEventsForDate(new Date())
}

/**
 * Get cached events for a date range (e.g., this week)
 */
export async function getCachedEventsForRange(
  startDate: Date,
  endDate: Date
): Promise<CachedEvent[]> {
  const db = await openDatabase()
  const tx = db.transaction(STORES.SCHEDULE, 'readonly')
  const store = tx.objectStore(STORES.SCHEDULE)

  return new Promise((resolve, reject) => {
    const events: CachedEvent[] = []
    const request = store.openCursor()

    request.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result
      if (cursor) {
        const eventDate = new Date(cursor.value.scheduledAt)
        if (eventDate >= startDate && eventDate <= endDate) {
          events.push(cursor.value)
        }
        cursor.continue()
      } else {
        db.close()
        resolve(events.sort((a, b) => 
          new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()
        ))
      }
    }

    request.onerror = () => {
      db.close()
      reject(request.error)
    }
  })
}

/**
 * Clear old cached events (older than 7 days)
 */
export async function clearOldCachedEvents(): Promise<void> {
  const db = await openDatabase()
  const tx = db.transaction(STORES.SCHEDULE, 'readwrite')
  const store = tx.objectStore(STORES.SCHEDULE)

  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000

  return new Promise((resolve, reject) => {
    const request = store.openCursor()

    request.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result
      if (cursor) {
        if (cursor.value.cachedAt < sevenDaysAgo) {
          cursor.delete()
        }
        cursor.continue()
      } else {
        db.close()
        resolve()
      }
    }

    request.onerror = () => {
      db.close()
      reject(request.error)
    }
  })
}

// ============================================================================
// USER DATA CACHING
// ============================================================================

/**
 * Cache user data for offline access
 */
export async function cacheUserData(userData: CachedUserData): Promise<void> {
  const db = await openDatabase()
  const tx = db.transaction(STORES.USER_DATA, 'readwrite')
  const store = tx.objectStore(STORES.USER_DATA)

  return new Promise((resolve, reject) => {
    const request = store.put({
      ...userData,
      cachedAt: Date.now(),
    })
    request.onsuccess = () => {
      db.close()
      resolve()
    }
    request.onerror = () => {
      db.close()
      reject(request.error)
    }
  })
}

/**
 * Get cached user data
 */
export async function getCachedUserData(userId: string): Promise<CachedUserData | null> {
  const db = await openDatabase()
  const tx = db.transaction(STORES.USER_DATA, 'readonly')
  const store = tx.objectStore(STORES.USER_DATA)

  return new Promise((resolve, reject) => {
    const request = store.get(userId)
    request.onsuccess = () => {
      db.close()
      resolve(request.result || null)
    }
    request.onerror = () => {
      db.close()
      reject(request.error)
    }
  })
}

// ============================================================================
// SYNC QUEUE (B4.7)
// ============================================================================

/**
 * Add an action to the sync queue for later processing
 */
export async function addToSyncQueue(item: Omit<SyncQueueItem, 'id' | 'createdAt' | 'retryCount'>): Promise<string> {
  const db = await openDatabase()
  const tx = db.transaction(STORES.SYNC_QUEUE, 'readwrite')
  const store = tx.objectStore(STORES.SYNC_QUEUE)

  const id = `sync-${Date.now()}-${Math.random().toString(36).slice(2)}`

  return new Promise((resolve, reject) => {
    const request = store.add({
      ...item,
      id,
      createdAt: Date.now(),
      retryCount: 0,
    })
    request.onsuccess = () => {
      db.close()
      resolve(id)
    }
    request.onerror = () => {
      db.close()
      reject(request.error)
    }
  })
}

/**
 * Get all pending sync items
 */
export async function getPendingSyncItems(): Promise<SyncQueueItem[]> {
  const db = await openDatabase()
  const tx = db.transaction(STORES.SYNC_QUEUE, 'readonly')
  const store = tx.objectStore(STORES.SYNC_QUEUE)

  return new Promise((resolve, reject) => {
    const request = store.getAll()
    request.onsuccess = () => {
      db.close()
      resolve(request.result || [])
    }
    request.onerror = () => {
      db.close()
      reject(request.error)
    }
  })
}

/**
 * Remove a sync item after successful processing
 */
export async function removeSyncItem(id: string): Promise<void> {
  const db = await openDatabase()
  const tx = db.transaction(STORES.SYNC_QUEUE, 'readwrite')
  const store = tx.objectStore(STORES.SYNC_QUEUE)

  return new Promise((resolve, reject) => {
    const request = store.delete(id)
    request.onsuccess = () => {
      db.close()
      resolve()
    }
    request.onerror = () => {
      db.close()
      reject(request.error)
    }
  })
}

/**
 * Update retry count for a sync item
 */
export async function incrementSyncRetry(id: string): Promise<void> {
  const db = await openDatabase()
  const tx = db.transaction(STORES.SYNC_QUEUE, 'readwrite')
  const store = tx.objectStore(STORES.SYNC_QUEUE)

  return new Promise((resolve, reject) => {
    const getRequest = store.get(id)
    getRequest.onsuccess = () => {
      if (getRequest.result) {
        const item = getRequest.result
        item.retryCount += 1
        const putRequest = store.put(item)
        putRequest.onsuccess = () => {
          db.close()
          resolve()
        }
        putRequest.onerror = () => {
          db.close()
          reject(putRequest.error)
        }
      } else {
        db.close()
        resolve()
      }
    }
    getRequest.onerror = () => {
      db.close()
      reject(getRequest.error)
    }
  })
}

/**
 * Clear all data (for logout)
 */
export async function clearAllOfflineData(): Promise<void> {
  const db = await openDatabase()
  
  const stores = [STORES.SCHEDULE, STORES.NOTIFICATIONS, STORES.USER_DATA, STORES.SYNC_QUEUE]
  
  for (const storeName of stores) {
    const tx = db.transaction(storeName, 'readwrite')
    const store = tx.objectStore(storeName)
    await new Promise<void>((resolve, reject) => {
      const request = store.clear()
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }
  
  db.close()
}

/**
 * Get cache metadata (for debugging/display)
 */
export async function getCacheStats(): Promise<{
  scheduleCount: number
  lastCacheTime: number | null
  syncQueueCount: number
}> {
  const db = await openDatabase()
  
  const scheduleTx = db.transaction(STORES.SCHEDULE, 'readonly')
  const scheduleStore = scheduleTx.objectStore(STORES.SCHEDULE)
  
  const syncTx = db.transaction(STORES.SYNC_QUEUE, 'readonly')
  const syncStore = syncTx.objectStore(STORES.SYNC_QUEUE)

  const scheduleCount = await new Promise<number>((resolve) => {
    const request = scheduleStore.count()
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => resolve(0)
  })

  const syncQueueCount = await new Promise<number>((resolve) => {
    const request = syncStore.count()
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => resolve(0)
  })

  // Get most recent cache time
  const lastCacheTime = await new Promise<number | null>((resolve) => {
    const request = scheduleStore.openCursor(null, 'prev')
    request.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result
      resolve(cursor?.value?.cachedAt || null)
    }
    request.onerror = () => resolve(null)
  })

  db.close()

  return { scheduleCount, lastCacheTime, syncQueueCount }
}
