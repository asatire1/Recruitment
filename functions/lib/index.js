"use strict";
/**
 * Allied Recruitment Portal - Cloud Functions
 * R3.1: CV Parsing Cloud Function
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseIndeedJob = exports.submitBooking = exports.getBookingTimeSlots = exports.getBookingAvailability = exports.onTrialCompleted = exports.sendFeedbackReminders = exports.onTrialCreated = exports.createUserWithPassword = exports.sendBookingConfirmation = exports.markBookingLinkUsed = exports.validateBookingToken = exports.createBookingLink = exports.healthCheck = exports.parseCV = void 0;
const https_1 = require("firebase-functions/v2/https");
const options_1 = require("firebase-functions/v2/options");
const params_1 = require("firebase-functions/params");
const admin = __importStar(require("firebase-admin"));
const sdk_1 = __importDefault(require("@anthropic-ai/sdk"));
const mammoth = __importStar(require("mammoth"));
const pdf_parse_1 = __importDefault(require("pdf-parse"));
// Define the secret
const anthropicApiKey = (0, params_1.defineSecret)('ANTHROPIC_API_KEY');
// Initialize Firebase Admin
admin.initializeApp();
// Set global options
(0, options_1.setGlobalOptions)({
    region: 'us-central1', // Default region (matching existing functions)
    maxInstances: 10,
});
// ============================================================================
// TEXT EXTRACTION
// ============================================================================
/**
 * Extract text from PDF using pdf-parse
 */
async function extractTextFromPDF(buffer) {
    try {
        const data = await (0, pdf_parse_1.default)(buffer);
        return data.text;
    }
    catch (error) {
        console.error('PDF extraction error:', error);
        throw new Error('Failed to extract text from PDF');
    }
}
/**
 * Extract text from DOCX using mammoth
 */
async function extractTextFromDOCX(buffer) {
    try {
        const result = await mammoth.extractRawText({ buffer });
        return result.value;
    }
    catch (error) {
        console.error('DOCX extraction error:', error);
        throw new Error('Failed to extract text from Word document');
    }
}
/**
 * Extract text from file based on MIME type
 */
async function extractText(buffer, mimeType) {
    if (mimeType === 'application/pdf') {
        return extractTextFromPDF(buffer);
    }
    else if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        mimeType === 'application/msword') {
        return extractTextFromDOCX(buffer);
    }
    else if (mimeType === 'text/plain') {
        return buffer.toString('utf-8');
    }
    else {
        throw new Error(`Unsupported file type: ${mimeType}`);
    }
}
// ============================================================================
// REGEX-BASED FALLBACK PARSING (No AI)
// ============================================================================
/**
 * Parse CV text using regex patterns (fallback when AI is unavailable)
 */
