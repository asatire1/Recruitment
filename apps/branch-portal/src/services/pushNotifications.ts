/**
 * Push Notification Service
 * Handles FCM token management and push notification permissions
 */

import { getMessaging, getToken, onMessage, isSupported } from 'firebase/messaging'
import { getFirestore, doc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore'
import { getApp } from 'firebase/app'

// Firebase Cloud Messaging VAPID key
const VAPID_KEY = 'BNpA9W9_Fq4oVRAQnfHq0z5ZBu_WHB6BDBcTLJvAHkPeMA'

export interface PushNotificationState {
  supported: boolean
  permission: NotificationPermission
  token: string | null
  error: string | null
}

/**
 * Check if push notifications are supported
 */
export async function checkPushSupport(): Promise<boolean> {
  // Check browser support
  if (!('Notification' in window)) {
    console.log('This browser does not support notifications')
    return false
  }

  if (!('serviceWorker' in navigator)) {
    console.log('This browser does not support service workers')
    return false
  }

  // Check Firebase Messaging support
  try {
    const supported = await isSupported()
    return supported
  } catch (error) {
    console.error('Error checking FCM support:', error)
    return false
  }
}

/**
 * Get current notification permission status
 */
export function getPermissionStatus(): NotificationPermission {
  if (!('Notification' in window)) {
    return 'denied'
  }
  return Notification.permission
}

/**
 * Request notification permission from user
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) {
    return 'denied'
  }

  try {
    const permission = await Notification.requestPermission()
    return permission
  } catch (error) {
    console.error('Error requesting notification permission:', error)
    return 'denied'
  }
}

/**
 * Get FCM token for this device
 */
export async function getFCMToken(): Promise<string | null> {
  try {
    const supported = await checkPushSupport()
    if (!supported) {
      console.log('Push notifications not supported')
      return null
    }

    if (Notification.permission !== 'granted') {
      console.log('Notification permission not granted')
      return null
    }

    // Register service worker if not already registered
    const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js')
    
    const app = getApp()
    const messaging = getMessaging(app)
    
    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: registration,
    })

    if (token) {
      console.log('FCM token obtained')
      return token
    } else {
      console.log('No FCM token available')
      return null
    }
  } catch (error) {
    console.error('Error getting FCM token:', error)
    return null
  }
}

/**
 * Save FCM token to Firestore for a user
 */
export async function saveFCMToken(userId: string, token: string): Promise<void> {
  try {
    const db = getFirestore()
    const tokenRef = doc(db, 'fcmTokens', token)
    
    await setDoc(tokenRef, {
      userId,
      token,
      platform: 'web',
      userAgent: navigator.userAgent,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
    
    console.log('FCM token saved to Firestore')
  } catch (error) {
    console.error('Error saving FCM token:', error)
    throw error
  }
}

/**
 * Remove FCM token from Firestore
 */
export async function removeFCMToken(token: string): Promise<void> {
  try {
    const db = getFirestore()
    const tokenRef = doc(db, 'fcmTokens', token)
    await deleteDoc(tokenRef)
    console.log('FCM token removed from Firestore')
  } catch (error) {
    console.error('Error removing FCM token:', error)
    throw error
  }
}

/**
 * Set up foreground message handler
 * This handles notifications when the app is in the foreground
 */
export function setupForegroundMessageHandler(
  onNotification: (payload: { title: string; body: string; data?: Record<string, string> }) => void
): () => void {
  try {
    const app = getApp()
    const messaging = getMessaging(app)
    
    const unsubscribe = onMessage(messaging, (payload) => {
      console.log('Foreground message received:', payload)
      
      const title = payload.notification?.title || 'New Notification'
      const body = payload.notification?.body || ''
      const data = payload.data as Record<string, string> | undefined
      
      onNotification({ title, body, data })
    })
    
    return unsubscribe
  } catch (error) {
    console.error('Error setting up foreground message handler:', error)
    return () => {}
  }
}

/**
 * Initialize push notifications for a user
 * Requests permission, gets token, and saves to Firestore
 */
export async function initializePushNotifications(userId: string): Promise<PushNotificationState> {
  const state: PushNotificationState = {
    supported: false,
    permission: 'default',
    token: null,
    error: null,
  }

  try {
    // Check support
    state.supported = await checkPushSupport()
    if (!state.supported) {
      state.error = 'Push notifications not supported on this device'
      return state
    }

    // Check/request permission
    state.permission = getPermissionStatus()
    if (state.permission === 'default') {
      state.permission = await requestNotificationPermission()
    }

    if (state.permission !== 'granted') {
      state.error = 'Notification permission denied'
      return state
    }

    // Get FCM token
    state.token = await getFCMToken()
    if (!state.token) {
      state.error = 'Failed to get push notification token'
      return state
    }

    // Save token to Firestore
    await saveFCMToken(userId, state.token)

    return state
  } catch (error) {
    console.error('Error initializing push notifications:', error)
    state.error = error instanceof Error ? error.message : 'Unknown error'
    return state
  }
}
