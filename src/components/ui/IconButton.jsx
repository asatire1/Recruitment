import { forwardRef } from 'react';
import './IconButton.css';

/**
 * Accessible icon button component
 * Always requires an aria-label for screen readers
 */
const IconButton = forwardRef(function IconButton({
  icon: Icon,
  label,
  onClick,
  variant = 'default',
  size = 'medium',
  disabled = false,
  loading = false,
  className = '',
  ...props
}, ref) {
  return (
    <button
      ref={ref}
      type="button"
      className={`icon-button icon-button--${variant} icon-button--${size} ${className}`}
      onClick={onClick}
      disabled={disabled || loading}
      aria-label={label}
      aria-busy={loading}
      {...props}
    >
      {loading ? (
        <span className="icon-button__loader" aria-hidden="true" />
      ) : (
        <Icon size={size === 'small' ? 14 : size === 'large' ? 20 : 16} aria-hidden="true" />
      )}
    </button>
  );
});

export default IconButton;
