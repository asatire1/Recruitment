import { forwardRef } from 'react';
import { ChevronDown } from 'lucide-react';
import './Select.css';

/**
 * Select component
 * @param {Object} props
 * @param {string} props.label
 * @param {string} props.error
 * @param {string} props.hint
 * @param {Array} props.options - Array of { value, label } objects
 * @param {string} props.placeholder
 */
const Select = forwardRef(function Select({
  label,
  error,
  hint,
  options = [],
  placeholder = 'Select an option',
  className = '',
  id,
  ...props
}, ref) {
  const selectId = id || `select-${Math.random().toString(36).substr(2, 9)}`;
  
  const selectClasses = [
    'select',
    error && 'select-error',
    className
  ].filter(Boolean).join(' ');

  return (
    <div className="select-wrapper">
      {label && (
        <label className="select-label" htmlFor={selectId}>
          {label}
        </label>
      )}
      <div className="select-container">
        <select
          ref={ref}
          id={selectId}
          className={selectClasses}
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown size={18} className="select-icon" />
      </div>
      {(error || hint) && (
        <p className={`select-message ${error ? 'select-message-error' : ''}`}>
          {error || hint}
        </p>
      )}
    </div>
  );
});

export default Select;
