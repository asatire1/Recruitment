/**
 * CV Parser Utility
 * 
 * This module provides comprehensive CV parsing functionality:
 * 1. Text extraction using pdf.js (for PDFs) and mammoth.js (for DOCX)
 * 2. AI-powered parsing via secure Cloud Function (API key server-side)
 * 
 * Falls back to regex-based parsing if Cloud Function unavailable
 * 
 * NOTE: Libraries are dynamically imported to reduce initial bundle size
 */

import { httpsCallable } from 'firebase/functions';
import { functions } from './firebase';

// Lazy-loaded library references
let pdfjsLib = null;
let mammoth = null;

// Cloud Function reference (lazy initialized)
let parseCVFunction = null;

/**
 * Get the parseCV Cloud Function
 */
function getParseFunction() {
  if (!parseCVFunction) {
    parseCVFunction = httpsCallable(functions, 'parseCV');
  }
  return parseCVFunction;
}

/**
 * Dynamically load pdf.js library
 */
async function loadPdfJs() {
  if (pdfjsLib) return pdfjsLib;
  
  console.log('CV Parser - Loading pdf.js library...');
  pdfjsLib = await import('pdfjs-dist');
  
  // Set up pdf.js worker
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
  
  return pdfjsLib;
}

/**
 * Dynamically load mammoth.js library
 */
async function loadMammoth() {
  if (mammoth) return mammoth;
  
  console.log('CV Parser - Loading mammoth.js library...');
  const mammothModule = await import('mammoth');
  mammoth = mammothModule.default || mammothModule;
  
  return mammoth;
}

/**
 * Main entry point - Parse CV content and extract candidate information
 * @param {File} file - The CV file to parse
 * @param {Object} options - Options (useSecure: boolean to force secure parsing)
 * @returns {Promise<Object>} Parsed candidate data
 */
export async function parseCVContent(file, options = {}) {
  // Step 1: Extract text from the file
  let textContent = '';
  
  try {
    const fileExtension = file.name.split('.').pop().toLowerCase();
    
    if (fileExtension === 'pdf') {
      textContent = await extractTextFromPDF(file);
    } else if (['doc', 'docx'].includes(fileExtension)) {
      textContent = await extractTextFromWord(file);
    } else {
      throw new Error(`Unsupported file type: ${fileExtension}`);
    }
  } catch (error) {
    console.error('Error extracting text from file:', error);
    return generateCandidateFromFilename(file.name);
  }
  
  // Check if we got meaningful text
  if (!textContent || textContent.trim().length < 50) {
    console.warn('Could not extract meaningful text from CV');
    return generateCandidateFromFilename(file.name);
  }
  
  console.log('CV Parser - Extracted text preview:', textContent.substring(0, 500));
  
  // Step 2: Parse the extracted text using secure Cloud Function
  try {
    console.log('CV Parser - Using secure Cloud Function...');
    const result = await parseWithCloudFunction(textContent);
    
    return {
      ...result,
      rawText: textContent.substring(0, 5000),
    };
  } catch (error) {
    console.warn('Secure parsing failed, falling back to regex:', error.message);
  }
  
  // Fall back to regex-based parsing
  const regexParsedData = parseWithRegex(textContent, file.name);
  return {
    ...regexParsedData,
    rawText: textContent.substring(0, 5000),
    parsingMethod: 'regex',
    confidence: regexParsedData.email && regexParsedData.phone ? 'medium' : 'low'
  };
}

/**
 * Parse CV text using secure Cloud Function
 * @param {string} text - Extracted CV text
 * @returns {Promise<Object>} Parsed candidate data
 */
async function parseWithCloudFunction(text) {
  const parseCV = getParseFunction();
  
  const result = await parseCV({ cvText: text });
  
  if (!result.data.success) {
    throw new Error(result.data.error || 'Cloud Function parsing failed');
  }
  
  return result.data.data;
}

/**
 * Extract text from a PDF file using pdf.js (dynamically loaded)
 * @param {File} file - PDF file
 * @returns {Promise<string>} Extracted text
 */
async function extractTextFromPDF(file) {
  const pdfjs = await loadPdfJs();
  
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
  
  let fullText = '';
  
  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();
    const pageText = textContent.items
      .map(item => item.str)
      .join(' ');
    fullText += pageText + '\n';
  }
  
  return fullText.trim();
}

/**
 * Extract text from a Word document using mammoth.js (dynamically loaded)
 * @param {File} file - Word file (.doc or .docx)
 * @returns {Promise<string>} Extracted text
 */
