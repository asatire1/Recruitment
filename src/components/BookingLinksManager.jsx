import React, { useState } from 'react';
import {
  useBookingLinks,
  useBookingLinkActions,
  getBookingUrl,
  SLOT_DURATIONS,
  DAYS_OF_WEEK,
  DEFAULT_WORKING_HOURS
} from '../hooks/useBooking';
import { EVENT_TYPES, EVENT_TYPE_CONFIG } from '../hooks/useCalendar';
import ConfirmModal from './ConfirmModal';
import './BookingLinksManager.css';

// Icons
const Icons = {
  Plus: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="12" y1="5" x2="12" y2="19"/>
      <line x1="5" y1="12" x2="19" y2="12"/>
    </svg>
  ),
  Link: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
    </svg>
  ),
  Copy: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
    </svg>
  ),
  ExternalLink: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
      <polyline points="15 3 21 3 21 9"/>
      <line x1="10" y1="14" x2="21" y2="3"/>
    </svg>
  ),
  Edit: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
    </svg>
  ),
  Trash: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="3 6 5 6 21 6"/>
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
    </svg>
  ),
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
  Clock: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10"/>
      <polyline points="12 6 12 12 16 14"/>
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
  ToggleOn: () => (
    <svg viewBox="0 0 24 24" fill="currentColor">
      <rect x="1" y="5" width="22" height="14" rx="7" fill="currentColor"/>
      <circle cx="17" cy="12" r="5" fill="white"/>
    </svg>
  ),
  ToggleOff: () => (
    <svg viewBox="0 0 24 24" fill="currentColor">
      <rect x="1" y="5" width="22" height="14" rx="7" fill="#d1d5db"/>
      <circle cx="7" cy="12" r="5" fill="white"/>
    </svg>
  )
};

// Booking Link Card
function BookingLinkCard({ link, onEdit, onToggle, onDelete, onCopyUrl }) {
  const eventConfig = EVENT_TYPE_CONFIG[link.eventType] || EVENT_TYPE_CONFIG.interview;
  const bookingUrl = getBookingUrl(link.slug);
  
  return (
    <div className={`booking-link-card ${!link.active ? 'inactive' : ''}`}>
      <div className="link-card-header">
        <div 
          className="link-icon"
          style={{ background: eventConfig.bgColor, color: eventConfig.color }}
        >
          <span>{eventConfig.icon}</span>
        </div>
        <div className="link-info">
          <h3>{link.title}</h3>
          <span className="link-type">{eventConfig.label} • {link.duration} min</span>
        </div>
        <button 
          className={`toggle-btn ${link.active ? 'active' : ''}`}
          onClick={() => onToggle(link.id, !link.active)}
          title={link.active ? 'Deactivate' : 'Activate'}
        >
          {link.active ? <Icons.ToggleOn /> : <Icons.ToggleOff />}
        </button>
      </div>

      <div className="link-url-row">
        <input 
          type="text" 
          value={bookingUrl} 
          readOnly 
          className="link-url-input"
        />
        <button 
          className="btn btn-icon" 
          onClick={() => onCopyUrl(bookingUrl)}
          title="Copy URL"
        >
          <Icons.Copy />
        </button>
        <a 
          href={bookingUrl} 
          target="_blank" 
          rel="noopener noreferrer"
          className="btn btn-icon"
          title="Open in new tab"
        >
          <Icons.ExternalLink />
        </a>
      </div>

      <div className="link-meta">
        <span>
          <Icons.Calendar />
          {link.bookingCount || 0} bookings
        </span>
        <span>
          <Icons.Clock />
          {link.workingHours?.start || DEFAULT_WORKING_HOURS.start} - {link.workingHours?.end || DEFAULT_WORKING_HOURS.end}
        </span>
      </div>

      <div className="link-card-actions">
        <button className="btn btn-secondary btn-sm" onClick={() => onEdit(link)}>
          <Icons.Edit />
          Edit
        </button>
        <button className="btn btn-danger-outline btn-sm" onClick={() => onDelete(link)}>
          <Icons.Trash />
          Delete
        </button>
      </div>
    </div>
  );
}

