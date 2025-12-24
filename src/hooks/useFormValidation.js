import { useState, useCallback, useRef, useEffect } from 'react';

/**
 * Validation rules - each returns error message or null
 */
export const validators = {
  required: (value, fieldName = 'This field') => {
    if (!value || (typeof value === 'string' && !value.trim())) {
      return `${fieldName} is required`;
    }
    return null;
  },

  email: (value) => {
    if (!value) return null; // Let required handle empty
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) {
      return 'Please enter a valid email address';
    }
    return null;
  },

  phone: (value) => {
    if (!value) return null;
    // Remove spaces and common separators for validation
    const cleaned = value.replace(/[\s\-\(\)\.]/g, '');
    // UK phone: starts with 0 or +44, 10-13 digits
    const phoneRegex = /^(\+44|0)[0-9]{9,12}$/;
    if (!phoneRegex.test(cleaned)) {
      return 'Please enter a valid UK phone number';
    }
    return null;
  },

  postcode: (value) => {
    if (!value) return null;
    // UK postcode regex (flexible)
    const postcodeRegex = /^[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$/i;
    if (!postcodeRegex.test(value.trim())) {
      return 'Please enter a valid UK postcode';
    }
    return null;
  },

  minLength: (min) => (value, fieldName = 'This field') => {
    if (!value) return null;
    if (value.length < min) {
      return `${fieldName} must be at least ${min} characters`;
    }
    return null;
  },

  maxLength: (max) => (value, fieldName = 'This field') => {
    if (!value) return null;
    if (value.length > max) {
      return `${fieldName} must be no more than ${max} characters`;
    }
    return null;
  },

  pattern: (regex, message) => (value) => {
    if (!value) return null;
    if (!regex.test(value)) {
      return message;
    }
    return null;
  },

  url: (value) => {
    if (!value) return null;
    try {
      new URL(value);
      return null;
    } catch {
      return 'Please enter a valid URL';
    }
  },

  number: (value) => {
    if (!value) return null;
    if (isNaN(Number(value))) {
      return 'Please enter a valid number';
    }
    return null;
  },

  min: (minVal) => (value, fieldName = 'Value') => {
    if (!value) return null;
    if (Number(value) < minVal) {
      return `${fieldName} must be at least ${minVal}`;
    }
    return null;
  },

  max: (maxVal) => (value, fieldName = 'Value') => {
    if (!value) return null;
    if (Number(value) > maxVal) {
      return `${fieldName} must be no more than ${maxVal}`;
    }
    return null;
  },

  match: (otherValue, message = 'Values do not match') => (value) => {
    if (!value) return null;
    if (value !== otherValue) {
      return message;
    }
    return null;
  },

  custom: (validateFn) => validateFn
};

/**
 * Debounce helper
 */
function useDebounce(callback, delay) {
  const timeoutRef = useRef(null);

  const debouncedCallback = useCallback((...args) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      callback(...args);
    }, delay);
  }, [callback, delay]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return debouncedCallback;
}

/**
 * useFormValidation - Real-time form validation hook
 * 
 * @param {Object} initialValues - Initial form values
 * @param {Object} validationSchema - Validation rules for each field
 * @param {Object} options - Configuration options
 * @returns {Object} Form state and handlers
 * 
 * @example
 * const { values, errors, touched, handleChange, handleBlur, validate, isValid } = useFormValidation(
 *   { email: '', phone: '' },
 *   {
 *     email: [validators.required, validators.email],
 *     phone: [validators.required, validators.phone]
 *   },
 *   { debounceMs: 300, validateOnChange: true }
 * );
 */
