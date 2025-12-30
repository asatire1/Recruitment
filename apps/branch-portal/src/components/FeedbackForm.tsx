import { useState } from 'react'
import { StarRating } from './StarRating'
import { 
  RATING_CATEGORIES, 
  RECOMMENDATION_OPTIONS,
  FeedbackFormData,
  FeedbackRatings,
  getInitialFormData,
  getRatingLabel,
} from '../hooks/useFeedback'
import type { FeedbackRecommendation } from '@allied/shared-lib'

interface FeedbackFormProps {
  candidateName: string
  jobTitle?: string
  trialDate: Date
  onSubmit: (data: FeedbackFormData) => void
  onCancel: () => void
  submitting?: boolean
  error?: string | null
}

export function FeedbackForm({
  candidateName,
  jobTitle,
  trialDate,
  onSubmit,
  onCancel,
  submitting = false,
  error,
}: FeedbackFormProps) {
  const [formData, setFormData] = useState<FeedbackFormData>(getInitialFormData())
  const [validationErrors, setValidationErrors] = useState<string[]>([])

  const handleRatingChange = (category: keyof FeedbackRatings, value: number) => {
    setFormData(prev => ({
      ...prev,
      ratings: {
        ...prev.ratings,
        [category]: value,
      },
    }))
    // Clear validation errors when user makes changes
    if (validationErrors.length > 0) {
      setValidationErrors([])
    }
  }

  const handleRecommendationChange = (value: FeedbackRecommendation) => {
    setFormData(prev => ({
      ...prev,
      recommendation: value,
    }))
    if (validationErrors.length > 0) {
      setValidationErrors([])
    }
  }

  const handleTextChange = (field: 'strengths' | 'areasForImprovement' | 'additionalComments', value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }))
  }

  const validateForm = (): boolean => {
    const errors: string[] = []

    // Check all ratings are provided
    const missingRatings = RATING_CATEGORIES.filter(
      cat => formData.ratings[cat.key] === 0
    ).map(cat => cat.label)

    if (missingRatings.length > 0) {
      errors.push(`Please rate: ${missingRatings.join(', ')}`)
    }

    // Check recommendation is selected
    if (!formData.recommendation) {
      errors.push('Please select a recommendation')
    }

    setValidationErrors(errors)
    return errors.length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (validateForm()) {
      onSubmit(formData)
    }
  }

  // Calculate overall rating for preview
  const ratingValues = Object.values(formData.ratings).filter(v => v > 0)
  const overallRating = ratingValues.length > 0
    ? Math.round((ratingValues.reduce((a, b) => a + b, 0) / ratingValues.length) * 10) / 10
    : 0

  return (
    <form className="feedback-form" onSubmit={handleSubmit}>
      {/* Header */}
      <div className="feedback-form__header">
        <h2>Trial Feedback</h2>
        <div className="candidate-info">
          <span className="candidate-name">{candidateName}</span>
          {jobTitle && <span className="job-title">{jobTitle}</span>}
          <span className="trial-date">
            Trial: {trialDate.toLocaleDateString('en-GB', { 
              weekday: 'short', 
              day: 'numeric', 
              month: 'short' 
            })}
          </span>
        </div>
      </div>

      {/* Validation Errors */}
      {validationErrors.length > 0 && (
        <div className="feedback-form__errors">
          {validationErrors.map((err, i) => (
            <div key={i} className="error-item">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              {err}
            </div>
          ))}
        </div>
      )}

      {/* API Error */}
      {error && (
        <div className="feedback-form__errors">
          <div className="error-item">{error}</div>
        </div>
      )}

      {/* Rating Categories */}
      <section className="feedback-form__section">
        <h3>Performance Ratings</h3>
        <p className="section-description">Rate the candidate's performance in each area (1-5 stars)</p>
        
        <div className="rating-categories">
          {RATING_CATEGORIES.map(category => (
            <div key={category.key} className="rating-category">
              <div className="rating-category__label">
                <span className="category-name">{category.label}</span>
                <span className="category-description">{category.description}</span>
              </div>
              <div className="rating-category__input">
                <StarRating
                  value={formData.ratings[category.key]}
                  onChange={(value) => handleRatingChange(category.key, value)}
                  disabled={submitting}
                />
                <span className="rating-value">
                  {formData.ratings[category.key] > 0 
                    ? getRatingLabel(formData.ratings[category.key])
                    : ''}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Overall Rating Preview */}
        {overallRating > 0 && (
          <div className="overall-rating">
            <span className="overall-label">Overall Rating:</span>
            <span className="overall-value">{overallRating.toFixed(1)}</span>
            <span className="overall-max">/ 5</span>
          </div>
        )}
      </section>

      {/* Recommendation */}
      <section className="feedback-form__section">
        <h3>Recommendation</h3>
        <p className="section-description">Based on the trial, what is your recommendation?</p>
        
        <div className="recommendation-options">
          {RECOMMENDATION_OPTIONS.map(option => (
            <label 
              key={option.value}
              className={`recommendation-option recommendation-option--${option.value} ${
                formData.recommendation === option.value ? 'selected' : ''
              }`}
            >
              <input
                type="radio"
                name="recommendation"
                value={option.value}
                checked={formData.recommendation === option.value}
                onChange={() => handleRecommendationChange(option.value)}
                disabled={submitting}
              />
              <span className="option-radio" />
              <span className="option-content">
                <span className="option-label">{option.label}</span>
                <span className="option-description">{option.description}</span>
              </span>
            </label>
          ))}
        </div>
      </section>

      {/* Text Comments */}
      <section className="feedback-form__section">
        <h3>Comments</h3>
        
        <div className="text-field">
          <label htmlFor="strengths">Strengths</label>
          <textarea
            id="strengths"
            value={formData.strengths}
            onChange={(e) => handleTextChange('strengths', e.target.value)}
            placeholder="What did the candidate do well?"
            rows={3}
            disabled={submitting}
          />
        </div>

        <div className="text-field">
          <label htmlFor="improvements">Areas for Improvement</label>
          <textarea
            id="improvements"
            value={formData.areasForImprovement}
            onChange={(e) => handleTextChange('areasForImprovement', e.target.value)}
            placeholder="What could the candidate improve on?"
            rows={3}
            disabled={submitting}
          />
        </div>

        <div className="text-field">
          <label htmlFor="comments">Additional Comments</label>
          <textarea
            id="comments"
            value={formData.additionalComments}
            onChange={(e) => handleTextChange('additionalComments', e.target.value)}
            placeholder="Any other observations or notes..."
            rows={3}
            disabled={submitting}
          />
        </div>
      </section>

      {/* Actions */}
      <div className="feedback-form__actions">
        <button 
          type="button" 
          className="btn btn--secondary"
          onClick={onCancel}
          disabled={submitting}
        >
          Cancel
        </button>
        <button 
          type="submit" 
          className="btn btn--primary"
          disabled={submitting}
        >
          {submitting ? (
            <>
              <span className="spinner-sm" />
              Submitting...
            </>
          ) : (
            'Submit Feedback'
          )}
        </button>
      </div>
    </form>
  )
}
