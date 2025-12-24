import { forwardRef } from 'react';
import './Textarea.css';

/**
 * Textarea component
 * @param {Object} props
 * @param {string} props.label
 * @param {string} props.error
 * @param {string} props.hint
 * @param {number} props.rows
 */
const Textarea = forwardRef(function Textarea({
  label,
  error,
  hint,
  rows = 4,
  className = '',
  id,
  ...props
}, ref) {
  const textareaId = id || `textarea-${Math.random().toString(36).substr(2, 9)}`;
  
  const textareaClasses = [
    'textarea',
    error && 'textarea-error',
    className
  ].filter(Boolean).join(' ');

  return (
    <div className="textarea-wrapper">
      {label && (
        <label className="textarea-label" htmlFor={textareaId}>
          {label}
        </label>
      )}
      <textarea
        ref={ref}
        id={textareaId}
        className={textareaClasses}
        rows={rows}
        {...props}
      />
      {(error || hint) && (
        <p className={`textarea-message ${error ? 'textarea-message-error' : ''}`}>
          {error || hint}
        </p>
      )}
    </div>
  );
});

export default Textarea;
