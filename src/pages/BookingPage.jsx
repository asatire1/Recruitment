import React, { useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import {
  useBookingLink,
  useAvailableSlots,
  useBookingSubmit,
  getNextAvailableDates,
  formatSlotTime,
  DAYS_OF_WEEK
} from '../hooks/useBooking';
import { EVENT_TYPE_CONFIG } from '../hooks/useCalendar';
import './BookingPage.css';

// Icons
const Icons = {
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
  MapPin: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
      <circle cx="12" cy="10" r="3"/>
    </svg>
  ),
  User: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
      <circle cx="12" cy="7" r="4"/>
    </svg>
  ),
  ChevronLeft: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="15 18 9 12 15 6"/>
    </svg>
  ),
  ChevronRight: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="9 18 15 12 9 6"/>
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
  AlertCircle: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10"/>
      <line x1="12" y1="8" x2="12" y2="12"/>
      <line x1="12" y1="16" x2="12.01" y2="16"/>
    </svg>
  )
};

// Step indicator component
function StepIndicator({ currentStep, steps }) {
  return (
    <div className="step-indicator">
      {steps.map((step, index) => (
        <React.Fragment key={step}>
          <div className={`step ${index + 1 <= currentStep ? 'active' : ''} ${index + 1 < currentStep ? 'completed' : ''}`}>
            <span className="step-number">
              {index + 1 < currentStep ? <Icons.Check /> : index + 1}
            </span>
            <span className="step-label">{step}</span>
          </div>
          {index < steps.length - 1 && <div className="step-connector" />}
        </React.Fragment>
      ))}
    </div>
  );
}

