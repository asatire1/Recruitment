// ============================================================================
// Allied Recruitment Portal - Algolia Type Definitions
// Location: packages/shared-lib/src/types/algolia.ts
// ============================================================================

/**
 * Algolia candidate record structure
 * This matches what we store in the Algolia index
 */
export interface AlgoliaCandidateRecord {
  /** Algolia object ID (same as Firestore document ID) */
  objectID: string;
  
  // Personal Information
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  phone: string;
  phoneNormalized: string;
  
  // Job Application
  jobId?: string;
  jobTitle?: string;
  branchId?: string;
  branchName?: string;
  source?: string;
  
  // Status
  status: CandidateSearchStatus;
  statusLabel: string;
  
  // Qualifications & Skills
  skills?: string[];
  parsedQualifications?: string[];
  yearsExperience?: number;
  pharmacyExperience?: boolean;
  rightToWork?: boolean;
  
  // CV
  cvText?: string;
  hasCV: boolean;
  
  // Notes
  notes?: string;
  
  // Timestamps (Unix milliseconds)
  createdAt: number;
  updatedAt: number;
  createdBy?: string;
}

/**
 * Status values for search filtering
 */
export type CandidateSearchStatus =
  | 'new'
  | 'screening'
  | 'interview_scheduled'
  | 'interview_complete'
  | 'trial_scheduled'
  | 'trial_complete'
  | 'approved'
  | 'rejected'
  | 'withdrawn';

/**
 * Status display labels
 */
export const STATUS_LABELS: Record<CandidateSearchStatus, string> = {
  new: 'New',
  screening: 'Screening',
  interview_scheduled: 'Interview Scheduled',
  interview_complete: 'Interview Complete',
  trial_scheduled: 'Trial Scheduled',
  trial_complete: 'Trial Complete',
  approved: 'Approved',
  rejected: 'Rejected',
  withdrawn: 'Withdrawn'
};

/**
 * Status colors for UI
 */
export const STATUS_COLORS: Record<CandidateSearchStatus, string> = {
  new: '#3B82F6',
  screening: '#8B5CF6',
  interview_scheduled: '#F59E0B',
  interview_complete: '#10B981',
  trial_scheduled: '#F97316',
  trial_complete: '#22C55E',
  approved: '#059669',
  rejected: '#EF4444',
  withdrawn: '#6B7280'
};

/**
 * Algolia search hit with highlighting
 */
export interface AlgoliaSearchHit extends AlgoliaCandidateRecord {
  _highlightResult?: {
    [K in keyof AlgoliaCandidateRecord]?: {
      value: string;
      matchLevel: 'none' | 'partial' | 'full';
      matchedWords: string[];
    };
  };
  _snippetResult?: {
    cvText?: {
      value: string;
      matchLevel: 'none' | 'partial' | 'full';
    };
  };
}

/**
 * Search filters for Algolia queries
 */
export interface AlgoliaSearchFilters {
  status?: CandidateSearchStatus | CandidateSearchStatus[];
  jobTitle?: string;
  branchId?: string;
  branchName?: string;
  hasCV?: boolean;
  pharmacyExperience?: boolean;
  rightToWork?: boolean;
}

/**
 * Search options for Algolia queries
 */
export interface AlgoliaSearchOptions {
  query: string;
  filters?: AlgoliaSearchFilters;
  page?: number;
  hitsPerPage?: number;
  facets?: string[];
  restrictSearchableAttributes?: string[];
}

/**
 * Search result from Algolia
 */
export interface AlgoliaSearchResult {
  hits: AlgoliaSearchHit[];
  nbHits: number;
  page: number;
  nbPages: number;
  hitsPerPage: number;
  processingTimeMS: number;
  facets?: Record<string, Record<string, number>>;
  query: string;
}

/**
 * Facet values for filtering UI
 */
export interface AlgoliaFacets {
  status: Record<string, number>;
  jobTitle: Record<string, number>;
  branchName: Record<string, number>;
  hasCV: Record<string, number>;
}

/**
 * Algolia configuration
 */
export interface AlgoliaConfig {
  appId: string;
  searchKey: string;
  indexName: string;
}

/**
 * Reindex result from Cloud Function
 */
export interface ReindexResult {
  success: boolean;
  indexed: number;
  errors: number;
  total: number;
}

/**
 * Algolia stats from Cloud Function
 */
export interface AlgoliaStats {
  success: boolean;
  indexName: string;
  totalRecords: number;
  searchableAttributes?: string[];
  attributesForFaceting?: string[];
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Convert Firestore timestamp to Unix milliseconds
 */
export function timestampToMillis(timestamp: any): number {
  if (!timestamp) return Date.now();
  if (typeof timestamp.toMillis === 'function') {
    return timestamp.toMillis();
  }
  if (timestamp._seconds) {
    return timestamp._seconds * 1000;
  }
  return Date.now();
}

/**
 * Build Algolia filter string from filter object
 */
export function buildFilterString(filters?: AlgoliaSearchFilters): string {
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
  
  if (filters.pharmacyExperience !== undefined) {
    parts.push(`pharmacyExperience:${filters.pharmacyExperience}`);
  }
  
  if (filters.rightToWork !== undefined) {
    parts.push(`rightToWork:${filters.rightToWork}`);
  }
  
  return parts.join(' AND ');
}

/**
 * Get status label from status value
 */
export function getStatusLabel(status: CandidateSearchStatus): string {
  return STATUS_LABELS[status] || status;
}

/**
 * Get status color from status value
 */
export function getStatusColor(status: CandidateSearchStatus): string {
  return STATUS_COLORS[status] || '#6B7280';
}