// Booking Link Editor Modal
function BookingLinkEditor({ isOpen, onClose, link = null }) {
  const { createBookingLink, updateBookingLink, loading, error } = useBookingLinkActions();
  const isEditing = !!link;

  const [formData, setFormData] = useState({
    title: link?.title || '',
    description: link?.description || '',
    eventType: link?.eventType || EVENT_TYPES.INTERVIEW,
    duration: link?.duration || 60,
    recruiterName: link?.recruiterName || '',
    branchName: link?.branchName || '',
    availableDays: link?.availableDays || [1, 2, 3, 4, 5],
    workingHours: link?.workingHours || { ...DEFAULT_WORKING_HOURS },
    bufferTime: link?.bufferTime || 0
  });

  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  const handleDayToggle = (day) => {
    setFormData(prev => ({
      ...prev,
      availableDays: prev.availableDays.includes(day)
        ? prev.availableDays.filter(d => d !== day)
        : [...prev.availableDays, day].sort()
    }));
  };

  const handleWorkingHoursChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      workingHours: { ...prev.workingHours, [field]: value }
    }));
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.title.trim()) newErrors.title = 'Title is required';
    if (!formData.recruiterName.trim()) newErrors.recruiterName = 'Recruiter name is required';
    if (formData.availableDays.length === 0) newErrors.availableDays = 'Select at least one day';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      if (isEditing) {
        await updateBookingLink(link.id, formData);
      } else {
        await createBookingLink(formData);
      }
      onClose();
    } catch (err) {
      console.error('Error saving booking link:', err);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="booking-editor-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-header-left">
            <div className="modal-icon">
              <Icons.Link />
            </div>
            <div>
              <h2>{isEditing ? 'Edit Booking Link' : 'Create Booking Link'}</h2>
              <p>Allow candidates to book appointments</p>
            </div>
          </div>
          <button className="modal-close" onClick={onClose}>
            <Icons.X />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && <div className="form-error-banner">{error}</div>}

            <div className="form-group">
              <label className="form-label">Link Title *</label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                placeholder="e.g. Pharmacist Interview Booking"
                className={`form-input ${errors.title ? 'error' : ''}`}
              />
              {errors.title && <span className="form-error">{errors.title}</span>}
            </div>

            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Brief description of the booking..."
                className="form-textarea"
                rows={2}
              />
            </div>

            <div className="form-row two-col">
              <div className="form-group">
                <label className="form-label">Event Type</label>
                <select
                  name="eventType"
                  value={formData.eventType}
                  onChange={handleChange}
                  className="form-select"
                >
                  {Object.entries(EVENT_TYPE_CONFIG).map(([type, config]) => (
                    <option key={type} value={type}>
                      {config.icon} {config.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Duration</label>
                <select
                  name="duration"
                  value={formData.duration}
                  onChange={handleChange}
                  className="form-select"
                >
                  {SLOT_DURATIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-row two-col">
              <div className="form-group">
                <label className="form-label">Recruiter Name *</label>
                <input
                  type="text"
                  name="recruiterName"
                  value={formData.recruiterName}
                  onChange={handleChange}
                  placeholder="Your name"
                  className={`form-input ${errors.recruiterName ? 'error' : ''}`}
                />
                {errors.recruiterName && <span className="form-error">{errors.recruiterName}</span>}
              </div>

              <div className="form-group">
                <label className="form-label">Branch / Location</label>
                <input
                  type="text"
                  name="branchName"
                  value={formData.branchName}
                  onChange={handleChange}
                  placeholder="e.g. Manchester Central"
                  className="form-input"
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Available Days *</label>
              <div className="days-selector">
                {DAYS_OF_WEEK.map(day => (
                  <button
                    key={day.value}
                    type="button"
                    className={`day-btn ${formData.availableDays.includes(day.value) ? 'selected' : ''}`}
                    onClick={() => handleDayToggle(day.value)}
                  >
                    {day.short}
                  </button>
                ))}
              </div>
              {errors.availableDays && <span className="form-error">{errors.availableDays}</span>}
            </div>

            <div className="form-row two-col">
              <div className="form-group">
                <label className="form-label">Working Hours Start</label>
                <input
                  type="time"
                  value={formData.workingHours.start}
                  onChange={(e) => handleWorkingHoursChange('start', e.target.value)}
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Working Hours End</label>
                <input
                  type="time"
                  value={formData.workingHours.end}
                  onChange={(e) => handleWorkingHoursChange('end', e.target.value)}
                  className="form-input"
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Buffer Time (minutes between bookings)</label>
              <select
                name="bufferTime"
                value={formData.bufferTime}
                onChange={handleChange}
                className="form-select"
              >
                <option value={0}>No buffer</option>
                <option value={5}>5 minutes</option>
                <option value={10}>10 minutes</option>
                <option value={15}>15 minutes</option>
                <option value={30}>30 minutes</option>
              </select>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Saving...' : (
                <>
                  <Icons.Check />
                  {isEditing ? 'Save Changes' : 'Create Link'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Main BookingLinksManager Component
export default function BookingLinksManager() {
  const { links, loading, error } = useBookingLinks({ active: null });
  const { toggleBookingLink, deleteBookingLink, loading: actionLoading } = useBookingLinkActions();
  
  const [showEditor, setShowEditor] = useState(false);
  const [editingLink, setEditingLink] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [copiedUrl, setCopiedUrl] = useState(null);

  const handleCreate = () => {
    setEditingLink(null);
    setShowEditor(true);
  };

  const handleEdit = (link) => {
    setEditingLink(link);
    setShowEditor(true);
  };

  const handleCloseEditor = () => {
    setShowEditor(false);
    setEditingLink(null);
  };

  const handleToggle = async (linkId, active) => {
    try {
      await toggleBookingLink(linkId, active);
    } catch (err) {
      console.error('Error toggling link:', err);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    try {
      await deleteBookingLink(deleteConfirm.id);
      setDeleteConfirm(null);
    } catch (err) {
      console.error('Error deleting link:', err);
    }
  };

  const handleCopyUrl = async (url) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedUrl(url);
      setTimeout(() => setCopiedUrl(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  if (loading) {
    return (
      <div className="booking-links-loading">
        <div className="spinner" />
        <p>Loading booking links...</p>
      </div>
    );
  }

  return (
    <div className="booking-links-manager">
      <div className="manager-header">
        <div>
          <h2>Booking Links</h2>
          <p>Create shareable links for candidates to book appointments</p>
        </div>
        <button className="btn btn-primary" onClick={handleCreate}>
          <Icons.Plus />
          Create Link
        </button>
      </div>

      {error ? (
        <div className="error-state">Error loading booking links: {error}</div>
      ) : links.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">
            <Icons.Link />
          </div>
          <h3>No booking links yet</h3>
          <p>Create your first booking link to let candidates schedule appointments.</p>
          <button className="btn btn-primary" onClick={handleCreate}>
            <Icons.Plus />
            Create Booking Link
          </button>
        </div>
      ) : (
        <div className="booking-links-grid">
          {links.map(link => (
            <BookingLinkCard
              key={link.id}
              link={link}
              onEdit={handleEdit}
              onToggle={handleToggle}
              onDelete={setDeleteConfirm}
              onCopyUrl={handleCopyUrl}
            />
          ))}
        </div>
      )}

      {/* Toast for copy confirmation */}
      {copiedUrl && (
        <div className="copy-toast">
          <Icons.Check />
          Link copied to clipboard!
        </div>
      )}

      {/* Editor Modal */}
      <BookingLinkEditor
        isOpen={showEditor}
        onClose={handleCloseEditor}
        link={editingLink}
      />

      {/* Delete Confirmation */}
      <ConfirmModal
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={handleDelete}
        title="Delete Booking Link?"
        message={`Are you sure you want to delete "${deleteConfirm?.title}"? Existing bookings won't be affected.`}
        confirmLabel="Delete"
        variant="danger"
        loading={actionLoading}
      />
    </div>
  );
}
