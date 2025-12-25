import React, { useState } from 'react';
import { REVIEW_DECISION } from '../hooks/useManagerPortal';
import './ReviewModal.css';

// Icons
const Icons = {
  X: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="18" y1="6" x2="6" y2="18"/>
      <line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  ),
  Check: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  ),
  XCircle: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10"/>
      <line x1="15" y1="9" x2="9" y2="15"/>
      <line x1="9" y1="9" x2="15" y2="15"/>
    </svg>
  ),
  HelpCircle: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10"/>
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
      <line x1="12" y1="17" x2="12.01" y2="17"/>
    </svg>
  ),
  Calendar: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
      <line x1="16" y1="2" x2="16" y2="6"/>
      <line x1="8" y1="2" x2="8" y2="6"/>
      <line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
  ),
  Briefcase: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/>
      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
    </svg>
  ),
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
    </svg>
  ),
  Loader: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="spin">
      <line x1="12" y1="2" x2="12" y2="6"/>
      <line x1="12" y1="18" x2="12" y2="22"/>
      <line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/>
      <line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/>
      <line x1="2" y1="12" x2="6" y2="12"/>
      <line x1="18" y1="12" x2="22" y2="12"/>
      <line x1="4.93" y1="19.07" x2="7.76" y2="16.24"/>
      <line x1="16.24" y1="7.76" x2="19.07" y2="4.93"/>
    </svg>
  )
};

// Decision options
const DECISIONS = [
  { 
    value: REVIEW_DECISION.APPROVE, 
    label: 'Approve', 
    icon: Icons.Check,
    color: '#22c55e',
    description: 'Approve this candidate for hire'
  },
  { 
    value: REVIEW_DECISION.REJECT, 
    label: 'Reject', 
    icon: Icons.XCircle,
    color: '#ef4444',
    description: 'Reject this candidate'
  },
  { 
    value: REVIEW_DECISION.SCHEDULE_INTERVIEW, 
    label: 'Schedule Interview', 
    icon: Icons.Calendar,
    color: '#3b82f6',
    description: 'Request interview scheduling'
  },
  { 
    value: REVIEW_DECISION.SCHEDULE_TRIAL, 
    label: 'Schedule Trial', 
    icon: Icons.Briefcase,
    color: '#8b5cf6',
    description: 'Request trial shift scheduling'
  },
  { 
    value: REVIEW_DECISION.REQUEST_INFO, 
    label: 'Request Info', 
    icon: Icons.HelpCircle,
    color: '#f59e0b',
    description: 'Request additional information'
  }
];

export default function ReviewModal({ candidate, onClose, onSubmit, submitting }) {
  const [selectedDecision, setSelectedDecision] = useState(null);
  const [notes, setNotes] = useState('');
  const [step, setStep] = useState('decision'); // 'decision' | 'notes'

  const fullName = `${candidate.firstName || ''} ${candidate.lastName || ''}`.trim();
  const initials = `${candidate.firstName?.[0] || ''}${candidate.lastName?.[0] || ''}`.toUpperCase();

  const handleDecisionSelect = (decision) => {
    setSelectedDecision(decision);
    setStep('notes');
  };

  const handleBack = () => {
    setStep('decision');
    setSelectedDecision(null);
  };

  const handleSubmit = () => {
    if (selectedDecision) {
      onSubmit(selectedDecision, notes);
    }
  };

  const selectedOption = DECISIONS.find(d => d.value === selectedDecision);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="review-modal" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <button className="close-btn" onClick={onClose}>
            <Icons.X />
          </button>
          <h2>Review Candidate</h2>
        </div>

        {/* Candidate Info */}
        <div className="candidate-summary">
          <div className="summary-avatar">
            {candidate.avatarUrl ? (
              <img src={candidate.avatarUrl} alt={fullName} />
            ) : (
              <span>{initials || '?'}</span>
            )}
          </div>
          <div className="summary-info">
            <h3>{fullName || 'Unknown'}</h3>
            <p>{candidate.appliedJobTitle || 'No job specified'}</p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="quick-contacts">
          {candidate.phone && (
            <a href={`tel:${candidate.phone}`} className="contact-btn">
              <Icons.Phone />
              <span>Call</span>
            </a>
          )}
          {candidate.email && (
            <a href={`mailto:${candidate.email}`} className="contact-btn">
              <Icons.Mail />
              <span>Email</span>
            </a>
          )}
          {candidate.cvUrl && (
            <a href={candidate.cvUrl} target="_blank" rel="noopener noreferrer" className="contact-btn">
              <Icons.FileText />
              <span>CV</span>
            </a>
          )}
        </div>

        {/* Decision Step */}
        {step === 'decision' && (
          <div className="decision-options">
            <p className="options-label">What would you like to do?</p>
            {DECISIONS.map(option => (
              <button
                key={option.value}
                className="decision-btn"
                style={{ '--decision-color': option.color }}
                onClick={() => handleDecisionSelect(option.value)}
              >
                <div className="decision-icon">
                  <option.icon />
                </div>
                <div className="decision-content">
                  <span className="decision-label">{option.label}</span>
                  <span className="decision-desc">{option.description}</span>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Notes Step */}
        {step === 'notes' && selectedOption && (
          <div className="notes-step">
            <div 
              className="selected-decision"
              style={{ '--decision-color': selectedOption.color }}
            >
              <selectedOption.icon />
              <span>{selectedOption.label}</span>
              <button className="change-btn" onClick={handleBack}>Change</button>
            </div>

            <div className="notes-field">
              <label>Add notes (optional)</label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Enter any notes or feedback..."
                rows={4}
              />
            </div>

            <button
              className="submit-btn"
              style={{ '--btn-color': selectedOption.color }}
              onClick={handleSubmit}
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <Icons.Loader />
                  <span>Submitting...</span>
                </>
              ) : (
                <>
                  <Icons.Check />
                  <span>Submit Review</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
