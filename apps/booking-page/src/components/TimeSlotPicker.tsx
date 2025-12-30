/**
 * TimeSlotPicker Component
 * P2.3: List of available times for selected date
 * 
 * Features:
 * - Shows time slots for selected date
 * - Indicates available vs booked slots
 * - Respects minimum notice requirements
 * - Mobile-friendly touch targets
 */

import { useMemo } from 'react'

// ============================================================================
// TYPES
// ============================================================================

export interface TimeSlot {
  time: string        // "09:00"
  available: boolean
  bookedCount?: number
}

export interface TimeSlotPickerProps {
  /** Selected date */
  date: Date
  /** Available time slots for this date */
  slots: TimeSlot[]
  /** Currently selected time */
  selectedTime: string | null
  /** Callback when time is selected */
  onTimeSelect: (time: string) => void
  /** Duration of booking in minutes */
  duration: number
  /** Loading state */
  isLoading?: boolean
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

// ============================================================================
// COMPONENT
// ============================================================================

export function TimeSlotPicker({
  date,
  slots,
  selectedTime,
  onTimeSelect,
  duration,
  isLoading = false
}: TimeSlotPickerProps) {
  // Group slots by morning/afternoon/evening
  const groupedSlots = useMemo(() => {
    const morning: TimeSlot[] = []
    const afternoon: TimeSlot[] = []
    const evening: TimeSlot[] = []

    slots.forEach(slot => {
      const hour = parseInt(slot.time.split(':')[0], 10)
      if (hour < 12) {
        morning.push(slot)
      } else if (hour < 17) {
        afternoon.push(slot)
      } else {
        evening.push(slot)
      }
    })

    return { morning, afternoon, evening }
  }, [slots])

  // Check if any slots are available
  const hasAvailableSlots = slots.some(s => s.available)

  if (isLoading) {
    return (
      <div className="time-slot-picker">
        <div className="time-slot-header">
          <CalendarIcon />
          <span>{formatDate(date)}</span>
        </div>
        <div className="time-slot-loading">
          <div className="spinner spinner-small" />
          <span>Loading available times...</span>
        </div>
      </div>
    )
  }

  if (!hasAvailableSlots) {
    return (
      <div className="time-slot-picker">
        <div className="time-slot-header">
          <CalendarIcon />
          <span>{formatDate(date)}</span>
        </div>
        <div className="time-slot-empty">
          <AlertIcon />
          <p>No available times on this date.</p>
          <p className="text-muted">Please select another date.</p>
        </div>
      </div>
    )
  }

  const renderSlotGroup = (title: string, icon: React.ReactNode, groupSlots: TimeSlot[]) => {
    if (groupSlots.length === 0) return null

    return (
      <div className="time-slot-group">
        <h3 className="time-slot-group-title">
          {icon}
          <span>{title}</span>
        </h3>
        <div className="time-slot-list">
          {groupSlots.map(slot => {
            const isSelected = selectedTime === slot.time
            const endTime = getEndTime(slot.time, duration)
            
            return (
              <button
                key={slot.time}
                className={`time-slot ${slot.available ? 'available' : 'unavailable'} ${isSelected ? 'selected' : ''}`}
                onClick={() => slot.available && onTimeSelect(slot.time)}
                disabled={!slot.available}
                aria-pressed={isSelected}
                aria-label={`${formatTime(slot.time)} to ${formatTime(endTime)}${slot.available ? '' : ', unavailable'}`}
              >
                <span className="time-slot-time">{formatTime(slot.time)}</span>
                <span className="time-slot-separator">–</span>
                <span className="time-slot-end">{formatTime(endTime)}</span>
                {isSelected && (
                  <span className="time-slot-check">
                    <CheckIcon />
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div className="time-slot-picker">
      <div className="time-slot-header">
        <CalendarIcon />
        <span>{formatDate(date)}</span>
      </div>

      <div className="time-slot-duration">
        <ClockIcon />
        <span>Duration: {duration >= 60 ? `${duration / 60} hour${duration > 60 ? 's' : ''}` : `${duration} minutes`}</span>
      </div>

      <div className="time-slot-groups">
        {renderSlotGroup('Morning', <SunriseIcon />, groupedSlots.morning)}
        {renderSlotGroup('Afternoon', <SunIcon />, groupedSlots.afternoon)}
        {renderSlotGroup('Evening', <MoonIcon />, groupedSlots.evening)}
      </div>
    </div>
  )
}

// ============================================================================
// ICONS
// ============================================================================

function CalendarIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" width="20" height="20">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
    </svg>
  )
}

function ClockIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" width="18" height="18">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
}

function AlertIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" width="32" height="32">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" width="16" height="16">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  )
}

function SunriseIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" width="18" height="18">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
    </svg>
  )
}

function SunIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" width="18" height="18">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
    </svg>
  )
}

function MoonIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" width="18" height="18">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
    </svg>
  )
}
