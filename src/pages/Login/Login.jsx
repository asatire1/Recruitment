import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Building2, Mail, Lock, Eye, EyeOff, AlertCircle, User } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Button, Input } from '../../components/ui';
import './Login.css';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [mode, setMode] = useState('login'); // 'login', 'register', 'forgot'
  const [resetEmailSent, setResetEmailSent] = useState(false);

  const { signIn, signUp, resetPassword } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Get the page they were trying to visit
  const from = location.state?.from?.pathname || '/';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      if (mode === 'register') {
        if (!displayName.trim()) {
          throw new Error('Please enter your name');
        }
        await signUp(email, password, displayName);
      } else {
        await signIn(email, password);
      }
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    if (!email) {
      setError('Please enter your email address');
      return;
    }

    setError('');
    setIsLoading(true);

    try {
      await resetPassword(email);
      setResetEmailSent(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const switchMode = (newMode) => {
    setMode(newMode);
    setError('');
    setResetEmailSent(false);
  };

  return (
    <div className="login-page">
      <div className="login-container">
        {/* Left side - Branding */}
        <div className="login-branding">
          <div className="login-branding-content">
            <div className="login-logo">
              <Building2 size={32} />
            </div>
            <h1 className="login-brand-title">Allied Pharmacies</h1>
            <p className="login-brand-subtitle">Recruitment Portal</p>
            
            <div className="login-features">
              <div className="login-feature">
                <div className="login-feature-dot" />
                <span>Streamlined candidate management</span>
              </div>
              <div className="login-feature">
                <div className="login-feature-dot" />
                <span>CV parsing & tracking</span>
              </div>
              <div className="login-feature">
                <div className="login-feature-dot" />
                <span>Interview scheduling</span>
              </div>
              <div className="login-feature">
                <div className="login-feature-dot" />
                <span>Multi-branch support</span>
              </div>
            </div>
          </div>
          
          <p className="login-branding-footer">
            © {new Date().getFullYear()} Allied Pharmacies. All rights reserved.
          </p>
        </div>

        {/* Right side - Form */}
        <div className="login-form-section">
          <div className="login-form-container">
            {mode === 'login' && (
              <>
                <div className="login-form-header">
                  <h2 className="login-form-title">Welcome back</h2>
                  <p className="login-form-subtitle">Sign in to your account to continue</p>
                </div>

                {error && (
                  <div className="login-error">
                    <AlertCircle size={18} />
                    <span>{error}</span>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="login-form">
                  <div className="login-field">
                    <Input
                      label="Email address"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@alliedpharmacies.co.uk"
                      leftIcon={<Mail size={18} />}
                      required
                      autoComplete="email"
                      autoFocus
                    />
                  </div>

                  <div className="login-field">
                    <Input
                      label="Password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      leftIcon={<Lock size={18} />}
                      rightIcon={
                        <button
                          type="button"
                          className="login-password-toggle"
                          onClick={() => setShowPassword(!showPassword)}
                          tabIndex={-1}
                        >
                          {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      }
                      required
                      autoComplete="current-password"
                    />
                  </div>

                  <div className="login-options">
                    <label className="login-remember">
                      <input type="checkbox" />
                      <span>Remember me</span>
                    </label>
                    <button
                      type="button"
                      className="login-forgot-link"
                      onClick={() => switchMode('forgot')}
                    >
                      Forgot password?
                    </button>
                  </div>

                  <Button
                    type="submit"
                    fullWidth
                    loading={isLoading}
                    size="lg"
                  >
                    Sign in
                  </Button>
                </form>

                <div className="login-switch">
                  <span>Don't have an account?</span>
                  <button type="button" onClick={() => switchMode('register')}>
                    Create account
                  </button>
                </div>
              </>
            )}

            {mode === 'register' && (
              <>
                <div className="login-form-header">
                  <h2 className="login-form-title">Create account</h2>
                  <p className="login-form-subtitle">Get started with the recruitment portal</p>
                </div>

                {error && (
                  <div className="login-error">
                    <AlertCircle size={18} />
                    <span>{error}</span>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="login-form">
                  <div className="login-field">
                    <Input
                      label="Full name"
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="John Smith"
                      leftIcon={<User size={18} />}
                      required
                      autoComplete="name"
                      autoFocus
                    />
                  </div>

                  <div className="login-field">
                    <Input
                      label="Email address"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@alliedpharmacies.co.uk"
                      leftIcon={<Mail size={18} />}
                      required
                      autoComplete="email"
                    />
                  </div>

                  <div className="login-field">
                    <Input
                      label="Password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Min 6 characters"
                      leftIcon={<Lock size={18} />}
                      rightIcon={
                        <button
                          type="button"
                          className="login-password-toggle"
                          onClick={() => setShowPassword(!showPassword)}
                          tabIndex={-1}
                        >
                          {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      }
                      required
                      autoComplete="new-password"
                    />
                  </div>

                  <Button
                    type="submit"
                    fullWidth
                    loading={isLoading}
                    size="lg"
                  >
                    Create account
                  </Button>
                </form>

                <div className="login-switch">
                  <span>Already have an account?</span>
                  <button type="button" onClick={() => switchMode('login')}>
                    Sign in
                  </button>
                </div>
              </>
            )}

            {mode === 'forgot' && (
              <>
                <div className="login-form-header">
                  <h2 className="login-form-title">Reset password</h2>
                  <p className="login-form-subtitle">
                    {resetEmailSent 
                      ? 'Check your email for reset instructions'
                      : 'Enter your email to receive a password reset link'
                    }
                  </p>
                </div>

                {error && (
                  <div className="login-error">
                    <AlertCircle size={18} />
                    <span>{error}</span>
                  </div>
                )}

                {resetEmailSent ? (
                  <div className="login-success">
                    <p>We've sent a password reset link to <strong>{email}</strong></p>
                    <p className="login-success-hint">Didn't receive it? Check your spam folder or try again.</p>
                  </div>
                ) : (
                  <form onSubmit={handleForgotPassword} className="login-form">
                    <div className="login-field">
                      <Input
                        label="Email address"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@alliedpharmacies.co.uk"
                        leftIcon={<Mail size={18} />}
                        required
                        autoComplete="email"
                        autoFocus
                      />
                    </div>

                    <Button
                      type="submit"
                      fullWidth
                      loading={isLoading}
                      size="lg"
                    >
                      Send reset link
                    </Button>
                  </form>
                )}

                <button
                  type="button"
                  className="login-back-link"
                  onClick={() => switchMode('login')}
                >
                  ← Back to sign in
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
