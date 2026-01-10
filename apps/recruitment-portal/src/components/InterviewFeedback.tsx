/**
 * InterviewFeedback Component - iOS Style
 * 
 * Clean, minimal feedback form for staff after interviews.
 */

import React, { useState, useEffect } from 'react'
import { doc, updateDoc, collection, addDoc, query, where, onSnapshot, serverTimestamp } from 'firebase/firestore'
import { getFirebaseDb, COLLECTIONS } from '@allied/shared-lib'
import { useAuth } from '../contexts/AuthContext'
import './InterviewFeedback.css'

interface FeedbackData {
  id?: string
  interviewId: string
  candidateId: string
  overallRating: number
  communicationRating: number
  experienceRating: number
  attitudeRating: number
  recommendation: 'strong_hire' | 'hire' | 'maybe' | 'no_hire' | 'strong_no_hire'
  strengths: string
  concerns: string
  additionalNotes: string
  submittedBy: string
  submittedByName: string
  submittedAt: any
}

interface InterviewFeedbackProps {
  interviewId: string
  candidateId: string
  candidateName: string
  interviewDate?: string
  existingFeedback?: FeedbackData | null
  onFeedbackSubmitted?: () => void
  readOnly?: boolean
}

const RECOMMENDATION_OPTIONS = [
  { value: 'strong_hire', label: 'Strong Hire', color: '#34C759' },
  { value: 'hire', label: 'Hire', color: '#30D158' },
  { value: 'maybe', label: 'Maybe', color: '#FF9500' },
  { value: 'no_hire', label: 'No Hire', color: '#FF3B30' },
  { value: 'strong_no_hire', label: 'Definitely Not', color: '#FF2D55' },
]

