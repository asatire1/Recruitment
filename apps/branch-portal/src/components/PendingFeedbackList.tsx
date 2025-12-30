import { usePendingFeedback, OVERDUE_DAYS_THRESHOLD } from '../hooks/useFeedback'
import type { PendingFeedbackItem } from '../hooks/useFeedback'
import { Spinner } from '@allied/shared-ui'

interface PendingFeedbackListProps {
  onSelectItem: (item: PendingFeedbackItem) => void
}

export function PendingFeedbackList({ onSelectItem }: PendingFeedbackListProps) {
  const { pending, loading, error } = usePendingFeedback()

  if (loading) {
    return (
      <div className="feedback-list feedback-list--loading">
        <Spinner size="md" />
        <span>Loading pending feedback...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="feedback-list feedback-list--error">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        <p>{error}</p>
      </div>
    )
  }

  if (pending.length === 0) {
    return (
      <div className="feedback-list feedback-list--empty">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
          <polyline points="22 4 12 14.01 9 11.01" />
        </svg>
        <h3>All caught up!</h3>
        <p>No pending feedback to submit</p>
      </div>
    )
  }

  const overdueCount = pending.filter(p => p.isOverdue).length

  return (
    <div className="feedback-list">
      {/* Summary */}
      <div className="feedback-list__summary">
        <span className="total-count">{pending.length} trial{pending.length !== 1 ? 's' : ''} awaiting feedback</span>
        {overdueCount > 0 && (
          <span className="overdue-count">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            {overdueCount} overdue
          </span>
        )}
      </div>

      {/* List */}
      <div className="feedback-list__items">
        {pending.map(item => (
          <FeedbackListItem 
            key={item.id} 
            item={item} 
            onClick={() => onSelectItem(item)}
          />
        ))}
      </div>
    </div>
  )
}

interface FeedbackListItemProps {
  item: PendingFeedbackItem
  onClick: () => void
}

function FeedbackListItem({ item, onClick }: FeedbackListItemProps) {
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-GB', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    })
  }

  const getDaysAgoText = (days: number) => {
    if (days === 0) return 'Today'
    if (days === 1) return 'Yesterday'
    return `${days} days ago`
  }

  return (
    <div 
      className={`feedback-item ${item.isOverdue ? 'feedback-item--overdue' : ''}`}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onClick()
        }
      }}
    >
      {/* Overdue Badge */}
      {item.isOverdue && (
        <div className="feedback-item__overdue-badge">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          Overdue
        </div>
      )}

      <div className="feedback-item__content">
        <div className="feedback-item__main">
          <span className="candidate-name">{item.candidateName}</span>
          {item.jobTitle && (
            <span className="job-title">{item.jobTitle}</span>
          )}
        </div>

        <div className="feedback-item__meta">
          <span className="trial-date">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            {formatDate(item.scheduledAt)}
          </span>
          <span className={`days-ago ${item.isOverdue ? 'overdue' : ''}`}>
            {getDaysAgoText(item.daysOverdue)}
          </span>
        </div>

        {item.branchName && (
          <span className="branch-name">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
            {item.branchName}
          </span>
        )}
      </div>

      <svg className="feedback-item__arrow" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polyline points="9 18 15 12 9 6" />
      </svg>
    </div>
  )
}
