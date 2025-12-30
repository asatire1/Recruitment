// ============================================================================
// Allied Recruitment Portal - Interview Feedback Form (R10.2)
// Location: apps/recruitment-portal/src/components/feedback/FeedbackForm.tsx
//
// Features:
// - Star ratings for multiple criteria
// - Recommendation selection (Progress/Hold/Reject)
// - Free-form notes fields
// - Draft saving
// - Validation
// ============================================================================

import { useState, useEffect, useMemo, useCallback } from 'react'
import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  collection,
  query,
  where,
  getDocs,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore'
import { getFirebaseDb } from '@allied/shared-lib'
import type { 
  InterviewFeedback, 
  ScorecardTemplate, 
  FeedbackCriterion,
  CriterionRating,
  FeedbackRecommendation,
  FeedbackStatus,
  CriterionCategory
} from '@allied/shared-lib'
import { 
  DEFAULT_SCORECARD_TEMPLATE,
  CRITERION_CATEGORY_LABELS,
  RECOMMENDATION_LABELS,
  RECOMMENDATION_COLORS
} from '@allied/shared-lib'
import { Card, Button, Spinner, Textarea } from '@allied/shared-ui'
import { useAuth } from '../../contexts/AuthContext'
import { StarRating } from './StarRating'
import './FeedbackForm.css'

// ============================================================================
// TYPES
// ============================================================================

interface FeedbackFormProps {
  interviewId: string
  candidateId: string
  candidateName: string
  candidateEmail?: string
  jobId?: string
  jobTitle?: string
  jobCategory?: string
  branchId?: string
  branchName?: string
  interviewType: string
  interviewDate: Date
  existingFeedbackId?: string
  onSubmit?: (feedbackId: string) => void
  onCancel?: () => void
  onSaveDraft?: (feedbackId: string) => void
}

interface FormState {
  criteriaRatings: Map<string, CriterionRating>
  recommendation: FeedbackRecommendation | null
  recommendationConfidence: number
  suggestedNextStep: InterviewFeedback['suggestedNextStep'] | null
  strengths: string
  concerns: string
  overallImpression: string
  redFlags: string[]
  highlights: string[]
  internalNotes: string
}

const INITIAL_FORM_STATE: FormState = {
  criteriaRatings: new Map(),
  recommendation: null,
  recommendationConfidence: 0,
  suggestedNextStep: null,
  strengths: '',
  concerns: '',
  overallImpression: '',
  redFlags: [],
  highlights: [],
  internalNotes: '',
}

const NEXT_STEPS = [
  { value: 'schedule_trial', label: 'Schedule Trial Shift' },
  { value: 'schedule_second_interview', label: 'Schedule Second Interview' },
  { value: 'make_offer', label: 'Make Offer' },
  { value: 'reject', label: 'Send Rejection' },
  { value: 'hold_for_future', label: 'Hold for Future Opportunities' },
  { value: 'need_more_info', label: 'Need More Information' },
]

// ============================================================================
// COMPONENT
// ============================================================================

