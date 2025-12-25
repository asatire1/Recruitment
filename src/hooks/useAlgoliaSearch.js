import { useState, useEffect, useCallback, useMemo } from 'react';
import algoliasearch from 'algoliasearch/lite';
import { ALGOLIA_APP_ID, ALGOLIA_SEARCH_KEY, ALGOLIA_INDEX_NAME } from '../config/algolia';

// Initialize Algolia client
const searchClient = algoliasearch(ALGOLIA_APP_ID, ALGOLIA_SEARCH_KEY);
const candidatesIndex = searchClient.initIndex(ALGOLIA_INDEX_NAME);

// Filter options
export const FILTER_OPTIONS = {
  status: [
    { value: 'new', label: 'New' },
    { value: 'screening', label: 'Screening' },
    { value: 'interview', label: 'Interview' },
    { value: 'trial', label: 'Trial' },
    { value: 'offer', label: 'Offer' },
    { value: 'approved', label: 'Approved' },
    { value: 'rejected', label: 'Rejected' },
    { value: 'hired', label: 'Hired' },
    { value: 'withdrawn', label: 'Withdrawn' }
  ],
  jobType: [
    { value: 'pharmacist', label: 'Pharmacist' },
    { value: 'pharmacy_technician', label: 'Pharmacy Technician' },
    { value: 'pre_reg', label: 'Pre-Registration' },
    { value: 'dispenser', label: 'Dispenser' },
    { value: 'counter_assistant', label: 'Counter Assistant' },
    { value: 'delivery_driver', label: 'Delivery Driver' },
    { value: 'manager', label: 'Branch Manager' }
  ],
  experience: [
    { value: '0-12', label: 'Less than 1 year', min: 0, max: 12 },
    { value: '12-36', label: '1-3 years', min: 12, max: 36 },
    { value: '36-60', label: '3-5 years', min: 36, max: 60 },
    { value: '60-120', label: '5-10 years', min: 60, max: 120 },
    { value: '120+', label: '10+ years', min: 120, max: null }
  ],
  availability: [
    { value: 'immediate', label: 'Immediate' },
    { value: '1_week', label: 'Within 1 week' },
    { value: '2_weeks', label: 'Within 2 weeks' },
    { value: '1_month', label: 'Within 1 month' },
    { value: 'negotiable', label: 'Negotiable' }
  ],
  distance: [
    { value: 5, label: 'Within 5 miles' },
    { value: 10, label: 'Within 10 miles' },
    { value: 25, label: 'Within 25 miles' },
    { value: 50, label: 'Within 50 miles' }
  ]
};

// Sort options
export const SORT_OPTIONS = [
  { value: 'relevance', label: 'Most Relevant' },
  { value: 'recent', label: 'Most Recent' },
  { value: 'experience_desc', label: 'Most Experience' },
  { value: 'experience_asc', label: 'Least Experience' },
  { value: 'name_asc', label: 'Name (A-Z)' },
  { value: 'name_desc', label: 'Name (Z-A)' }
];

