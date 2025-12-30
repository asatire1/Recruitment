/**
 * Skeleton Loader Components
 * P3.2: Loading states - Skeleton/spinner during API calls
 * 
 * Provides visual feedback during data loading
 */

// ============================================================================
// BASE SKELETON
// ============================================================================

interface SkeletonProps {
  width?: string | number
  height?: string | number
  borderRadius?: string
  className?: string
}

export function Skeleton({ 
  width = '100%', 
  height = '1rem', 
  borderRadius = '4px',
  className = ''
}: SkeletonProps) {
  return (
    <div 
      className={`skeleton ${className}`}
      style={{ 
        width: typeof width === 'number' ? `${width}px` : width,
        height: typeof height === 'number' ? `${height}px` : height,
        borderRadius
      }}
      aria-hidden="true"
    />
  )
}

// ============================================================================
// CALENDAR SKELETON
// ============================================================================

export function CalendarSkeleton() {
  return (
    <div className="skeleton-calendar" aria-label="Loading calendar...">
      {/* Header */}
      <div className="skeleton-calendar-header">
        <Skeleton width={36} height={36} borderRadius="8px" />
        <Skeleton width={150} height={24} />
        <Skeleton width={36} height={36} borderRadius="8px" />
      </div>
      
      {/* Weekday headers */}
      <div className="skeleton-calendar-weekdays">
        {Array.from({ length: 7 }).map((_, i) => (
          <Skeleton key={i} width={32} height={16} />
        ))}
      </div>
      
      {/* Calendar grid - 6 rows of 7 days */}
      <div className="skeleton-calendar-grid">
        {Array.from({ length: 42 }).map((_, i) => (
          <Skeleton 
            key={i} 
            width={40} 
            height={40} 
            borderRadius="50%" 
            className="skeleton-day"
          />
        ))}
      </div>
    </div>
  )
}

// ============================================================================
// TIME SLOTS SKELETON
// ============================================================================

export function TimeSlotsSkeleton() {
  return (
    <div className="skeleton-timeslots" aria-label="Loading time slots...">
      {/* Header */}
      <div className="skeleton-timeslots-header">
        <Skeleton width={20} height={20} borderRadius="4px" />
        <Skeleton width={200} height={20} />
      </div>
      
      {/* Duration */}
      <div className="skeleton-timeslots-duration">
        <Skeleton width={18} height={18} borderRadius="4px" />
        <Skeleton width={120} height={16} />
      </div>
      
      {/* Time slot groups */}
      {['Morning', 'Afternoon'].map((_, groupIndex) => (
        <div key={groupIndex} className="skeleton-slot-group">
          <Skeleton width={100} height={18} className="skeleton-group-title" />
          <div className="skeleton-slots">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton 
                key={i} 
                width="100%" 
                height={48} 
                borderRadius="8px"
                className="skeleton-slot"
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

// ============================================================================
// CONFIRMATION SKELETON
// ============================================================================

export function ConfirmationSkeleton() {
  return (
    <div className="skeleton-confirmation" aria-label="Loading confirmation...">
      {/* Icon */}
      <div className="skeleton-confirmation-icon">
        <Skeleton width={48} height={48} borderRadius="50%" />
      </div>
      
      {/* Title & subtitle */}
      <Skeleton width={200} height={28} className="skeleton-title" />
      <Skeleton width={280} height={16} className="skeleton-subtitle" />
      
      {/* Detail cards */}
      <div className="skeleton-details">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="skeleton-detail-card">
            <Skeleton width={24} height={24} borderRadius="4px" />
            <div className="skeleton-detail-content">
              <Skeleton width={60} height={14} />
              <Skeleton width={140} height={18} />
            </div>
          </div>
        ))}
      </div>
      
      {/* Buttons */}
      <div className="skeleton-actions">
        <Skeleton width={140} height={44} borderRadius="8px" />
        <Skeleton width={160} height={44} borderRadius="8px" />
      </div>
    </div>
  )
}

// ============================================================================
// WELCOME SKELETON
// ============================================================================

export function WelcomeSkeleton() {
  return (
    <div className="skeleton-welcome" aria-label="Loading...">
      {/* Icon */}
      <Skeleton width={64} height={64} borderRadius="50%" className="skeleton-welcome-icon" />
      
      {/* Title */}
      <Skeleton width={200} height={32} className="skeleton-welcome-title" />
      
      {/* Subtitle */}
      <Skeleton width={280} height={20} className="skeleton-welcome-subtitle" />
      
      {/* Info cards */}
      <div className="skeleton-info-cards">
        <div className="skeleton-info-card">
          <Skeleton width={24} height={24} borderRadius="4px" />
          <div>
            <Skeleton width={60} height={14} />
            <Skeleton width={100} height={18} />
          </div>
        </div>
        <div className="skeleton-info-card">
          <Skeleton width={24} height={24} borderRadius="4px" />
          <div>
            <Skeleton width={60} height={14} />
            <Skeleton width={140} height={18} />
          </div>
        </div>
      </div>
      
      {/* Button */}
      <Skeleton width={180} height={52} borderRadius="12px" className="skeleton-button" />
    </div>
  )
}
