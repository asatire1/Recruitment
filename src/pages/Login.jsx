import React, { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './Login.css';

export default function Login() {
  const { user, signIn, resetPassword, loading } = useAuth();
  const navigate = useNavigate();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showReset, setShowReset] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  // Redirect if already logged in
  if (user && !loading) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      await signIn(email, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.code === 'auth/invalid-credential' 
        ? 'Invalid email or password' 
        : err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = async (e) => {
    e.preventDefault();
    if (!email) {
      setError('Please enter your email address');
      return;
    }
    
    setIsSubmitting(true);
    try {
      await resetPassword(email);
      setResetSent(true);
      setError('');
    } catch (err) {
      setError('Could not send reset email. Please check the address.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-header">
          <h1>Allied HR</h1>
          <p>Recruitment Portal</p>
        </div>

        {resetSent ? (
          <div className="reset-success">
            <h2>Check your email</h2>
            <p>We've sent password reset instructions to {email}</p>
            <button onClick={() => { setShowReset(false); setResetSent(false); }}>
              Back to login
            </button>
          </div>
        ) : showReset ? (
          <form className="login-form" onSubmit={handleReset}>
            <h2>Reset Password</h2>
            <p>Enter your email to receive reset instructions</p>
            
            {error && <div className="error-message">{error}</div>}
            
            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                required
              />
            </div>

            <button type="submit" className="submit-btn" disabled={isSubmitting}>
              {isSubmitting ? 'Sending...' : 'Send Reset Link'}
            </button>

            <button 
              type="button" 
              className="back-btn"
              onClick={() => setShowReset(false)}
            >
              Back to login
            </button>
          </form>
        ) : (
          <form className="login-form" onSubmit={handleSubmit}>
            {error && <div className="error-message">{error}</div>}
            
            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>

            <button type="submit" className="submit-btn" disabled={isSubmitting}>
              {isSubmitting ? 'Signing in...' : 'Sign In'}
            </button>

            <button 
              type="button" 
              className="forgot-btn"
              onClick={() => setShowReset(true)}
            >
              Forgot password?
            </button>
          </form>
        )}

        <div className="login-footer">
          <p>© 2024 Allied Pharmacies</p>
        </div>
      </div>
    </div>
  );
}
