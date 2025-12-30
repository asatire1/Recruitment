import { ReactNode, useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { NotificationBell } from './NotificationBell'
import { NotificationDropdown } from './NotificationDropdown'

interface AppLayoutProps {
  children: ReactNode
}

export function AppLayout({ children }: AppLayoutProps) {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)

  const handleSignOut = async () => {
    try {
      await signOut()
      navigate('/login')
    } catch (error) {
      console.error('Sign out failed:', error)
    }
  }

  // Get user initials for avatar
  const getInitials = () => {
    if (!user?.displayName) return 'BM'
    const parts = user.displayName.split(' ')
    return parts.map(p => p[0]).join('').toUpperCase().slice(0, 2)
  }

  // Close menus when clicking outside
  const handleBackdropClick = () => {
    setShowUserMenu(false)
    setShowNotifications(false)
  }

  // Handle notification bell click
  const handleNotificationClick = () => {
    setShowNotifications(!showNotifications)
    setShowUserMenu(false) // Close user menu if open
  }

  // Handle user menu click
  const handleUserMenuClick = () => {
    setShowUserMenu(!showUserMenu)
    setShowNotifications(false) // Close notifications if open
  }

  return (
    <div className="app-layout">
      {/* Header */}
      <header className="app-header">
        <div className="header-left">
          <h1 className="app-title">Branch Portal</h1>
        </div>
        <div className="header-right">
          {/* Notification Bell - B4.1 */}
          <NotificationBell 
            onClick={handleNotificationClick}
            isOpen={showNotifications}
          />
          
          {/* Notification Dropdown - B4.2 */}
          {showNotifications && (
            <>
              <div className="menu-backdrop" onClick={handleBackdropClick} />
              <NotificationDropdown onClose={handleBackdropClick} />
            </>
          )}

          {/* User Menu */}
          <button 
            className="user-menu-trigger"
            onClick={handleUserMenuClick}
            aria-expanded={showUserMenu}
            aria-haspopup="true"
          >
            <span className="user-avatar">{getInitials()}</span>
          </button>
          {showUserMenu && (
            <>
              <div className="menu-backdrop" onClick={handleBackdropClick} />
              <div className="user-menu">
                <div className="user-menu-header">
                  <span className="user-name">{user?.displayName}</span>
                  <span className="user-role">Branch Manager</span>
                </div>
                <hr />
                <button onClick={handleSignOut} className="menu-item">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                    <polyline points="16 17 21 12 16 7" />
                    <line x1="21" y1="12" x2="9" y2="12" />
                  </svg>
                  Sign Out
                </button>
              </div>
            </>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="app-main">
        {children}
      </main>

      {/* Bottom Navigation - Mobile-first */}
      <nav className="bottom-nav">
        <NavLink to="/" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} end>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
          <span>My Branch</span>
        </NavLink>
        <NavLink to="/calendar" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
          <span>Calendar</span>
        </NavLink>
        <NavLink to="/feedback" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
            <polyline points="10 9 9 9 8 9" />
          </svg>
          <span>Feedback</span>
        </NavLink>
      </nav>
    </div>
  )
}
