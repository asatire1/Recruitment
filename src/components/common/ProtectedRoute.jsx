import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

/**
 * ProtectedRoute - Wrapper for routes that require authentication
 * @param {Object} props
 * @param {React.ReactNode} props.children - Child components to render
 * @param {string[]} props.allowedRoles - Optional array of roles that can access this route
 */
export default function ProtectedRoute({ children, allowedRoles }) {
  const { isAuthenticated, userProfile, loading } = useAuth();
  const location = useLocation();

  // Still loading auth state
  if (loading) {
    return <LoadingScreen />;
  }

  // Not authenticated - redirect to login
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check role-based access if roles are specified
  if (allowedRoles && allowedRoles.length > 0) {
    const userRole = userProfile?.role;
    if (!userRole || !allowedRoles.includes(userRole)) {
      // User doesn't have required role - redirect to dashboard with message
      return <Navigate to="/" state={{ accessDenied: true }} replace />;
    }
  }

  return children;
}

/**
 * Loading screen shown while checking auth state
 */
function LoadingScreen() {
  return (
    <div className="loading-screen">
      <div className="loading-content">
        <div className="loading-spinner">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
            <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round" />
          </svg>
        </div>
        <p className="loading-text">Loading...</p>
      </div>
      
      <style>{`
        .loading-screen {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--bg-secondary);
        }
        
        .loading-content {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: var(--space-4);
        }
        
        .loading-spinner {
          width: 40px;
          height: 40px;
          color: var(--color-primary-600);
        }
        
        .loading-spinner svg {
          width: 100%;
          height: 100%;
          animation: spin 0.8s linear infinite;
        }
        
        .loading-text {
          font-size: var(--text-sm);
          color: var(--text-secondary);
          margin: 0;
        }
        
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
