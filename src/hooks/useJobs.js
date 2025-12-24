import { useState, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  subscribeToJobs, 
  createJob, 
  updateJob, 
  deleteJob,
  getJobCounts 
} from '../lib/jobs';
import { queryKeys } from '../lib/queryClient';
import { useAuth } from '../context/AuthContext';

/**
 * Custom hook for managing jobs state with real-time updates
 */
export function useJobs(filters = {}) {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { user } = useAuth();

  // Subscribe to jobs collection
  useEffect(() => {
    setLoading(true);
    setError(null);

    const unsubscribe = subscribeToJobs((jobsData) => {
      // Apply client-side filtering for category (if Firebase composite index not set up)
      let filteredJobs = jobsData;
      
      if (filters.category && filters.category !== 'all') {
        filteredJobs = filteredJobs.filter(job => job.category === filters.category);
      }
      
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        filteredJobs = filteredJobs.filter(job => 
          job.title.toLowerCase().includes(searchLower) ||
          job.location.toLowerCase().includes(searchLower) ||
          job.description?.toLowerCase().includes(searchLower)
        );
      }

      setJobs(filteredJobs);
      setLoading(false);
    }, { status: filters.status });

    return () => unsubscribe();
  }, [filters.status, filters.category, filters.search]);

  // Create a new job
  const addJob = useCallback(async (jobData) => {
    if (!user) throw new Error('Must be logged in to create a job');
    
    try {
      const newJob = await createJob(jobData, user.uid);
      return newJob;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [user]);

  // Update an existing job
  const editJob = useCallback(async (jobId, updates) => {
    try {
      const updated = await updateJob(jobId, updates);
      return updated;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);

  // Delete a job
  const removeJob = useCallback(async (jobId) => {
    try {
      await deleteJob(jobId);
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
    jobs,
    loading,
    error,
    addJob,
    editJob,
    removeJob,
    clearError
  };
}

/**
 * Hook for getting job statistics (React Query version)
 */
export function useJobStats() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: queryKeys.jobs.stats(),
    queryFn: getJobCounts,
    staleTime: 60 * 1000, // Fresh for 1 minute
  });

  return { 
    stats: data || {
      total: 0,
      active: 0,
      paused: 0,
      closed: 0
    }, 
    loading: isLoading, 
    error,
    refetch 
  };
}
