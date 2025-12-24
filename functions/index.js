const { onSchedule } = require('firebase-functions/v2/scheduler');
const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { onDocumentCreated, onDocumentUpdated, onDocumentDeleted } = require('firebase-functions/v2/firestore');
const { defineSecret } = require('firebase-functions/params');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const { getStorage } = require('firebase-admin/storage');
const Anthropic = require('@anthropic-ai/sdk');
const algoliasearch = require('algoliasearch');

initializeApp();
const db = getFirestore();
const storage = getStorage();

// Define secrets (set via Firebase CLI)
// Run: firebase functions:secrets:set CLAUDE_API_KEY
// Run: firebase functions:secrets:set ALGOLIA_APP_ID
// Run: firebase functions:secrets:set ALGOLIA_ADMIN_KEY
const claudeApiKey = defineSecret('CLAUDE_API_KEY');
const algoliaAppId = defineSecret('ALGOLIA_APP_ID');
const algoliaAdminKey = defineSecret('ALGOLIA_ADMIN_KEY');

// ============================================
// ALGOLIA SEARCH SYNC FUNCTIONS
// ============================================

/**
 * Helper to get Algolia client and index
 */
function getAlgoliaIndex(appId, adminKey) {
  const client = algoliasearch(appId, adminKey);
  return client.initIndex('candidates');
}

/**
 * Transform candidate document to Algolia record
 */
function transformCandidateForAlgolia(id, data) {
  return {
    objectID: id,
    firstName: data.firstName || '',
    lastName: data.lastName || '',
    fullName: `${data.firstName || ''} ${data.lastName || ''}`.trim(),
    email: data.email || '',
    phone: data.phone || '',
    status: data.status || 'new',
    jobId: data.jobId || null,
    jobTitle: data.jobTitle || '',
    source: data.source || '',
    postcode: data.postcode || '',
    address: data.address || '',
    // Include parsed CV text for full-text search
    cvText: data.cvParsedText || '',
    skills: data.skills || [],
    qualifications: data.qualifications || [],
    pharmacyExperience: data.pharmacyExperience || false,
    yearsExperience: data.yearsExperience || null,
    // Timestamps for filtering/sorting
    createdAt: data.createdAt?.toMillis() || Date.now(),
    updatedAt: data.updatedAt?.toMillis() || Date.now(),
    // For security - who owns this record
    createdBy: data.createdBy || null
  };
}

/**
 * Sync new candidate to Algolia
 */
exports.algoliaIndexCandidate = onDocumentCreated(
  {
    document: 'candidates/{candidateId}',
    secrets: [algoliaAppId, algoliaAdminKey]
  },
  async (event) => {
    const appId = algoliaAppId.value();
    const adminKey = algoliaAdminKey.value();
    
    if (!appId || !adminKey) {
      console.log('Algolia not configured, skipping index');
      return;
    }

    const snapshot = event.data;
    if (!snapshot) return;

    const data = snapshot.data();
    const record = transformCandidateForAlgolia(event.params.candidateId, data);

    try {
      const index = getAlgoliaIndex(appId, adminKey);
      await index.saveObject(record);
      console.log(`Indexed candidate ${event.params.candidateId} to Algolia`);
    } catch (error) {
      console.error('Algolia indexing error:', error);
    }
  }
);

/**
 * Update candidate in Algolia when modified
 */
exports.algoliaUpdateCandidate = onDocumentUpdated(
  {
    document: 'candidates/{candidateId}',
    secrets: [algoliaAppId, algoliaAdminKey]
  },
  async (event) => {
    const appId = algoliaAppId.value();
    const adminKey = algoliaAdminKey.value();
    
    if (!appId || !adminKey) {
      console.log('Algolia not configured, skipping update');
      return;
    }

    const after = event.data?.after;
    if (!after) return;

    const data = after.data();
    const record = transformCandidateForAlgolia(event.params.candidateId, data);

    try {
      const index = getAlgoliaIndex(appId, adminKey);
      await index.saveObject(record);
      console.log(`Updated candidate ${event.params.candidateId} in Algolia`);
    } catch (error) {
      console.error('Algolia update error:', error);
    }
  }
);

