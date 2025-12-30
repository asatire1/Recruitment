// ============================================================================
// Allied Recruitment Portal - Candidate Feedback History (R10.4)
// Location: apps/recruitment-portal/src/components/feedback/CandidateFeedbackHistory.tsx
// ============================================================================

import { useState, useEffect } from 'react'
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore'
import { getFirebaseDb } from '@allied/shared-lib'
import type { InterviewFeedback, FeedbackRecommendation, CriterionCategory } from '@allied/shared-lib'
import { RECOMMENDATION_LABELS, RECOMMENDATION_COLORS, INTERVIEW_TYPE_LABELS, CRITERION_CATEGORY_LABELS } from '@allied/shared-lib'
import { Button, Spinner } from '@allied/shared-ui'
import { StarDisplay } from './StarRating'
import './CandidateFeedbackHistory.css'

interface Props {
  candidateId: string
  onAddFeedback?: () => void
}

export function CandidateFeedbackHistory({ candidateId, onAddFeedback }: Props) {
  const [feedbackList, setFeedbackList] = useState<InterviewFeedback[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => {
    async function loadFeedback() {
      try {
        setLoading(true)
        const db = getFirebaseDb()
        const q = query(collection(db, 'interviewFeedback'), where('candidateId', '==', candidateId), orderBy('interviewDate', 'desc'))
        const snap = await getDocs(q)
        setFeedbackList(snap.docs.map(d => ({ id: d.id, ...d.data() })) as InterviewFeedback[])
      } catch (err) {
        console.error('Error loading feedback:', err)
      } finally {
        setLoading(false)
      }
    }
    loadFeedback()
  }, [candidateId])

  const stats = {
    total: feedbackList.length,
    submitted: feedbackList.filter(f => f.status === 'submitted' || f.status === 'reviewed').length,
    avgRating: feedbackList.length > 0 ? feedbackList.reduce((sum, f) => sum + (f.scores?.averageRating || 0), 0) / feedbackList.length : 0,
    recommendations: feedbackList.reduce((acc, f) => { if (f.recommendation) acc[f.recommendation] = (acc[f.recommendation] || 0) + 1; return acc }, {} as Record<FeedbackRecommendation, number>),
  }

  if (loading) return <div className="feedback-history-loading"><Spinner size="md" /></div>

  return (
    <div className="candidate-feedback-history">
      <div className="feedback-summary-header">
        <div className="summary-stats">
          <div className="stat"><span className="stat-value">{stats.submitted}</span><span className="stat-label">Feedback</span></div>
          <div className="stat"><span className="stat-value">{stats.avgRating.toFixed(1)}</span><span className="stat-label">Avg Rating</span></div>
          <div className="stat recommendations-breakdown">
            {(['progress', 'hold', 'reject'] as FeedbackRecommendation[]).map(rec => (
              <span key={rec} className="rec-count" style={{ color: RECOMMENDATION_COLORS[rec] }} title={RECOMMENDATION_LABELS[rec]}>{stats.recommendations[rec] || 0}</span>
            ))}
          </div>
        </div>
        {onAddFeedback && <Button variant="secondary" size="sm" onClick={onAddFeedback}>+ Add Feedback</Button>}
      </div>

      {feedbackList.length === 0 ? (
        <div className="no-feedback">
          <p>No feedback recorded yet.</p>
          {onAddFeedback && <Button variant="primary" onClick={onAddFeedback}>Add First Feedback</Button>}
        </div>
      ) : (
        <div className="feedback-list">
          {feedbackList.map(feedback => {
            const interviewDate = feedback.interviewDate?.toDate?.() || new Date()
            const expanded = expandedId === feedback.id
            return (
              <div key={feedback.id} className={`feedback-card ${expanded ? 'expanded' : ''}`}>
                <div className="feedback-card-header" onClick={() => setExpandedId(expanded ? null : feedback.id)}>
                  <div className="header-left">
                    <span className="interview-type">{INTERVIEW_TYPE_LABELS[feedback.interviewType] || feedback.interviewType}</span>
                    <span className="interview-date">{interviewDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                    {feedback.jobTitle && <span className="job-title">• {feedback.jobTitle}</span>}
                  </div>
                  <div className="header-right">
                    <StarDisplay value={feedback.scores?.averageRating || 0} size="sm" />
                    {feedback.recommendation && (
                      <span className="recommendation-badge" style={{ backgroundColor: `${RECOMMENDATION_COLORS[feedback.recommendation]}15`, color: RECOMMENDATION_COLORS[feedback.recommendation] }}>
                        {RECOMMENDATION_LABELS[feedback.recommendation]}
                      </span>
                    )}
                    <button className="expand-btn">{expanded ? '▲' : '▼'}</button>
                  </div>
                </div>
                {expanded && (
                  <div className="feedback-card-body">
                    <div className="submitter-info">
                      <span>Submitted by {feedback.submittedByName}</span>
                      {feedback.submittedAt && <span> on {feedback.submittedAt.toDate?.().toLocaleDateString('en-GB')}</span>}
                    </div>
                    {feedback.scores?.categoryScores && (
                      <div className="category-scores">
                        <h4>Scores by Category</h4>
                        <div className="scores-grid">
                          {Object.entries(feedback.scores.categoryScores).map(([cat, data]) => (
                            <div key={cat} className="category-score">
                              <span className="cat-name">{CRITERION_CATEGORY_LABELS[cat as CriterionCategory] || cat}</span>
                              <div className="cat-bar"><div className="cat-fill" style={{ width: `${(data.average / 5) * 100}%` }} /></div>
                              <span className="cat-value">{data.average.toFixed(1)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    <div className="qualitative-feedback">
                      {feedback.strengths && <div className="feedback-section"><h4>Strengths</h4><p>{feedback.strengths}</p></div>}
                      {feedback.concerns && <div className="feedback-section"><h4>Concerns</h4><p>{feedback.concerns}</p></div>}
                      {feedback.overallImpression && <div className="feedback-section"><h4>Overall Impression</h4><p>{feedback.overallImpression}</p></div>}
                    </div>
                    {feedback.suggestedNextStep && <div className="next-step"><strong>Suggested Next Step:</strong> {feedback.suggestedNextStep.replace(/_/g, ' ')}</div>}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default CandidateFeedbackHistory
