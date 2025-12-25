/**
 * Firebase Cloud Functions for Allied Recruitment Portal
 * 
 * These functions handle:
 * 1. CV parsing with AI (Claude API)
 * 2. Algolia index synchronization
 * 
 * Deploy with: firebase deploy --only functions
 */

const functions = require('firebase-functions');
const admin = require('firebase-admin');
const Anthropic = require('@anthropic-ai/sdk');
const algoliasearch = require('algoliasearch');
const pdf = require('pdf-parse');
const mammoth = require('mammoth');
const fetch = require('node-fetch');

// Initialize Firebase Admin
admin.initializeApp();

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

// Initialize Algolia client
const algoliaClient = algoliasearch(
  process.env.ALGOLIA_APP_ID,
  process.env.ALGOLIA_ADMIN_KEY
);
const candidatesIndex = algoliaClient.initIndex('allied_candidates');

// ============================================
// CV Parsing Function
// ============================================

/**
 * Parse CV with AI
 * Callable function that extracts structured data from CV
 */
exports.parseCV = functions.https.onCall(async (data, context) => {
  // Verify authentication
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { candidateId, cvUrl } = data;

  if (!candidateId || !cvUrl) {
    throw new functions.https.HttpsError('invalid-argument', 'candidateId and cvUrl are required');
  }

  try {
    // 1. Download and extract text from CV
    const cvText = await extractTextFromCV(cvUrl);
    
    if (!cvText || cvText.trim().length < 50) {
      throw new functions.https.HttpsError('failed-precondition', 'Could not extract sufficient text from CV');
    }

    // 2. Parse CV with Claude
    const parsedData = await parseWithClaude(cvText);

    // 3. Update candidate document with parsed data
    await admin.firestore().collection('candidates').doc(candidateId).update({
      cvParsed: true,
      cvParsedAt: admin.firestore.FieldValue.serverTimestamp(),
      parsedCV: parsedData,
      skills: parsedData.skills || [],
      totalExperienceMonths: calculateTotalExperience(parsedData.experience),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    return parsedData;
  } catch (error) {
    console.error('CV parsing error:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});

/**
 * Extract text from CV file (PDF, DOCX, etc.)
 */
async function extractTextFromCV(url) {
  try {
    // Download file
    const response = await fetch(url);
    const buffer = await response.buffer();
    const contentType = response.headers.get('content-type');

    // Extract text based on file type
    if (contentType?.includes('pdf')) {
      const pdfData = await pdf(buffer);
      return pdfData.text;
    } else if (contentType?.includes('wordprocessingml') || contentType?.includes('msword')) {
      const result = await mammoth.extractRawText({ buffer });
      return result.value;
    } else if (contentType?.includes('text')) {
      return buffer.toString('utf-8');
    } else {
      throw new Error(`Unsupported file type: ${contentType}`);
    }
  } catch (error) {
    console.error('Text extraction error:', error);
    throw error;
  }
}

/**
 * Parse CV text with Claude AI
 */
async function parseWithClaude(cvText) {
  const systemPrompt = `You are an expert CV/resume parser for a pharmacy recruitment portal. 
Extract structured information from CVs and return it in a specific JSON format.

Focus on identifying:
- Personal information (name, email, phone, location)
- Professional summary
- Work experience (especially pharmacy-related roles)
- Education and qualifications
- Skills (especially pharmacy skills like: Dispensing, MURs, NMS, Clinical Checks, PMR Systems, etc.)
- GPhC registration if mentioned
- Certifications

Return ONLY valid JSON with no additional text.`;

  const userPrompt = `Parse the following CV and extract structured data. Return a JSON object with these fields:

{
  "personalInfo": {
    "name": "Full name",
    "email": "email@example.com",
    "phone": "phone number",
    "location": "City, Region"
  },
  "summary": "Professional summary or objective",
  "experience": [
    {
      "title": "Job Title",
      "company": "Company Name",
      "dates": "Start - End",
      "durationMonths": 12,
      "description": "Role description",
      "highlights": ["Achievement 1", "Achievement 2"]
    }
  ],
  "education": [
    {
      "degree": "Degree Name",
      "institution": "University/College",
      "year": "2020",
      "details": "Additional details"
    }
  ],
  "skills": [
    { "name": "Skill Name", "category": "clinical|technical|soft|certification" }
  ],
  "qualifications": [
    { "name": "Qualification", "issueDate": "Date if available" }
  ],
  "gphcNumber": "GPhC number if found",
  "confidence": 0.85
}

CV Text:
${cvText.substring(0, 15000)}`;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      messages: [
        { role: 'user', content: userPrompt }
      ],
      system: systemPrompt
    });

    const content = response.content[0].text;
    
    // Parse JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    
    throw new Error('Could not parse JSON from response');
  } catch (error) {
    console.error('Claude parsing error:', error);
    throw error;
  }
}

/**
 * Calculate total experience in months
 */
function calculateTotalExperience(experiences) {
  if (!experiences || !Array.isArray(experiences)) return 0;
  
  return experiences.reduce((total, exp) => {
    return total + (exp.durationMonths || 0);
  }, 0);
}

// ============================================
// Algolia Sync Functions
// ============================================

/**
 * Sync candidate to Algolia on create/update
 */
exports.syncCandidateToAlgolia = functions.firestore
  .document('candidates/{candidateId}')
  .onWrite(async (change, context) => {
    const candidateId = context.params.candidateId;

    // Handle delete
    if (!change.after.exists) {
      try {
        await candidatesIndex.deleteObject(candidateId);
        console.log(`Deleted candidate ${candidateId} from Algolia`);
      } catch (error) {
        console.error(`Error deleting from Algolia: ${error}`);
      }
      return;
    }

    // Get document data
    const data = change.after.data();

    // Transform for Algolia
    const algoliaRecord = {
      objectID: candidateId,
      firstName: data.firstName || '',
      lastName: data.lastName || '',
      email: data.email || '',
      phone: data.phone || '',
      status: data.status || 'new',
      appliedJobType: data.appliedJobType || '',
      appliedJobTitle: data.appliedJobTitle || '',
      entityId: data.entityId || '',
      entityName: data.entityName || '',
      branchId: data.branchId || '',
      branchName: data.branchName || '',
      location: data.location || '',
      skills: Array.isArray(data.skills) 
        ? data.skills.map(s => typeof s === 'string' ? s : s.name)
        : [],
      totalExperienceMonths: data.totalExperienceMonths || 0,
      availability: data.availability || '',
      cvParsed: data.cvParsed || false,
      gphcNumber: data.gphcNumber || '',
      gphcRegistered: !!data.gphcNumber,
      avatarUrl: data.avatarUrl || '',
      rating: data.rating || 0,
      createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
      updatedAt: data.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
      createdAtTimestamp: data.createdAt?.toDate?.()?.getTime() / 1000 || Date.now() / 1000,
      updatedAtTimestamp: data.updatedAt?.toDate?.()?.getTime() / 1000 || Date.now() / 1000
    };

    // Add geo data if available
    if (data.location?.lat && data.location?.lng) {
      algoliaRecord._geoloc = {
        lat: data.location.lat,
        lng: data.location.lng
      };
    }

    try {
      await candidatesIndex.saveObject(algoliaRecord);
      console.log(`Synced candidate ${candidateId} to Algolia`);
    } catch (error) {
      console.error(`Error syncing to Algolia: ${error}`);
    }
  });

/**
 * Batch reindex all candidates to Algolia
 * Run manually or on schedule
 */
exports.reindexAllCandidates = functions.https.onRequest(async (req, res) => {
  // Verify admin token or similar auth
  const authHeader = req.headers.authorization;
  if (!authHeader || authHeader !== `Bearer ${process.env.ADMIN_REINDEX_TOKEN}`) {
    res.status(401).send('Unauthorized');
    return;
  }

  try {
    const snapshot = await admin.firestore().collection('candidates').get();
    const records = [];

    snapshot.forEach(doc => {
      const data = doc.data();
      records.push({
        objectID: doc.id,
        firstName: data.firstName || '',
        lastName: data.lastName || '',
        email: data.email || '',
        phone: data.phone || '',
        status: data.status || 'new',
        appliedJobType: data.appliedJobType || '',
        appliedJobTitle: data.appliedJobTitle || '',
        entityName: data.entityName || '',
        branchName: data.branchName || '',
        skills: Array.isArray(data.skills) 
          ? data.skills.map(s => typeof s === 'string' ? s : s.name)
          : [],
        totalExperienceMonths: data.totalExperienceMonths || 0,
        cvParsed: data.cvParsed || false,
        gphcRegistered: !!data.gphcNumber,
        createdAtTimestamp: data.createdAt?.toDate?.()?.getTime() / 1000 || Date.now() / 1000,
        updatedAtTimestamp: data.updatedAt?.toDate?.()?.getTime() / 1000 || Date.now() / 1000
      });
    });

    // Batch save to Algolia
    await candidatesIndex.saveObjects(records);
    
    res.json({ success: true, count: records.length });
  } catch (error) {
    console.error('Reindex error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// Scheduled Jobs
// ============================================

/**
 * Daily cleanup of orphaned CV files
 */
exports.cleanupOrphanedCVs = functions.pubsub
  .schedule('0 3 * * *') // 3 AM daily
  .timeZone('Europe/London')
  .onRun(async (context) => {
    // Implementation for cleanup
    console.log('Running CV cleanup...');
    // Add cleanup logic here
  });
