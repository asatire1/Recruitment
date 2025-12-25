import React from 'react';
import { Link } from 'react-router-dom';
import { useDashboard } from '../hooks/useDashboard';
import { STATUS_CONFIG } from '../hooks/useCandidates';
import './Dashboard.css';

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
  Briefcase: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/>
      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
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
  TrendUp: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
      <polyline points="17 6 23 6 23 12"/>
    </svg>
  ),
  TrendDown: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/>
      <polyline points="17 18 23 18 23 12"/>
    </svg>
  ),
  UserPlus: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
      <circle cx="8.5" cy="7" r="4"/>
      <line x1="20" y1="8" x2="20" y2="14"/>
      <line x1="23" y1="11" x2="17" y2="11"/>
    </svg>
  ),
  ArrowRight: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="5" y1="12" x2="19" y2="12"/>
      <polyline points="12 5 19 12 12 19"/>
    </svg>
  ),
  Clock: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10"/>
      <polyline points="12 6 12 12 16 14"/>
    </svg>
  ),
  CheckCircle: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
      <polyline points="22 4 12 14.01 9 11.01"/>
    </svg>
  ),
  AlertCircle: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10"/>
      <line x1="12" y1="8" x2="12" y2="12"/>
      <line x1="12" y1="16" x2="12.01" y2="16"/>
    </svg>
  ),
  Building: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="4" y="2" width="16" height="20" rx="2" ry="2"/>
      <path d="M9 22v-4h6v4"/>
      <line x1="8" y1="6" x2="8" y2="6"/>
      <line x1="16" y1="6" x2="16" y2="6"/>
      <line x1="12" y1="6" x2="12" y2="6"/>
      <line x1="8" y1="10" x2="8" y2="10"/>
      <line x1="16" y1="10" x2="16" y2="10"/>
      <line x1="12" y1="10" x2="12" y2="10"/>
      <line x1="8" y1="14" x2="8" y2="14"/>
      <line x1="16" y1="14" x2="16" y2="14"/>
      <line x1="12" y1="14" x2="12" y2="14"/>
    </svg>
  )
};

// Stat Card Component
function StatCard({ title, value, change, changeType, icon: Icon, iconColor = 'teal' }) {
  return (
    <div className="stat-card">
      <div className="stat-header">
        <div className={`stat-icon ${iconColor}`}>
          <Icon />
        </div>
        {change && (
          <div className={`stat-trend ${changeType}`}>
            {changeType === 'up' ? <Icons.TrendUp /> : <Icons.TrendDown />}
            {change}
          </div>
        )}
      </div>
      <div className="stat-value">{value}</div>
      <div className="stat-label">{title}</div>
    </div>
  );
}

// Pipeline Chart Component
function PipelineChart({ data }) {
  const total = Object.values(data).reduce((sum, val) => sum + val, 0);
  const maxCount = Math.max(...Object.values(data), 1);

  const statuses = [
    { key: 'new', label: 'New' },
    { key: 'screening', label: 'Screening' },
    { key: 'interview', label: 'Interview' },
    { key: 'trial', label: 'Trial' },
    { key: 'approved', label: 'Approved' },
    { key: 'rejected', label: 'Rejected' }
  ];

  return (
    <div className="pipeline-chart">
      {statuses.map(({ key, label }) => {
        const count = data[key] || 0;
        const percentage = maxCount > 0 ? (count / maxCount) * 100 : 0;
        
        return (
          <div key={key} className="pipeline-item">
            <div className="pipeline-label">{label}</div>
            <div className="pipeline-bar-wrapper">
              <div 
                className={`pipeline-bar ${key}`}
                style={{ width: `${Math.max(percentage, count > 0 ? 15 : 0)}%` }}
              >
                {count > 0 && percentage > 20 && count}
              </div>
            </div>
            <div className="pipeline-count">{count}</div>
          </div>
        );
      })}
    </div>
  );
}

