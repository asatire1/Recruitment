import React, { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useJobs, useJobStats, useJobActions, JOB_STATUS_CONFIG, JOB_STATUSES } from '../hooks/useJobs';
import AddJobModal from '../components/AddJobModal';
import './Jobs.css';

// Icons
const Icons = {
  Plus: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="12" y1="5" x2="12" y2="19"/>
      <line x1="5" y1="12" x2="19" y2="12"/>
    </svg>
  ),
  Search: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="11" cy="11" r="8"/>
      <line x1="21" y1="21" x2="16.65" y2="16.65"/>
    </svg>
  ),
  Briefcase: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/>
      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
    </svg>
  ),
  MapPin: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
      <circle cx="12" cy="10" r="3"/>
    </svg>
  ),
  Clock: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10"/>
      <polyline points="12 6 12 12 16 14"/>
    </svg>
  ),
  Users: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
      <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  ),
  Eye: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  ),
  Edit: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
    </svg>
  ),
  MoreVertical: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="1"/>
      <circle cx="12" cy="5" r="1"/>
      <circle cx="12" cy="19" r="1"/>
    </svg>
  ),
  Building: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="4" y="2" width="16" height="20" rx="2" ry="2"/>
      <path d="M9 22v-4h6v4"/>
      <line x1="8" y1="6" x2="8" y2="6"/>
      <line x1="16" y1="6" x2="16" y2="6"/>
      <line x1="12" y1="6" x2="12" y2="6"/>
    </svg>
  ),
  Play: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polygon points="5 3 19 12 5 21 5 3"/>
    </svg>
  ),
  Pause: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="6" y="4" width="4" height="16"/>
      <rect x="14" y="4" width="4" height="16"/>
    </svg>
  ),
  XCircle: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10"/>
      <line x1="15" y1="9" x2="9" y2="15"/>
      <line x1="9" y1="9" x2="15" y2="15"/>
    </svg>
  )
};

// Job Status Badge Component
function JobStatusBadge({ status }) {
  const config = JOB_STATUS_CONFIG[status] || JOB_STATUS_CONFIG.draft;
  
  return (
    <span 
      className="job-status-badge"
      style={{ 
        background: config.bg, 
        color: config.color 
      }}
    >
      {config.label}
    </span>
  );
}

// Mini Stat Card Component
function MiniStatCard({ icon: Icon, value, label, colorClass }) {
  return (
    <div className="stat-mini">
      <div className={`stat-mini-icon ${colorClass}`}>
        <Icon />
      </div>
      <div className="stat-mini-content">
        <div className="stat-mini-value">{value}</div>
        <div className="stat-mini-label">{label}</div>
      </div>
    </div>
  );
}

// Job Card Component
function JobCard({ job, onEdit, onViewCandidates }) {
  const navigate = useNavigate();
  const { updateJobStatus } = useJobActions();
  const [showActions, setShowActions] = useState(false);

  const handleCardClick = () => {
    navigate(`/jobs/${job.id}`);
  };

  const handleStatusChange = async (e, newStatus) => {
    e.stopPropagation();
    try {
      await updateJobStatus(job.id, newStatus);
    } catch (err) {
      console.error('Error updating job status:', err);
    }
    setShowActions(false);
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const getTimeAgo = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const days = Math.floor((new Date() - date) / (1000 * 60 * 60 * 24));
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
    return formatDate(timestamp);
  };

  return (
    <div className="job-card" onClick={handleCardClick}>
      <div className="job-card-header">
        <div className="job-card-icon">
          <Icons.Briefcase />
        </div>
        <JobStatusBadge status={job.status} />
      </div>

      <h3 className="job-card-title">{job.title}</h3>

      <div className="job-card-meta">
        {job.location && (
          <div className="job-card-meta-item">
            <Icons.MapPin />
            <span>{job.location}</span>
          </div>
        )}
        {job.employmentType && (
          <div className="job-card-meta-item">
            <Icons.Clock />
            <span>{job.employmentType.replace('_', ' ')}</span>
          </div>
        )}
        {job.entityName && (
          <span className="entity-badge">{job.entityName}</span>
        )}
      </div>

      <div className="job-card-stats">
        <div className="job-stat">
          <div className="job-stat-value">{job.applicantCount || 0}</div>
          <div className="job-stat-label">Applicants</div>
        </div>
        <div className="job-stat">
          <div className="job-stat-value">{job.statusCounts?.interview || 0}</div>
          <div className="job-stat-label">Interview</div>
        </div>
        <div className="job-stat">
          <div className="job-stat-value">{job.statusCounts?.hired || 0}</div>
          <div className="job-stat-label">Hired</div>
        </div>
      </div>

      <div className="job-card-footer">
        <button 
          className="job-card-btn"
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/candidates?jobId=${job.id}`);
          }}
        >
          <Icons.Users />
          Candidates
        </button>
        <button 
          className="job-card-btn primary"
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/jobs/${job.id}`);
          }}
        >
          <Icons.Eye />
          View
        </button>
      </div>

      <div className="job-card-timestamp">
        Posted {getTimeAgo(job.createdAt)}
      </div>
    </div>
  );
}

