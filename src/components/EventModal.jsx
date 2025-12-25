import React, { useState, useEffect } from 'react';
import {
  useCalendarActions,
  EVENT_TYPES,
  EVENT_TYPE_CONFIG,
  EVENT_STATUSES,
  EVENT_STATUS_CONFIG
} from '../hooks/useCalendar';
import './EventModal.css';

// Icons
const Icons = {
  X: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="18" y1="6" x2="6" y2="18"/>
      <line x1="6" y1="6" x2="18" y2="18"/>
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
  MapPin: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
      <circle cx="12" cy="10" r="3"/>
    </svg>
  ),
  Trash: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="3 6 5 6 21 6"/>
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
    </svg>
  ),
  Check: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  )
};

// Duration options in minutes
const DURATION_OPTIONS = [
  { value: 15, label: '15 min' },
  { value: 30, label: '30 min' },
  { value: 45, label: '45 min' },
  { value: 60, label: '1 hour' },
  { value: 90, label: '1.5 hours' },
  { value: 120, label: '2 hours' },
  { value: 180, label: '3 hours' },
  { value: 240, label: '4 hours' }
];

// Helper: Format date for input
function formatDateForInput(date) {
  if (!date) return '';
  const d = new Date(date);
  return d.toISOString().split('T')[0];
}

// Helper: Format time for input
function formatTimeForInput(date) {
  if (!date) return '';
  const d = new Date(date);
  return d.toTimeString().slice(0, 5);
}

// Helper: Combine date and time
function combineDateAndTime(dateStr, timeStr) {
  const [year, month, day] = dateStr.split('-').map(Number);
  const [hours, minutes] = timeStr.split(':').map(Number);
  return new Date(year, month - 1, day, hours, minutes);
}

