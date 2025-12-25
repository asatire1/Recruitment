/**
 * Service Worker for Allied Recruitment Portal PWA
 * Handles caching, offline support, and push notifications
 */

const CACHE_NAME = 'allied-portal-v1';
const OFFLINE_URL = '/offline.html';

// Assets to cache immediately on install
const STATIC_ASSETS = [
  '/',
  '/manager',
  '/manager/reviews',
  '/manager/schedule',
  '/offline.html',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/manifest.json'
];

// API routes to cache with network-first strategy
const API_ROUTES = [
  '/api/candidates',
  '/api/events',
  '/api/branches'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        // Force waiting SW to become active
        return self.skipWaiting();
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => name !== CACHE_NAME)
            .map((name) => {
              console.log('[SW] Deleting old cache:', name);
              return caches.delete(name);
            })
        );
      })
      .then(() => {
        // Take control of all clients immediately
        return self.clients.claim();
      })
  );
});

// Fetch event - serve from cache or network
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip cross-origin requests (except for specific APIs)
  if (url.origin !== location.origin && !url.hostname.includes('firestore')) {
    return;
  }

  // Handle API requests with network-first strategy
  if (isApiRequest(url)) {
    event.respondWith(networkFirst(request));
    return;
  }

  // Handle navigation requests
  if (request.mode === 'navigate') {
    event.respondWith(navigationHandler(request));
    return;
  }

  // Handle static assets with cache-first strategy
  event.respondWith(cacheFirst(request));
});

// Check if request is an API call
function isApiRequest(url) {
  return API_ROUTES.some(route => url.pathname.startsWith(route)) ||
         url.hostname.includes('firestore') ||
         url.hostname.includes('googleapis');
}

// Cache-first strategy (for static assets)
async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) {
    return cached;
  }
  
  try {
    const response = await fetch(request);
    
    // Cache successful responses
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    
    return response;
  } catch (error) {
    console.log('[SW] Fetch failed:', error);
    // Return offline fallback for images
    if (request.destination === 'image') {
      return caches.match('/icons/placeholder.png');
    }
    throw error;
  }
}

// Network-first strategy (for API requests)
async function networkFirst(request) {
  try {
    const response = await fetch(request);
    
    // Cache successful API responses
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    
    return response;
  } catch (error) {
    console.log('[SW] Network request failed, trying cache:', request.url);
    const cached = await caches.match(request);
    if (cached) {
      return cached;
    }
    throw error;
  }
}

// Navigation handler with offline fallback
async function navigationHandler(request) {
  try {
    // Try network first for navigation
    const response = await fetch(request);
    return response;
  } catch (error) {
    console.log('[SW] Navigation failed, serving offline page');
    
    // Try to serve cached page
    const cached = await caches.match(request);
    if (cached) {
      return cached;
    }
    
    // Serve offline page as fallback
    return caches.match(OFFLINE_URL);
  }
}

// Push notification event
self.addEventListener('push', (event) => {
  console.log('[SW] Push notification received');
  
  let data = {
    title: 'Allied Recruitment',
    body: 'You have a new notification',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    tag: 'default',
    data: {}
  };

  if (event.data) {
    try {
      data = { ...data, ...event.data.json() };
    } catch (e) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: data.icon,
    badge: data.badge,
    tag: data.tag,
    data: data.data,
    vibrate: [100, 50, 100],
    actions: data.actions || [],
    requireInteraction: data.requireInteraction || false
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event.notification.tag);
  
  event.notification.close();

  const urlToOpen = event.notification.data?.url || '/manager';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((windowClients) => {
        // Check if there's already an open window
        for (const client of windowClients) {
          if (client.url.includes('/manager') && 'focus' in client) {
            client.navigate(urlToOpen);
            return client.focus();
          }
        }
        // Open new window if none exists
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync:', event.tag);

  if (event.tag === 'sync-candidate-reviews') {
    event.waitUntil(syncCandidateReviews());
  }
  
  if (event.tag === 'sync-schedule-updates') {
    event.waitUntil(syncScheduleUpdates());
  }
});

// Sync pending candidate reviews
async function syncCandidateReviews() {
  try {
    const db = await openIndexedDB();
    const pendingReviews = await getPendingItems(db, 'pendingReviews');
    
    for (const review of pendingReviews) {
      try {
        await fetch('/api/candidates/review', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(review)
        });
        await deletePendingItem(db, 'pendingReviews', review.id);
      } catch (error) {
        console.log('[SW] Failed to sync review:', review.id);
      }
    }
  } catch (error) {
    console.error('[SW] Sync failed:', error);
  }
}

// Sync pending schedule updates
async function syncScheduleUpdates() {
  try {
    const db = await openIndexedDB();
    const pendingUpdates = await getPendingItems(db, 'pendingSchedule');
    
    for (const update of pendingUpdates) {
      try {
        await fetch('/api/events/update', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(update)
        });
        await deletePendingItem(db, 'pendingSchedule', update.id);
      } catch (error) {
        console.log('[SW] Failed to sync schedule:', update.id);
      }
    }
  } catch (error) {
    console.error('[SW] Sync failed:', error);
  }
}

// IndexedDB helpers
function openIndexedDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('AlliedPortalOffline', 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('pendingReviews')) {
        db.createObjectStore('pendingReviews', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('pendingSchedule')) {
        db.createObjectStore('pendingSchedule', { keyPath: 'id' });
      }
    };
  });
}

function getPendingItems(db, storeName) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readonly');
    const store = transaction.objectStore(storeName);
    const request = store.getAll();
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

function deletePendingItem(db, storeName, id) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.delete(id);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

// Message handler for client communication
self.addEventListener('message', (event) => {
  console.log('[SW] Message received:', event.data);

  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data.type === 'CACHE_URLS') {
    caches.open(CACHE_NAME).then((cache) => {
      cache.addAll(event.data.urls);
    });
  }
});