// Main search hook
export function useAlgoliaSearch(options = {}) {
  const {
    hitsPerPage = 20,
    initialFilters = {},
    debounceMs = 300
  } = options;

  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState(initialFilters);
  const [sortBy, setSortBy] = useState('relevance');
  const [page, setPage] = useState(0);
  
  const [results, setResults] = useState([]);
  const [totalHits, setTotalHits] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [facets, setFacets] = useState({});

  // Build Algolia filter string
  const buildFilterString = useCallback((filters) => {
    const filterParts = [];

    // Status filter
    if (filters.status && filters.status.length > 0) {
      const statusFilters = filters.status.map(s => `status:${s}`).join(' OR ');
      filterParts.push(`(${statusFilters})`);
    }

    // Job type filter
    if (filters.jobType && filters.jobType.length > 0) {
      const typeFilters = filters.jobType.map(t => `appliedJobType:${t}`).join(' OR ');
      filterParts.push(`(${typeFilters})`);
    }

    // Entity filter
    if (filters.entityId) {
      filterParts.push(`entityId:${filters.entityId}`);
    }

    // Branch filter
    if (filters.branchId) {
      filterParts.push(`branchId:${filters.branchId}`);
    }

    // Experience range
    if (filters.experienceMin !== undefined) {
      filterParts.push(`totalExperienceMonths >= ${filters.experienceMin}`);
    }
    if (filters.experienceMax !== undefined) {
      filterParts.push(`totalExperienceMonths <= ${filters.experienceMax}`);
    }

    // Availability
    if (filters.availability) {
      filterParts.push(`availability:${filters.availability}`);
    }

    // Has CV
    if (filters.hasCv !== undefined) {
      filterParts.push(`cvParsed:${filters.hasCv}`);
    }

    // Skills (AND logic - must have all skills)
    if (filters.skills && filters.skills.length > 0) {
      filters.skills.forEach(skill => {
        filterParts.push(`skills:${skill}`);
      });
    }

    // GPhC registered
    if (filters.gphcRegistered) {
      filterParts.push('gphcRegistered:true');
    }

    // Date range
    if (filters.createdAfter) {
      const timestamp = new Date(filters.createdAfter).getTime() / 1000;
      filterParts.push(`createdAtTimestamp >= ${timestamp}`);
    }

    return filterParts.join(' AND ');
  }, []);

  // Get sort index name
  const getSortIndex = useCallback((sortBy) => {
    switch (sortBy) {
      case 'recent':
        return `${ALGOLIA_INDEX_NAME}_created_desc`;
      case 'experience_desc':
        return `${ALGOLIA_INDEX_NAME}_experience_desc`;
      case 'experience_asc':
        return `${ALGOLIA_INDEX_NAME}_experience_asc`;
      case 'name_asc':
        return `${ALGOLIA_INDEX_NAME}_name_asc`;
      case 'name_desc':
        return `${ALGOLIA_INDEX_NAME}_name_desc`;
      default:
        return ALGOLIA_INDEX_NAME;
    }
  }, []);

  // Perform search
  const search = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const indexToSearch = searchClient.initIndex(getSortIndex(sortBy));
      
      const searchParams = {
        query,
        page,
        hitsPerPage,
        filters: buildFilterString(filters),
        facets: ['status', 'appliedJobType', 'entityName', 'branchName', 'skills'],
        attributesToRetrieve: [
          'objectID', 'firstName', 'lastName', 'email', 'phone',
          'status', 'appliedJobType', 'appliedJobTitle',
          'entityName', 'branchName', 'location',
          'skills', 'totalExperienceMonths', 'availability',
          'cvParsed', 'gphcNumber', 'createdAt', 'updatedAt',
          'avatarUrl', 'rating'
        ],
        highlightPreTag: '<mark>',
        highlightPostTag: '</mark>'
      };

      // Geo search if location filter is set
      if (filters.aroundLatLng && filters.aroundRadius) {
        searchParams.aroundLatLng = filters.aroundLatLng;
        searchParams.aroundRadius = filters.aroundRadius * 1609; // miles to meters
      }

      const response = await indexToSearch.search(query, searchParams);

      setResults(response.hits);
      setTotalHits(response.nbHits);
      setTotalPages(response.nbPages);
      setFacets(response.facets || {});
      setLoading(false);
    } catch (err) {
      console.error('Algolia search error:', err);
      setError(err.message);
      setLoading(false);
    }
  }, [query, filters, sortBy, page, hitsPerPage, buildFilterString, getSortIndex]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      search();
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [query, filters, sortBy, page, search, debounceMs]);

  // Update query
  const updateQuery = useCallback((newQuery) => {
    setQuery(newQuery);
    setPage(0); // Reset to first page
  }, []);

  // Update filters
  const updateFilters = useCallback((newFilters) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
    setPage(0);
  }, []);

  // Clear filters
  const clearFilters = useCallback(() => {
    setFilters({});
    setPage(0);
  }, []);

  // Toggle filter value (for multi-select filters)
  const toggleFilter = useCallback((key, value) => {
    setFilters(prev => {
      const current = prev[key] || [];
      const newValues = current.includes(value)
        ? current.filter(v => v !== value)
        : [...current, value];
      return { ...prev, [key]: newValues };
    });
    setPage(0);
  }, []);

  // Go to page
  const goToPage = useCallback((newPage) => {
    setPage(Math.max(0, Math.min(newPage, totalPages - 1)));
  }, [totalPages]);

  return {
    // Search state
    query,
    filters,
    sortBy,
    page,
    results,
    totalHits,
    totalPages,
    loading,
    error,
    facets,
    
    // Actions
    updateQuery,
    updateFilters,
    clearFilters,
    toggleFilter,
    setSortBy,
    goToPage,
    refresh: search
  };
}

// Hook for skill suggestions / autocomplete
export function useSkillSuggestions() {
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);

  const getSuggestions = useCallback(async (query) => {
    if (!query || query.length < 2) {
      setSuggestions([]);
      return;
    }

    setLoading(true);
    try {
      // Search skills facet
      const response = await candidatesIndex.searchForFacetValues('skills', query, {
        maxFacetHits: 10
      });
      
      setSuggestions(response.facetHits.map(hit => ({
        value: hit.value,
        count: hit.count,
        highlighted: hit.highlighted
      })));
    } catch (err) {
      console.error('Skill suggestions error:', err);
      setSuggestions([]);
    }
    setLoading(false);
  }, []);

  return { suggestions, loading, getSuggestions };
}

// Hook for saved searches
export function useSavedSearches() {
  const STORAGE_KEY = 'allied_saved_searches';
  
  const [savedSearches, setSavedSearches] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const saveSearch = useCallback((name, query, filters) => {
    const newSearch = {
      id: Date.now().toString(),
      name,
      query,
      filters,
      createdAt: new Date().toISOString()
    };
    
    setSavedSearches(prev => {
      const updated = [newSearch, ...prev].slice(0, 10); // Keep max 10
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
    
    return newSearch;
  }, []);

  const deleteSearch = useCallback((id) => {
    setSavedSearches(prev => {
      const updated = prev.filter(s => s.id !== id);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  return { savedSearches, saveSearch, deleteSearch };
}

// Hook for recent searches
export function useRecentSearches() {
  const STORAGE_KEY = 'allied_recent_searches';
  const MAX_RECENT = 5;

  const [recentSearches, setRecentSearches] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const addRecentSearch = useCallback((query) => {
    if (!query.trim()) return;
    
    setRecentSearches(prev => {
      // Remove duplicates and add to front
      const filtered = prev.filter(q => q.toLowerCase() !== query.toLowerCase());
      const updated = [query, ...filtered].slice(0, MAX_RECENT);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const clearRecentSearches = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setRecentSearches([]);
  }, []);

  return { recentSearches, addRecentSearch, clearRecentSearches };
}

// Utility: Highlight matched text
export function highlightMatches(text, query) {
  if (!text || !query) return text;
  
  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  return text.replace(regex, '<mark>$1</mark>');
}

// Utility: Format facet count
export function formatFacetCount(count) {
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
  return count.toString();
}

export default useAlgoliaSearch;
