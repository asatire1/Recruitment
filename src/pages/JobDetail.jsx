import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useJob, useJobCandidates, useJobActions, JOB_STATUS_CONFIG, JOB_STATUSES, ALL_JOB_TYPES, EMPLOYMENT_TYPES } from '../hooks/useJobs';
import { STATUS_CONFIG } from '../hooks/useCandidates';
import AddJobModal from '../components/AddJobModal';
import ConfirmModal from '../components/ConfirmModal';
import './JobDetail.css';

// Icons
const Icons = {
  ArrowLeft: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="19" y1="12" x2="5" y2="12"/>
      <polyline points="12 19 5 12 12 5"/>
    </svg>
  ),
  Edit: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
    </svg>
  ),
  Copy: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
    </svg>
  ),
  Trash: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="3 6 5 6 21 6"/>
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
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
  DollarSign: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="12" y1="1" x2="12" y2="23"/>
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
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
  Users: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
      <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
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
  ),
  Check: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="20 6 9 17 4 12"/>
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
  ExternalLink: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
      <polyline points="15 3 21 3 21 9"/>
      <line x1="10" y1="14" x2="21" y2="3"/>
    </svg>
  ),
  AlertCircle: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10"/>
      <line x1="12" y1="8" x2="12" y2="12"/>
      <line x1="12" y1="16" x2="12.01" y2="16"/>
    </svg>
  )
};

// Job Status Badge Component
function JobStatusBadge({ status }) {
  const config = JOB_STATUS_CONFIG[status] || JOB_STATUS_CONFIG.draft;
  
  return (
    <span 
      className="job-status-badge large"
      style={{ background: config.bg, color: config.color }}
    >
      {config.label}
    </span>
  );
}

// Candidate Status Badge Component
function CandidateStatusBadge({ status }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.new;
  
  return (
    <span 
      className="candidate-status-badge"
      style={{ background: config.bg, color: config.color }}
    >
      {config.label}
    </span>
  );
}

// Candidate Row Component
function CandidateRow({ candidate }) {
  const navigate = useNavigate();
  
  const formatDate = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  };

  return (
    <div 
      className="candidate-row"
      onClick={() => navigate(`/candidates/${candidate.id}`)}
    >
      <div className="candidate-avatar">
        {candidate.name?.charAt(0) || '?'}
      </div>
      <div className="candidate-info">
        <div className="candidate-name">{candidate.name}</div>
        <div className="candidate-email">{candidate.email}</div>
      </div>
      <CandidateStatusBadge status={candidate.status} />
      <div className="candidate-date">{formatDate(candidate.createdAt)}</div>
    </div>
  );
}

// Pipeline Stats Component
function PipelineStats({ statusCounts }) {
  const stages = [
    { key: 'new', label: 'New', color: 'var(--status-new)' },
    { key: 'screening', label: 'Screening', color: 'var(--status-screening)' },
    { key: 'interview', label: 'Interview', color: 'var(--status-interview)' },
    { key: 'trial', label: 'Trial', color: 'var(--status-trial)' },
    { key: 'approved', label: 'Approved', color: 'var(--status-approved)' },
    { key: 'hired', label: 'Hired', color: 'var(--allied-green)' }
  ];

  return (
    <div className="pipeline-stats">
      {stages.map(({ key, label, color }) => (
        <div key={key} className="pipeline-stat">
          <div className="pipeline-stat-value" style={{ color }}>
            {statusCounts?.[key] || 0}
          </div>
          <div className="pipeline-stat-label">{label}</div>
        </div>
      ))}
    </div>
  );
}

// Loading Skeleton
function JobDetailSkeleton() {
  return (
    <div className="job-detail-skeleton">
      <div className="skeleton-back" />
      <div className="skeleton-header">
        <div className="skeleton-title" />
        <div className="skeleton-actions" />
      </div>
      <div className="skeleton-meta" />
      <div className="skeleton-content">
        <div className="skeleton-main" />
        <div className="skeleton-sidebar" />
      </div>
    </div>
  );
}

