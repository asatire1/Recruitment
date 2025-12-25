import { useState, useEffect, useCallback } from 'react';

// PWA installation states
export const INSTALL_STATE = {
  IDLE: 'idle',
  AVAILABLE: 'available',
  INSTALLING: 'installing',
  INSTALLED: 'installed',
  NOT_SUPPORTED: 'not_supported'
};

// Push notification permission states
export const NOTIFICATION_STATE = {
  DEFAULT: 'default',
  GRANTED: 'granted',
  DENIED: 'denied',
  NOT_SUPPORTED: 'not_supported'
};

// Hook for PWA installation
export function usePWAInstall() {
  const [installState, setInstallState] = useState(INSTALL_STATE.IDLE);
  const [deferredPrompt, setDeferredPrompt] = useState(null);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setInstallState(INSTALL_STATE.INSTALLED);
      return;
    }

    // Check if PWA is supported
    if (!('serviceWorker' in navigator)) {
      setInstallState(INSTALL_STATE.NOT_SUPPORTED);
      return;
    }

    // Listen for install prompt
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setInstallState(INSTALL_STATE.AVAILABLE);
    };

    // Listen for successful installation
    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      setInstallState(INSTALL_STATE.INSTALLED);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const install = useCallback(async () => {
    if (!deferredPrompt) return false;

    setInstallState(INSTALL_STATE.INSTALLING);

    try {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
        setInstallState(INSTALL_STATE.INSTALLED);
        return true;
      } else {
        setInstallState(INSTALL_STATE.AVAILABLE);
        return false;
      }
    } catch (error) {
      console.error('PWA install error:', error);
      setInstallState(INSTALL_STATE.AVAILABLE);
      return false;
    }
  }, [deferredPrompt]);

  const dismiss = useCallback(() => {
    setInstallState(INSTALL_STATE.IDLE);
    // Store dismissal in localStorage
    localStorage.setItem('pwa_install_dismissed', Date.now().toString());
  }, []);

  // Check if user recently dismissed
  const wasDismissed = useCallback(() => {
    const dismissed = localStorage.getItem('pwa_install_dismissed');
    if (!dismissed) return false;
    
    const dismissedTime = parseInt(dismissed, 10);
    const daysSinceDismissal = (Date.now() - dismissedTime) / (1000 * 60 * 60 * 24);
    return daysSinceDismissal < 7; // Show again after 7 days
  }, []);

  return {
    installState,
    canInstall: installState === INSTALL_STATE.AVAILABLE && !wasDismissed(),
    isInstalled: installState === INSTALL_STATE.INSTALLED,
    install,
    dismiss
  };
}

// Hook for push notifications
export function usePushNotifications() {
  const [permission, setPermission] = useState(NOTIFICATION_STATE.DEFAULT);
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!('Notification' in window)) {
      setPermission(NOTIFICATION_STATE.NOT_SUPPORTED);
      return;
    }

    setPermission(Notification.permission);
  }, []);

  // Request notification permission
  const requestPermission = useCallback(async () => {
    if (!('Notification' in window)) {
      return NOTIFICATION_STATE.NOT_SUPPORTED;
    }

    setLoading(true);
    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      setLoading(false);
      return result;
    } catch (error) {
      console.error('Notification permission error:', error);
      setLoading(false);
      return NOTIFICATION_STATE.DENIED;
    }
  }, []);

  // Subscribe to push notifications
  const subscribe = useCallback(async (vapidPublicKey) => {
    if (permission !== NOTIFICATION_STATE.GRANTED) {
      const result = await requestPermission();
      if (result !== NOTIFICATION_STATE.GRANTED) {
        return null;
      }
    }

    setLoading(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      
      const sub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
      });

      setSubscription(sub);
      setLoading(false);
      return sub;
    } catch (error) {
      console.error('Push subscription error:', error);
      setLoading(false);
      return null;
    }
  }, [permission, requestPermission]);

  // Unsubscribe from push notifications
  const unsubscribe = useCallback(async () => {
    if (!subscription) return true;

    setLoading(true);
    try {
      await subscription.unsubscribe();
      setSubscription(null);
      setLoading(false);
      return true;
    } catch (error) {
      console.error('Push unsubscribe error:', error);
      setLoading(false);
      return false;
    }
  }, [subscription]);

  return {
    permission,
    subscription,
    loading,
    requestPermission,
    subscribe,
    unsubscribe,
    isSupported: permission !== NOTIFICATION_STATE.NOT_SUPPORTED,
    isGranted: permission === NOTIFICATION_STATE.GRANTED
  };
}