// Activity Item Component
function ActivityItem({ activity }) {
  const getActivityIcon = (type) => {
    switch (type) {
      case 'created':
        return { icon: Icons.UserPlus, className: 'added' };
      case 'status_change':
        return { icon: Icons.ArrowRight, className: 'status' };
      case 'interview_scheduled':
        return { icon: Icons.Calendar, className: 'scheduled' };
      case 'feedback_submitted':
        return { icon: Icons.CheckCircle, className: 'completed' };
      default:
        return { icon: Icons.AlertCircle, className: 'status' };
    }
  };

  const { icon: Icon, className } = getActivityIcon(activity.type);
  
  const timeAgo = (timestamp) => {
    if (!timestamp) return '';
    const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp.toDate?.() || timestamp;
    const seconds = Math.floor((new Date() - date) / 1000);
    
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    return date.toLocaleDateString();
  };

  // Render activity description safely without dangerouslySetInnerHTML
  const renderActivityText = () => {
    const parts = activity.descriptionParts;
    
    // Handle legacy data that might still have HTML description
    if (!parts && activity.description) {
      // Strip HTML tags for legacy data (safe fallback)
      const text = activity.description.replace(/<[^>]*>/g, '');
      return <span>{text}</span>;
    }
    
    if (!parts) {
      return <span>Activity recorded</span>;
    }

    // Render structured parts safely
    if (parts.prefix) {
      return (
        <>
          {parts.prefix}<strong>{parts.name}</strong>{parts.text}
        </>
      );
    }
    
    return (
      <>
        <strong>{parts.name}</strong> {parts.text}
      </>
    );
  };

  return (
    <div className="activity-item">
      <div className={`activity-icon ${className}`}>
        <Icon />
      </div>
      <div className="activity-content">
        <div className="activity-text">
          {renderActivityText()}
        </div>
        <div className="activity-time">{timeAgo(activity.createdAt)}</div>
      </div>
    </div>
  );
}

// Interview Card Component
function InterviewCard({ interview }) {
  const formatDate = (timestamp) => {
    if (!timestamp) return 'Date TBC';
    const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp.toDate?.() || timestamp;
    return date.toLocaleDateString('en-GB', { 
      weekday: 'short', 
      day: 'numeric', 
      month: 'short' 
    });
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp.toDate?.() || timestamp;
    return date.toLocaleTimeString('en-GB', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <div className="interview-card">
      <div className="interview-avatar">
        {interview.candidateName?.charAt(0) || '?'}
      </div>
      <div className="interview-details">
        <div className="interview-name">{interview.candidateName}</div>
        <div className="interview-role">{interview.jobTitle}</div>
      </div>
      <div className="interview-time">
        <div className="interview-date">{formatDate(interview.scheduledAt)}</div>
        <div className="interview-hour">{formatTime(interview.scheduledAt)}</div>
      </div>
    </div>
  );
}

// Job Card (Mini) Component
function JobCardMini({ job }) {
  return (
    <Link to={`/jobs/${job.id}`} className="job-card-mini">
      <div className="job-card-mini-info">
        <div className="job-card-mini-title">{job.title}</div>
        <div className="job-card-mini-location">{job.location || 'Multiple locations'}</div>
      </div>
      <div className="job-card-mini-count">
        <span className="count-value">{job.applicantCount || 0}</span>
        <span className="count-label">applicants</span>
      </div>
    </Link>
  );
}

// Loading Skeleton
function DashboardSkeleton() {
  return (
    <div className="dashboard-skeleton">
      <div className="stats-grid">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="stat-card skeleton">
            <div className="skeleton-icon" />
            <div className="skeleton-value" />
            <div className="skeleton-label" />
          </div>
        ))}
      </div>
      <div className="dashboard-grid">
        <div className="dashboard-card skeleton">
          <div className="skeleton-header" />
          <div className="skeleton-content" />
        </div>
        <div className="dashboard-card skeleton">
          <div className="skeleton-header" />
          <div className="skeleton-content" />
        </div>
      </div>
    </div>
  );
}