function parseWithRegex(text) {
    // Email pattern
    const emailMatch = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/i);
    const email = emailMatch ? emailMatch[0].toLowerCase() : null;
    // UK Phone patterns (mobile and landline)
    const phonePatterns = [
        /(?:(?:\+44\s?|0)7\d{3}\s?\d{3}\s?\d{3})/, // Mobile: 07xxx xxx xxx or +44 7xxx xxx xxx
        /(?:(?:\+44\s?|0)\d{2,4}\s?\d{3}\s?\d{4})/, // Landline: 01onal xxx xxxx
        /07\d{9}/, // Mobile no spaces
        /(?:\+44|0)\s*\d[\d\s]{9,}/, // General UK
    ];
    let phone = null;
    for (const pattern of phonePatterns) {
        const match = text.match(pattern);
        if (match) {
            phone = match[0].replace(/\s+/g, ' ').trim();
            break;
        }
    }
    // UK Postcode pattern
    const postcodeMatch = text.match(/[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}/i);
    const postcode = postcodeMatch ? postcodeMatch[0].toUpperCase().replace(/\s*/g, ' ').trim() : null;
    // Name extraction - look for name at the start or after common headers
    let firstName = null;
    let lastName = null;
    // Try to find name at the very beginning (first line that looks like a name)
    const lines = text.split(/\n/).map(l => l.trim()).filter(l => l.length > 0);
    for (let i = 0; i < Math.min(10, lines.length); i++) {
        const line = lines[i];
        // Skip lines that look like headers, emails, phones, addresses
        if (line.match(/^(curriculum|resume|cv|profile|contact|email|phone|address|summary|objective)/i))
            continue;
        if (line.includes('@'))
            continue;
        if (line.match(/^\d/) || line.match(/^[\+\(]/))
            continue;
        if (line.length > 50)
            continue;
        // Check if line looks like a name (2-4 words, each starting with capital)
        const words = line.split(/\s+/).filter(w => w.length > 1);
        if (words.length >= 2 && words.length <= 4) {
            const looksLikeName = words.every(w => /^[A-Z][a-z]+$/.test(w) || /^[A-Z]+$/.test(w));
            if (looksLikeName) {
                firstName = words[0];
                lastName = words.slice(1).join(' ');
                break;
            }
        }
        // Also try: if first line is just a capitalized phrase
        if (i === 0 && words.length >= 2 && words.length <= 4) {
            const allCaps = words.every(w => /^[A-Z]/.test(w));
            if (allCaps) {
                firstName = words[0];
                lastName = words.slice(1).join(' ');
                break;
            }
        }
    }
    // Try name extraction from "Name:" pattern
    if (!firstName) {
        const nameMatch = text.match(/(?:name|full\s*name)\s*[:\-]?\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/i);
        if (nameMatch) {
            const nameParts = nameMatch[1].trim().split(/\s+/);
            firstName = nameParts[0];
            lastName = nameParts.slice(1).join(' ');
        }
    }
    // Extract address (look for street-like patterns)
    let address = null;
    const addressMatch = text.match(/\d+\s+[A-Za-z]+(?:\s+[A-Za-z]+)*(?:\s+(?:Street|St|Road|Rd|Avenue|Ave|Lane|Ln|Drive|Dr|Close|Way|Court|Ct|Place|Pl|Crescent|Gardens?))/i);
    if (addressMatch) {
        address = addressMatch[0];
    }
    // Look for pharmacy qualifications
    const qualifications = [];
    const qualPatterns = [
        /GPhC(?:\s+(?:registered|registration))?/gi,
        /NVQ\s*(?:Level\s*)?\d/gi,
        /BTEC(?:\s+in\s+[A-Za-z\s]+)?/gi,
        /MPharm/gi,
        /(?:Accuracy\s+Checking\s+)?Technician/gi,
        /ACT(?:\s+qualified)?/gi,
        /Dispensing\s+(?:Assistant|Technician)/gi,
        /Medicine[s]?\s+Counter\s+Assistant/gi,
        /MCA/g,
        /DBS\s+(?:Check(?:ed)?|Cleared)/gi,
    ];
    for (const pattern of qualPatterns) {
        const matches = text.match(pattern);
        if (matches) {
            matches.forEach(m => {
                if (!qualifications.includes(m.trim())) {
                    qualifications.push(m.trim());
                }
            });
        }
    }
    // Extract skills (common pharmacy/healthcare terms)
    const skills = [];
    const skillTerms = [
        'dispensing', 'customer service', 'patient care', 'stock control',
        'prescription', 'medication', 'pharmaceutical', 'NHS', 'retail',
        'communication', 'team work', 'attention to detail', 'pharmacy',
        'healthcare', 'clinical', 'counter sales', 'stock management',
    ];
    const textLower = text.toLowerCase();
    skillTerms.forEach(skill => {
        if (textLower.includes(skill.toLowerCase()) && !skills.includes(skill)) {
            skills.push(skill.charAt(0).toUpperCase() + skill.slice(1));
        }
    });
    // Try to extract years of experience from text patterns
    let totalYearsExperience = null;
    let pharmacyYearsExperience = null;
    // Look for patterns like "X years experience" or "X+ years"
    const yearsMatch = text.match(/(\d+)\+?\s*years?\s*(?:of\s+)?(?:experience|working)/i);
    if (yearsMatch) {
        totalYearsExperience = parseInt(yearsMatch[1], 10);
    }
    // Look for pharmacy-specific experience
    const pharmacyYearsMatch = text.match(/(\d+)\+?\s*years?\s*(?:of\s+)?(?:pharmacy|pharmaceutical|dispensing|healthcare)/i);
    if (pharmacyYearsMatch) {
        pharmacyYearsExperience = parseInt(pharmacyYearsMatch[1], 10);
    }
    // Generate a basic summary from qualifications and skills
    let summary = null;
    if (qualifications.length > 0 || skills.length > 0) {
        const parts = [];
        if (qualifications.length > 0) {
            parts.push(qualifications.slice(0, 3).join(', '));
        }
        if (totalYearsExperience) {
            parts.push(`${totalYearsExperience} years experience`);
        }
        if (parts.length > 0) {
            summary = parts.join('. ');
            if (summary.length > 200)
                summary = summary.substring(0, 197) + '...';
        }
    }
    // Calculate confidence scores
    const confidence = {
        firstName: firstName ? 70 : 0,
        lastName: lastName ? 70 : 0,
        email: email ? 95 : 0,
        phone: phone ? 85 : 0,
        overall: 0,
    };
    const foundFields = [firstName, lastName, email, phone].filter(f => f !== null).length;
    confidence.overall = Math.round((foundFields / 4) * 100);
    return {
        firstName,
        lastName,
        email,
        phone,
        address,
        postcode,
        summary,
        experience: [],
        education: [],
        qualifications,
        skills,
        rightToWork: textLower.includes('right to work') || textLower.includes('eligible to work') ? true : null,
        hasDriversLicense: textLower.includes('driving licen') || textLower.includes('driver') ? true : null,
        totalYearsExperience,
        pharmacyYearsExperience,
        confidence,
        rawText: text,
        usedAI: false,
    };
}
// ============================================================================
// CLAUDE AI PARSING
// ============================================================================
const CV_PARSING_PROMPT = `You are an expert CV/resume parser for a UK pharmacy recruitment system. Extract structured information from the following CV text.

Return a JSON object with these fields:
{
  "firstName": "string or null",
  "lastName": "string or null",
  "email": "string or null",
  "phone": "string or null (UK format preferred, e.g., 07123 456789)",
  "address": "string or null (street address without postcode)",
  "postcode": "string or null (UK postcode format, e.g., M1 1AA)",
  "summary": "string or null (brief professional summary, max 200 chars)",
  "experience": [
    {
      "title": "job title",
      "company": "company name",
      "startDate": "YYYY-MM or null",
      "endDate": "YYYY-MM or null",
      "current": true/false,
      "description": "brief description or null"
    }
  ],
  "education": [
    {
      "institution": "school/university name",
      "qualification": "degree/certificate name",
      "field": "field of study or null",
      "year": "graduation year or null"
    }
  ],
  "qualifications": ["list of professional qualifications, e.g., GPhC, NVQ Level 2"],
  "skills": ["list of relevant skills"],
  "rightToWork": true/false/null (if mentioned),
  "hasDriversLicense": true/false/null (if mentioned),
  "totalYearsExperience": number or null (calculate total years of work experience from dates),
  "pharmacyYearsExperience": number or null (calculate years specifically in pharmacy/healthcare roles),
  "confidence": {
    "firstName": 0-100,
    "lastName": 0-100,
    "email": 0-100,
    "phone": 0-100,
    "overall": 0-100
  }
}

Pharmacy-specific qualifications to look for:
- GPhC Registration (General Pharmaceutical Council)
- NVQ Level 2/3 in Pharmacy Services
- BTEC in Pharmaceutical Science
- MPharm (Master of Pharmacy)
- Dispensing Assistant qualifications
- Medicines Counter Assistant (MCA)
- Accuracy Checking Technician (ACT)
- DBS Check

Important:
1. Extract UK phone numbers, normalizing to a consistent format
2. Extract UK postcodes correctly
3. Identify pharmacy-relevant qualifications and skills
4. Set confidence scores based on how clearly the data was found
5. For experience, list most recent first
6. If data is ambiguous or not found, use null
7. Calculate totalYearsExperience by summing up all work experience durations
8. Calculate pharmacyYearsExperience for roles containing: pharmacy, pharmacist, dispenser, dispensing, healthcare, NHS, clinical, medical
9. Write a concise summary (max 200 chars) highlighting key qualifications and experience
10. Return ONLY valid JSON, no other text

CV Text:
`;
/**
 * Parse CV text using Claude API
 */