// Tab Button Component
function TabButton({ active, onClick, label, count }) {
  return (
    <button 
      className={`tab-btn ${active ? 'active' : ''}`}
      onClick={onClick}
    >
      {label}
      {count !== undefined && (
        <span className="count">{count}</span>
      )}
    </button>
  );
}

// Empty State Component
function EmptyState({ status, onCreateJob }) {
  const messages = {
    all: {
      title: 'No jobs yet',
      description: 'Create your first job posting to start receiving candidates.'
    },
    active: {
      title: 'No active jobs',
      description: 'Activate a job posting or create a new one to start recruiting.'
    },
    paused: {
      title: 'No paused jobs',
      description: 'Paused jobs will appear here when you pause recruitment.'
    },
    closed: {
      title: 'No closed jobs',
      description: 'Closed jobs will appear here when positions are filled.'
    },
    draft: {
      title: 'No draft jobs',
      description: 'Draft jobs will appear here when you save without publishing.'
    }
  };

  const { title, description } = messages[status] || messages.all;

  return (
    <div className="empty-state">
      <div className="empty-state-icon">
        <Icons.Briefcase />
      </div>
      <h3>{title}</h3>
      <p>{description}</p>
      <button className="btn btn-primary" onClick={onCreateJob}>
        <Icons.Plus />
        Create Job
      </button>
    </div>
  );
}

// Loading Skeleton
function JobsLoadingSkeleton() {
  return (
    <div className="jobs-grid">
      {[1, 2, 3, 4, 5, 6].map(i => (
        <div key={i} className="job-card skeleton">
          <div className="skeleton-header">
            <div className="skeleton-icon" />
            <div className="skeleton-badge" />
          </div>
          <div className="skeleton-title" />
          <div className="skeleton-meta" />
          <div className="skeleton-stats" />
        </div>
      ))}
    </div>
  );
}

// Main Jobs Page Component
export default function Jobs() {
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  // Get job stats
  const { stats, loading: statsLoading } = useJobStats();

  // Build filter options based on active tab
  const filterOptions = useMemo(() => {
    const options = { searchQuery };
    if (activeTab !== 'all') {
      options.status = activeTab;
    }
    return options;
  }, [activeTab, searchQuery]);

  // Get filtered jobs
  const { jobs, loading: jobsLoading, error } = useJobs(filterOptions);

  // Tab counts
  const tabCounts = {
    all: stats.total,
    active: stats.active,
    paused: stats.paused,
    closed: stats.closed,
    draft: stats.draft
  };

  const handleCreateJob = () => {
    setShowAddModal(true);
  };

  const handleJobCreated = (jobId) => {
    setShowAddModal(false);
    // Optionally navigate to the new job
  };

  return (
    <div className="page-content">
      {/* Page Header */}
      <div className="page-header">
        <div className="page-header-left">
          <h1>Jobs</h1>
          <p>Manage your job postings and track applicants</p>
        </div>
        <div className="page-header-right">
          <button className="btn btn-primary" onClick={handleCreateJob}>
            <Icons.Plus />
            Create Job
          </button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="stats-row">
        <MiniStatCard
          icon={Icons.Briefcase}
          value={stats.total}
          label="Total Jobs"
          colorClass="total"
        />
        <MiniStatCard
          icon={Icons.Play}
          value={stats.active}
          label="Active"
          colorClass="active"
        />
        <MiniStatCard
          icon={Icons.Pause}
          value={stats.paused}
          label="Paused"
          colorClass="paused"
        />
        <MiniStatCard
          icon={Icons.XCircle}
          value={stats.closed}
          label="Closed"
          colorClass="closed"
        />
      </div>

      {/* Tabs and Search */}
      <div className="jobs-toolbar">
        <div className="tabs-bar">
          <TabButton
            active={activeTab === 'all'}
            onClick={() => setActiveTab('all')}
            label="All"
            count={tabCounts.all}
          />
          <TabButton
            active={activeTab === 'active'}
            onClick={() => setActiveTab('active')}
            label="Active"
            count={tabCounts.active}
          />
          <TabButton
            active={activeTab === 'paused'}
            onClick={() => setActiveTab('paused')}
            label="Paused"
            count={tabCounts.paused}
          />
          <TabButton
            active={activeTab === 'closed'}
            onClick={() => setActiveTab('closed')}
            label="Closed"
            count={tabCounts.closed}
          />
          <TabButton
            active={activeTab === 'draft'}
            onClick={() => setActiveTab('draft')}
            label="Drafts"
            count={tabCounts.draft}
          />
        </div>

        <div className="search-input-wrapper">
          <Icons.Search />
          <input
            type="text"
            placeholder="Search jobs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
        </div>
      </div>

      {/* Jobs Grid */}
      {jobsLoading ? (
        <JobsLoadingSkeleton />
      ) : error ? (
        <div className="error-state">
          <p>Error loading jobs: {error}</p>
        </div>
      ) : jobs.length === 0 ? (
        <EmptyState status={activeTab} onCreateJob={handleCreateJob} />
      ) : (
        <div className="jobs-grid">
          {jobs.map(job => (
            <JobCard key={job.id} job={job} />
          ))}
        </div>
      )}

      {/* Add Job Modal */}
      {showAddModal && (
        <AddJobModal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          onSuccess={handleJobCreated}
        />
      )}
    </div>
  );
}
