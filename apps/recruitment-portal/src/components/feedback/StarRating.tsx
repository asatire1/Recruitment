// ============================================================================
// Allied Recruitment Portal - Star Rating Component (R10.2)
// Location: apps/recruitment-portal/src/components/feedback/StarRating.tsx
// ============================================================================

import { useState, useCallback } from 'react'
import './StarRating.css'

interface StarRatingProps {
  value: number
  onChange: (value: number) => void
  max?: number
  size?: 'sm' | 'md' | 'lg'
  disabled?: boolean
  showValue?: boolean
  guidance?: Record<number, string>
}

export function StarRating({
  value,
  onChange,
  max = 5,
  size = 'md',
  disabled = false,
  showValue = true,
  guidance,
}: StarRatingProps) {
  const [hoverValue, setHoverValue] = useState<number | null>(null)
  const [showTooltip, setShowTooltip] = useState(false)

  const displayValue = hoverValue !== null ? hoverValue : value

  const handleClick = useCallback((rating: number) => {
    if (!disabled) {
      // Allow clicking same star to deselect
      onChange(rating === value ? 0 : rating)
    }
  }, [disabled, onChange, value])

  const handleMouseEnter = useCallback((rating: number) => {
    if (!disabled) {
      setHoverValue(rating)
      setShowTooltip(true)
    }
  }, [disabled])

  const handleMouseLeave = useCallback(() => {
    setHoverValue(null)
    setShowTooltip(false)
  }, [])

  const getGuidanceText = () => {
    if (!guidance || displayValue === 0) return null
    return guidance[displayValue] || null
  }

  return (
    <div className={`star-rating star-rating-${size}`}>
      <div className="stars-container" onMouseLeave={handleMouseLeave}>
        {Array.from({ length: max }, (_, i) => i + 1).map((rating) => {
          const isFilled = rating <= displayValue
          const isHovered = hoverValue !== null && rating <= hoverValue
          
          return (
            <button
              key={rating}
              type="button"
              className={`star-button ${isFilled ? 'filled' : ''} ${isHovered ? 'hovered' : ''}`}
              onClick={() => handleClick(rating)}
              onMouseEnter={() => handleMouseEnter(rating)}
              disabled={disabled}
              aria-label={`Rate ${rating} out of ${max}`}
            >
              <svg 
                viewBox="0 0 24 24" 
                fill={isFilled ? 'currentColor' : 'none'}
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" 
                />
              </svg>
            </button>
          )
        })}
      </div>
      
      {showValue && (
        <span className="star-value">
          {displayValue > 0 ? `${displayValue}/${max}` : '—'}
        </span>
      )}
      
      {showTooltip && getGuidanceText() && (
        <div className="star-tooltip">
          {getGuidanceText()}
        </div>
      )}
    </div>
  )
}

// ============================================================================
// Read-Only Star Display (for viewing feedback)
// ============================================================================

interface StarDisplayProps {
  value: number
  max?: number
  size?: 'sm' | 'md' | 'lg'
  showValue?: boolean
}

export function StarDisplay({
  value,
  max = 5,
  size = 'sm',
  showValue = true,
}: StarDisplayProps) {
  return (
    <div className={`star-rating star-rating-${size} star-display`}>
      <div className="stars-container">
        {Array.from({ length: max }, (_, i) => i + 1).map((rating) => {
          const isFilled = rating <= value
          const isPartial = rating > value && rating - 1 < value
          const fillPercent = isPartial ? (value % 1) * 100 : 0
          
          return (
            <span
              key={rating}
              className={`star-icon ${isFilled ? 'filled' : ''} ${isPartial ? 'partial' : ''}`}
            >
              <svg 
                viewBox="0 0 24 24" 
                fill={isFilled ? 'currentColor' : 'none'}
                stroke="currentColor"
                strokeWidth="1.5"
              >
                {isPartial && (
                  <defs>
                    <linearGradient id={`partial-${rating}`}>
                      <stop offset={`${fillPercent}%`} stopColor="currentColor" />
                      <stop offset={`${fillPercent}%`} stopColor="transparent" />
                    </linearGradient>
                  </defs>
                )}
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round"
                  fill={isPartial ? `url(#partial-${rating})` : undefined}
                  d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" 
                />
              </svg>
            </span>
          )
        })}
      </div>
      
      {showValue && (
        <span className="star-value">
          {value > 0 ? value.toFixed(1) : '—'}
        </span>
      )}
    </div>
  )
}

export default StarRating