// Hook for service worker registration and updates
export function useServiceWorker() {
  const [registration, setRegistration] = useState(null);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    // Register service worker
    const registerSW = async () => {
      try {
        const reg = await navigator.serviceWorker.register('/service-worker.js');
        setRegistration(reg);

        // Check for updates
        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          
          newWorker?.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              setUpdateAvailable(true);
            }
          });
        });
      } catch (error) {
        console.error('Service worker registration failed:', error);
      }
    };

    registerSW();

    // Online/offline detection
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Update service worker
  const update = useCallback(async () => {
    if (!registration?.waiting) return;

    // Tell waiting SW to take over
    registration.waiting.postMessage({ type: 'SKIP_WAITING' });

    // Reload page to get new version
    window.location.reload();
  }, [registration]);

  // Check for updates manually
  const checkForUpdates = useCallback(async () => {
    if (!registration) return;
    
    try {
      await registration.update();
    } catch (error) {
      console.error('Update check failed:', error);
    }
  }, [registration]);

  return {
    registration,
    updateAvailable,
    isOnline,
    update,
    checkForUpdates
  };
}

// Hook for offline data storage
export function useOfflineStorage() {
  const [isSupported] = useState('indexedDB' in window);

  // Store data for offline access
  const store = useCallback(async (storeName, data) => {
    if (!isSupported) return false;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open('AlliedPortalOffline', 1);
      
      request.onerror = () => reject(request.error);
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(storeName)) {
          db.createObjectStore(storeName, { keyPath: 'id' });
        }
      };

      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction(storeName, 'readwrite');
        const store = transaction.objectStore(storeName);
        
        const putRequest = store.put(data);
        putRequest.onsuccess = () => resolve(true);
        putRequest.onerror = () => reject(putRequest.error);
      };
    });
  }, [isSupported]);

  // Retrieve data from offline storage
  const retrieve = useCallback(async (storeName, id) => {
    if (!isSupported) return null;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open('AlliedPortalOffline', 1);
      
      request.onerror = () => reject(request.error);

      request.onsuccess = () => {
        const db = request.result;
        
        if (!db.objectStoreNames.contains(storeName)) {
          resolve(null);
          return;
        }

        const transaction = db.transaction(storeName, 'readonly');
        const store = transaction.objectStore(storeName);
        
        const getRequest = id ? store.get(id) : store.getAll();
        getRequest.onsuccess = () => resolve(getRequest.result);
        getRequest.onerror = () => reject(getRequest.error);
      };
    });
  }, [isSupported]);

  // Remove data from offline storage
  const remove = useCallback(async (storeName, id) => {
    if (!isSupported) return false;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open('AlliedPortalOffline', 1);
      
      request.onerror = () => reject(request.error);

      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction(storeName, 'readwrite');
        const store = transaction.objectStore(storeName);
        
        const deleteRequest = store.delete(id);
        deleteRequest.onsuccess = () => resolve(true);
        deleteRequest.onerror = () => reject(deleteRequest.error);
      };
    });
  }, [isSupported]);

  // Queue action for background sync
  const queueForSync = useCallback(async (action) => {
    await store('pendingActions', {
      id: Date.now().toString(),
      ...action,
      queuedAt: new Date().toISOString()
    });

    // Request background sync if supported
    if ('serviceWorker' in navigator && 'SyncManager' in window) {
      const registration = await navigator.serviceWorker.ready;
      await registration.sync.register('sync-pending-actions');
    }
  }, [store]);

  return {
    isSupported,
    store,
    retrieve,
    remove,
    queueForSync
  };
}

// Utility: Convert VAPID key
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export default usePWAInstall;