async function extractTextFromWord(file) {
  const mammothLib = await loadMammoth();
  
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammothLib.extractRawText({ arrayBuffer });
  return result.value.trim();
}

/**
 * Parse CV text using Claude API
 * @param {string} text - Extracted CV text
/**
 * Parse CV text using regex patterns (fallback method)
 * @param {string} text - Extracted CV text
 * @param {string} filename - Original filename
 * @returns {Object} Parsed candidate data
 */
function parseWithRegex(text, filename) {
  // Keep original text for some patterns, normalize for others
  const normalizedText = text.replace(/\s+/g, ' ').trim();
  
  // For phone extraction, remove all spaces first to find numbers
  const textNoSpaces = text.replace(/\s/g, '');
  
  // Extract email - more flexible pattern
  const emailPatterns = [
    /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/gi,
    /[a-zA-Z0-9._%+-]+\s*@\s*[a-zA-Z0-9.-]+\s*\.\s*[a-zA-Z]{2,}/gi, // with spaces around @ and .
  ];
  
  let email = null;
  for (const pattern of emailPatterns) {
    const matches = normalizedText.match(pattern);
    if (matches && matches.length > 0) {
      email = matches[0].replace(/\s/g, '').toLowerCase();
      break;
    }
  }
  
  // Extract phone (UK formats) - very flexible patterns
  const phonePatterns = [
    // Patterns on text without spaces
    /(\+44|0044)?0?7\d{9}/, // UK mobile no spaces: 07123456789 or +447123456789
    /(\+44|0044)?0?[1-9]\d{9,10}/, // UK landline no spaces
    // Patterns on original text with various spacings
    /(?:\+44|0044|0)[\s.-]*7[\s.-]*\d{3}[\s.-]*\d{3}[\s.-]*\d{3}/,  // UK mobile with separators
    /(?:\+44|0044|0)[\s.-]*7[\s.-]*\d{2}[\s.-]*\d{3}[\s.-]*\d{4}/, // UK mobile alternate
    /(?:\+44|0044|0)[\s.-]*[1-9][\s.-]*\d{2,4}[\s.-]*\d{3}[\s.-]*\d{3,4}/, // UK landline
    /07\d[\s.-]*\d{2}[\s.-]*\d{3}[\s.-]*\d{3}/, // Simple UK mobile with separators
    /07\d{3}[\s.-]*\d{6}/, // 07xxx xxxxxx
    /07\d{3}[\s.-]*\d{3}[\s.-]*\d{3}/, // 07xxx xxx xxx
    /\+44[\s.-]*7[\s.-]*\d{3}[\s.-]*\d{3}[\s.-]*\d{3}/, // +44 7xxx xxx xxx
  ];
  
  let phone = null;
  
  // First try on text without spaces (catches numbers without formatting)
  for (const pattern of phonePatterns.slice(0, 2)) {
    const match = textNoSpaces.match(pattern);
    if (match) {
      phone = formatPhoneNumber(match[0]);
      break;
    }
  }
  
  // If not found, try on normalized text with separators
  if (!phone) {
    for (const pattern of phonePatterns.slice(2)) {
      const match = normalizedText.match(pattern);
      if (match) {
        phone = formatPhoneNumber(match[0]);
        break;
      }
    }
  }
  
  // Last resort - find any 11 digit number starting with 0 or +
  if (!phone) {
    const anyPhoneMatch = textNoSpaces.match(/(?:\+44|0)\d{10}/);
    if (anyPhoneMatch) {
      phone = formatPhoneNumber(anyPhoneMatch[0]);
    }
  }
  
  console.log('CV Parser - Extracted phone:', phone);
  console.log('CV Parser - Extracted email:', email);
  
  // Extract postcode (UK format)
  const postcodeMatch = normalizedText.match(/[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}/i);
  const postcode = postcodeMatch ? postcodeMatch[0].toUpperCase().replace(/\s+/g, ' ') : null;
  
  // Try to extract name - prioritize finding actual name in CV text
  let firstName = null;
  let lastName = null;
  
  // Method 1: Look for name patterns at the start of the CV
  // Common patterns: Name on its own line, or after "Name:", "CV", etc.
  const namePatterns = [
    // Name after CV header (e.g., "CV\nJessica Webb" or "CV Jessica Webb")
    /(?:^|\n)\s*(?:CV|Resume|Curriculum\s*Vitae)\s*[\n\r]+\s*([A-Z][a-z]+)\s+([A-Z][a-z]+)/i,
    // Name after "Name:" label
    /(?:Name|Full Name)\s*[:\-]?\s*([A-Z][a-z]+)\s+([A-Z][a-z]+)/i,
    // Two capitalized words at the very start (likely a name)
    /^[\s\n]*([A-Z][a-z]+)\s+([A-Z][a-z]+)(?:\s|$|\n)/,
    // Name on first line that's just a name (2-3 words, all capitalized first letter)
    /^[\s\n]*([A-Z][a-z]+)\s+(?:[A-Z][a-z]+\s+)?([A-Z][a-z]+)[\s\n]/,
  ];
  
  // Try each pattern on the original text (preserves line breaks)
  for (const pattern of namePatterns) {
    const match = text.match(pattern);
    if (match && match[1] && match[2]) {
      // Validate it's not an address or common word
      const skipWords = ['street', 'road', 'lane', 'drive', 'avenue', 'close', 'way', 'court', 'place', 'email', 'phone', 'mobile', 'address', 'personal', 'statement', 'education', 'experience', 'skills', 'summary', 'objective', 'profile'];
      const word1 = match[1].toLowerCase();
      const word2 = match[2].toLowerCase();
      if (!skipWords.includes(word1) && !skipWords.includes(word2)) {
        firstName = capitalizeFirst(match[1]);
        lastName = capitalizeFirst(match[2]);
        console.log('CV Parser - Found name from text pattern:', firstName, lastName);
        break;
      }
    }
  }
  
  // Method 2: If no name found, try to find any two capitalized words before the email/phone
  if (!firstName) {
    // Get text before the email or phone (likely contains the name)
    const emailIndex = text.toLowerCase().indexOf(email?.toLowerCase() || '~~~');
    const headerText = emailIndex > 0 ? text.substring(0, emailIndex) : text.substring(0, 500);
    
    // Look for two consecutive capitalized words
    const twoWordMatch = headerText.match(/([A-Z][a-z]+)\s+([A-Z][a-z]+)/);
    if (twoWordMatch) {
      const skipWords = ['street', 'road', 'lane', 'drive', 'avenue', 'close', 'way', 'court', 'place', 'email', 'phone', 'mobile', 'address', 'personal', 'statement', 'curriculum', 'vitae'];
      const word1 = twoWordMatch[1].toLowerCase();
      const word2 = twoWordMatch[2].toLowerCase();
      if (!skipWords.includes(word1) && !skipWords.includes(word2)) {
        firstName = capitalizeFirst(twoWordMatch[1]);
        lastName = capitalizeFirst(twoWordMatch[2]);
        console.log('CV Parser - Found name from header text:', firstName, lastName);
      }
    }
  }
  
  // Method 3: Try filename (often contains name like "CVJessicaWebb.pdf")
  if (!firstName) {
    const nameFromFile = parseNameFromFilename(filename);
    if (nameFromFile.firstName) {
      firstName = nameFromFile.firstName;
      lastName = nameFromFile.lastName;
      console.log('CV Parser - Found name from filename:', firstName, lastName);
    }
  }
  
  // Method 4: Last resort - try email (least reliable)
  if (!firstName && email) {
    const emailName = email.split('@')[0];
    // Only use if it has clear name parts (separated by . or _)
    const nameParts = emailName.split(/[._-]/).filter(p => p.length > 1 && !/\d/.test(p));
    if (nameParts.length >= 2) {
      firstName = capitalizeFirst(nameParts[0]);
      lastName = capitalizeFirst(nameParts[1]);
      console.log('CV Parser - Found name from email (separated):', firstName, lastName);
    }
  }
  
  // Check for pharmacy experience
  const pharmacyKeywords = [
    'dispens', 'pharmacist', 'pharmacy', 'pharmaceutical',
    'gphc', 'nhs', 'prescription', 'medication', 'healthcare',
    'counter assistant', 'pharmacy technician', 'pre-reg'
  ];
  const textLower = normalizedText.toLowerCase();
  const pharmacyExperience = pharmacyKeywords.some(kw => textLower.includes(kw));
  
  // Extract skills
  const skillKeywords = [
    'customer service', 'communication', 'teamwork', 'microsoft office',
    'excel', 'dispensing', 'patient care', 'attention to detail',
    'time management', 'problem solving', 'leadership', 'training'
  ];
  const skills = skillKeywords.filter(skill => textLower.includes(skill.toLowerCase()));
  
  // Generate summary
  let summary = null;
  if (pharmacyExperience) {
    summary = 'Candidate has pharmacy/healthcare experience.';
  } else if (skills.length > 0) {
    summary = `Key skills: ${skills.slice(0, 3).join(', ')}.`;
  }
  
  return {
    firstName,
    lastName,
    email,
    phone,
    address: null,
    postcode,
    currentJobTitle: null,
    yearsExperience: null,
    skills,
    summary,
    pharmacyExperience,
    qualifications: [],
    rightToWork: null
  };
}

