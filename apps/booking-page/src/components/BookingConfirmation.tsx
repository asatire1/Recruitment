/**
 * BookingConfirmation Component
 * P2.5: Summary of selected date/time for confirmation
 * 
 * Shows:
 * - Selected date and time
 * - Booking type (interview/trial)
 * - Location details
 * - Confirm/Go back actions
 */

import type { BookingLinkData } from '../services/bookingService'

// ============================================================================
// TYPES
// ============================================================================

export interface BookingConfirmationProps {
  /** Booking data from validated token */
  bookingData: BookingLinkData
  /** Selected date */
  selectedDate: Date
  /** Selected time slot */
  selectedTime: string
  /** Callback to confirm booking */
  onConfirm: () => void
  /** Callback to go back */
  onBack: () => void
  /** Whether confirmation is in progress */
  isSubmitting?: boolean
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Format time for display (24h to 12h)
 */
function formatTime(time24: string): string {
  const [hours, minutes] = time24.split(':').map(Number)
  const period = hours >= 12 ? 'PM' : 'AM'
  const hours12 = hours % 12 || 12
  return `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`
}

/**
 * Calculate end time given start time and duration
 */
function getEndTime(startTime: string, durationMinutes: number): string {
  const [hours, minutes] = startTime.split(':').map(Number)
  const totalMinutes = hours * 60 + minutes + durationMinutes
  const endHours = Math.floor(totalMinutes / 60) % 24
  const endMinutes = totalMinutes % 60
  return `${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`
}

/**
 * Format date for display
 */
function formatDate(date: Date): string {
  return date.toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })
}

/**
 * Format duration for display
 */
function formatDuration(minutes: number): string {
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    if (mins === 0) {
      return `${hours} hour${hours > 1 ? 's' : ''}`
    }
    return `${hours}h ${mins}m`
  }
  return `${minutes} minutes`
}

// ============================================================================
// COMPONENT
// ============================================================================

export function BookingConfirmation({
  bookingData,
  selectedDate,
  selectedTime,
  onConfirm,
  onBack,
  isSubmitting = false
}: BookingConfirmationProps) {
  const endTime = getEndTime(selectedTime, bookingData.duration)
  const isInterview = bookingData.type === 'interview'

  return (
    <div className="booking-confirmation">
      <div className="confirmation-header">
        <div className="confirmation-icon">
          {isInterview ? <CalendarCheckIcon /> : <BriefcaseIcon />}
        </div>
        <h2 className="confirmation-title">Confirm Your Booking</h2>
        <p className="confirmation-subtitle">
          Please review the details below before confirming your {isInterview ? 'interview' : 'trial shift'}.
        </p>
      </div>

      <div className="confirmation-details">
        {/* Date & Time */}
        <div className="detail-card">
          <div className="detail-icon">
            <CalendarIcon />
          </div>
          <div className="detail-content">
            <span className="detail-label">Date & Time</span>
            <span className="detail-value">{formatDate(selectedDate)}</span>
            <span className="detail-secondary">
              {formatTime(selectedTime)} – {formatTime(endTime)}
            </span>
          </div>
        </div>

        {/* Duration */}
        <div className="detail-card">
          <div className="detail-icon">
            <ClockIcon />
          </div>
          <div className="detail-content">
            <span className="detail-label">Duration</span>
            <span className="detail-value">{formatDuration(bookingData.duration)}</span>
          </div>
        </div>

        {/* Type */}
        <div className="detail-card">
          <div className="detail-icon">
            {isInterview ? <UserIcon /> : <BriefcaseIcon />}
          </div>
          <div className="detail-content">
            <span className="detail-label">Type</span>
            <span className="detail-value">
              {isInterview ? 'Interview' : 'Trial Shift'}
            </span>
            {bookingData.jobTitle && (
              <span className="detail-secondary">{bookingData.jobTitle}</span>
            )}
          </div>
        </div>

        {/* Location */}
        {bookingData.branchName && (
          <div className="detail-card">
            <div className="detail-icon">
              <MapPinIcon />
            </div>
            <div className="detail-content">
              <span className="detail-label">Location</span>
              <span className="detail-value">{bookingData.branchName}</span>
              {bookingData.branchAddress && (
                <span className="detail-secondary">{bookingData.branchAddress}</span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Important Notice */}
      <div className="confirmation-notice">
        <InfoIcon />
        <p>
          By confirming, you agree to attend at the scheduled time. 
          If you need to reschedule or cancel, please contact us as soon as possible.
        </p>
      </div>

      {/* Actions */}
      <div className="confirmation-actions">
        <button
          className="btn btn-secondary"
          onClick={onBack}
          disabled={isSubmitting}
        >
          <ChevronLeftIcon />
          Change Selection
        </button>
        
        <button
          className="btn btn-primary"
          onClick={onConfirm}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <span className="spinner spinner-small spinner-white" />
              Confirming...
            </>
          ) : (
            <>
              Confirm Booking
              <CheckIcon />
            </>
          )}
        </button>
      </div>
    </div>
  )
}

// ============================================================================
// ICONS
// ============================================================================

function CalendarCheckIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" width="48" height="48">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5m-9-6h.008v.008H12v-.008zM12 15h.008v.008H12V15zm0 2.25h.008v.008H12v-.008zM9.75 15h.008v.008H9.75V15zm0 2.25h.008v.008H9.75v-.008zM7.5 15h.008v.008H7.5V15zm0 2.25h.008v.008H7.5v-.008zm6.75-4.5h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V15zm0 2.25h.008v.008h-.008v-.008zm2.25-4.5h.008v.008H16.5v-.008zm0 2.25h.008v.008H16.5V15z" />
    </svg>
  )
}

function CalendarIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" width="24" height="24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
    </svg>
  )
}

function ClockIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" width="24" height="24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
}

function MapPinIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" width="24" height="24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
    </svg>
  )
}

function BriefcaseIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" width="24" height="24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 00.75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 00-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0112 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 01-.673-.38m0 0A2.18 2.18 0 013 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 013.413-.387m7.5 0V5.25A2.25 2.25 0 0013.5 3h-3a2.25 2.25 0 00-2.25 2.25v.894m7.5 0a48.667 48.667 0 00-7.5 0M12 12.75h.008v.008H12v-.008z" />
    </svg>
  )
}

function UserIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" width="24" height="24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
    </svg>
  )
}

function InfoIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" width="20" height="20">
      <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" width="20" height="20">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  )
}

function ChevronLeftIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" width="20" height="20">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
    </svg>
  )
}
