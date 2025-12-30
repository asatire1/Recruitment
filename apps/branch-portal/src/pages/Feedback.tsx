import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { PendingFeedbackList } from '../components/PendingFeedbackList'
import { FeedbackForm } from '../components/FeedbackForm'
import { FeedbackHistory } from '../components/FeedbackHistory'
import { FeedbackSuccessModal } from '../components/FeedbackSuccessModal'
import { useFeedbackSubmit, usePendingFeedback } from '../hooks/useFeedback'
import type { PendingFeedbackItem, FeedbackFormData } from '../hooks/useFeedback'

type FeedbackView = 'pending' | 'history'

export function Feedback() {
  const navigate = useNavigate()
  const { id: paramId } = useParams<{ id?: string }>()
  
  const [activeView, setActiveView] = useState<FeedbackView>('pending')
  const [selectedItem, setSelectedItem] = useState<PendingFeedbackItem | null>(null)
  const [showSuccess, setShowSuccess] = useState(false)
  const [submittedCandidateName, setSubmittedCandidateName] = useState('')
  
  const { submitFeedback, submitting, error, clearError } = useFeedbackSubmit()
  const { pending } = usePendingFeedback()

  // If we have an ID param, find and select that item
  useState(() => {
    if (paramId && pending.length > 0) {
      const item = pending.find(p => p.id === paramId)
      if (item) {
        setSelectedItem(item)
      }
    }
  })

  const handleSelectItem = (item: PendingFeedbackItem) => {
    clearError()
    setSelectedItem(item)
    // Update URL without triggering navigation
    window.history.pushState({}, '', `/feedback/${item.id}`)
  }

  const handleCancelForm = () => {
    setSelectedItem(null)
    clearError()
    window.history.pushState({}, '', '/feedback')
  }

  const handleSubmitFeedback = async (formData: FeedbackFormData) => {
    if (!selectedItem) return

    const success = await submitFeedback(selectedItem.id, formData)
    
    if (success) {
      setSubmittedCandidateName(selectedItem.candidateName)
      setSelectedItem(null)
      setShowSuccess(true)
      window.history.pushState({}, '', '/feedback')
    }
  }

  const handleCloseSuccess = () => {
    setShowSuccess(false)
    setSubmittedCandidateName('')
  }

  // Show feedback form if an item is selected
  if (selectedItem) {
    return (
      <div className="page feedback-page feedback-page--form">
        <FeedbackForm
          candidateName={selectedItem.candidateName}
          jobTitle={selectedItem.jobTitle}
          trialDate={selectedItem.scheduledAt}
          onSubmit={handleSubmitFeedback}
          onCancel={handleCancelForm}
          submitting={submitting}
          error={error}
        />
      </div>
    )
  }

  // Pending count for badge
  const pendingCount = pending.length
  const overdueCount = pending.filter(p => p.isOverdue).length

  return (
    <div className="page feedback-page">
      <header className="page-header">
        <h1>Feedback</h1>
      </header>

      {/* View Toggle */}
      <div className="view-toggle-container">
        <div className="view-toggle">
          <button 
            className={`toggle-btn ${activeView === 'pending' ? 'active' : ''}`}
            onClick={() => setActiveView('pending')}
          >
            Pending
            {pendingCount > 0 && (
              <span className={`toggle-badge ${overdueCount > 0 ? 'overdue' : ''}`}>
                {pendingCount}
              </span>
            )}
          </button>
          <button 
            className={`toggle-btn ${activeView === 'history' ? 'active' : ''}`}
            onClick={() => setActiveView('history')}
          >
            History
          </button>
        </div>
      </div>

      {/* Overdue Alert */}
      {activeView === 'pending' && overdueCount > 0 && (
        <div className="overdue-alert">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          <span>
            <strong>{overdueCount}</strong> trial{overdueCount !== 1 ? 's' : ''} overdue for feedback
          </span>
        </div>
      )}

      {/* Content */}
      <div className="feedback-content">
        {activeView === 'pending' ? (
          <PendingFeedbackList onSelectItem={handleSelectItem} />
        ) : (
          <FeedbackHistory />
        )}
      </div>

      {/* Success Modal */}
      {showSuccess && (
        <FeedbackSuccessModal 
          candidateName={submittedCandidateName}
          onClose={handleCloseSuccess}
        />
      )}
    </div>
  )
}
