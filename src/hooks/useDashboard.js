import { useQuery } from '@tanstack/react-query';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  limit,
  getCountFromServer,
  getDocs,
  Timestamp
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { queryKeys } from '../lib/queryClient';

/**
 * Fetch dashboard statistics from Firestore
 */
async function fetchDashboardStats() {
  const candidatesRef = collection(db, 'candidates');
  const jobsRef = collection(db, 'jobs');
  const interviewsRef = collection(db, 'interviews');
  
  // Date calculations for interviews
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const nextWeek = new Date(today);
  nextWeek.setDate(nextWeek.getDate() + 7);

  // Run ALL count queries in parallel
  const [
    totalCandidates,
    newCandidates,
    approvedCandidates,
    rejectedCandidates,
    withdrawnCandidates,
    totalJobs,
    activeJobs,
    todayInterviews,
    upcomingInterviews
  ] = await Promise.all([
    getCountFromServer(query(candidatesRef)),
    getCountFromServer(query(candidatesRef, where('status', '==', 'new'))),
    getCountFromServer(query(candidatesRef, where('status', '==', 'approved'))),
    getCountFromServer(query(candidatesRef, where('status', '==', 'rejected'))),
    getCountFromServer(query(candidatesRef, where('status', '==', 'withdrawn'))),
    getCountFromServer(query(jobsRef)),
    getCountFromServer(query(jobsRef, where('status', '==', 'active'))),
    getCountFromServer(query(
      interviewsRef,
      where('status', '==', 'scheduled'),
      where('dateTime', '>=', Timestamp.fromDate(today)),
      where('dateTime', '<', Timestamp.fromDate(tomorrow))
    )),
    getCountFromServer(query(
      interviewsRef,
      where('status', '==', 'scheduled'),
      where('dateTime', '>=', Timestamp.fromDate(today)),
      where('dateTime', '<', Timestamp.fromDate(nextWeek))
    ))
  ]);

  const total = totalCandidates.data().count;
  const newCount = newCandidates.data().count;
  const approved = approvedCandidates.data().count;
  const rejected = rejectedCandidates.data().count + withdrawnCandidates.data().count;
  const inProgress = total - newCount - approved - rejected;

  return {
    candidates: { 
      total, 
      new: newCount, 
      inProgress, 
      approved 
    },
    jobs: { 
      total: totalJobs.data().count, 
      active: activeJobs.data().count 
    },
    interviews: { 
      today: todayInterviews.data().count, 
      upcoming: upcomingInterviews.data().count 
    }
  };
}

/**
 * Fetch recent candidates
 */
async function fetchRecentCandidates(limitCount = 5) {
  const candidatesRef = collection(db, 'candidates');
  const q = query(
    candidatesRef,
    orderBy('createdAt', 'desc'),
    limit(limitCount)
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
}

/**
 * Fetch upcoming interviews
 */
async function fetchUpcomingInterviews(limitCount = 5) {
  const interviewsRef = collection(db, 'interviews');
  const now = Timestamp.now();
  
  const q = query(
    interviewsRef,
    where('status', '==', 'scheduled'),
    where('dateTime', '>=', now),
    orderBy('dateTime', 'asc'),
    limit(limitCount)
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
}

/**
 * Fetch today's interviews
 */
async function fetchTodaysInterviews() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const interviewsRef = collection(db, 'interviews');
  const q = query(
    interviewsRef,
    where('status', '==', 'scheduled'),
    where('dateTime', '>=', Timestamp.fromDate(today)),
    where('dateTime', '<', Timestamp.fromDate(tomorrow)),
    orderBy('dateTime', 'asc')
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
}

// ============================================
// REACT QUERY HOOKS
// ============================================

/**
 * Hook for dashboard statistics with caching
 */
export function useDashboardStats() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: queryKeys.dashboard.stats(),
    queryFn: fetchDashboardStats,
    staleTime: 60 * 1000, // Stats fresh for 1 minute
  });

  return {
    candidates: data?.candidates || { total: 0, new: 0, inProgress: 0, approved: 0 },
    jobs: data?.jobs || { total: 0, active: 0 },
    interviews: data?.interviews || { today: 0, upcoming: 0 },
    loading: isLoading,
    error,
    refetch
  };
}

/**
 * Hook for recent candidates with caching
 */
export function useRecentCandidates(limitCount = 5) {
  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.dashboard.recentCandidates(limitCount),
    queryFn: () => fetchRecentCandidates(limitCount),
    staleTime: 30 * 1000, // Fresh for 30 seconds
  });

  return {
    candidates: data || [],
    loading: isLoading,
    error
  };
}

/**
 * Hook for upcoming interviews with caching
 */
export function useUpcomingInterviews(limitCount = 5) {
  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.interviews.upcoming(limitCount),
    queryFn: () => fetchUpcomingInterviews(limitCount),
    staleTime: 60 * 1000, // Fresh for 1 minute
  });

  return {
    interviews: data || [],
    loading: isLoading,
    error
  };
}

/**
 * Hook for today's interviews with caching
 */
export function useTodaysInterviews() {
  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.interviews.today(),
    queryFn: fetchTodaysInterviews,
    staleTime: 60 * 1000, // Fresh for 1 minute
  });

  return {
    interviews: data || [],
    loading: isLoading,
    error
  };
}

/**
 * Hook for recent activity
 */
export function useRecentActivity(limitCount = 10) {
  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.dashboard.recentActivity(limitCount),
    queryFn: async () => {
      const candidatesRef = collection(db, 'candidates');
      const q = query(
        candidatesRef,
        orderBy('updatedAt', 'desc'),
        limit(limitCount)
      );
      
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          candidateId: doc.id,
          candidateName: `${data.firstName} ${data.lastName}`,
          status: data.status,
          jobTitle: data.jobTitle,
          updatedAt: data.updatedAt
        };
      });
    },
    staleTime: 30 * 1000,
  });

  return {
    activities: data || [],
    loading: isLoading,
    error
  };
}