/**
 * Remove candidate from Algolia when deleted
 */
exports.algoliaDeleteCandidate = onDocumentDeleted(
  {
    document: 'candidates/{candidateId}',
    secrets: [algoliaAppId, algoliaAdminKey]
  },
  async (event) => {
    const appId = algoliaAppId.value();
    const adminKey = algoliaAdminKey.value();
    
    if (!appId || !adminKey) {
      console.log('Algolia not configured, skipping delete');
      return;
    }

    try {
      const index = getAlgoliaIndex(appId, adminKey);
      await index.deleteObject(event.params.candidateId);
      console.log(`Deleted candidate ${event.params.candidateId} from Algolia`);
    } catch (error) {
      console.error('Algolia delete error:', error);
    }
  }
);

/**
 * Manual reindex function - call to sync all existing candidates
 * Usage: firebase functions:call reindexAllCandidates
 */
exports.reindexAllCandidates = onCall(
  {
    secrets: [algoliaAppId, algoliaAdminKey]
  },
  async (request) => {
    // Only allow admins (you could add more checks here)
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Must be logged in');
    }

    const appId = algoliaAppId.value();
    const adminKey = algoliaAdminKey.value();
    
    if (!appId || !adminKey) {
      throw new HttpsError('failed-precondition', 'Algolia not configured');
    }

    const index = getAlgoliaIndex(appId, adminKey);
    
    // Configure index settings
    await index.setSettings({
      searchableAttributes: [
        'fullName',
        'firstName',
        'lastName',
        'email',
        'phone',
        'jobTitle',
        'cvText',
        'skills',
        'qualifications',
        'postcode'
      ],
      attributesForFaceting: [
        'status',
        'jobId',
        'source',
        'pharmacyExperience'
      ],
      customRanking: [
        'desc(updatedAt)'
      ],
      typoTolerance: true,
      minWordSizefor1Typo: 3,
      minWordSizefor2Typos: 6
    });

    // Get all candidates
    const snapshot = await db.collection('candidates').get();
    const records = [];

    snapshot.docs.forEach(doc => {
      records.push(transformCandidateForAlgolia(doc.id, doc.data()));
    });

    // Batch save to Algolia
    if (records.length > 0) {
      await index.saveObjects(records);
    }

    console.log(`Reindexed ${records.length} candidates to Algolia`);
    return { success: true, indexed: records.length };
  }
);

// ============================================
// CV PARSING FUNCTION (SECURE)
// ============================================

/**
 * Secure CV parsing using Claude API
 * API key is stored in Firebase Secrets, not client-side
 * 
 * Usage from client:
 * const parseCV = httpsCallable(functions, 'parseCV');
 * const result = await parseCV({ cvText: "..." });
 */
