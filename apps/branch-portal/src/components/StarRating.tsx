import { useState } from 'react'

interface StarRatingProps {
  value: number
  onChange: (value: number) => void
  disabled?: boolean
  size?: 'sm' | 'md' | 'lg'
}

export function StarRating({ value, onChange, disabled = false, size = 'md' }: StarRatingProps) {
  const [hoverValue, setHoverValue] = useState(0)

  const sizes = {
    sm: 20,
    md: 28,
    lg: 36,
  }

  const starSize = sizes[size]

  const handleClick = (rating: number) => {
    if (!disabled) {
      onChange(rating)
    }
  }

  const handleMouseEnter = (rating: number) => {
    if (!disabled) {
      setHoverValue(rating)
    }
  }

  const handleMouseLeave = () => {
    setHoverValue(0)
  }

  const displayValue = hoverValue || value

  return (
    <div 
      className={`star-rating star-rating--${size} ${disabled ? 'star-rating--disabled' : ''}`}
      onMouseLeave={handleMouseLeave}
    >
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          className={`star-btn ${star <= displayValue ? 'star-btn--filled' : ''}`}
          onClick={() => handleClick(star)}
          onMouseEnter={() => handleMouseEnter(star)}
          disabled={disabled}
          aria-label={`Rate ${star} stars`}
        >
          <svg 
            width={starSize} 
            height={starSize} 
            viewBox="0 0 24 24" 
            fill={star <= displayValue ? 'currentColor' : 'none'}
            stroke="currentColor" 
            strokeWidth="2"
          >
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
        </button>
      ))}
    </div>
  )
}