async function parseWithClaude(text, apiKey) {
    if (!apiKey) {
        throw new Error('ANTHROPIC_API_KEY not configured');
    }
    const anthropic = new sdk_1.default({ apiKey });
    const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        messages: [
            {
                role: 'user',
                content: CV_PARSING_PROMPT + text.substring(0, 15000), // Limit text length
            },
        ],
    });
    // Extract the text content
    const content = response.content[0];
    if (content.type !== 'text') {
        throw new Error('Unexpected response type from Claude');
    }
    // Parse the JSON response
    try {
        // Try to extract JSON from the response (Claude might wrap it in markdown)
        let jsonText = content.text;
        const jsonMatch = jsonText.match(/```json\s*([\s\S]*?)\s*```/);
        if (jsonMatch) {
            jsonText = jsonMatch[1];
        }
        const parsed = JSON.parse(jsonText);
        return {
            ...parsed,
            rawText: text,
            usedAI: true,
        };
    }
    catch (error) {
        console.error('Failed to parse Claude response:', content.text);
        throw new Error('Failed to parse CV extraction response');
    }
}
// ============================================================================
// CLOUD FUNCTION
// ============================================================================
/**
 * Parse CV Cloud Function
 *
 * Accepts a file URL from Firebase Storage and returns structured CV data
 */
exports.parseCV = (0, https_1.onCall)({
    timeoutSeconds: 60,
    memory: '512MiB',
    enforceAppCheck: false, // Enable in production
    secrets: [anthropicApiKey], // Make secret available to function
}, async (request) => {
    // Verify authentication
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'User must be authenticated');
    }
    const { fileUrl, fileName, mimeType } = request.data;
    // Validate input
    if (!fileUrl || !fileName || !mimeType) {
        throw new https_1.HttpsError('invalid-argument', 'Missing required fields: fileUrl, fileName, mimeType');
    }
    console.log(`Parsing CV: ${fileName} (${mimeType})`);
    try {
        // Download file from Firebase Storage
        const bucket = admin.storage().bucket();
        // Extract file path from URL
        // URL format: https://firebasestorage.googleapis.com/v0/b/BUCKET/o/PATH?alt=media&token=TOKEN
        const urlPath = new URL(fileUrl).pathname;
        const encodedPath = urlPath.split('/o/')[1]?.split('?')[0];
        if (!encodedPath) {
            throw new https_1.HttpsError('invalid-argument', 'Invalid file URL format');
        }
        const filePath = decodeURIComponent(encodedPath);
        const file = bucket.file(filePath);
        // Check if file exists
        const [exists] = await file.exists();
        if (!exists) {
            throw new https_1.HttpsError('not-found', 'File not found in storage');
        }
        // Download file
        const [buffer] = await file.download();
        // Extract text
        console.log('Extracting text...');
        const text = await extractText(buffer, mimeType);
        if (!text || text.trim().length < 50) {
            throw new https_1.HttpsError('failed-precondition', 'Could not extract sufficient text from file');
        }
        console.log(`Extracted ${text.length} characters`);
        // Try parsing with Claude AI first, fallback to regex
        let parsedData;
        let usedAI = false;
        // Get API key from secret
        const apiKey = anthropicApiKey.value();
        try {
            console.log('Attempting to parse with Claude AI...');
            parsedData = await parseWithClaude(text, apiKey);
            usedAI = true;
            console.log('CV parsed successfully with AI:', {
                name: `${parsedData.firstName} ${parsedData.lastName}`,
                email: parsedData.email,
                confidence: parsedData.confidence.overall,
            });
        }
        catch (aiError) {
            console.log('Claude AI parsing failed, using regex fallback:', aiError instanceof Error ? aiError.message : aiError);
            // Fallback to regex-based parsing
            parsedData = parseWithRegex(text);
            console.log('CV parsed with regex fallback:', {
                name: `${parsedData.firstName} ${parsedData.lastName}`,
                email: parsedData.email,
                phone: parsedData.phone,
                confidence: parsedData.confidence.overall,
            });
        }
        return {
            success: true,
            data: parsedData,
            usedAI,
        };
    }
    catch (error) {
        console.error('CV parsing error:', error);
        if (error instanceof https_1.HttpsError) {
            throw error;
        }
        const message = error instanceof Error ? error.message : 'Unknown error';
        throw new https_1.HttpsError('internal', `CV parsing failed: ${message}`);
    }
});
/**
 * Health check function for testing
 */
