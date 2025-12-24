import { forwardRef } from 'react';
import { Check, AlertCircle } from 'lucide-react';
import './Input.css';

/**
 * Input component with real-time validation support
 * @param {Object} props
 * @param {string} props.label
 * @param {string} props.error - Error message
 * @param {string} props.hint - Help text
 * @param {boolean} props.success - Show success state
 * @param {boolean} props.showValidation - Show validation icons
 * @param {React.ReactNode} props.leftIcon
 * @param {React.ReactNode} props.rightIcon
 */
const Input = forwardRef(function Input({
  label,
  error,
  hint,
  success,
  showValidation = true,
  leftIcon,
  rightIcon,
  className = '',
  id,
  required,
  ...props
}, ref) {
  const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;
  
  // Determine validation state
  const hasValue = props.value && props.value.length > 0;
  const showSuccess = showValidation && success && hasValue && !error;
  const showError = showValidation && error;
  
  // Determine which icon to show on the right
  const validationIcon = showError ? (
    <AlertCircle size={16} className="input-validation-icon input-validation-error" />
  ) : showSuccess ? (
    <Check size={16} className="input-validation-icon input-validation-success" />
  ) : null;
  
  const inputClasses = [
    'input',
    error && 'input-error',
    showSuccess && 'input-success',
    leftIcon && 'input-with-left-icon',
    (rightIcon || validationIcon) && 'input-with-right-icon',
    className
  ].filter(Boolean).join(' ');

  return (
    <div className="input-wrapper">
      {label && (
        <label className="input-label" htmlFor={inputId}>
          {label}
          {required && <span className="input-required">*</span>}
        </label>
      )}
      <div className="input-container">
        {leftIcon && <span className="input-icon input-icon-left">{leftIcon}</span>}
        <input
          ref={ref}
          id={inputId}
          className={inputClasses}
          required={required}
          {...props}
        />
        {(rightIcon || validationIcon) && (
          <span className="input-icon input-icon-right">
            {validationIcon || rightIcon}
          </span>
        )}
      </div>
      {(error || hint) && (
        <p className={`input-message ${error ? 'input-message-error' : ''}`}>
          {error || hint}
        </p>
      )}
    </div>
  );
});

export default Input;
