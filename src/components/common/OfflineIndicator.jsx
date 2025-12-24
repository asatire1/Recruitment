import { useState, useEffect } from 'react';
import { WifiOff, Wifi } from 'lucide-react';
import './OfflineIndicator.css';

/**
 * OfflineIndicator - Shows a banner when the app is offline
 * Also shows a brief "back online" message when reconnecting
 */
export default function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showReconnected, setShowReconnected] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowReconnected(true);
      // Hide the "back online" message after 3 seconds
      setTimeout(() => setShowReconnected(false), 3000);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowReconnected(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Don't render anything if online and not showing reconnected message
  if (isOnline && !showReconnected) {
    return null;
  }

  return (
    <div className={`offline-indicator ${isOnline ? 'online' : 'offline'}`}>
      {isOnline ? (
        <>
          <Wifi size={16} />
          <span>Back online - syncing changes...</span>
        </>
      ) : (
        <>
          <WifiOff size={16} />
          <span>You're offline - changes will sync when reconnected</span>
        </>
      )}
    </div>
  );
}
