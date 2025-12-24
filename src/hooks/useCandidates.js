import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  subscribeToCandidates, 
  fetchCandidatesPage,
  createCandidate, 
  updateCandidate, 
  deleteCandidate,
  uploadCV,
  getCandidateCounts,
  PAGE_SIZE
} from '../lib/candidates';
import { queryKeys, invalidateQueries } from '../lib/queryClient';
import { useAuth } from '../context/AuthContext';

/**
 * Custom hook for managing candidates with cursor-based pagination
 */
export function useCandidates(filters = {}) {
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const { user } = useAuth();
  
  // Track last document for cursor pagination
  const lastDocRef = useRef(null);
  // Track if we're on the first page (real-time) or paginated
  const isFirstPageRef = useRef(true);

  // Subscribe to first page with real-time updates
  useEffect(() => {
    setLoading(true);
    setError(null);
    setCandidates([]);
    lastDocRef.current = null;
    isFirstPageRef.current = true;

    const unsubscribe = subscribeToCandidates(({ candidates: data, lastDoc, hasMore: more, error: err }) => {
      if (err) {
        setError(err.message || 'Failed to load candidates');
        setLoading(false);
        return;
      }
      setCandidates(data);
      lastDocRef.current = lastDoc;
      setHasMore(more);
      setLoading(false);
    }, { status: filters.status, jobId: filters.jobId });

    return () => unsubscribe();
  }, [filters.status, filters.jobId]);

  // Load more (next page)
  const loadMore = useCallback(async () => {
    if (!hasMore || loadingMore || !lastDocRef.current) return;
    
    setLoadingMore(true);
    isFirstPageRef.current = false;
    
    try {
      const { candidates: nextPage, lastDoc, hasMore: more } = await fetchCandidatesPage(
        lastDocRef.current,
        { status: filters.status, jobId: filters.jobId }
      );
      
      setCandidates(prev => [...prev, ...nextPage]);
      lastDocRef.current = lastDoc;
      setHasMore(more);
    } catch (err) {
      setError(err.message || 'Failed to load more candidates');
    } finally {
      setLoadingMore(false);
    }
  }, [hasMore, loadingMore, filters.status, filters.jobId]);

  // Apply client-side filtering for search and date (on loaded data)
  const filteredCandidates = useMemo(() => {
    let result = [...candidates];

    // Search filter (client-side on loaded data)
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      result = result.filter(candidate => 
        candidate.firstName?.toLowerCase().includes(searchLower) ||
        candidate.lastName?.toLowerCase().includes(searchLower) ||
        candidate.email?.toLowerCase().includes(searchLower) ||
        candidate.phone?.includes(filters.search) ||
        `${candidate.firstName} ${candidate.lastName}`.toLowerCase().includes(searchLower)
      );
    }

    // Date range filter (client-side)
    if (filters.dateFrom) {
      const fromDate = new Date(filters.dateFrom);
      fromDate.setHours(0, 0, 0, 0);
      result = result.filter(c => {
        const candidateDate = c.createdAt?.toDate ? c.createdAt.toDate() : new Date(c.createdAt);
        return candidateDate >= fromDate;
      });
    }

    if (filters.dateTo) {
      const toDate = new Date(filters.dateTo);
      toDate.setHours(23, 59, 59, 999);
      result = result.filter(c => {
        const candidateDate = c.createdAt?.toDate ? c.createdAt.toDate() : new Date(c.createdAt);
        return candidateDate <= toDate;
      });
    }

    // Sorting (client-side, default is already date_desc from server)
    if (filters.sortBy && filters.sortBy !== 'date_desc') {
      result.sort((a, b) => {
        let aVal, bVal;
        
        switch (filters.sortBy) {
          case 'name_asc':
            aVal = `${a.firstName} ${a.lastName}`.toLowerCase();
            bVal = `${b.firstName} ${b.lastName}`.toLowerCase();
            return aVal.localeCompare(bVal);
          case 'name_desc':
            aVal = `${a.firstName} ${a.lastName}`.toLowerCase();
            bVal = `${b.firstName} ${b.lastName}`.toLowerCase();
            return bVal.localeCompare(aVal);
          case 'date_asc':
            aVal = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt);
            bVal = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt);
            return aVal - bVal;
          default:
            return 0;
        }
      });
    }

    return result;
  }, [candidates, filters.search, filters.dateFrom, filters.dateTo, filters.sortBy]);

  // Create a new candidate with optional CV upload
  const addCandidate = useCallback(async (candidateData, cvFile = null) => {
    if (!user) throw new Error('Must be logged in to create a candidate');
    
    let cvData = {};
    const newCandidate = await createCandidate(candidateData, user.uid);
    
    if (cvFile) {
      cvData = await uploadCV(cvFile, newCandidate.id);
      await updateCandidate(newCandidate.id, cvData);
    }
    
    return { ...newCandidate, ...cvData };
  }, [user]);

  // Update an existing candidate
  const editCandidate = useCallback(async (candidateId, updates, newCvFile = null) => {
    let cvData = {};
    
    if (newCvFile) {
      cvData = await uploadCV(newCvFile, candidateId);
    }
    
    const updated = await updateCandidate(candidateId, { ...updates, ...cvData });
    return updated;
  }, []);

  // Delete a candidate
  const removeCandidate = useCallback(async (candidateId) => {
    await deleteCandidate(candidateId);
  }, []);

  // Update candidate status
  const updateStatus = useCallback(async (candidateId, newStatus) => {
    await updateCandidate(candidateId, { status: newStatus });
  }, []);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    candidates: filteredCandidates,
    allLoadedCount: candidates.length,
    filteredCount: filteredCandidates.length,
    loading,
    loadingMore,
    error,
    hasMore,
    pageSize: PAGE_SIZE,
    loadMore,
    addCandidate,
    editCandidate,
    removeCandidate,
    updateStatus,
    clearError
  };
}

/**
 * Hook for getting candidate statistics (React Query version)
 */
export function useCandidateStats() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: queryKeys.candidates.stats(),
    queryFn: getCandidateCounts,
    staleTime: 60 * 1000, // Fresh for 1 minute
  });

  return { 
    stats: data || {
      total: 0,
      new: 0,
      in_progress: 0,
      approved: 0,
      rejected: 0
    }, 
    loading: isLoading, 
    error,
    refetch 
  };
}
