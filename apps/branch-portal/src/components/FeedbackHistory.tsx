import { useState } from 'react'
import { useSubmittedFeedback, formatFeedbackDate, getRecommendationColor } from '../hooks/useFeedback'
import type { SubmittedFeedbackItem } from '../hooks/useFeedback'
import { Spinner } from '@allied/shared-ui'

interface FeedbackHistoryProps {
  onViewDetails?: (item: SubmittedFeedbackItem) => void
}

export function FeedbackHistory({ onViewDetails }: FeedbackHistoryProps) {
  const { submitted, loading, error } = useSubmittedFeedback()
  const [expandedId, setExpandedId] = useState<string | null>(null)

  if (loading) {
    return (
      <div className="feedback-history feedback-history--loading">
        <Spinner size="md" />
        <span>Loading feedback history...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="feedback-history feedback-history--error">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        <p>{error}</p>
      </div>
    )
  }

  if (submitted.length === 0) {
    return (
      <div className="feedback-history feedback-history--empty">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
        </svg>
        <h3>No feedback submitted yet</h3>
        <p>Your submitted feedback will appear here</p>
      </div>
    )
  }

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id)
  }

  return (
    <div className="feedback-history">
      <div className="feedback-history__summary">
        <span>{submitted.length} feedback submission{submitted.length !== 1 ? 's' : ''}</span>
      </div>

      <div className="feedback-history__items">
        {submitted.map(item => (
          <FeedbackHistoryItem
            key={item.id}
            item={item}
            expanded={expandedId === item.id}
            onToggle={() => toggleExpand(item.id)}
          />
        ))}
      </div>
    </div>
  )
}

interface FeedbackHistoryItemProps {
  item: SubmittedFeedbackItem
  expanded: boolean
  onToggle: () => void
}

function FeedbackHistoryItem({ item, expanded, onToggle }: FeedbackHistoryItemProps) {
  const recommendationLabels = {
    hire: 'Hire',
    maybe: 'Maybe',
    do_not_hire: 'Do Not Hire',
  }

  return (
    <div className={`history-item ${expanded ? 'history-item--expanded' : ''}`}>
      <div 
        className="history-item__header"
        onClick={onToggle}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            onToggle()
          }
        }}
      >
        <div className="history-item__main">
          <span className="candidate-name">{item.candidateName}</span>
          <span className="trial-date">{formatFeedbackDate(item.scheduledAt)}</span>
        </div>

        <div className="history-item__summary">
          <span className="rating">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
            {item.feedback.rating.toFixed(1)}
          </span>
          <span 
            className={`recommendation recommendation--${item.feedback.recommendation}`}
            style={{ color: getRecommendationColor(item.feedback.recommendation) }}
          >
            {recommendationLabels[item.feedback.recommendation]}
          </span>
        </div>

        <svg 
          className={`expand-icon ${expanded ? 'expanded' : ''}`} 
          width="20" 
          height="20" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </div>

      {expanded && (
        <div className="history-item__details">
          {item.jobTitle && (
            <div className="detail-row">
              <span className="detail-label">Role</span>
              <span className="detail-value">{item.jobTitle}</span>
            </div>
          )}
          
          {item.branchName && (
            <div className="detail-row">
              <span className="detail-label">Branch</span>
              <span className="detail-value">{item.branchName}</span>
            </div>
          )}

          <div className="detail-row">
            <span className="detail-label">Submitted</span>
            <span className="detail-value">{formatFeedbackDate(item.feedback.submittedAt)}</span>
          </div>

          {item.feedback.strengths && (
            <div className="detail-block">
              <span className="detail-label">Strengths</span>
              <p className="detail-text">{item.feedback.strengths}</p>
            </div>
          )}

          {item.feedback.weaknesses && (
            <div className="detail-block">
              <span className="detail-label">Areas for Improvement</span>
              <p className="detail-text">{item.feedback.weaknesses}</p>
            </div>
          )}

          {item.feedback.comments && (
            <div className="detail-block">
              <span className="detail-label">Additional Comments</span>
              <p className="detail-text">{item.feedback.comments}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
