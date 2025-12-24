import { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  subscribeToCandidates, 
  createCandidate, 
  updateCandidate, 
  deleteCandidate,
  uploadCV,
  getCandidateCounts 
} from '../lib/candidates';
import { useAuth } from '../context/AuthContext';

/**
 * Custom hook for managing candidates state with real-time updates
 */
export function useCandidates(filters = {}) {
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { user } = useAuth();

  // Subscribe to candidates collection
  useEffect(() => {
    setLoading(true);
    setError(null);

    const unsubscribe = subscribeToCandidates((candidatesData) => {
      setCandidates(candidatesData);
      setLoading(false);
    }, { status: filters.status });

    return () => unsubscribe();
  }, [filters.status]);

  // Apply client-side filtering and sorting
  const filteredCandidates = useMemo(() => {
    let result = [...candidates];

    // Search filter
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

    // Job filter
    if (filters.jobId && filters.jobId !== 'all') {
      result = result.filter(c => c.jobId === filters.jobId);
    }

    // Date range filter
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

    // Sorting
    if (filters.sortBy) {
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
          case 'date_desc':
          default:
            aVal = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt);
            bVal = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt);
            return bVal - aVal;
        }
      });
    }

    return result;
  }, [candidates, filters.search, filters.jobId, filters.dateFrom, filters.dateTo, filters.sortBy]);

  // Create a new candidate with optional CV upload
  const addCandidate = useCallback(async (candidateData, cvFile = null) => {
    if (!user) throw new Error('Must be logged in to create a candidate');
    
    try {
      // If there's a CV file, we need to create candidate first to get ID
      // Then upload CV and update the candidate
      let cvData = {};
      
      // Create candidate first (without CV)
      const newCandidate = await createCandidate(candidateData, user.uid);
      
      // If CV file provided, upload it
      if (cvFile) {
        cvData = await uploadCV(cvFile, newCandidate.id);
        // Update candidate with CV info
        await updateCandidate(newCandidate.id, cvData);
      }
      
      return { ...newCandidate, ...cvData };
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [user]);

  // Update an existing candidate
  const editCandidate = useCallback(async (candidateId, updates, newCvFile = null) => {
    try {
      let cvData = {};
      
      // If new CV file provided, upload it
      if (newCvFile) {
        cvData = await uploadCV(newCvFile, candidateId);
      }
      
      const updated = await updateCandidate(candidateId, { ...updates, ...cvData });
      return updated;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);

  // Delete a candidate
  const removeCandidate = useCallback(async (candidateId) => {
    try {
      await deleteCandidate(candidateId);
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);

  // Update candidate status
  const updateStatus = useCallback(async (candidateId, newStatus) => {
    try {
      await updateCandidate(candidateId, { status: newStatus });
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    candidates: filteredCandidates,
    totalCount: candidates.length,
    filteredCount: filteredCandidates.length,
    loading,
    error,
    addCandidate,
    editCandidate,
    removeCandidate,
    updateStatus,
    clearError
  };
}

/**
 * Hook for getting candidate statistics
 */
export function useCandidateStats() {
  const [stats, setStats] = useState({
    total: 0,
    new: 0,
    in_progress: 0,
    approved: 0,
    rejected: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const counts = await getCandidateCounts();
        setStats(counts);
      } catch (err) {
        console.error('Error fetching candidate stats:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
  }, []);

  const refetch = useCallback(async () => {
    setLoading(true);
    try {
      const counts = await getCandidateCounts();
      setStats(counts);
    } catch (err) {
      console.error('Error fetching candidate stats:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  return { stats, loading, refetch };
}