// Date picker component
function DatePicker({ availableDays, selectedDate, onSelect }) {
  const [weekOffset, setWeekOffset] = useState(0);
  
  const dates = useMemo(() => {
    const allDates = getNextAvailableDates(availableDays, 28);
    const startIdx = weekOffset * 7;
    return allDates.slice(startIdx, startIdx + 7);
  }, [availableDays, weekOffset]);

  const canGoBack = weekOffset > 0;
  const canGoForward = weekOffset < 3;

  return (
    <div className="date-picker">
      <div className="date-picker-header">
        <button 
          className="nav-btn" 
          onClick={() => setWeekOffset(w => w - 1)}
          disabled={!canGoBack}
        >
          <Icons.ChevronLeft />
        </button>
        <span className="date-range">
          {dates[0]?.toLocaleDateString('en-GB', { month: 'short', day: 'numeric' })} - {' '}
          {dates[dates.length - 1]?.toLocaleDateString('en-GB', { month: 'short', day: 'numeric' })}
        </span>
        <button 
          className="nav-btn" 
          onClick={() => setWeekOffset(w => w + 1)}
          disabled={!canGoForward}
        >
          <Icons.ChevronRight />
        </button>
      </div>
      <div className="date-grid">
        {dates.map(date => {
          const isSelected = selectedDate && 
            date.toDateString() === selectedDate.toDateString();
          
          return (
            <button
              key={date.toISOString()}
              className={`date-btn ${isSelected ? 'selected' : ''}`}
              onClick={() => onSelect(date)}
            >
              <span className="day-name">
                {DAYS_OF_WEEK.find(d => d.value === date.getDay())?.short}
              </span>
              <span className="day-number">{date.getDate()}</span>
              <span className="month-name">
                {date.toLocaleDateString('en-GB', { month: 'short' })}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// Time slot picker component
function TimeSlotPicker({ slots, selectedSlot, onSelect, loading }) {
  const availableSlots = slots.filter(s => s.available);
  
  if (loading) {
    return (
      <div className="time-slots-loading">
        <div className="spinner" />
        <p>Loading available times...</p>
      </div>
    );
  }
  
  if (availableSlots.length === 0) {
    return (
      <div className="no-slots">
        <Icons.AlertCircle />
        <p>No available slots on this date</p>
        <span>Please select a different date</span>
      </div>
    );
  }
  
  return (
    <div className="time-slots">
      <h3>Available Times</h3>
      <div className="slots-grid">
        {availableSlots.map(slot => {
          const isSelected = selectedSlot && 
            slot.startTime.getTime() === selectedSlot.startTime.getTime();
          
          return (
            <button
              key={slot.startTime.toISOString()}
              className={`slot-btn ${isSelected ? 'selected' : ''}`}
              onClick={() => onSelect(slot)}
            >
              {formatSlotTime(slot.startTime)}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// Contact form component
function ContactForm({ formData, onChange, errors }) {
  return (
    <div className="contact-form">
      <h3>Your Details</h3>
      
      <div className="form-group">
        <label className="form-label">Full Name *</label>
        <input
          type="text"
          name="name"
          value={formData.name}
          onChange={onChange}
          placeholder="John Smith"
          className={`form-input ${errors.name ? 'error' : ''}`}
        />
        {errors.name && <span className="form-error">{errors.name}</span>}
      </div>
      
      <div className="form-group">
        <label className="form-label">Email Address *</label>
        <input
          type="email"
          name="email"
          value={formData.email}
          onChange={onChange}
          placeholder="john@example.com"
          className={`form-input ${errors.email ? 'error' : ''}`}
        />
        {errors.email && <span className="form-error">{errors.email}</span>}
      </div>
      
      <div className="form-group">
        <label className="form-label">Phone Number *</label>
        <input
          type="tel"
          name="phone"
          value={formData.phone}
          onChange={onChange}
          placeholder="07123 456789"
          className={`form-input ${errors.phone ? 'error' : ''}`}
        />
        {errors.phone && <span className="form-error">{errors.phone}</span>}
      </div>
      
      <div className="form-group">
        <label className="form-label">Additional Notes (Optional)</label>
        <textarea
          name="notes"
          value={formData.notes}
          onChange={onChange}
          placeholder="Any additional information..."
          className="form-textarea"
          rows={3}
        />
      </div>
    </div>
  );
}

// Confirmation step component
function ConfirmationStep({ bookingLink, selectedDate, selectedSlot, formData }) {
  const eventConfig = EVENT_TYPE_CONFIG[bookingLink.eventType] || EVENT_TYPE_CONFIG.interview;
  
  return (
    <div className="confirmation-step">
      <h3>Confirm Your Booking</h3>
      
      <div className="confirmation-card">
        <div className="confirmation-header">
          <span className="event-icon">{eventConfig.icon}</span>
          <div>
            <h4>{bookingLink.title}</h4>
            <span className="event-type">{eventConfig.label}</span>
          </div>
        </div>
        
        <div className="confirmation-details">
          <div className="detail-row">
            <Icons.Calendar />
            <span>
              {selectedDate.toLocaleDateString('en-GB', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric'
              })}
            </span>
          </div>
          
          <div className="detail-row">
            <Icons.Clock />
            <span>
              {formatSlotTime(selectedSlot.startTime)} - {formatSlotTime(selectedSlot.endTime)}
              {' '}({bookingLink.duration} minutes)
            </span>
          </div>
          
          {bookingLink.branchName && (
            <div className="detail-row">
              <Icons.MapPin />
              <span>{bookingLink.branchName}</span>
            </div>
          )}
          
          <div className="detail-row">
            <Icons.User />
            <span>With {bookingLink.recruiterName}</span>
          </div>
        </div>
        
        <div className="confirmation-contact">
          <h5>Your Details</h5>
          <p><strong>{formData.name}</strong></p>
          <p>{formData.email}</p>
          <p>{formData.phone}</p>
          {formData.notes && <p className="notes">"{formData.notes}"</p>}
        </div>
      </div>
    </div>
  );
}

// Success screen component
function SuccessScreen({ booking, bookingLink }) {
  const eventConfig = EVENT_TYPE_CONFIG[bookingLink.eventType] || EVENT_TYPE_CONFIG.interview;
  
  return (
    <div className="success-screen">
      <div className="success-icon">
        <Icons.CheckCircle />
      </div>
      
      <h2>Booking Confirmed!</h2>
      <p>Your {eventConfig.label.toLowerCase()} has been scheduled</p>
      
      <div className="success-card">
        <div className="success-details">
          <div className="detail-row">
            <Icons.Calendar />
            <span>
              {booking.startTime.toLocaleDateString('en-GB', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric'
              })}
            </span>
          </div>
          
          <div className="detail-row">
            <Icons.Clock />
            <span>
              {formatSlotTime(booking.startTime)} - {formatSlotTime(booking.endTime)}
            </span>
          </div>
          
          {booking.branchName && (
            <div className="detail-row">
              <Icons.MapPin />
              <span>{booking.branchName}</span>
            </div>
          )}
          
          <div className="detail-row">
            <Icons.User />
            <span>With {booking.recruiterName}</span>
          </div>
        </div>
      </div>
      
      <p className="success-note">
        A confirmation has been sent to your email. Please check your inbox for more details.
      </p>
    </div>
  );
}

// Not found screen component
function NotFoundScreen() {
  return (
    <div className="not-found-screen">
      <div className="not-found-icon">
        <Icons.AlertCircle />
      </div>
      <h2>Booking Link Not Found</h2>
      <p>This booking link may have expired or is no longer available.</p>
    </div>
  );
}

// Inactive link screen component
function InactiveLinkScreen() {
  return (
    <div className="inactive-screen">
      <div className="inactive-icon">
        <Icons.AlertCircle />
      </div>
      <h2>Booking Currently Unavailable</h2>
      <p>This booking link is not currently accepting appointments. Please contact the recruiter directly.</p>
    </div>
  );
}

// Main BookingPage Component
export default function BookingPage() {
  const { slug } = useParams();
  const { link: bookingLink, loading: linkLoading, error: linkError } = useBookingLink(slug);
  
  const [step, setStep] = useState(1);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    notes: ''
  });
  const [formErrors, setFormErrors] = useState({});
  const [bookingResult, setBookingResult] = useState(null);

  const { slots, loading: slotsLoading } = useAvailableSlots({
    bookingLinkId: bookingLink?.id,
    date: selectedDate,
    duration: bookingLink?.duration
  });

  const { submitBooking, loading: submitLoading, error: submitError, success } = useBookingSubmit();

  // Form change handler
  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (formErrors[name]) {
      setFormErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  // Validate form
  const validateForm = () => {
    const errors = {};
    
    if (!formData.name.trim()) {
      errors.name = 'Name is required';
    }
    
    if (!formData.email.trim()) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Please enter a valid email';
    }
    
    if (!formData.phone.trim()) {
      errors.phone = 'Phone number is required';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle date selection
  const handleDateSelect = (date) => {
    setSelectedDate(date);
    setSelectedSlot(null);
  };

  // Handle slot selection
  const handleSlotSelect = (slot) => {
    setSelectedSlot(slot);
  };

  // Handle next step
  const handleNext = () => {
    if (step === 2 && !validateForm()) {
      return;
    }
    setStep(s => s + 1);
  };

  // Handle back
  const handleBack = () => {
    setStep(s => s - 1);
  };

  // Handle submit
  const handleSubmit = async () => {
    try {
      const result = await submitBooking({
        bookingLinkId: bookingLink.id,
        candidateName: formData.name,
        candidateEmail: formData.email,
        candidatePhone: formData.phone,
        startTime: selectedSlot.startTime,
        duration: bookingLink.duration,
        notes: formData.notes,
        eventType: bookingLink.eventType
      });
      setBookingResult(result);
    } catch (err) {
      console.error('Booking failed:', err);
    }
  };

  // Loading state
  if (linkLoading) {
    return (
      <div className="booking-page">
        <div className="booking-loading">
          <div className="spinner" />
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  // Not found state
  if (linkError || !bookingLink) {
    return (
      <div className="booking-page">
        <div className="booking-card">
          <NotFoundScreen />
        </div>
      </div>
    );
  }

  // Inactive link state
  if (!bookingLink.active) {
    return (
      <div className="booking-page">
        <div className="booking-card">
          <InactiveLinkScreen />
        </div>
      </div>
    );
  }

  // Success state
  if (success && bookingResult) {
    return (
      <div className="booking-page">
        <div className="booking-card">
          <SuccessScreen booking={bookingResult} bookingLink={bookingLink} />
        </div>
      </div>
    );
  }

  const eventConfig = EVENT_TYPE_CONFIG[bookingLink.eventType] || EVENT_TYPE_CONFIG.interview;

  return (
    <div className="booking-page">
      <div className="booking-card">
        {/* Header */}
        <div className="booking-header">
          <div className="booking-logo">
            <span className="event-icon">{eventConfig.icon}</span>
          </div>
          <h1>{bookingLink.title}</h1>
          {bookingLink.description && (
            <p className="booking-description">{bookingLink.description}</p>
          )}
          <div className="booking-meta">
            <span>
              <Icons.Clock />
              {bookingLink.duration} minutes
            </span>
            {bookingLink.branchName && (
              <span>
                <Icons.MapPin />
                {bookingLink.branchName}
              </span>
            )}
            <span>
              <Icons.User />
              {bookingLink.recruiterName}
            </span>
          </div>
        </div>

        {/* Step Indicator */}
        <StepIndicator 
          currentStep={step} 
          steps={['Select Date & Time', 'Your Details', 'Confirm']} 
        />

        {/* Step Content */}
        <div className="booking-content">
          {/* Step 1: Date & Time Selection */}
          {step === 1 && (
            <div className="step-content">
              <DatePicker
                availableDays={bookingLink.availableDays || [1, 2, 3, 4, 5]}
                selectedDate={selectedDate}
                onSelect={handleDateSelect}
              />
              
              {selectedDate && (
                <TimeSlotPicker
                  slots={slots}
                  selectedSlot={selectedSlot}
                  onSelect={handleSlotSelect}
                  loading={slotsLoading}
                />
              )}
            </div>
          )}

          {/* Step 2: Contact Details */}
          {step === 2 && (
            <div className="step-content">
              <ContactForm
                formData={formData}
                onChange={handleFormChange}
                errors={formErrors}
              />
            </div>
          )}

          {/* Step 3: Confirmation */}
          {step === 3 && (
            <div className="step-content">
              <ConfirmationStep
                bookingLink={bookingLink}
                selectedDate={selectedDate}
                selectedSlot={selectedSlot}
                formData={formData}
              />
              {submitError && (
                <div className="submit-error">
                  <Icons.AlertCircle />
                  {submitError}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="booking-footer">
          {step > 1 && (
            <button className="btn btn-secondary" onClick={handleBack}>
              Back
            </button>
          )}
          
          {step < 3 ? (
            <button 
              className="btn btn-primary"
              onClick={handleNext}
              disabled={step === 1 && (!selectedDate || !selectedSlot)}
            >
              Continue
            </button>
          ) : (
            <button 
              className="btn btn-primary"
              onClick={handleSubmit}
              disabled={submitLoading}
            >
              {submitLoading ? 'Booking...' : 'Confirm Booking'}
            </button>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="booking-page-footer">
        <p>Powered by Allied Recruitment Portal</p>
      </div>
    </div>
  );
}