exports.healthCheck = (0, https_1.onCall)({ timeoutSeconds: 10 }, async () => {
    return {
        status: 'ok',
        timestamp: new Date().toISOString(),
        region: 'europe-west2',
    };
});
/**
 * Generate a cryptographically secure token
 * Uses Node.js crypto for server-side security
 */
function generateSecureToken(length = 21) {
    const crypto = require('crypto');
    const bytes = crypto.randomBytes(length);
    // Convert to URL-safe base64
    return bytes.toString('base64url').substring(0, length);
}
/**
 * Hash a token using SHA-256
 */
function hashToken(token) {
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(token).digest('hex');
}
/**
 * Create Booking Link Cloud Function
 *
 * Generates a secure booking link for interview/trial scheduling.
 * Token is only returned once; only the hash is stored in Firestore.
 * Fetches availability settings to determine default duration.
 */
exports.createBookingLink = (0, https_1.onCall)({
    timeoutSeconds: 30,
    memory: '256MiB',
    enforceAppCheck: false, // Enable in production
}, async (request) => {
    // Verify authentication
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'User must be authenticated');
    }
    const { candidateId, candidateName, candidateEmail, type, jobId, jobTitle, branchId, branchName, branchAddress, location, duration: customDuration, expiryDays = 3, maxUses = 1, notes } = request.data;
    // Validate required fields
    if (!candidateId || !candidateName || !type) {
        throw new https_1.HttpsError('invalid-argument', 'Missing required fields: candidateId, candidateName, type');
    }
    if (!['interview', 'trial'].includes(type)) {
        throw new https_1.HttpsError('invalid-argument', 'Type must be "interview" or "trial"');
    }
    console.log(`Creating booking link for candidate: ${candidateName} (${candidateId}), type: ${type}`);
    try {
        const db = admin.firestore();
        // Fetch availability settings to get default duration
        let duration = customDuration;
        if (!duration) {
            try {
                const availabilityDoc = await db.collection('settings').doc('availability').get();
                if (availabilityDoc.exists) {
                    const availabilityData = availabilityDoc.data();
                    const interviewTypes = availabilityData?.interviewTypes;
                    if (interviewTypes && interviewTypes[type]) {
                        duration = interviewTypes[type].duration;
                    }
                }
            }
            catch (err) {
                console.log('Could not fetch availability settings, using defaults');
            }
            // Fallback defaults
            if (!duration) {
                duration = type === 'interview' ? 30 : 240; // 30 min interview, 4 hour trial
            }
        }
        // Generate secure token
        const token = generateSecureToken(21);
        const tokenHash = hashToken(token);
        // Calculate expiry
        const expiresAt = admin.firestore.Timestamp.fromDate(new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000));
        // Prepare document with enhanced fields
        const bookingLinkDoc = {
            tokenHash,
            candidateId,
            candidateName,
            candidateEmail: candidateEmail || null,
            type,
            duration, // Duration in minutes
            jobId: jobId || null,
            jobTitle: jobTitle || null,
            branchId: branchId || null,
            branchName: branchName || location || null, // Support legacy location field
            branchAddress: branchAddress || null,
            notes: notes || null,
            status: 'active',
            expiresAt,
            maxUses,
            useCount: 0,
            requireEmailVerification: false,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            createdBy: request.auth.uid,
        };
        // Store in Firestore (token hash only, never the raw token)
        const docRef = await db.collection('bookingLinks').add(bookingLinkDoc);
        // Generate URL - Firebase Hosting URL
        const baseUrl = 'https://allied-booking.web.app/book';
        const url = `${baseUrl}/${token}`;
        console.log(`Booking link created: ${docRef.id}, type: ${type}, duration: ${duration}min, expires: ${expiresAt.toDate().toISOString()}`);
        return {
            success: true,
            id: docRef.id,
            url,
            expiresAt: expiresAt.toDate().toISOString(),
            duration,
        };
    }
    catch (error) {
        console.error('Error creating booking link:', error);
        if (error instanceof https_1.HttpsError) {
            throw error;
        }
        const message = error instanceof Error ? error.message : 'Unknown error';
        throw new https_1.HttpsError('internal', `Failed to create booking link: ${message}`);
    }
});
exports.validateBookingToken = (0, https_1.onCall)({
    timeoutSeconds: 10,
    memory: '256MiB',
    enforceAppCheck: false, // Public function
}, async (request) => {
    // Note: This function does NOT require authentication
    // It's used by the public booking page
    const { token } = request.data;
    if (!token) {
        throw new https_1.HttpsError('invalid-argument', 'Token is required');
    }
    console.log('Validating booking token...');
    try {
        const db = admin.firestore();
        const tokenHash = hashToken(token);
        // Find booking link by token hash
        const snapshot = await db.collection('bookingLinks')
            .where('tokenHash', '==', tokenHash)
            .where('status', '==', 'active')
            .limit(1)
            .get();
        if (snapshot.empty) {
            console.log('Token not found or not active');
            return {
                valid: false,
                error: 'Invalid or expired booking link',
            };
        }
        const doc = snapshot.docs[0];
        const data = doc.data();
        // Check expiry
        const expiresAt = data.expiresAt.toDate();
        if (expiresAt < new Date()) {
            // Mark as expired
            await doc.ref.update({ status: 'expired' });
            console.log('Token expired');
            return {
                valid: false,
                error: 'This booking link has expired',
            };
        }
        // Check max uses
        if (data.useCount >= data.maxUses) {
            await doc.ref.update({ status: 'used' });
            console.log('Token max uses reached');
            return {
                valid: false,
                error: 'This booking link has already been used',
            };
        }
        // Fetch availability settings based on booking type (interview or trial)
        let availabilitySettings;
        try {
            // Use type-specific availability settings
            const settingsDocName = data.type === 'trial'
                ? 'trialAvailability'
                : 'interviewAvailability';
            // Try to get type-specific settings first
            let availabilityDoc = await db.collection('settings').doc(settingsDocName).get();
            // Fall back to legacy 'availability' document if type-specific doesn't exist
            if (!availabilityDoc.exists) {
                availabilityDoc = await db.collection('settings').doc('availability').get();
            }
            if (availabilityDoc.exists) {
                const avail = availabilityDoc.data();
                // For trials, use trialDuration (fixed 4 hours), otherwise slotDuration
                const slotDuration = data.type === 'trial'
                    ? (avail?.trialDuration || 240) // 4 hours for trials
                    : (avail?.slotDuration || 30); // 30 mins for interviews
                availabilitySettings = {
                    slotDuration: slotDuration,
                    bufferTime: avail?.bufferTime || (data.type === 'trial' ? 30 : 15),
                    maxAdvanceBooking: avail?.maxAdvanceBooking || (data.type === 'trial' ? 21 : 14),
                    minNoticeHours: avail?.minNoticeHours || (data.type === 'trial' ? 48 : 24),
                    maxTrialsPerDay: avail?.maxTrialsPerDay || 2, // Only relevant for trials
                    slots: avail?.slots || [],
                    blockedDates: avail?.blockedDates?.map((d) => d.toDate ? d.toDate().toISOString().split('T')[0] : d) || [],
                };
            }
            else {
                // Provide sensible defaults based on type
                if (data.type === 'trial') {
                    availabilitySettings = {
                        slotDuration: 240, // 4 hours
                        bufferTime: 30,
                        maxAdvanceBooking: 21,
                        minNoticeHours: 48,
                        maxTrialsPerDay: 2,
                        slots: [
                            { dayOfWeek: 1, startTime: '09:00', endTime: '17:00', enabled: true },
                            { dayOfWeek: 2, startTime: '09:00', endTime: '17:00', enabled: true },
                            { dayOfWeek: 3, startTime: '09:00', endTime: '17:00', enabled: true },
                            { dayOfWeek: 4, startTime: '09:00', endTime: '17:00', enabled: true },
                            { dayOfWeek: 5, startTime: '09:00', endTime: '17:00', enabled: true },
                        ],
                        blockedDates: [],
                    };
                }
                else {
                    availabilitySettings = {
                        slotDuration: 30,
                        bufferTime: 15,
                        maxAdvanceBooking: 14,
                        minNoticeHours: 24,
                        slots: [
                            { dayOfWeek: 1, startTime: '09:00', endTime: '17:00', enabled: true },
                            { dayOfWeek: 2, startTime: '09:00', endTime: '17:00', enabled: true },
                            { dayOfWeek: 3, startTime: '09:00', endTime: '17:00', enabled: true },
                            { dayOfWeek: 4, startTime: '09:00', endTime: '17:00', enabled: true },
                            { dayOfWeek: 5, startTime: '09:00', endTime: '17:00', enabled: true },
                        ],
                        blockedDates: [],
                    };
                }
            }
        }
        catch (err) {
            console.log('Could not fetch availability settings:', err);
        }
        console.log(`Token valid for: ${data.candidateName}, type: ${data.type}, duration: ${data.duration}min`);
        return {
            valid: true,
            data: {
                id: doc.id,
                candidateId: data.candidateId,
                candidateName: data.candidateName,
                candidateEmail: data.candidateEmail,
                type: data.type,
                duration: data.duration || (data.type === 'interview' ? 30 : 240),
                jobId: data.jobId,
                jobTitle: data.jobTitle,
                branchId: data.branchId,
                branchName: data.branchName || data.location,
                branchAddress: data.branchAddress,
                notes: data.notes,
                expiresAt: expiresAt.toISOString(),
            },
            availabilitySettings,
        };
    }
    catch (error) {
        console.error('Error validating token:', error);
        const message = error instanceof Error ? error.message : 'Unknown error';
        throw new https_1.HttpsError('internal', `Failed to validate token: ${message}`);
    }
});
exports.markBookingLinkUsed = (0, https_1.onCall)({
    timeoutSeconds: 10,
    memory: '256MiB',
    enforceAppCheck: false,
}, async (request) => {
    const { bookingLinkId, interviewId } = request.data;
    if (!bookingLinkId) {
        throw new https_1.HttpsError('invalid-argument', 'bookingLinkId is required');
    }
    console.log(`Marking booking link as used: ${bookingLinkId}`);
    try {
        const db = admin.firestore();
        const linkRef = db.collection('bookingLinks').doc(bookingLinkId);
        const linkDoc = await linkRef.get();
        if (!linkDoc.exists) {
            throw new https_1.HttpsError('not-found', 'Booking link not found');
        }
        await linkRef.update({
            useCount: admin.firestore.FieldValue.increment(1),
            status: 'used',
            usedAt: admin.firestore.FieldValue.serverTimestamp(),
            ...(interviewId && { interviewId }),
        });
        console.log('Booking link marked as used');
        return { success: true };
    }
    catch (error) {
        console.error('Error marking booking link used:', error);
        if (error instanceof https_1.HttpsError) {
            throw error;
        }
        const message = error instanceof Error ? error.message : 'Unknown error';
        throw new https_1.HttpsError('internal', `Failed to mark booking link used: ${message}`);
    }
});
/**
 * Generate ICS calendar file content
 */
