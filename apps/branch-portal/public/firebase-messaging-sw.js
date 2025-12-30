/**
 * Firebase Messaging Service Worker
 * Handles push notifications when app is in background
 */

// Import Firebase scripts
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-messaging-compat.js');

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAewXWSniSC_XYLrDBATgrJxx-n6jXxp_Q",
  authDomain: "recruitment-633bd.firebaseapp.com",
  projectId: "recruitment-633bd",
  storageBucket: "recruitment-633bd.firebasestorage.app",
  messagingSenderId: "1062908743824",
  appId: "1:1062908743824:web:e5e47e5cc1462091fdc815"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Initialize Firebase Messaging
const messaging = firebase.messaging();

/**
 * Handle background messages
 * This is called when the app is not in the foreground
 */
messaging.onBackgroundMessage((payload) => {
  console.log('[SW] Background message received:', payload);

  const notificationTitle = payload.notification?.title || 'Branch Portal';
  const notificationOptions = {
    body: payload.notification?.body || 'You have a new notification',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    tag: payload.data?.tag || 'default',
    data: payload.data || {},
    requireInteraction: payload.data?.requireInteraction === 'true',
    actions: getNotificationActions(payload.data?.type),
  };

  return self.registration.showNotification(notificationTitle, notificationOptions);
});

/**
 * Get notification actions based on type
 */
function getNotificationActions(type) {
  switch (type) {
    case 'trial_scheduled':
      return [
        { action: 'view', title: 'View Details' },
        { action: 'calendar', title: 'Open Calendar' },
      ];
    case 'feedback_required':
      return [
        { action: 'submit', title: 'Submit Feedback' },
        { action: 'later', title: 'Remind Later' },
      ];
    default:
      return [
        { action: 'view', title: 'View' },
      ];
  }
}

/**
 * Handle notification click
 */
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event);
  
  event.notification.close();

  const data = event.notification.data || {};
  let targetUrl = '/';

  // Determine URL based on action and notification type
  if (event.action === 'view' || event.action === 'submit') {
    if (data.link) {
      targetUrl = data.link;
    } else if (data.type === 'trial_scheduled' && data.interviewId) {
      targetUrl = `/feedback/${data.interviewId}`;
    } else if (data.type === 'feedback_required' && data.interviewId) {
      targetUrl = `/feedback/${data.interviewId}`;
    }
  } else if (event.action === 'calendar') {
    targetUrl = '/calendar';
  } else if (event.action === 'later') {
    // Don't navigate, just close
    return;
  } else {
    // Default click (no action button)
    if (data.link) {
      targetUrl = data.link;
    }
  }

  // Focus existing window or open new one
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Check if there's already a window open
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.focus();
          client.navigate(targetUrl);
          return;
        }
      }
      // Open new window if none found
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});

/**
 * Handle notification close
 */
self.addEventListener('notificationclose', (event) => {
  console.log('[SW] Notification closed:', event);
});

/**
 * Handle push subscription change
 */
self.addEventListener('pushsubscriptionchange', (event) => {
  console.log('[SW] Push subscription changed');
});

console.log('[SW] Firebase Messaging Service Worker loaded');
