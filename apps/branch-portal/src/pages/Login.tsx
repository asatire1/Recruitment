import { useState, FormEvent } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Button, Input, Alert } from '@allied/shared-ui'

export function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(true)
  const [isLoading, setIsLoading] = useState(false)
  const [showForgotPassword, setShowForgotPassword] = useState(false)
  const [resetSent, setResetSent] = useState(false)

  const { signIn, resetPassword, error, clearError } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  // Get the intended destination (default to dashboard)
  const from = (location.state as any)?.from?.pathname || '/'

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    clearError()
    setIsLoading(true)

    try {
      await signIn(email, password, remember)
      navigate(from, { replace: true })
    } catch {
      // Error is handled by context
    } finally {
      setIsLoading(false)
    }
  }

  const handleForgotPassword = async (e: FormEvent) => {
    e.preventDefault()
    if (!email) {
      return
    }
    
    setIsLoading(true)
    try {
      await resetPassword(email)
      setResetSent(true)
    } finally {
      setIsLoading(false)
    }
  }

  if (showForgotPassword) {
    return (
      <div className="login-page">
        <div className="login-card">
          <div className="login-header">
            <div className="login-logo">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </svg>
            </div>
            <h1>Reset Password</h1>
            <p>Enter your email to receive a reset link</p>
          </div>

          {resetSent ? (
            <div className="reset-success">
              <Alert variant="success">
                If an account exists with this email, you will receive a password reset link.
              </Alert>
              <Button 
                type="button" 
                variant="secondary"
                onClick={() => {
                  setShowForgotPassword(false)
                  setResetSent(false)
                }}
                fullWidth
              >
                Back to Login
              </Button>
            </div>
          ) : (
            <form onSubmit={handleForgotPassword}>
              <div className="form-group">
                <Input
                  type="email"
                  label="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your.email@alliedpharmacies.com"
                  required
                  autoFocus
                />
              </div>

              <Button 
                type="submit" 
                loading={isLoading}
                fullWidth
              >
                Send Reset Link
              </Button>

              <button 
                type="button"
                className="back-link"
                onClick={() => setShowForgotPassword(false)}
              >
                ← Back to Login
              </button>
            </form>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-header">
          <div className="login-logo">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
          </div>
          <h1>Branch Portal</h1>
          <p>Sign in to manage your branch</p>
        </div>

        {error && (
          <Alert variant="error" onDismiss={clearError}>
            {error}
          </Alert>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <Input
              type="email"
              label="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your.email@alliedpharmacies.com"
              required
              autoFocus
            />
          </div>

          <div className="form-group">
            <Input
              type="password"
              label="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
            />
          </div>

          <div className="form-row">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
              />
              <span>Remember me</span>
            </label>
            <button 
              type="button"
              className="forgot-link"
              onClick={() => setShowForgotPassword(true)}
            >
              Forgot password?
            </button>
          </div>

          <Button 
            type="submit" 
            loading={isLoading}
            fullWidth
          >
            Sign In
          </Button>
        </form>

        <div className="login-footer">
          <p>Branch managers only. Need access? Contact your regional manager.</p>
        </div>
      </div>

      {/* Install prompt for PWA */}
      <InstallPrompt />
    </div>
  )
}

// PWA Install prompt component
function InstallPrompt() {
  const [showPrompt, setShowPrompt] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)

  // Listen for beforeinstallprompt event
  useState(() => {
    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setShowPrompt(true)
    }

    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  })

  const handleInstall = async () => {
    if (!deferredPrompt) return
    
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    
    if (outcome === 'accepted') {
      setShowPrompt(false)
    }
    setDeferredPrompt(null)
  }

  if (!showPrompt) return null

  return (
    <div className="install-prompt">
      <p>Install Branch Portal for quick access</p>
      <div className="install-actions">
        <button onClick={() => setShowPrompt(false)} className="dismiss">
          Not now
        </button>
        <button onClick={handleInstall} className="install">
          Install
        </button>
      </div>
    </div>
  )
}
