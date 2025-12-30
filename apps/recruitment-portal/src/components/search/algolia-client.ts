// ============================================================================
// Allied Recruitment Portal - Algolia Client Configuration
// Location: apps/recruitment-portal/src/lib/algolia.ts
// ============================================================================

import algoliasearch, { SearchClient } from 'algoliasearch/lite';

// Environment variables (Vite style)
const ALGOLIA_APP_ID = import.meta.env.VITE_ALGOLIA_APP_ID || '';
const ALGOLIA_SEARCH_KEY = import.meta.env.VITE_ALGOLIA_SEARCH_KEY || '';
const ALGOLIA_INDEX_NAME = import.meta.env.VITE_ALGOLIA_INDEX_NAME || 'candidates';

// Validate configuration
if (!ALGOLIA_APP_ID || !ALGOLIA_SEARCH_KEY) {
  console.warn('Algolia credentials not configured. Search will not work.');
}

// Initialize Algolia client (singleton)
let searchClient: SearchClient | null = null;

export function getSearchClient(): SearchClient | null {
  if (!ALGOLIA_APP_ID || !ALGOLIA_SEARCH_KEY) {
    return null;
  }
  
  if (!searchClient) {
    searchClient = algoliasearch(ALGOLIA_APP_ID, ALGOLIA_SEARCH_KEY);
  }
  
  return searchClient;
}

export function getIndexName(): string {
  return ALGOLIA_INDEX_NAME;
}

// ============================================================================
// Type Definitions for Search Results
// ============================================================================

export interface AlgoliaCandidateHit {
  objectID: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  phone: string;
  phoneNormalized: string;
  jobId?: string;
  jobTitle?: string;
  branchId?: string;
  branchName?: string;
  status: string;
  statusLabel: string;
  source?: string;
  skills?: string[];
  parsedQualifications?: string[];
  yearsExperience?: number;
  pharmacyExperience?: boolean;
  rightToWork?: boolean;
  hasCV: boolean;
  createdAt: number;
  updatedAt: number;
  // Highlight result from Algolia
  _highlightResult?: {
    [key: string]: {
      value: string;
      matchLevel: 'none' | 'partial' | 'full';
      matchedWords: string[];
    };
  };
}

export interface SearchFilters {
  status?: string | string[];
  jobTitle?: string;
  branchId?: string;
  branchName?: string;
  hasCV?: boolean;
}

export interface SearchOptions {
  query: string;
  filters?: SearchFilters;
  page?: number;
  hitsPerPage?: number;
  facets?: string[];
}

export interface SearchResult {
  hits: AlgoliaCandidateHit[];
  nbHits: number;
  page: number;
  nbPages: number;
  hitsPerPage: number;
  processingTimeMS: number;
  facets?: Record<string, Record<string, number>>;
}

// ============================================================================
// Search Functions
// ============================================================================

/**
 * Build Algolia filter string from SearchFilters object
 */
function buildFilterString(filters?: SearchFilters): string {
  if (!filters) return '';
  
  const parts: string[] = [];
  
  if (filters.status) {
    if (Array.isArray(filters.status)) {
      const statusFilter = filters.status.map(s => `status:${s}`).join(' OR ');
      parts.push(`(${statusFilter})`);
    } else {
      parts.push(`status:${filters.status}`);
    }
  }
  
  if (filters.jobTitle) {
    parts.push(`jobTitle:"${filters.jobTitle}"`);
  }
  
  if (filters.branchId) {
    parts.push(`branchId:${filters.branchId}`);
  }
  
  if (filters.branchName) {
    parts.push(`branchName:"${filters.branchName}"`);
  }
  
  if (filters.hasCV !== undefined) {
    parts.push(`hasCV:${filters.hasCV}`);
  }
  
  return parts.join(' AND ');
}

/**
 * Search candidates using Algolia
 */
