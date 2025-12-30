import { useState, useEffect, useCallback } from 'react'
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  limit, 
  onSnapshot,
  doc,
  updateDoc,
  writeBatch,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore'
import { getFirestore } from 'firebase/firestore'
import { useAuth } from '../contexts/AuthContext'

// Notification types aligned with shared-lib
export type NotificationType = 
  | 'interview_scheduled'
  | 'trial_scheduled'
  | 'feedback_required'
  | 'feedback_submitted'
  | 'candidate_status_change'
  | 'system'

export interface Notification {
  id: string
  userId: string
  type: NotificationType
  title: string
  message: string
  entityType?: string
  entityId?: string
  link?: string
  read: boolean
  readAt?: Timestamp
  createdAt: Timestamp
}

interface UseNotificationsResult {
  notifications: Notification[]
  unreadCount: number
  loading: boolean
  error: string | null
  markAsRead: (notificationId: string) => Promise<void>
  markAllAsRead: () => Promise<void>
}

/**
 * Hook to manage user notifications
 * Provides real-time unread count and notification list
 */
export function useNotifications(maxResults = 20): UseNotificationsResult {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Subscribe to notifications
  useEffect(() => {
    if (!user?.id) {
      setNotifications([])
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    const db = getFirestore()
    
    // Query notifications for this user, ordered by creation date
    const notificationsRef = collection(db, 'notifications')
    const q = query(
      notificationsRef,
      where('userId', '==', user.id),
      orderBy('createdAt', 'desc'),
      limit(maxResults)
    )

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const notifs: Notification[] = []
        snapshot.forEach((doc) => {
          notifs.push({
            id: doc.id,
            ...doc.data()
          } as Notification)
        })
        setNotifications(notifs)
        setLoading(false)
      },
      (err) => {
        console.error('Error fetching notifications:', err)
        setError('Failed to load notifications')
        setLoading(false)
      }
    )

    return () => unsubscribe()
  }, [user?.id, maxResults])

  // Calculate unread count
  const unreadCount = notifications.filter(n => !n.read).length

  // Mark single notification as read
  const markAsRead = useCallback(async (notificationId: string) => {
    if (!user?.id) return

    const db = getFirestore()
    const notificationRef = doc(db, 'notifications', notificationId)
    
    try {
      await updateDoc(notificationRef, {
        read: true,
        readAt: serverTimestamp()
      })
    } catch (err) {
      console.error('Error marking notification as read:', err)
      throw err
    }
  }, [user?.id])

  // Mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    if (!user?.id) return

    const db = getFirestore()
    const unreadNotifications = notifications.filter(n => !n.read)
    
    if (unreadNotifications.length === 0) return

    try {
      const batch = writeBatch(db)
      
      unreadNotifications.forEach((notif) => {
        const notificationRef = doc(db, 'notifications', notif.id)
        batch.update(notificationRef, {
          read: true,
          readAt: serverTimestamp()
        })
      })
      
      await batch.commit()
    } catch (err) {
      console.error('Error marking all notifications as read:', err)
      throw err
    }
  }, [user?.id, notifications])

  return {
    notifications,
    unreadCount,
    loading,
    error,
    markAsRead,
    markAllAsRead
  }
}

/**
 * Hook for just the unread count (lighter weight)
 * Used by NotificationBell component
 */
export function useUnreadCount(): { unreadCount: number; loading: boolean } {
  const { user } = useAuth()
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user?.id) {
      setUnreadCount(0)
      setLoading(false)
      return
    }

    setLoading(true)
    const db = getFirestore()
    
    // Query only unread notifications
    const notificationsRef = collection(db, 'notifications')
    const q = query(
      notificationsRef,
      where('userId', '==', user.id),
      where('read', '==', false)
    )

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        setUnreadCount(snapshot.size)
        setLoading(false)
      },
      (err) => {
        console.error('Error fetching unread count:', err)
        setLoading(false)
      }
    )

    return () => unsubscribe()
  }, [user?.id])

  return { unreadCount, loading }
}