export function FeedbackForm({
  interviewId,
  candidateId,
  candidateName,
  candidateEmail,
  jobId,
  jobTitle,
  jobCategory,
  branchId,
  branchName,
  interviewType,
  interviewDate,
  existingFeedbackId,
  onSubmit,
  onCancel,
  onSaveDraft,
}: FeedbackFormProps) {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Template and feedback state
  const [template, setTemplate] = useState<ScorecardTemplate | null>(null)
  const [feedbackId, setFeedbackId] = useState<string | null>(existingFeedbackId || null)
  const [formState, setFormState] = useState<FormState>(INITIAL_FORM_STATE)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)

  // ============================================================================
  // LOAD TEMPLATE AND EXISTING FEEDBACK
  // ============================================================================

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true)
        const db = getFirebaseDb()
        
        // Load appropriate scorecard template
        let scorecardTemplate: ScorecardTemplate | null = null
        
        // Try to find template matching job category
        if (jobCategory) {
          const templateQuery = query(
            collection(db, 'scorecardTemplates'),
            where('active', '==', true),
            where('jobCategories', 'array-contains', jobCategory)
          )
          const templateSnap = await getDocs(templateQuery)
          if (!templateSnap.empty) {
            scorecardTemplate = {
              id: templateSnap.docs[0].id,
              ...templateSnap.docs[0].data()
            } as ScorecardTemplate
          }
        }
        
        // Fall back to default template
        if (!scorecardTemplate) {
          const defaultQuery = query(
            collection(db, 'scorecardTemplates'),
            where('isDefault', '==', true),
            where('active', '==', true)
          )
          const defaultSnap = await getDocs(defaultQuery)
          if (!defaultSnap.empty) {
            scorecardTemplate = {
              id: defaultSnap.docs[0].id,
              ...defaultSnap.docs[0].data()
            } as ScorecardTemplate
          }
        }
        
        // Use built-in default if no template in database
        if (!scorecardTemplate) {
          scorecardTemplate = {
            ...DEFAULT_SCORECARD_TEMPLATE,
            id: 'default',
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
            createdBy: 'system',
          } as ScorecardTemplate
        }
        
        setTemplate(scorecardTemplate)
        
        // Load existing feedback if editing
        if (existingFeedbackId) {
          const feedbackDoc = await getDoc(doc(db, 'interviewFeedback', existingFeedbackId))
          if (feedbackDoc.exists()) {
            const data = feedbackDoc.data() as InterviewFeedback
            
            // Convert criteria ratings array to Map
            const ratingsMap = new Map<string, CriterionRating>()
            data.criteriaRatings?.forEach(r => {
              ratingsMap.set(r.criterionId, r)
            })
            
            setFormState({
              criteriaRatings: ratingsMap,
              recommendation: data.recommendation || null,
              recommendationConfidence: data.recommendationConfidence || 0,
              suggestedNextStep: data.suggestedNextStep || null,
              strengths: data.strengths || '',
              concerns: data.concerns || '',
              overallImpression: data.overallImpression || '',
              redFlags: data.redFlags || [],
              highlights: data.highlights || [],
              internalNotes: data.internalNotes || '',
            })
          }
        }
        
      } catch (err) {
        console.error('Error loading feedback data:', err)
        setError('Failed to load feedback form')
      } finally {
        setLoading(false)
      }
    }
    
    loadData()
  }, [existingFeedbackId, jobCategory])

  // ============================================================================
  // CALCULATIONS
  // ============================================================================

  const scores = useMemo(() => {
    if (!template) return null
    
    const ratings = Array.from(formState.criteriaRatings.values())
    if (ratings.length === 0) return null
    
    // Calculate simple average
    const sum = ratings.reduce((acc, r) => acc + (typeof r.rating === 'number' ? r.rating : 0), 0)
    const averageRating = sum / ratings.length
    
    // Calculate weighted average
    let weightedSum = 0
    let totalWeight = 0
    ratings.forEach(r => {
      if (typeof r.rating === 'number') {
        weightedSum += r.rating * r.weight
        totalWeight += r.weight
      }
    })
    const weightedAverage = totalWeight > 0 ? weightedSum / totalWeight : 0
    
    // Calculate by category
    const categoryScores: Record<string, { total: number; count: number; average: number }> = {}
    ratings.forEach(r => {
      if (typeof r.rating === 'number') {
        if (!categoryScores[r.category]) {
          categoryScores[r.category] = { total: 0, count: 0, average: 0 }
        }
        categoryScores[r.category].total += r.rating
        categoryScores[r.category].count += 1
      }
    })
    Object.keys(categoryScores).forEach(cat => {
      categoryScores[cat].average = categoryScores[cat].total / categoryScores[cat].count
    })
    
    return {
      averageRating: Math.round(averageRating * 10) / 10,
      weightedAverage: Math.round(weightedAverage * 10) / 10,
      criteriaCount: ratings.length,
      categoryScores,
    }
  }, [formState.criteriaRatings, template])

  // Suggested recommendation based on scores
  const suggestedRecommendation = useMemo(() => {
    if (!scores || !template) return null
    
    const avg = scores.weightedAverage
    const progressThreshold = template.progressThreshold || 3.5
    const holdThreshold = template.holdThreshold || 2.5
    
    if (avg >= progressThreshold) return 'progress'
    if (avg >= holdThreshold) return 'hold'
    return 'reject'
  }, [scores, template])

  // Validation
  const validation = useMemo(() => {
    const errors: string[] = []
    const requiredCriteria = template?.criteria.filter(c => c.required) || []
    
    requiredCriteria.forEach(criterion => {
      if (!formState.criteriaRatings.has(criterion.id)) {
        errors.push(`Please rate: ${criterion.name}`)
      }
    })
    
    if (!formState.recommendation) {
      errors.push('Please select a recommendation')
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      completionPercentage: template 
        ? Math.round((formState.criteriaRatings.size / template.criteria.length) * 100)
        : 0,
    }
  }, [formState, template])

  // ============================================================================
  // HANDLERS
  // ============================================================================

  const handleRatingChange = useCallback((criterion: FeedbackCriterion, rating: number) => {
    setFormState(prev => {
      const newRatings = new Map(prev.criteriaRatings)
      newRatings.set(criterion.id, {
        criterionId: criterion.id,
        criterionName: criterion.name,
        category: criterion.category,
        rating,
        maxRating: criterion.ratingScale === '1-10' ? 10 : 5,
        weight: criterion.weight,
      })
      return { ...prev, criteriaRatings: newRatings }
    })
  }, [])

  const handleCriterionNotesChange = useCallback((criterionId: string, notes: string) => {
    setFormState(prev => {
      const newRatings = new Map(prev.criteriaRatings)
      const existing = newRatings.get(criterionId)
      if (existing) {
        newRatings.set(criterionId, { ...existing, notes })
      }
      return { ...prev, criteriaRatings: newRatings }
    })
  }, [])

  const handleRecommendationChange = useCallback((recommendation: FeedbackRecommendation) => {
    setFormState(prev => ({ ...prev, recommendation }))
  }, [])

  const handleFieldChange = useCallback((field: keyof FormState, value: any) => {
    setFormState(prev => ({ ...prev, [field]: value }))
  }, [])

  // ============================================================================
  // SAVE & SUBMIT
  // ============================================================================

  const buildFeedbackDocument = useCallback((status: FeedbackStatus): Partial<InterviewFeedback> => {
    return {
      interviewId,
      candidateId,
      candidateName,
      candidateEmail,
      jobId,
      jobTitle,
      jobCategory,
      branchId,
      branchName,
      interviewType: interviewType as any,
      interviewDate: Timestamp.fromDate(interviewDate),
      scorecardTemplateId: template?.id,
      scorecardTemplateName: template?.name,
      scorecardVersion: template?.version,
      criteriaRatings: Array.from(formState.criteriaRatings.values()),
      scores: scores || {
        averageRating: 0,
        weightedAverage: 0,
        criteriaCount: 0,
      },
      recommendation: formState.recommendation || 'hold',
      recommendationConfidence: formState.recommendationConfidence,
      suggestedNextStep: formState.suggestedNextStep || undefined,
      strengths: formState.strengths || undefined,
      concerns: formState.concerns || undefined,
      overallImpression: formState.overallImpression || undefined,
      redFlags: formState.redFlags.length > 0 ? formState.redFlags : undefined,
      highlights: formState.highlights.length > 0 ? formState.highlights : undefined,
      internalNotes: formState.internalNotes || undefined,
      status,
      submittedBy: user?.uid || '',
      submittedByName: user?.displayName || '',
      submittedByEmail: user?.email || undefined,
      submittedAt: status === 'submitted' ? serverTimestamp() as any : undefined,
    }
  }, [
    interviewId, candidateId, candidateName, candidateEmail,
    jobId, jobTitle, jobCategory, branchId, branchName,
    interviewType, interviewDate, template, formState, scores, user
  ])

  const saveDraft = useCallback(async () => {
    try {
      setSaving(true)
      setError(null)
      
      const db = getFirebaseDb()
      const feedbackData = buildFeedbackDocument('draft')
      
      if (feedbackId) {
        // Update existing
        await updateDoc(doc(db, 'interviewFeedback', feedbackId), {
          ...feedbackData,
          updatedAt: serverTimestamp(),
        })
      } else {
        // Create new
        const newDocRef = doc(collection(db, 'interviewFeedback'))
        await setDoc(newDocRef, {
          ...feedbackData,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        })
        setFeedbackId(newDocRef.id)
      }
      
      setLastSaved(new Date())
      onSaveDraft?.(feedbackId || '')
      
    } catch (err) {
      console.error('Error saving draft:', err)
      setError('Failed to save draft')
    } finally {
      setSaving(false)
    }
  }, [feedbackId, buildFeedbackDocument, onSaveDraft])

  const submitFeedback = useCallback(async () => {
    if (!validation.isValid) {
      setError('Please complete all required fields')
      return
    }
    
    try {
      setSaving(true)
      setError(null)
      
      const db = getFirebaseDb()
      const feedbackData = buildFeedbackDocument('submitted')
      
      if (feedbackId) {
        await updateDoc(doc(db, 'interviewFeedback', feedbackId), {
          ...feedbackData,
          updatedAt: serverTimestamp(),
        })
      } else {
        const newDocRef = doc(collection(db, 'interviewFeedback'))
        await setDoc(newDocRef, {
          ...feedbackData,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        })
        setFeedbackId(newDocRef.id)
      }
      
      // Update interview status
      await updateDoc(doc(db, 'interviews', interviewId), {
        status: 'completed',
        'feedback.rating': scores?.averageRating || 0,
        'feedback.recommendation': formState.recommendation,
        'feedback.submittedAt': serverTimestamp(),
        'feedback.submittedBy': user?.uid,
        updatedAt: serverTimestamp(),
      })
      
      onSubmit?.(feedbackId || '')
      
    } catch (err) {
      console.error('Error submitting feedback:', err)
      setError('Failed to submit feedback')
    } finally {
      setSaving(false)
    }
  }, [feedbackId, validation, buildFeedbackDocument, interviewId, scores, formState.recommendation, user, onSubmit])

  // ============================================================================
  // RENDER
  // ============================================================================

  if (loading) {
    return (
      <div className="feedback-form-loading">
        <Spinner size="lg" />
        <p>Loading feedback form...</p>
      </div>
    )
  }

  if (!template) {
    return (
      <div className="feedback-form-error">
        <p>No scorecard template available. Please configure one in Settings.</p>
        <Button variant="secondary" onClick={onCancel}>Go Back</Button>
      </div>
    )
  }

  // Group criteria by category
  const criteriaByCategory = template.criteria.reduce((acc, criterion) => {
    if (!acc[criterion.category]) {
      acc[criterion.category] = []
    }
    acc[criterion.category].push(criterion)
    return acc
  }, {} as Record<CriterionCategory, FeedbackCriterion[]>)

  return (
    <div className="feedback-form">
      {/* Header */}
      <div className="feedback-form-header">
        <div className="header-info">
          <h2>Interview Feedback</h2>
          <p className="candidate-info">
            <strong>{candidateName}</strong>
            {jobTitle && <span> • {jobTitle}</span>}
            {branchName && <span> • {branchName}</span>}
          </p>
          <p className="interview-info">
            {interviewType.replace('_', ' ')} • {interviewDate.toLocaleDateString('en-GB', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
              year: 'numeric'
            })}
          </p>
        </div>
        <div className="header-progress">
          <div className="progress-ring">
            <span className="progress-value">{validation.completionPercentage}%</span>
          </div>
          <span className="progress-label">Complete</span>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="alert alert-error">
          <span>{error}</span>
          <button onClick={() => setError(null)}>×</button>
        </div>
      )}

      {/* Score Summary (sticky) */}
      {scores && (
        <div className="score-summary-sticky">
          <div className="score-item">
            <span className="score-label">Average</span>
            <span className="score-value">{scores.averageRating}/5</span>
          </div>
          <div className="score-item">
            <span className="score-label">Weighted</span>
            <span className="score-value">{scores.weightedAverage}/5</span>
          </div>
          <div className="score-item">
            <span className="score-label">Suggested</span>
            <span 
              className="score-value recommendation-badge"
              style={{ color: RECOMMENDATION_COLORS[suggestedRecommendation || 'hold'] }}
            >
              {suggestedRecommendation ? RECOMMENDATION_LABELS[suggestedRecommendation] : '-'}
            </span>
          </div>
        </div>
      )}

      {/* Criteria Sections */}
      <div className="criteria-sections">
        {Object.entries(criteriaByCategory).map(([category, criteria]) => (
          <Card key={category} className="criteria-section">
            <h3 className="section-title">
              {CRITERION_CATEGORY_LABELS[category as CriterionCategory] || category}
            </h3>
            <div className="criteria-list">
              {criteria.sort((a, b) => a.sortOrder - b.sortOrder).map(criterion => {
                const rating = formState.criteriaRatings.get(criterion.id)
                
                return (
                  <div key={criterion.id} className="criterion-item">
                    <div className="criterion-header">
                      <span className="criterion-name">
                        {criterion.name}
                        {criterion.required && <span className="required">*</span>}
                      </span>
                      {criterion.description && (
                        <span className="criterion-description">{criterion.description}</span>
                      )}
                    </div>
                    
                    <div className="criterion-rating">
                      <StarRating
                        value={typeof rating?.rating === 'number' ? rating.rating : 0}
                        onChange={(value) => handleRatingChange(criterion, value)}
                        max={criterion.ratingScale === '1-10' ? 10 : 5}
                        guidance={criterion.ratingGuidance}
                      />
                    </div>
                    
                    {criterion.allowNotes && rating && (
                      <div className="criterion-notes">
                        <textarea
                          placeholder="Add notes for this criterion..."
                          value={rating.notes || ''}
                          onChange={(e) => handleCriterionNotesChange(criterion.id, e.target.value)}
                          rows={2}
                        />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </Card>
        ))}
      </div>

      {/* Recommendation Section */}
      <Card className="recommendation-section">
        <h3 className="section-title">Recommendation *</h3>
        <div className="recommendation-options">
          {(['progress', 'hold', 'reject'] as FeedbackRecommendation[]).map(rec => (
            <button
              key={rec}
              type="button"
              className={`recommendation-option ${formState.recommendation === rec ? 'selected' : ''}`}
              style={{ 
                '--rec-color': RECOMMENDATION_COLORS[rec],
                borderColor: formState.recommendation === rec ? RECOMMENDATION_COLORS[rec] : undefined,
                backgroundColor: formState.recommendation === rec ? `${RECOMMENDATION_COLORS[rec]}15` : undefined,
              } as React.CSSProperties}
              onClick={() => handleRecommendationChange(rec)}
            >
              <span className="rec-icon">
                {rec === 'progress' && '✓'}
                {rec === 'hold' && '⏸'}
                {rec === 'reject' && '✗'}
              </span>
              <span className="rec-label">{RECOMMENDATION_LABELS[rec]}</span>
            </button>
          ))}
        </div>
        
        {formState.recommendation && (
          <div className="next-step-select">
            <label>Suggested Next Step</label>
            <select
              value={formState.suggestedNextStep || ''}
              onChange={(e) => handleFieldChange('suggestedNextStep', e.target.value || null)}
            >
              <option value="">Select next step...</option>
              {NEXT_STEPS.map(step => (
                <option key={step.value} value={step.value}>{step.label}</option>
              ))}
            </select>
          </div>
        )}
      </Card>

      {/* Qualitative Feedback Section */}
      <Card className="qualitative-section">
        <h3 className="section-title">Qualitative Feedback</h3>
        
        <div className="feedback-field">
          <label>Key Strengths</label>
          <textarea
            placeholder="What stood out positively about this candidate?"
            value={formState.strengths}
            onChange={(e) => handleFieldChange('strengths', e.target.value)}
            rows={3}
          />
        </div>
        
        <div className="feedback-field">
          <label>Concerns / Areas for Improvement</label>
          <textarea
            placeholder="Any concerns or areas that need development?"
            value={formState.concerns}
            onChange={(e) => handleFieldChange('concerns', e.target.value)}
            rows={3}
          />
        </div>
        
        <div className="feedback-field">
          <label>Overall Impression</label>
          <textarea
            placeholder="Summarize your overall impression of the candidate..."
            value={formState.overallImpression}
            onChange={(e) => handleFieldChange('overallImpression', e.target.value)}
            rows={3}
          />
        </div>
        
        <div className="feedback-field">
          <label>Internal Notes (not shared with candidate)</label>
          <textarea
            placeholder="Any internal notes for the recruitment team..."
            value={formState.internalNotes}
            onChange={(e) => handleFieldChange('internalNotes', e.target.value)}
            rows={2}
          />
        </div>
      </Card>

      {/* Validation Errors */}
      {!validation.isValid && validation.errors.length > 0 && (
        <div className="validation-errors">
          <h4>Please complete the following:</h4>
          <ul>
            {validation.errors.map((err, i) => (
              <li key={i}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Actions */}
      <div className="feedback-form-actions">
        <div className="actions-left">
          {lastSaved && (
            <span className="last-saved">
              Last saved: {lastSaved.toLocaleTimeString()}
            </span>
          )}
        </div>
        <div className="actions-right">
          <Button variant="secondary" onClick={onCancel} disabled={saving}>
            Cancel
          </Button>
          <Button variant="secondary" onClick={saveDraft} disabled={saving}>
            {saving ? 'Saving...' : 'Save Draft'}
          </Button>
          <Button 
            variant="primary" 
            onClick={submitFeedback} 
            disabled={saving || !validation.isValid}
          >
            {saving ? 'Submitting...' : 'Submit Feedback'}
          </Button>
        </div>
      </div>
    </div>
  )
}

export default FeedbackForm