// Main Dashboard Component
export default function Dashboard() {
  const { stats, activities, interviews, trials, topJobs, loading, error } = useDashboard();

  if (loading) {
    return (
      <div className="page-content">
        <div className="page-header">
          <div className="page-header-left">
            <h1>Dashboard</h1>
            <p>Loading your recruitment overview...</p>
          </div>
        </div>
        <DashboardSkeleton />
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-content">
        <div className="error-state">
          <Icons.AlertCircle />
          <h2>Error loading dashboard</h2>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  // Calculate week-over-week change (mock for now)
  const weekChange = stats.newThisWeek > 0 ? `+${stats.newThisWeek}` : '0';

  return (
    <div className="page-content">
      <div className="page-header">
        <div className="page-header-left">
          <h1>Dashboard</h1>
          <p>Welcome back! Here's your recruitment overview.</p>
        </div>
        <div className="page-header-right">
          <Link to="/candidates/new" className="btn btn-primary">
            <Icons.UserPlus />
            Add Candidate
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid">
        <StatCard
          title="Total Candidates"
          value={stats.totalCandidates}
          change={weekChange}
          changeType="up"
          icon={Icons.Users}
          iconColor="teal"
        />
        <StatCard
          title="Active Jobs"
          value={stats.activeJobs}
          icon={Icons.Briefcase}
          iconColor="green"
        />
        <StatCard
          title="Upcoming Interviews"
          value={stats.upcomingInterviews}
          icon={Icons.Calendar}
          iconColor="blue"
        />
        <StatCard
          title="New This Week"
          value={stats.newThisWeek}
          icon={Icons.TrendUp}
          iconColor="purple"
        />
      </div>

      {/* Dashboard Grid */}
      <div className="dashboard-grid">
        {/* Left Column */}
        <div className="dashboard-column">
          {/* Pipeline Chart */}
          <div className="dashboard-card">
            <div className="card-header">
              <h2 className="card-title">Candidate Pipeline</h2>
              <Link to="/candidates" className="card-action">View All</Link>
            </div>
            <div className="card-body">
              <PipelineChart data={stats.pipelineBreakdown} />
            </div>
          </div>

          {/* Recent Activity */}
          <div className="dashboard-card">
            <div className="card-header">
              <h2 className="card-title">Recent Activity</h2>
            </div>
            <div className="activity-feed">
              {activities.length > 0 ? (
                activities.map(activity => (
                  <ActivityItem key={activity.id} activity={activity} />
                ))
              ) : (
                <div className="empty-state-small">
                  <p>No recent activity</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="dashboard-column">
          {/* Upcoming Interviews */}
          <div className="dashboard-card">
            <div className="card-header">
              <h2 className="card-title">Upcoming Interviews</h2>
              <Link to="/calendar" className="card-action">View Calendar</Link>
            </div>
            <div className="card-body">
              {interviews.length > 0 ? (
                <div className="interviews-list">
                  {interviews.map(interview => (
                    <InterviewCard key={interview.id} interview={interview} />
                  ))}
                </div>
              ) : (
                <div className="empty-state-small">
                  <Icons.Calendar />
                  <p>No upcoming interviews</p>
                </div>
              )}
            </div>
          </div>

          {/* Upcoming Trials */}
          <div className="dashboard-card">
            <div className="card-header">
              <h2 className="card-title">Upcoming Trials</h2>
              <Link to="/calendar?view=trials" className="card-action">View All</Link>
            </div>
            <div className="card-body">
              {trials.length > 0 ? (
                <div className="interviews-list">
                  {trials.map(trial => (
                    <InterviewCard key={trial.id} interview={trial} />
                  ))}
                </div>
              ) : (
                <div className="empty-state-small">
                  <Icons.Building />
                  <p>No upcoming trials</p>
                </div>
              )}
            </div>
          </div>

          {/* Top Jobs */}
          <div className="dashboard-card">
            <div className="card-header">
              <h2 className="card-title">Top Active Jobs</h2>
              <Link to="/jobs" className="card-action">View All Jobs</Link>
            </div>
            <div className="card-body">
              {topJobs.length > 0 ? (
                <div className="top-jobs-list">
                  {topJobs.map(job => (
                    <JobCardMini key={job.id} job={job} />
                  ))}
                </div>
              ) : (
                <div className="empty-state-small">
                  <Icons.Briefcase />
                  <p>No active jobs</p>
                  <Link to="/jobs/new" className="btn btn-secondary btn-sm">
                    Create Job
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