function generateICSFile(title, description, location, startDate, endDate, organizerEmail = 'recruitment@alliedpharmacies.co.uk') {
    const formatDate = (date) => {
        return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    };
    const uid = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}@alliedpharmacies.co.uk`;
    return `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Allied Pharmacies//Recruitment Portal//EN
CALSCALE:GREGORIAN
METHOD:REQUEST
BEGIN:VEVENT
UID:${uid}
DTSTART:${formatDate(startDate)}
DTEND:${formatDate(endDate)}
SUMMARY:${title}
DESCRIPTION:${description.replace(/\n/g, '\\n')}
LOCATION:${location}
ORGANIZER;CN=Allied Pharmacies Recruitment:mailto:${organizerEmail}
STATUS:CONFIRMED
SEQUENCE:0
BEGIN:VALARM
TRIGGER:-PT1H
ACTION:DISPLAY
DESCRIPTION:Reminder: ${title}
END:VALARM
BEGIN:VALARM
TRIGGER:-PT1D
ACTION:DISPLAY
DESCRIPTION:Reminder: ${title} tomorrow
END:VALARM
END:VEVENT
END:VCALENDAR`;
}
/**
 * Send booking confirmation emails to candidate and pharmacy
 */
exports.sendBookingConfirmation = (0, https_1.onCall)({
    region: 'us-central1',
    maxInstances: 10,
}, async (request) => {
    const data = request.data;
    const { interviewId, candidateName, candidateEmail, interviewType, scheduledAt, duration, jobTitle, branchName, branchId } = data;
    if (!interviewId) {
        throw new https_1.HttpsError('invalid-argument', 'interviewId is required');
    }
    console.log(`Sending booking confirmation for interview: ${interviewId}`);
    const db = admin.firestore();
    const scheduledDate = new Date(scheduledAt);
    const endDate = new Date(scheduledDate.getTime() + duration * 60000);
    // Format date for display
    const dateOptions = {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Europe/London'
    };
    const formattedDate = scheduledDate.toLocaleDateString('en-GB', dateOptions);
    const typeLabel = interviewType === 'trial' ? 'Trial Shift' : 'Interview';
    const title = `${typeLabel}${jobTitle ? ` - ${jobTitle}` : ''} with Allied Pharmacies`;
    // Get branch details if we have a branchId
    let branchAddress = '';
    let branchEmail = '';
    if (branchId) {
        try {
            const branchDoc = await db.collection('branches').doc(branchId).get();
            if (branchDoc.exists) {
                const branchData = branchDoc.data();
                branchAddress = branchData?.address || '';
                branchEmail = branchData?.email || branchData?.managerEmail || '';
            }
        }
        catch (err) {
            console.warn('Could not fetch branch details:', err);
        }
    }
    const location = branchAddress || branchName || 'To be confirmed';
    // Generate ICS file
    const icsContent = generateICSFile(title, `Your ${typeLabel.toLowerCase()} has been scheduled.\\n\\nCandidate: ${candidateName}\\nPosition: ${jobTitle || 'Not specified'}\\nLocation: ${location}\\nDuration: ${duration} minutes`, location, scheduledDate, endDate);
    // Store notification record
    const notificationData = {
        type: 'booking_confirmation',
        interviewId,
        candidateName,
        candidateEmail: candidateEmail || null,
        interviewType,
        scheduledAt: admin.firestore.Timestamp.fromDate(scheduledDate),
        duration,
        jobTitle: jobTitle || null,
        branchName: branchName || null,
        branchId: branchId || null,
        branchEmail: branchEmail || null,
        status: 'pending',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        // Store email content for debugging/retry
        emailContent: {
            candidateSubject: `Booking Confirmed: ${title}`,
            candidateBody: `Dear ${candidateName},\n\nYour ${typeLabel.toLowerCase()} has been successfully booked.\n\n📅 Date & Time: ${formattedDate}\n📍 Location: ${location}\n⏱️ Duration: ${duration} minutes\n\nPlease add this to your calendar using the attached .ics file.\n\nIf you need to reschedule or cancel, please contact us as soon as possible.\n\nBest regards,\nAllied Pharmacies Recruitment Team`,
            pharmacySubject: `New ${typeLabel} Booking: ${candidateName}`,
            pharmacyBody: `A new ${typeLabel.toLowerCase()} has been self-booked by a candidate.\n\n👤 Candidate: ${candidateName}\n📅 Date & Time: ${formattedDate}\n📍 Location: ${location}\n💼 Position: ${jobTitle || 'Not specified'}\n⏱️ Duration: ${duration} minutes\n\nThe candidate has received a confirmation email with a calendar invite.\n\nPlease ensure someone is available to conduct the ${typeLabel.toLowerCase()}.`,
            icsFile: icsContent
        }
    };
    try {
        await db.collection('emailNotifications').add(notificationData);
        console.log('Email notification record created');
        // Send candidate confirmation email via Firebase Extension
        if (candidateEmail) {
            await db.collection('mail').add({
                to: candidateEmail,
                message: {
                    subject: `Booking Confirmed: ${title}`,
                    html: `
              <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="background: linear-gradient(135deg, #0d9488 0%, #14b8a6 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
                  <h1 style="color: white; margin: 0; font-size: 24px;">Booking Confirmed</h1>
                </div>
                <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 12px 12px;">
                  <p style="font-size: 16px; color: #374151;">Dear ${candidateName},</p>
                  <p style="font-size: 16px; color: #374151;">Your ${typeLabel.toLowerCase()} has been successfully booked.</p>
                  
                  <div style="background: white; border-radius: 8px; padding: 20px; margin: 20px 0; border: 1px solid #e5e7eb;">
                    <p style="margin: 8px 0; font-size: 15px;"><strong>📅 Date & Time:</strong> ${formattedDate}</p>
                    <p style="margin: 8px 0; font-size: 15px;"><strong>📍 Location:</strong> ${location}</p>
                    <p style="margin: 8px 0; font-size: 15px;"><strong>⏱️ Duration:</strong> ${duration} minutes</p>
                    ${jobTitle ? `<p style="margin: 8px 0; font-size: 15px;"><strong>💼 Position:</strong> ${jobTitle}</p>` : ''}
                  </div>
                  
                  <p style="font-size: 14px; color: #6b7280;">Please add this to your calendar using the attached .ics file.</p>
                  <p style="font-size: 14px; color: #6b7280;">If you need to reschedule or cancel, please contact us as soon as possible.</p>
                  
                  <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">
                  <p style="font-size: 14px; color: #9ca3af; text-align: center;">Allied Pharmacies Recruitment Team</p>
                </div>
              </div>
            `,
                },
                attachments: [{
                        filename: 'interview-invite.ics',
                        content: Buffer.from(icsContent).toString('base64'),
                        encoding: 'base64',
                        contentType: 'text/calendar; method=REQUEST'
                    }]
            });
            console.log('Candidate confirmation email queued');
        }
        // Send pharmacy notification email
        if (branchEmail) {
            await db.collection('mail').add({
                to: branchEmail,
                message: {
                    subject: `New ${typeLabel} Booking: ${candidateName}`,
                    html: `
              <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="background: linear-gradient(135deg, #3b82f6 0%, #6366f1 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
                  <h1 style="color: white; margin: 0; font-size: 24px;">New ${typeLabel} Booking</h1>
                </div>
                <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 12px 12px;">
                  <p style="font-size: 16px; color: #374151;">A new ${typeLabel.toLowerCase()} has been self-booked by a candidate.</p>
                  
                  <div style="background: white; border-radius: 8px; padding: 20px; margin: 20px 0; border: 1px solid #e5e7eb;">
                    <p style="margin: 8px 0; font-size: 15px;"><strong>👤 Candidate:</strong> ${candidateName}</p>
                    <p style="margin: 8px 0; font-size: 15px;"><strong>📅 Date & Time:</strong> ${formattedDate}</p>
                    <p style="margin: 8px 0; font-size: 15px;"><strong>📍 Location:</strong> ${location}</p>
                    <p style="margin: 8px 0; font-size: 15px;"><strong>⏱️ Duration:</strong> ${duration} minutes</p>
                    ${jobTitle ? `<p style="margin: 8px 0; font-size: 15px;"><strong>💼 Position:</strong> ${jobTitle}</p>` : ''}
                  </div>
                  
                  <p style="font-size: 14px; color: #6b7280;">The candidate has received a confirmation email with a calendar invite.</p>
                  <p style="font-size: 14px; color: #ef4444; font-weight: 500;">Please ensure someone is available to conduct the ${typeLabel.toLowerCase()}.</p>
                  
                  <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">
                  <p style="font-size: 14px; color: #9ca3af; text-align: center;">Allied Pharmacies Recruitment Portal</p>
                </div>
              </div>
            `,
                },
                attachments: [{
                        filename: 'interview-invite.ics',
                        content: Buffer.from(icsContent).toString('base64'),
                        encoding: 'base64',
                        contentType: 'text/calendar; method=REQUEST'
                    }]
            });
            console.log('Pharmacy notification email queued');
        }
        return {
            success: true,
            message: 'Booking confirmation emails sent',
            notification: {
                candidateEmail: candidateEmail || 'Not provided',
                branchEmail: branchEmail || 'Not configured',
                scheduledAt: formattedDate
            }
        };
    }
    catch (error) {
        console.error('Error sending booking confirmation:', error);
        const message = error instanceof Error ? error.message : 'Unknown error';
        throw new https_1.HttpsError('internal', `Failed to send confirmation: ${message}`);
    }
});
exports.createUserWithPassword = (0, https_1.onCall)({
    region: 'us-central1',
    maxInstances: 10,
}, async (request) => {
    // Check authentication - only super admins can create users
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'Must be logged in to create users');
    }
    const db = admin.firestore();
    const callerDoc = await db.collection('users').doc(request.auth.uid).get();
    if (!callerDoc.exists || callerDoc.data()?.role !== 'super_admin') {
        throw new https_1.HttpsError('permission-denied', 'Only super admins can create users');
    }
    const { email, password, displayName, phone, role, entities, branchIds, emailNotifications, pushNotifications } = request.data;
    // Validate required fields
    if (!email || !password || !displayName || !role) {
        throw new https_1.HttpsError('invalid-argument', 'Missing required fields: email, password, displayName, role');
    }
    // Validate password length
    if (password.length < 6) {
        throw new https_1.HttpsError('invalid-argument', 'Password must be at least 6 characters');
    }
    try {
        // Create Firebase Auth user
        const userRecord = await admin.auth().createUser({
            email: email.toLowerCase(),
            password,
            displayName,
            disabled: false,
        });
        // Create Firestore user document
        await db.collection('users').doc(userRecord.uid).set({
            email: email.toLowerCase(),
            displayName,
            phone: phone || null,
            role,
            entities: entities || [],
            branchIds: branchIds || [],
            active: true,
            emailNotifications: emailNotifications ?? true,
            pushNotifications: pushNotifications ?? true,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            createdBy: request.auth.uid,
        });
        return {
            success: true,
            uid: userRecord.uid,
            message: `User ${displayName} created successfully`,
        };
    }
    catch (error) {
        console.error('Error creating user:', error);
        // Handle specific Firebase Auth errors
        if (error.code === 'auth/email-already-exists') {
            throw new https_1.HttpsError('already-exists', 'A user with this email already exists');
        }
        if (error.code === 'auth/invalid-email') {
            throw new https_1.HttpsError('invalid-argument', 'Invalid email address');
        }
        if (error.code === 'auth/weak-password') {
            throw new https_1.HttpsError('invalid-argument', 'Password is too weak');
        }
        throw new https_1.HttpsError('internal', `Failed to create user: ${error.message}`);
    }
});
// B4: Push Notifications
var pushNotifications_1 = require("./pushNotifications");
Object.defineProperty(exports, "onTrialCreated", { enumerable: true, get: function () { return pushNotifications_1.onTrialCreated; } });
Object.defineProperty(exports, "sendFeedbackReminders", { enumerable: true, get: function () { return pushNotifications_1.sendFeedbackReminders; } });
Object.defineProperty(exports, "onTrialCompleted", { enumerable: true, get: function () { return pushNotifications_1.onTrialCompleted; } });
// Booking Page Functions (P1-P3)
// validateBookingToken already defined in this file
var bookingFunctions_1 = require("./bookingFunctions");
Object.defineProperty(exports, "getBookingAvailability", { enumerable: true, get: function () { return bookingFunctions_1.getBookingAvailability; } });
Object.defineProperty(exports, "getBookingTimeSlots", { enumerable: true, get: function () { return bookingFunctions_1.getBookingTimeSlots; } });
Object.defineProperty(exports, "submitBooking", { enumerable: true, get: function () { return bookingFunctions_1.submitBooking; } });
// Indeed Job Import
var jobImport_1 = require("./jobImport");
Object.defineProperty(exports, "parseIndeedJob", { enumerable: true, get: function () { return jobImport_1.parseIndeedJob; } });
//# sourceMappingURL=index.js.map