/**
 * Generate basic candidate data from filename when text extraction fails
 * @param {string} filename - The filename
 * @returns {Object} Basic candidate data
 */
function generateCandidateFromFilename(filename) {
  const { firstName, lastName } = parseNameFromFilename(filename);
  
  return {
    firstName,
    lastName,
    email: null,
    phone: null,
    address: null,
    postcode: null,
    currentJobTitle: null,
    yearsExperience: null,
    skills: [],
    summary: `CV uploaded: ${filename}. Manual review required.`,
    pharmacyExperience: false,
    qualifications: [],
    rightToWork: null,
    parsingMethod: 'filename-only',
    confidence: 'low'
  };
}

/**
 * Parse name from filename
 * @param {string} filename 
 * @returns {Object} firstName and lastName
 */
function parseNameFromFilename(filename) {
  // Remove extension
  const nameWithoutExt = filename.replace(/\.[^.]+$/, '');
  
  // Clean up common CV-related text
  const cleaned = nameWithoutExt
    .replace(/[-_]/g, ' ')
    .replace(/cv|resume|curriculum\s*vitae/gi, '')
    .replace(/\d{4}|\d{2}/g, '') // Remove years/dates
    .replace(/\(.*?\)/g, '') // Remove parenthetical content
    .replace(/\s+/g, ' ')
    .trim();
  
  const parts = cleaned.split(' ').filter(p => p.length > 1);
  
  if (parts.length >= 2) {
    return {
      firstName: capitalizeFirst(parts[0]),
      lastName: capitalizeFirst(parts[parts.length - 1])
    };
  } else if (parts.length === 1) {
    return {
      firstName: capitalizeFirst(parts[0]),
      lastName: null
    };
  }
  
  return { firstName: null, lastName: null };
}

