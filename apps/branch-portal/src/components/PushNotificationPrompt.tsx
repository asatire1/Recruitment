import { useState, useEffect } from 'react'
import { usePushNotifications } from '../hooks/usePushNotifications'

interface PushNotificationPromptProps {
  /** Delay before showing prompt (ms) */
  delay?: number
  /** Called when user dismisses */
  onDismiss?: () => void
  /** Called when notifications enabled */
  onEnabled?: () => void
}

/**
 * Banner prompt to enable push notifications
 * Shows after a delay, can be dismissed
 */
export function PushNotificationPrompt({ 
  delay = 5000,
  onDismiss,
  onEnabled,
}: PushNotificationPromptProps) {
  const { 
    supported, 
    permission, 
    enabled, 
    loading, 
    error,
    enablePushNotifications 
  } = usePushNotifications()
  
  const [visible, setVisible] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const [enabling, setEnabling] = useState(false)

  // Check if we should show the prompt
  useEffect(() => {
    // Don't show if:
    // - Already dismissed this session
    // - Not supported
    // - Permission already granted or denied
    // - Already enabled
    // - Still loading
    if (
      dismissed ||
      !supported ||
      permission !== 'default' ||
      enabled ||
      loading
    ) {
      return
    }

    // Check localStorage for previous dismissal
    const lastDismissed = localStorage.getItem('pushPromptDismissed')
    if (lastDismissed) {
      const dismissedDate = new Date(lastDismissed)
      const daysSinceDismissed = (Date.now() - dismissedDate.getTime()) / (1000 * 60 * 60 * 24)
      // Don't show again for 7 days after dismissal
      if (daysSinceDismissed < 7) {
        return
      }
    }

    // Show after delay
    const timer = setTimeout(() => {
      setVisible(true)
    }, delay)

    return () => clearTimeout(timer)
  }, [supported, permission, enabled, loading, dismissed, delay])

  const handleEnable = async () => {
    setEnabling(true)
    const success = await enablePushNotifications()
    setEnabling(false)
    
    if (success) {
      setVisible(false)
      onEnabled?.()
    }
  }

  const handleDismiss = () => {
    setVisible(false)
    setDismissed(true)
    localStorage.setItem('pushPromptDismissed', new Date().toISOString())
    onDismiss?.()
  }

  if (!visible) return null

  return (
    <div className="push-prompt">
      <div className="push-prompt__icon">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
      </div>
      
      <div className="push-prompt__content">
        <span className="push-prompt__title">Enable Push Notifications</span>
        <span className="push-prompt__message">
          Get notified about new trials and feedback reminders
        </span>
        {error && (
          <span className="push-prompt__error">{error}</span>
        )}
      </div>
      
      <div className="push-prompt__actions">
        <button 
          className="push-prompt__btn push-prompt__btn--secondary"
          onClick={handleDismiss}
          disabled={enabling}
        >
          Not now
        </button>
        <button 
          className="push-prompt__btn push-prompt__btn--primary"
          onClick={handleEnable}
          disabled={enabling}
        >
          {enabling ? 'Enabling...' : 'Enable'}
        </button>
      </div>
      
      <button 
        className="push-prompt__close"
        onClick={handleDismiss}
        aria-label="Close"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>
  )
}

/**
 * Settings toggle for push notifications
 * For use in a settings page
 */
export function PushNotificationToggle() {
  const { 
    supported, 
    permission, 
    enabled, 
    loading,
    error,
    enablePushNotifications 
  } = usePushNotifications()
  
  const [enabling, setEnabling] = useState(false)

  const handleToggle = async () => {
    if (enabled) {
      // Could implement disable here
      return
    }
    
    setEnabling(true)
    await enablePushNotifications()
    setEnabling(false)
  }

  if (!supported) {
    return (
      <div className="push-toggle push-toggle--unsupported">
        <div className="push-toggle__label">
          <span className="push-toggle__title">Push Notifications</span>
          <span className="push-toggle__status">Not supported on this device</span>
        </div>
      </div>
    )
  }

  if (permission === 'denied') {
    return (
      <div className="push-toggle push-toggle--denied">
        <div className="push-toggle__label">
          <span className="push-toggle__title">Push Notifications</span>
          <span className="push-toggle__status">
            Blocked - enable in browser settings
          </span>
        </div>
      </div>
    )
  }

  return (
    <div className="push-toggle">
      <div className="push-toggle__label">
        <span className="push-toggle__title">Push Notifications</span>
        <span className="push-toggle__status">
          {enabled ? 'Enabled' : 'Disabled'}
        </span>
        {error && <span className="push-toggle__error">{error}</span>}
      </div>
      
      <button
        className={`push-toggle__switch ${enabled ? 'active' : ''}`}
        onClick={handleToggle}
        disabled={loading || enabling || enabled}
        aria-pressed={enabled}
        aria-label={enabled ? 'Notifications enabled' : 'Enable notifications'}
      >
        <span className="push-toggle__switch-thumb" />
      </button>
    </div>
  )
}
