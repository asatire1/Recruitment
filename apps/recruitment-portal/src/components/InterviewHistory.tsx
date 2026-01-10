/**
 * InterviewHistory Component - iOS Style
 * 
 * Clean, minimal display of interviews with expandable feedback forms.
 */

import React, { useState, useEffect } from 'react'
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore'
import { getFirebaseDb, COLLECTIONS } from '@allied/shared-lib'
import type { Interview } from '@allied/shared-lib'
import { InterviewSummary } from './InterviewSummary'
import { InterviewFeedback } from './InterviewFeedback'
import './InterviewHistory.css'

interface InterviewHistoryProps {
  candidateId: string
  candidateName?: string
}

const FEEDBACK_ALLOWED_STATUSES = ['lapsed', 'completed', 'no_show']

export function InterviewHistory({ candidateId, candidateName }: InterviewHistoryProps) {
  const [interviews, setInterviews] = useState<Interview[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => {
    const db = getFirebaseDb()
    const interviewsRef = collection(db, COLLECTIONS.INTERVIEWS)
    const q = query(
      interviewsRef,
      where('candidateId', '==', candidateId),
      orderBy('scheduledDate', 'desc')
    )

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Interview[]
      setInterviews(data)
      setLoading(false)
    }, (error) => {
      console.error('Error fetching interviews:', error)
      setLoading(false)
    })

    return () => unsubscribe()
  }, [candidateId])

  const formatDate = (timestamp: any) => {
    if (!timestamp) return '-'
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
    return date.toLocaleDateString('en-GB', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getStatusConfig = (status: string) => {
    const config: Record<string, { label: string; color: string }> = {
      scheduled: { label: 'Scheduled', color: '#FF9500' },
      completed: { label: 'Completed', color: '#34C759' },
      cancelled: { label: 'Cancelled', color: '#8E8E93' },
      no_show: { label: 'No Show', color: '#FF3B30' },
      lapsed: { label: 'Lapsed', color: '#FF9500' },
      resolved: { label: 'Resolved', color: '#007AFF' },
    }
    return config[status] || { label: status, color: '#8E8E93' }
  }

  if (loading) {
    return (
      <div className="ios-interview-history loading">
        <p>Loading...</p>
      </div>
    )
  }

  if (interviews.length === 0) {
    return (
      <div className="ios-interview-history empty">
        <p className="empty-text">No interviews or trials yet</p>
      </div>
    )
  }

  return (
    <div className="ios-interview-history">
      {interviews.map((interview) => {
        const extendedInterview = interview as Interview & {
          onlineMeetingId?: string
          joinWebUrl?: string
          meetingInsights?: any
          claudeAssessment?: any
        }
        
        const canLeaveFeedback = FEEDBACK_ALLOWED_STATUSES.includes(interview.status)
        const statusConfig = getStatusConfig(interview.status)
        const isExpanded = expandedId === interview.id
        
        return (
          <div key={interview.id} className={`interview-card ${isExpanded ? 'expanded' : ''}`}>
            <div 
              className="interview-card-header"
              onClick={() => setExpandedId(isExpanded ? null : interview.id)}
            >
              <div className="interview-info">
                <div className="interview-type">
                  {interview.type === 'interview' ? '📅 Interview' : '👔 Trial'}
                </div>
                <div className="interview-date">{formatDate(interview.scheduledDate)}</div>
                {interview.branchName && (
                  <div className="interview-branch">{interview.branchName}</div>
                )}
              </div>
              
              <div className="interview-meta">
                <span 
                  className="status-pill"
                  style={{ backgroundColor: statusConfig.color + '20', color: statusConfig.color }}
                >
                  {statusConfig.label}
                </span>
                <span className="chevron">{isExpanded ? '▼' : '▶'}</span>
              </div>
            </div>

            {isExpanded && (
              <div className="interview-card-body">
                {interview.notes && (
                  <div className="detail-block">
                    <label>Notes</label>
                    <p>{interview.notes}</p>
                  </div>
                )}
                
                {interview.interviewerName && (
                  <div className="detail-block">
                    <label>Interviewer</label>
                    <p>{interview.interviewerName}</p>
                  </div>
                )}

                {extendedInterview.joinWebUrl && (
                  <a 
                    href={extendedInterview.joinWebUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="teams-link"
                  >
                    📹 Join Teams Meeting
                  </a>
                )}

                {extendedInterview.onlineMeetingId && (
                  <div className="copilot-block">
                    <InterviewSummary 
                      interview={extendedInterview}
                      onUpdate={() => {}}
                    />
                  </div>
                )}

                {canLeaveFeedback && (
                  <div className="feedback-block">
                    <InterviewFeedback
                      interviewId={interview.id}
                      candidateId={candidateId}
                      candidateName={candidateName || 'Candidate'}
                      interviewDate={formatDate(interview.scheduledDate)}
                      existingFeedback={interview.feedback as any}
                      onFeedbackSubmitted={() => {}}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

export default InterviewHistory