export function useFormValidation(
  initialValues = {},
  validationSchema = {},
  options = {}
) {
  const {
    debounceMs = 300,
    validateOnChange = true,
    validateOnBlur = true,
    fieldNames = {} // Optional friendly names for error messages
  } = options;

  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [isValidating, setIsValidating] = useState(false);

  // Reset form when initialValues change (e.g., editing different item)
  useEffect(() => {
    setValues(initialValues);
    setErrors({});
    setTouched({});
  }, [JSON.stringify(initialValues)]);

  /**
   * Validate a single field
   */
  const validateField = useCallback((name, value) => {
    const rules = validationSchema[name];
    if (!rules || !Array.isArray(rules)) return null;

    const friendlyName = fieldNames[name] || name;

    for (const rule of rules) {
      const error = rule(value, friendlyName);
      if (error) return error;
    }
    return null;
  }, [validationSchema, fieldNames]);

  /**
   * Validate all fields
   */
  const validateAll = useCallback(() => {
    const newErrors = {};
    let hasErrors = false;

    Object.keys(validationSchema).forEach(name => {
      const error = validateField(name, values[name]);
      if (error) {
        newErrors[name] = error;
        hasErrors = true;
      }
    });

    setErrors(newErrors);
    
    // Mark all fields as touched
    const allTouched = {};
    Object.keys(validationSchema).forEach(name => {
      allTouched[name] = true;
    });
    setTouched(allTouched);

    return !hasErrors;
  }, [validationSchema, values, validateField]);

  /**
   * Debounced field validation
   */
  const debouncedValidateField = useDebounce((name, value) => {
    const error = validateField(name, value);
    setErrors(prev => ({
      ...prev,
      [name]: error
    }));
    setIsValidating(false);
  }, debounceMs);

  /**
   * Handle input change
   */
  const handleChange = useCallback((e) => {
    const { name, value, type, checked } = e.target;
    const newValue = type === 'checkbox' ? checked : value;

    setValues(prev => ({
      ...prev,
      [name]: newValue
    }));

    if (validateOnChange && touched[name]) {
      setIsValidating(true);
      debouncedValidateField(name, newValue);
    }
  }, [validateOnChange, touched, debouncedValidateField]);

  /**
   * Handle input blur
   */
  const handleBlur = useCallback((e) => {
    const { name, value } = e.target;

    setTouched(prev => ({
      ...prev,
      [name]: true
    }));

    if (validateOnBlur) {
      const error = validateField(name, value);
      setErrors(prev => ({
        ...prev,
        [name]: error
      }));
    }
  }, [validateOnBlur, validateField]);

  /**
   * Set a specific field value programmatically
   */
  const setFieldValue = useCallback((name, value) => {
    setValues(prev => ({
      ...prev,
      [name]: value
    }));

    if (validateOnChange && touched[name]) {
      debouncedValidateField(name, value);
    }
  }, [validateOnChange, touched, debouncedValidateField]);

  /**
   * Set a specific field error
   */
  const setFieldError = useCallback((name, error) => {
    setErrors(prev => ({
      ...prev,
      [name]: error
    }));
  }, []);

  /**
   * Set a field as touched
   */
  const setFieldTouched = useCallback((name, isTouched = true) => {
    setTouched(prev => ({
      ...prev,
      [name]: isTouched
    }));
  }, []);

  /**
   * Reset the form
   */
  const resetForm = useCallback((newValues = initialValues) => {
    setValues(newValues);
    setErrors({});
    setTouched({});
  }, [initialValues]);

  /**
   * Get error for a field (only if touched)
   */
  const getFieldError = useCallback((name) => {
    return touched[name] ? errors[name] : null;
  }, [touched, errors]);

  /**
   * Check if form is valid (no errors in touched fields)
   */
  const isValid = Object.keys(errors).every(key => !errors[key]);

  /**
   * Check if form has been modified
   */
  const isDirty = JSON.stringify(values) !== JSON.stringify(initialValues);

  /**
   * Get props to spread on an input
   */
  const getFieldProps = useCallback((name) => ({
    name,
    value: values[name] || '',
    onChange: handleChange,
    onBlur: handleBlur,
    error: getFieldError(name)
  }), [values, handleChange, handleBlur, getFieldError]);

  return {
    // State
    values,
    errors,
    touched,
    isValidating,
    isValid,
    isDirty,

    // Handlers
    handleChange,
    handleBlur,
    
    // Field helpers
    setFieldValue,
    setFieldError,
    setFieldTouched,
    getFieldError,
    getFieldProps,
    
    // Form helpers
    validate: validateAll,
    resetForm,
    setValues
  };
}

/**
 * Pre-built validation schemas for common forms
 */
export const commonSchemas = {
  candidate: {
    firstName: [validators.required],
    lastName: [validators.required],
    email: [validators.required, validators.email],
    phone: [validators.required, validators.phone],
    postcode: [validators.postcode]
  },

  job: {
    title: [validators.required, validators.minLength(3)],
    location: [validators.required],
    description: [validators.required, validators.minLength(50)]
  },

  login: {
    email: [validators.required, validators.email],
    password: [validators.required, validators.minLength(8)]
  }
};

export default useFormValidation;
