import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Briefcase,
  CalendarDays,
  Settings,
  ChevronLeft,
  LogOut,
  Building2
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import './Sidebar.css';

const navItems = [
  {
    label: 'Dashboard',
    path: '/',
    icon: LayoutDashboard
  },
  {
    label: 'Candidates',
    path: '/candidates',
    icon: Users
  },
  {
    label: 'Job Listings',
    path: '/jobs',
    icon: Briefcase
  },
  {
    label: 'Calendar',
    path: '/calendar',
    icon: CalendarDays
  },
  {
    label: 'Settings',
    path: '/settings',
    icon: Settings
  }
];

export default function Sidebar({ collapsed, onToggle }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { userProfile, signOut } = useAuth();

  // Get user initials for avatar
  const getInitials = () => {
    if (userProfile?.displayName) {
      return userProfile.displayName
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    }
    if (userProfile?.email) {
      return userProfile.email[0].toUpperCase();
    }
    return '?';
  };

  // Get display name
  const getDisplayName = () => {
    return userProfile?.displayName || userProfile?.email?.split('@')[0] || 'User';
  };

  // Get role display
  const getRoleDisplay = () => {
    const role = userProfile?.role || 'recruiter';
    return role.charAt(0).toUpperCase() + role.slice(1);
  };

  // Handle sign out
  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/login');
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  return (
    <aside className={`sidebar ${collapsed ? 'sidebar-collapsed' : ''}`}>
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">
            <Building2 size={24} />
          </div>
          {!collapsed && (
            <div className="sidebar-logo-text">
              <span className="sidebar-logo-title">Allied</span>
              <span className="sidebar-logo-subtitle">Recruitment</span>
            </div>
          )}
        </div>
        <button
          className="sidebar-toggle"
          onClick={onToggle}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <ChevronLeft size={18} />
        </button>
      </div>

      <nav className="sidebar-nav">
        <ul className="sidebar-nav-list">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path || 
              (item.path !== '/' && location.pathname.startsWith(item.path));

            return (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  className={`sidebar-nav-item ${isActive ? 'sidebar-nav-item-active' : ''}`}
                  title={collapsed ? item.label : undefined}
                >
                  <span className="sidebar-nav-icon">
                    <Icon size={20} />
                  </span>
                  {!collapsed && (
                    <span className="sidebar-nav-label">{item.label}</span>
                  )}
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="sidebar-footer">
        <button className="sidebar-user-menu" title={collapsed ? getDisplayName() : undefined}>
          <div className="sidebar-user-avatar">
            <span>{getInitials()}</span>
          </div>
          {!collapsed && (
            <div className="sidebar-user-info">
              <span className="sidebar-user-name">{getDisplayName()}</span>
              <span className="sidebar-user-role">{getRoleDisplay()}</span>
            </div>
          )}
        </button>
        {!collapsed && (
          <button 
            className="sidebar-logout" 
            aria-label="Sign out"
            onClick={handleSignOut}
          >
            <LogOut size={18} />
          </button>
        )}
      </div>
    </aside>
  );
}
