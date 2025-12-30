import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../contexts/AuthContext'
import {
  checkPushSupport,
  getPermissionStatus,
  initializePushNotifications,
  setupForegroundMessageHandler,
  PushNotificationState,
} from '../services/pushNotifications'

export interface UsePushNotificationsResult {
  // State
  supported: boolean
  permission: NotificationPermission
  enabled: boolean
  loading: boolean
  error: string | null
  
  // Actions
  enablePushNotifications: () => Promise<boolean>
  checkSupport: () => Promise<boolean>
}

/**
 * Hook to manage push notifications
 * Handles permission requests, FCM token management, and foreground messages
 */
export function usePushNotifications(): UsePushNotificationsResult {
  const { user } = useAuth()
  
  const [supported, setSupported] = useState(false)
  const [permission, setPermission] = useState<NotificationPermission>('default')
  const [enabled, setEnabled] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Check support on mount
  useEffect(() => {
    const checkInitialSupport = async () => {
      const isSupported = await checkPushSupport()
      setSupported(isSupported)
      
      if (isSupported) {
        setPermission(getPermissionStatus())
      }
      
      setLoading(false)
    }
    
    checkInitialSupport()
  }, [])

  // Set up foreground message handler when enabled
  useEffect(() => {
    if (!enabled || !user) return

    const unsubscribe = setupForegroundMessageHandler((payload) => {
      // Show in-app toast notification for foreground messages
      console.log('Foreground notification:', payload)
      
      // You could dispatch to a toast/snackbar system here
      // For now, show a native notification if page is visible but not focused
      if (document.visibilityState === 'visible' && !document.hasFocus()) {
        new Notification(payload.title, {
          body: payload.body,
          icon: '/icons/icon-192x192.png',
          tag: payload.data?.tag || 'foreground',
        })
      }
    })

    return () => {
      unsubscribe()
    }
  }, [enabled, user])

  // Check support
  const checkSupport = useCallback(async (): Promise<boolean> => {
    const isSupported = await checkPushSupport()
    setSupported(isSupported)
    return isSupported
  }, [])

  // Enable push notifications
  const enablePushNotifications = useCallback(async (): Promise<boolean> => {
    if (!user?.id) {
      setError('You must be logged in to enable notifications')
      return false
    }

    setLoading(true)
    setError(null)

    try {
      const state: PushNotificationState = await initializePushNotifications(user.id)
      
      setSupported(state.supported)
      setPermission(state.permission)
      setEnabled(state.token !== null)
      
      if (state.error) {
        setError(state.error)
        return false
      }
      
      return state.token !== null
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to enable notifications'
      setError(message)
      return false
    } finally {
      setLoading(false)
    }
  }, [user?.id])

  return {
    supported,
    permission,
    enabled,
    loading,
    error,
    enablePushNotifications,
    checkSupport,
  }
}

/**
 * Simplified hook that just checks if push is available
 */
export function usePushAvailable(): boolean {
  const [available, setAvailable] = useState(false)

  useEffect(() => {
    checkPushSupport().then(setAvailable)
  }, [])

  return available
}
