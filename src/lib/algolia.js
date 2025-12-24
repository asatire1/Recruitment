import algoliasearch from 'algoliasearch/lite';

/**
 * Algolia Search Configuration
 * 
 * Setup Instructions:
 * 1. Create free account at https://www.algolia.com
 * 2. Create an application
 * 3. Create an index called "candidates"
 * 4. Get your Application ID and Search-Only API Key from API Keys section
 * 5. Add to .env file:
 *    VITE_ALGOLIA_APP_ID=your_app_id
 *    VITE_ALGOLIA_SEARCH_KEY=your_search_only_key
 * 
 * For indexing (Firebase Functions), you'll also need the Admin API Key
 * stored in Firebase Secrets.
 */

const ALGOLIA_APP_ID = import.meta.env.VITE_ALGOLIA_APP_ID;
const ALGOLIA_SEARCH_KEY = import.meta.env.VITE_ALGOLIA_SEARCH_KEY;

// Check if Algolia is configured
export const isAlgoliaConfigured = Boolean(ALGOLIA_APP_ID && ALGOLIA_SEARCH_KEY);

// Initialize client (only if configured)
let searchClient = null;
let candidatesIndex = null;

if (isAlgoliaConfigured) {
  searchClient = algoliasearch(ALGOLIA_APP_ID, ALGOLIA_SEARCH_KEY);
  candidatesIndex = searchClient.initIndex('candidates');
}

/**
 * Search candidates using Algolia
 * 
 * @param {string} query - Search query
 * @param {Object} options - Search options
 * @param {string[]} options.statusFilter - Filter by status(es)
 * @param {string} options.jobId - Filter by job ID
 * @param {number} options.hitsPerPage - Results per page (default 20)
 * @param {number} options.page - Page number (0-indexed)
 * @returns {Promise<Object>} Search results with hits and metadata
 */
export async function searchCandidates(query, options = {}) {
  if (!isAlgoliaConfigured || !candidatesIndex) {
    console.warn('Algolia not configured - falling back to basic search');
    return { hits: [], nbHits: 0, nbPages: 0, page: 0 };
  }

  const {
    statusFilter = [],
    jobId = null,
    hitsPerPage = 20,
    page = 0
  } = options;

  // Build filter string
  const filters = [];
  
  if (statusFilter.length > 0) {
    const statusFilters = statusFilter.map(s => `status:${s}`).join(' OR ');
    filters.push(`(${statusFilters})`);
  }
  
  if (jobId) {
    filters.push(`jobId:${jobId}`);
  }

  try {
    const results = await candidatesIndex.search(query, {
      hitsPerPage,
      page,
      filters: filters.join(' AND '),
      attributesToRetrieve: [
        'objectID',
        'firstName',
        'lastName',
        'email',
        'phone',
        'status',
        'jobId',
        'jobTitle',
        'cvUrl',
        'cvFileName',
        'createdAt',
        'source',
        'postcode'
      ],
      attributesToHighlight: ['firstName', 'lastName', 'email', 'cvText'],
      highlightPreTag: '<mark>',
      highlightPostTag: '</mark>'
    });

    return {
      hits: results.hits.map(hit => ({
        id: hit.objectID,
        ...hit,
        // Include highlight info for UI
        _highlightResult: hit._highlightResult
      })),
      nbHits: results.nbHits,
      nbPages: results.nbPages,
      page: results.page,
      query: results.query,
      processingTimeMS: results.processingTimeMS
    };
  } catch (error) {
    console.error('Algolia search error:', error);
    throw error;
  }
}

/**
 * Search with autocomplete suggestions
 * Returns quick suggestions as user types
 * 
 * @param {string} query - Partial search query
 * @param {number} limit - Max suggestions (default 5)
 * @returns {Promise<Object[]>} Suggestion objects
 */
export async function getSearchSuggestions(query, limit = 5) {
  if (!isAlgoliaConfigured || !candidatesIndex || !query.trim()) {
    return [];
  }

  try {
    const results = await candidatesIndex.search(query, {
      hitsPerPage: limit,
      attributesToRetrieve: ['objectID', 'firstName', 'lastName', 'email', 'jobTitle'],
      attributesToHighlight: ['firstName', 'lastName']
    });

    return results.hits.map(hit => ({
      id: hit.objectID,
      name: `${hit.firstName} ${hit.lastName}`,
      email: hit.email,
      jobTitle: hit.jobTitle,
      _highlightResult: hit._highlightResult
    }));
  } catch (error) {
    console.error('Algolia suggestions error:', error);
    return [];
  }
}

export { searchClient, candidatesIndex };