export async function searchCandidates(options: SearchOptions): Promise<SearchResult | null> {
  const client = getSearchClient();
  if (!client) {
    console.error('Algolia client not initialized');
    return null;
  }
  
  const index = client.initIndex(ALGOLIA_INDEX_NAME);
  
  try {
    const result = await index.search<AlgoliaCandidateHit>(options.query, {
      page: options.page || 0,
      hitsPerPage: options.hitsPerPage || 20,
      filters: buildFilterString(options.filters),
      facets: options.facets || ['status', 'jobTitle', 'branchName'],
      attributesToHighlight: [
        'firstName',
        'lastName',
        'email',
        'phone',
        'jobTitle',
        'branchName',
        'cvText'
      ],
      highlightPreTag: '<mark>',
      highlightPostTag: '</mark>'
    });
    
    return {
      hits: result.hits,
      nbHits: result.nbHits,
      page: result.page,
      nbPages: result.nbPages,
      hitsPerPage: result.hitsPerPage,
      processingTimeMS: result.processingTimeMS,
      facets: result.facets
    };
  } catch (error) {
    console.error('Algolia search error:', error);
    return null;
  }
}

/**
 * Quick search for autocomplete (limited results, faster)
 */
export async function quickSearch(query: string, limit = 5): Promise<AlgoliaCandidateHit[]> {
  if (!query.trim()) return [];
  
  const result = await searchCandidates({
    query,
    hitsPerPage: limit
  });
  
  return result?.hits || [];
}

/**
 * Search specifically in CV content
 */
export async function searchCVContent(query: string, options?: {
  page?: number;
  hitsPerPage?: number;
}): Promise<SearchResult | null> {
  const client = getSearchClient();
  if (!client) return null;
  
  const index = client.initIndex(ALGOLIA_INDEX_NAME);
  
  try {
    const result = await index.search<AlgoliaCandidateHit>(query, {
      page: options?.page || 0,
      hitsPerPage: options?.hitsPerPage || 20,
      // Restrict search to CV-related fields for deep search
      restrictSearchableAttributes: [
        'cvText',
        'skills',
        'parsedQualifications'
      ],
      filters: 'hasCV:true',
      attributesToHighlight: ['cvText', 'skills', 'parsedQualifications'],
      highlightPreTag: '<mark>',
      highlightPostTag: '</mark>',
      // Return snippets from CV text
      attributesToSnippet: ['cvText:50'],
      snippetEllipsisText: '...'
    });
    
    return {
      hits: result.hits,
      nbHits: result.nbHits,
      page: result.page,
      nbPages: result.nbPages,
      hitsPerPage: result.hitsPerPage,
      processingTimeMS: result.processingTimeMS
    };
  } catch (error) {
    console.error('CV content search error:', error);
    return null;
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get highlighted value from hit, fallback to original
 */
export function getHighlightedValue(
  hit: AlgoliaCandidateHit,
  attribute: keyof AlgoliaCandidateHit
): string {
  const highlight = hit._highlightResult?.[attribute as string];
  if (highlight && highlight.matchLevel !== 'none') {
    return highlight.value;
  }
  return String(hit[attribute] || '');
}

/**
 * Check if Algolia is properly configured
 */
export function isAlgoliaConfigured(): boolean {
  return !!(ALGOLIA_APP_ID && ALGOLIA_SEARCH_KEY);
}

/**
 * Format search result for display
 */
export function formatSearchResult(hit: AlgoliaCandidateHit): {
  id: string;
  title: string;
  subtitle: string;
  highlightedTitle: string;
  highlightedSubtitle: string;
} {
  return {
    id: hit.objectID,
    title: hit.fullName,
    subtitle: [hit.jobTitle, hit.branchName].filter(Boolean).join(' • '),
    highlightedTitle: getHighlightedValue(hit, 'fullName') || 
      `${getHighlightedValue(hit, 'firstName')} ${getHighlightedValue(hit, 'lastName')}`,
    highlightedSubtitle: [
      getHighlightedValue(hit, 'jobTitle'),
      getHighlightedValue(hit, 'branchName')
    ].filter(Boolean).join(' • ')
  };
}
