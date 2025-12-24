/**
 * Input Sanitisation Utilities
 * 
 * Protects against XSS attacks by sanitising user inputs before storage.
 * Uses DOMPurify for HTML sanitisation.
 */

import DOMPurify from 'dompurify';

/**
 * Sanitise a string input
 * Removes HTML tags and trims whitespace
 * @param {string} input - Raw input string
 * @returns {string} Sanitised string
 */
export function sanitizeString(input) {
  if (typeof input !== 'string') return input;
  
  // Remove HTML tags and trim
  return DOMPurify.sanitize(input, { ALLOWED_TAGS: [] }).trim();
}

/**
 * Sanitise text that may contain basic formatting
 * Allows safe formatting tags only
 * @param {string} input - Raw input string
 * @returns {string} Sanitised string with safe HTML
 */
export function sanitizeRichText(input) {
  if (typeof input !== 'string') return input;
  
  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'br', 'p'],
    ALLOWED_ATTR: []
  }).trim();
}

/**
 * Sanitise an email address
 * @param {string} email - Raw email string
 * @returns {string|null} Sanitised email or null if invalid
 */
export function sanitizeEmail(email) {
  if (typeof email !== 'string') return null;
  
  const sanitized = sanitizeString(email).toLowerCase();
  
  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(sanitized)) {
    return null;
  }
  
  return sanitized;
}

/**
 * Sanitise a phone number
 * Removes everything except digits, +, spaces, and hyphens
 * @param {string} phone - Raw phone string
 * @returns {string|null} Sanitised phone or null if too short
 */
export function sanitizePhone(phone) {
  if (typeof phone !== 'string') return null;
  
  // Keep only valid phone characters
  const sanitized = phone.replace(/[^\d+\s\-()]/g, '').trim();
  
  // Must have at least 10 digits
  const digitsOnly = sanitized.replace(/\D/g, '');
  if (digitsOnly.length < 10) {
    return null;
  }
  
  return sanitized;
}

/**
 * Sanitise a UK postcode
 * @param {string} postcode - Raw postcode string
 * @returns {string|null} Sanitised postcode or null if invalid
 */
export function sanitizePostcode(postcode) {
  if (typeof postcode !== 'string') return null;
  
  // Remove non-alphanumeric except space
  const sanitized = postcode.replace(/[^a-zA-Z0-9\s]/g, '').trim().toUpperCase();
  
  // Basic UK postcode pattern (loose)
  const postcodeRegex = /^[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$/i;
  if (!postcodeRegex.test(sanitized)) {
    return sanitized; // Return as-is, may be partial or non-UK
  }
  
  // Format with space
  const parts = sanitized.replace(/\s/g, '');
  if (parts.length >= 5) {
    return parts.slice(0, -3) + ' ' + parts.slice(-3);
  }
  
  return sanitized;
}

/**
 * Sanitise an object with candidate data
 * @param {Object} data - Raw candidate data
 * @returns {Object} Sanitised candidate data
 */
export function sanitizeCandidateData(data) {
  return {
    ...data,
    firstName: data.firstName ? sanitizeString(data.firstName) : null,
    lastName: data.lastName ? sanitizeString(data.lastName) : null,
    email: data.email ? sanitizeEmail(data.email) : null,
    phone: data.phone ? sanitizePhone(data.phone) : null,
    address: data.address ? sanitizeString(data.address) : null,
    postcode: data.postcode ? sanitizePostcode(data.postcode) : null,
    notes: data.notes ? sanitizeRichText(data.notes) : null,
    source: data.source ? sanitizeString(data.source) : null,
  };
}

/**
 * Sanitise an object with job data
 * @param {Object} data - Raw job data
 * @returns {Object} Sanitised job data
 */
export function sanitizeJobData(data) {
  return {
    ...data,
    title: data.title ? sanitizeString(data.title) : null,
    location: data.location ? sanitizeString(data.location) : null,
    description: data.description ? sanitizeRichText(data.description) : null,
    requirements: data.requirements ? sanitizeRichText(data.requirements) : null,
  };
}

/**
 * Sanitise note content
 * @param {string} content - Raw note content
 * @returns {string} Sanitised note content
 */
export function sanitizeNoteContent(content) {
  return sanitizeRichText(content);
}

/**
 * Check if input contains potential XSS
 * Useful for logging/monitoring
 * @param {string} input - Input to check
 * @returns {boolean} True if suspicious content detected
 */
export function containsSuspiciousContent(input) {
  if (typeof input !== 'string') return false;
  
  const suspicious = [
    /<script/i,
    /javascript:/i,
    /on\w+\s*=/i, // onclick=, onerror=, etc.
    /<iframe/i,
    /<object/i,
    /<embed/i,
    /data:/i,
    /vbscript:/i,
  ];
  
  return suspicious.some(pattern => pattern.test(input));
}