export default function EventModal({ 
  isOpen, 
  onClose, 
  event = null, 
  defaultDate = null,
  onDelete 
}) {
  const { createEvent, updateEvent, updateEventStatus, loading, error } = useCalendarActions();
  
  const isEditing = !!event;
  
  const [formData, setFormData] = useState({
    type: EVENT_TYPES.INTERVIEW,
    title: '',
    date: '',
    startTime: '09:00',
    duration: 60,
    candidateName: '',
    candidateEmail: '',
    candidatePhone: '',
    branchId: '',
    branchName: '',
    notes: '',
    status: EVENT_STATUSES.SCHEDULED
  });
  
  const [errors, setErrors] = useState({});

  // Initialize form data
  useEffect(() => {
    if (event) {
      setFormData({
        type: event.type || EVENT_TYPES.INTERVIEW,
        title: event.title || '',
        date: formatDateForInput(event.startTime),
        startTime: formatTimeForInput(event.startTime),
        duration: event.endTime && event.startTime 
          ? Math.round((event.endTime - event.startTime) / (1000 * 60))
          : 60,
        candidateName: event.candidateName || '',
        candidateEmail: event.candidateEmail || '',
        candidatePhone: event.candidatePhone || '',
        branchId: event.branchId || '',
        branchName: event.branchName || '',
        notes: event.notes || '',
        status: event.status || EVENT_STATUSES.SCHEDULED
      });
    } else if (defaultDate) {
      setFormData(prev => ({
        ...prev,
        date: formatDateForInput(defaultDate),
        startTime: formatTimeForInput(defaultDate) || '09:00'
      }));
    }
  }, [event, defaultDate]);

  // Handle form change
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear error when field changes
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }

    // Auto-generate title for certain event types
    if (name === 'type' || name === 'candidateName') {
      const type = name === 'type' ? value : formData.type;
      const candidate = name === 'candidateName' ? value : formData.candidateName;
      
      if (candidate && !formData.title) {
        const config = EVENT_TYPE_CONFIG[type];
        setFormData(prev => ({
          ...prev,
          title: `${config?.label || 'Event'} - ${candidate}`
        }));
      }
    }
  };

  // Validate form
  const validate = () => {
    const newErrors = {};
    
    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }
    
    if (!formData.date) {
      newErrors.date = 'Date is required';
    }
    
    if (!formData.startTime) {
      newErrors.startTime = 'Start time is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validate()) return;

    try {
      const startDateTime = combineDateAndTime(formData.date, formData.startTime);
      const endDateTime = new Date(startDateTime);
      endDateTime.setMinutes(endDateTime.getMinutes() + parseInt(formData.duration));

      const eventData = {
        type: formData.type,
        title: formData.title,
        startTime: startDateTime,
        endTime: endDateTime,
        candidateName: formData.candidateName || null,
        candidateEmail: formData.candidateEmail || null,
        candidatePhone: formData.candidatePhone || null,
        branchId: formData.branchId || null,
        branchName: formData.branchName || null,
        notes: formData.notes || '',
        status: formData.status
      };

      if (isEditing) {
        await updateEvent(event.id, eventData);
      } else {
        await createEvent(eventData);
      }

      onClose();
    } catch (err) {
      console.error('Error saving event:', err);
    }
  };

  // Handle status change
  const handleStatusChange = async (newStatus) => {
    if (!isEditing) return;
    
    try {
      await updateEventStatus(event.id, newStatus);
      setFormData(prev => ({ ...prev, status: newStatus }));
    } catch (err) {
      console.error('Error updating status:', err);
    }
  };

  if (!isOpen) return null;

  const eventConfig = EVENT_TYPE_CONFIG[formData.type];

  return (
    <div className="event-modal-overlay" onClick={onClose}>
      <div className="event-modal" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="event-modal-header">
          <div className="event-modal-header-left">
            <div 
              className="event-icon"
              style={{ background: eventConfig?.bgColor, color: eventConfig?.color }}
            >
              <span>{eventConfig?.icon}</span>
            </div>
            <div>
              <h2>{isEditing ? 'Edit Event' : 'New Event'}</h2>
              <p>{isEditing ? 'Update event details' : 'Schedule a new event'}</p>
            </div>
          </div>
          <button className="modal-close" onClick={onClose}>
            <Icons.X />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="event-modal-body">
            {error && (
              <div className="form-error-banner">{error}</div>
            )}

            {/* Event Type */}
            <div className="form-group">
              <label className="form-label">Event Type</label>
              <div className="event-type-selector">
                {Object.entries(EVENT_TYPE_CONFIG).map(([type, config]) => (
                  <button
                    key={type}
                    type="button"
                    className={`type-option ${formData.type === type ? 'selected' : ''}`}
                    onClick={() => handleChange({ target: { name: 'type', value: type }})}
                    style={{ '--type-color': config.color }}
                  >
                    <span className="type-icon">{config.icon}</span>
                    <span className="type-label">{config.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Title */}
            <div className="form-group">
              <label className="form-label">Title *</label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                placeholder="e.g. Interview with John Smith"
                className={`form-input ${errors.title ? 'error' : ''}`}
              />
              {errors.title && <span className="form-error">{errors.title}</span>}
            </div>

            {/* Date & Time Row */}
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Date *</label>
                <div className="input-with-icon">
                  <Icons.Calendar />
                  <input
                    type="date"
                    name="date"
                    value={formData.date}
                    onChange={handleChange}
                    className={`form-input ${errors.date ? 'error' : ''}`}
                  />
                </div>
                {errors.date && <span className="form-error">{errors.date}</span>}
              </div>

              <div className="form-group">
                <label className="form-label">Start Time *</label>
                <div className="input-with-icon">
                  <Icons.Clock />
                  <input
                    type="time"
                    name="startTime"
                    value={formData.startTime}
                    onChange={handleChange}
                    className={`form-input ${errors.startTime ? 'error' : ''}`}
                  />
                </div>
                {errors.startTime && <span className="form-error">{errors.startTime}</span>}
              </div>

              <div className="form-group">
                <label className="form-label">Duration</label>
                <select
                  name="duration"
                  value={formData.duration}
                  onChange={handleChange}
                  className="form-select"
                >
                  {DURATION_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Candidate Details */}
            <div className="form-section">
              <h3 className="form-section-title">
                <Icons.User />
                Candidate Details
              </h3>
              
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Name</label>
                  <input
                    type="text"
                    name="candidateName"
                    value={formData.candidateName}
                    onChange={handleChange}
                    placeholder="John Smith"
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Email</label>
                  <input
                    type="email"
                    name="candidateEmail"
                    value={formData.candidateEmail}
                    onChange={handleChange}
                    placeholder="john@example.com"
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Phone</label>
                  <input
                    type="tel"
                    name="candidatePhone"
                    value={formData.candidatePhone}
                    onChange={handleChange}
                    placeholder="07123 456789"
                    className="form-input"
                  />
                </div>
              </div>
            </div>

            {/* Location */}
            <div className="form-group">
              <label className="form-label">
                <Icons.MapPin />
                Branch / Location
              </label>
              <input
                type="text"
                name="branchName"
                value={formData.branchName}
                onChange={handleChange}
                placeholder="e.g. Manchester Central"
                className="form-input"
              />
            </div>

            {/* Notes */}
            <div className="form-group">
              <label className="form-label">Notes</label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                placeholder="Any additional details..."
                className="form-textarea"
                rows={3}
              />
            </div>

            {/* Status (for editing) */}
            {isEditing && (
              <div className="form-group">
                <label className="form-label">Status</label>
                <div className="status-selector">
                  {Object.entries(EVENT_STATUS_CONFIG).map(([status, config]) => (
                    <button
                      key={status}
                      type="button"
                      className={`status-option ${formData.status === status ? 'selected' : ''}`}
                      onClick={() => handleStatusChange(status)}
                      style={{ '--status-color': config.color }}
                    >
                      {config.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="event-modal-footer">
            {isEditing && onDelete && (
              <button 
                type="button" 
                className="btn btn-danger-outline"
                onClick={onDelete}
              >
                <Icons.Trash />
                Delete
              </button>
            )}
            
            <div className="footer-right">
              <button 
                type="button" 
                className="btn btn-secondary"
                onClick={onClose}
              >
                Cancel
              </button>
              <button 
                type="submit"
                className="btn btn-primary"
                disabled={loading}
              >
                {loading ? 'Saving...' : (
                  <>
                    <Icons.Check />
                    {isEditing ? 'Save Changes' : 'Create Event'}
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
