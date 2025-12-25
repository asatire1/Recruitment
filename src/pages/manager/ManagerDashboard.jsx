import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useManagerDashboard, useManagerSchedule } from '../../hooks/useManagerPortal';
import { useServiceWorker } from '../../hooks/usePWA';
import './ManagerDashboard.css';

// Icons
const Icons = {
  Users: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
      <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  ),
  Calendar: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
      <line x1="16" y1="2" x2="16" y2="6"/>
      <line x1="8" y1="2" x2="8" y2="6"/>
      <line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
  ),
  CheckCircle: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
      <polyline points="22 4 12 14.01 9 11.01"/>
    </svg>
  ),
  Briefcase: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/>
      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
    </svg>
  ),
  ChevronRight: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="9 18 15 12 9 6"/>
    </svg>
  ),
  Clock: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10"/>
      <polyline points="12 6 12 12 16 14"/>
    </svg>
  ),
  AlertCircle: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10"/>
      <line x1="12" y1="8" x2="12" y2="12"/>
      <line x1="12" y1="16" x2="12.01" y2="16"/>
    </svg>
  ),
  Wifi: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M5 12.55a11 11 0 0 1 14.08 0"/>
      <path d="M1.42 9a16 16 0 0 1 21.16 0"/>
      <path d="M8.53 16.11a6 6 0 0 1 6.95 0"/>
      <line x1="12" y1="20" x2="12.01" y2="20"/>
    </svg>
  ),
  WifiOff: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="1" y1="1" x2="23" y2="23"/>
      <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55"/>
      <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39"/>
      <path d="M10.71 5.05A16 16 0 0 1 22.58 9"/>
      <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88"/>
      <path d="M8.53 16.11a6 6 0 0 1 6.95 0"/>
      <line x1="12" y1="20" x2="12.01" y2="20"/>
    </svg>
  )
};

// Stat Card Component
function StatCard({ icon: Icon, label, value, color, to }) {
  const content = (
    <div className={`stat-card ${color}`}>
      <div className="stat-icon">
        <Icon />
      </div>
      <div className="stat-content">
        <span className="stat-value">{value}</span>
        <span className="stat-label">{label}</span>
      </div>
      {to && (
        <div className="stat-arrow">
          <Icons.ChevronRight />
        </div>
      )}
    </div>
  );

  if (to) {
    return <Link to={to} className="stat-card-link">{content}</Link>;
  }

  return content;
}

// Event Item Component
function EventItem({ event }) {
  const startTime = event.startTime 
    ? new Date(event.startTime).toLocaleTimeString('en-GB', { 
        hour: '2-digit', 
        minute: '2-digit' 
      })
    : '--:--';

  const typeColors = {
    interview: '#3b82f6',
    trial: '#10b981',
    meeting: '#8b5cf6'
  };

  return (
    <div className="event-item">
      <div 
        className="event-time"
        style={{ '--event-color': typeColors[event.type] || '#6b7280' }}
      >
        {startTime}
      </div>
      <div className="event-details">
        <span className="event-title">{event.title}</span>
        {event.candidateName && (
          <span className="event-candidate">{event.candidateName}</span>
        )}
      </div>
      <div className="event-type-badge" style={{ backgroundColor: typeColors[event.type] || '#6b7280' }}>
        {event.type}
      </div>
    </div>
  );
}

// Main ManagerDashboard Component
export default function ManagerDashboard() {
  const { user } = useAuth();
  const { stats, loading } = useManagerDashboard();
  const { events: todayEvents } = useManagerSchedule('today');
  const { isOnline } = useServiceWorker();

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const firstName = user?.displayName?.split(' ')[0] || 'Manager';

  return (
    <div className="manager-dashboard">
      {/* Offline Banner */}
      {!isOnline && (
        <div className="offline-banner">
          <Icons.WifiOff />
          <span>You're offline. Some features may be limited.</span>
        </div>
      )}

      {/* Header */}
      <header className="dashboard-header">
        <div className="greeting">
          <h1>{greeting()}, {firstName}</h1>
          <p>{user?.branchName || 'Branch Manager Portal'}</p>
        </div>
        <div className="connection-status">
          {isOnline ? <Icons.Wifi /> : <Icons.WifiOff />}
        </div>
      </header>

      {/* Stats Grid */}
      <section className="stats-section">
        <StatCard
          icon={Icons.Users}
          label="Pending Reviews"
          value={loading ? '...' : stats.pendingReviews}
          color={stats.pendingReviews > 0 ? 'orange' : 'default'}
          to="/manager/reviews"
        />
        <StatCard
          icon={Icons.Calendar}
          label="Today's Schedule"
          value={loading ? '...' : stats.todayEvents}
          color="blue"
          to="/manager/schedule"
        />
        <StatCard
          icon={Icons.CheckCircle}
          label="Recent Hires"
          value={loading ? '...' : stats.recentHires}
          color="green"
        />
        <StatCard
          icon={Icons.Briefcase}
          label="Active Jobs"
          value={loading ? '...' : stats.activeJobs}
          color="purple"
        />
      </section>

      {/* Today's Schedule */}
      <section className="today-section">
        <div className="section-header">
          <h2>
            <Icons.Clock />
            Today's Schedule
          </h2>
          <Link to="/manager/schedule" className="see-all-link">
            See all <Icons.ChevronRight />
          </Link>
        </div>

        {todayEvents.length === 0 ? (
          <div className="empty-schedule">
            <Icons.Calendar />
            <p>No events scheduled for today</p>
          </div>
        ) : (
          <div className="events-list">
            {todayEvents.slice(0, 5).map(event => (
              <EventItem key={event.id} event={event} />
            ))}
          </div>
        )}
      </section>

      {/* Quick Actions */}
      <section className="quick-actions">
        <h2>Quick Actions</h2>
        <div className="actions-grid">
          <Link to="/manager/reviews" className="action-btn reviews">
            <Icons.Users />
            <span>Review Candidates</span>
            {stats.pendingReviews > 0 && (
              <span className="action-badge">{stats.pendingReviews}</span>
            )}
          </Link>
          <Link to="/manager/schedule" className="action-btn schedule">
            <Icons.Calendar />
            <span>View Schedule</span>
          </Link>
        </div>
      </section>

      {/* Alert if pending reviews */}
      {stats.pendingReviews > 0 && (
        <div className="pending-alert">
          <Icons.AlertCircle />
          <div className="alert-content">
            <strong>{stats.pendingReviews} candidates</strong> awaiting your review
          </div>
          <Link to="/manager/reviews" className="alert-action">
            Review now
          </Link>
        </div>
      )}
    </div>
  );
}