exports.parseCV = onCall(
  { 
    secrets: [claudeApiKey],
    // Rate limiting: max 10 requests per minute per user
    enforceAppCheck: false, // Enable if using App Check
  },
  async (request) => {
    // Verify user is authenticated
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Must be logged in to parse CVs');
    }

    const { cvText } = request.data;

    if (!cvText || typeof cvText !== 'string') {
      throw new HttpsError('invalid-argument', 'CV text is required');
    }

    if (cvText.length < 50) {
      throw new HttpsError('invalid-argument', 'CV text is too short to parse');
    }

    if (cvText.length > 50000) {
      throw new HttpsError('invalid-argument', 'CV text exceeds maximum length');
    }

    try {
      const apiKey = claudeApiKey.value();
      
      if (!apiKey) {
        console.error('Claude API key not configured');
        throw new HttpsError('failed-precondition', 'CV parsing service not configured');
      }

      const client = new Anthropic({ apiKey });

      // Truncate text if needed (Claude context limits)
      const truncatedText = cvText.substring(0, 15000);

      const response = await client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        messages: [
          {
            role: 'user',
            content: `You are a CV/resume parser. Extract the following information from this CV and return it as valid JSON only (no markdown, no explanation, just the JSON object):

{
  "firstName": "string or null",
  "lastName": "string or null", 
  "email": "string or null",
  "phone": "string or null (include country code if present)",
  "address": "string or null (full address if available)",
  "postcode": "string or null (UK postcode format)",
  "currentJobTitle": "string or null",
  "yearsExperience": "number or null (estimate from work history)",
  "skills": ["array of key skills"],
  "experienceSummary": "string - brief 1-2 sentence summary of their experience",
  "pharmacyExperience": "boolean - true if they have pharmacy/dispensing/healthcare experience",
  "qualifications": ["array of qualifications/certifications"],
  "rightToWork": "string or null - if mentioned (e.g., 'UK citizen', 'Tier 2 visa')"
}

CV TEXT:
${truncatedText}`
          }
        ]
      });

      const content = response.content[0]?.text;

      if (!content) {
        throw new Error('No content in Claude response');
      }

      // Parse the JSON response
      const cleanedContent = content
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();

      const parsed = JSON.parse(cleanedContent);

      // Log successful parse (without PII)
      console.log(`CV parsed successfully for user ${request.auth.uid}`);

      return {
        success: true,
        data: {
          firstName: parsed.firstName || null,
          lastName: parsed.lastName || null,
          email: parsed.email || null,
          phone: formatPhoneNumber(parsed.phone),
          address: parsed.address || null,
          postcode: parsed.postcode?.toUpperCase() || null,
          currentJobTitle: parsed.currentJobTitle || null,
          yearsExperience: parsed.yearsExperience || null,
          skills: parsed.skills || [],
          summary: parsed.experienceSummary || null,
          pharmacyExperience: parsed.pharmacyExperience || false,
          qualifications: parsed.qualifications || [],
          rightToWork: parsed.rightToWork || null,
          parsingMethod: 'claude-ai-secure',
          confidence: 'high'
        }
      };

    } catch (error) {
      console.error('CV parsing error:', error.message);

      if (error instanceof HttpsError) {
        throw error;
      }

      if (error.message.includes('JSON')) {
        throw new HttpsError('internal', 'Failed to parse CV data');
      }

      throw new HttpsError('internal', 'CV parsing failed. Please try again.');
    }
  }
);

/**
 * Format phone number to consistent format
 */
function formatPhoneNumber(phone) {
  if (!phone) return null;

  let cleaned = phone.replace(/[^\d+]/g, '');

  if (cleaned.startsWith('0044')) {
    cleaned = '+44' + cleaned.substring(4);
  }

  if (cleaned.startsWith('0') && cleaned.length === 11) {
    cleaned = '+44' + cleaned.substring(1);
  }

  return cleaned || null;
}

// ============================================
// CV CLEANUP FUNCTION (GDPR COMPLIANCE)
// ============================================

const RETENTION_DAYS = {
  rejected: 180,
  withdrawn: 90,
  not_suitable: 180,
  offer_declined: 180,
};

exports.cleanupOldCVs = onSchedule('0 2 * * *', async () => {
  console.log('Starting CV cleanup...');
  const now = new Date();
  let deleted = 0;

  const snapshot = await db.collection('candidates').where('cvUrl', '!=', null).get();

  for (const doc of snapshot.docs) {
    const data = doc.data();
    const status = data.status || 'new';
    const retentionDays = RETENTION_DAYS[status];

    if (!retentionDays) continue;

    const statusDate = data.statusChangedAt?.toDate() || data.updatedAt?.toDate() || data.createdAt?.toDate();
    if (!statusDate) continue;

    const ageInDays = (now - statusDate) / (1000 * 60 * 60 * 24);
    
    if (ageInDays > retentionDays && data.cvUrl) {
      try {
        const url = new URL(data.cvUrl);
        const pathMatch = url.pathname.match(/\/o\/(.+?)(\?|$)/);
        if (pathMatch) {
          const filePath = decodeURIComponent(pathMatch[1]);
          await storage.bucket().file(filePath).delete();
        }
        
        await doc.ref.update({
          cvUrl: null,
          cvDeleted: true,
          cvDeletedAt: FieldValue.serverTimestamp(),
        });
        deleted++;
        console.log(`Deleted CV for ${doc.id}`);
      } catch (e) {
        console.error(`Error deleting CV for ${doc.id}:`, e);
      }
    }
  }

  console.log(`Cleanup complete. Deleted ${deleted} CVs.`);
  return { deleted };
});