/**
 * Format phone number to consistent format
 * @param {string} phone 
 * @returns {string|null}
 */
function formatPhoneNumber(phone) {
  if (!phone) return null;
  
  // Remove all non-digit characters except +
  let cleaned = phone.replace(/[^\d+]/g, '');
  
  // Convert 0044 to +44
  if (cleaned.startsWith('0044')) {
    cleaned = '+44' + cleaned.substring(4);
  }
  
  // Convert leading 0 to +44 for UK numbers
  if (cleaned.startsWith('0') && cleaned.length === 11) {
    cleaned = '+44' + cleaned.substring(1);
  }
  
  return cleaned || null;
}

/**
 * Capitalize first letter of a string
 * @param {string} str 
 * @returns {string}
 */
function capitalizeFirst(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

// ============================================
// DEPRECATED - API key functions no longer needed
// CV parsing now uses secure Cloud Function
// ============================================

/**
 * @deprecated API key is now stored securely in Firebase Secrets
 * This function is kept for backwards compatibility but does nothing
 */
export function storeApiKey(apiKey) {
  console.warn('storeApiKey is deprecated. API key is now stored securely in Firebase Secrets.');
}

/**
 * @deprecated API key is now stored securely in Firebase Secrets
 */
export function clearApiKey() {
  console.warn('clearApiKey is deprecated. API key is now stored securely in Firebase Secrets.');
  // Clear any legacy stored key
  try {
    localStorage.removeItem('claude_api_key');
  } catch {
    // Ignore errors
  }
}

/**
 * @deprecated CV parsing now uses Cloud Function automatically
 * @returns {boolean} Always returns true (Cloud Function handles API key)
 */
export function hasApiKey() {
  return true; // Cloud Function has the key
}

/**
 * Validate parsed data quality
 * @param {Object} data - Parsed candidate data
 * @returns {Object} Validation result with issues
 */
export function validateParsedData(data) {
  const issues = [];
  
  if (!data.firstName) {
    issues.push('First name not found - manual entry required');
  }
  
  if (!data.email) {
    issues.push('Email address not found - manual entry required');
  }
  
  if (!data.phone) {
    issues.push('Phone number not found - manual entry required');
  }
  
  return {
    isValid: issues.length === 0,
    issues,
    confidence: data.confidence || 'unknown',
    parsingMethod: data.parsingMethod || 'unknown'
  };
}