// Main JobDetail Component
export default function JobDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const { job, loading, error } = useJob(id);
  const { candidates, loading: candidatesLoading } = useJobCandidates(id);
  const { updateJobStatus, duplicateJob, deleteJob, loading: actionLoading } = useJobActions();
  
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleStatusChange = async (newStatus) => {
    try {
      await updateJobStatus(id, newStatus);
    } catch (err) {
      console.error('Error updating status:', err);
    }
  };

  const handleDuplicate = async () => {
    try {
      const newJobId = await duplicateJob(id);
      navigate(`/jobs/${newJobId}`);
    } catch (err) {
      console.error('Error duplicating job:', err);
    }
  };

  const handleDelete = async () => {
    try {
      await deleteJob(id);
      navigate('/jobs');
    } catch (err) {
      console.error('Error deleting job:', err);
      // Show error toast
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-GB', { 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric' 
    });
  };

  const formatSalary = (min, max, period = 'year') => {
    if (!min && !max) return null;
    const format = (n) => `£${n.toLocaleString()}`;
    if (min && max) return `${format(min)} - ${format(max)} per ${period}`;
    if (min) return `From ${format(min)} per ${period}`;
    return `Up to ${format(max)} per ${period}`;
  };

  if (loading) {
    return (
      <div className="page-content">
        <JobDetailSkeleton />
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="page-content">
        <div className="error-state">
          <Icons.AlertCircle />
          <h2>Job not found</h2>
          <p>The job you're looking for doesn't exist or has been removed.</p>
          <Link to="/jobs" className="btn btn-primary">
            Back to Jobs
          </Link>
        </div>
      </div>
    );
  }

  const jobTypeInfo = ALL_JOB_TYPES.find(t => t.value === job.jobType);
  const employmentInfo = EMPLOYMENT_TYPES.find(t => t.value === job.employmentType);

  return (
    <div className="page-content">
      {/* Back Button */}
      <button className="back-btn" onClick={() => navigate('/jobs')}>
        <Icons.ArrowLeft />
        Back to Jobs
      </button>

      {/* Job Header */}
      <div className="job-detail-header">
        <div className="job-detail-header-left">
          <div className="job-detail-title-row">
            <h1>{job.title}</h1>
            <JobStatusBadge status={job.status} />
          </div>
          <div className="job-detail-meta">
            {job.location && (
              <div className="meta-item">
                <Icons.MapPin />
                <span>{job.location}</span>
              </div>
            )}
            {employmentInfo && (
              <div className="meta-item">
                <Icons.Clock />
                <span>{employmentInfo.label}</span>
              </div>
            )}
            {job.entityName && (
              <div className="meta-item">
                <Icons.Building />
                <span>{job.entityName}</span>
              </div>
            )}
          </div>
        </div>

        <div className="job-detail-header-right">
          <div className="status-actions">
            {job.status === JOB_STATUSES.DRAFT && (
              <button 
                className="btn btn-success"
                onClick={() => handleStatusChange(JOB_STATUSES.ACTIVE)}
                disabled={actionLoading}
              >
                <Icons.Play />
                Publish
              </button>
            )}
            {job.status === JOB_STATUSES.ACTIVE && (
              <button 
                className="btn btn-warning"
                onClick={() => handleStatusChange(JOB_STATUSES.PAUSED)}
                disabled={actionLoading}
              >
                <Icons.Pause />
                Pause
              </button>
            )}
            {job.status === JOB_STATUSES.PAUSED && (
              <button 
                className="btn btn-success"
                onClick={() => handleStatusChange(JOB_STATUSES.ACTIVE)}
                disabled={actionLoading}
              >
                <Icons.Play />
                Reactivate
              </button>
            )}
            {job.status !== JOB_STATUSES.CLOSED && (
              <button 
                className="btn btn-secondary"
                onClick={() => handleStatusChange(JOB_STATUSES.CLOSED)}
                disabled={actionLoading}
              >
                <Icons.XCircle />
                Close
              </button>
            )}
          </div>

          <div className="action-buttons">
            <button 
              className="btn btn-secondary"
              onClick={() => setShowEditModal(true)}
            >
              <Icons.Edit />
              Edit
            </button>
            <button 
              className="btn btn-secondary"
              onClick={handleDuplicate}
              disabled={actionLoading}
            >
              <Icons.Copy />
              Duplicate
            </button>
            <button 
              className="btn btn-danger-outline"
              onClick={() => setShowDeleteConfirm(true)}
            >
              <Icons.Trash />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="job-detail-grid">
        {/* Left Column - Job Details */}
        <div className="job-detail-main">
          {/* Pipeline Stats */}
          <div className="detail-card">
            <h2 className="detail-card-title">Candidate Pipeline</h2>
            <PipelineStats statusCounts={job.statusCounts} />
            <div className="pipeline-total">
              <span className="total-value">{job.applicantCount || 0}</span>
              <span className="total-label">Total Applicants</span>
            </div>
          </div>

          {/* Description */}
          {job.description && (
            <div className="detail-card">
              <h2 className="detail-card-title">Job Description</h2>
              <div className="job-description">
                {job.description.split('\n').map((paragraph, i) => (
                  <p key={i}>{paragraph}</p>
                ))}
              </div>
            </div>
          )}

          {/* Requirements */}
          {job.requirements && job.requirements.length > 0 && (
            <div className="detail-card">
              <h2 className="detail-card-title">Requirements</h2>
              <ul className="requirements-list">
                {job.requirements.map((req, i) => (
                  <li key={i}>
                    <Icons.Check />
                    <span>{req}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Candidates List */}
          <div className="detail-card">
            <div className="detail-card-header">
              <h2 className="detail-card-title">Candidates ({candidates.length})</h2>
              <Link to={`/candidates?jobId=${id}`} className="card-action">
                View All
                <Icons.ExternalLink />
              </Link>
            </div>
            
            {candidatesLoading ? (
              <div className="loading-placeholder">Loading candidates...</div>
            ) : candidates.length === 0 ? (
              <div className="empty-candidates">
                <Icons.Users />
                <p>No candidates yet</p>
                <Link to="/candidates/new" className="btn btn-secondary btn-sm">
                  Add Candidate
                </Link>
              </div>
            ) : (
              <div className="candidates-list">
                {candidates.slice(0, 5).map(candidate => (
                  <CandidateRow key={candidate.id} candidate={candidate} />
                ))}
                {candidates.length > 5 && (
                  <Link 
                    to={`/candidates?jobId=${id}`} 
                    className="view-more-link"
                  >
                    View {candidates.length - 5} more candidates
                  </Link>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Column - Sidebar */}
        <div className="job-detail-sidebar">
          {/* Job Info Card */}
          <div className="detail-card">
            <h2 className="detail-card-title">Job Details</h2>
            <div className="info-list">
              {jobTypeInfo && (
                <div className="info-item">
                  <span className="info-label">Job Type</span>
                  <span className="info-value">{jobTypeInfo.label}</span>
                </div>
              )}
              {employmentInfo && (
                <div className="info-item">
                  <span className="info-label">Employment</span>
                  <span className="info-value">{employmentInfo.label}</span>
                </div>
              )}
              {job.location && (
                <div className="info-item">
                  <span className="info-label">Location</span>
                  <span className="info-value">{job.location}</span>
                </div>
              )}
              {(job.salaryMin || job.salaryMax) && (
                <div className="info-item">
                  <span className="info-label">Salary</span>
                  <span className="info-value">
                    {formatSalary(job.salaryMin, job.salaryMax, job.salaryPeriod)}
                  </span>
                </div>
              )}
              {job.entityName && (
                <div className="info-item">
                  <span className="info-label">Entity</span>
                  <span className="info-value">{job.entityName}</span>
                </div>
              )}
              {job.branchName && (
                <div className="info-item">
                  <span className="info-label">Branch</span>
                  <span className="info-value">{job.branchName}</span>
                </div>
              )}
            </div>
          </div>

          {/* Requirements Card */}
          {jobTypeInfo && (
            <div className="detail-card">
              <h2 className="detail-card-title">Compliance Requirements</h2>
              <div className="compliance-list">
                <div className={`compliance-item ${jobTypeInfo.requiresGPhC ? 'required' : ''}`}>
                  <span className="compliance-icon">
                    {jobTypeInfo.requiresGPhC ? <Icons.Check /> : <Icons.XCircle />}
                  </span>
                  <span>GPhC Registration</span>
                </div>
                <div className={`compliance-item ${jobTypeInfo.requiresDBS ? 'required' : ''}`}>
                  <span className="compliance-icon">
                    {jobTypeInfo.requiresDBS ? <Icons.Check /> : <Icons.XCircle />}
                  </span>
                  <span>DBS Check</span>
                </div>
              </div>
            </div>
          )}

          {/* Dates Card */}
          <div className="detail-card">
            <h2 className="detail-card-title">Timeline</h2>
            <div className="timeline-list">
              <div className="timeline-item">
                <Icons.Calendar />
                <div>
                  <span className="timeline-label">Created</span>
                  <span className="timeline-value">{formatDate(job.createdAt)}</span>
                </div>
              </div>
              {job.closedAt && (
                <div className="timeline-item">
                  <Icons.XCircle />
                  <div>
                    <span className="timeline-label">Closed</span>
                    <span className="timeline-value">{formatDate(job.closedAt)}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {showEditModal && (
        <AddJobModal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          onSuccess={() => setShowEditModal(false)}
          editJob={job}
        />
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <ConfirmModal
          isOpen={showDeleteConfirm}
          onClose={() => setShowDeleteConfirm(false)}
          onConfirm={handleDelete}
          title="Delete Job?"
          message={`Are you sure you want to delete "${job.title}"? This action cannot be undone.`}
          confirmLabel="Delete"
          variant="danger"
          loading={actionLoading}
        />
      )}
    </div>
  );
}
