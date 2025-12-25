import React from 'react';
import './ReviewCard.css';

// Icons
const Icons = {
  Phone: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
    </svg>
  ),
  Mail: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
      <polyline points="22,6 12,13 2,6"/>
    </svg>
  ),
  FileText: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
      <line x1="16" y1="13" x2="8" y2="13"/>
      <line x1="16" y1="17" x2="8" y2="17"/>
    </svg>
  ),
  ChevronRight: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="9 18 15 12 9 6"/>
    </svg>
  )
};

// Status badge colors
const STATUS_COLORS = {
  new: '#3b82f6',
  screening: '#8b5cf6',
  interview: '#f59e0b',
  trial: '#10b981'
};

// Format relative time
function formatRelativeTime(date) {
  if (!date) return '';
  
  const now = new Date();
  const then = date.toDate ? date.toDate() : new Date(date);
  const diffMs = now - then;
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);

  if (diffHours < 1) return 'Just now';
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  return then.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

export default function ReviewCard({ candidate, onReview }) {
  const fullName = `${candidate.firstName || ''} ${candidate.lastName || ''}`.trim();
  const initials = `${candidate.firstName?.[0] || ''}${candidate.lastName?.[0] || ''}`.toUpperCase();
  const hasCv = candidate.cvParsed || candidate.cvUrl;

  return (
    <div className="review-card" onClick={onReview}>
      <div className="candidate-avatar">
        {candidate.avatarUrl ? (
          <img src={candidate.avatarUrl} alt={fullName} />
        ) : (
          <span className="avatar-initials">{initials || '?'}</span>
        )}
        {hasCv && (
          <span className="cv-indicator" title="CV Available">
            <Icons.FileText />
          </span>
        )}
      </div>

      <div className="candidate-info">
        <div className="candidate-header">
          <h3 className="candidate-name">{fullName || 'Unknown'}</h3>
          <span 
            className="status-badge"
            style={{ '--status-color': STATUS_COLORS[candidate.status] || '#6b7280' }}
          >
            {candidate.status}
          </span>
        </div>

        <p className="applied-job">
          {candidate.appliedJobTitle || 'No job specified'}
        </p>

        <div className="candidate-meta">
          {candidate.phone && (
            <a 
              href={`tel:${candidate.phone}`} 
              className="meta-item"
              onClick={e => e.stopPropagation()}
            >
              <Icons.Phone />
            </a>
          )}
          {candidate.email && (
            <a 
              href={`mailto:${candidate.email}`} 
              className="meta-item"
              onClick={e => e.stopPropagation()}
            >
              <Icons.Mail />
            </a>
          )}
          <span className="meta-time">
            {formatRelativeTime(candidate.createdAt || candidate.appliedAt)}
          </span>
        </div>
      </div>

      <div className="review-arrow">
        <Icons.ChevronRight />
      </div>
    </div>
  );
}