export function InterviewFeedback({
  interviewId,
  candidateId,
  candidateName,
  interviewDate,
  existingFeedback,
  onFeedbackSubmitted,
  readOnly = false,
}: InterviewFeedbackProps) {
  const { user, userProfile } = useAuth()
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const [form, setForm] = useState({
    overallRating: existingFeedback?.overallRating || 0,
    communicationRating: existingFeedback?.communicationRating || 0,
    experienceRating: existingFeedback?.experienceRating || 0,
    attitudeRating: existingFeedback?.attitudeRating || 0,
    recommendation: existingFeedback?.recommendation || '',
    strengths: existingFeedback?.strengths || '',
    concerns: existingFeedback?.concerns || '',
    additionalNotes: existingFeedback?.additionalNotes || '',
  })

  const [allFeedback, setAllFeedback] = useState<FeedbackData[]>([])
  const [showHistory, setShowHistory] = useState(false)
  const [hasSubmitted, setHasSubmitted] = useState(false)

  useEffect(() => {
    const db = getFirebaseDb()
    const feedbackRef = collection(db, 'interviewFeedback')
    const q = query(
      feedbackRef,
      where('interviewId', '==', interviewId)
    )

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const feedback = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as FeedbackData[]
      setAllFeedback(feedback)
      
      // Check if current user already submitted
      if (user?.uid && feedback.some(f => f.submittedBy === user.uid)) {
        setHasSubmitted(true)
      }
    }, (error) => {
      console.log('Feedback query error:', error)
    })

    return () => unsubscribe()
  }, [interviewId, user?.uid])

  const handleRatingClick = (field: string, value: number) => {
    if (readOnly) return
    setForm(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async () => {
    if (!form.recommendation) {
      setError('Please select a recommendation')
      return
    }
    if (!form.overallRating) {
      setError('Please provide an overall rating')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const db = getFirebaseDb()
      
      const feedbackData = {
        interviewId,
        candidateId,
        overallRating: form.overallRating,
        communicationRating: form.communicationRating,
        experienceRating: form.experienceRating,
        attitudeRating: form.attitudeRating,
        recommendation: form.recommendation,
        strengths: form.strengths,
        concerns: form.concerns,
        additionalNotes: form.additionalNotes,
        submittedBy: user?.uid || '',
        submittedByName: userProfile?.displayName || userProfile?.email || 'Unknown',
        submittedAt: serverTimestamp(),
      }

      await addDoc(collection(db, 'interviewFeedback'), feedbackData)

      // Try to update interview document (optional - may fail for non-recruiters)
      try {
        await updateDoc(doc(db, COLLECTIONS.INTERVIEWS, interviewId), {
          feedback: { ...feedbackData, submittedAt: new Date().toISOString() },
          feedbackSubmittedAt: serverTimestamp(),
        })
      } catch (e) {
        console.log('Could not update interview doc - feedback still saved')
      }

      setSaved(true)
      onFeedbackSubmitted?.()
      setTimeout(() => setSaved(false), 3000)
    } catch (err: any) {
      console.error('Error submitting feedback:', err)
      setError(err.message || 'Failed to submit feedback')
    } finally {
      setLoading(false)
    }
  }

  const RatingSlider = ({ field, value, label }: { field: string; value: number; label: string }) => (
    <div className="rating-slider">
      <div className="rating-slider-header">
        <span className="rating-label">{label}</span>
        <span className="rating-value">{value || '-'}/5</span>
      </div>
      <div className="rating-dots">
        {[1, 2, 3, 4, 5].map((dot) => (
          <button
            key={dot}
            type="button"
            className={`rating-dot ${dot <= value ? 'active' : ''}`}
            onClick={() => handleRatingClick(field, dot)}
            disabled={readOnly}
          />
        ))}
      </div>
    </div>
  )

  return (
    <div className="ios-feedback">
      {/* Previous Feedback */}
      {allFeedback.length > 0 && (
        <div className="feedback-history-section">
          <button 
            className="history-toggle"
            onClick={() => setShowHistory(!showHistory)}
          >
            {showHistory ? '▼' : '▶'} {allFeedback.length} feedback{allFeedback.length > 1 ? 's' : ''} submitted
          </button>
          
          {showHistory && (
            <div className="feedback-history">
              {allFeedback.map((fb) => (
                <div key={fb.id} className="history-item">
                  <div className="history-header">
                    <span className="history-author">{fb.submittedByName}</span>
                    <span className={`history-rec rec-${fb.recommendation}`}>
                      {RECOMMENDATION_OPTIONS.find(o => o.value === fb.recommendation)?.label}
                    </span>
                  </div>
                  <div className="history-rating">Rating: {fb.overallRating}/5</div>
                  {fb.strengths && <p><strong>Strengths:</strong> {fb.strengths}</p>}
                  {fb.concerns && <p><strong>Concerns:</strong> {fb.concerns}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Feedback Form - hide if feedback already exists */}
      {!readOnly && allFeedback.length === 0 && (
        <div className="feedback-form">
          <div className="form-section">
            <h4>Rate {candidateName}</h4>
            <RatingSlider field="overallRating" value={form.overallRating} label="Overall" />
            <RatingSlider field="communicationRating" value={form.communicationRating} label="Communication" />
            <RatingSlider field="experienceRating" value={form.experienceRating} label="Experience" />
            <RatingSlider field="attitudeRating" value={form.attitudeRating} label="Attitude" />
          </div>

          <div className="form-section">
            <h4>Recommendation</h4>
            <div className="rec-grid">
              {RECOMMENDATION_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={`rec-btn ${form.recommendation === option.value ? 'selected' : ''}`}
                  onClick={() => setForm(prev => ({ ...prev, recommendation: option.value as any }))}
                  style={{
                    '--rec-color': option.color,
                  } as React.CSSProperties}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="form-section">
            <h4>Comments</h4>
            <div className="input-group">
              <label>Strengths</label>
              <textarea
                value={form.strengths}
                onChange={(e) => setForm(prev => ({ ...prev, strengths: e.target.value }))}
                placeholder="What impressed you?"
                rows={2}
              />
            </div>
            <div className="input-group">
              <label>Concerns</label>
              <textarea
                value={form.concerns}
                onChange={(e) => setForm(prev => ({ ...prev, concerns: e.target.value }))}
                placeholder="Any red flags or areas for improvement?"
                rows={2}
              />
            </div>
            <div className="input-group">
              <label>Additional Notes</label>
              <textarea
                value={form.additionalNotes}
                onChange={(e) => setForm(prev => ({ ...prev, additionalNotes: e.target.value }))}
                placeholder="Other observations..."
                rows={2}
              />
            </div>
          </div>

          {error && <div className="error-msg">{error}</div>}
          {saved && <div className="success-msg">✓ Feedback saved</div>}
          
          <button
            className="submit-btn"
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? 'Saving...' : 'Submit Feedback'}
          </button>
        </div>
      )}
    </div>
  )
}

export default InterviewFeedback
