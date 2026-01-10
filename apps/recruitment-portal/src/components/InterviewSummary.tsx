/**
 * InterviewSummary Component
 * 
 * Displays Teams Copilot AI-generated meeting summaries for interviews.
 * Auto-fetches summaries for completed interviews with Teams meetings.
 */

import React, { useState, useEffect, useRef } from 'react'
import { httpsCallable } from 'firebase/functions'
import { getFirebaseFunctions } from '@allied/shared-lib'
import type { Interview } from '@allied/shared-lib'
import './InterviewSummary.css'

// Local type for meeting insights
interface MeetingInsights {
  summary: string
  keyPoints: string[]
  actionItems: { text: string; owner?: string }[]
  mentions: string[]
  sentiment?: 'positive' | 'neutral' | 'negative'
  recommendation?: string
}

interface ExtendedInterview extends Interview {
  onlineMeetingId?: string
  joinWebUrl?: string
  meetingInsights?: MeetingInsights
  transcriptStatus?: string
}

interface InterviewSummaryProps {
  interview: ExtendedInterview
  onUpdate?: () => void
}

export function InterviewSummary({ interview, onUpdate }: InterviewSummaryProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [insights, setInsights] = useState<MeetingInsights | null>(
    interview.meetingInsights || null
  )
  const hasFetchedRef = useRef(false)

  // Auto-fetch insights when interview is completed and has a meeting ID but no cached insights
  useEffect(() => {
    const shouldAutoFetch = 
      interview.status === 'completed' &&
      interview.onlineMeetingId &&
      !interview.meetingInsights &&
      !insights &&
      !hasFetchedRef.current

    if (shouldAutoFetch) {
      hasFetchedRef.current = true
      handleFetchSummary()
    }
  }, [interview.status, interview.onlineMeetingId, interview.meetingInsights])

  const handleFetchSummary = async () => {
    if (!interview.onlineMeetingId) {
      setError('No Teams meeting associated with this interview')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const fetchInsights = httpsCallable(getFirebaseFunctions(), 'fetchMeetingInsights')
      const result = await fetchInsights({
        interviewId: interview.id,
        onlineMeetingId: interview.onlineMeetingId,
      })

      const data = result.data as { success: boolean; insights?: MeetingInsights; error?: string }
      
      if (data.success && data.insights) {
        setInsights(data.insights)
        onUpdate?.()
      } else {
        setError(data.error || 'Failed to fetch meeting insights')
      }
    } catch (err: any) {
      console.error('Error fetching meeting insights:', err)
      setError(err.message || 'Failed to fetch meeting insights')
    } finally {
      setLoading(false)
    }
  }

  const handleCheckStatus = async () => {
    if (!interview.onlineMeetingId) return

    setLoading(true)
    try {
      const checkStatus = httpsCallable(getFirebaseFunctions(), 'checkMeetingStatus')
      const result = await checkStatus({
        onlineMeetingId: interview.onlineMeetingId,
      })

      const data = result.data as { transcriptAvailable: boolean; insightsAvailable: boolean }
      
      if (data.insightsAvailable) {
        await handleFetchSummary()
      } else {
        setError('Meeting insights not yet available. Please try again later.')
      }
    } catch (err: any) {
      setError(err.message || 'Failed to check meeting status')
    } finally {
      setLoading(false)
    }
  }

  // No Teams meeting - show option to create one
  if (!interview.onlineMeetingId) {
    return (
      <div className="interview-summary no-meeting">
        <p className="no-meeting-text">No Teams meeting linked to this interview.</p>
      </div>
    )
  }

  // Show insights if available
  if (insights) {
    return (
      <div className="interview-summary has-insights">
        <div className="summary-header">
          <h4>📝 AI Meeting Summary</h4>
          <button 
            className="refresh-btn"
            onClick={handleFetchSummary}
            disabled={loading}
            title="Refresh summary"
          >
            🔄
          </button>
        </div>

        <div className="summary-content">
          <p className="summary-text">{insights.summary}</p>

          {insights.keyPoints?.length > 0 && (
            <div className="summary-section">
              <h5>Key Points</h5>
              <ul>
                {insights.keyPoints.map((point, i) => (
                  <li key={i}>{point}</li>
                ))}
              </ul>
            </div>
          )}

          {insights.actionItems?.length > 0 && (
            <div className="summary-section">
              <h5>Action Items</h5>
              <ul className="action-items">
                {insights.actionItems.map((item, i) => (
                  <li key={i}>
                    <span className="action-text">{item.text}</span>
                    {item.owner && <span className="action-owner">({item.owner})</span>}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {insights.mentions?.length > 0 && (
            <div className="summary-section">
              <h5>People Mentioned</h5>
              <div className="mentions">
                {insights.mentions.map((name, i) => (
                  <span key={i} className="mention-tag">{name}</span>
                ))}
              </div>
            </div>
          )}

          {insights.sentiment && (
            <div className="summary-sentiment">
              <span className={`sentiment-badge ${insights.sentiment}`}>
                {insights.sentiment === 'positive' && '😊 Positive'}
                {insights.sentiment === 'neutral' && '😐 Neutral'}
                {insights.sentiment === 'negative' && '😟 Needs Attention'}
              </span>
            </div>
          )}
        </div>
      </div>
    )
  }

  // No insights yet - show fetch button
  return (
    <div className="interview-summary pending">
      {interview.joinWebUrl && (
        <a 
          href={interview.joinWebUrl} 
          target="_blank" 
          rel="noopener noreferrer"
          className="teams-link"
        >
          📹 Join Teams Meeting
        </a>
      )}

      <div className="fetch-summary">
        <p>Meeting summary will be available after the meeting ends with transcription enabled.</p>
        
        <button
          className="fetch-btn"
          onClick={handleCheckStatus}
          disabled={loading}
        >
          {loading ? 'Checking...' : '📝 Fetch AI Summary'}
        </button>

        {error && <p className="error-text">{error}</p>}
      </div>
    </div>
  )
}

export default InterviewSummary
