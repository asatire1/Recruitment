import React, { useState } from 'react';
import './EventActionModal.css';

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
  CheckCircle: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
      <polyline points="22 4 12 14.01 9 11.01"/>
    </svg>
  ),
  XCircle: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10"/>
      <line x1="15" y1="9" x2="9" y2="15"/>
      <line x1="9" y1="9" x2="15" y2="15"/>
    </svg>
  ),
  UserX: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
      <circle cx="8.5" cy="7" r="4"/>
      <line x1="18" y1="8" x2="23" y2="13"/>
      <line x1="23" y1="8" x2="18" y2="13"/>
    </svg>
  ),
  Clock: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10"/>
      <polyline points="12 6 12 12 16 14"/>
    </svg>
  ),
  User: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
      <circle cx="12" cy="7" r="4"/>
    </svg>
  ),
  Phone: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
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

// Event type colors
const TYPE_COLORS = {
  interview: '#3b82f6',
  trial: '#10b981',
  meeting: '#8b5cf6',
  reminder: '#f59e0b',
  other: '#6b7280'
};

// Format time
function formatTime(date) {
  if (!date) return '--:--';
  const d = date instanceof Date ? date : new Date(date);
  return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

// Format date
function formatDate(date) {
  if (!date) return '';
  const d = date instanceof Date ? date : new Date(date);
  return d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
}

// Action buttons config
const ACTIONS = [
  {
    key: 'confirm',
    label: 'Confirm',
    icon: Icons.Check,
    color: '#3b82f6',
    showWhen: (status) => status === 'scheduled'
  },
  {
    key: 'complete',
    label: 'Complete',
    icon: Icons.CheckCircle,
    color: '#22c55e',
    showWhen: (status) => status === 'confirmed' || status === 'scheduled',
    needsNotes: true
  },
  {
    key: 'no_show',
    label: 'No Show',
    icon: Icons.UserX,
    color: '#f97316',
    showWhen: (status) => status === 'confirmed' || status === 'scheduled',
    needsNotes: true
  },
  {
    key: 'cancel',
    label: 'Cancel',
    icon: Icons.XCircle,
    color: '#ef4444',
    showWhen: (status) => status !== 'completed' && status !== 'cancelled',
    needsNotes: true
  }
];

export default function EventActionModal({ event, onClose, onAction, submitting }) {
  const [selectedAction, setSelectedAction] = useState(null);
  const [notes, setNotes] = useState('');

  const typeColor = TYPE_COLORS[event.type] || TYPE_COLORS.other;
  const availableActions = ACTIONS.filter(a => a.showWhen(event.status));

  const handleActionSelect = (action) => {
    if (action.needsNotes) {
      setSelectedAction(action);
    } else {
      onAction(action.key, '');
    }
  };

  const handleSubmit = () => {
    if (selectedAction) {
      onAction(selectedAction.key, notes);
    }
  };

  const handleBack = () => {
    setSelectedAction(null);
    setNotes('');
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="event-action-modal" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <button className="close-btn" onClick={onClose}>
            <Icons.X />
          </button>
          <h2>Event Details</h2>
        </div>

        {/* Event Info */}
        <div className="event-info" style={{ '--type-color': typeColor }}>
          <span className="event-type-badge">{event.type}</span>
          <h3 className="event-title">{event.title}</h3>
          
          <div className="event-meta">
            <div className="meta-row">
              <Icons.Clock />
              <span>{formatTime(event.startTime)} - {formatTime(event.endTime)}</span>
            </div>
            <div className="meta-row date">
              {formatDate(event.startTime)}
            </div>
          </div>

          {event.candidateName && (
            <div className="candidate-info">
              <div className="candidate-row">
                <Icons.User />
                <span>{event.candidateName}</span>
              </div>
              {event.candidatePhone && (
                <a href={`tel:${event.candidatePhone}`} className="call-btn">
                  <Icons.Phone />
                  Call
                </a>
              )}
            </div>
          )}

          {event.notes && (
            <div className="event-notes">
              <strong>Notes:</strong> {event.notes}
            </div>
          )}

          <div className={`status-indicator ${event.status}`}>
            Status: <strong>{event.status}</strong>
          </div>
        </div>

        {/* Actions */}
        {!selectedAction && availableActions.length > 0 && (
          <div className="action-buttons">
            {availableActions.map(action => (
              <button
                key={action.key}
                className="action-btn"
                style={{ '--action-color': action.color }}
                onClick={() => handleActionSelect(action)}
                disabled={submitting}
              >
                <action.icon />
                <span>{action.label}</span>
              </button>
            ))}
          </div>
        )}

        {/* Notes Input */}
        {selectedAction && (
          <div className="notes-section">
            <div 
              className="selected-action"
              style={{ '--action-color': selectedAction.color }}
            >
              <selectedAction.icon />
              <span>{selectedAction.label}</span>
              <button className="change-btn" onClick={handleBack}>Change</button>
            </div>

            <div className="notes-field">
              <label>
                {selectedAction.key === 'complete' && 'Completion notes'}
                {selectedAction.key === 'no_show' && 'No show notes'}
                {selectedAction.key === 'cancel' && 'Cancellation reason'}
              </label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Add notes..."
                rows={3}
              />
            </div>

            <button
              className="submit-btn"
              style={{ '--btn-color': selectedAction.color }}
              onClick={handleSubmit}
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <Icons.Loader />
                  <span>Updating...</span>
                </>
              ) : (
                <>
                  <Icons.Check />
                  <span>Confirm {selectedAction.label}</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
